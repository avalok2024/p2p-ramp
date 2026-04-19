import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn, DeleteDateColumn
} from 'typeorm';
import { CryptoAsset, PaymentMethod } from '../../../../packages/shared/src';
import { User } from './user.entity';

@Entity('merchant_ads')
export class MerchantAd {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  merchantId: string;

  @Column({ type: 'enum', enum: CryptoAsset, default: CryptoAsset.ETH })
  crypto: CryptoAsset;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  pricePerUnit: number;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  minAmount: number;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  maxAmount: number;

  @Column({ type: 'simple-array' })
  paymentMethods: PaymentMethod[];

  @Column({ nullable: true })
  upiId: string;

  @Column({ nullable: true })
  bankAccountNumber: string;

  @Column({ nullable: true })
  bankIfsc: string;

  @Column({ nullable: true })
  bankAccountName: string;

  @Column({ nullable: true })
  paymentRemarks: string;

  @Column({ default: 30 })
  paymentWindowMinutes: number;

  @Column({ default: true })
  isActive: boolean;

  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'merchantId' })
  merchant: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}
