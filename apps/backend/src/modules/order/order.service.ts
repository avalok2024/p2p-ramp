import {
  Injectable, NotFoundException, ForbiddenException, BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Order }           from '../../entities/order.entity';
import { Escrow }          from '../../entities/escrow.entity';
import { MerchantAd }      from '../../entities/merchant-ad.entity';
import { WalletService }   from '../wallet/wallet.service';
import { MatchingService } from '../matching/matching.service';
import { PaymentService }  from '../payment/payment.service';
import { NotificationService } from '../notification/notification.service';
import {
  OrderStatus, OrderType, EscrowStatus, CryptoAsset,
  NotificationType, UserRole,
} from '../../../../../packages/shared/src';
import { User } from '../../entities/user.entity';
import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateOrderDto {
  @IsEnum(OrderType)    type: OrderType;
  @IsEnum(CryptoAsset)  crypto: CryptoAsset;
  @IsNumber() @Min(1)   fiatAmount: number;
  @IsString()           adId: string;
}

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(Order)      private orderRepo: Repository<Order>,
    @InjectRepository(Escrow)     private escrowRepo: Repository<Escrow>,
    @InjectRepository(MerchantAd) private adRepo: Repository<MerchantAd>,
    private walletService:   WalletService,
    private matchingService: MatchingService,
    private paymentService:  PaymentService,
    private notifService:    NotificationService,
    private dataSource:      DataSource,
  ) {}

  /** Step 1: Create + Match + Lock Escrow atomically */
  async createOrder(user: User, dto: CreateOrderDto) {
    const { type, crypto, fiatAmount, adId } = dto;

    const ad = await this.adRepo.findOne({ where: { id: adId, isActive: true } });
    if (!ad) throw new NotFoundException('Ad not found or inactive');
    if (fiatAmount < +ad.minAmount || fiatAmount > +ad.maxAmount)
      throw new BadRequestException(`Amount must be between ${ad.minAmount}–${ad.maxAmount}`);

    const cryptoAmount = fiatAmount / +ad.pricePerUnit;
    const uniqueFiatAmount = this.paymentService.generateUniqueAmount(fiatAmount);
    const referenceCode    = this.paymentService.generateReferenceCode();
    const deadline         = new Date(Date.now() + ad.paymentWindowMinutes * 60 * 1000);

    return this.dataSource.transaction(async (em) => {
      // For BUY: lock merchant's crypto. For SELL: lock user's crypto.
      const holderId = type === OrderType.BUY ? ad.merchantId : user.id;
      await this.walletService.lockForEscrow(holderId, crypto, cryptoAmount, 'pending');

      const order = em.create(Order, {
        userId:          user.id,
        merchantId:      ad.merchantId,
        adId:            ad.id,
        type, crypto,
        fiatAmount,      cryptoAmount: parseFloat(cryptoAmount.toFixed(8)),
        pricePerUnit:    +ad.pricePerUnit,
        paymentMethod:   ad.paymentMethods[0],
        uniqueFiatAmount,
        referenceCode,
        status:          OrderStatus.ESCROW_LOCKED,
        paymentDeadline: deadline,
      });
      const savedOrder = await em.save(order);

      const escrow = em.create(Escrow, {
        orderId: savedOrder.id,
        holderId,
        amount: parseFloat(cryptoAmount.toFixed(8)),
        crypto,
        status: EscrowStatus.LOCKED,
      });
      await em.save(escrow);

      // Update order with escrow id (already linked by orderId relation)
      return savedOrder;
    });
  }

  async getOrder(id: string, user: User) {
    const order = await this.orderRepo.findOne({
      where: { id },
      relations: ['escrow', 'dispute', 'merchantAd', 'merchant', 'user'],
    });
    if (!order) throw new NotFoundException('Order not found');

    const isOwner   = order.userId === user.id;
    const isMerchant = order.merchantId === user.id;
    const isAdmin   = user.role === UserRole.ADMIN;
    if (!isOwner && !isMerchant && !isAdmin)
      throw new ForbiddenException('Not authorized to view this order');

    // Attach UPI QR data for the payment screen
    const ad = order.merchantAd;
    let upiQr: string | null = null;
    if (ad?.upiId) {
      upiQr = this.paymentService.buildUpiQrString({
        upiId: ad.upiId,
        payeeName: order.merchant?.displayName || 'Merchant',
        amount: order.uniqueFiatAmount,
        referenceCode: order.referenceCode,
        remarks: ad.paymentRemarks,
      });
    }

    return { ...order, upiQr };
  }

  async listOrders(user: User, status?: OrderStatus) {
    const query = this.orderRepo.createQueryBuilder('o')
      .where('(o.user_id = :uid OR o.merchant_id = :uid)', { uid: user.id });
    if (status) query.andWhere('o.status = :status', { status });
    return query.orderBy('o.createdAt', 'DESC').limit(50).getMany();
  }

  /** Step 2: User marks "I Paid" */
  async markPaid(orderId: string, user: User, paymentProofUrl?: string) {
    const order = await this.findOrderOrFail(orderId);
    this.assertStatus(order, OrderStatus.ESCROW_LOCKED);
    if (order.userId !== user.id) throw new ForbiddenException('Only the buyer can mark payment');

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

  /** Step 3: Merchant confirms payment received */
  async confirmPayment(orderId: string, user: User) {
    const order = await this.findOrderOrFail(orderId);
    this.assertStatus(order, OrderStatus.PAID_MARKED);
    if (order.merchantId !== user.id) throw new ForbiddenException('Only merchant can confirm');

    // Release escrow to the user (for BUY)
    const escrow = await this.escrowRepo.findOne({ where: { orderId } });
    if (escrow) {
      await this.walletService.releaseEscrow(escrow.holderId, order.userId, order.crypto, +escrow.amount, orderId);
      escrow.status = EscrowStatus.RELEASED;
      escrow.releasedAt = new Date();
      await this.escrowRepo.save(escrow);
    }

    order.status = OrderStatus.COMPLETED;
    order.confirmedAt = new Date();
    await this.orderRepo.save(order);

    await this.notifService.send(order.userId, NotificationType.ORDER_COMPLETED, {
      title: '✅ Trade Complete!',
      message: `Your ${order.crypto} has been credited to your wallet.`,
      data: { orderId },
    });

    return order;
  }

  /** Cancel an order (only if ESCROW_LOCKED and before "I Paid") */
  async cancelOrder(orderId: string, user: User) {
    const order = await this.findOrderOrFail(orderId);
    if (order.status !== OrderStatus.ESCROW_LOCKED)
      throw new BadRequestException('Cannot cancel order at this stage');

    const isParty = order.userId === user.id || order.merchantId === user.id;
    const isAdmin = user.role === UserRole.ADMIN;
    if (!isParty && !isAdmin) throw new ForbiddenException('Not authorized');

    const escrow = await this.escrowRepo.findOne({ where: { orderId } });
    if (escrow) {
      await this.walletService.refundEscrow(escrow.holderId, order.crypto, +escrow.amount, orderId);
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

  private assertStatus(order: Order, expected: OrderStatus) {
    if (order.status !== expected)
      throw new BadRequestException(`Order must be in ${expected} state, currently ${order.status}`);
  }
}
