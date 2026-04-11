import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EscrowService }  from './escrow.service';
import { Escrow }         from '../../entities/escrow.entity';
import { WalletModule }   from '../wallet/wallet.module';

@Module({
  imports: [TypeOrmModule.forFeature([Escrow]), WalletModule],
  providers: [EscrowService],
  exports: [EscrowService],
})
export class EscrowModule {}
