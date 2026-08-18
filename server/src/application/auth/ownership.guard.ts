import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';

@Injectable()
export class OwnershipGuard implements CanActivate {
   canActivate(context: ExecutionContext): boolean {
      const request = context.switchToHttp().getRequest();
      const user = request.user;

      if (!user) {
         throw new ForbiddenException('User not authenticated.');
      }

      const paramId = request.params?.id;

      if (paramId && user.sub !== paramId) {
         throw new ForbiddenException('You can only access your own account.');
      }

      return true;
   }
}
