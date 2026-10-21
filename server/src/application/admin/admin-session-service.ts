import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { resolveRedisUrl } from '../../data/sessions';
import Redis from 'ioredis';
import type { CookieOptions } from 'express';
import {
  CookieSecuritySettings,
  buildClearCookieOptions,
  buildCookieOptions,
  resolveCookieSecurity,
} from '../../utils/cookie-security';

export const ADMIN_SESSION_COOKIE = 'admin_sid';
/**
 * Token CSRF da sessao admin. Fica em cookie legivel por JavaScript de
 * proposito (double-submit): o client o envia em `X-CSRF-Token` e o guard
 * compara com o token gravado na sessao no servidor. O cookie de sessao
 * continua httpOnly.
 */
export const ADMIN_CSRF_COOKIE = 'admin_csrf';

export interface AdminSession {
  sub: string;
  username: string;
  email: string;
  roles: string[];
  idToken?: string;
  csrfToken: string;
  createdAt: number;
}

interface AdminSessionStore {
  save(token: string, session: AdminSession, ttlMs: number): Promise<void>;
  get(token: string): Promise<AdminSession | null>;
  revoke(token: string): Promise<void>;
  close(): Promise<void>;
}

class RedisAdminSessionStore implements AdminSessionStore {
  private connectPromise?: Promise<void>;
  private readonly prefix = 'admin-session:';

  constructor(private readonly client: Redis) {}

  private ensureConnected(): Promise<void> {
    if (!this.connectPromise) {
      this.connectPromise = this.client.connect().catch((error) => {
        this.connectPromise = undefined;
        throw error;
      });
    }
    return this.connectPromise;
  }

  async save(
    token: string,
    session: AdminSession,
    ttlMs: number,
  ): Promise<void> {
    await this.ensureConnected();
    await this.client.set(
      this.prefix + token,
      JSON.stringify(session),
      'EX',
      Math.max(1, Math.ceil(ttlMs / 1000)),
    );
  }

  async get(token: string): Promise<AdminSession | null> {
    await this.ensureConnected();
    const raw = await this.client.get(this.prefix + token);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AdminSession;
    } catch {
      return null;
    }
  }

  async revoke(token: string): Promise<void> {
    await this.ensureConnected();
    await this.client.del(this.prefix + token);
  }

  async close(): Promise<void> {
    await this.client.quit();
  }
}

class MemoryAdminSessionStore implements AdminSessionStore {
  private readonly store = new Map<string, { s: AdminSession; exp: number }>();
  async save(
    token: string,
    session: AdminSession,
    ttlMs: number,
  ): Promise<void> {
    this.store.set(token, { s: session, exp: Date.now() + ttlMs });
  }
  async get(token: string): Promise<AdminSession | null> {
    const e = this.store.get(token);
    if (!e) return null;
    if (Date.now() > e.exp) {
      this.store.delete(token);
      return null;
    }
    return e.s;
  }
  async revoke(token: string): Promise<void> {
    this.store.delete(token);
  }
  async close(): Promise<void> {
    this.store.clear();
  }
}

export const ADMIN_SESSION_STORE = 'ADMIN_SESSION_STORE';

export const adminSessionStoreProvider = {
  provide: ADMIN_SESSION_STORE,
  inject: [ConfigService],
  useFactory: (config: ConfigService): AdminSessionStore => {
    const url = resolveRedisUrl(config);
    if (url && config.get<string>('SESSION_STORE', 'redis') !== 'memory') {
      return new RedisAdminSessionStore(
        new Redis(url, {
          lazyConnect: true,
          maxRetriesPerRequest: 1,
          enableOfflineQueue: false,
        }),
      );
    }
    return new MemoryAdminSessionStore();
  },
};

@Injectable()
export class AdminSessionsService {
  private readonly ttlMs: number;
  private readonly cookieSecurity: CookieSecuritySettings;

  constructor(
    @Inject(ADMIN_SESSION_STORE) private readonly store: AdminSessionStore,
    config: ConfigService,
  ) {
    this.ttlMs = Math.max(
      1000,
      Number(config.get('KEYCLOAK_SESSION_TTL_MS', 8 * 60 * 60 * 1000)) ||
        8 * 60 * 60 * 1000,
    );
    this.cookieSecurity = resolveCookieSecurity(config);
  }

  get cookieName(): string {
    return ADMIN_SESSION_COOKIE;
  }

  get cookieSecuritySettings(): CookieSecuritySettings {
    return this.cookieSecurity;
  }

  getCookieOptions(): CookieOptions {
    return buildCookieOptions(this.cookieSecurity, this.ttlMs);
  }

  getClearCookieOptions(): CookieOptions {
    return buildClearCookieOptions(this.cookieSecurity);
  }

  get csrfCookieName(): string {
    return ADMIN_CSRF_COOKIE;
  }

  getCsrfCookieOptions(): CookieOptions {
    return buildCookieOptions(this.cookieSecurity, this.ttlMs, {
      httpOnly: false,
    });
  }

  async create(
    session: Omit<AdminSession, 'csrfToken' | 'createdAt'>,
  ): Promise<{
    token: string;
    csrfToken: string;
  }> {
    const token = randomBytes(32).toString('base64url');
    const csrfToken = randomBytes(32).toString('base64url');
    await this.store.save(
      token,
      { ...session, csrfToken, createdAt: Date.now() },
      this.ttlMs,
    );
    return { token, csrfToken };
  }

  getSession(token: string): Promise<AdminSession | null> {
    return this.store.get(token);
  }

  revoke(token: string): Promise<void> {
    return this.store.revoke(token);
  }
}
