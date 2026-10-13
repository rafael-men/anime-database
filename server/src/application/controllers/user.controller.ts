import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { User } from '../../domain/models/user.model';
import { WatchlistItem } from '../../domain/models/watchlist-item.model';
import { Review } from '../../domain/models/review.model';
import { UserAnimeActionsService } from '../../use-cases/user/user-anime-actions.service';
import { UserService } from '../../use-cases/user/user.service';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import { OwnershipGuard } from '../auth/ownership.guard';
import { avatarUploadOptions } from '../../utils/file-upload';
import { assertSafeImage } from '../../utils/file-validation';
import { STORAGE_PROVIDER } from '../../storage/storage.module';
import type { StorageProvider } from '../../storage/storage-provider.interface';

class UpdateUserDto {
  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsString()
  bio?: string | null;

  @IsOptional()
  @IsString()
  avatarUrl?: string | null;

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  favoriteCharacterIds?: number[] | null;

  @IsOptional()
  @IsBoolean()
  nsfwFilter?: boolean;

  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @IsOptional()
  @IsBoolean()
  adultContentEnabled?: boolean;
}

class AddFavoriteDto {
  @IsString()
  @IsNotEmpty()
  externalAnimeId!: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  status?: string;
}

class FavoritesPaginationDto {
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

class CreateReviewDto {
  @IsString()
  @IsNotEmpty()
  externalAnimeId!: string;

  @IsNumber()
  @Min(0)
  @Max(10)
  rating!: number;

  @IsOptional()
  @IsString()
  comment?: string | null;

  @IsOptional()
  @IsDateString()
  watchedAt?: Date;

  @IsOptional()
  @IsBoolean()
  isRewatch?: boolean;

  @IsOptional()
  @IsBoolean()
  hasSpoilers?: boolean;
}

@Controller('users')
@UseGuards(SessionAuthGuard)
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly userAnimeActionsService: UserAnimeActionsService,
    @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider,
  ) {}

  @Get('kin-count/:characterId')
  async getKinCount(
    @Param('characterId') characterId: string,
  ): Promise<{ count: number }> {
    const id = Number(characterId);
    if (isNaN(id)) {
      return { count: 0 };
    }
    const count = await this.userService.getKinCount(id);
    return { count };
  }

  @Get(':id/check-username')
  async checkUsernameAvailability(
    @Param('id') userId: string,
    @Query('username') username: string,
  ): Promise<{ available: boolean }> {
    const available = await this.userService.isUsernameAvailable(
      username,
      userId,
    );
    return { available };
  }

  @Get(':id')
  async findById(@Param('id') id: string): Promise<User> {
    return this.userService.findById(id);
  }

  @Post(':id/favorites')
  @UseGuards(OwnershipGuard)
  async addFavorite(
    @Param('id') userId: string,
    @Body() body: AddFavoriteDto,
  ): Promise<WatchlistItem> {
    return this.userAnimeActionsService.addAnimeToFavorites(
      userId,
      body.externalAnimeId,
      body.status ?? 'PLANNED',
    );
  }

  @Delete(':id/favorites/:animeId')
  @UseGuards(OwnershipGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeFavorite(
    @Param('id') userId: string,
    @Param('animeId') animeId: string,
  ): Promise<void> {
    await this.userAnimeActionsService.removeAnimeFromFavorites(
      userId,
      animeId,
    );
  }

  @Get(':id/favorites')
  @UseGuards(OwnershipGuard)
  async getFavorites(
    @Param('id') userId: string,
    @Query() pagination: FavoritesPaginationDto,
  ) {
    return this.userAnimeActionsService.getUserFavorites(
      userId,
      pagination.page,
      pagination.limit,
    );
  }

  @Post(':id/reviews')
  @UseGuards(OwnershipGuard)
  async createReview(
    @Param('id') userId: string,
    @Body() body: CreateReviewDto,
  ): Promise<Review> {
    return this.userAnimeActionsService.rateAnime(
      userId,
      body.externalAnimeId,
      body.rating,
      {
        comment: body.comment,
        watchedAt: body.watchedAt,
        isRewatch: body.isRewatch,
        hasSpoilers: body.hasSpoilers,
      },
    );
  }

  @Get(':id/reviews')
  async getReviews(@Param('id') userId: string): Promise<Review[]> {
    return this.userAnimeActionsService.getUserReviews(userId);
  }

  @Post(':id/profile')
  @UseGuards(OwnershipGuard)
  async updateProfile(
    @Param('id') userId: string,
    @Body() body: UpdateUserDto,
  ): Promise<User> {
    return this.userService.updateProfile(userId, body);
  }

  @Post(':id/avatar')
  @UseGuards(OwnershipGuard)
  @UseInterceptors(FileInterceptor('file', avatarUploadOptions()))
  async uploadAvatar(
    @Param('id') userId: string,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<User> {
    if (!file) {
      throw new BadRequestException('Nenhum arquivo enviado.');
    }

    const kind = assertSafeImage(file.buffer, file.mimetype);
    const stored = await this.storage.upload({
      buffer: file.buffer,
      kind,
    });

    return this.userService.updateProfile(userId, {
      avatarUrl: stored.url,
    });
  }
}
