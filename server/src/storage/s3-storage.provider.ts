import { Injectable } from '@nestjs/common';
import {
  GetObjectCommand,
  ObjectCannedACL,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import { IMAGE_EXTENSIONS, IMAGE_MIME_TYPES } from '../utils/file-validation';
import {
  FileUploadInput,
  StorageProvider,
  StoredAvatar,
} from './storage-provider.interface';

export interface S3StorageConfig {
  bucket: string;
  region: string;
  endpoint?: string;
  publicUrl?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  forcePathStyle?: boolean;
  acl?: ObjectCannedACL;
  urlTtlSeconds?: number;
}

const DEFAULT_URL_TTL_SECONDS = 7 * 24 * 60 * 60;

@Injectable()
export class S3StorageProvider implements StorageProvider {
  readonly providerName = 's3';

  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly publicUrl?: string;
  private readonly acl?: ObjectCannedACL;
  private readonly urlTtlSeconds: number;

  constructor(config: S3StorageConfig) {
    if (!config.bucket) {
      throw new Error('STORAGE_DRIVER=s3 requires S3_BUCKET to be configured.');
    }

    this.bucket = config.bucket;
    this.publicUrl = config.publicUrl;
    this.acl = config.acl;
    this.urlTtlSeconds = config.urlTtlSeconds ?? DEFAULT_URL_TTL_SECONDS;
    this.client = new S3Client({
      region: config.region,
      endpoint: config.endpoint,
      forcePathStyle: config.forcePathStyle,
      credentials:
        config.accessKeyId && config.secretAccessKey
          ? {
              accessKeyId: config.accessKeyId,
              secretAccessKey: config.secretAccessKey,
            }
          : undefined,
    });
  }

  async upload(input: FileUploadInput): Promise<StoredAvatar> {
    const key = `avatars/${randomUUID()}${IMAGE_EXTENSIONS[input.kind]}`;

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: input.buffer,
        ContentType: IMAGE_MIME_TYPES[input.kind],
        CacheControl: 'public, max-age=31536000, immutable',
        ...(this.acl ? { ACL: this.acl } : {}),
      }),
    );

    const staticUrl = this.resolveUrl(key);
    const url =
      staticUrl ??
      (await getSignedUrl(
        this.client,
        new GetObjectCommand({ Bucket: this.bucket, Key: key }),
        { expiresIn: this.urlTtlSeconds },
      ));

    return { url, key };
  }

  resolveUrl(key: string): string | null {
    if (!this.publicUrl) {
      return null;
    }

    return `${this.publicUrl.replace(/\/$/, '')}/${key}`;
  }
}
