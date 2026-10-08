import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WatchlistEntry } from '../../domain/models/watchlist-entry.model';
import { ResourceNotFoundException } from '../exceptions/resource-not-found.exception';
import { ValidationException } from '../exceptions/validation.exception';

export interface WatchlistPage {
  items: WatchlistEntry[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

@Injectable()
export class WatchlistService {
  constructor(
    @InjectRepository(WatchlistEntry)
    private readonly repository: Repository<WatchlistEntry>,
  ) {}

  async add(
    userId: string,
    externalAnimeId: string,
    status = 'PLANNED',
  ): Promise<WatchlistEntry> {
    this.validateAnimeId(externalAnimeId);
    const normalized = this.normalizeStatus(status);

    const existing = await this.repository.findOne({
      where: { userId, externalAnimeId },
    });

    if (existing) {
      existing.status = normalized;
      existing.watchedAt = this.resolveWatchedAt(normalized, existing.watchedAt);
      existing.updatedAt = new Date();
      return this.repository.save(existing);
    }

    const entry = this.repository.create({
      userId,
      externalAnimeId,
      status: normalized,
      watchedAt: this.resolveWatchedAt(normalized, null),
    });

    return this.repository.save(entry);
  }

  async list(userId: string, page = 1, limit = 20): Promise<WatchlistPage> {
    const safePage = Math.max(1, Math.trunc(page));
    const safeLimit = Math.min(100, Math.max(1, Math.trunc(limit)));

    const [items, total] = await this.repository.findAndCount({
      where: { userId },
      order: { addedAt: 'DESC' },
      skip: (safePage - 1) * safeLimit,
      take: safeLimit,
    });

    return {
      items,
      pagination: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages: Math.ceil(total / safeLimit),
      },
    };
  }

  async getEntry(userId: string, animeId: string): Promise<WatchlistEntry | null> {
    return this.repository.findOne({
      where: { userId, externalAnimeId: animeId },
    });
  }

  async updateStatus(
    userId: string,
    animeId: string,
    status: string,
  ): Promise<WatchlistEntry> {
    this.validateAnimeId(animeId);

    const entry = await this.repository.findOne({
      where: { userId, externalAnimeId: animeId },
    });

    if (!entry) {
      throw new ResourceNotFoundException(
        `Anime ${animeId} is not in the watchlist.`,
        'WATCHLIST_ENTRY_NOT_FOUND',
      );
    }

    entry.status = this.normalizeStatus(status);
    entry.watchedAt = this.resolveWatchedAt(entry.status, entry.watchedAt);
    entry.updatedAt = new Date();

    return this.repository.save(entry);
  }

  async remove(userId: string, animeId: string): Promise<void> {
    this.validateAnimeId(animeId);

    const entry = await this.repository.findOne({
      where: { userId, externalAnimeId: animeId },
    });

    if (!entry) {
      throw new ResourceNotFoundException(
        `Anime ${animeId} is not in the watchlist.`,
        'WATCHLIST_ENTRY_NOT_FOUND',
      );
    }

    await this.repository.remove(entry);
  }

  private resolveWatchedAt(
    status: string,
    current: Date | null | undefined,
  ): Date | null {
    if (status !== 'COMPLETED') return null;
    return current ?? new Date();
  }

  private validateAnimeId(externalAnimeId: string): void {
    if (!externalAnimeId || !externalAnimeId.trim()) {
      throw new ValidationException('Anime id is required.', 'ANIME_ID_REQUIRED');
    }
  }

  private normalizeStatus(status?: string): string {
    return status?.trim() || 'PLANNED';
  }
}