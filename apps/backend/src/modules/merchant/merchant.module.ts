import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MerchantService }    from './merchant.service';
import { MerchantController } from './merchant.controller';
import { MerchantAd }         from '../../entities/merchant-ad.entity';
import { User }               from '../../entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([MerchantAd, User])],
  controllers: [MerchantController],
  providers: [MerchantService],
  exports: [MerchantService],
})
export class MerchantModule {}
