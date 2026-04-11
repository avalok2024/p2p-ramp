import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User }     from '../../entities/user.entity';
import { Order }    from '../../entities/order.entity';
import { Dispute }  from '../../entities/dispute.entity';
import { AuditLog } from '../../entities/audit-log.entity';
import { MerchantAd } from '../../entities/merchant-ad.entity';
import {
  UserRole, KycStatus, OrderStatus, DisputeStatus,
} from '../../../../../packages/shared/src';

export type Paged<T> = { items: T[]; total: number };

function stripPassword<U extends User>(u: U): Omit<U, 'passwordHash'> {
  const { passwordHash: _, ...rest } = u as U & { passwordHash?: string };
  return rest as Omit<U, 'passwordHash'>;
}

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)       private userRepo:    Repository<User>,
    @InjectRepository(Order)      private orderRepo:   Repository<Order>,
    @InjectRepository(Dispute)    private disputeRepo: Repository<Dispute>,
    @InjectRepository(AuditLog)   private auditRepo:   Repository<AuditLog>,
    @InjectRepository(MerchantAd) private adRepo:      Repository<MerchantAd>,
  ) {}

  async getDashboardStats() {
    const [
      totalUsers, totalMerchants, totalOrders, openDisputes, completedOrders,
    ] = await Promise.all([
      this.userRepo.count({ where: { role: UserRole.USER } }),
      this.userRepo.count({ where: { role: UserRole.MERCHANT } }),
      this.orderRepo.count(),
      this.disputeRepo.count({ where: { status: DisputeStatus.PENDING } }),
      this.orderRepo.count({ where: { status: OrderStatus.COMPLETED } }),
    ]);

    const volumeResult = await this.orderRepo
      .createQueryBuilder('o')
      .select('SUM(o.fiatAmount)', 'totalVolume')
      .where('o.status = :status', { status: OrderStatus.COMPLETED })
      .getRawOne();

    return {
      totalUsers, totalMerchants, totalOrders,
      openDisputes, completedOrders,
      totalVolumeFiat: parseFloat(volumeResult?.totalVolume ?? '0'),
    };
  }

  async getAllOrders(page = 1, limit = 20, status?: OrderStatus): Promise<Paged<Order>> {
    const query = this.orderRepo.createQueryBuilder('o')
      .leftJoinAndSelect('o.user', 'user')
      .leftJoinAndSelect('o.merchant', 'merchant');
    if (status) query.where('o.status = :status', { status });
    const [rows, total] = await query
      .orderBy('o.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
    return {
      items: rows.map((o) => ({
        ...o,
        user: o.user ? stripPassword(o.user) : o.user,
        merchant: o.merchant ? stripPassword(o.merchant) : o.merchant,
      })) as Order[],
      total,
    };
  }

  async getAllDisputes(page = 1, limit = 20): Promise<Paged<Dispute>> {
    const [rows, total] = await this.disputeRepo.findAndCount({
      relations: ['order', 'order.user', 'order.merchant', 'raisedBy'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    const items = rows.map((d) => {
      const ord = d.order;
      return {
        ...d,
        raisedBy: d.raisedBy ? stripPassword(d.raisedBy) : d.raisedBy,
        order: ord
          ? {
              ...ord,
              user: ord.user ? stripPassword(ord.user) : ord.user,
              merchant: ord.merchant ? stripPassword(ord.merchant) : ord.merchant,
            }
          : ord,
      } as Dispute;
    });
    return { items, total };
  }

  async getDisputeById(id: string) {
    const dispute = await this.disputeRepo.findOne({
      where: { id },
      relations: ['order', 'order.user', 'order.merchant', 'raisedBy'],
    });
    if (!dispute) throw new NotFoundException('Dispute not found');
    return {
      ...dispute,
      raisedBy: dispute.raisedBy ? stripPassword(dispute.raisedBy) : dispute.raisedBy,
      order: dispute.order
        ? {
            ...dispute.order,
            user: dispute.order.user ? stripPassword(dispute.order.user) : dispute.order.user,
            merchant: dispute.order.merchant ? stripPassword(dispute.order.merchant) : dispute.order.merchant,
          }
        : dispute.order,
    };
  }

  async getAllUsers(page = 1, limit = 20): Promise<Paged<Omit<User, 'passwordHash'>>> {
    const [rows, total] = await this.userRepo.findAndCount({
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { items: rows.map((u) => stripPassword(u)), total };
  }

  async getMerchants(page = 1, limit = 20): Promise<Paged<Record<string, unknown>>> {
    const [merchants, total] = await this.userRepo.findAndCount({
      where: { role: UserRole.MERCHANT },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const items = await Promise.all(
      merchants.map(async (m) => {
        const activeAdsCount = await this.adRepo.count({ where: { merchantId: m.id, isActive: true } });
        const vol = await this.orderRepo
          .createQueryBuilder('o')
          .select('SUM(o.fiatAmount)', 'v')
          .where('o.merchantId = :mid', { mid: m.id })
          .andWhere('o.status = :st', { st: OrderStatus.COMPLETED })
          .getRawOne();
        const safe = stripPassword(m);
        return {
          ...safe,
          merchantStatus: m.merchantStatus ?? 'ACTIVE',
          activeAdsCount,
          totalVolumeFiat: parseFloat(vol?.v ?? '0'),
        };
      }),
    );

    return { items, total };
  }

  async banUser(userId: string, adminId: string) {
    await this.userRepo.update(userId, { isBanned: true });
    await this.logAudit(adminId, 'USER_BANNED', 'User', userId);
    return { message: 'User banned' };
  }

  async unbanUser(userId: string, adminId: string) {
    await this.userRepo.update(userId, { isBanned: false });
    await this.logAudit(adminId, 'USER_UNBANNED', 'User', userId);
    return { message: 'User unbanned' };
  }

  async approveKyc(userId: string, adminId: string) {
    await this.userRepo.update(userId, { kycStatus: KycStatus.VERIFIED });
    await this.logAudit(adminId, 'KYC_APPROVED', 'User', userId);
    return { message: 'KYC approved' };
  }

  async approveMerchant(merchantId: string, adminId: string) {
    const u = await this.userRepo.findOne({ where: { id: merchantId, role: UserRole.MERCHANT } });
    if (!u) throw new NotFoundException('Merchant not found');
    u.merchantStatus = 'ACTIVE';
    await this.userRepo.save(u);
    await this.logAudit(adminId, 'MERCHANT_APPROVED', 'User', merchantId);
    return { message: 'Merchant approved' };
  }

  async suspendMerchant(merchantId: string, adminId: string) {
    const u = await this.userRepo.findOne({ where: { id: merchantId, role: UserRole.MERCHANT } });
    if (!u) throw new NotFoundException('Merchant not found');
    u.merchantStatus = 'SUSPENDED';
    await this.userRepo.save(u);
    await this.logAudit(adminId, 'MERCHANT_SUSPENDED', 'User', merchantId);
    return { message: 'Merchant suspended' };
  }

  async activateMerchant(merchantId: string, adminId: string) {
    const u = await this.userRepo.findOne({ where: { id: merchantId, role: UserRole.MERCHANT } });
    if (!u) throw new NotFoundException('Merchant not found');
    u.merchantStatus = 'ACTIVE';
    await this.userRepo.save(u);
    await this.logAudit(adminId, 'MERCHANT_ACTIVATED', 'User', merchantId);
    return { message: 'Merchant activated' };
  }

  async getAuditLogs(page = 1, limit = 50): Promise<Paged<AuditLog>> {
    const [rows, total] = await this.auditRepo.findAndCount({
      relations: ['actor'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    const items = rows.map((l) => ({
      ...l,
      actor: l.actor ? stripPassword(l.actor) : l.actor,
    })) as AuditLog[];
    return { items, total };
  }

  private async logAudit(actorId: string, action: string, entity: string, entityId: string) {
    await this.auditRepo.save(this.auditRepo.create({ actorId, action, entity, entityId }));
  }
}
