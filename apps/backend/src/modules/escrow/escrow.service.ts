import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Escrow }         from '../../entities/escrow.entity';
import { WalletService }  from '../wallet/wallet.service';
import { EscrowStatus }   from '../../../../../packages/shared/src';

@Injectable()
export class EscrowService {
  constructor(
    @InjectRepository(Escrow) private escrowRepo: Repository<Escrow>,
    private walletService: WalletService,
  ) {}

  async getByOrderId(orderId: string) {
    return this.escrowRepo.findOne({ where: { orderId } });
  }

  /** Admin override: force release to a specific recipient */
  async adminRelease(orderId: string, recipientId: string, adminId: string): Promise<Escrow> {
    const escrow = await this.escrowRepo.findOne({ where: { orderId } });
    if (!escrow) throw new NotFoundException('Escrow not found');
    if (escrow.status !== EscrowStatus.LOCKED)
      throw new BadRequestException(`Escrow is already ${escrow.status}`);

    await this.walletService.releaseEscrow(
      escrow.holderId, recipientId, escrow.crypto, +escrow.amount, orderId,
    );

    escrow.status = EscrowStatus.RELEASED;
    escrow.releasedAt = new Date();
    escrow.resolvedByAdminId = adminId;
    return this.escrowRepo.save(escrow);
  }

  /** Admin override: refund to holder */
  async adminRefund(orderId: string, adminId: string): Promise<Escrow> {
    const escrow = await this.escrowRepo.findOne({ where: { orderId } });
    if (!escrow) throw new NotFoundException('Escrow not found');
    if (escrow.status !== EscrowStatus.LOCKED)
      throw new BadRequestException(`Escrow is already ${escrow.status}`);

    await this.walletService.refundEscrow(
      escrow.holderId, escrow.crypto, +escrow.amount, orderId,
    );

    escrow.status = EscrowStatus.REFUNDED;
    escrow.refundedAt = new Date();
    escrow.resolvedByAdminId = adminId;
    return this.escrowRepo.save(escrow);
  }
}
