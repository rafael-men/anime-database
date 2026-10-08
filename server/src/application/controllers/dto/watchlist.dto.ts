import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateWatchlistEntryDto {
  @IsString()
  @IsNotEmpty()
  externalAnimeId!: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  status?: string;
}

export class UpdateWatchlistStatusDto {
  @IsString()
  @IsNotEmpty()
  status!: string;
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