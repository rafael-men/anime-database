import { INestApplication } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Test, TestingModule } from '@nestjs/testing';
import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import request from 'supertest';

const SECRET_MARKER = 'CONTEUDO_SENSAVEL_NAO_DEVE_VAZAR';

describe('Static assets path traversal protection', () => {
  let app: INestApplication;
  let uploadsDir: string;

  beforeAll(() => {
    uploadsDir = mkdtempSync(join(tmpdir(), 'anime-db-uploads-test-'));
    writeFileSync(join(uploadsDir, 'avatar.png'), 'png-fake-conteudo');
    writeFileSync(join(uploadsDir, '.env.secret'), SECRET_MARKER);
    writeFileSync(join(uploadsDir, 'secret.txt'), SECRET_MARKER);
  });

  afterAll(() => {
    rmSync(uploadsDir, { recursive: true, force: true });
  });

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({}).compile();
    app = moduleRef.createNestApplication<NestExpressApplication>();
    app.useStaticAssets(uploadsDir, {
      prefix: '/uploads/',
      index: false,
      dotfiles: 'ignore',
    });
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    jest.clearAllMocks();
  });

  it('serve arquivos reais dentro da raiz de uploads', async () => {
    await request(app.getHttpServer()).get('/uploads/avatar.png').expect(200);
  });

  it('bloqueia arquivos pontilhados (dotfiles)', async () => {
    await request(app.getHttpServer()).get('/uploads/.env.secret').expect(404);
  });

  it.each([
    '/uploads/../secret.txt',
    '/uploads/..%2fsecret.txt',
    '/uploads/%2e%2e/secret.txt',
    '/uploads/%2e%2e%2fsecret.txt',
    '/uploads/%2e%2e%5csecret.txt',
    '/uploads/..%5csecret.txt',
    '/uploads/..%252fsecret.txt',
    '/uploads/....//secret.txt',
    '/uploads/%2e%2e%2f%2e%2e%2fetc%2fpasswd',
    '/uploads/..%2f..%2fpackage.json',
  ])('rejeita travessia de caminho em %o', async (path) => {
    const response = await request(app.getHttpServer()).get(path);

    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(response.status).toBeLessThan(500);
    expect(response.text).not.toContain(SECRET_MARKER);
  });
});