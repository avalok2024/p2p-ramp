import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService }    from '@nestjs/jwt';
import * as bcrypt       from 'bcrypt';
import { User }          from '../../entities/user.entity';
import { WalletService } from '../wallet/wallet.service';
import { UserRole }      from '../../../../../packages/shared/src';
import { IsEmail, IsString, MinLength, IsOptional, IsEnum } from 'class-validator';

export class RegisterDto {
  @IsEmail()                        email:       string;
  @IsString() @MinLength(8)         password:    string;
  @IsOptional() @IsString()         displayName?: string;
  @IsOptional() @IsString()         phone?:       string;
  @IsOptional() @IsEnum(UserRole)   role?:        UserRole;
  @IsOptional() @IsString()         web3Address?: string;
}

export class LoginDto {
  @IsEmail()    email:    string;
  @IsString()   password: string;
  @IsOptional() @IsString() web3Address?: string;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    private jwtService:   JwtService,
    private walletService: WalletService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.userRepo.findOne({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const role = dto.role || UserRole.USER;
    const user = await this.userRepo.save(
      this.userRepo.create({
        email: dto.email,
        passwordHash,
        displayName: dto.displayName,
        phone:       dto.phone,
        role,
        merchantStatus: role === UserRole.MERCHANT ? 'ACTIVE' : null,
        web3Address: dto.web3Address,
      }),
    );

    // Auto-create wallets for all supported assets
    await this.walletService.createWalletsForUser(user.id);

    const accessToken = this.signToken(user);
    return { accessToken, user: this.sanitize(user) };
  }

  async login(dto: LoginDto) {
    const user = await this.userRepo.findOne({ where: { email: dto.email } });
    if (!user) throw new UnauthorizedException('Invalid credentials');
    if (user.isBanned) throw new UnauthorizedException('Account has been suspended');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    if (dto.web3Address && dto.web3Address !== user.web3Address) {
      user.web3Address = dto.web3Address;
      await this.userRepo.save(user);
    }

    const accessToken = this.signToken(user);
    return { accessToken, user: this.sanitize(user) };
  }

  async getProfile(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found');
    return this.sanitize(user);
  }

  private signToken(user: User) {
    return this.jwtService.sign({ sub: user.id, email: user.email, role: user.role });
  }

  private sanitize(user: User) {
    const { passwordHash, ...safe } = user as any;
    return safe;
  }
}
