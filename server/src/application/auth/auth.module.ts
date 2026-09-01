import { Module } from '@nestjs/common';
import { UserModule } from '../../use-cases/user/user.module';
import { SessionsModule } from '../sessions/sessions.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { CsrfGuard } from './csrf.guard';
import { SessionAuthGuard } from './session-auth.guard';

@Module({
  imports: [UserModule, SessionsModule],
  controllers: [AuthController],
  providers: [AuthService, SessionAuthGuard, CsrfGuard],
  exports: [AuthService, SessionAuthGuard, CsrfGuard],
})
export class AuthModule {}