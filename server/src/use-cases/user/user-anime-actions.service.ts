import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review } from '../../domain/models/review.model';
import {
  WatchlistItem,
  WatchlistStatus,
} from '../../domain/models/watchlist-item.model';
import { User } from '../../domain/models/user.model';
import { ValidationException } from '../exceptions/validation.exception';
import { ResourceNotFoundException } from '../exceptions/resource-not-found.exception';

export interface AnimeReview {
  id: string;
  userId: string;
  username: string;
  avatarUrl: string | null;
  rating: number;
  comment: string | null;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class UserAnimeActionsService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(WatchlistItem)
    private readonly watchlistRepository: Repository<WatchlistItem>,
    @InjectRepository(Review)
    private readonly reviewRepository: Repository<Review>,
  ) {}

  async getAnimeReviews(externalAnimeId: string): Promise<AnimeReview[]> {
    this.validateAnimeId(externalAnimeId);

    const reviews = await this.reviewRepository.find({
      where: { externalAnimeId },
      relations: { user: true },
      order: { createdAt: 'DESC' },
    });

    return reviews.map((review) => ({
      id: review.id,
      userId: review.userId,
      username: review.user?.username ?? 'Usuário',
      avatarUrl: review.user?.avatarUrl ?? null,
      rating: Number(review.rating),
      comment: review.comment ?? null,
      createdAt: review.createdAt,
      updatedAt: review.updatedAt,
    }));
  }

  async addAnimeToFavorites(
    userId: string,
    externalAnimeId: string,
    status: WatchlistStatus = WatchlistStatus.WATCHING,
  ): Promise<WatchlistItem> {
    await this.validateUser(userId);
    this.validateAnimeId(externalAnimeId);

    const normalizedStatus = this.normalizeStatus(status);

    const existing = await this.watchlistRepository.findOne({
      where: { userId, externalAnimeId },
    });

    if (existing) {
      existing.status = normalizedStatus;
      existing.updatedAt = new Date();
      return this.watchlistRepository.save(existing);
    }

    const item = this.watchlistRepository.create({
      userId,
      externalAnimeId,
      status: normalizedStatus,
    });

    return this.watchlistRepository.save(item);
  }

  async removeAnimeFromFavorites(
    userId: string,
    externalAnimeId: string,
  ): Promise<void> {
    await this.validateUser(userId);
    this.validateAnimeId(externalAnimeId);

    const item = await this.watchlistRepository.findOne({
      where: { userId, externalAnimeId },
    });

    if (!item) {
      throw new ResourceNotFoundException(
        `Anime ${externalAnimeId} is not in the user's favorites list.`,
        'ANIME_NOT_IN_FAVORITES',
      );
    }

    await this.watchlistRepository.remove(item);
  }

  async rateAnime(
    userId: string,
    externalAnimeId: string,
    rating: number,
    options?: {
      comment?: string | null;
      watchedAt?: Date;
      isRewatch?: boolean;
      hasSpoilers?: boolean;
    },
  ): Promise<Review> {
    await this.validateUser(userId);
    this.validateAnimeId(externalAnimeId);

    const normalizedRating = Number(rating);
    if (
      !Number.isFinite(normalizedRating) ||
      normalizedRating < 0 ||
      normalizedRating > 10
    ) {
      throw new ValidationException(
        'Rating must be a number between 0 and 10.',
        'RATING_INVALID',
      );
    }

    const existing = await this.reviewRepository.findOne({
      where: { userId, externalAnimeId },
    });

    if (existing) {
      existing.rating = Number(normalizedRating.toFixed(1));
      existing.comment = options?.comment ?? existing.comment ?? null;
      existing.watchedAt = options?.watchedAt ?? existing.watchedAt;
      existing.isRewatch = options?.isRewatch ?? existing.isRewatch;
      existing.hasSpoilers = options?.hasSpoilers ?? existing.hasSpoilers;
      existing.updatedAt = new Date();

      return this.reviewRepository.save(existing);
    }

    const review = this.reviewRepository.create({
      userId,
      externalAnimeId,
      rating: Number(normalizedRating.toFixed(1)),
      comment: options?.comment ?? null,
      watchedAt: options?.watchedAt ?? new Date(),
      isRewatch: options?.isRewatch ?? false,
      hasSpoilers: options?.hasSpoilers ?? false,
    });

    return this.reviewRepository.save(review);
  }

  async addComment(
    userId: string,
    externalAnimeId: string,
    comment: string,
    options?: {
      rating?: number;
      watchedAt?: Date;
      isRewatch?: boolean;
      hasSpoilers?: boolean;
    },
  ): Promise<Review> {
    await this.validateUser(userId);
    this.validateAnimeId(externalAnimeId);

    if (!comment || !comment.trim()) {
      throw new ValidationException(
        'Comment cannot be empty.',
        'COMMENT_EMPTY',
      );
    }

    const text = comment.trim();
    if (text.length > 2000) {
      throw new ValidationException(
        'Comment cannot exceed 2000 characters.',
        'COMMENT_TOO_LONG',
      );
    }

    const existing = await this.reviewRepository.findOne({
      where: { userId, externalAnimeId },
    });

    if (existing) {
      existing.comment = text;
      if (options?.rating !== undefined) {
        existing.rating = this.normalizeRating(options.rating);
      }
      if (options?.watchedAt) {
        existing.watchedAt = options.watchedAt;
      }
      if (options?.isRewatch !== undefined) {
        existing.isRewatch = options.isRewatch;
      }
      if (options?.hasSpoilers !== undefined) {
        existing.hasSpoilers = options.hasSpoilers;
      }
      existing.updatedAt = new Date();

      return this.reviewRepository.save(existing);
    }

    return this.reviewRepository.save(
      this.reviewRepository.create({
        userId,
        externalAnimeId,
        rating:
          options?.rating !== undefined
            ? this.normalizeRating(options.rating)
            : 0,
        comment: text,
        watchedAt: options?.watchedAt ?? new Date(),
        isRewatch: options?.isRewatch ?? false,
        hasSpoilers: options?.hasSpoilers ?? false,
      }),
    );
  }

  async getUserFavorites(userId: string): Promise<WatchlistItem[]> {
    await this.validateUser(userId);

    return this.watchlistRepository.find({
      where: { userId },
      order: { addedAt: 'DESC' },
    });
  }

  async getUserReviews(userId: string): Promise<Review[]> {
    await this.validateUser(userId);

    const reviews = await this.reviewRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    for (const r of reviews) {
      r.rating = Number(r.rating);
    }

    return reviews;
  }

  private async validateUser(userId: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new ResourceNotFoundException(
        `User with id ${userId} not found.`,
        'USER_NOT_FOUND',
      );
    }
    return user;
  }

  private validateAnimeId(externalAnimeId: string): void {
    if (!externalAnimeId || !externalAnimeId.trim()) {
      throw new ValidationException(
        'Anime id is required.',
        'ANIME_ID_REQUIRED',
      );
    }
  }

  private normalizeStatus(status?: WatchlistStatus): WatchlistStatus {
    const value = status ?? WatchlistStatus.PLANNED;

    if (!Object.values(WatchlistStatus).includes(value)) {
      throw new ValidationException(
        'Invalid watchlist status.',
        'WATCHLIST_STATUS_INVALID',
      );
    }

    return value;
  }

  private normalizeRating(rating: number): number {
    const normalized = Number(rating);
    if (!Number.isFinite(normalized) || normalized < 0 || normalized > 10) {
      throw new ValidationException(
        'Rating must be a number between 0 and 10.',
        'RATING_INVALID',
      );
    }
    return Number(normalized.toFixed(1));
  }
}
