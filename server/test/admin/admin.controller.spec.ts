import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AdminController } from '../../src/application/controllers/admin.controller';
import { UserService } from '../../src/use-cases/user/user.service';

const ADMIN_EMAIL = 'admin@test.com';
const ADMIN_PASSWORD = 'secret123';

function buildAuthHeader(): string {
  const credentials = Buffer.from(`${ADMIN_EMAIL}:${ADMIN_PASSWORD}`).toString(
    'base64',
  );
  return `Basic ${credentials}`;
}

describe('AdminController', () => {
  let app: INestApplication;

  const userServiceMock = {
    listAdultRequests: jest.fn(),
    approveAdultRequest: jest.fn(),
    denyAdultRequest: jest.fn(),
  };

  beforeEach(async () => {
    process.env.ADMIN_EMAIL = ADMIN_EMAIL;
    process.env.ADMIN_PASSWORD = ADMIN_PASSWORD;

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [{ provide: UserService, useValue: userServiceMock }],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await app.close();
  });

  it('GET /control/users requires admin credentials', async () => {
    await request(app.getHttpServer()).get('/control/users').expect(401);
  });

  it('GET /control/users rejects wrong admin credentials', async () => {
    await request(app.getHttpServer())
      .get('/control/users')
      .set('Authorization', `Basic ${Buffer.from('x:y').toString('base64')}`)
      .expect(401);
  });

  it('GET /control/users lists adult requests', async () => {
    userServiceMock.listAdultRequests.mockResolvedValue([
      { id: 'a', adultRequestStatus: 'pending' },
    ]);

    const response = await request(app.getHttpServer())
      .get('/control/users')
      .set('Authorization', buildAuthHeader())
      .expect(200);

    expect(response.body).toEqual([{ id: 'a', adultRequestStatus: 'pending' }]);
    expect(userServiceMock.listAdultRequests).toHaveBeenCalled();
  });

  it('POST /control/users/:id/approve approves a request', async () => {
    userServiceMock.approveAdultRequest.mockResolvedValue({
      id: 'a',
      adultRequestStatus: 'approved',
      adultContentEnabled: true,
    });

    const response = await request(app.getHttpServer())
      .post('/control/users/a/approve')
      .set('Authorization', buildAuthHeader())
      .expect(200);

    expect(userServiceMock.approveAdultRequest).toHaveBeenCalledWith('a');
    expect(response.body.adultRequestStatus).toBe('approved');
  });

  it('POST /control/users/:id/deny denies a request', async () => {
    userServiceMock.denyAdultRequest.mockResolvedValue({
      id: 'a',
      adultRequestStatus: 'denied',
      adultContentEnabled: false,
    });

    await request(app.getHttpServer())
      .post('/control/users/a/deny')
      .set('Authorization', buildAuthHeader())
      .expect(200);

    expect(userServiceMock.denyAdultRequest).toHaveBeenCalledWith('a');
  });
});