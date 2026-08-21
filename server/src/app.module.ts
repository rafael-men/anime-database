import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './application/auth/auth.module';
import { GroupController } from './application/controllers/group.controller';
import { ReviewController } from './application/controllers/review.controller';
import { UserController } from './application/controllers/user.controller';
import { WatchlistController } from './application/controllers/watchlist.controller';
import { getDatabaseConfig } from './data/config/database.config';
import { Group } from './domain/models/group.model';
import { GroupItem } from './domain/models/group-item.model';
import { Review } from './domain/models/review.model';
import { User } from './domain/models/user.model';
import { WatchlistItem } from './domain/models/watchlist-item.model';
import { UserModule } from './use-cases/user/user.module';
import { UserAnimeActionsService } from './use-cases/user/user-anime-actions.service';

@Module({
   imports: [
      ConfigModule.forRoot({
         isGlobal: true,
         envFilePath: '.env',
      }),
      TypeOrmModule.forRoot(getDatabaseConfig()),
      TypeOrmModule.forFeature([User, Review, WatchlistItem, Group, GroupItem]),
      AuthModule,
      UserModule,
   ],
   controllers: [UserController, ReviewController, GroupController, WatchlistController],
   providers: [UserAnimeActionsService],
})
export class AppModule { }
