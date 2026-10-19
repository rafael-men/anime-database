import { Global, Module } from '@nestjs/common';
import { UserModule } from '../../use-cases/user/user.module';
import { AdminAuthController } from './admin.controller';
import { KeycloakService } from './keycloak.service';
import {
  AdminSessionsService,
  adminSessionStoreProvider,
} from './admin-session-service';
import { AdminGuard } from '../auth/admin.guard';

/**
 * Global pelo mesmo motivo do SessionsModule: o CsrfGuard vive no AuthModule e
 * injeta AdminSessionsService para conferir o CSRF das rotas /control. Sem
 * @Global o Nest nao acha o provider e a aplicacao nao sobe.
 *
 * Nao importa ordem de registro em AppModule: a resolucao de DI e por modulo.
 */
@Global()
@Module({
  imports: [UserModule],
  controllers: [AdminAuthController],
  providers: [
    adminSessionStoreProvider,
    AdminSessionsService,
    KeycloakService,
    AdminGuard,
  ],
  exports: [AdminSessionsService, KeycloakService, AdminGuard],
})
export class AdminModule {}