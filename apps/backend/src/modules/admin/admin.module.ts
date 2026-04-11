import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminService }    from './admin.service';
import { AdminController } from './admin.controller';
import { User }     from '../../entities/user.entity';
import { Order }    from '../../entities/order.entity';
import { Dispute }  from '../../entities/dispute.entity';
import { AuditLog } from '../../entities/audit-log.entity';
import { MerchantAd } from '../../entities/merchant-ad.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Order, Dispute, AuditLog, MerchantAd])],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
