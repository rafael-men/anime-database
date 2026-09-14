import { ImageKind } from '../utils/file-validation';

export interface StoredAvatar {
  url: string;
  key: string;
}

export interface FileUploadInput {
  buffer: Buffer;
  kind: ImageKind;
}

export interface StorageProvider {
  readonly providerName: string;
  upload(input: FileUploadInput): Promise<StoredAvatar>;
}
