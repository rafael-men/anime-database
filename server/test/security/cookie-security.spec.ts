import {
  Controller,
  Delete,
  INestApplication,
  Logger,
  Post,
  Res,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import type { Response } from 'express';
import request from 'supertest';

import { SessionsService } from '../../src/application/sessions/sessions.service';
import { SESSION_STORE } from '../../src/data/sessions';
import { InMemorySessionStore } from '../../src/data/sessions';
import {
  buildClearCookieOptions,
  buildCookieOptions,
  normalizeCookieDomain,
  resolveCookieSecurity,
} from '../../src/utils/cookie-security';

function config(values: Record<string, unknown>): ConfigService {
  return new ConfigService(values);
}

function setCookieHeaders(response: request.Response): string[] {
  const raw = response.headers['set-cookie'] as unknown as
    string[] | string | undefined;

  if (!raw) {
    return [];
  }

  return Array.isArray(raw) ? raw : [raw];
}

@Controller('session-cookie')
class SessionCookieController {
  constructor(private readonly sessions: SessionsService) {}

  @Post()
  set(@Res({ passthrough: true }) res: Response): { ok: boolean } {
    res.cookie(
      this.sessions.cookieName,
      'opaque-token',
      this.sessions.getCookieOptions(),
    );
    return { ok: true };
  }

  @Delete()
  clear(@Res({ passthrough: true }) res: Response): { ok: boolean } {
    res.clearCookie(
      this.sessions.cookieName,
      this.sessions.getClearCookieOptions(),
    );
    return { ok: true };
  }
}

describe('cookie de sessão', () => {
  beforeEach(() => {
    jest.spyOn(Logger, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('em produção usa Secure, HttpOnly, SameSite=Lax e path "/"', () => {
    const settings = resolveCookieSecurity(config({ NODE_ENV: 'production' }));

    expect(settings).toEqual({
      domain: undefined,
      sameSite: 'lax',
      secure: true,
      path: '/',
    });
  });

  it('em desenvolvimento não força Secure (HTTP local)', () => {
    const settings = resolveCookieSecurity(config({ NODE_ENV: 'development' }));

    expect(settings.secure).toBe(false);
    expect(settings.sameSite).toBe('lax');
  });

  it('aceita domínio explícito e normaliza a caixa', () => {
    const settings = resolveCookieSecurity(
      config({ NODE_ENV: 'production', COOKIE_DOMAIN: '.Example.COM' }),
    );

    expect(settings.domain).toBe('.example.com');
  });

  it('descarta domínio inválido em vez de gerar cookie rejeitado pelo navegador', () => {
    const settings = resolveCookieSecurity(
      config({
        NODE_ENV: 'production',
        COOKIE_DOMAIN: 'https://example.com/app',
      }),
    );

    expect(settings.domain).toBeUndefined();
    expect(Logger.warn).toHaveBeenCalled();
  });

  it('ignora localhost como domínio (cookie host-only é o correto)', () => {
    expect(normalizeCookieDomain('localhost')).toBeUndefined();
  });

  it('SameSite=None força Secure mesmo em desenvolvimento', () => {
    const settings = resolveCookieSecurity(
      config({
        NODE_ENV: 'development',
        COOKIE_SAME_SITE: 'none',
        COOKIE_SECURE: 'false',
      }),
    );

    expect(settings.sameSite).toBe('none');
    expect(settings.secure).toBe(true);
  });

  it('respeita SameSite=strict e COOKIE_SECURE explícito', () => {
    const settings = resolveCookieSecurity(
      config({
        NODE_ENV: 'production',
        COOKIE_SAME_SITE: 'strict',
        COOKIE_SECURE: 'false',
      }),
    );

    expect(settings.sameSite).toBe('strict');
    expect(settings.secure).toBe(false);
  });

  it('cai no padrão quando SameSite é inválido', () => {
    const settings = resolveCookieSecurity(
      config({ NODE_ENV: 'production', COOKIE_SAME_SITE: 'cross-site' }),
    );

    expect(settings.sameSite).toBe('lax');
  });

  it('getCookieOptions inclui maxAge e getClearCookieOptions não', () => {
    const settings = resolveCookieSecurity(
      config({ NODE_ENV: 'production', COOKIE_DOMAIN: 'example.com' }),
    );

    expect(buildCookieOptions(settings, 60_000)).toMatchObject({
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      domain: 'example.com',
      path: '/',
      maxAge: 60_000,
    });

    const clearOptions = buildClearCookieOptions(settings);
    expect(clearOptions).toMatchObject({
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      domain: 'example.com',
      path: '/',
    });
    expect(clearOptions).not.toHaveProperty('maxAge');
    expect(clearOptions).not.toHaveProperty('expires');
  });

  describe('Set-Cookie real', () => {
    let app: INestApplication;

    beforeEach(async () => {
      const moduleRef: TestingModule = await Test.createTestingModule({
        controllers: [SessionCookieController],
        providers: [
          SessionsService,
          {
            provide: SESSION_STORE,
            useValue: new InMemorySessionStore(),
          },
          {
            provide: ConfigService,
            useValue: config({
              NODE_ENV: 'production',
              COOKIE_DOMAIN: 'example.com',
              COOKIE_SAME_SITE: 'lax',
            }),
          },
        ],
      }).compile();

      app = moduleRef.createNestApplication();
      await app.init();
    });

    afterEach(async () => {
      await app.close();
    });

    it('grava o cookie com os atributos de segurança', async () => {
      const response = await request(app.getHttpServer())
        .post('/session-cookie')
        .expect(201);

      const header = setCookieHeaders(response)[0] ?? '';

      expect(header).toContain('sid=opaque-token');
      expect(header).toContain('HttpOnly');
      expect(header).toContain('Secure');
      expect(header).toContain('SameSite=Lax');
      expect(header).toContain('Domain=example.com');
      expect(header).toContain('Path=/');
      expect(header).toContain('Max-Age=');
    });

    it('apaga o cookie mantendo domain/path e expirando no passado', async () => {
      const response = await request(app.getHttpServer())
        .delete('/session-cookie')
        .expect(200);

      const header = setCookieHeaders(response)[0] ?? '';

      expect(header).toContain('sid=;');
      expect(header).toContain('Domain=example.com');
      expect(header).toContain('Path=/');
      expect(header).toContain('Expires=Thu, 01 Jan 1970');
    });
  });
});
