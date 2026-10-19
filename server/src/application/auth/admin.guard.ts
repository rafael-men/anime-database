import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AdminSessionsService } from '../admin/admin-session-service';

interface AdminGuardRequest {
  cookies?: Record<string, string>;
  admin?: { sub: string; username: string; email: string; roles: string[] };
}

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly adminSessions: AdminSessionsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AdminGuardRequest>();
    const token = request.cookies?.[this.adminSessions.cookieName];

    if (!token) {
      throw new UnauthorizedException('Nao autenticado.');
    }

    const session = await this.adminSessions.getSession(token);

    if (!session) {
      throw new UnauthorizedException('Sessao expirada ou invalida.');
    }

    request.admin = {
      sub: session.sub,
      username: session.username,
      email: session.email,
      roles: session.roles,
    };

    return true;
  }
}