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
} from '@nestjs/common';
import {
   WatchlistItem,
   WatchlistStatus,
} from '../../domain/models/watchlist-item.model';
import { CreateWatchlistItemDto, UpdateWatchlistStatusDto } from './dto/watchlist.dto';

@Controller('watchlist')
export class WatchlistController {
   constructor() { }

   @Post(':userId')
   async addToWatchlist(
      @Param('userId') userId: string,
      @Body() body: CreateWatchlistItemDto,
   ): Promise<WatchlistItem> {
      const item = new WatchlistItem({
         userId,
         externalAnimeId: body.externalAnimeId,
         status: body.status ?? WatchlistStatus.PLANNED,
      });

      return item;
   }

   @Get(':userId')
   async getWatchlist(@Param('userId') userId: string): Promise<WatchlistItem[]> {
      return [
         new WatchlistItem({
            userId,
            externalAnimeId: '1',
            status: WatchlistStatus.WATCHING,
         }),
      ];
   }

   @Patch(':userId/:animeId')
   async updateStatus(
      @Param('userId') userId: string,
      @Param('animeId') animeId: string,
      @Body() body: UpdateWatchlistStatusDto,
   ): Promise<WatchlistItem> {
      return new WatchlistItem({
         userId,
         externalAnimeId: animeId,
         status: body.status,
      });
   }

   @Delete(':userId/:animeId')
   @HttpCode(HttpStatus.NO_CONTENT)
   async removeFromWatchlist(
      @Param('userId') userId: string,
      @Param('animeId') animeId: string,
   ): Promise<void> {
      return;
   }
}
