import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderService }    from './order.service';
import { OrderController } from './order.controller';
import { Order }           from '../../entities/order.entity';
import { Escrow }          from '../../entities/escrow.entity';
import { MerchantAd }      from '../../entities/merchant-ad.entity';
import { MatchingModule }  from '../matching/matching.module';
import { PaymentModule }   from '../payment/payment.module';
import { NotificationModule } from '../notification/notification.module';
import { EscrowModule } from '../escrow/escrow.module';
import { WalletModule } from '../wallet/wallet.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, Escrow, MerchantAd]),
    MatchingModule,
    PaymentModule,
    NotificationModule,
    EscrowModule,
    WalletModule,
  ],
  controllers: [OrderController],
  providers: [OrderService],
  exports: [OrderService],
})
export class OrderModule {}
