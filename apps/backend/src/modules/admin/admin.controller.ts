import { Controller, Get, Post, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AdminService }  from './admin.service';
import { JwtAuthGuard }  from '../../common/guards/jwt-auth.guard';
import { RolesGuard }    from '../../common/guards/roles.guard';
import { Roles }         from '../../common/decorators/roles.decorator';
import { CurrentUser }   from '../../common/decorators/current-user.decorator';
import { User }          from '../../entities/user.entity';
import { UserRole, OrderStatus } from '../../../../../packages/shared/src';

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Platform dashboard stats' })
  getStats() { return this.adminService.getDashboardStats(); }

  @Get('orders')
  @ApiOperation({ summary: 'All orders (paginated)' })
  getOrders(@Query('page') page = 1, @Query('limit') limit = 20, @Query('status') status?: OrderStatus) {
    return this.adminService.getAllOrders(+page, +limit, status);
  }

  @Get('disputes')
  @ApiOperation({ summary: 'All disputes (paginated)' })
  getDisputes(@Query('page') page = 1, @Query('limit') limit = 20) {
    return this.adminService.getAllDisputes(+page, +limit);
  }

  @Get('disputes/:id')
  @ApiOperation({ summary: 'Single dispute for review' })
  getDisputeOne(@Param('id') id: string) {
    return this.adminService.getDisputeById(id);
  }

  @Get('merchants')
  @ApiOperation({ summary: 'All merchants with stats' })
  getMerchants(@Query('page') page = 1, @Query('limit') limit = 20) {
    return this.adminService.getMerchants(+page, +limit);
  }

  @Post('merchants/:id/approve')
  @ApiOperation({ summary: 'Approve merchant account' })
  approveMerchant(@Param('id') id: string, @CurrentUser() admin: User) {
    return this.adminService.approveMerchant(id, admin.id);
  }

  @Post('merchants/:id/suspend')
  @ApiOperation({ summary: 'Suspend merchant' })
  suspendMerchant(@Param('id') id: string, @CurrentUser() admin: User) {
    return this.adminService.suspendMerchant(id, admin.id);
  }

  @Post('merchants/:id/activate')
  @ApiOperation({ summary: 'Re-activate merchant' })
  activateMerchant(@Param('id') id: string, @CurrentUser() admin: User) {
    return this.adminService.activateMerchant(id, admin.id);
  }

  @Get('users')
  @ApiOperation({ summary: 'All users (paginated)' })
  getUsers(@Query('page') page = 1, @Query('limit') limit = 20) {
    return this.adminService.getAllUsers(+page, +limit);
  }

  @Post('users/:id/ban')
  @ApiOperation({ summary: 'Ban a user' })
  banUser(@Param('id') id: string, @CurrentUser() admin: User) {
    return this.adminService.banUser(id, admin.id);
  }

  @Post('users/:id/unban')
  @ApiOperation({ summary: 'Unban a user' })
  unbanUser(@Param('id') id: string, @CurrentUser() admin: User) {
    return this.adminService.unbanUser(id, admin.id);
  }

  @Post('users/:id/kyc/approve')
  @ApiOperation({ summary: 'Approve user KYC' })
  approveKyc(@Param('id') id: string, @CurrentUser() admin: User) {
    return this.adminService.approveKyc(id, admin.id);
  }

  @Get('audit-logs')
  @ApiOperation({ summary: 'Audit log stream' })
  getAuditLogs(@Query('page') page = 1, @Query('limit') limit = 50) {
    return this.adminService.getAuditLogs(+page, +limit);
  }
}
