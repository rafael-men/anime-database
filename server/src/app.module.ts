import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './application/auth/auth.module';
import { CsrfGuard } from './application/auth/csrf.guard';
import { AdminController } from './application/controllers/admin.controller';
import { GroupController } from './application/controllers/group.controller';
import { HealthController } from './application/controllers/health.controller';
import { ReviewController } from './application/controllers/review.controller';
import { UserController } from './application/controllers/user.controller';
import { WatchlistController } from './application/controllers/watchlist.controller';
import { FollowController } from './application/controllers/follow.controller';
import { SessionsModule } from './application/sessions/sessions.module';
import { getDatabaseConfig } from './data/config/database.config';
import { Follow } from './domain/models/follow.model';
import { Group } from './domain/models/group.model';
import { GroupItem } from './domain/models/group-item.model';
import { Review } from './domain/models/review.model';
import { User } from './domain/models/user.model';
import { WatchlistItem } from './domain/models/watchlist-item.model';
import { WatchlistEntry } from './domain/models/watchlist-entry.model';
import { UserModule } from './use-cases/user/user.module';
import { GroupModule } from './use-cases/group/group.module';
import { FollowModule } from './use-cases/follow/follow.module';
import { WatchlistModule } from './use-cases/watchlist/watchlist.module';
import { UserAnimeActionsService } from './use-cases/user/user-anime-actions.service';
import { StorageModule } from './storage/storage.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            ttl: 60_000,
            limit: Number(config.get('RATE_LIMIT', 100)),
          },
        ],
      }),
    }),
    TypeOrmModule.forRoot(getDatabaseConfig()),
    TypeOrmModule.forFeature([
      User,
      Review,
      WatchlistItem,
      WatchlistEntry,
      Group,
      GroupItem,
      Follow,
    ]),
    AuthModule,
    SessionsModule,
    UserModule,
    GroupModule,
    FollowModule,
    WatchlistModule,
    StorageModule,
  ],
  controllers: [
    HealthController,
    AdminController,
    UserController,
    ReviewController,
    GroupController,
    WatchlistController,
    FollowController,
  ],
  providers: [
    UserAnimeActionsService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: CsrfGuard,
    },
  ],
})
export class AppModule {}
