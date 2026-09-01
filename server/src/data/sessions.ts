import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';

export const SESSION_COOKIE_NAME = 'sid';

export const SESSION_TTL_MS_DEFAULT = 30 * 24 * 60 * 60 * 1000;

export interface SessionUser {
  userId: string;
  username: string;
  email: string;
  avatarUrl?: string | null;
}

export interface SessionPayload extends SessionUser {
  csrfToken: string;
  createdAt: number;
}

export interface SessionStore {
  create(token: string, payload: SessionPayload, ttlMs: number): Promise<void>;
  get(token: string): Promise<SessionPayload | null>;
  revoke(token: string): Promise<void>;
  close?(): Promise<void>;
}

export const SESSION_STORE = 'SESSION_STORE';

export class RedisSessionStore implements SessionStore {
  private readonly client: Redis;
  private readonly keyPrefix = 'session:';
  private connectPromise?: Promise<void>;

  constructor(url: string) {
    this.client = new Redis(url, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
    });
  }

  private ensureConnected(): Promise<void> {
    if (!this.connectPromise) {
      this.connectPromise = this.client.connect().catch((error) => {
        this.connectPromise = undefined;
        throw error;
      });
    }

    return this.connectPromise;
  }

  private key(token: string): string {
    return `${this.keyPrefix}${token}`;
  }

  async create(token: string, payload: SessionPayload, ttlMs: number): Promise<void> {
    await this.ensureConnected();
    const ttlSeconds = Math.max(1, Math.ceil(ttlMs / 1000));
    await this.client.setex(this.key(token), ttlSeconds, JSON.stringify(payload));
  }

  async get(token: string): Promise<SessionPayload | null> {
    await this.ensureConnected();
    const raw = await this.client.get(this.key(token));

    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as SessionPayload;
    } catch {
      return null;
    }
  }

  async revoke(token: string): Promise<void> {
    await this.ensureConnected();
    await this.client.del(this.key(token));
  }

  async close(): Promise<void> {
    this.connectPromise = undefined;
    await this.client.quit();
  }
}

export class InMemorySessionStore implements SessionStore {
  private readonly store = new Map<
    string,
    { payload: SessionPayload; expiresAt: number }
  >();

  async create(token: string, payload: SessionPayload, ttlMs: number): Promise<void> {
    this.store.set(token, { payload, expiresAt: Date.now() + ttlMs });
  }

  async get(token: string): Promise<SessionPayload | null> {
    const entry = this.store.get(token);

    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.store.delete(token);
      return null;
    }

    return entry.payload;
  }

  async revoke(token: string): Promise<void> {
    this.store.delete(token);
  }

  async close(): Promise<void> {
    this.store.clear();
  }
}

export function resolveRedisUrl(config: ConfigService): string | null {
  const directUrl = config.get<string>('REDIS_URL');
  if (isValidRedisUrl(directUrl)) {
    return directUrl;
  }

  const restUrl = config.get<string>('UPSTASH_REDIS_REST_URL');
  const restToken = config.get<string>('UPSTASH_REDIS_REST_TOKEN');

  if (isValidRedisUrl(restUrl) && restToken) {
    const host = new URL(restUrl).host;

    return `rediss://default:${encodeURIComponent(restToken)}@${host}:6379`;
  }

  return null;
}

function isValidRedisUrl(value: string | undefined): value is string {
  if (!value || value.includes('<') || value.includes('>')) {
    return false;
  }

  try {
    const parsed = new URL(value);
    return Boolean(parsed.hostname);
  } catch {
    return false;
  }
}

export const sessionStoreProvider = {
  provide: SESSION_STORE,
  inject: [ConfigService],
  useFactory: (config: ConfigService): SessionStore => {
    const url = resolveRedisUrl(config);

    if (url && config.get<string>('SESSION_STORE', 'redis') !== 'memory') {
      return new RedisSessionStore(url);
    }

    Logger.warn(
      'REDIS_URL/UPSTASH_REDIS_REST_URL não configurados ou inválidos. ' +
        'Usando armazenamento de sessão em memória (sessões são perdidas no restart).',
      'SessionsStore',
    );

    return new InMemorySessionStore();
  },
};