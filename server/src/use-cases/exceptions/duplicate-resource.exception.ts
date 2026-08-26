import { ConflictException } from '@nestjs/common';

export class DuplicateResourceException extends ConflictException {
  constructor(message: string, errorCode?: string) {
    super(message);
    this.errorCode = errorCode;
  }

  readonly errorCode?: string;
}
