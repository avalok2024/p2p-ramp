import { Controller, Get, Post, Delete, Body, Param, UseGuards, Headers } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { NotificationService } from './notification.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser }  from '../../common/decorators/current-user.decorator';
import { User }         from '../../entities/user.entity';
import { IsString, IsOptional } from 'class-validator';

class PushSubDto {
  @IsString() endpoint:  string;
  @IsString() authKey:   string;
  @IsString() p256dhKey: string;
}

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationController {
  constructor(private readonly notifService: NotificationService) {}

  @Get()
  @ApiOperation({ summary: 'Get in-app notifications' })
  getAll(@CurrentUser() user: User) {
    return this.notifService.getInAppNotifications(user.id);
  }

  @Post(':id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  markRead(@Param('id') id: string, @CurrentUser() user: User) {
    return this.notifService.markRead(id, user.id);
  }

  @Post('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  markAllRead(@CurrentUser() user: User) {
    return this.notifService.markAllRead(user.id);
  }

  @Post('subscribe')
  @ApiOperation({ summary: 'Register a Web Push subscription' })
  subscribe(@CurrentUser() user: User, @Body() dto: PushSubDto, @Headers('user-agent') ua?: string) {
    return this.notifService.savePushSubscription(user.id, { ...dto, userAgent: ua });
  }

  @Delete('subscribe')
  @ApiOperation({ summary: 'Remove a Web Push subscription' })
  unsubscribe(@CurrentUser() user: User, @Body() dto: Pick<PushSubDto, 'endpoint'>) {
    return this.notifService.removePushSubscription(dto.endpoint, user.id);
  }
}
