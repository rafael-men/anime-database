import { Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { CsrfGuard } from '../../src/application/auth/csrf.guard';
import { SessionsService } from '../../src/application/sessions/sessions.service';
import { AdminSessionsService } from '../../src/application/admin/admin-session-service';

@Controller('auth')
class AuthTestController {
  @Post('forgot-password')
  @HttpCode(HttpStatus.ACCEPTED)
  forgotPassword(): { ok: boolean } {
    return { ok: true };
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  resetPassword(): { ok: boolean } {
    return { ok: true };
  }

  @Post('mudar-email')
  @HttpCode(HttpStatus.OK)
  changeEmail(): { ok: boolean } {
    return { ok: true };
  }
}

/**
 * O reset de senha acontece a partir de um link por e-mail, muitas vezes com o
 * usuario logado em outra aba. As rotas precisam ser CSRF-exempt para nao
 * devolver 403, mas isso nao pode abrir portas para o resto de /auth.
 */
describe('CsrfGuard nas rotas de recuperacao de senha', () => {
  let app: INestApplication;

  const sessionsServiceMock = {
    cookieName: 'sid',
    getSession: jest.fn(),
  };

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [AuthTestController],
      providers: [
        { provide: SessionsService, useValue: sessionsServiceMock },
        { provide: AdminSessionsService, useValue: { cookieName: 'admin_sid', getSession: jest.fn() } },
        { provide: APP_GUARD, useClass: CsrfGuard },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    await app.init();
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await app.close();
  });

  function mockActiveSession() {
    sessionsServiceMock.getSession.mockResolvedValue({
      userId: 'u1',
      username: 'rafael',
      email: 'rafael@test.com',
      avatarUrl: null,
      csrfToken: 'csrf-123',
      createdAt: Date.now(),
    });
  }

  it('permite forgot-password mesmo com sessao ativa e sem token CSRF', async () => {
    mockActiveSession();

    await request(app.getHttpServer())
      .post('/auth/forgot-password')
      .set('Cookie', 'sid=session-token')
      .expect(202);
  });

  it('permite reset-password mesmo com sessao ativa e sem token CSRF', async () => {
    mockActiveSession();

    await request(app.getHttpServer())
      .post('/auth/reset-password')
      .set('Cookie', 'sid=session-token')
      .expect(200);
  });

  it('continua exigindo CSRF em outras rotas de /auth', async () => {
    mockActiveSession();

    await request(app.getHttpServer())
      .post('/auth/mudar-email')
      .set('Cookie', 'sid=session-token')
      .expect(403);
  });
});
