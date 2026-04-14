import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Escrow }         from '../../entities/escrow.entity';
import { EscrowStatus }   from '../../../../../packages/shared/src';
import { ethers }         from 'ethers';
import { ConfigService }  from '@nestjs/config';

const ZERO_KEY = '0x0000000000000000000000000000000000000000000000000000000000000000';
const ZERO_ADDR = '0x0000000000000000000000000000000000000000';

/** Matches P2PEscrow.EscrowStatus on-chain */
const OnChainEscrowStatus = { NONE: 0, LOCKED: 1, RELEASED: 2, REFUNDED: 3 } as const;

@Injectable()
export class EscrowService {
  private provider: ethers.JsonRpcProvider;
  private signer: ethers.Wallet | null;
  private contract: ethers.Contract;
  private contractAddress: string;

  constructor(
    @InjectRepository(Escrow) private escrowRepo: Repository<Escrow>,
    private config: ConfigService,
  ) {
    const rpcUrl = this.config.get('WEB3_RPC_URL') || 'https://rpc2.sepolia.org';
    const privateKey = (this.config.get('WEB3_PRIVATE_KEY') || ZERO_KEY).trim();
    this.contractAddress = (this.config.get('ESCROW_CONTRACT_ADDRESS') || ZERO_ADDR).trim();

    this.provider = new ethers.JsonRpcProvider(rpcUrl);

    const hasRealKey = privateKey.length > 0 && privateKey !== ZERO_KEY;
    this.signer = hasRealKey ? new ethers.Wallet(privateKey, this.provider) : null;

    const abi = [
      'function release(bytes32 orderId) external',
      'function refund(bytes32 orderId) external',
      'function escrows(bytes32) view returns (uint256 amount, address depositor, address intendedRecipient, uint8 status)',
    ];
    const runner = this.signer ?? ethers.Wallet.createRandom().connect(this.provider);
    this.contract = new ethers.Contract(this.contractAddress, abi, runner);
  }

  // Convert uuid '1ab11917-...' to bytes32 format for contract call
  private uuidToBytes32(uuid: string): string {
    return '0x' + uuid.replace(/-/g, '').padEnd(64, '0');
  }

  private signedEscrow(): ethers.Contract {
    if (!this.signer) throw new BadRequestException('Signer not configured');
    return new ethers.Contract(this.contractAddress, this.contract.interface, this.signer);
  }

  async getByOrderId(orderId: string) {
    return this.escrowRepo.findOne({ where: { orderId } });
  }

  /**
   * After fiat is confirmed, move locked ETH to the on-chain recipient.
   * Uses the contract owner (same wallet as WEB3_PRIVATE_KEY / deployer) — P2PEscrow allows owner to release.
   * This avoids relying on the merchant/user client wallet for release (wrong account, gas, or wrong RPC).
   */
  async releaseTradeEscrow(orderUuid: string): Promise<void> {
    if (!this.signer) {
      throw new BadRequestException(
        'WEB3_PRIVATE_KEY is not set. Set it to the P2PEscrow deployer key (contract owner) so the server can release escrow.',
      );
    }
    if (!this.contractAddress || this.contractAddress === ZERO_ADDR) {
      throw new BadRequestException(
        'ESCROW_CONTRACT_ADDRESS is not set. Deploy P2PEscrow and set the address in backend .env.',
      );
    }

    const b32 = this.uuidToBytes32(orderUuid);
    let statusNum: number;
    try {
      const readOnly = new ethers.Contract(this.contractAddress, this.contract.interface, this.provider);
      const row = await readOnly.escrows(b32);
      const st = row.status;
      statusNum = typeof st === 'bigint' ? Number(st) : Number(st);
    } catch (e: any) {
      throw new BadRequestException(
        `Cannot read on-chain escrow (wrong ESCROW_CONTRACT_ADDRESS or RPC?). ${e?.shortMessage || e?.message || e}`,
      );
    }

    if (statusNum === OnChainEscrowStatus.RELEASED) {
      return;
    }
    if (statusNum !== OnChainEscrowStatus.LOCKED) {
      throw new BadRequestException(
        'On-chain escrow is not locked (deposit may not have been confirmed on this contract/network).',
      );
    }

    try {
      const tx = await this.signedEscrow().release(b32);
      await tx.wait();
    } catch (e: any) {
      const msg = e?.shortMessage || e?.reason || e?.message || String(e);
      throw new BadRequestException(`On-chain release failed: ${msg}`);
    }
  }

  /** Public config for frontends (same chain/contract the backend uses). */
  getPublicEscrowConfig(): { escrowContractAddress: string; web3RpcUrl: string } {
    return {
      escrowContractAddress: this.contractAddress === ZERO_ADDR ? '' : this.contractAddress,
      web3RpcUrl: this.config.get('WEB3_RPC_URL') || 'https://rpc2.sepolia.org',
    };
  }

  /** Admin override: force release to a specific recipient */
  async adminRelease(orderId: string, recipientId: string, adminId: string): Promise<Escrow> {
    const escrow = await this.escrowRepo.findOne({ where: { orderId } });
    if (!escrow) throw new NotFoundException('Escrow not found');
    if (escrow.status !== EscrowStatus.LOCKED)
      throw new BadRequestException(`Escrow is already ${escrow.status}`);

    if (!this.signer) {
      throw new BadRequestException('Backend missing private key. Cannot sign Web3 force-release.');
    }

    try {
      const tx = await this.signedEscrow().release(this.uuidToBytes32(orderId));
      await tx.wait();
    } catch (e) {
      console.error('On-chain release failed:', e);
      throw new BadRequestException('On-chain release failed');
    }

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

    if (!this.signer) {
      throw new BadRequestException('Backend missing private key. Cannot sign Web3 refund.');
    }

    try {
      const tx = await this.signedEscrow().refund(this.uuidToBytes32(orderId));
      await tx.wait();
    } catch (e) {
      console.error('On-chain refund failed:', e);
      throw new BadRequestException('On-chain refund failed');
    }

    escrow.status = EscrowStatus.REFUNDED;
    escrow.refundedAt = new Date();
    escrow.resolvedByAdminId = adminId;
    return this.escrowRepo.save(escrow);
  }
}
