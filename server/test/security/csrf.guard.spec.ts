import { APP_GUARD } from '@nestjs/core';
import {
  Controller,
  HttpCode,
  HttpStatus,
  INestApplication,
  Post,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { CsrfGuard } from '../../src/application/auth/csrf.guard';
import { SessionsService } from '../../src/application/sessions/sessions.service';

@Controller('control')
export class ControlTestController {
  @Post('test')
  @HttpCode(HttpStatus.OK)
  mutate(): { ok: boolean } {
    return { ok: true };
  }
}

describe('CsrfGuard on /control (security active on all endpoints)', () => {
  let app: INestApplication;

  const sessionsServiceMock = {
    cookieName: 'sid',
    getSession: jest.fn(),
  };

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [ControlTestController],
      providers: [
        { provide: SessionsService, useValue: sessionsServiceMock },
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

  it('POST /control/* is no longer CSRF-exempt: blocks when a session cookie exists and no token is sent', async () => {
    sessionsServiceMock.getSession.mockResolvedValue({
      userId: '1',
      csrfToken: 'csrf-123',
    });

    await request(app.getHttpServer())
      .post('/control/test')
      .set('Cookie', 'sid=session-token')
      .expect(403);
  });

  it('POST /control/* rejects a wrong CSRF token', async () => {
    sessionsServiceMock.getSession.mockResolvedValue({
      userId: '1',
      csrfToken: 'csrf-123',
    });

    await request(app.getHttpServer())
      .post('/control/test')
      .set('Cookie', 'sid=session-token')
      .set('X-CSRF-Token', 'csrf-wrong')
      .expect(403);
  });

  it('POST /control/* accepts a valid CSRF token', async () => {
    sessionsServiceMock.getSession.mockResolvedValue({
      userId: '1',
      csrfToken: 'csrf-123',
    });

    const response = await request(app.getHttpServer())
      .post('/control/test')
      .set('Cookie', 'sid=session-token')
      .set('X-CSRF-Token', 'csrf-123')
      .expect(200);

    expect(response.body).toEqual({ ok: true });
  });

  it('POST /control/* still works without a session cookie (Basic Auth only flow) or when the session is invalid', async () => {
    sessionsServiceMock.getSession.mockResolvedValue(null);

    await request(app.getHttpServer()).post('/control/test').expect(200);
    await request(app.getHttpServer())
      .post('/control/test')
      .set('Cookie', 'sid=expired-token')
      .expect(200);

    expect(sessionsServiceMock.getSession).toHaveBeenCalledTimes(1);
  });
});
