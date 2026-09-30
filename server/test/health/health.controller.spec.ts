import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import {
  HEALTH_ROUTE,
  HealthController,
} from '../../src/application/controllers/health.controller';

describe('HealthController', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it(`GET ${HEALTH_ROUTE} reports ok without requiring authentication`, async () => {
    const response = await request(app.getHttpServer())
      .get(HEALTH_ROUTE)
      .expect(200);

    expect(response.body.status).toBe('ok');
    expect(typeof response.body.uptime).toBe('number');
    expect(typeof response.body.timestamp).toBe('string');
  });

  it('does not leak process or environment details', async () => {
    const response = await request(app.getHttpServer())
      .get(HEALTH_ROUTE)
      .expect(200);

    const serialized = JSON.stringify(response.body);

    expect(Object.keys(response.body).sort()).toEqual([
      'status',
      'timestamp',
      'uptime',
    ]);
    expect(serialized).not.toContain(process.version);
    expect(serialized).not.toContain('DB_');
    expect(serialized).not.toContain('ADMIN_');
  });
});
