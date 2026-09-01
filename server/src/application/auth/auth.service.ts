import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UserService } from '../../use-cases/user/user.service';
import { SessionsService } from '../sessions/sessions.service';

export interface SessionUserResult {
  id: string;
  username: string;
  email: string;
  avatarUrl?: string | null;
}

export interface SessionResult {
  sessionToken: string;
  csrfToken: string;
  user: SessionUserResult;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly sessionsService: SessionsService,
  ) {}

  async register(data: {
    username: string;
    email: string;
    password: string;
    avatarUrl?: string | null;
    bio?: string | null;
  }): Promise<SessionResult> {
    const hashedPassword = await bcrypt.hash(data.password, 10);

    const user = await this.userService.createUser({
      username: data.username,
      email: data.email,
      passwordHash: hashedPassword,
      avatarUrl: data.avatarUrl,
      bio: data.bio,
    });

    return this.buildSessionResult(user.id, user.username, user.email, user.avatarUrl);
  }

  async login(email: string, password: string): Promise<SessionResult> {
    const user = await this.userService.findByEmail(email);

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    return this.buildSessionResult(user.id, user.username, user.email, user.avatarUrl);
  }

  private async buildSessionResult(
    userId: string,
    username: string,
    email: string,
    avatarUrl?: string | null,
  ): Promise<SessionResult> {
    const { token: sessionToken, csrfToken } = await this.sessionsService.createSession({
      userId,
      username,
      email,
      avatarUrl: avatarUrl ?? null,
    });

    return {
      sessionToken,
      csrfToken,
      user: {
        id: userId,
        username,
        email,
        avatarUrl: avatarUrl ?? null,
      },
    };
  }
}