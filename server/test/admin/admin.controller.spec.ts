import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AdminAuthController } from '../../src/application/admin/admin.controller';
import { AdminSessionsService, adminSessionStoreProvider } from '../../src/application/admin/admin-session-service';
import { KeycloakService } from '../../src/application/admin/keycloak.service';
import { UserService } from '../../src/use-cases/user/user.service';
import { AdminGuard } from '../../src/application/auth/admin.guard';

const ADMIN_COOKIE = 'admin_sid';

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

describe('AdminAuthController (moderation)', () => {
  let app: INestApplication;
  let adminSessions: AdminSessionsService;
  let csrfToken: string;
  let authToken: string;

  const userServiceMock = {
    listAdultRequests: jest.fn(),
    approveAdultRequest: jest.fn(),
    denyAdultRequest: jest.fn(),
  };

  const keycloakMock = {
    createAuthorizationRequest: jest.fn(),
    exchangeCode: jest.fn(),
    buildLogoutUrl: jest.fn(),
  };

  beforeEach(async () => {
    userServiceMock.listAdultRequests.mockResolvedValue([]);
    userServiceMock.approveAdultRequest.mockResolvedValue({ id: 'a' });
    userServiceMock.denyAdultRequest.mockResolvedValue({ id: 'a' });
    keycloakMock.createAuthorizationRequest.mockResolvedValue({
      url: 'https://keycloak.test/auth',
      state: 'state-1',
    });

    const config = {
      get: (key: string, fallback?: unknown) =>
        process.env[key] !== undefined ? process.env[key] : fallback,
    } as unknown as ConfigService;

    // SESSION_STORE=memory evita depender do Redis Upstash no teste.
    const store = adminSessionStoreProvider.useFactory({
      ...config,
      get: (key: string, fallback?: unknown) =>
        key === 'SESSION_STORE' ? 'memory' : config.get(key, fallback),
    } as ConfigService);

    adminSessions = new AdminSessionsService(store, config);

    const created = await adminSessions.create({
      sub: 'kc-sub-1',
      username: 'admin',
      email: 'admin@test.com',
      roles: ['admin'],
    });
    csrfToken = created.csrfToken;
    authToken = created.token;

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [AdminAuthController],
      providers: [
        AdminGuard,
        { provide: AdminSessionsService, useValue: adminSessions },
        { provide: KeycloakService, useValue: keycloakMock },
        { provide: UserService, useValue: userServiceMock },
        { provide: ConfigService, useValue: config },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    // O AdminGuard le request.cookies; sem o cookieParser o cookie nao chega.
    app.use(cookieParser());
    await app.init();
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await app.close();
  });

  it('GET /control/users exige sessao de admin', async () => {
    await request(app.getHttpServer()).get('/control/users').expect(401);
  });

  it('GET /control/users rejeita token invalido', async () => {
    await request(app.getHttpServer())
      .get('/control/users')
      .set('Cookie', `${ADMIN_COOKIE}=token-que-nao-existe`)
      .expect(401);

    expect(userServiceMock.listAdultRequests).not.toHaveBeenCalled();
  });

  it('GET /control/users lista as solicitacoes', async () => {
    userServiceMock.listAdultRequests.mockResolvedValue([
      { id: 'a', adultRequestStatus: 'pending' },
    ]);

    const response = await request(app.getHttpServer())
      .get('/control/users')
      .set('Cookie', `${ADMIN_COOKIE}=${authToken}`)
      .expect(200);

    expect(response.body).toEqual([{ id: 'a', adultRequestStatus: 'pending' }]);
    expect(userServiceMock.listAdultRequests).toHaveBeenCalled();
  });

  it('GET /control/users nunca expoe campos fora do DTO de moderacao', async () => {
    userServiceMock.listAdultRequests.mockResolvedValue([buildUser()]);

    const response = await request(app.getHttpServer())
      .get('/control/users')
      .set('Cookie', `${ADMIN_COOKIE}=${authToken}`)
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

  it('GET /control/users limita o resultado com o limite padrao', async () => {
    await request(app.getHttpServer())
      .get('/control/users')
      .set('Cookie', `${ADMIN_COOKIE}=${authToken}`)
      .expect(200);

    expect(userServiceMock.listAdultRequests).toHaveBeenCalledWith(50);
  });

  it('GET /control/users aceita limite explicito', async () => {
    await request(app.getHttpServer())
      .get('/control/users?limit=10')
      .set('Cookie', `${ADMIN_COOKIE}=${authToken}`)
      .expect(200);

    expect(userServiceMock.listAdultRequests).toHaveBeenCalledWith(10);
  });

  it('GET /control/users recusa limite nao numerico', async () => {
    await request(app.getHttpServer())
      .get('/control/users?limit=all')
      .set('Cookie', `${ADMIN_COOKIE}=${authToken}`)
      .expect(400);

    expect(userServiceMock.listAdultRequests).not.toHaveBeenCalled();
  });

  it('GET /control/users recusa limite acima do maximo', async () => {
    await request(app.getHttpServer())
      .get('/control/users?limit=100000')
      .set('Cookie', `${ADMIN_COOKIE}=${authToken}`)
      .expect(400);

    expect(userServiceMock.listAdultRequests).not.toHaveBeenCalled();
  });

  it('GET /control/users recusa limite negativo', async () => {
    await request(app.getHttpServer())
      .get('/control/users?limit=-1')
      .set('Cookie', `${ADMIN_COOKIE}=${authToken}`)
      .expect(400);

    expect(userServiceMock.listAdultRequests).not.toHaveBeenCalled();
  });

  it('POST /control/users/:id/approve aprova', async () => {
    userServiceMock.approveAdultRequest.mockResolvedValue({
      id: 'a',
      adultRequestStatus: 'approved',
      adultContentEnabled: true,
    });

    const response = await request(app.getHttpServer())
      .post('/control/users/a/approve')
      .set('Cookie', `${ADMIN_COOKIE}=${authToken}`)
      .expect(200);

    expect(userServiceMock.approveAdultRequest).toHaveBeenCalledWith('a');
    expect(response.body.adultRequestStatus).toBe('approved');
  });

  it('POST approve devolve somente o DTO de moderacao', async () => {
    userServiceMock.approveAdultRequest.mockResolvedValue(buildUser());

    const response = await request(app.getHttpServer())
      .post('/control/users/a/approve')
      .set('Cookie', `${ADMIN_COOKIE}=${authToken}`)
      .expect(200);

    expect(Object.keys(response.body).sort()).toEqual(
      [...ALLOWED_LIST_FIELDS].sort(),
    );
    expect(response.body).not.toHaveProperty('bio');
    expect(response.body).not.toHaveProperty('passwordHash');
  });

  it('POST /control/users/:id/deny nega', async () => {
    userServiceMock.denyAdultRequest.mockResolvedValue({
      id: 'a',
      adultRequestStatus: 'denied',
      adultContentEnabled: false,
    });

    await request(app.getHttpServer())
      .post('/control/users/a/deny')
      .set('Cookie', `${ADMIN_COOKIE}=${authToken}`)
      .expect(200);

    expect(userServiceMock.denyAdultRequest).toHaveBeenCalledWith('a');
  });

  it('POST deny devolve somente o DTO de moderacao', async () => {
    userServiceMock.denyAdultRequest.mockResolvedValue(buildUser());

    const response = await request(app.getHttpServer())
      .post('/control/users/a/deny')
      .set('Cookie', `${ADMIN_COOKIE}=${authToken}`)
      .expect(200);

    expect(Object.keys(response.body).sort()).toEqual(
      [...ALLOWED_LIST_FIELDS].sort(),
    );
    expect(response.body).not.toHaveProperty('bio');
    expect(response.body).not.toHaveProperty('passwordHash');
  });

  it('POST approve exige sessao de admin', async () => {
    await request(app.getHttpServer()).post('/control/users/a/approve').expect(401);

    expect(userServiceMock.approveAdultRequest).not.toHaveBeenCalled();
  });

  it('GET /control/session devolve a identidade do admin', async () => {
    const response = await request(app.getHttpServer())
      .get('/control/session')
      .set('Cookie', `${ADMIN_COOKIE}=${authToken}`)
      .expect(200);

    expect(response.body).toEqual({
      username: 'admin',
      email: 'admin@test.com',
      roles: ['admin'],
    });
  });
});
