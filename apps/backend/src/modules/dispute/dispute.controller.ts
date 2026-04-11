import { Controller, Post, Get, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { DisputeService, RaiseDisputeDto, ResolveDisputeDto } from './dispute.service';
import { JwtAuthGuard }  from '../../common/guards/jwt-auth.guard';
import { RolesGuard }    from '../../common/guards/roles.guard';
import { Roles }         from '../../common/decorators/roles.decorator';
import { CurrentUser }   from '../../common/decorators/current-user.decorator';
import { User }          from '../../entities/user.entity';
import { DisputeStatus, UserRole } from '../../../../../packages/shared/src';
import { IsArray, IsString } from 'class-validator';

class AddEvidenceDto {
  @IsArray() @IsString({ each: true }) urls: string[];
}

@ApiTags('Disputes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('orders/:orderId/dispute')
export class DisputeController {
  constructor(private readonly disputeService: DisputeService) {}

  @Post()
  @ApiOperation({ summary: 'Raise a dispute on an order' })
  raise(
    @Param('orderId') orderId: string,
    @CurrentUser() user: User,
    @Body() dto: RaiseDisputeDto,
  ) {
    return this.disputeService.raiseDispute(orderId, user, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get dispute for an order' })
  getDispute(@Param('orderId') orderId: string) {
    return this.disputeService.getDisputeByOrderId(orderId);
  }

  @Post(':disputeId/evidence')
  @ApiOperation({ summary: 'Add evidence to a dispute' })
  addEvidence(
    @Param('disputeId') disputeId: string,
    @CurrentUser() user: User,
    @Body() dto: AddEvidenceDto,
  ) {
    return this.disputeService.addEvidence(disputeId, user, dto.urls);
  }

  @Post(':disputeId/resolve')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '[Admin] Resolve a dispute' })
  resolve(
    @Param('disputeId') disputeId: string,
    @CurrentUser() admin: User,
    @Body() dto: ResolveDisputeDto,
  ) {
    return this.disputeService.resolveDispute(disputeId, admin, dto);
  }
}
