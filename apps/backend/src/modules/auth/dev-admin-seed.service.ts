import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../../entities/user.entity';
import { UserRole } from '../../../../../packages/shared/src';
import { WalletService } from '../wallet/wallet.service';

/**
 * If SEED_ADMIN_EMAIL + SEED_ADMIN_PASSWORD are set, ensures one ADMIN exists (dev / fresh DB).
 */
@Injectable()
export class DevAdminSeedService implements OnApplicationBootstrap {
  private readonly log = new Logger(DevAdminSeedService.name);

  constructor(
    private readonly cfg: ConfigService,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly walletService: WalletService,
  ) {}

  async onApplicationBootstrap() {
    const email = this.cfg.get<string>('SEED_ADMIN_EMAIL')?.trim();
    const password = this.cfg.get<string>('SEED_ADMIN_PASSWORD')?.trim();
    if (!email || !password) return;

    const existing = await this.userRepo.findOne({ where: { email } });
    if (existing) return;

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await this.userRepo.save(
      this.userRepo.create({
        email,
        passwordHash,
        displayName: 'Platform Admin',
        role: UserRole.ADMIN,
      }),
    );
    await this.walletService.createWalletsForUser(user.id);
    this.log.log(`Seeded admin user ${email} (set SEED_ADMIN_* only in dev; remove in production).`);
  }
}
