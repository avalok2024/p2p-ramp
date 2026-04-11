import {
  Injectable, NotFoundException, BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Dispute }          from '../../entities/dispute.entity';
import { Order }            from '../../entities/order.entity';
import { EscrowService }    from '../escrow/escrow.service';
import { NotificationService } from '../notification/notification.service';
import {
  DisputeStatus, DisputeResolution, OrderStatus,
  NotificationType,
} from '../../../../../packages/shared/src';
import { User } from '../../entities/user.entity';
import { IsString, IsOptional, IsArray, IsEnum } from 'class-validator';

export class RaiseDisputeDto {
  @IsString() reason: string;
  @IsOptional() @IsArray() @IsString({ each: true }) evidenceUrls?: string[];
}

export class ResolveDisputeDto {
  @IsEnum(DisputeResolution) decision: DisputeResolution;
  @IsOptional() @IsString()  adminNotes?: string;
}

@Injectable()
export class DisputeService {
  constructor(
    @InjectRepository(Dispute) private disputeRepo: Repository<Dispute>,
    @InjectRepository(Order)   private orderRepo: Repository<Order>,
    private escrowService:  EscrowService,
    private notifService:   NotificationService,
  ) {}

  async raiseDispute(orderId: string, user: User, dto: RaiseDisputeDto) {
    const order = await this.orderRepo.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');

    const isParty = order.userId === user.id || order.merchantId === user.id;
    if (!isParty) throw new BadRequestException('Not a party to this order');

    if (order.status !== OrderStatus.PAID_MARKED) {
      throw new BadRequestException(
        'Open a dispute only after you tap “I Paid” and the order shows Paid (awaiting merchant). ' +
          `Current status: ${order.status}.`,
      );
    }

    const existing = await this.disputeRepo.findOne({ where: { orderId } });
    if (existing) throw new BadRequestException('Dispute already opened for this order');

    order.status = OrderStatus.DISPUTE;
    await this.orderRepo.save(order);

    const dispute = this.disputeRepo.create({
      orderId,
      raisedById: user.id,
      reason: dto.reason,
      evidenceUrls: dto.evidenceUrls ?? [],
      status: DisputeStatus.PENDING,
    });
    await this.disputeRepo.save(dispute);

    // Notify both parties
    await this.notifService.send(order.userId, NotificationType.DISPUTE_OPENED, {
      title: '⚖️ Dispute Opened',
      message: 'A dispute has been opened for your order. Admin will review shortly.',
      data: { orderId },
    });
    await this.notifService.send(order.merchantId, NotificationType.DISPUTE_OPENED, {
      title: '⚖️ Dispute Opened',
      message: 'A dispute has been opened. Please await admin resolution.',
      data: { orderId },
    });

    return dispute;
  }

  async addEvidence(disputeId: string, user: User, urls: string[]) {
    const dispute = await this.disputeRepo.findOne({ where: { id: disputeId } });
    if (!dispute) throw new NotFoundException('Dispute not found');
    dispute.evidenceUrls = [...(dispute.evidenceUrls ?? []), ...urls];
    return this.disputeRepo.save(dispute);
  }

  async getDisputeByOrderId(orderId: string) {
    return this.disputeRepo.findOne({ where: { orderId }, relations: ['raisedBy'] });
  }

  async listDisputes(status?: DisputeStatus) {
    const where = status ? { status } : {};
    return this.disputeRepo.find({ where, order: { createdAt: 'DESC' }, relations: ['order', 'raisedBy'] });
  }

  /** Admin resolves the dispute */
  async resolveDispute(disputeId: string, admin: User, dto: ResolveDisputeDto) {
    const dispute = await this.disputeRepo.findOne({ where: { id: disputeId }, relations: ['order'] });
    if (!dispute) throw new NotFoundException('Dispute not found');
    if (dispute.status === DisputeStatus.RESOLVED)
      throw new BadRequestException('Dispute already resolved');

    const order = dispute.order;

    if (dto.decision === DisputeResolution.RELEASE_TO_USER) {
      // Release escrow to the user
      await this.escrowService.adminRelease(order.id, order.userId, admin.id);
      order.status = OrderStatus.COMPLETED;
    } else if (dto.decision === DisputeResolution.REFUND_TO_MERCHANT) {
      await this.escrowService.adminRefund(order.id, admin.id);
      order.status = OrderStatus.REFUNDED;
    } else {
      // HOLD — keep escrow locked, just update dispute status
      dispute.status = DisputeStatus.UNDER_REVIEW;
      dispute.adminNotes = dto.adminNotes;
      return this.disputeRepo.save(dispute);
    }

    await this.orderRepo.save(order);

    dispute.status = DisputeStatus.RESOLVED;
    dispute.adminDecision = dto.decision;
    dispute.adminNotes = dto.adminNotes;
    dispute.resolvedByAdminId = admin.id;
    dispute.resolvedAt = new Date();
    await this.disputeRepo.save(dispute);

    // Notify both parties
    const msg =
      dto.decision === DisputeResolution.RELEASE_TO_USER
        ? 'Dispute resolved: crypto released to buyer.'
        : 'Dispute resolved: funds returned to merchant.';

    await this.notifService.send(order.userId, NotificationType.DISPUTE_RESOLVED, {
      title: '✅ Dispute Resolved', message: msg, data: { orderId: order.id },
    });
    await this.notifService.send(order.merchantId, NotificationType.DISPUTE_RESOLVED, {
      title: '✅ Dispute Resolved', message: msg, data: { orderId: order.id },
    });

    return dispute;
  }
}
