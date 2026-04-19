import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn, OneToOne, OneToMany, Generated,
} from 'typeorm';
import { OrderStatus, OrderType, CryptoAsset, PaymentMethod } from '../../../../packages/shared/src';
import { User } from './user.entity';
import { MerchantAd } from './merchant-ad.entity';
import { Escrow } from './escrow.entity';
import { Dispute } from './dispute.entity';

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Human-friendly sequential id for support / admin (separate from UUID) */
  @Generated('increment')
  @Column({ type: 'int', unique: true })
  orderNumber: number;

  @Column()
  userId: string;

  @Column()
  merchantId: string;

  @Column()
  adId: string;

  @Column({ type: 'varchar', default: OrderType.BUY })
  type: OrderType;

  @Column({ type: 'varchar', default: OrderStatus.CREATED })
  status: OrderStatus;

  @Column({ type: 'varchar', default: CryptoAsset.ETH })
  crypto: CryptoAsset;

  @Column({ type: 'decimal', precision: 18, scale: 8 })
  cryptoAmount: number;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  fiatAmount: number;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  uniqueFiatAmount: number;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  pricePerUnit: number;

  @Column({ type: 'varchar', nullable: true })
  paymentMethod: PaymentMethod;

  @Column({ unique: true })
  referenceCode: string;

  @Column({ nullable: true })
  paymentProofUrl: string;

  @Column({ nullable: true })
  userUpiId: string;

  /** Scan & Pay: the shop/vendor UPI ID decoded from the QR code */
  @Column({ nullable: true })
  receiverUpiId: string;

  /** Scan & Pay: display name of the fiat receiver (shop/vendor) */
  @Column({ nullable: true })
  receiverName: string;

  /** Scan & Pay: merchant's proof of paying the UPI receiver */
  @Column({ nullable: true })
  merchantPaymentProofUrl: string;

  @Column({ nullable: true })
  paymentDeadline: Date;

  @Column({ nullable: true })
  paidMarkedAt: Date;

  @Column({ nullable: true })
  confirmedAt: Date;

  @Column({ nullable: true })
  cancelledAt: Date;

  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'merchantId' })
  merchant: User;

  @ManyToOne(() => MerchantAd, { eager: false })
  @JoinColumn({ name: 'adId' })
  merchantAd: MerchantAd;

  @OneToOne(() => Escrow, (e) => e.order, { eager: false })
  escrow: Escrow;

  @OneToOne(() => Dispute, (d) => d.order, { eager: false })
  dispute: Dispute;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
