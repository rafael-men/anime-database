import { InMemorySessionStore } from '../../src/data/sessions';
import { SessionsService } from '../../src/application/sessions/sessions.service';
import { ConfigService } from '@nestjs/config';

/**
 * Cobre a revogacao em massa usada pelo reset de senha: trocar a senha precisa
 * derrubar todas as sessoes do usuario, sem afetar as de outros.
 */
describe('SessionsService.revokeAllForUser', () => {
  let store: InMemorySessionStore;
  let service: SessionsService;

  const configMock = {
    get: jest.fn((key: string, fallback?: unknown) =>
      key === 'SESSION_TTL_MS' ? fallback : undefined,
    ),
  } as unknown as ConfigService;

  beforeEach(() => {
    store = new InMemorySessionStore();
    service = new SessionsService(store, configMock);
  });

  afterEach(async () => {
    await store.close();
  });

  async function createSessionFor(userId: string): Promise<string> {
    const { token } = await service.createSession({
      userId,
      username: `${userId}-name`,
      email: `${userId}@test.com`,
      avatarUrl: null,
    });
    return token;
  }

  it('revoga todas as sessoes do usuario alvo', async () => {
    const first = await createSessionFor('u1');
    const second = await createSessionFor('u1');

    await service.revokeAllForUser('u1');

    await expect(service.getSession(first)).resolves.toBeNull();
    await expect(service.getSession(second)).resolves.toBeNull();
  });

  it('nao afeta sessoes de outros usuarios', async () => {
    const target = await createSessionFor('u1');
    const other = await createSessionFor('u2');

    await service.revokeAllForUser('u1');

    await expect(service.getSession(target)).resolves.toBeNull();
    await expect(service.getSession(other)).resolves.not.toBeNull();
  });

  it('nao falha quando o usuario nao tem sessoes', async () => {
    await expect(
      service.revokeAllForUser('sem-sessao'),
    ).resolves.toBeUndefined();
  });
});
