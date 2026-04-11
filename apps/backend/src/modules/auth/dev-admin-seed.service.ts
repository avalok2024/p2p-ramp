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

    const passwordHash = await bcrypt.hash(password, 12);
    
    // Admin 1
    const existing = await this.userRepo.findOne({ where: { email } });
    if (!existing) {
      const user = await this.userRepo.save(
        this.userRepo.create({
          email,
          passwordHash,
          displayName: 'Platform Admin 1',
          role: UserRole.ADMIN,
        }),
      );
      await this.walletService.createWalletsForUser(user.id);
      this.log.log(`Seeded admin 1: ${email}`);
    }

    // Admin 2
    const email2 = email.replace('@', '2@');
    const existing2 = await this.userRepo.findOne({ where: { email: email2 } });
    if (!existing2) {
      const user2 = await this.userRepo.save(
        this.userRepo.create({
          email: email2,
          passwordHash,
          displayName: 'Platform Admin 2',
          role: UserRole.ADMIN,
        }),
      );
      await this.walletService.createWalletsForUser(user2.id);
      this.log.log(`Seeded admin 2: ${email2}`);
    }
  }
}
