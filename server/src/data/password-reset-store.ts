import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { resolveRedisUrl } from './sessions';

const RESET_KEY_PREFIX = 'password-reset:';

export interface PasswordResetToken {
  userId: string;
  username: string;
}

export interface PasswordResetStore {
  save(
    hash: string,
    token: PasswordResetToken,
    ttlSeconds: number,
  ): Promise<void>;
  consume(hash: string): Promise<PasswordResetToken | null>;
  close?(): Promise<void>;
}

export class RedisPasswordResetStore implements PasswordResetStore {
  private connectPromise?: Promise<void>;

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
    hash: string,
    token: PasswordResetToken,
    ttlSeconds: number,
  ): Promise<void> {
    await this.ensureConnected();
    await this.client.set(
      RESET_KEY_PREFIX + hash,
      JSON.stringify(token),
      'EX',
      Math.max(1, ttlSeconds),
    );
  }

  async consume(hash: string): Promise<PasswordResetToken | null> {
    await this.ensureConnected();
    const key = RESET_KEY_PREFIX + hash;

    const raw = await this.client.get(key);

    if (raw) {
      await this.client.del(key);
    }

    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as PasswordResetToken;
    } catch {
      return null;
    }
  }

  async close(): Promise<void> {
    this.connectPromise = undefined;
    await this.client.quit();
  }
}

export class InMemoryPasswordResetStore implements PasswordResetStore {
  private readonly store = new Map<
    string,
    { token: PasswordResetToken; expiresAt: number }
  >();

  save(
    hash: string,
    token: PasswordResetToken,
    ttlSeconds: number,
  ): Promise<void> {
    this.store.set(hash, {
      token,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
    return Promise.resolve();
  }

  consume(hash: string): Promise<PasswordResetToken | null> {
    return Promise.resolve(this.consumeSync(hash));
  }

  private consumeSync(hash: string): PasswordResetToken | null {
    const entry = this.store.get(hash);

    if (!entry) {
      return null;
    }

    this.store.delete(hash);

    if (Date.now() > entry.expiresAt) {
      return null;
    }

    return entry.token;
  }

  close(): Promise<void> {
    this.store.clear();
    return Promise.resolve();
  }
}

export const PASSWORD_RESET_STORE = 'PASSWORD_RESET_STORE';

export const passwordResetStoreProvider = {
  provide: PASSWORD_RESET_STORE,
  inject: [ConfigService],
  useFactory: (config: ConfigService): PasswordResetStore => {
    const url = resolveRedisUrl(config);

    if (url && config.get<string>('SESSION_STORE', 'redis') !== 'memory') {
      return new RedisPasswordResetStore(
        new Redis(url, {
          // Obrigatorio: sem lazyConnect o ioredis ja conecta na construcao e o
          // connect() do ensureConnected() falha com "already connecting/connected".
          // Obrigatorio: sem lazyConnect o ioredis ja conecta na construcao e o
          // connect() do ensureConnected() falha com 'already connecting/connected'.
          lazyConnect: true,
          maxRetriesPerRequest: 1,
          enableOfflineQueue: false,
        }),
      );
    }

    Logger.warn(
      'Sem Redis, os tokens de recuperacao de senha ficam em memória ' +
        '(tokens se perdem no restart).',
      'PasswordResetStore',
    );

    return new InMemoryPasswordResetStore();
  },
};
