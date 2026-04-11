import {
  Controller, Post, Get, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { OrderService, CreateOrderDto } from './order.service';
import { JwtAuthGuard }  from '../../common/guards/jwt-auth.guard';
import { CurrentUser }   from '../../common/decorators/current-user.decorator';
import { User }          from '../../entities/user.entity';
import { OrderStatus }   from '../../../../../packages/shared/src';
import { IsOptional, IsString, IsUrl } from 'class-validator';

class MarkPaidDto {
  @IsOptional() @IsString() paymentProofUrl?: string;
}

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
}
