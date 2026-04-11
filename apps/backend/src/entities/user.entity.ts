import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn,
} from 'typeorm';
import { UserRole, KycStatus } from '../../../../packages/shared/src';
import { Exclude } from 'class-transformer';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  @Exclude()
  passwordHash: string;

  @Column({ nullable: true })
  displayName: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.USER })
  role: UserRole;

  /** PENDING | ACTIVE | SUSPENDED — only meaningful when role is MERCHANT */
  @Column({ type: 'varchar', length: 20, nullable: true })
  merchantStatus: string | null;

  @Column({ type: 'enum', enum: KycStatus, default: KycStatus.PENDING })
  kycStatus: KycStatus;

  @Column({ default: false })
  isBanned: boolean;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 5.00 })
  rating: number;

  @Column({ default: 0 })
  completedTrades: number;

  @Column({ nullable: true })
  kycDocumentUrl: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
