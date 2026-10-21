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
import type { CookieOptions } from 'express';
import {
  CookieSecuritySettings,
  buildClearCookieOptions,
  buildCookieOptions,
  resolveCookieSecurity,
} from '../../utils/cookie-security';

export interface CreatedSession {
  token: string;
  csrfToken: string;
}

@Injectable()
export class SessionsService {
  private readonly ttlMs: number;
  private readonly cookieSecurity: CookieSecuritySettings;

  constructor(
    @Inject(SESSION_STORE) private readonly store: SessionStore,
    config: ConfigService,
  ) {
    this.ttlMs = Math.max(
      1000,
      Number(config.get<number>('SESSION_TTL_MS', SESSION_TTL_MS_DEFAULT)) ||
        SESSION_TTL_MS_DEFAULT,
    );
    this.cookieSecurity = resolveCookieSecurity(config);
  }

  get cookieName(): string {
    return SESSION_COOKIE_NAME;
  }

  get cookieSecuritySettings(): CookieSecuritySettings {
    return this.cookieSecurity;
  }

  getCookieOptions(): CookieOptions {
    return buildCookieOptions(this.cookieSecurity, this.ttlMs);
  }

  /** Opcoes de remocao: mesmo `domain`/`path`, sem `maxAge`. */
  getClearCookieOptions(): CookieOptions {
    return buildClearCookieOptions(this.cookieSecurity);
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

  async revokeAllForUser(userId: string): Promise<void> {
    if (this.store.revokeAllForUser) {
      await this.store.revokeAllForUser(userId);
    }
  }

  async close(): Promise<void> {
    if (this.store.close) {
      await this.store.close();
    }
  }
}
