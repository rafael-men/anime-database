import { INestApplication, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AuthController } from '../../src/application/auth/auth.controller';
import { AuthService } from '../../src/application/auth/auth.service';
import { SessionsService } from '../../src/application/sessions/sessions.service';

describe('AuthController', () => {
  let app: INestApplication;

  const authServiceMock = {
    register: jest.fn(),
    login: jest.fn(),
  };

  const sessionsServiceMock = {
    cookieName: 'sid',
    getCookieOptions: jest.fn(() => ({
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 1000,
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
      .send({ email: 'rafael@email.com', password: 'wrong' })
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
});