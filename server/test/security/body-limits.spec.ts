import { Body, Controller, INestApplication, Post } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';

import {
  DEFAULT_JSON_BODY_LIMIT,
  DEFAULT_URLENCODED_BODY_LIMIT,
  applyBodyParsers,
  resolveBodyLimit,
  resolveBodyLimits,
  toBytes,
} from '../../src/utils/body-limits';

@Controller('echo')
class EchoController {
  @Post()
  echo(@Body() body: Record<string, unknown>): Record<string, unknown> {
    return { size: JSON.stringify(body ?? {}).length };
  }
}

describe('limites de payload', () => {
  describe('resolveBodyLimit', () => {
    it('usa o padrão quando a variável não existe', () => {
      expect(resolveBodyLimit(undefined, DEFAULT_JSON_BODY_LIMIT, 'X')).toBe(
        '100kb',
      );
      expect(resolveBodyLimit('   ', DEFAULT_JSON_BODY_LIMIT, 'X')).toBe(
        '100kb',
      );
    });

    it('normaliza valores válidos', () => {
      expect(resolveBodyLimit('512KB', DEFAULT_JSON_BODY_LIMIT, 'X')).toBe(
        '512kb',
      );
      expect(resolveBodyLimit(' 1 mb ', DEFAULT_JSON_BODY_LIMIT, 'X')).toBe(
        '1 mb',
      );
    });

    it('cai no padrão para valores inválidos', () => {
      expect(resolveBodyLimit('muito', DEFAULT_JSON_BODY_LIMIT, 'X')).toBe(
        '100kb',
      );
      expect(resolveBodyLimit('0', DEFAULT_JSON_BODY_LIMIT, 'X')).toBe('100kb');
      expect(resolveBodyLimit('-5kb', DEFAULT_JSON_BODY_LIMIT, 'X')).toBe(
        '100kb',
      );
    });

    it('não permite limite acima do teto de 2mb', () => {
      expect(resolveBodyLimit('50mb', DEFAULT_JSON_BODY_LIMIT, 'X')).toBe(
        '2mb',
      );
    });

    it('converte unidades para bytes', () => {
      expect(toBytes('100kb')).toBe(100 * 1024);
      expect(toBytes('1mb')).toBe(1024 * 1024);
      expect(toBytes('512')).toBe(512);
    });

    it('resolve os dois limites a partir do ambiente', () => {
      expect(
        resolveBodyLimits({
          BODY_LIMIT_JSON: '200kb',
          BODY_LIMIT_URLENCODED: '32kb',
        }),
      ).toEqual({ json: '200kb', urlencoded: '32kb' });

      expect(resolveBodyLimits({})).toEqual({
        json: DEFAULT_JSON_BODY_LIMIT,
        urlencoded: DEFAULT_URLENCODED_BODY_LIMIT,
      });
    });
  });

  describe('respostas reais', () => {
    let app: INestApplication;

    async function createApp(
      env: NodeJS.ProcessEnv,
    ): Promise<INestApplication> {
      const moduleRef: TestingModule = await Test.createTestingModule({
        controllers: [EchoController],
      }).compile();

      // Mesmo setup de src/main.ts: parser padrão desligado, limites explícitos.
      const nestApp = moduleRef.createNestApplication<NestExpressApplication>({
        bodyParser: false,
      });
      applyBodyParsers(nestApp, env);
      await nestApp.init();

      return nestApp;
    }

    afterEach(async () => {
      await app?.close();
    });

    it('rejeita JSON acima do limite com 413', async () => {
      app = await createApp({ BODY_LIMIT_JSON: '10kb' });

      await request(app.getHttpServer())
        .post('/echo')
        .send({ data: 'a'.repeat(50 * 1024) })
        .expect(413);
    });

    it('aceita JSON dentro do limite configurado', async () => {
      app = await createApp({ BODY_LIMIT_JSON: '100kb' });

      await request(app.getHttpServer())
        .post('/echo')
        .send({ data: 'a'.repeat(50 * 1024) })
        .expect(201);
    });

    it('rejeita urlencoded acima do limite com 413', async () => {
      app = await createApp({
        BODY_LIMIT_URLENCODED: '5kb',
      });

      await request(app.getHttpServer())
        .post('/echo')
        .type('form')
        .send({ data: 'a'.repeat(20 * 1024) })
        .expect(413);
    });

    it('não aceita aumentar o limite acima do teto mesmo via ambiente', async () => {
      app = await createApp({ BODY_LIMIT_JSON: '500mb' });

      await request(app.getHttpServer())
        .post('/echo')
        .send({ data: 'a'.repeat(1 * 1024 * 1024) })
        .expect(201);

      await request(app.getHttpServer())
        .post('/echo')
        .send({ data: 'a'.repeat(3 * 1024 * 1024) })
        .expect(413);
    });
  });
});
