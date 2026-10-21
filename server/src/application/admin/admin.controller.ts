import {
  BadRequestException,
  Controller,
  DefaultValuePipe,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { AdminGuard } from '../auth/admin.guard';
import { AdminSessionsService } from './admin-session-service';
import { KeycloakService } from './keycloak.service';
import { UserService } from '../../use-cases/user/user.service';
import {
  ADMIN_REQUESTS_DEFAULT_LIMIT,
  ADMIN_REQUESTS_MAX_LIMIT,
  AdultRequestDto,
  toAdultRequestDto,
  toAdultRequestDtos,
} from '../controllers/dto/admin.dto';

const ADMIN_THROTTLE_LIMIT = 20;
const ADMIN_THROTTLE_TTL_MS = 60_000;

interface AdminAuthRequest {
  cookies?: Record<string, string>;
}

@Controller('control')
export class AdminAuthController {
  constructor(
    private readonly keycloak: KeycloakService,
    private readonly adminSessions: AdminSessionsService,
    private readonly userService: UserService,
    private readonly config: ConfigService,
  ) {}

  @Get('login')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async login(@Res() res: Response): Promise<void> {
    const { url } = await this.keycloak.createAuthorizationRequest();
    res.redirect(302, url);
  }

  @Get('callback')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async callback(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    if (!code || !state) {
      throw new UnauthorizedException('Callback invalido.');
    }

    const identity = await this.keycloak.exchangeCode(code, state);
    const { token, csrfToken } = await this.adminSessions.create({
      sub: identity.sub,
      username: identity.username,
      email: identity.email,
      roles: identity.roles,
      idToken: identity.idToken,
    });

    res.cookie(
      this.adminSessions.cookieName,
      token,
      this.adminSessions.getCookieOptions(),
    );
    // O client le este cookie e envia em X-CSRF-Token nas mutacoes de /control.
    res.cookie(
      this.adminSessions.csrfCookieName,
      csrfToken,
      this.adminSessions.getCsrfCookieOptions(),
    );

    const frontend = this.config.get(
      'ADMIN_FRONTEND_URL',
      'http://localhost:4000',
    );
    res.redirect(302, `${frontend}/control?csrf=${csrfToken}`);
  }

  @Get('logout')
  async logout(
    @Req() req: AdminAuthRequest,
    @Res() res: Response,
  ): Promise<void> {
    const token = req.cookies?.[this.adminSessions.cookieName];
    let logoutUrl: string | null = null;

    if (token) {
      const session = await this.adminSessions.getSession(token);
      await this.adminSessions.revoke(token);

      // Sem o id_token_hint o Keycloak exibe uma tela de confirmacao de logout.
      if (session?.idToken) {
        try {
          logoutUrl = await this.keycloak.buildLogoutUrl(session.idToken);
        } catch {
          logoutUrl = null;
        }
      }
    }

    res.clearCookie(
      this.adminSessions.cookieName,
      this.adminSessions.getClearCookieOptions(),
    );
    res.clearCookie(
      this.adminSessions.csrfCookieName,
      this.adminSessions.getClearCookieOptions(),
    );

    const frontend = this.config.get(
      'ADMIN_FRONTEND_URL',
      'http://localhost:4000',
    );
    res.redirect(302, logoutUrl ?? `${frontend}/login`);
  }

  @Get('session')
  @UseGuards(AdminGuard)
  async session(@Req() req: AdminAuthRequest): Promise<{
    username: string;
    email: string;
    roles: string[];
  }> {
    const token = req.cookies?.[this.adminSessions.cookieName];
    if (!token) throw new UnauthorizedException('Nao autenticado.');
    const session = await this.adminSessions.getSession(token);
    if (!session) throw new UnauthorizedException('Sessao expirada.');
    return {
      username: session.username,
      email: session.email,
      roles: session.roles,
    };
  }

  @Get('users')
  @UseGuards(AdminGuard)
  @Throttle({
    default: { limit: ADMIN_THROTTLE_LIMIT, ttl: ADMIN_THROTTLE_TTL_MS },
  })
  async listAdultRequests(
    @Query(
      'limit',
      new DefaultValuePipe(ADMIN_REQUESTS_DEFAULT_LIMIT),
      ParseIntPipe,
    )
    limit: number,
  ): Promise<AdultRequestDto[]> {
    if (
      !Number.isInteger(limit) ||
      limit < 1 ||
      limit > ADMIN_REQUESTS_MAX_LIMIT
    ) {
      throw new BadRequestException(
        `limit must be an integer between 1 and ${ADMIN_REQUESTS_MAX_LIMIT}.`,
      );
    }

    const requests = await this.userService.listAdultRequests(limit);
    return toAdultRequestDtos(requests);
  }

  @Post('users/:id/approve')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AdminGuard)
  async approveAdultRequest(
    @Param('id') userId: string,
  ): Promise<AdultRequestDto> {
    const user = await this.userService.approveAdultRequest(userId);
    return toAdultRequestDto(user);
  }

  @Post('users/:id/deny')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AdminGuard)
  async denyAdultRequest(
    @Param('id') userId: string,
  ): Promise<AdultRequestDto> {
    const user = await this.userService.denyAdultRequest(userId);
    return toAdultRequestDto(user);
  }
}
