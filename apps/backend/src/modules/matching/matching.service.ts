import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MerchantAd }  from '../../entities/merchant-ad.entity';
import { Wallet }      from '../../entities/wallet.entity';
import { CryptoAsset, OrderType } from '../../../../../packages/shared/src';

export interface MatchResult {
  ad: MerchantAd;
  merchantId: string;
  cryptoAmount: number;
  pricePerUnit: number;
}

@Injectable()
export class MatchingService {
  constructor(
    @InjectRepository(MerchantAd) private adRepo: Repository<MerchantAd>,
    @InjectRepository(Wallet)     private walletRepo: Repository<Wallet>,
  ) {}

  /**
   * For BUY orders: find the cheapest active merchant ad that:
   *  1. Matches the crypto
   *  2. Has fiat amount within [minAmount, maxAmount]
   *  3. Merchant has enough available balance to lock in escrow
   */
  async findBestAd(
    type: OrderType,
    crypto: CryptoAsset,
    fiatAmount: number,
  ): Promise<MatchResult> {
    const ads = await this.adRepo
      .createQueryBuilder('ad')
      .leftJoinAndSelect('ad.merchant', 'merchant')
      .where('ad.isActive = true')
      // Only match with fully-approved merchants
      .andWhere('merchant.merchantStatus = :ms', { ms: 'ACTIVE' })
      .andWhere('ad.crypto = :crypto', { crypto })
      .andWhere('ad.minAmount <= :fiat', { fiat: fiatAmount })
      .andWhere('ad.maxAmount >= :fiat', { fiat: fiatAmount })
      .orderBy('ad.pricePerUnit', type === OrderType.BUY ? 'ASC' : 'DESC')
      .getMany();

    if (!ads.length) {
      throw new NotFoundException('No matching merchant ad found for this order. Try a different amount.');
    }

    // For BUY: user pays fiat, gets crypto → merchant must have enough crypto locked
    for (const ad of ads) {
      const cryptoAmount = fiatAmount / +ad.pricePerUnit;
      const merchantWallet = await this.walletRepo.findOne({
        where: { userId: ad.merchantId, crypto },
      });

      if (merchantWallet && +merchantWallet.availableBalance >= cryptoAmount) {
        return {
          ad,
          merchantId: ad.merchantId,
          cryptoAmount: parseFloat(cryptoAmount.toFixed(8)),
          pricePerUnit: +ad.pricePerUnit,
        };
      }
    }

    throw new BadRequestException('Matching merchant found but has insufficient balance. Please try later.');
  }

  async findBestScanPayMerchant(
    crypto: CryptoAsset,
    fiatAmount: number,
  ): Promise<MatchResult> {
    // Get all active ads matching the crypto (merchant must have BUY ad active = accepting crypto)
    const ads = await this.adRepo
      .createQueryBuilder('ad')
      .leftJoinAndSelect('ad.merchant', 'merchant')
      .where('ad.isActive = true')
      .andWhere('merchant.merchantStatus = :ms', { ms: 'ACTIVE' })
      .andWhere('ad.crypto = :crypto', { crypto })
      .andWhere('ad.minAmount <= :fiatAmount', { fiatAmount })
      .andWhere('ad.maxAmount >= :fiatAmount', { fiatAmount })
      .orderBy('ad.pricePerUnit', 'DESC') // Best rate for user (highest INR per crypto)
      .getMany();

    if (!ads.length) {
      throw new BadRequestException('No merchant available for this amount. Try a different amount or later.');
    }

    // In Scan & Pay (Trust-based), the USER sends crypto to the MERCHANT.
    // The merchant does NOT need crypto balance, they just need to be active
    // properly verified to fulfill the fiat payment.
    const bestAd = ads[0];
    const cryptoAmount = fiatAmount / +bestAd.pricePerUnit;

    return {
      ad: bestAd,
      merchantId: bestAd.merchantId,
      cryptoAmount: parseFloat(cryptoAmount.toFixed(8)),
      pricePerUnit: +bestAd.pricePerUnit,
    };
  }
}
