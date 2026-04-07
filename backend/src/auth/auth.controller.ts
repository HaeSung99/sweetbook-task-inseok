import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto } from './dto/auth.dto';
import { RechargeDto } from './dto/recharge.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

type AuthedRequest = Request & { user: { userId: string; email: string; role: string } };

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@Req() req: AuthedRequest) {
    return this.auth.me(req.user.userId);
  }

  /** 일반유저 기능: 잔액 충전(데모 — 실제 결제 없이 금액 가산) */
  @Post('recharge')
  @UseGuards(JwtAuthGuard)
  recharge(@Req() req: AuthedRequest, @Body() dto: RechargeDto) {
    return this.auth.recharge(req.user.userId, dto.amount);
  }
}
