import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { MerchantService, CreateAdDto } from './merchant.service';
import { JwtAuthGuard }  from '../../common/guards/jwt-auth.guard';
import { CurrentUser }   from '../../common/decorators/current-user.decorator';
import { User }          from '../../entities/user.entity';
import { CryptoAsset }   from '../../../../../packages/shared/src';
import { IsOptional } from 'class-validator';

@ApiTags('Merchant / Ads')
@Controller('merchants')
export class MerchantController {
  constructor(private readonly merchantService: MerchantService) {}

  /** Public – list all active ads (for the buy flow) */
  @Get('ads')
  @ApiOperation({ summary: 'List active merchant ads' })
  getActiveAds(@Query('crypto') crypto?: CryptoAsset) {
    return this.merchantService.getActiveAds(crypto);
  }

  @Get('ads/:id')
  @ApiOperation({ summary: 'Get single ad by ID' })
  getAd(@Param('id') id: string) {
    return this.merchantService.getAdById(id);
  }

  /** Protected – merchant CRUD */
  @Post('ads')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new merchant ad' })
  createAd(@CurrentUser() user: User, @Body() dto: CreateAdDto) {
    return this.merchantService.createAd(user, dto);
  }

  @Get('my-ads')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my ads' })
  getMyAds(@CurrentUser() user: User) {
    return this.merchantService.getMyAds(user.id);
  }

  @Patch('ads/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update an ad' })
  updateAd(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() dto: Partial<CreateAdDto> & { isActive?: boolean },
  ) {
    return this.merchantService.updateAd(id, user.id, dto);
  }

  @Delete('ads/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete an ad' })
  deleteAd(@Param('id') id: string, @CurrentUser() user: User) {
    return this.merchantService.deleteAd(id, user.id);
  }
}
