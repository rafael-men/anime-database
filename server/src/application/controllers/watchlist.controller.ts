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
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { WatchlistEntry } from '../../domain/models/watchlist-entry.model';
import * as sessionAuthGuard from '../auth/session-auth.guard';
import {
  CreateWatchlistEntryDto,
  UpdateWatchlistStatusDto,
  WatchlistPaginationDto,
} from './dto/watchlist.dto';
import {
  WatchlistPage,
  WatchlistService,
} from '../../use-cases/watchlist/watchlist.service';

@Controller('watchlist')
@UseGuards(sessionAuthGuard.SessionAuthGuard)
export class WatchlistController {
  constructor(private readonly watchlistService: WatchlistService) {}

  @Post()
  async add(
    @Req() req: sessionAuthGuard.SessionRequest,
    @Body() body: CreateWatchlistEntryDto,
  ): Promise<WatchlistEntry> {
    return this.watchlistService.add(
      this.getAuthenticatedUserId(req),
      body.externalAnimeId,
      body.status,
    );
  }

  @Get()
  async list(
    @Req() req: sessionAuthGuard.SessionRequest,
    @Query() pagination: WatchlistPaginationDto,
  ): Promise<WatchlistPage> {
    return this.watchlistService.list(
      this.getAuthenticatedUserId(req),
      pagination.page,
      pagination.limit,
    );
  }

  // atenção: declarado DEPOIS do @Get() para não ser engolido por ':animeId'
  @Get(':animeId')
  async getOne(
    @Req() req: sessionAuthGuard.SessionRequest,
    @Param('animeId') animeId: string,
  ): Promise<WatchlistEntry | null> {
    return this.watchlistService.getEntry(
      this.getAuthenticatedUserId(req),
      animeId,
    );
  }

  @Patch(':animeId')
  async updateStatus(
    @Req() req: sessionAuthGuard.SessionRequest,
    @Param('animeId') animeId: string,
    @Body() body: UpdateWatchlistStatusDto,
  ): Promise<WatchlistEntry> {
    return this.watchlistService.updateStatus(
      this.getAuthenticatedUserId(req),
      animeId,
      body.status,
    );
  }

  @Delete(':animeId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Req() req: sessionAuthGuard.SessionRequest,
    @Param('animeId') animeId: string,
  ): Promise<void> {
    await this.watchlistService.remove(
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