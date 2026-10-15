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

  it('inclui o bucket na url pública', () => {
    const provider = new S3StorageProvider({
      bucket: 'my-bucket',
      region: 'us-east-1',
      publicUrl: 'https://cdn.example.com/',
      accessKeyId: 'key',
      secretAccessKey: 'secret',
    });

    // Sem o bucket no caminho, o acesso anônimo devolve 403 no MinIO/S3.
    expect(provider.resolveUrl('avatars/x.png')).toBe(
      'https://cdn.example.com/my-bucket/avatars/x.png',
    );
  });

  it('não duplica o bucket se S3_PUBLIC_URL já o incluir', () => {
    const provider = new S3StorageProvider({
      bucket: 'anime-uploads',
      region: 'us-east-1',
      publicUrl: 'http://localhost:9000/anime-uploads',
    });

    expect(provider.resolveUrl('avatars/x.jpg')).toBe(
      'http://localhost:9000/anime-uploads/avatars/x.jpg',
    );
  });

  it('aceita S3_PUBLIC_URL com barra final junto do bucket', () => {
    const provider = new S3StorageProvider({
      bucket: 'anime-uploads',
      region: 'us-east-1',
      publicUrl: 'http://localhost:9000/anime-uploads/',
    });

    expect(provider.resolveUrl('avatars/x.jpg')).toBe(
      'http://localhost:9000/anime-uploads/avatars/x.jpg',
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
