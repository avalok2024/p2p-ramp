import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DisputeService }    from './dispute.service';
import { DisputeController } from './dispute.controller';
import { Dispute }           from '../../entities/dispute.entity';
import { Order }             from '../../entities/order.entity';
import { EscrowModule }      from '../escrow/escrow.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Dispute, Order]),
    EscrowModule,
    NotificationModule,
  ],
  controllers: [DisputeController],
  providers: [DisputeService],
  exports: [DisputeService],
})
export class DisputeModule {}
