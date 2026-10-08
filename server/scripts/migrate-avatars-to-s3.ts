import * as fs from 'node:fs';
import * as path from 'node:path';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { readFile, readdir } from 'node:fs/promises';
import { basename, extname, join } from 'node:path';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { RowDataPacket } from 'mysql2';
import { createPool, Pool } from 'mysql2/promise';
import {
  assertSafeImage,
  IMAGE_MIME_TYPES,
  ImageKind,
} from '../src/utils/file-validation';
import { resolveUploadsDir } from '../src/utils/file-upload';

const APPLY = process.argv.includes('--apply');
const UPLOADS_PREFIX = '/uploads/';

interface AvatarRow extends RowDataPacket {
  id: string;
  username: string;
  avatarUrl: string | null;
}

type Status =
  | 'migrated'
  | 'missing-file'
  | 'invalid-image'
  | 'skipped-not-local'
  | 'failed';

interface Outcome {
  id: string;
  username: string;
  avatarUrl: string;
  status: Status;
  detail?: string;
}

/**
 * Carrega server/.env sem sobrescrever variaveis ja definidas no ambiente
 * (docker compose injeta env_file e isso tem precedencia). Evita depender do
 * `dotenv`, que hoje so existe como dependencia transitiva do @nestjs/config.
 */
