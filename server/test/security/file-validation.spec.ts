import { BadRequestException } from '@nestjs/common';
import {
  assertSafeImage,
  detectImageKind,
  INVALID_IMAGE_MESSAGE,
} from '../../src/utils/file-validation';

function jpegBuffer(): Buffer {
  return Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);
}

function pngBuffer(): Buffer {
  return Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
  ]);
}

function gifBuffer(): Buffer {
  return Buffer.from(
    'GIF89a\x01\x00\x01\x00\x80\x00\x00\xff\xff\xff',
    'latin1',
  );
}

function webpBuffer(): Buffer {
  return Buffer.concat([
    Buffer.from('RIFF', 'latin1'),
    Buffer.from([0x24, 0x00, 0x00, 0x00]),
    Buffer.from('WEBPVP8 ', 'latin1'),
  ]);
}

describe('detectImageKind', () => {
  it.each([
    ['jpeg', jpegBuffer()],
    ['png', pngBuffer()],
    ['gif', gifBuffer()],
    ['webp', webpBuffer()],
  ])('detecta %s pela assinatura de bytes', (kind, buffer) => {
    expect(detectImageKind(buffer)).toBe(kind);
  });

  it.each([
    'HTML',
    'script PHP',
    'script JS',
    'arquivo vazio',
    'texto',
    'SVG (XML)',
  ])('rejeita %s', (label) => {
    const buffers: Record<string, Buffer> = {
      HTML: Buffer.from('<html>'),
      'script PHP': Buffer.from('<?php echo "x"; ?>'),
      'script JS': Buffer.from('alert(1)'),
      'arquivo vazio': Buffer.alloc(0),
      texto: Buffer.from('just some text'),
      'SVG (XML)': Buffer.from('<?xml version="1.0"?>'),
    };
    expect(detectImageKind(buffers[label])).toBeNull();
  });
});

describe('assertSafeImage', () => {
  it('aceita imagem valida informando o mimetype correto', () => {
    expect(assertSafeImage(pngBuffer(), 'image/png')).toBe('png');
    expect(assertSafeImage(jpegBuffer(), 'image/jpeg')).toBe('jpeg');
    expect(assertSafeImage(gifBuffer(), 'image/gif')).toBe('gif');
    expect(assertSafeImage(webpBuffer(), 'image/webp')).toBe('webp');
  });

  it('aceita imagem valida mesmo sem mimetype declarado', () => {
    expect(assertSafeImage(jpegBuffer(), null)).toBe('jpeg');
    expect(assertSafeImage(pngBuffer(), undefined)).toBe('png');
  });

  it('rejeita conteúdo não imagem', () => {
    const html = Buffer.from('<script>alert(1)</script>');
    expect(() => assertSafeImage(html, 'image/png')).toThrow(
      BadRequestException,
    );
    expect(() => assertSafeImage(html, 'image/png')).toThrow(
      INVALID_IMAGE_MESSAGE,
    );
  });

  it('rejeita mimetype permitido que contradiz os bytes do arquivo', () => {
    expect(() => assertSafeImage(pngBuffer(), 'image/gif')).toThrow(
      BadRequestException,
    );
  });

  it('confia nos magic bytes quando o mimetype não é permitido/declarado', () => {
    expect(assertSafeImage(pngBuffer(), 'application/octet-stream')).toBe(
      'png',
    );
  });
});
