import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { LoginDto, RegisterDto } from './dto/auth.dto';

@Injectable()
// 일반유저 기능: 회원 인증(회원가입/로그인/내 정보)
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  /** 일반유저 기능: 회원가입 */
  async register(dto: RegisterDto) {
    const email = dto.email.trim();
    const existing = await this.users.findOne({ where: { email } });
    if (existing) {
      throw new ConflictException('이미 사용 중인 이메일입니다.');
    }
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const id = randomUUID();
    const displayName = (dto.displayName?.trim() || dto.email.split('@')[0] || '선생님').slice(0, 80);
    await this.users.save(
      this.users.create({
        id,
        email,
        passwordHash,
        displayName,
        role: 'user',
        bookUids: [],
        balanceWon: 0,
      }),
    );
    return this.issueToken(id, email, displayName, 'user', 0);
  }

  /** 일반유저 기능: 로그인 */
  async login(dto: LoginDto) {
    const email = dto.email.trim();
    const user = await this.users.findOne({ where: { email } });
    if (!user) {
      throw new UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다.');
    }
    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다.');
    }
    return this.issueToken(
      user.id,
      user.email,
      user.displayName,
      user.role ?? 'user',
      user.balanceWon ?? 0,
    );
  }

  /** 일반유저 기능: 내 정보 조회 */
  async me(userId: string) {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException();
    }
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role ?? 'user',
      balanceWon: user.balanceWon ?? 0,
    };
  }

  /** 일반유저 기능: 잔액 충전 */
  async recharge(userId: string, amount: number) {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException();
    }
    const n = Math.floor(Number(amount));
    if (!Number.isFinite(n) || n < 1) {
      return { success: false, message: '충전 금액이 올바르지 않습니다.' };
    }
    user.balanceWon = (user.balanceWon ?? 0) + n;
    await this.users.save(user);
    return { success: true, balanceWon: user.balanceWon };
  }

  private issueToken(
    userId: string,
    email: string,
    displayName: string,
    role: string,
    balanceWon: number,
  ) {
    const access_token = this.jwtService.sign({ sub: userId, email, role });
    return {
      access_token,
      user: { id: userId, email, displayName, role, balanceWon },
    };
  }
}
