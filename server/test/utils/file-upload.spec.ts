import {
  DEFAULT_MAX_AVATAR_SIZE_BYTES,
  HARD_MAX_AVATAR_SIZE_BYTES,
  avatarUploadOptions,
  generateUploadFilename,
  resolveMaxAvatarSizeBytes,
} from '../../src/utils/file-upload';

describe('generateUploadFilename', () => {
  it.each([
    ['image/jpeg', '.jpg'],
    ['image/png', '.png'],
    ['image/webp', '.webp'],
    ['image/gif', '.gif'],
  ])('gera nome seguro para %s', (mimetype, extension) => {
    const name = generateUploadFilename(mimetype);

    expect(name).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(\.[a-z]+)$/i,
    );
    expect(name).toMatch(new RegExp(`${extension}$`));
  });

  it('nunca inclui o nome original do arquivo enviado pelo cliente', () => {
    const name = generateUploadFilename('image/png')!;

    expect(name).not.toContain('..');
    expect(name).not.toContain('/');
    expect(name).not.toContain('\\');
    expect(name).not.toContain(' ');

    const malicious = [
      '../../etc/passwd',
      '..\\..\\boot.ini',
      'shell.php%00.png',
    ];
    for (const original of malicious) {
      expect(original).not.toEqual(name);
    }
  });

  it('rejeita mimetypes não permitidos', () => {
    expect(generateUploadFilename('application/x-php')).toBeNull();
    expect(generateUploadFilename('text/html')).toBeNull();
    expect(generateUploadFilename('')).toBeNull();
    expect(generateUploadFilename('image/svg+xml')).toBeNull();
  });
});

describe('limite de upload de avatar', () => {
  const original = process.env.MAX_AVATAR_UPLOAD_BYTES;

  afterEach(() => {
    if (original === undefined) {
      delete process.env.MAX_AVATAR_UPLOAD_BYTES;
    } else {
      process.env.MAX_AVATAR_UPLOAD_BYTES = original;
    }
  });

  it('usa 2MB por padrão', () => {
    expect(resolveMaxAvatarSizeBytes(undefined)).toBe(
      DEFAULT_MAX_AVATAR_SIZE_BYTES,
    );
    expect(avatarUploadOptions().limits.fileSize).toBe(
      DEFAULT_MAX_AVATAR_SIZE_BYTES,
    );
  });

  it('respeita um limite configurado dentro da faixa', () => {
    process.env.MAX_AVATAR_UPLOAD_BYTES = String(4 * 1024 * 1024);

    expect(resolveMaxAvatarSizeBytes()).toBe(4 * 1024 * 1024);
    expect(avatarUploadOptions().limits.fileSize).toBe(4 * 1024 * 1024);
  });

  it('nunca passa do teto absoluto', () => {
    expect(resolveMaxAvatarSizeBytes(String(500 * 1024 * 1024))).toBe(
      HARD_MAX_AVATAR_SIZE_BYTES,
    );
  });

  it.each(['abc', '0', '-10', ''])('ignora valor inválido (%s)', (value) => {
    expect(resolveMaxAvatarSizeBytes(value)).toBe(
      DEFAULT_MAX_AVATAR_SIZE_BYTES,
    );
  });
});
