import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import {
  SESSION_COOKIE_NAME,
  SESSION_STORE,
  SESSION_TTL_MS_DEFAULT,
  SessionPayload,
  SessionUser,
} from '../../data/sessions';
import type { SessionStore } from '../../data/sessions';

export interface CreatedSession {
  token: string;
  csrfToken: string;
}

@Injectable()
export class SessionsService {
  private readonly ttlMs: number;

  constructor(
    @Inject(SESSION_STORE) private readonly store: SessionStore,
    private readonly config: ConfigService,
  ) {
    this.ttlMs = Math.max(
      1000,
      Number(config.get<number>('SESSION_TTL_MS', SESSION_TTL_MS_DEFAULT)) ||
        SESSION_TTL_MS_DEFAULT,
    );
  }

  get cookieName(): string {
    return SESSION_COOKIE_NAME;
  }

  getCookieOptions(): Record<string, unknown> {
    return {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.config.get<string>('NODE_ENV', 'development') === 'production',
      path: '/',
      maxAge: this.ttlMs,
    };
  }

  get ttlMilliseconds(): number {
    return this.ttlMs;
  }

  async createSession(user: SessionUser): Promise<CreatedSession> {
    const token = randomBytes(32).toString('base64url');
    const csrfToken = randomBytes(32).toString('base64url');

    const payload: SessionPayload = {
      userId: user.userId,
      username: user.username,
      email: user.email,
      avatarUrl: user.avatarUrl ?? null,
      csrfToken,
      createdAt: Date.now(),
    };

    await this.store.create(token, payload, this.ttlMs);

    return { token, csrfToken };
  }

  async getSession(token: string): Promise<SessionPayload | null> {
    return this.store.get(token);
  }

  async revoke(token: string): Promise<void> {
    await this.store.revoke(token);
  }

  async close(): Promise<void> {
    if (this.store.close) {
      await this.store.close();
    }
  }
}