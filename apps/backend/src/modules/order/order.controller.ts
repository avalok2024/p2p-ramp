import {
  Controller, Post, Get, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { OrderService, CreateOrderDto, CreateScanPayOrderDto, SubmitReceiverDto } from './order.service';
import { JwtAuthGuard }  from '../../common/guards/jwt-auth.guard';
import { CurrentUser }   from '../../common/decorators/current-user.decorator';
import { User }          from '../../entities/user.entity';
import { OrderStatus }   from '../../../../../packages/shared/src';
import { IsOptional, IsString, IsUrl } from 'class-validator';

class MarkPaidDto {
  @IsOptional() @IsString() paymentProofUrl?: string;
}

class MerchantPaidDto {
  @IsOptional() @IsString() proofUrl?: string;
}

class SubmitReceiverBody extends SubmitReceiverDto {}

@ApiTags('Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new BUY/SELL order' })
  create(@CurrentUser() user: User, @Body() dto: CreateOrderDto) {
    return this.orderService.createOrder(user, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List my orders' })
  list(@CurrentUser() user: User, @Query('status') status?: OrderStatus) {
    return this.orderService.listOrders(user, status);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order detail with UPI QR' })
  getOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.orderService.getOrder(id, user);
  }

  @Post(':id/verify-lock')
  @ApiOperation({ summary: 'Merchant verified Web3 lock on smart contract' })
  verifyLock(@Param('id') id: string, @CurrentUser() user: User) {
    return this.orderService.verifyLock(id, user);
  }

  @Post(':id/pay')
  @ApiOperation({ summary: 'User marks "I Paid"' })
  markPaid(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() dto: MarkPaidDto,
  ) {
    return this.orderService.markPaid(id, user, dto.paymentProofUrl);
  }

  @Post(':id/confirm')
  @ApiOperation({ summary: 'Merchant confirms payment received' })
  confirm(@Param('id') id: string, @CurrentUser() user: User) {
    return this.orderService.confirmPayment(id, user);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel an order' })
  cancel(@Param('id') id: string, @CurrentUser() user: User) {
    return this.orderService.cancelOrder(id, user);
  }

  // ── Scan & Pay endpoints ──────────────────────────────────────────────

  @Post('scan-pay')
  @ApiOperation({ summary: 'Create a Scan & Pay order (trust-based, no escrow)' })
  createScanPay(@CurrentUser() user: User, @Body() dto: CreateScanPayOrderDto) {
    return this.orderService.createScanPayOrder(user, dto);
  }

  @Post(':id/merchant-paid')
  @ApiOperation({ summary: 'Merchant confirms they paid the UPI receiver' })
  merchantPaid(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() dto: MerchantPaidDto,
  ) {
    return this.orderService.merchantConfirmScanPayment(id, user, dto.proofUrl);
  }

  @Post(':id/user-confirm')
  @ApiOperation({ summary: 'User confirms the fiat receiver was paid → releases crypto to merchant' })
  userConfirm(@Param('id') id: string, @CurrentUser() user: User) {
    return this.orderService.userConfirmReceived(id, user);
  }
  @Post(':id/merchant-accept')
  @ApiOperation({ summary: 'Merchant actively accepts a Scan & Pay order' })
  merchantAccept(@Param('id') id: string, @CurrentUser() user: User) {
    return this.orderService.merchantAcceptScanPay(id, user);
  }

  @Post(':id/submit-receiver')
  @ApiOperation({ summary: 'User submits the receiver UPI/QR after merchant accepted' })
  submitReceiver(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() dto: SubmitReceiverBody,
  ) {
    return this.orderService.submitReceiver(id, user, dto);
  }
}
