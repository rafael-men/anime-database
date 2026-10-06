import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WatchlistEntry } from '../../domain/models/watchlist-entry.model';
import { WatchlistService } from './watchlist.service';

@Module({
  imports: [TypeOrmModule.forFeature([WatchlistEntry])],
  providers: [WatchlistService],
  exports: [WatchlistService],
})
export class WatchlistModule {}