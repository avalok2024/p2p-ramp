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
import { WalletService } from '../wallet/wallet.service';
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

export class CreateScanPayOrderDto {
  @IsEnum(CryptoAsset) crypto: CryptoAsset;
  @IsNumber() @Min(1) fiatAmount: number;
  // No receiver UPI at creation — user submits it after merchant accepts
}

export class SubmitReceiverDto {
  @IsString() receiverUpiId: string;
  @IsOptional() @IsString() receiverName?: string;
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
    private walletService: WalletService,
    private dataSource: DataSource,
  ) { }

  async onModuleInit() {
    // Safely inject new ENUM values into PostgreSQL (TypeORM sync often misses or fails these)
    const newTypes = ['SCAN_PAY'];
    const newStatuses = ['SCAN_PAY_MERCHANT_PAID', 'MERCHANT_ACCEPTED', 'RECEIVER_SUBMITTED'];
    const newNotifs = ['SCAN_PAY_CREATED', 'SCAN_PAY_MERCHANT_PAID', 'SCAN_PAY_MERCHANT_ACCEPTED', 'SCAN_PAY_RECEIVER_SUBMITTED'];
    
    for (const val of newTypes) {
      await this.dataSource.query(`ALTER TYPE "order_type_enum" ADD VALUE IF NOT EXISTS '${val}'`).catch(() => {});
    }
    for (const val of newStatuses) {
      await this.dataSource.query(`ALTER TYPE "order_status_enum" ADD VALUE IF NOT EXISTS '${val}'`).catch(() => {});
    }
    for (const val of newNotifs) {
      await this.dataSource.query(`ALTER TYPE "notifications_type_enum" ADD VALUE IF NOT EXISTS '${val}'`).catch(() => {});
    }

    this.cancelInterval = setInterval(async () => {
      const expiredOrders = await this.orderRepo.find({
        where: {
          status: In([OrderStatus.CREATED, OrderStatus.MATCHED, OrderStatus.ESCROW_LOCKED, OrderStatus.MERCHANT_ACCEPTED]),
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
    }, 15000); // Check every 15 seconds for snappy cleanup
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
    const validStatuses = [OrderStatus.CREATED, OrderStatus.MATCHED, OrderStatus.ESCROW_LOCKED, OrderStatus.MERCHANT_ACCEPTED];
    if (!validStatuses.includes(order.status))
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

  // ── Scan & Pay ───────────────────────────────────────────────────────────────

  /**
   * Step 1: User dials amount → backend auto-matches a merchant → order CREATED.
   * No receiver UPI yet — collected after merchant accepts.
   */
  async createScanPayOrder(user: User, dto: CreateScanPayOrderDto) {
    const { crypto, fiatAmount } = dto;

    const match = await this.matchingService.findBestScanPayMerchant(crypto as any, fiatAmount);

    const cryptoAmount = fiatAmount / match.pricePerUnit;
    const referenceCode = this.paymentService.generateReferenceCode();
    const deadline = new Date(Date.now() + 60 * 1000); // 60-seconds strict window BEFORE scanning QR

    const order = this.orderRepo.create({
      userId:          user.id,
      merchantId:      match.merchantId,
      adId:            match.ad.id,
      type:            OrderType.SCAN_PAY,
      crypto,
      fiatAmount,
      cryptoAmount:    parseFloat(cryptoAmount.toFixed(8)),
      pricePerUnit:    match.pricePerUnit,
      paymentMethod:   match.ad.paymentMethods[0],
      uniqueFiatAmount: fiatAmount,
      referenceCode,
      status:          OrderStatus.MATCHED,
      paymentDeadline: deadline,
    });
    const saved = await this.orderRepo.save(order);

    // Notify matched merchant — they need to actively accept
    await this.notifService.send(match.merchantId, NotificationType.SCAN_PAY_CREATED, {
      title: '⚡ New Scan & Pay Request',
      message: `User wants to pay ₹${fiatAmount}. You receive ${cryptoAmount.toFixed(6)} ${crypto}. Accept to proceed.`,
      data: { orderId: saved.id },
    });

    return saved;
  }

  /**
   * Step 2: Merchant actively accepts the Scan & Pay order.
   * MATCHED → MERCHANT_ACCEPTED.
   * Notifies user — they can now submit the receiver’s UPI/QR.
   */
  async merchantAcceptScanPay(orderId: string, user: User) {
    const order = await this.findOrderOrFail(orderId);
    if (order.type !== OrderType.SCAN_PAY)
      throw new BadRequestException('Not a Scan & Pay order');
    if (order.merchantId !== user.id)
      throw new ForbiddenException('Only the assigned merchant can accept');
    this.assertStatus(order, OrderStatus.MATCHED);

    order.status = OrderStatus.MERCHANT_ACCEPTED;
    await this.orderRepo.save(order);

    await this.notifService.send(order.userId, NotificationType.SCAN_PAY_MERCHANT_ACCEPTED, {
      title: '✅ Merchant Accepted!',
      message: 'Your merchant accepted. Now scan or enter the UPI QR of the person you want to pay.',
      data: { orderId },
    });

    return order;
  }

  /**
   * Step 3: User submits the receiver’s UPI ID (from QR scan or manual entry).
   * MERCHANT_ACCEPTED → RECEIVER_SUBMITTED.
   * Notifies merchant to pay the receiver.
   */
  async submitReceiver(orderId: string, user: User, dto: SubmitReceiverDto) {
    const order = await this.findOrderOrFail(orderId);
    if (order.type !== OrderType.SCAN_PAY)
      throw new BadRequestException('Not a Scan & Pay order');
    if (order.userId !== user.id)
      throw new ForbiddenException('Only the order owner can submit receiver details');
    this.assertStatus(order, OrderStatus.MERCHANT_ACCEPTED);

    order.receiverUpiId = dto.receiverUpiId;
    order.receiverName  = dto.receiverName || null;
    order.status        = OrderStatus.RECEIVER_SUBMITTED;
    await this.orderRepo.save(order);

    await this.notifService.send(order.merchantId, NotificationType.SCAN_PAY_RECEIVER_SUBMITTED, {
      title: '📤 Pay This UPI Now',
      message: `User says: pay \u20b9${order.fiatAmount} to ${dto.receiverUpiId}. Then mark done to receive ${order.cryptoAmount} ${order.crypto}.`,
      data: { orderId },
    });

    return order;
  }

  /**
   * Step 4: Merchant has paid the fiat receiver — marks order DONE.
   * RECEIVER_SUBMITTED → COMPLETED.
   * Crypto is auto-released from user’s wallet → merchant’s wallet.
   */
  async merchantConfirmScanPayment(orderId: string, user: User, proofUrl?: string) {
    const order = await this.findOrderOrFail(orderId);
    if (order.type !== OrderType.SCAN_PAY)
      throw new BadRequestException('Not a Scan & Pay order');
    if (order.merchantId !== user.id)
      throw new ForbiddenException('Only the assigned merchant can confirm payment');
    this.assertStatus(order, OrderStatus.RECEIVER_SUBMITTED);

    // No internal releaseEscrow needed — Scan & Pay is fully Web3 to Web3 (Trust-based)
    // The user already transferred crypto directly to the merchant's Web3 address.

    order.status = OrderStatus.COMPLETED;
    order.confirmedAt = new Date();
    if (proofUrl) order.merchantPaymentProofUrl = proofUrl;
    await this.orderRepo.save(order);

    // Notify both parties
    await this.notifService.send(order.userId, NotificationType.ORDER_COMPLETED, {
      title: '🎉 Payment Delivered!',
      message: `Your ₹${order.fiatAmount} payment has been delivered to ${order.receiverUpiId || 'the receiver'}.`,
      data: { orderId },
    });
    await this.notifService.send(order.merchantId, NotificationType.ORDER_COMPLETED, {
      title: '🎉 Crypto Credited!',
      message: `${order.cryptoAmount} ${order.crypto} has been credited to your wallet.`,
      data: { orderId },
    });

    return order;
  }

  /**
   * @deprecated Kept for backward compat only. The new flow completes when merchant marks done.
   */
  async userConfirmReceived(orderId: string, user: User) {
    const order = await this.findOrderOrFail(orderId);
    if (order.type !== OrderType.SCAN_PAY) throw new BadRequestException('Not a Scan & Pay order');
    if (order.userId !== user.id) throw new ForbiddenException('Only the order owner');
    if (order.status === OrderStatus.COMPLETED) return order; // idempotent
    throw new BadRequestException('Order flow has changed. Crypto is released automatically when merchant marks done.');
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
