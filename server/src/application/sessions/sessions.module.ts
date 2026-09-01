import { Global, Module } from '@nestjs/common';
import { sessionStoreProvider } from '../../data/sessions';
import { SessionsService } from './sessions.service';

@Global()
@Module({
  providers: [sessionStoreProvider, SessionsService],
  exports: [SessionsService],
})
export class SessionsModule {}