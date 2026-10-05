import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { WatchlistStatus } from '../../../domain/models/watchlist-item.model';

export class CreateWatchlistItemDto {
  @IsString()
  @IsNotEmpty()
  externalAnimeId!: string;

  @IsOptional()
  @IsEnum(WatchlistStatus)
  status?: WatchlistStatus;
}

export class UpdateWatchlistStatusDto {
  @IsEnum(WatchlistStatus)
  @IsNotEmpty()
  status!: WatchlistStatus;
}