function loadEnvFile() {
  const file =
    process.env.STORAGE_ENV_FILE ?? path.resolve(process.cwd(), '.env');
  if (!existsSync(file)) {
    return;
  }
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/.exec(line);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (process.env[key] !== undefined) continue;
    process.env[key] = rawValue.replace(/^["']|["']$/g, '');
  }
}

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Variavel obrigatoria ausente: ${name}`);
  }
  return value;
}

/** Mesma logica de SSL do runtime (ver src/data/config/database.config.ts). */
function buildSsl() {
  const enabled = ['true', '1', 'required'].includes(
    String(process.env.DB_SSL ?? '').toLowerCase(),
  );
  if (!enabled) {
    return undefined;
  }
  const caPath = process.env.DB_SSL_CA_PATH;
  return {
    rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false',
    ...(caPath
      ? { ca: fs.readFileSync(path.resolve(process.cwd(), caPath), 'utf8') }
      : {}),
  };
}

function buildPool(): Pool {
  return createPool({
    host: requireEnv('DB_HOST'),
    port: Number(process.env.DB_PORT ?? 3306),
    user: requireEnv('DB_USERNAME'),
    password: requireEnv('DB_PASSWORD'),
    database: requireEnv('DB_NAME'),
    connectionLimit: 1,
    charset: 'utf8mb4',
    ssl: buildSsl(),
  });
}

/**
 * Deriva o caminho a partir do basename do avatarUrl e recusa qualquer tentativa
 * de escapar da pasta (ex.: `../../etc/passwd` gravado no banco).
 */
function safeLocalPath(uploadsDir: string, avatarUrl: string): string | null {
  const filename = avatarUrl.slice(UPLOADS_PREFIX.length);
  if (
    !filename ||
    filename !== basename(filename) ||
    filename.startsWith('.')
  ) {
    return null;
  }
  return join(uploadsDir, filename);
}

/**
 * Key deterministica por conteudo: reexecutar o script nao duplica objetos e
 * nao gera orphans quando o mesmo arquivo e migrado duas vezes.
 */
function buildKey(buffer: Buffer, ext: string): string {
  const digest = createHash('sha256').update(buffer).digest('hex').slice(0, 32);
  return `avatars/${digest}${ext}`;
}

async function main() {
  loadEnvFile();

  const bucket = requireEnv('S3_BUCKET');
  const uploadsDir = resolveUploadsDir();
  const publicUrl = process.env.S3_PUBLIC_URL?.trim().replace(/\/$/, '');
  const endpoint = process.env.S3_ENDPOINT?.trim();

  console.log(
    `Modo: ${APPLY ? 'APLICAR (escreve no S3 e no banco)' : 'DRY-RUN (nada e alterado)'}`,
  );
  console.log(`Bucket:    ${bucket}`);
  console.log(`Endpoint:  ${endpoint ?? '(AWS padrao)'}`);
  console.log(
    `PublicURL: ${publicUrl ?? '(nao definido - URL firmada sera usada)'}`,
  );
  console.log(`Local:     ${uploadsDir}`);

  if (!publicUrl) {
    console.log(
      '\nAVISO: sem S3_PUBLIC_URL as URLs gravadas serao permanentes no bucket,',
    );
    console.log(
      'mas o codigo do app assina URLs ao subir. Defina S3_PUBLIC_URL.',
    );
  }

  if (!existsSync(uploadsDir)) {
    console.log('Pasta local nao existe. Nada a migrar.');
    return;
  }

  const localFiles = new Set(await readdir(uploadsDir));
  console.log(`Arquivos na pasta local: ${localFiles.size}\n`);

  const s3 = new S3Client({
    region: process.env.S3_REGION ?? process.env.AWS_REGION ?? 'us-east-1',
    endpoint,
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
    credentials:
      process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
        ? {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
          }
        : undefined,
  });

  const pool = buildPool();
  const outcomes: Outcome[] = [];

  try {
    const [rows] = await pool.query<AvatarRow[]>(
      'SELECT id, username, avatarUrl FROM users WHERE avatarUrl IS NOT NULL',
    );
    console.log(`Usuarios com avatarUrl: ${rows.length}\n`);

    for (const row of rows) {
      const avatarUrl = row.avatarUrl ?? '';

      if (!avatarUrl.startsWith(UPLOADS_PREFIX)) {
        outcomes.push({
          id: row.id,
          username: row.username,
          avatarUrl,
          status: 'skipped-not-local',
          detail: 'ja nao aponta para /uploads/',
        });
        continue;
      }

      const filename = avatarUrl.slice(UPLOADS_PREFIX.length);
      const localPath = safeLocalPath(uploadsDir, avatarUrl);

      if (!localPath || !localFiles.has(filename)) {
        outcomes.push({
          id: row.id,
          username: row.username,
          avatarUrl,
          status: 'missing-file',
          detail: 'arquivo ausente na pasta local',
        });
        continue;
      }

      let buffer: Buffer;
      let kind: ImageKind;
      try {
        buffer = await readFile(localPath);
        kind = assertSafeImage(buffer);
      } catch (error) {
        outcomes.push({
          id: row.id,
          username: row.username,
          avatarUrl,
          status: 'invalid-image',
          detail: error instanceof Error ? error.message : String(error),
        });
        continue;
      }

      const key = buildKey(buffer, extname(filename) || `.${kind}`);
      const targetUrl = `${publicUrl ?? `${endpoint}/${bucket}`}/${key}`;

      if (!APPLY) {
        outcomes.push({
          id: row.id,
          username: row.username,
          avatarUrl,
          status: 'migrated',
          detail: `[dry-run] ${targetUrl}`,
        });
        continue;
      }

      try {
        await s3.send(
          new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            Body: buffer,
            ContentType: IMAGE_MIME_TYPES[kind],
            CacheControl: 'public, max-age=31536000, immutable',
            ...(process.env.S3_ACL
              ? { ACL: process.env.S3_ACL as 'public-read' }
              : {}),
          }),
        );
        await pool.execute('UPDATE users SET avatarUrl = ? WHERE id = ?', [
          targetUrl,
          row.id,
        ]);
        outcomes.push({
          id: row.id,
          username: row.username,
          avatarUrl,
          status: 'migrated',
          detail: targetUrl,
        });
      } catch (error) {
        outcomes.push({
          id: row.id,
          username: row.username,
          avatarUrl,
          status: 'failed',
          detail: error instanceof Error ? error.message : String(error),
        });
      }
    }
  } finally {
    await pool.end();
  }

  printSummary(outcomes);
}

function printSummary(outcomes: Outcome[]) {
  const counts = new Map<Status, number>();
  for (const outcome of outcomes) {
    counts.set(outcome.status, (counts.get(outcome.status) ?? 0) + 1);
  }

  console.log('\n--- Resumo ---');
  for (const [status, count] of counts) {
    console.log(`${status}: ${count}`);
  }

  const needsAttention = outcomes.filter((o) => o.status !== 'migrated');
  if (needsAttention.length > 0) {
    console.log('\n--- Requerem atencao manual ---');
    for (const outcome of needsAttention) {
      console.log(
        `[${outcome.status}] ${outcome.username} (${outcome.id}): ${outcome.detail}`,
      );
    }
    console.log(
      '\nOs arquivos locais nao existem, entao nao ha como recupera-los.nesses casos',
    );
    console.log('o unico caminho e o usuario reenviar a foto pelo perfil.');
  }

  if (!APPLY) {
    console.log('\nDry-run. Adicione --apply para executar de verdade.');
  }
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
