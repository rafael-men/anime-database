import { Test, TestingModule } from '@nestjs/testing';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import {
  StorageModule,
  STORAGE_PROVIDER,
} from '../../src/storage/storage.module';
import { LocalStorageProvider } from '../../src/storage/local-storage.provider';
import { S3StorageProvider } from '../../src/storage/s3-storage.provider';

const ORIGINAL_ENV = { ...process.env };

async function buildModule(): Promise<TestingModule> {
  return Test.createTestingModule({
    imports: [StorageModule],
  }).compile();
}

describe('StorageModule', () => {
  let uploadsDir: string;

  beforeEach(() => {
    uploadsDir = mkdtempSync(join(tmpdir(), 'anime-db-storage-mod-'));
    process.env = { ...ORIGINAL_ENV };
    process.env.UPLOADS_DIR = uploadsDir;
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    rmSync(uploadsDir, { recursive: true, force: true });
  });

  it('usa o driver local por padrão', async () => {
    const moduleRef = await buildModule();
    const provider = moduleRef.get<unknown>(STORAGE_PROVIDER);

    expect(provider).toBeInstanceOf(LocalStorageProvider);
    await moduleRef.close();
  });

  it('usa o driver local quando STORAGE_DRIVER é inválido/desconhecido', async () => {
    process.env.STORAGE_DRIVER = 'unknown';
    const moduleRef = await buildModule();
    const provider = moduleRef.get<unknown>(STORAGE_PROVIDER);

    expect(provider).toBeInstanceOf(LocalStorageProvider);
    await moduleRef.close();
  });

  it('usa o driver s3 quando STORAGE_DRIVER=s3', async () => {
    process.env.STORAGE_DRIVER = 's3';
    process.env.S3_BUCKET = 'bucket-de-teste';
    process.env.S3_REGION = 'sa-east-1';
    process.env.S3_PUBLIC_URL = 'https://cdn.example.com';

    const moduleRef = await buildModule();
    const provider = moduleRef.get<unknown>(STORAGE_PROVIDER);

    expect(provider).toBeInstanceOf(S3StorageProvider);
    await moduleRef.close();
  });

  it('falha ao ativar s3 sem bucket configurado', async () => {
    process.env.STORAGE_DRIVER = 's3';

    await expect(buildModule()).rejects.toThrow(/S3_BUCKET/);
  });
});
