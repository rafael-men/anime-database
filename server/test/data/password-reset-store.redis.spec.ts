jest.mock('ioredis', () => {
  /**
   * Reproduz o comportamento relevante do ioredis: sem `lazyConnect`, o cliente
   * ja entra em "connecting" na construcao, e um connect() manual depois disso
   * falha com "Redis is already connecting/connected". E o que causava o 500 no
   * endpoint de recuperacao de senha.
   */
  class MockRedis {
    status: string;

    set = jest.fn().mockResolvedValue('OK');
    get = jest.fn().mockResolvedValue(null);
    del = jest.fn().mockResolvedValue(1);
    quit = jest.fn().mockResolvedValue(undefined);

    constructor(_url?: string, options?: { lazyConnect?: boolean }) {
      this.status = options?.lazyConnect ? 'wait' : 'connecting';
    }

    connect = jest.fn().mockImplementation(() => {
      if (this.status !== 'wait') {
        return Promise.reject(
          new Error('Redis is already connecting/connected'),
        );
      }
      this.status = 'ready';
      return Promise.resolve(undefined);
    });
  }

  return { __esModule: true, default: MockRedis };
});

import { ConfigService } from '@nestjs/config';
import {
  passwordResetStoreProvider,
  RedisPasswordResetStore,
} from '../../src/data/password-reset-store';

type MockRedisInstance = {
  status: string;
  connect: jest.Mock;
  set: jest.Mock;
  get: jest.Mock;
  del: jest.Mock;
  quit: jest.Mock;
};

const configWithRedis = {
  get: (key: string, fallback?: unknown) => {
    if (key === 'UPSTASH_REDIS_REST_URL') return 'https://exemplo.upstash.io';
    if (key === 'UPSTASH_REDIS_REST_TOKEN') return 'token';
    if (key === 'REDIS_URL') return undefined;
    if (key === 'SESSION_STORE') return 'redis';
    return fallback;
  },
} as unknown as ConfigService;

function buildStore(): {
  store: RedisPasswordResetStore;
  client: MockRedisInstance;
} {
  const store = passwordResetStoreProvider.useFactory(
    configWithRedis,
  ) as RedisPasswordResetStore;
  return {
    store,
    client: (store as unknown as { client: MockRedisInstance }).client,
  };
}

describe('passwordResetStoreProvider (Redis)', () => {
  it('nao conecta na construcao', () => {
    const { client } = buildStore();

    // lazyConnect:true deixa o cliente em 'wait' ate o primeiro uso.
    expect(client.status).toBe('wait');
    expect(client.connect).toHaveBeenCalledTimes(0);
  });

  it('salva o token no primeiro uso', async () => {
    const { store, client } = buildStore();

    await store.save('hash-1', { userId: 'u1', username: 'rafael' }, 3600);

    expect(client.connect).toHaveBeenCalledTimes(1);
    expect(client.set).toHaveBeenCalledWith(
      'password-reset:hash-1',
      JSON.stringify({ userId: 'u1', username: 'rafael' }),
      'EX',
      3600,
    );
  });

  it('conecta uma unica vez e reaproveita entre chamadas', async () => {
    const { store, client } = buildStore();

    await store.save('hash-1', { userId: 'u1', username: 'rafael' }, 3600);
    await store.consume('hash-1');
    await store.save('hash-2', { userId: 'u2', username: 'outro' }, 3600);

    // Sem lazyConnect a segunda chamada lancaria "already connecting/connected".
    expect(client.connect).toHaveBeenCalledTimes(1);
  });

  it('reaproveita a conexao apos uma falha, em vez de travar', async () => {
    const { store, client } = buildStore();
    client.connect.mockRejectedValueOnce(new Error('connection refused'));

    await expect(
      store.save('hash-1', { userId: 'u1', username: 'rafael' }, 3600),
    ).rejects.toThrow('connection refused');

    await expect(
      store.save('hash-1', { userId: 'u1', username: 'rafael' }, 3600),
    ).resolves.toBeUndefined();

    expect(client.connect).toHaveBeenCalledTimes(2);
  });
});
