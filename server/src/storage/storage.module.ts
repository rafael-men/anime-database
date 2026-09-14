import { Global, Module } from '@nestjs/common';
import { join } from 'path';
import type { ObjectCannedACL } from '@aws-sdk/client-s3';
import { LocalStorageProvider } from './local-storage.provider';
import { S3StorageProvider } from './s3-storage.provider';
import { StorageProvider } from './storage-provider.interface';

export const STORAGE_PROVIDER = Symbol('STORAGE_PROVIDER');

@Global()
@Module({
  providers: [
    {
      provide: STORAGE_PROVIDER,
      useFactory: (): StorageProvider => {
        const driver = (process.env.STORAGE_DRIVER ?? 'local').toLowerCase();

        if (driver === 's3') {
          return new S3StorageProvider({
            bucket: process.env.S3_BUCKET ?? '',
            region:
              process.env.S3_REGION ?? process.env.AWS_REGION ?? 'us-east-1',
            endpoint: process.env.S3_ENDPOINT,
            publicUrl: process.env.S3_PUBLIC_URL,
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
            acl: process.env.S3_ACL as ObjectCannedACL | undefined,
            urlTtlSeconds: Number(process.env.S3_URL_TTL_SECONDS) || undefined,
          });
        }

        return new LocalStorageProvider(
          process.env.UPLOADS_DIR ?? join(process.cwd(), 'uploads'),
        );
      },
    },
  ],
  exports: [STORAGE_PROVIDER],
})
export class StorageModule {}
