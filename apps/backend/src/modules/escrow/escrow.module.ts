import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EscrowService }  from './escrow.service';
import { Escrow }         from '../../entities/escrow.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Escrow])],
  providers: [EscrowService],
  exports: [EscrowService],
})
export class EscrowModule {}
