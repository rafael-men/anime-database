jest.mock('ioredis', () => {
  class MockRedis {
    connect = jest.fn().mockResolvedValue(undefined);
    setex = jest.fn().mockResolvedValue('OK');
    get = jest.fn().mockResolvedValue(null);
    del = jest.fn().mockResolvedValue(1);
    sadd = jest.fn().mockResolvedValue(1);
    srem = jest.fn().mockResolvedValue(1);
    smembers = jest.fn().mockResolvedValue([]);
    expire = jest.fn().mockResolvedValue(1);
    quit = jest.fn().mockResolvedValue(undefined);
  }

  return { __esModule: true, default: MockRedis };
});

import { RedisSessionStore, SessionPayload } from '../../src/data/sessions';

// jest.Mock (e nao ReturnType<typeof jest.fn>) para que mockResolvedValue
// aceite qualquer valor, em vez de inferir `never`.
type MockRedisInstance = {
  connect: jest.Mock;
  setex: jest.Mock;
  get: jest.Mock;
  del: jest.Mock;
  sadd: jest.Mock;
  srem: jest.Mock;
  smembers: jest.Mock;
  expire: jest.Mock;
  quit: jest.Mock;
};

const payload: SessionPayload = {
  userId: 'u1',
  username: 'rafael',
  email: 'rafael@test.com',
  csrfToken: 'csrf-token',
  createdAt: Date.now(),
};

function clientOf(store: RedisSessionStore): MockRedisInstance {
  return (store as unknown as { client: MockRedisInstance }).client;
}

describe('RedisSessionStore', () => {
  it('conecta ao Redis antes de gravar a sessão', async () => {
    const store = new RedisSessionStore('rediss://default:token@host:6379');
    const client = clientOf(store);

    await store.create('tok1', payload, 60_000);

    expect(client.connect).toHaveBeenCalledTimes(1);
    expect(client.setex).toHaveBeenCalledWith(
      'session:tok1',
      60,
      JSON.stringify(payload),
    );
  });

  it('reconecta se a primeira conexão falhar', async () => {
    const store = new RedisSessionStore('rediss://default:token@host:6379');
    const client = clientOf(store);
    client.connect.mockRejectedValueOnce(new Error('connection refused'));

    await expect(store.create('tok1', payload, 60_000)).rejects.toThrow(
      'connection refused',
    );
    expect(client.setex).not.toHaveBeenCalled();

    client.connect.mockResolvedValue(undefined);
    await store.get('tok1');

    expect(client.connect).toHaveBeenCalledTimes(2);
  });

  it('usa get/revoke após conectar', async () => {
    const store = new RedisSessionStore('rediss://default:token@host:6379');
    const client = clientOf(store);

    await store.get('tok1');
    expect(client.get).toHaveBeenCalledWith('session:tok1');

    await store.revoke('tok1');
    expect(client.del).toHaveBeenCalledWith('session:tok1');
  });

  it('indexa o token por usuário ao criar a sessão', async () => {
    const store = new RedisSessionStore('rediss://default:token@host:6379');
    const client = clientOf(store);

    await store.create('tok1', payload, 60_000);

    expect(client.sadd).toHaveBeenCalledWith('user-sessions:u1', 'tok1');
    expect(client.expire).toHaveBeenCalledWith('user-sessions:u1', 60);
  });

  it('revoga todas as sessões de um usuário e limpa o índice', async () => {
    const store = new RedisSessionStore('rediss://default:token@host:6379');
    const client = clientOf(store);
    client.smembers.mockResolvedValue(['tok1', 'tok2']);

    await store.revokeAllForUser('u1');

    expect(client.smembers).toHaveBeenCalledWith('user-sessions:u1');
    // Uma unica chamada del com todas as chaves, e nao uma por token.
    expect(client.del).toHaveBeenCalledWith('session:tok1', 'session:tok2');
    expect(client.del).toHaveBeenCalledWith('user-sessions:u1');
  });

  it('não tenta apagar chaves quando o usuário não tem sessões', async () => {
    const store = new RedisSessionStore('rediss://default:token@host:6379');
    const client = clientOf(store);
    client.smembers.mockResolvedValue([]);

    await store.revokeAllForUser('u1');

    expect(client.del).toHaveBeenCalledTimes(1);
    expect(client.del).toHaveBeenCalledWith('user-sessions:u1');
  });

  it('fecha o cliente sem duplicar conexão', async () => {
    const store = new RedisSessionStore('rediss://default:token@host:6379');
    const client = clientOf(store);

    await store.close();

    expect(client.quit).toHaveBeenCalled();
  });
});
