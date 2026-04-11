import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  ManyToOne, JoinColumn, OneToOne,
} from 'typeorm';
import { DisputeStatus, DisputeResolution } from '../../../../packages/shared/src';
import { Order } from './order.entity';
import { User }  from './user.entity';

@Entity('disputes')
export class Dispute {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  orderId: string;

  @Column()
  raisedById: string;

  @Column('text')
  reason: string;

  @Column({ type: 'simple-array', nullable: true })
  evidenceUrls: string[];

  @Column({ type: 'enum', enum: DisputeStatus, default: DisputeStatus.PENDING })
  status: DisputeStatus;

  @Column({ type: 'enum', enum: DisputeResolution, nullable: true })
  adminDecision: DisputeResolution;

  @Column({ nullable: true, type: 'text' })
  adminNotes: string;

  @Column({ nullable: true })
  resolvedByAdminId: string;

  @Column({ nullable: true })
  resolvedAt: Date;

  @OneToOne(() => Order, (o) => o.dispute)
  @JoinColumn({ name: 'orderId' })
  order: Order;

  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'raisedById' })
  raisedBy: User;

  @CreateDateColumn()
  createdAt: Date;
}
