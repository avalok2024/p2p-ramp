import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User }    from '../../entities/user.entity';
import { Wallet }  from '../../entities/wallet.entity';
import * as bcrypt from 'bcrypt';
import { BadRequestException } from '@nestjs/common';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)   private userRepo: Repository<User>,
    @InjectRepository(Wallet) private walletRepo: Repository<Wallet>,
  ) {}

  async getProfile(id: string) {
    return this.userRepo.findOneOrFail({ where: { id } });
  }

  async updateProfile(id: string, data: Partial<Pick<User, 'displayName' | 'phone' | 'web3Address'>>) {
    await this.userRepo.update(id, data);
    return this.userRepo.findOneOrFail({ where: { id } });
  }

  async getStats(id: string) {
    const user = await this.userRepo.findOneOrFail({ where: { id } });
    const wallets = await this.walletRepo.find({ where: { userId: id } });
    return { user, wallets };
  }

  async changePassword(id: string, currentPass: string, newPass: string) {
    const user = await this.userRepo.findOneOrFail({ where: { id } });
    const isMatch = await bcrypt.compare(currentPass, user.passwordHash);
    if (!isMatch) throw new BadRequestException('Incorrect current password');
    const passwordHash = await bcrypt.hash(newPass, 12);
    await this.userRepo.update(id, { passwordHash });
    return { success: true };
  }
}
