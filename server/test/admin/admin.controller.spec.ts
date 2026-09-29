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

function buildUser(overrides: Record<string, unknown> = {}) {
  return {
    id: 'a',
    username: 'requesting_user',
    email: 'requesting@test.com',
    avatarUrl: 'https://cdn.test.com/avatar.png',
    bio: 'private bio that the panel never renders',
    favoriteCharacterIds: [1, 2, 3],
    nsfwFilter: true,
    birthDate: '1995-04-01',
    adultContentEnabled: false,
    adultRequestStatus: 'pending',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    usernameUpdatedAt: new Date('2026-01-03T00:00:00.000Z'),
    ...overrides,
  };
}

// Fields the moderation panel is allowed to receive.
const ALLOWED_LIST_FIELDS = [
  'id',
  'username',
  'email',
  'birthDate',
  'adultRequestStatus',
  'adultContentEnabled',
  'createdAt',
  'updatedAt',
];

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

  it('GET /control/users never exposes fields outside the moderation DTO', async () => {
    userServiceMock.listAdultRequests.mockResolvedValue([buildUser()]);

    const response = await request(app.getHttpServer())
      .get('/control/users')
      .set('Authorization', buildAuthHeader())
      .expect(200);

    expect(Object.keys(response.body[0]).sort()).toEqual(
      [...ALLOWED_LIST_FIELDS].sort(),
    );
    expect(response.body[0]).not.toHaveProperty('bio');
    expect(response.body[0]).not.toHaveProperty('avatarUrl');
    expect(response.body[0]).not.toHaveProperty('favoriteCharacterIds');
    expect(response.body[0]).not.toHaveProperty('nsfwFilter');
    expect(response.body[0]).not.toHaveProperty('usernameUpdatedAt');
  });

  it('GET /control/users caps the result set with a default limit', async () => {
    userServiceMock.listAdultRequests.mockResolvedValue([]);

    await request(app.getHttpServer())
      .get('/control/users')
      .set('Authorization', buildAuthHeader())
      .expect(200);

    expect(userServiceMock.listAdultRequests).toHaveBeenCalledWith(50);
  });

  it('GET /control/users accepts an explicit limit', async () => {
    userServiceMock.listAdultRequests.mockResolvedValue([]);

    await request(app.getHttpServer())
      .get('/control/users?limit=10')
      .set('Authorization', buildAuthHeader())
      .expect(200);

    expect(userServiceMock.listAdultRequests).toHaveBeenCalledWith(10);
  });

  it('GET /control/users rejects a non-numeric limit', async () => {
    userServiceMock.listAdultRequests.mockResolvedValue([]);

    await request(app.getHttpServer())
      .get('/control/users?limit=all')
      .set('Authorization', buildAuthHeader())
      .expect(400);

    expect(userServiceMock.listAdultRequests).not.toHaveBeenCalled();
  });

  it('GET /control/users rejects a limit above the maximum', async () => {
    userServiceMock.listAdultRequests.mockResolvedValue([]);

    await request(app.getHttpServer())
      .get('/control/users?limit=100000')
      .set('Authorization', buildAuthHeader())
      .expect(400);

    expect(userServiceMock.listAdultRequests).not.toHaveBeenCalled();
  });

  it('GET /control/users rejects a negative limit', async () => {
    userServiceMock.listAdultRequests.mockResolvedValue([]);

    await request(app.getHttpServer())
      .get('/control/users?limit=-1')
      .set('Authorization', buildAuthHeader())
      .expect(400);

    expect(userServiceMock.listAdultRequests).not.toHaveBeenCalled();
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

  it('POST /control/users/:id/approve returns only the moderation DTO', async () => {
    userServiceMock.approveAdultRequest.mockResolvedValue(buildUser());

    const response = await request(app.getHttpServer())
      .post('/control/users/a/approve')
      .set('Authorization', buildAuthHeader())
      .expect(200);

    expect(Object.keys(response.body).sort()).toEqual(
      [...ALLOWED_LIST_FIELDS].sort(),
    );
    expect(response.body).not.toHaveProperty('bio');
    expect(response.body).not.toHaveProperty('passwordHash');
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

  it('POST /control/users/:id/deny returns only the moderation DTO', async () => {
    userServiceMock.denyAdultRequest.mockResolvedValue(buildUser());

    const response = await request(app.getHttpServer())
      .post('/control/users/a/deny')
      .set('Authorization', buildAuthHeader())
      .expect(200);

    expect(Object.keys(response.body).sort()).toEqual(
      [...ALLOWED_LIST_FIELDS].sort(),
    );
    expect(response.body).not.toHaveProperty('bio');
    expect(response.body).not.toHaveProperty('passwordHash');
  });

  it('POST /control/users/:id/approve requires admin credentials', async () => {
    await request(app.getHttpServer())
      .post('/control/users/a/approve')
      .expect(401);

    expect(userServiceMock.approveAdultRequest).not.toHaveBeenCalled();
  });
});
