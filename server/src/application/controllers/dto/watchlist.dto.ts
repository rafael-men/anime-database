import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { WatchlistStatus } from '../../../domain/models/watchlist-entry.model';

export class CreateWatchlistEntryDto {
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

export class WatchlistPaginationDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit = 20;
}