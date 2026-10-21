import {
  BadRequestException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { KeycloakService } from '../../src/application/admin/keycloak.service';

function buildService(): KeycloakService {
  return new KeycloakService(
    new ConfigService({
      KEYCLOAK_ISSUER: 'http://keycloak:8080/realms/anidb',
      KEYCLOAK_CLIENT_ID: 'anime-admin',
      KEYCLOAK_CLIENT_SECRET: 'segredo',
      KEYCLOAK_REDIRECT_URI: 'http://localhost:3000/control/callback',
      UPSTASH_REDIS_REST_URL: 'https://exemplo.upstash.io',
    }),
  );
}

describe('KeycloakService quando o Keycloak esta indisponivel', () => {
  let fetchSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    fetchSpy?.mockRestore();
    jest.restoreAllMocks();
  });

  it('devolve 503 (ServiceUnavailable) quando o DNS nao resolve', async () => {
    fetchSpy = jest
      .spyOn(globalThis, 'fetch')
      .mockRejectedValue(new TypeError('fetch failed'));

    await expect(
      buildService().createAuthorizationRequest(),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('devolve 503 quando o Keycloak nao responde no tempo limite', async () => {
    const timeout = new Error('The operation was aborted due to timeout');
    timeout.name = 'TimeoutError';
    fetchSpy = jest.spyOn(globalThis, 'fetch').mockRejectedValue(timeout);

    await expect(
      buildService().createAuthorizationRequest(),
    ).rejects.toMatchObject({
      status: 503,
      message:
        'Provedor de identidade indisponivel. Tente novamente em instantes.',
    });
  });

  it('mantem 400 quando o Keycloak responde com erro HTTP', async () => {
    fetchSpy = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('{}', { status: 500 }));

    await expect(
      buildService().createAuthorizationRequest(),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
