import { ConfigService } from '@nestjs/config';
import { resolveRedisUrl } from '../../src/data/sessions';

function makeConfig(env: Record<string, string>): ConfigService {
  return { get: (key: string) => env[key] } as unknown as ConfigService;
}

describe('resolveRedisUrl', () => {
  it('usa REDIS_URL quando é uma URL válida', () => {
    const config = makeConfig({ REDIS_URL: 'redis://localhost:6379' });

    expect(resolveRedisUrl(config)).toBe('redis://localhost:6379');
  });

  it.each(['redis://<host>:6379', 'redis://', 'não é uma url'])(
    'ignora REDIS_URL inválida %s',
    (value) => {
      expect(resolveRedisUrl(makeConfig({ REDIS_URL: value }))).toBeNull();
    },
  );

  it('deriva a URL rediss:// a partir das credenciais Upstash', () => {
    const config = makeConfig({
      UPSTASH_REDIS_REST_URL: 'https://my-instance.upstash.io',
      UPSTASH_REDIS_REST_TOKEN: 'super-secret-token',
    });

    expect(resolveRedisUrl(config)).toBe(
      'rediss://default:super-secret-token@my-instance.upstash.io:6379',
    );
  });

  it('REDIS_URL tem precedência sobre as credenciais Upstash', () => {
    const config = makeConfig({
      REDIS_URL: 'redis://localhost:6379',
      UPSTASH_REDIS_REST_URL: 'https://my-instance.upstash.io',
      UPSTASH_REDIS_REST_TOKEN: 'super-secret-token',
    });

    expect(resolveRedisUrl(config)).toBe('redis://localhost:6379');
  });

  it('retorna null quando nada está configurado', () => {
    expect(resolveRedisUrl(makeConfig({}))).toBeNull();
  });

  it('retorna null quando só o token Upstash é definido', () => {
    const config = makeConfig({ UPSTASH_REDIS_REST_TOKEN: 'token-sozinho' });

    expect(resolveRedisUrl(config)).toBeNull();
  });
});