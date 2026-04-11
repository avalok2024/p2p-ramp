import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { WalletService } from './wallet.service';
import { JwtAuthGuard }  from '../../common/guards/jwt-auth.guard';
import { CurrentUser }   from '../../common/decorators/current-user.decorator';
import { User }          from '../../entities/user.entity';
import { CryptoAsset }   from '../../../../../packages/shared/src';
import { IsEnum, IsNumber, Min } from 'class-validator';

class DepositDto {
  @IsEnum(CryptoAsset) crypto: CryptoAsset;
  @IsNumber() @Min(0.00000001) amount: number;
}

@ApiTags('Wallet')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get()
  @ApiOperation({ summary: 'Get all wallets for current user' })
  getWallets(@CurrentUser() user: User) {
    return this.walletService.getWallets(user.id);
  }

  @Get('transactions')
  @ApiOperation({ summary: 'Get wallet transaction history' })
  getTransactions(
    @CurrentUser() user: User,
    @Query('crypto') crypto?: CryptoAsset,
  ) {
    return this.walletService.getTransactions(user.id, crypto);
  }

  @Post('deposit')
  @ApiOperation({ summary: '[MVP] Simulate a crypto deposit' })
  deposit(@CurrentUser() user: User, @Body() dto: DepositDto) {
    return this.walletService.deposit(user.id, dto.crypto, dto.amount);
  }
}
