import { BadRequestException } from '@nestjs/common';

export type ImageKind = 'jpeg' | 'png' | 'webp' | 'gif';

export const IMAGE_EXTENSIONS: Record<ImageKind, string> = {
  jpeg: '.jpg',
  png: '.png',
  webp: '.webp',
  gif: '.gif',
};

export const IMAGE_MIME_TYPES: Record<ImageKind, string> = {
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
};

export const INVALID_IMAGE_MESSAGE =
  'Formato de imagem inválido. Use JPG, PNG, WEBP ou GIF.';

const MAGIC_JPEG = [0xff, 0xd8, 0xff];
const MAGIC_PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const MAGIC_RIFF = 'RIFF';
const MAGIC_WEBP = 'WEBP';

export function detectImageKind(buffer: Buffer): ImageKind | null {
  if (!buffer || buffer.length === 0) {
    return null;
  }

  if (
    buffer.length >= MAGIC_JPEG.length &&
    MAGIC_JPEG.every((byte, index) => buffer[index] === byte)
  ) {
    return 'jpeg';
  }

  if (
    buffer.length >= MAGIC_PNG.length &&
    MAGIC_PNG.every((byte, index) => buffer[index] === byte)
  ) {
    return 'png';
  }

  if (
    buffer.length >= 12 &&
    buffer.toString('latin1', 0, 4) === MAGIC_RIFF &&
    buffer.toString('latin1', 8, 12) === MAGIC_WEBP
  ) {
    return 'webp';
  }

  if (
    buffer.length >= 6 &&
    buffer.toString('latin1', 0, 4) === 'GIF8' &&
    (buffer[4] === 0x37 || buffer[4] === 0x39) &&
    buffer[5] === 0x61
  ) {
    return 'gif';
  }

  return null;
}

export function assertSafeImage(
  buffer: Buffer,
  declaredMimetype?: string | null,
): ImageKind {
  const kind = detectImageKind(buffer);
  if (!kind) {
    throw new BadRequestException(INVALID_IMAGE_MESSAGE);
  }

  const declaredAllowed = declaredMimetype
    ? Object.values(IMAGE_MIME_TYPES).includes(declaredMimetype)
    : false;

  if (declaredAllowed && declaredMimetype !== IMAGE_MIME_TYPES[kind]) {
    throw new BadRequestException(INVALID_IMAGE_MESSAGE);
  }

  return kind;
}
