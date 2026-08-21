import {
   BadRequestException,
   Body,
   Controller,
   Delete,
   Get,
   HttpCode,
   HttpStatus,
   Param,
   Post,
   UploadedFile,
   UseGuards,
   UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { IsBoolean, IsDateString, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { User } from '../../domain/models/user.model';
import { WatchlistItem, WatchlistStatus } from '../../domain/models/watchlist-item.model';
import { Review } from '../../domain/models/review.model';
import { UserAnimeActionsService } from '../../use-cases/user/user-anime-actions.service';
import { UserService } from '../../use-cases/user/user.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OwnershipGuard } from '../auth/ownership.guard';
import { avatarUploadOptions } from '../../utils/file-upload';

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
}

class AddFavoriteDto {
   @IsString()
   @IsNotEmpty()
   externalAnimeId!: string;

   @IsOptional()
   @IsEnum(WatchlistStatus)
   status?: WatchlistStatus;
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
@UseGuards(JwtAuthGuard, OwnershipGuard)
export class UserController {
   constructor(
      private readonly userService: UserService,
      private readonly userAnimeActionsService: UserAnimeActionsService,
   ) { }

   @Get(':id')
   async findById(@Param('id') id: string): Promise<User> {
      return this.userService.findById(id);
   }

   @Post(':id/favorites')
   async addFavorite(
      @Param('id') userId: string,
      @Body() body: AddFavoriteDto,
   ): Promise<WatchlistItem> {
      return this.userAnimeActionsService.addAnimeToFavorites(
         userId,
         body.externalAnimeId,
         body.status ?? WatchlistStatus.WATCHING,
      );
   }

   @Delete(':id/favorites/:animeId')
   @HttpCode(HttpStatus.NO_CONTENT)
   async removeFavorite(
      @Param('id') userId: string,
      @Param('animeId') animeId: string,
   ): Promise<void> {
      await this.userAnimeActionsService.removeAnimeFromFavorites(userId, animeId);
   }

   @Get(':id/favorites')
   async getFavorites(@Param('id') userId: string): Promise<WatchlistItem[]> {
      return this.userAnimeActionsService.getUserFavorites(userId);
   }

   @Post(':id/reviews')
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
   async updateProfile(
      @Param('id') userId: string,
      @Body() body: UpdateUserDto,
   ): Promise<User> {
      return this.userService.updateProfile(userId, body);
   }

   @Post(':id/avatar')
   @UseInterceptors(FileInterceptor('file', avatarUploadOptions()))
   async uploadAvatar(
      @Param('id') userId: string,
      @UploadedFile() file?: Express.Multer.File,
   ): Promise<User> {
      if (!file) {
         throw new BadRequestException('Nenhum arquivo enviado.');
      }

      return this.userService.updateProfile(userId, {
         avatarUrl: `/uploads/${file.filename}`,
      });
   }
}
