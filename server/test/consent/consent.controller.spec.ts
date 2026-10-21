import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';

import { ConsentController } from '../../src/application/consent/consent.controller';
import {
  CONSENT_COOKIE_NAME,
  CONSENT_VERSION,
  parseConsent,
} from '../../src/data/consent';

describe('ConsentController', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [ConsentController],
      providers: [
        {
          provide: ConfigService,
          useValue: new ConfigService({
            NODE_ENV: 'production',
            COOKIE_DOMAIN: 'example.com',
          }),
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.use(cookieParser());
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
    await app.close();
  });

  function setCookieHeaders(response: request.Response): string[] {
    const raw = response.headers['set-cookie'] as unknown as
      string[] | string | undefined;

    if (!raw) {
      return [];
    }

    return Array.isArray(raw) ? raw : [raw];
  }

  function consentCookieFrom(response: request.Response): string {
    const header = setCookieHeaders(response)[0] ?? '';
    const match = header.match(new RegExp(`${CONSENT_COOKIE_NAME}=([^;]+)`));

    return match ? decodeURIComponent(match[1]) : '';
  }

  it('GET /consent sem cookie informa que ainda não houve decisão', async () => {
    const response = await request(app.getHttpServer())
      .get('/consent')
      .expect(200);

    expect(response.body).toEqual({
      version: CONSENT_VERSION,
      decided: false,
      necessary: true,
      analytics: false,
      marketing: false,
      decidedAt: null,
    });
  });

  it('POST /consent grava cookie httpOnly com os atributos de segurança', async () => {
    const response = await request(app.getHttpServer())
      .post('/consent')
      .send({ analytics: true, marketing: false })
      .expect(200);

    const header = setCookieHeaders(response)[0] ?? '';

    expect(response.body.decided).toBe(true);
    expect(response.body.analytics).toBe(true);
    expect(response.body.marketing).toBe(false);
    expect(response.body.decidedAt).toEqual(expect.any(String));
    expect(header).toContain(`${CONSENT_COOKIE_NAME}=`);
    expect(header).toContain('HttpOnly');
    expect(header).toContain('Secure');
    expect(header).toContain('SameSite=Lax');
    expect(header).toContain('Domain=example.com');
    expect(header).toContain('Path=/');
    expect(header).toContain('Max-Age=');
  });

  it('GET /consent devolve a decisão gravada', async () => {
    const saved = await request(app.getHttpServer())
      .post('/consent')
      .send({ analytics: true, marketing: true })
      .expect(200);

    const cookie = consentCookieFrom(saved);
    const response = await request(app.getHttpServer())
      .get('/consent')
      .set('Cookie', `${CONSENT_COOKIE_NAME}=${encodeURIComponent(cookie)}`)
      .expect(200);

    expect(response.body).toMatchObject({
      decided: true,
      analytics: true,
      marketing: true,
    });
  });

  it('não mexe no cookie de sessão ao gravar consentimento', async () => {
    const response = await request(app.getHttpServer())
      .post('/consent')
      .set('Cookie', 'sid=sessao-existente')
      .send({ analytics: false })
      .expect(200);

    const cookies = setCookieHeaders(response).join('\n');

    expect(cookies).toContain(CONSENT_COOKIE_NAME);
    expect(cookies).not.toContain('sid=');
  });

  it('exige booleanos (não aceita strings nem campos extras)', async () => {
    await request(app.getHttpServer())
      .post('/consent')
      .send({ analytics: 'sim' })
      .expect(400);

    await request(app.getHttpServer())
      .post('/consent')
      .send({ necessary: true })
      .expect(400);
  });

  it('trata cookie corrompido ou de versão antiga como sem decisão', async () => {
    const corrupt = await request(app.getHttpServer())
      .get('/consent')
      .set('Cookie', `${CONSENT_COOKIE_NAME}=nao-e-json`)
      .expect(200);

    expect(corrupt.body.decided).toBe(false);

    const oldVersion = await request(app.getHttpServer())
      .get('/consent')
      .set(
        'Cookie',
        `${CONSENT_COOKIE_NAME}=${encodeURIComponent(
          JSON.stringify({
            version: '0',
            necessary: true,
            analytics: true,
            marketing: true,
            decidedAt: new Date().toISOString(),
          }),
        )}`,
      )
      .expect(200);

    expect(oldVersion.body.decided).toBe(false);
    expect(oldVersion.body.analytics).toBe(false);
  });

  describe('parseConsent', () => {
    const valid = {
      version: CONSENT_VERSION,
      necessary: true,
      analytics: true,
      marketing: false,
      decidedAt: '2026-10-21T00:00:00.000Z',
    };

    it('aceita um valor completo e válido', () => {
      expect(parseConsent(JSON.stringify(valid))).toEqual(valid);
    });

    it.each([
      ['undefined', undefined],
      ['vazio', ''],
      ['json invalido', '{'],
      ['array', '[]'],
      ['versao errada', JSON.stringify({ ...valid, version: '9' })],
      ['booleano ausente', JSON.stringify({ ...valid, analytics: 'true' })],
      ['data invalida', JSON.stringify({ ...valid, decidedAt: 'ontem' })],
      ['necessario false', JSON.stringify({ ...valid, necessary: false })],
      ['cookie gigante', 'a'.repeat(600)],
    ])('rejeita %s', (_label, raw) => {
      expect(parseConsent(raw)).toBeNull();
    });
  });
});
