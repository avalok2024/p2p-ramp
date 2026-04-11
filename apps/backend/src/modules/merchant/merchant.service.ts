import {
  Injectable, NotFoundException, ForbiddenException, BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MerchantAd }  from '../../entities/merchant-ad.entity';
import { User }        from '../../entities/user.entity';
import { UserRole, CryptoAsset, PaymentMethod } from '../../../../../packages/shared/src';
import {
  IsEnum, IsNumber, IsArray, IsOptional, IsString,
  IsBoolean, Min, Max, IsUrl,
} from 'class-validator';

export class CreateAdDto {
  @IsEnum(CryptoAsset)      crypto: CryptoAsset;
  @IsNumber() @Min(0.01)    pricePerUnit: number;
  @IsNumber() @Min(1)       minAmount: number;
  @IsNumber()               maxAmount: number;
  @IsArray() @IsEnum(PaymentMethod, { each: true }) paymentMethods: PaymentMethod[];
  @IsOptional() @IsString() upiId?: string;
  @IsOptional() @IsString() bankAccountNumber?: string;
  @IsOptional() @IsString() bankIfsc?: string;
  @IsOptional() @IsString() bankAccountName?: string;
  @IsOptional() @IsString() paymentRemarks?: string;
  @IsOptional() @IsNumber() @Min(5) @Max(120) paymentWindowMinutes?: number;
}

@Injectable()
export class MerchantService {
  constructor(
    @InjectRepository(MerchantAd) private adRepo: Repository<MerchantAd>,
  ) {}

  async createAd(merchant: User, dto: CreateAdDto) {
    if (merchant.role !== UserRole.MERCHANT && merchant.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only merchants can create ads');
    }
    const ad = this.adRepo.create({ ...dto, merchantId: merchant.id });
    return this.adRepo.save(ad);
  }

  async getMyAds(merchantId: string) {
    return this.adRepo.find({
      where: { merchantId },
      order: { createdAt: 'DESC' },
    });
  }

  async getActiveAds(crypto?: CryptoAsset) {
    const query = this.adRepo.createQueryBuilder('ad')
      .leftJoinAndSelect('ad.merchant', 'merchant')
      .where('ad.isActive = true');
    if (crypto) query.andWhere('ad.crypto = :crypto', { crypto });
    query.orderBy('ad.pricePerUnit', 'ASC');
    return query.getMany();
  }

  async getAdById(id: string) {
    const ad = await this.adRepo.findOne({ where: { id }, relations: ['merchant'] });
    if (!ad) throw new NotFoundException('Ad not found');
    return ad;
  }

  async updateAd(id: string, merchantId: string, data: Partial<CreateAdDto> & { isActive?: boolean }) {
    const ad = await this.adRepo.findOne({ where: { id } });
    if (!ad) throw new NotFoundException('Ad not found');
    if (ad.merchantId !== merchantId) throw new ForbiddenException('Not your ad');
    Object.assign(ad, data);
    return this.adRepo.save(ad);
  }

  async deleteAd(id: string, merchantId: string) {
    const ad = await this.adRepo.findOne({ where: { id } });
    if (!ad) throw new NotFoundException('Ad not found');
    if (ad.merchantId !== merchantId) throw new ForbiddenException('Not your ad');
    await this.adRepo.remove(ad);
    return { message: 'Ad deleted' };
  }
}
