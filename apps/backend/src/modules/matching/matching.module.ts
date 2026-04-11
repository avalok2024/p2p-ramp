import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MatchingService } from './matching.service';
import { MerchantAd }     from '../../entities/merchant-ad.entity';
import { Wallet }         from '../../entities/wallet.entity';

@Module({
  imports: [TypeOrmModule.forFeature([MerchantAd, Wallet])],
  providers: [MatchingService],
  exports: [MatchingService],
})
export class MatchingModule {}
