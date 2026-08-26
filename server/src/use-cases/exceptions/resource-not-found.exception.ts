import { NotFoundException } from '@nestjs/common';

export class ResourceNotFoundException extends NotFoundException {
  constructor(message: string, errorCode?: string) {
    super(message);
    this.errorCode = errorCode;
  }

  readonly errorCode?: string;
}
