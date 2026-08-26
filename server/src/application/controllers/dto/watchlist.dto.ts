import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { WatchlistStatus } from '../../../domain/models/watchlist-item.model';

export class CreateWatchlistItemDto {
  @IsString()
  @IsNotEmpty()
  externalAnimeId!: string;

  @IsEnum(WatchlistStatus)
  status?: WatchlistStatus;
}

export class UpdateWatchlistStatusDto {
  @IsEnum(WatchlistStatus)
  @IsNotEmpty()
  status!: WatchlistStatus;
}
