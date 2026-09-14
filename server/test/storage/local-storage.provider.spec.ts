import { mkdtempSync, existsSync, readFileSync, rmSync, statSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { LocalStorageProvider } from '../../src/storage/local-storage.provider';

describe('LocalStorageProvider', () => {
  let uploadsDir: string;
  let provider: LocalStorageProvider;

  beforeEach(() => {
    uploadsDir = mkdtempSync(join(tmpdir(), 'anime-db-uploads-unittest-'));
    provider = new LocalStorageProvider(uploadsDir);
  });

  afterEach(() => {
    rmSync(uploadsDir, { recursive: true, force: true });
  });

  it('armazena o arquivo com nome gerado e extensão derivada do tipo detectado', async () => {
    const buffer = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3,
    ]);

    const result = await provider.upload({ buffer, kind: 'png' });

    expect(result.url).toMatch(/^\/uploads\/[0-9a-f-]{36}\.png$/);
    expect(result.key).toMatch(/\.png$/);

    const absolute = join(uploadsDir, result.key);
    expect(existsSync(absolute)).toBe(true);
    expect(readFileSync(absolute)).toEqual(buffer);
  });

  it('nunca usa o nome original do cliente', async () => {
    const result = await provider.upload({
      buffer: Buffer.from('data'),
      kind: 'jpeg',
    });

    expect(result.key).not.toContain('..');
    expect(result.key).not.toContain('/');
    expect(result.key).not.toContain('\\');
    expect(result.key.endsWith('.jpg')).toBe(true);
  });

  it('grava arquivos sem bits de execução quando o sistema suporta', async () => {
    if (process.platform === 'win32') {
      return;
    }

    const result = await provider.upload({
      buffer: Buffer.from([0xff, 0xd8, 0xff, 0x01]),
      kind: 'jpeg',
    });
    const mode = statSync(join(uploadsDir, result.key)).mode & 0o111;
    expect(mode).toBe(0);
  });
});
