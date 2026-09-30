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
  UseGuards,
} from '@nestjs/common';
import {
  WatchlistItem,
  WatchlistStatus,
} from '../../domain/models/watchlist-item.model';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import {
  CreateWatchlistItemDto,
  UpdateWatchlistStatusDto,
} from './dto/watchlist.dto';

@Controller('watchlist')
@UseGuards(SessionAuthGuard)
export class WatchlistController {
  constructor() {}

  @Post(':userId')
  addToWatchlist(
    @Param('userId') userId: string,
    @Body() body: CreateWatchlistItemDto,
  ): WatchlistItem {
    const item = new WatchlistItem({
      userId,
      externalAnimeId: body.externalAnimeId,
      status: body.status ?? WatchlistStatus.PLANNED,
    });

    return item;
  }

  @Get(':userId')
  getWatchlist(@Param('userId') userId: string): WatchlistItem[] {
    return [
      new WatchlistItem({
        userId,
        externalAnimeId: '1',
        status: WatchlistStatus.WATCHING,
      }),
    ];
  }

  @Patch(':userId/:animeId')
  updateStatus(
    @Param('userId') userId: string,
    @Param('animeId') animeId: string,
    @Body() body: UpdateWatchlistStatusDto,
  ): WatchlistItem {
    return new WatchlistItem({
      userId,
      externalAnimeId: animeId,
      status: body.status,
    });
  }

  @Delete(':userId/:animeId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeFromWatchlist(): void {
    return;
  }
}
