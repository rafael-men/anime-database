import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { timingSafeEqual } from 'crypto';

interface AdminGuardRequest {
  headers: Record<string, string | string[] | undefined>;
}

@Injectable()
export class AdminGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AdminGuardRequest>();

    const expectedEmail = process.env.ADMIN_EMAIL;
    const expectedPassword = process.env.ADMIN_PASSWORD;

    if (!expectedEmail || !expectedPassword) {
      throw new UnauthorizedException('Admin credentials are not configured.');
    }

    const headerValue = request.headers['authorization'];
    const authorization = Array.isArray(headerValue)
      ? headerValue[0]
      : headerValue;

    if (!authorization || !authorization.startsWith('Basic ')) {
      throw new UnauthorizedException('Invalid admin credentials.');
    }

    const decoded = Buffer.from(
      authorization.slice('Basic '.length),
      'base64',
    ).toString('utf8');
    const separatorIndex = decoded.indexOf(':');

    if (separatorIndex === -1) {
      throw new UnauthorizedException('Invalid admin credentials.');
    }

    const email = decoded.slice(0, separatorIndex);
    const password = decoded.slice(separatorIndex + 1);

    if (
      !this.safeEquals(email, expectedEmail) ||
      !this.safeEquals(password, expectedPassword)
    ) {
      throw new UnauthorizedException('Invalid admin credentials.');
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