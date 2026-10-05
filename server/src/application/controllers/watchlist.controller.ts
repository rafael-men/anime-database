import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  WatchlistItem,
  WatchlistStatus,
} from '../../domain/models/watchlist-item.model';
import * as sessionAuthGuard from '../auth/session-auth.guard';
import {
  CreateWatchlistItemDto,
  UpdateWatchlistStatusDto,
} from './dto/watchlist.dto';
import {
  UserAnimeActionsService,
  UserFavoritesPage,
} from '../../use-cases/user/user-anime-actions.service';

@Controller('watchlist')
@UseGuards(sessionAuthGuard.SessionAuthGuard)
export class WatchlistController {
  constructor(private  readonly userAnimeActionsService: UserAnimeActionsService,) {}

  @Post()
  async addToWatchlist(
    @Req() req: sessionAuthGuard.SessionRequest,
    @Body() body: CreateWatchlistItemDto,
  ): Promise<WatchlistItem> {
    return this.userAnimeActionsService.addAnimeToFavorites(
      this.getAuthenticatedUserId(req),
      body.externalAnimeId,
      body.status,
    );
  }

   @Get()
  async getWatchlist(
    @Req() req: sessionAuthGuard.SessionRequest,
  ): Promise<UserFavoritesPage> {
    return this.userAnimeActionsService.getUserFavorites(
      this.getAuthenticatedUserId(req),
    );
  }

   @Patch(':animeId')
  async updateStatus(
    @Req() req: sessionAuthGuard.SessionRequest,
    @Param('animeId') animeId: string,
    @Body() body: UpdateWatchlistStatusDto,
  ): Promise<WatchlistItem> {
    return this.userAnimeActionsService.addAnimeToFavorites(
      this.getAuthenticatedUserId(req),
      animeId,
      body.status,
    );
  }

  @Delete(':animeId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeFromWatchlist(
    @Req() req: sessionAuthGuard.SessionRequest,
    @Param('animeId') animeId: string,
  ): Promise<void> {
    await this.userAnimeActionsService.removeAnimeFromFavorites(
      this.getAuthenticatedUserId(req),
      animeId,
    );
  }
   private getAuthenticatedUserId(req: sessionAuthGuard.SessionRequest): string {
    if (!req.user?.sub) {
      throw new Error('Usuário não autenticado.');
    }

    return req.user.sub;
  }
}
