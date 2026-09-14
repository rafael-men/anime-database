import { S3StorageProvider } from '../../src/storage/s3-storage.provider';

describe('S3StorageProvider', () => {
  it('exige bucket ao ser construído', () => {
    expect(
      () =>
        new S3StorageProvider({
          bucket: '',
          region: 'us-east-1',
        }),
    ).toThrow(/S3_BUCKET/);
  });

  it('expõe url pública quando S3_PUBLIC_URL é configurado', () => {
    const provider = new S3StorageProvider({
      bucket: 'my-bucket',
      region: 'us-east-1',
      publicUrl: 'https://cdn.example.com/',
      accessKeyId: 'key',
      secretAccessKey: 'secret',
    });

    expect(provider.resolveUrl('avatars/x.png')).toBe(
      'https://cdn.example.com/avatars/x.png',
    );
  });

  it('retorna null sem url pública (acesso por URL assinada)', () => {
    const provider = new S3StorageProvider({
      bucket: 'my-bucket',
      region: 'us-east-1',
    });

    expect(provider.resolveUrl('avatars/x.png')).toBeNull();
  });
});
