import { BadRequestException } from '@nestjs/common';
import { existsSync, mkdirSync } from 'fs';
import { randomUUID } from 'crypto';
import { join } from 'path';
import { memoryStorage } from 'multer';
import {
  IMAGE_EXTENSIONS,
  IMAGE_MIME_TYPES,
  ImageKind,
} from './file-validation';

export const DEFAULT_MAX_AVATAR_SIZE_BYTES = 2 * 1024 * 1024;
/** Teto absoluto para upload de avatar; acima disso so com revisao de produto. */
export const HARD_MAX_AVATAR_SIZE_BYTES = 10 * 1024 * 1024;

/**
 * Limite de upload configuravel por `MAX_AVATAR_UPLOAD_BYTES`. Valores
 * invalidos ou fora da faixa caem no default/teto, para que um erro de
 * configuracao nunca libere uploads sem limite.
 */
export function resolveMaxAvatarSizeBytes(
  raw: string | undefined = process.env.MAX_AVATAR_UPLOAD_BYTES,
): number {
  if (!raw || raw.trim() === '') {
    return DEFAULT_MAX_AVATAR_SIZE_BYTES;
  }

  const bytes = Number(raw);

  if (!Number.isFinite(bytes) || bytes < 1024) {
    return DEFAULT_MAX_AVATAR_SIZE_BYTES;
  }

  return Math.min(Math.floor(bytes), HARD_MAX_AVATAR_SIZE_BYTES);
}

const ALLOWED_MIME_EXTENSIONS: Record<string, string> = {};
for (const kind of Object.keys(IMAGE_MIME_TYPES) as ImageKind[]) {
  ALLOWED_MIME_EXTENSIONS[IMAGE_MIME_TYPES[kind]] = IMAGE_EXTENSIONS[kind];
}

export const INVALID_IMAGE_FORMAT_MESSAGE =
  'Formato de imagem inválido. Use JPG, PNG, WEBP ou GIF.';

export function resolveUploadsDir(): string {
  const uploadsDir = process.env.UPLOADS_DIR ?? join(process.cwd(), 'uploads');

  if (!existsSync(uploadsDir)) {
    mkdirSync(uploadsDir, { recursive: true });
  }

  return uploadsDir;
}

export function generateUploadFilename(mimetype: string): string | null {
  const extension = ALLOWED_MIME_EXTENSIONS[mimetype];
  if (!extension) {
    return null;
  }
  return `${randomUUID()}${extension}`;
}

export function avatarUploadOptions() {
  return {
    storage: memoryStorage(),
    fileFilter: (
      _req: unknown,
      file: { mimetype?: string },
      callback: (error: Error | null, acceptFile: boolean) => void,
    ) => {
      if (!file.mimetype || !ALLOWED_MIME_EXTENSIONS[file.mimetype]) {
        callback(new BadRequestException(INVALID_IMAGE_FORMAT_MESSAGE), false);
        return;
      }

      callback(null, true);
    },
    limits: {
      fileSize: resolveMaxAvatarSizeBytes(),
      files: 1,
    },
  };
}
