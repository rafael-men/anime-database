import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { timingSafeEqual } from 'crypto';
import { SessionsService } from '../sessions/sessions.service';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const CSRF_EXEMPT_PATHS = new Set(['/auth/login', '/auth/register']);

interface CsrfRequest {
  method?: string;
  path?: string;
  url?: string;
  cookies?: Record<string, string>;
  headers: Record<string, string | string[] | undefined>;
}

@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(private readonly sessionsService: SessionsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<CsrfRequest>();

    const method = (request.method ?? 'GET').toUpperCase();

    if (SAFE_METHODS.has(method)) {
      return true;
    }

    const path = request.path || request.url || '';

    if ([...CSRF_EXEMPT_PATHS].some((prefix) => path.startsWith(prefix))) {
      return true;
    }

    const token = request.cookies?.[this.sessionsService.cookieName];

    if (!token) {
      return true;
    }

    const session = await this.sessionsService.getSession(token);

    if (!session) {
      return true;
    }

    if (!session.csrfToken) {
      throw new ForbiddenException('CSRF token missing.');
    }

    const headerValue = request.headers['x-csrf-token'];
    const received = Array.isArray(headerValue) ? headerValue[0] : headerValue;

    if (!received || !this.safeEquals(received, session.csrfToken)) {
      throw new ForbiddenException('CSRF token mismatch.');
    }

    return true;
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