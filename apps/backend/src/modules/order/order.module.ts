import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderService }    from './order.service';
import { OrderController } from './order.controller';
import { Order }           from '../../entities/order.entity';
import { Escrow }          from '../../entities/escrow.entity';
import { MerchantAd }      from '../../entities/merchant-ad.entity';
import { WalletModule }    from '../wallet/wallet.module';
import { MatchingModule }  from '../matching/matching.module';
import { PaymentModule }   from '../payment/payment.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, Escrow, MerchantAd]),
    WalletModule,
    MatchingModule,
    PaymentModule,
    NotificationModule,
  ],
  controllers: [OrderController],
  providers: [OrderService],
  exports: [OrderService],
})
export class OrderModule {}
