import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Escrow }         from '../../entities/escrow.entity';
import { WalletService }  from '../wallet/wallet.service';
import { EscrowStatus }   from '../../../../../packages/shared/src';
import { ethers }         from 'ethers';
import { ConfigService }  from '@nestjs/config';

@Injectable()
export class EscrowService {
  private provider: ethers.JsonRpcProvider;
  private wallet: ethers.Wallet | any;
  private contract: ethers.Contract;

  constructor(
    @InjectRepository(Escrow) private escrowRepo: Repository<Escrow>,
    private walletService: WalletService,
    private config: ConfigService,
  ) {
    const rpcUrl = this.config.get('WEB3_RPC_URL') || 'https://rpc2.sepolia.org';
    const privateKey = this.config.get('WEB3_PRIVATE_KEY') || '0x0000000000000000000000000000000000000000000000000000000000000000';
    const contractAddress = this.config.get('ESCROW_CONTRACT_ADDRESS') || '0x0000000000000000000000000000000000000000';

    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    
    // We only attach wallet if we have a real key (don't break test run without it)
    if (privateKey !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
        this.wallet = new ethers.Wallet(privateKey, this.provider);
    } else {
        this.wallet = ethers.Wallet.createRandom().connect(this.provider);
    }

    const abi = [
      "function release(bytes32 orderId) external",
      "function refund(bytes32 orderId) external"
    ];
    this.contract = new ethers.Contract(contractAddress, abi, this.wallet);
  }

  // Convert uuid '1ab11917-...' to bytes32 format for contract call
  private uuidToBytes32(uuid: string): string {
    return '0x' + uuid.replace(/-/g, '').padEnd(64, '0');
  }

  async getByOrderId(orderId: string) {
    return this.escrowRepo.findOne({ where: { orderId } });
  }

  /** Admin override: force release to a specific recipient */
  async adminRelease(orderId: string, recipientId: string, adminId: string): Promise<Escrow> {
    const escrow = await this.escrowRepo.findOne({ where: { orderId } });
    if (!escrow) throw new NotFoundException('Escrow not found');
    if (escrow.status !== EscrowStatus.LOCKED)
      throw new BadRequestException(`Escrow is already ${escrow.status}`);

    // Attempt to process on-chain transaction (if properly configured)
    if (this.config.get('WEB3_PRIVATE_KEY')) {
      try {
        const tx = await this.contract.release(this.uuidToBytes32(orderId));
        await tx.wait();
      } catch (e) {
        console.error('On-chain release failed:', e);
        // Depending on strictness, we might throw here, 
        // but for hybrid transition phase, we continue local db update
      }
    }

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

    // Attempt to process on-chain transaction
    if (this.config.get('WEB3_PRIVATE_KEY')) {
      try {
        const tx = await this.contract.refund(this.uuidToBytes32(orderId));
        await tx.wait();
      } catch (e) {
        console.error('On-chain refund failed:', e);
      }
    }

    await this.walletService.refundEscrow(
      escrow.holderId, escrow.crypto, +escrow.amount, orderId,
    );

    escrow.status = EscrowStatus.REFUNDED;
    escrow.refundedAt = new Date();
    escrow.resolvedByAdminId = adminId;
    return this.escrowRepo.save(escrow);
  }
}
