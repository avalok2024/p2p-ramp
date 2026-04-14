import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { UserService }  from './user.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser }  from '../../common/decorators/current-user.decorator';
import { User }         from '../../entities/user.entity';
import { IsOptional, IsString } from 'class-validator';

class UpdateProfileDto {
  @IsOptional() @IsString() displayName?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() avatarUrl?: string;
  @IsOptional() @IsString() web3Address?: string;
}

class ChangePasswordDto {
  @IsString() currentPass: string;
  @IsString() newPass: string;
}

@ApiTags('User')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('profile')
  getProfile(@CurrentUser() user: User) {
    return this.userService.getProfile(user.id);
  }

  @Patch('profile')
  updateProfile(@CurrentUser() user: User, @Body() dto: UpdateProfileDto) {
    return this.userService.updateProfile(user.id, dto);
  }

  @Get('stats')
  getStats(@CurrentUser() user: User) {
    return this.userService.getStats(user.id);
  }

  @Patch('password')
  changePassword(@CurrentUser() user: User, @Body() dto: ChangePasswordDto) {
    return this.userService.changePassword(user.id, dto.currentPass, dto.newPass);
  }
}
