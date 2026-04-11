import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { CryptoAsset } from '../../../../packages/shared/src';
import { User } from './user.entity';

@Entity('wallets')
export class Wallet {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column({ type: 'enum', enum: CryptoAsset })
  crypto: CryptoAsset;

  @Column({ type: 'decimal', precision: 18, scale: 8, default: '0' })
  availableBalance: number;

  @Column({ type: 'decimal', precision: 18, scale: 8, default: '0' })
  lockedBalance: number;

  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'userId' })
  user: User;

  @CreateDateColumn()
  createdAt: Date;
}
