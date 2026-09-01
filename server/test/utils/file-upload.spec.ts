import { generateUploadFilename } from '../../src/utils/file-upload';

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

    const malicious = ['../../etc/passwd', '..\\..\\boot.ini', 'shell.php%00.png'];
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