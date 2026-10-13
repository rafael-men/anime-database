import { Module } from '@nestjs/common';
import { UserModule } from '../../use-cases/user/user.module';
import { SessionsModule } from '../sessions/sessions.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { CsrfGuard } from './csrf.guard';
import { SessionAuthGuard } from './session-auth.guard';
import { MailerService } from './mailer.service';
import { PasswordResetService } from './password-reset.service';
import { passwordResetStoreProvider } from '../../data/password-reset-store';

@Module({
  imports: [UserModule, SessionsModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    SessionAuthGuard,
    CsrfGuard,
    MailerService,
    passwordResetStoreProvider,
    PasswordResetService,
  ],
  exports: [AuthService, SessionAuthGuard, CsrfGuard],
})
export class AuthModule {}
