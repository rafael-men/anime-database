import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { resolveRedisUrl } from '../../data/sessions';
import Redis from 'ioredis';

export const ADMIN_SESSION_COOKIE = 'admin_sid';

export interface AdminSession {
  sub: string;
  username: string;
  email: string;
  roles: string[];
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

  async save(token: string, session: AdminSession, ttlMs: number): Promise<void> {
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
  async save(token: string, session: AdminSession, ttlMs: number): Promise<void> {
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
  private readonly isProduction: boolean;

  constructor(
    @Inject(ADMIN_SESSION_STORE) private readonly store: AdminSessionStore,
    config: ConfigService,
  ) {
    this.ttlMs = Math.max(
      1000,
      Number(config.get('KEYCLOAK_SESSION_TTL_MS', 8 * 60 * 60 * 1000)) ||
        8 * 60 * 60 * 1000,
    );
    this.isProduction = config.get<string>('NODE_ENV', 'development') === 'production';
  }

  get cookieName(): string {
    return ADMIN_SESSION_COOKIE;
  }

  getCookieOptions(): Record<string, unknown> {
    return {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.isProduction,
      path: '/',
      maxAge: this.ttlMs,
    };
  }

  async create(session: Omit<AdminSession, 'csrfToken' | 'createdAt'>): Promise<{
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