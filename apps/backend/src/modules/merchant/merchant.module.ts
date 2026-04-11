import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MerchantService }    from './merchant.service';
import { MerchantController } from './merchant.controller';
import { MerchantAd }         from '../../entities/merchant-ad.entity';

@Module({
  imports: [TypeOrmModule.forFeature([MerchantAd])],
  controllers: [MerchantController],
  providers: [MerchantService],
  exports: [MerchantService],
})
export class MerchantModule {}
