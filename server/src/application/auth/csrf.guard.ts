import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'crypto';
import { SessionsService } from '../sessions/sessions.service';
import { AdminSessionsService } from '../admin/admin-session-service';
import { normalizeOrigin, resolveAllowedOrigins } from '../../utils/origins';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Rotas mutaveis sem `X-CSRF-Token`:
 * - login/registro: ainda nao ha sessao (nem token a exigir);
 * - recuperacao de senha: o link chega por e-mail, em outra aba/sessao;
 * - consentimento: precisa funcionar antes do login.
 *
 * A comparacao e exata (nao por prefixo), para que `/auth/login-alguma-coisa`
 * nao herde a isencao.
 */
export const CSRF_EXEMPT_PATHS: ReadonlySet<string> = new Set([
  '/auth/login',
  '/auth/register',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/consent',
]);

interface CsrfRequest {
  method?: string;
  path?: string;
  url?: string;
  cookies?: Record<string, string>;
  headers: Record<string, string | string[] | undefined>;
}

interface RequestSession {
  csrfToken?: string;
}

@Injectable()
export class CsrfGuard implements CanActivate {
  private readonly allowedOrigins: string[];
  private readonly logger = new Logger(CsrfGuard.name);

  constructor(
    private readonly sessionsService: SessionsService,
    private readonly adminSessions: AdminSessionsService,
    private readonly config: ConfigService,
  ) {
    this.allowedOrigins = resolveAllowedOrigins({
      frontendUrls: config.get<string>('FRONTEND_URLS'),
      frontendUrl: config.get<string>('FRONTEND_URL'),
      adminFrontendUrl: config.get<string>('ADMIN_FRONTEND_URL'),
    });
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<CsrfRequest>();

    const method = (request.method ?? 'GET').toUpperCase();

    if (SAFE_METHODS.has(method)) {
      return true;
    }

    this.assertOriginAllowed(request);

    if (CSRF_EXEMPT_PATHS.has(this.normalizePath(request))) {
      return true;
    }

    const headerValue = request.headers['x-csrf-token'];
    const received = Array.isArray(headerValue) ? headerValue[0] : headerValue;

    // A sessao de usuario e a de admin vivem em cookies diferentes. Validar as
    // duas evita que uma sessao administrativa ativa fique sem CSRF quando nao
    // ha sessao de usuario no mesmo navegador.
    const activeSessions = await this.loadSessions(request);

    for (const session of activeSessions) {
      if (!session.csrfToken) {
        throw new ForbiddenException('CSRF token missing.');
      }

      if (!received || !this.safeEquals(received, session.csrfToken)) {
        throw new ForbiddenException('CSRF token mismatch.');
      }
    }

    return true;
  }

  /**
   * Navegadores enviam `Origin` em toda requisicao mutavel. Sem essa checagem,
   * as rotas isentas (login/registro) aceitariam um POST cross-site, o que
   * permite login CSRF (forcar a vitima a entrar na conta do atacante).
   * Requisicoes sem `Origin` (curl, apps nativos) seguem apenas com o token.
   */
  private assertOriginAllowed(request: CsrfRequest): void {
    const rawOrigin = this.header(request, 'origin');

    if (!rawOrigin) {
      return;
    }

    const origin = normalizeOrigin(rawOrigin);

    if (!origin || !this.allowedOrigins.includes(origin)) {
      this.logger.warn(
        `Requisicao ${request.method} ${this.normalizePath(request)} bloqueada: Origin "${rawOrigin}" nao permitida.`,
      );
      throw new ForbiddenException(
        'Origem nao permitida para requisicoes que alteram dados.',
      );
    }
  }

  private async loadSessions(request: CsrfRequest): Promise<RequestSession[]> {
    const sessions: RequestSession[] = [];

    const userToken = request.cookies?.[this.sessionsService.cookieName];
    if (userToken) {
      const session = await this.sessionsService.getSession(userToken);
      if (session) {
        sessions.push(session);
      }
    }

    if (this.adminSessions?.cookieName) {
      const adminToken = request.cookies?.[this.adminSessions.cookieName];
      if (adminToken) {
        const session = await this.adminSessions.getSession(adminToken);
        if (session) {
          sessions.push(session);
        }
      }
    }

    return sessions;
  }

  private normalizePath(request: CsrfRequest): string {
    const raw = request.path || request.url || '/';
    const path = raw.split('?')[0] || '/';

    if (path.length > 1 && path.endsWith('/')) {
      return path.slice(0, -1);
    }

    return path;
  }

  private header(request: CsrfRequest, name: string): string | undefined {
    const value = request.headers[name];

    return Array.isArray(value) ? value[0] : value;
  }

  private safeEquals(a: string, b: string): boolean {
    const aBuffer = Buffer.from(a);
    const bBuffer = Buffer.from(b);

    if (aBuffer.length !== bBuffer.length) {
      return false;
    }

    return timingSafeEqual(aBuffer, bBuffer);
  }
}
