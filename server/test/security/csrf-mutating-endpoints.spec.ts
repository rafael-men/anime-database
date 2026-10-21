import {
  ForbiddenException,
  ExecutionContext,
  INestApplication,
  RequestMethod,
  Type,
} from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { APP_GUARD } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';

import {
  CsrfGuard,
  CSRF_EXEMPT_PATHS,
} from '../../src/application/auth/csrf.guard';
import { AuthController } from '../../src/application/auth/auth.controller';
import { AuthService } from '../../src/application/auth/auth.service';
import { PasswordResetService } from '../../src/application/auth/password-reset.service';
import { SessionsService } from '../../src/application/sessions/sessions.service';
import { AdminAuthController } from '../../src/application/admin/admin.controller';
import { AdminGuard } from '../../src/application/auth/admin.guard';
import { AdminSessionsService } from '../../src/application/admin/admin-session-service';
import { KeycloakService } from '../../src/application/admin/keycloak.service';
import { UserService } from '../../src/use-cases/user/user.service';
import { ConsentController } from '../../src/application/consent/consent.controller';
import { FollowController } from '../../src/application/controllers/follow.controller';
import { GroupController } from '../../src/application/controllers/group.controller';
import { HealthController } from '../../src/application/controllers/health.controller';
import { ReviewController } from '../../src/application/controllers/review.controller';
import { UserController } from '../../src/application/controllers/user.controller';
import { WatchlistController } from '../../src/application/controllers/watchlist.controller';

const USER_CSRF = 'user-csrf-token';
const ADMIN_CSRF = 'admin-csrf-token';

/** O supertest tipa `set-cookie` como string, mas em runtime é array. */
function setCookieHeaders(response: request.Response): string[] {
  const raw = response.headers['set-cookie'] as unknown as
    string[] | string | undefined;

  if (!raw) {
    return [];
  }

  return Array.isArray(raw) ? raw : [raw];
}

function configMock(): { get: (key: string, fallback?: unknown) => unknown } {
  return {
    get: (key: string, fallback?: unknown) => {
      if (key === 'FRONTEND_URLS') {
        return 'http://localhost:4200,https://app.example.com';
      }
      if (key === 'ADMIN_FRONTEND_URL') {
        return 'https://admin.example.com';
      }
      return fallback;
    },
  };
}

const SESSION = {
  userId: 'u1',
  username: 'rafael',
  email: 'rafael@test.com',
  avatarUrl: null,
  csrfToken: USER_CSRF,
  createdAt: Date.now(),
};

const ADMIN_SESSION = {
  sub: 'admin-1',
  username: 'admin',
  email: 'admin@test.com',
  roles: ['admin'],
  csrfToken: ADMIN_CSRF,
  createdAt: Date.now(),
};

interface MutatingRoute {
  method: string;
  path: string;
}

function collectMutatingRoutes(controllers: Type[]): MutatingRoute[] {
  const routes: MutatingRoute[] = [];

  for (const controller of controllers) {
    const controllerPath = Reflect.getMetadata(PATH_METADATA, controller);
    const basePath = Array.isArray(controllerPath)
      ? controllerPath[0]
      : (controllerPath ?? '');

    for (const property of Object.getOwnPropertyNames(controller.prototype)) {
      const handler = controller.prototype[property];

      if (typeof handler !== 'function') {
        continue;
      }

      const requestMethod = Reflect.getMetadata(METHOD_METADATA, handler) as
        RequestMethod | undefined;

      if (requestMethod === undefined) {
        continue;
      }

      if (
        requestMethod === RequestMethod.GET ||
        requestMethod === RequestMethod.HEAD ||
        requestMethod === RequestMethod.OPTIONS
      ) {
        continue;
      }

      const handlerPath = Reflect.getMetadata(PATH_METADATA, handler);
      const relativePath = Array.isArray(handlerPath)
        ? handlerPath[0]
        : (handlerPath ?? '');

      const fullPath = `/${[basePath, relativePath]
        .filter((part) => part && part !== '/')
        .join('/')}`.replace(/\/+/g, '/');

      routes.push({
        method: RequestMethod[requestMethod],
        // `:id` -> `1`: o guard so usa o path para a lista de isencoes.
        path: fullPath.replace(/:[^/]+/g, '1'),
      });
    }
  }

  return routes.sort((a, b) =>
    `${a.method} ${a.path}`.localeCompare(`${b.method} ${b.path}`),
  );
}

function buildContext(
  route: MutatingRoute,
  cookies: Record<string, string>,
  headers: Record<string, string> = {},
): ExecutionContext {
  const req = {
    method: route.method,
    path: route.path,
    url: route.path,
    cookies,
    headers,
  };

  return {
    switchToHttp: () => ({ getRequest: () => req }),
  } as unknown as ExecutionContext;
}

