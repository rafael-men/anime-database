import {
  InMemoryPasswordResetStore,
  PasswordResetToken,
} from '../../src/data/password-reset-store';

describe('InMemoryPasswordResetStore', () => {
  let store: InMemoryPasswordResetStore;

  const token: PasswordResetToken = { userId: 'u1', username: 'rafael' };

  beforeEach(() => {
    store = new InMemoryPasswordResetStore();
  });

  afterEach(async () => {
    await store.close();
  });

  it('salva e consome um token', async () => {
    await store.save('hash-1', token, 3600);

    await expect(store.consume('hash-1')).resolves.toEqual(token);
  });

  it('consome apenas uma vez', async () => {
    await store.save('hash-1', token, 3600);

    await expect(store.consume('hash-1')).resolves.toEqual(token);
    await expect(store.consume('hash-1')).resolves.toBeNull();
  });

  it('devolve null para hash desconhecido', async () => {
    await expect(store.consume('hash-que-nunca-existiu')).resolves.toBeNull();
  });

  it('respeita o TTL', async () => {
    jest.useFakeTimers();
    try {
      await store.save('hash-1', token, 60);

      jest.advanceTimersByTime(61_000);

      await expect(store.consume('hash-1')).resolves.toBeNull();
    } finally {
      jest.useRealTimers();
    }
  });

  it('nao mistura tokens de hashes diferentes', async () => {
    await store.save('hash-1', { userId: 'u1', username: 'a' }, 3600);
    await store.save('hash-2', { userId: 'u2', username: 'b' }, 3600);

    await expect(store.consume('hash-1')).resolves.toEqual({
      userId: 'u1',
      username: 'a',
    });
    await expect(store.consume('hash-2')).resolves.toEqual({
      userId: 'u2',
      username: 'b',
    });
  });
});
