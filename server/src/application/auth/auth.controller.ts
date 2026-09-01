import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto } from '../controllers/dto/auth.dto';
import { SessionsService } from '../sessions/sessions.service';

interface AuthRequest {
  cookies?: Record<string, string>;
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly sessionsService: SessionsService,
  ) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async register(
    @Body() body: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { sessionToken, csrfToken, user } = await this.authService.register({
      username: body.username,
      email: body.email,
      password: body.password,
      avatarUrl: body.avatarUrl,
      bio: body.bio,
    });

    res.cookie(
      this.sessionsService.cookieName,
      sessionToken,
      this.sessionsService.getCookieOptions(),
    );

    return {
      userId: user.id,
      username: user.username,
      email: user.email,
      avatarUrl: user.avatarUrl ?? null,
      csrfToken,
    };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async login(
    @Body() body: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { sessionToken, csrfToken, user } = await this.authService.login(
      body.email,
      body.password,
    );

    res.cookie(
      this.sessionsService.cookieName,
      sessionToken,
      this.sessionsService.getCookieOptions(),
    );

    return {
      userId: user.id,
      username: user.username,
      email: user.email,
      avatarUrl: user.avatarUrl ?? null,
      csrfToken,
    };
  }

  @Get('session')
  async getSession(@Req() req: AuthRequest) {
    const token = req.cookies?.[this.sessionsService.cookieName];

    if (!token) {
      throw new UnauthorizedException('Not authenticated.');
    }

    const session = await this.sessionsService.getSession(token);

    if (!session) {
      throw new UnauthorizedException('Session expired or invalid.');
    }

    return {
      userId: session.userId,
      username: session.username,
      email: session.email,
      avatarUrl: session.avatarUrl ?? null,
      csrfToken: session.csrfToken,
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @Req() req: AuthRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = req.cookies?.[this.sessionsService.cookieName];

    if (token) {
      await this.sessionsService.revoke(token);
    }

    res.clearCookie(
      this.sessionsService.cookieName,
      this.sessionsService.getCookieOptions(),
    );
  }
}