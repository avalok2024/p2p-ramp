import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationService }    from './notification.service';
import { NotificationController } from './notification.controller';
import { Notification }           from '../../entities/notification.entity';
import { PushSubscription }       from '../../entities/push-subscription.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Notification, PushSubscription])],
  controllers: [NotificationController],
  providers: [NotificationService],
  exports: [NotificationService],
})
export class NotificationModule {}
