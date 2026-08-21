import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { UserAnimeActionsService, AnimeReview } from '../../use-cases/user/user-anime-actions.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('reviews')
@UseGuards(JwtAuthGuard)
export class ReviewController {
   constructor(
      private readonly userAnimeActionsService: UserAnimeActionsService,
   ) { }

   @Get('anime/:animeId')
   async getAnimeReviews(@Param('animeId') animeId: string): Promise<AnimeReview[]> {
      return this.userAnimeActionsService.getAnimeReviews(animeId);
   }
}
