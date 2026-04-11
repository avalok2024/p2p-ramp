import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  ManyToOne, JoinColumn, OneToOne,
} from 'typeorm';
import { EscrowStatus, CryptoAsset } from '../../../../packages/shared/src';
import { Order } from './order.entity';

@Entity('escrows')
export class Escrow {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  orderId: string;

  @Column()
  holderId: string;

  @Column({ type: 'decimal', precision: 18, scale: 8 })
  amount: number;

  @Column({ type: 'enum', enum: CryptoAsset })
  crypto: CryptoAsset;

  @Column({ type: 'enum', enum: EscrowStatus, default: EscrowStatus.LOCKED })
  status: EscrowStatus;

  @Column({ nullable: true })
  resolvedByAdminId: string;

  @Column({ nullable: true })
  releasedAt: Date;

  @Column({ nullable: true })
  refundedAt: Date;

  @OneToOne(() => Order, (o) => o.escrow)
  @JoinColumn({ name: 'orderId' })
  order: Order;

  @CreateDateColumn()
  createdAt: Date;
}
