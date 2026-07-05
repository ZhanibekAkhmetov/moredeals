import { UserRole } from '@moredeals/database';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcryptjs';
import { PrismaService } from '../database/prisma.service';
import type { AuthTokenPayload, AuthUser } from './auth.types';

const publicUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
} as const;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(input: { name: string; email: string; password: string }) {
    const name = input.name.trim();
    const email = input.email.trim().toLowerCase();
    this.validateRegistration(name, email, input.password);

    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing)
      throw new ConflictException('An account with this email exists.');

    return this.prisma.user.create({
      data: {
        name,
        email,
        passwordHash: await hash(input.password, 12),
        role: UserRole.USER,
      },
      select: publicUserSelect,
    });
  }

  async login(emailInput: string, password: string) {
    const email = emailInput.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user || !(await compare(password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const publicUser: AuthUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };
    const payload: AuthTokenPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    return {
      user: publicUser,
      token: await this.jwtService.signAsync(payload),
    };
  }

  private validateRegistration(name: string, email: string, password: string) {
    if (name.length < 2 || name.length > 80) {
      throw new BadRequestException(
        'Name must be between 2 and 80 characters.',
      );
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new BadRequestException('Enter a valid email address.');
    }
    if (password.length < 8 || password.length > 128) {
      throw new BadRequestException(
        'Password must be between 8 and 128 characters.',
      );
    }
  }
}
