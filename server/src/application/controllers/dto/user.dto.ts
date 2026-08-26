import { WatchlistStatus } from '../../../domain/models/watchlist-item.model';

export class CreateUserDto {
  username!: string;
  email!: string;
  passwordHash!: string;
  avatarUrl?: string | null;
  bio?: string | null;
}

export class UpdateUserDto {
  username?: string;
  bio?: string | null;
  avatarUrl?: string | null;
}

export class AddFavoriteDto {
  externalAnimeId!: string;
  status?: WatchlistStatus;
}

export class CreateReviewDto {
  externalAnimeId!: string;
  rating!: number;
  comment?: string | null;
  watchedAt?: Date;
  isRewatch?: boolean;
  hasSpoilers?: boolean;
}
