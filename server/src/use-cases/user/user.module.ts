import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../../domain/models/user.model';
import { Review } from '../../domain/models/review.model';
import { WatchlistItem } from '../../domain/models/watchlist-item.model';
import { UserService } from './user.service';
import { UserAnimeActionsService } from './user-anime-actions.service';

@Module({
   imports: [TypeOrmModule.forFeature([User, Review, WatchlistItem])],
   providers: [UserService, UserAnimeActionsService],
   exports: [UserService],
})
export class UserModule {}
