import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { SessionsService } from '../sessions/sessions.service';

export interface SessionRequestUser {
  sub: string;
  email: string;
  username: string;
}

export interface SessionRequest {
  cookies?: Record<string, string>;
  user?: SessionRequestUser;
}

@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(private readonly sessionsService: SessionsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<SessionRequest & { cookies?: Record<string, string> }>();

    const token = request.cookies?.[this.sessionsService.cookieName];

    if (!token) {
      throw new UnauthorizedException('Not authenticated.');
    }

    const session = await this.sessionsService.getSession(token);

    if (!session) {
      throw new UnauthorizedException('Session expired or invalid.');
    }

    request.user = {
      sub: session.userId,
      email: session.email,
      username: session.username,
    };

    return true;
  }
}