describe('CSRF em todos os endpoints mutáveis', () => {
  const CONTROLLERS: Type[] = [
    AuthController,
    AdminAuthController,
    ConsentController,
    UserController,
    GroupController,
    WatchlistController,
    FollowController,
    ReviewController,
    HealthController,
  ];

  const routes = collectMutatingRoutes(CONTROLLERS);

  let guard: CsrfGuard;
  let sessionsMock: { cookieName: string; getSession: jest.Mock };
  let adminSessionsMock: { cookieName: string; getSession: jest.Mock };

  beforeEach(() => {
    sessionsMock = {
      cookieName: 'sid',
      getSession: jest.fn().mockResolvedValue(SESSION),
    };
    adminSessionsMock = {
      cookieName: 'admin_sid',
      getSession: jest.fn().mockResolvedValue(ADMIN_SESSION),
    };

    guard = new CsrfGuard(
      sessionsMock as unknown as SessionsService,
      adminSessionsMock as unknown as AdminSessionsService,
      configMock() as unknown as ConfigService,
    );
  });

  it('não deixa nenhum endpoint mutável sem checagem (nem isenção fora da lista)', () => {
    const expected = [
      'POST /auth/forgot-password',
      'POST /auth/login',
      'POST /auth/register',
      'POST /auth/reset-password',
      'POST /consent',
      'POST /auth/logout',
      'POST /control/users/1/approve',
      'POST /control/users/1/deny',
      'POST /follows/1',
      'DELETE /follows/1',
      'POST /groups',
      'PATCH /groups/1',
      'DELETE /groups/1',
      'POST /groups/1/items',
      'DELETE /groups/1/items/1',
      'POST /users/1/favorites',
      'DELETE /users/1/favorites/1',
      'POST /users/1/reviews',
      'POST /users/1/profile',
      'POST /users/1/avatar',
      'POST /watchlist',
      'PATCH /watchlist/1',
      'DELETE /watchlist/1',
    ].sort();

    expect(routes.map((route) => `${route.method} ${route.path}`)).toEqual(
      expected,
    );
  });

  it('mantém a lista de isenções explícita e exata', () => {
    expect([...CSRF_EXEMPT_PATHS].sort()).toEqual([
      '/auth/forgot-password',
      '/auth/login',
      '/auth/register',
      '/auth/reset-password',
      '/consent',
    ]);

    // Toda isenção precisa apontar para uma rota real: uma isenção órfã
    // esconderia proteção futura em outro endpoint.
    for (const exemptPath of CSRF_EXEMPT_PATHS) {
      expect(routes.some((route) => route.path === exemptPath)).toBe(true);
    }
  });

  const protectedRoutes = routes.filter(
    (route) => !CSRF_EXEMPT_PATHS.has(route.path),
  );

  it.each(
    protectedRoutes.map(
      (route) => [`${route.method} ${route.path}`, route] as const,
    ),
  )(
    'bloqueia %s sem X-CSRF-Token quando há sessão ativa',
    async (_label, route) => {
      await expect(
        guard.canActivate(buildContext(route, { sid: 'user-token' })),
      ).rejects.toBeInstanceOf(ForbiddenException);

      await expect(
        guard.canActivate(
          buildContext(
            route,
            { sid: 'user-token' },
            { 'x-csrf-token': 'token-errado' },
          ),
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    },
  );

  it.each(
    protectedRoutes.map(
      (route) => [`${route.method} ${route.path}`, route] as const,
    ),
  )('aceita %s com o token da sessão', async (_label, route) => {
    await expect(
      guard.canActivate(
        buildContext(
          route,
          { sid: 'user-token' },
          { 'x-csrf-token': USER_CSRF },
        ),
      ),
    ).resolves.toBe(true);
  });

  it('exige o token da sessão de admin nas rotas /control (mesmo sem sessão de usuário)', async () => {
    const route = { method: 'POST', path: '/control/users/1/approve' };

    await expect(
      guard.canActivate(buildContext(route, { admin_sid: 'admin-token' })),
    ).rejects.toBeInstanceOf(ForbiddenException);

    await expect(
      guard.canActivate(
        buildContext(
          route,
          { admin_sid: 'admin-token' },
          { 'x-csrf-token': USER_CSRF },
        ),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    await expect(
      guard.canActivate(
        buildContext(
          route,
          { admin_sid: 'admin-token' },
          { 'x-csrf-token': ADMIN_CSRF },
        ),
      ),
    ).resolves.toBe(true);
  });

  it('mantém login/registro/recuperação/consentimento isentos do token', async () => {
    for (const path of CSRF_EXEMPT_PATHS) {
      await expect(
        guard.canActivate(
          buildContext({ method: 'POST', path }, { sid: 'user-token' }),
        ),
      ).resolves.toBe(true);
    }
  });

  it('não confunde prefixo com isenção (/auth/login-x não é isento)', async () => {
    await expect(
      guard.canActivate(
        buildContext(
          { method: 'POST', path: '/auth/login-admin' },
          { sid: 'user-token' },
        ),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejeita Origin de outro site mesmo em rota isenta (login CSRF)', async () => {
    await expect(
      guard.canActivate(
        buildContext(
          { method: 'POST', path: '/auth/login' },
          {},
          { origin: 'https://evil.example' },
        ),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejeita Origin de outro site mesmo com token válido', async () => {
    await expect(
      guard.canActivate(
        buildContext(
          { method: 'POST', path: '/groups' },
          { sid: 'user-token' },
          { origin: 'https://evil.example', 'x-csrf-token': USER_CSRF },
        ),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it.each([
    'http://localhost:4200',
    'https://app.example.com',
    'https://admin.example.com',
  ])('aceita Origin configurada (%s)', async (origin) => {
    await expect(
      guard.canActivate(
        buildContext(
          { method: 'POST', path: '/groups' },
          { sid: 'user-token' },
          { origin, 'x-csrf-token': USER_CSRF },
        ),
      ),
    ).resolves.toBe(true);
  });

  it('não quebra clientes sem cabeçalho Origin (curl/apps nativos)', async () => {
    await expect(
      guard.canActivate(
        buildContext(
          { method: 'POST', path: '/groups' },
          { sid: 'user-token' },
          { 'x-csrf-token': USER_CSRF },
        ),
      ),
    ).resolves.toBe(true);
  });

  it('ignora cookie de sessão inválido (o guard de autenticação responde 401)', async () => {
    sessionsMock.getSession.mockResolvedValue(null);

    await expect(
      guard.canActivate(
        buildContext({ method: 'POST', path: '/groups' }, { sid: 'expirado' }),
      ),
    ).resolves.toBe(true);
  });
});

describe('CSRF de ponta a ponta nos fluxos de autenticação', () => {
  let app: INestApplication;
  let sessionsMock: {
    cookieName: string;
    getCookieOptions: () => Record<string, unknown>;
    getClearCookieOptions: () => Record<string, unknown>;
    getSession: jest.Mock;
    revoke: jest.Mock;
  };
  let adminSessionsMock: {
    cookieName: string;
    csrfCookieName: string;
    getCookieOptions: () => Record<string, unknown>;
    getClearCookieOptions: () => Record<string, unknown>;
    getCsrfCookieOptions: () => Record<string, unknown>;
    create: jest.Mock;
    getSession: jest.Mock;
    revoke: jest.Mock;
  };
  let keycloakMock: { exchangeCode: jest.Mock };
  let authMock: { register: jest.Mock; login: jest.Mock };
  let userServiceMock: {
    approveAdultRequest: jest.Mock;
    denyAdultRequest: jest.Mock;
  };

  beforeEach(async () => {
    sessionsMock = {
      cookieName: 'sid',
      getCookieOptions: () => ({ httpOnly: true, sameSite: 'lax', path: '/' }),
      getClearCookieOptions: () => ({
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
      }),
      getSession: jest.fn().mockResolvedValue(SESSION),
      revoke: jest.fn().mockResolvedValue(undefined),
    };
    adminSessionsMock = {
      cookieName: 'admin_sid',
      csrfCookieName: 'admin_csrf',
      getCookieOptions: () => ({ httpOnly: true, sameSite: 'lax', path: '/' }),
      getClearCookieOptions: () => ({
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
      }),
      getCsrfCookieOptions: () => ({
        httpOnly: false,
        sameSite: 'lax',
        path: '/',
      }),
      create: jest.fn().mockResolvedValue({
        token: 'admin-token',
        csrfToken: ADMIN_CSRF,
      }),
      getSession: jest.fn().mockResolvedValue(ADMIN_SESSION),
      revoke: jest.fn().mockResolvedValue(undefined),
    };
    keycloakMock = {
      exchangeCode: jest.fn().mockResolvedValue({
        sub: 'admin-1',
        username: 'admin',
        email: 'admin@test.com',
        roles: ['admin'],
        idToken: 'id-token',
      }),
    };
    authMock = {
      register: jest.fn(),
      login: jest.fn().mockResolvedValue({
        sessionToken: 'novo-token',
        csrfToken: USER_CSRF,
        user: {
          id: 'u1',
          username: 'rafael',
          email: 'rafael@test.com',
          avatarUrl: null,
        },
      }),
    };
    userServiceMock = {
      approveAdultRequest: jest.fn().mockResolvedValue({
        id: '1',
        username: 'rafael',
        email: 'rafael@test.com',
        adultRequestStatus: 'approved',
      }),
      denyAdultRequest: jest.fn(),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [AuthController, AdminAuthController],
      providers: [
        { provide: AuthService, useValue: authMock },
        { provide: SessionsService, useValue: sessionsMock },
        { provide: AdminSessionsService, useValue: adminSessionsMock },
        {
          provide: PasswordResetService,
          useValue: { requestReset: jest.fn(), resetPassword: jest.fn() },
        },
        {
          provide: KeycloakService,
          useValue: {
            createAuthorizationRequest: jest.fn(),
            buildLogoutUrl: jest.fn(),
            ...keycloakMock,
          },
        },
        { provide: UserService, useValue: userServiceMock },
        AdminGuard,
        { provide: ConfigService, useValue: configMock() },
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

  it('POST /auth/logout exige CSRF quando há sessão (evita logout forçado)', async () => {
    await request(app.getHttpServer())
      .post('/auth/logout')
      .set('Cookie', 'sid=user-token')
      .expect(403);

    expect(sessionsMock.revoke).not.toHaveBeenCalled();
  });

  it('POST /auth/logout com token válido encerra a sessão', async () => {
    await request(app.getHttpServer())
      .post('/auth/logout')
      .set('Cookie', 'sid=user-token')
      .set('X-CSRF-Token', USER_CSRF)
      .expect(204);

    expect(sessionsMock.revoke).toHaveBeenCalledWith('user-token');
  });

  it('POST /auth/logout com Origin externa é bloqueado antes do token', async () => {
    await request(app.getHttpServer())
      .post('/auth/logout')
      .set('Cookie', 'sid=user-token')
      .set('Origin', 'https://evil.example')
      .set('X-CSRF-Token', USER_CSRF)
      .expect(403);

    expect(sessionsMock.revoke).not.toHaveBeenCalled();
  });

  it('POST /auth/login continua isento de token (não há sessão ainda)', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'rafael@test.com', password: 'secret123' })
      .expect(200);

    expect(authMock.login).toHaveBeenCalledWith('rafael@test.com', 'secret123');
  });

  it('POST /auth/login com Origin externa é bloqueado (login CSRF)', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .set('Origin', 'https://evil.example')
      .send({ email: 'rafael@test.com', password: 'secret123' })
      .expect(403);

    expect(authMock.login).not.toHaveBeenCalled();
  });

  it('POST /auth/register com Origin externa é bloqueado', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .set('Origin', 'https://evil.example')
      .send({
        username: 'rafael',
        email: 'rafael@test.com',
        password: 'secret123',
      })
      .expect(403);

    expect(authMock.register).not.toHaveBeenCalled();
  });

  it('POST /auth/register com Origin permitida funciona sem token', async () => {
    authMock.register.mockResolvedValue({
      sessionToken: 'novo-token',
      csrfToken: USER_CSRF,
      user: {
        id: 'u1',
        username: 'rafael',
        email: 'rafael@test.com',
        avatarUrl: null,
      },
    });

    await request(app.getHttpServer())
      .post('/auth/register')
      .set('Origin', 'http://localhost:4200')
      .send({
        username: 'rafael',
        email: 'rafael@test.com',
        password: 'secret123',
      })
      .expect(201);
  });

  it('GET /control/callback entrega admin_sid httpOnly e admin_csrf legível', async () => {
    const response = await request(app.getHttpServer())
      .get('/control/callback?code=abc&state=xyz')
      .expect(302);

    const cookies = setCookieHeaders(response);
    const sessionCookie =
      cookies.find((cookie) => cookie.startsWith('admin_sid=')) ?? '';
    const csrfCookie =
      cookies.find((cookie) => cookie.startsWith('admin_csrf=')) ?? '';

    expect(sessionCookie).toContain('HttpOnly');
    expect(csrfCookie).toContain(`admin_csrf=${ADMIN_CSRF}`);
    expect(csrfCookie).not.toContain('HttpOnly');
  });

  it('POST /control/users/:id/approve exige o token da sessão admin', async () => {
    await request(app.getHttpServer())
      .post('/control/users/1/approve')
      .set('Cookie', 'admin_sid=admin-token')
      .expect(403);

    expect(userServiceMock.approveAdultRequest).not.toHaveBeenCalled();
  });

  it('POST /control/users/:id/approve funciona com o token admin correto', async () => {
    await request(app.getHttpServer())
      .post('/control/users/1/approve')
      .set('Cookie', 'admin_sid=admin-token')
      .set('Origin', 'https://admin.example.com')
      .set('X-CSRF-Token', ADMIN_CSRF)
      .expect(200);

    expect(userServiceMock.approveAdultRequest).toHaveBeenCalledWith('1');
  });

  it('POST /control/users/:id/deny sem sessão segue para o AdminGuard (401)', async () => {
    await request(app.getHttpServer())
      .post('/control/users/1/deny')
      .expect(401);
  });
});
