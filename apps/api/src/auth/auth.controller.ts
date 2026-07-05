import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { AUTH_COOKIE, AUTH_SESSION_SECONDS } from './auth.constants';
import { AuthService } from './auth.service';
import type { AuthenticatedRequest } from './authenticated-request';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() body: unknown) {
    const input = this.credentials(body, true);
    return this.authService.register({
      name: input.name,
      email: input.email,
      password: input.password,
    });
  }

  @Post('login')
  async login(
    @Body() body: unknown,
    @Res({ passthrough: true }) response: Response,
  ) {
    const input = this.credentials(body, false);
    const result = await this.authService.login(input.email, input.password);
    response.cookie(AUTH_COOKIE, result.token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: AUTH_SESSION_SECONDS * 1000,
      path: '/',
    });
    return { user: result.user };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@Req() request: AuthenticatedRequest) {
    return request.user;
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) response: Response) {
    response.clearCookie(AUTH_COOKIE, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    });
    return { success: true };
  }

  private credentials(
    body: unknown,
    includeName: true,
  ): {
    name: string;
    email: string;
    password: string;
  };
  private credentials(
    body: unknown,
    includeName: false,
  ): {
    email: string;
    password: string;
  };
  private credentials(body: unknown, includeName: boolean) {
    if (!body || typeof body !== 'object') {
      throw new BadRequestException('A JSON request body is required.');
    }
    const values = body as Record<string, unknown>;
    if (
      typeof values.email !== 'string' ||
      typeof values.password !== 'string'
    ) {
      throw new BadRequestException('email and password are required.');
    }
    if (includeName && typeof values.name !== 'string') {
      throw new BadRequestException('name is required.');
    }
    return {
      name: typeof values.name === 'string' ? values.name : '',
      email: values.email,
      password: values.password,
    };
  }
}
