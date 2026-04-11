import {
  Injectable, BadRequestException, NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Wallet }            from '../../entities/wallet.entity';
import { WalletTransaction } from '../../entities/wallet-transaction.entity';
import { CryptoAsset, WalletTransactionType } from '../../../../../packages/shared/src';

@Injectable()
export class WalletService {
  constructor(
    @InjectRepository(Wallet)            private walletRepo: Repository<Wallet>,
    @InjectRepository(WalletTransaction) private txnRepo:    Repository<WalletTransaction>,
    private dataSource: DataSource,
  ) {}

  // ── Public queries ────────────────────────────────────────────────────────

  async getWallets(userId: string): Promise<Wallet[]> {
    return this.walletRepo.find({ where: { userId }, order: { crypto: 'ASC' } });
  }

  async getTransactions(userId: string, crypto?: CryptoAsset): Promise<WalletTransaction[]> {
    const where: any = { userId };
    if (crypto) where.crypto = crypto;
    return this.txnRepo.find({ where, order: { createdAt: 'DESC' }, take: 50 });
  }

  // ── Initialisation (called from AuthService on register) ──────────────────

  async createWalletsForUser(userId: string): Promise<void> {
    const assets = Object.values(CryptoAsset);
    for (const crypto of assets) {
      const existing = await this.walletRepo.findOne({ where: { userId, crypto } });
      if (!existing) {
        await this.walletRepo.save(this.walletRepo.create({ userId, crypto }));
      }
    }
  }

  // ── Simulated deposit (MVP) ───────────────────────────────────────────────

  async deposit(userId: string, crypto: CryptoAsset, amount: number): Promise<Wallet> {
    return this.dataSource.transaction(async (em) => {
      const wallet = await em.findOne(Wallet, { where: { userId, crypto }, lock: { mode: 'pessimistic_write' } });
      if (!wallet) throw new NotFoundException('Wallet not found');

      const before = +wallet.availableBalance;
      wallet.availableBalance = parseFloat((before + amount).toFixed(8)) as any;
      await em.save(wallet);

      await em.save(em.create(WalletTransaction, {
        userId, crypto,
        type:         WalletTransactionType.DEPOSIT,
        amount:       amount,
        balanceAfter: +wallet.availableBalance,
        note:         `Simulated deposit of ${amount} ${crypto}`,
      }));

      return wallet;
    });
  }

  // ── Escrow operations ─────────────────────────────────────────────────────

  /** Lock funds from available → locked (used when order is created) */
  async lockForEscrow(
    userId: string,
    crypto: CryptoAsset,
    amount: number,
    orderId: string,
  ): Promise<void> {
    await this.dataSource.transaction(async (em) => {
      const wallet = await em.findOne(Wallet, {
        where: { userId, crypto },
        lock: { mode: 'pessimistic_write' },
      });
      if (!wallet) throw new NotFoundException('Wallet not found');
      if (+wallet.availableBalance < amount)
        throw new BadRequestException(
          `Insufficient balance: available ${wallet.availableBalance} ${crypto}, required ${amount}`,
        );

      wallet.availableBalance = parseFloat((+wallet.availableBalance - amount).toFixed(8)) as any;
      wallet.lockedBalance    = parseFloat((+wallet.lockedBalance    + amount).toFixed(8)) as any;
      await em.save(wallet);

      await em.save(em.create(WalletTransaction, {
        userId, crypto,
        type:         WalletTransactionType.ESCROW_LOCK,
        amount:       -amount,
        balanceAfter: +wallet.availableBalance,
        relatedOrderId: orderId,
        note:         `Escrow locked for order ${orderId}`,
      }));
    });
  }

  /**
   * Release escrow: deduct from holder's locked → credit to recipient's available.
   * Used on successful trade completion.
   */
  async releaseEscrow(
    holderId:    string,
    recipientId: string,
    crypto:      CryptoAsset,
    amount:      number,
    orderId:     string,
  ): Promise<void> {
    await this.dataSource.transaction(async (em) => {
      // 1. Deduct from holder's locked balance
      const holderWallet = await em.findOne(Wallet, {
        where: { userId: holderId, crypto },
        lock: { mode: 'pessimistic_write' },
      });
      if (!holderWallet) throw new NotFoundException('Holder wallet not found');
      holderWallet.lockedBalance = parseFloat((+holderWallet.lockedBalance - amount).toFixed(8)) as any;
      await em.save(holderWallet);

      await em.save(em.create(WalletTransaction, {
        userId: holderId, crypto,
        type:   WalletTransactionType.ESCROW_RELEASE,
        amount: -amount,
        balanceAfter: +holderWallet.availableBalance,
        relatedOrderId: orderId,
        note:   `Escrow released for order ${orderId}`,
      }));

      // 2. Credit recipient's available balance
      const recipientWallet = await em.findOne(Wallet, {
        where: { userId: recipientId, crypto },
        lock: { mode: 'pessimistic_write' },
      });
      if (!recipientWallet) throw new NotFoundException('Recipient wallet not found');
      recipientWallet.availableBalance = parseFloat((+recipientWallet.availableBalance + amount).toFixed(8)) as any;
      await em.save(recipientWallet);

      await em.save(em.create(WalletTransaction, {
        userId: recipientId, crypto,
        type:   WalletTransactionType.TRADE_CREDIT,
        amount: +amount,
        balanceAfter: +recipientWallet.availableBalance,
        relatedOrderId: orderId,
        note:   `Trade credit from order ${orderId}`,
      }));
    });
  }

  /**
   * Refund escrow: move funds from locked → available (same user).
   * Used on cancellation or admin refund decision.
   */
  async refundEscrow(
    holderId: string,
    crypto:   CryptoAsset,
    amount:   number,
    orderId:  string,
  ): Promise<void> {
    await this.dataSource.transaction(async (em) => {
      const wallet = await em.findOne(Wallet, {
        where: { userId: holderId, crypto },
        lock: { mode: 'pessimistic_write' },
      });
      if (!wallet) throw new NotFoundException('Wallet not found');

      wallet.lockedBalance    = parseFloat((+wallet.lockedBalance    - amount).toFixed(8)) as any;
      wallet.availableBalance = parseFloat((+wallet.availableBalance + amount).toFixed(8)) as any;
      await em.save(wallet);

      await em.save(em.create(WalletTransaction, {
        userId: holderId, crypto,
        type:         WalletTransactionType.ESCROW_REFUND,
        amount:       +amount,
        balanceAfter: +wallet.availableBalance,
        relatedOrderId: orderId,
        note:         `Escrow refunded for order ${orderId}`,
      }));
    });
  }
}
