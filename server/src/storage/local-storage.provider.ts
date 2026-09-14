import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { IMAGE_EXTENSIONS } from '../utils/file-validation';
import {
  FileUploadInput,
  StorageProvider,
  StoredAvatar,
} from './storage-provider.interface';

@Injectable()
export class LocalStorageProvider implements StorageProvider {
  readonly providerName = 'local';

  constructor(private readonly uploadsDir: string) {}

  async upload(input: FileUploadInput): Promise<StoredAvatar> {
    await mkdir(this.uploadsDir, { recursive: true });

    const filename = `${randomUUID()}${IMAGE_EXTENSIONS[input.kind]}`;
    await writeFile(join(this.uploadsDir, filename), input.buffer, {
      mode: 0o644,
    });

    return { url: `/uploads/${filename}`, key: filename };
  }
}
