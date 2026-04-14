import {
  Injectable, NotFoundException, ForbiddenException, BadRequestException,
  OnModuleInit, OnModuleDestroy, Logger
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, LessThan, In } from 'typeorm';
import { Order } from '../../entities/order.entity';
import { Escrow } from '../../entities/escrow.entity';
import { MerchantAd } from '../../entities/merchant-ad.entity';
import { MatchingService } from '../matching/matching.service';
import { PaymentService } from '../payment/payment.service';
import { NotificationService } from '../notification/notification.service';
import { EscrowService } from '../escrow/escrow.service';
import {
  OrderStatus, OrderType, EscrowStatus, CryptoAsset,
  NotificationType, UserRole,
} from '../../../../../packages/shared/src';
import { User } from '../../entities/user.entity';
import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateOrderDto {
  @IsEnum(OrderType) type: OrderType;
  @IsEnum(CryptoAsset) crypto: CryptoAsset;
  @IsNumber() @Min(1) fiatAmount: number;
  @IsString() adId: string;
  @IsOptional() @IsString() userUpiId?: string;
}

@Injectable()
export class OrderService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OrderService.name);
  private cancelInterval: NodeJS.Timeout;

  constructor(
    @InjectRepository(Order) private orderRepo: Repository<Order>,
    @InjectRepository(Escrow) private escrowRepo: Repository<Escrow>,
    @InjectRepository(MerchantAd) private adRepo: Repository<MerchantAd>,
    private matchingService: MatchingService,
    private paymentService: PaymentService,
    private notifService: NotificationService,
    private escrowOnChain: EscrowService,
    private dataSource: DataSource,
  ) { }

  onModuleInit() {
    this.cancelInterval = setInterval(async () => {
      const expiredOrders = await this.orderRepo.find({
        where: {
          status: In([OrderStatus.CREATED, OrderStatus.MATCHED, OrderStatus.ESCROW_LOCKED]),
          paymentDeadline: LessThan(new Date()),
        },
      });
      for (const order of expiredOrders) {
        try {
          await this.cancelOrder(order.id, { role: UserRole.ADMIN } as User);
          this.logger.log(`Auto-cancelled expired order: ${order.id}`);
        } catch (e: any) {
          this.logger.error(`Failed to auto-cancel ${order.id}: ${e.message}`);
        }
      }
    }, 60000);
  }

  onModuleDestroy() {
    clearInterval(this.cancelInterval);
  }

  /** Step 1: Create + Match + Lock Escrow atomically */
  async createOrder(user: User, dto: CreateOrderDto) {
    const { type, crypto, fiatAmount, adId } = dto;

    const ad = await this.adRepo.findOne({ where: { id: adId, isActive: true } });
    if (!ad) throw new NotFoundException('Ad not found or inactive');
    if (fiatAmount < +ad.minAmount || fiatAmount > +ad.maxAmount)
      throw new BadRequestException(`Amount must be between ${ad.minAmount}–${ad.maxAmount}`);

    const cryptoAmount = fiatAmount / +ad.pricePerUnit;
    const uniqueFiatAmount = this.paymentService.generateUniqueAmount(fiatAmount);
    const referenceCode = this.paymentService.generateReferenceCode();
    const deadline = new Date(Date.now() + ad.paymentWindowMinutes * 60 * 1000);

    return this.dataSource.transaction(async (em) => {
      const holderId = type === OrderType.BUY ? ad.merchantId : user.id;

      const order = em.create(Order, {
        userId: user.id,
        merchantId: ad.merchantId,
        adId: ad.id,
        type, crypto,
        fiatAmount, cryptoAmount: parseFloat(cryptoAmount.toFixed(8)),
        pricePerUnit: +ad.pricePerUnit,
        paymentMethod: ad.paymentMethods[0],
        uniqueFiatAmount,
        referenceCode,
        userUpiId: dto.userUpiId || null,
        status: OrderStatus.MATCHED,  // Wait for Web3 Escrow Lock
        paymentDeadline: deadline,
      });
      const savedOrder = await em.save(order);

      const escrow = em.create(Escrow, {
        orderId: savedOrder.id,
        holderId,
        amount: parseFloat(cryptoAmount.toFixed(8)),
        crypto,
        status: EscrowStatus.PENDING,
      });
      await em.save(escrow);

      return savedOrder;
    });
  }

  async getOrder(id: string, user: User) {
    const order = await this.orderRepo.findOne({
      where: { id },
      relations: ['escrow', 'dispute', 'merchantAd', 'merchant', 'user'],
    });
    if (!order) throw new NotFoundException('Order not found');

    const isOwner = order.userId === user.id;
    const isMerchant = order.merchantId === user.id;
    const isAdmin = user.role === UserRole.ADMIN;
    if (!isOwner && !isMerchant && !isAdmin)
      throw new ForbiddenException('Not authorized to view this order');

    // Attach UPI QR data for the payment screen
    let upiQr: string | null = null;
    
    // If MERCHANT expects money (BUY type from User perspective)
    if (order.type === OrderType.BUY && order.merchantAd?.upiId) {
      upiQr = this.paymentService.buildUpiQrString({
        upiId: order.merchantAd.upiId,
        payeeName: order.merchant?.displayName || 'Merchant',
        amount: order.uniqueFiatAmount,
        referenceCode: order.referenceCode,
        remarks: order.merchantAd.paymentRemarks,
      });
    } 
    // If USER expects money (SELL type from User perspective)
    else if (order.type === OrderType.SELL && order.userUpiId) {
      upiQr = this.paymentService.buildUpiQrString({
        upiId: order.userUpiId,
        payeeName: order.user?.displayName || 'User',
        amount: order.uniqueFiatAmount,
        referenceCode: order.referenceCode,
        remarks: `P2P Trade ${order.referenceCode}`,
      });
    }

    return { ...order, upiQr, ...this.escrowOnChain.getPublicEscrowConfig() };
  }

  async listOrders(user: User, status?: OrderStatus) {
    const query = this.orderRepo.createQueryBuilder('o')
      .where('(o.userId = :uid OR o.merchantId = :uid)', { uid: user.id });
    if (status) query.andWhere('o.status = :status', { status });
    return query.orderBy('o.createdAt', 'DESC').limit(50).getMany();
  }

  /** Step 2: Buyer marks "I Paid" */
  async markPaid(orderId: string, user: User, paymentProofUrl?: string) {
    const order = await this.findOrderOrFail(orderId);
    this.assertStatus(order, OrderStatus.ESCROW_LOCKED);
    
    const isBuyer = order.type === OrderType.BUY ? order.userId === user.id : order.merchantId === user.id;
    if (!isBuyer) throw new ForbiddenException('Only the buyer can mark payment');

    order.status = OrderStatus.PAID_MARKED;
    order.paidMarkedAt = new Date();
    if (paymentProofUrl) order.paymentProofUrl = paymentProofUrl;
    await this.orderRepo.save(order);

    await this.notifService.send(order.merchantId, NotificationType.PAYMENT_MARKED, {
      title: '💰 Payment Marked',
      message: `Buyer marked payment for order ${order.referenceCode}. Please verify and confirm.`,
      data: { orderId },
    });

    return order;
  }

  /** Step 3: Seller confirms payment received */
  async confirmPayment(orderId: string, user: User) {
    const order = await this.findOrderOrFail(orderId);
    this.assertStatus(order, OrderStatus.PAID_MARKED);
    const isSeller = order.type === OrderType.BUY ? order.merchantId === user.id : order.userId === user.id;
    if (!isSeller) {
      console.error('*** 403 IN confirmPayment ***');
      console.error('Type:', order.type, 'Order.userId:', order.userId, 'Order.merchantId:', order.merchantId, 'Req.user.id:', user.id);
      throw new ForbiddenException('Only the seller can confirm');
    }

    await this.escrowOnChain.releaseTradeEscrow(orderId);

    const escrow = await this.escrowRepo.findOne({ where: { orderId } });
    if (escrow) {
      escrow.status = EscrowStatus.RELEASED;
      escrow.releasedAt = new Date();
      await this.escrowRepo.save(escrow);
    }
    // Crypto settlement is on-chain only (P2PEscrow release → recipient address). No in-app ledger credit.

    order.status = OrderStatus.COMPLETED;
    order.confirmedAt = new Date();
    await this.orderRepo.save(order);

    await this.notifService.send(order.userId, NotificationType.ORDER_COMPLETED, {
      title: '✅ Trade Complete!',
      message: `Escrow released: ${order.crypto} was sent to the recipient wallet on-chain.`,
      data: { orderId },
    });

    return order;
  }

  /** Cancel an order (only if ESCROW_LOCKED and before "I Paid") */
  async cancelOrder(orderId: string, user: User) {
    const order = await this.findOrderOrFail(orderId);
    if (![OrderStatus.CREATED, OrderStatus.MATCHED, OrderStatus.ESCROW_LOCKED].includes(order.status))
      throw new BadRequestException('Cannot cancel order at this stage');

    const isParty = order.userId === user.id || order.merchantId === user.id;
    const isAdmin = user.role === UserRole.ADMIN;
    if (!isParty && !isAdmin) throw new ForbiddenException('Not authorized');

    const escrow = await this.escrowRepo.findOne({ where: { orderId } });
    if (escrow) {
      escrow.status = EscrowStatus.REFUNDED;
      escrow.refundedAt = new Date();
      await this.escrowRepo.save(escrow);
    }

    order.status = OrderStatus.CANCELLED;
    await this.orderRepo.save(order);
    return order;
  }

  // ── helpers ─────────────────────────────────────────────────────────────────

  private async findOrderOrFail(id: string): Promise<Order> {
    const order = await this.orderRepo.findOne({ where: { id }, relations: ['escrow'] });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  private assertStatus(order: Order, status: OrderStatus) {
    if (order.status !== status)
      throw new BadRequestException(`Order must be in ${status} state`);
  }

  async verifyLock(orderId: string, user: User) {
    const order = await this.findOrderOrFail(orderId);
    this.assertStatus(order, OrderStatus.MATCHED);
    const isSeller = order.type === OrderType.BUY ? order.merchantId === user.id : order.userId === user.id;
    if (!isSeller) {
      console.error('*** 403 IN verifyLock ***');
      console.error('Type:', order.type, 'Order.userId:', order.userId, 'Order.merchantId:', order.merchantId, 'Req.user.id:', user.id);
      throw new ForbiddenException('Only the exact seller can verify lock');
    }

    const escrow = await this.escrowRepo.findOne({ where: { orderId } });
    if (escrow) {
      escrow.status = EscrowStatus.LOCKED;
      await this.escrowRepo.save(escrow);
    }

    order.status = OrderStatus.ESCROW_LOCKED;
    return this.orderRepo.save(order);
  }
}
