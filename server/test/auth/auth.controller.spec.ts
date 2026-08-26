import { INestApplication, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AuthController } from '../../src/application/auth/auth.controller';
import { AuthService } from '../../src/application/auth/auth.service';

describe('AuthController', () => {
  let app: INestApplication;

  const authServiceMock = {
    register: jest.fn(),
    login: jest.fn(),
  };

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authServiceMock }],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await app.close();
  });

  it('POST /auth/register should create a user and return token', async () => {
    authServiceMock.register.mockResolvedValue({
      userId: 'user-1',
      username: 'rafael',
      email: 'rafael@email.com',
      access_token: 'jwt-token-123',
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
      access_token: 'jwt-token-123',
    });
  });

  it('POST /auth/login should return token for valid credentials', async () => {
    authServiceMock.login.mockResolvedValue({
      userId: 'user-1',
      username: 'rafael',
      email: 'rafael@email.com',
      access_token: 'jwt-token-456',
    });

    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'rafael@email.com', password: 'secret123' })
      .expect(200);

    expect(authServiceMock.login).toHaveBeenCalledWith(
      'rafael@email.com',
      'secret123',
    );
    expect(response.body.access_token).toBe('jwt-token-456');
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
});
