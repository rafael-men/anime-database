import {
  INestApplication,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AuthController } from '../../src/application/auth/auth.controller';
import { AuthService } from '../../src/application/auth/auth.service';
import { SessionsService } from '../../src/application/sessions/sessions.service';
import { PasswordResetService } from '../../src/application/auth/password-reset.service';

describe('AuthController', () => {
  let app: INestApplication;

  const authServiceMock = {
    register: jest.fn(),
    login: jest.fn(),
  };

  const passwordResetServiceMock = {
    requestReset: jest.fn(),
    resetPassword: jest.fn(),
  };

  const sessionsServiceMock = {
    cookieName: 'sid',
    getCookieOptions: jest.fn(() => ({
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 1000,
    })),
    getClearCookieOptions: jest.fn(() => ({
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
    })),
    getSession: jest.fn(),
    revoke: jest.fn(),
  };

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: authServiceMock },
        { provide: SessionsService, useValue: sessionsServiceMock },
        { provide: PasswordResetService, useValue: passwordResetServiceMock },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    // Espelha src/main.ts para que os DTOs sejam validados de verdade.
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await app.close();
  });

  it('POST /auth/register should create a session and set the cookie', async () => {
    authServiceMock.register.mockResolvedValue({
      sessionToken: 'opaque-token-123',
      csrfToken: 'csrf-token-123',
      user: {
        id: 'user-1',
        username: 'rafael',
        email: 'rafael@email.com',
        avatarUrl: null,
      },
    });

    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        username: 'rafael',
        email: 'rafael@email.com',
        password: 'secret123',
      })
      .expect(201);

    expect(authServiceMock.register).toHaveBeenCalledWith({
      username: 'rafael',
      email: 'rafael@email.com',
      password: 'secret123',
      avatarUrl: undefined,
      bio: undefined,
    });

    expect(response.body).toEqual({
      userId: 'user-1',
      username: 'rafael',
      email: 'rafael@email.com',
      avatarUrl: null,
      csrfToken: 'csrf-token-123',
    });

    expect(response.headers['set-cookie']).toEqual(
      expect.arrayContaining([expect.stringContaining('sid=opaque-token-123')]),
    );
  });

  it('POST /auth/login should create a session and set the cookie', async () => {
    authServiceMock.login.mockResolvedValue({
      sessionToken: 'opaque-token-456',
      csrfToken: 'csrf-token-456',
      user: {
        id: 'user-1',
        username: 'rafael',
        email: 'rafael@email.com',
        avatarUrl: null,
      },
    });

    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'rafael@email.com', password: 'secret123' })
      .expect(200);

    expect(authServiceMock.login).toHaveBeenCalledWith(
      'rafael@email.com',
      'secret123',
    );
    expect(response.body.csrfToken).toBe('csrf-token-456');
    expect(response.headers['set-cookie']).toEqual(
      expect.arrayContaining([expect.stringContaining('sid=opaque-token-456')]),
    );
  });

  it('POST /auth/login should reject invalid credentials', async () => {
    authServiceMock.login.mockRejectedValue(
      new UnauthorizedException('Invalid credentials.'),
    );

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'rafael@email.com', password: 'senha-errada' })
      .expect(401);
  });

  it('GET /auth/session should return the current session', async () => {
    sessionsServiceMock.getSession.mockResolvedValue({
      userId: 'user-1',
      username: 'rafael',
      email: 'rafael@email.com',
      avatarUrl: null,
      csrfToken: 'csrf-token',
      createdAt: Date.now(),
    });

    const response = await request(app.getHttpServer())
      .get('/auth/session')
      .set('Cookie', 'sid=opaque-token')
      .expect(200);

    expect(sessionsServiceMock.getSession).toHaveBeenCalledWith('opaque-token');
    expect(response.body).toEqual({
      userId: 'user-1',
      username: 'rafael',
      email: 'rafael@email.com',
      avatarUrl: null,
      csrfToken: 'csrf-token',
    });
  });

  it('GET /auth/session should return 401 without a session cookie', async () => {
    await request(app.getHttpServer()).get('/auth/session').expect(401);
  });

  it('POST /auth/logout should revoke the session and clear the cookie', async () => {
    await request(app.getHttpServer())
      .post('/auth/logout')
      .set('Cookie', 'sid=opaque-token')
      .expect(204);

    expect(sessionsServiceMock.revoke).toHaveBeenCalledWith('opaque-token');
  });

  describe('recuperacao de senha', () => {
    beforeEach(() => {
      passwordResetServiceMock.requestReset.mockResolvedValue(undefined);
      passwordResetServiceMock.resetPassword.mockResolvedValue(undefined);
    });

    it('POST /auth/forgot-password should return 202 with a neutral message', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email: 'rafael@email.com' })
        .expect(202);

      expect(passwordResetServiceMock.requestReset).toHaveBeenCalledWith(
        'rafael@email.com',
      );
      expect(response.body.message).toBe(
        'Se o e-mail estiver cadastrado, enviaremos o link.',
      );
    });

    it('POST /auth/forgot-password returns the same message for unknown emails', async () => {
      // O service engole o erro; a resposta precisa ser identica de qualquer forma.
      const response = await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email: 'ninguem@email.com' })
        .expect(202);

      expect(response.body.message).toBe(
        'Se o e-mail estiver cadastrado, enviaremos o link.',
      );
    });

    it('POST /auth/forgot-password should reject an invalid email with 400', async () => {
      await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email: 'nao-e-email' })
        .expect(400);

      expect(passwordResetServiceMock.requestReset).not.toHaveBeenCalled();
    });

    it('POST /auth/reset-password should return 200 on success', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({ token: 'abc123', password: 'nova-senha-123' })
        .expect(200);

      expect(passwordResetServiceMock.resetPassword).toHaveBeenCalledWith(
        'abc123',
        'nova-senha-123',
      );
      expect(response.body.message).toBe('Senha alterada com sucesso.');
    });

    it('POST /auth/reset-password should reject a short password with 400', async () => {
      await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({ token: 'abc123', password: '123' })
        .expect(400);

      expect(passwordResetServiceMock.resetPassword).not.toHaveBeenCalled();
    });

    it('POST /auth/reset-password should reject a missing token with 400', async () => {
      await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({ password: 'nova-senha-123' })
        .expect(400);

      expect(passwordResetServiceMock.resetPassword).not.toHaveBeenCalled();
    });
  });
});
