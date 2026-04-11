import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User }    from '../../entities/user.entity';
import { Wallet }  from '../../entities/wallet.entity';

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
}
