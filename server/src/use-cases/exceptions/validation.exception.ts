import { BadRequestException } from '@nestjs/common';

export class ValidationException extends BadRequestException {
   constructor(message: string, errorCode?: string) {
      super(message);
      this.errorCode = errorCode;
   }

   readonly errorCode?: string;
}
