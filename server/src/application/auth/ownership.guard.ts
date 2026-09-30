import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { SessionRequestUser } from './session-auth.guard';

interface OwnershipRequest {
  params?: Record<string, string | undefined>;
  user?: SessionRequestUser;
}

@Injectable()
export class OwnershipGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<OwnershipRequest>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated.');
    }

    const paramId = request.params?.id;

    if (paramId && user.sub !== paramId) {
      throw new ForbiddenException('You can only access your own account.');
    }

    return true;
  }
}
