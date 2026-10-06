import {
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import {
  WatchlistEntry,
  WatchlistService,
} from '../../../../api/services/watchlist.service';
import { UsersService, UserReview } from '../../../../api/services/users.service';
import { ReviewsService } from '../../../../api/services/reviews.service';
import { AnimeService, AnimeResult } from '../../../../api/services/anime.service';
import { SessionService } from '../../../../api/services/session.service';
import { ToastService } from '../../../services/toast.service';

export interface WatchlistRow {
  entry: WatchlistEntry;
  anime: AnimeResult | null;
  stars: number;
  comment: string | null;
}

type Filter = 'ALL';

@Component({
  selector: 'app-watchlist-section',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './watchlist-section.html',
  styleUrl: './watchlist-section.css',
})
export class WatchlistSection implements OnInit {
  private readonly watchlistService = inject(WatchlistService);
  private readonly usersService = inject(UsersService);
  private readonly reviewsService = inject(ReviewsService);
  private readonly animeService = inject(AnimeService);
  private readonly sessionService = inject(SessionService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  rows = signal<WatchlistRow[]>([]);
  isLoading = signal(true);
  errorMessage = signal('');

  editingId = signal<string | null>(null);
  draftStars = signal(0);
  hoverStars = signal(0);
  draftComment = signal('');
  isSaving = signal(false);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    const user = this.sessionService.getUser();
    if (!user) return;

    this.isLoading.set(true);
    this.errorMessage.set('');

    forkJoin({
      watchlist: this.watchlistService.getWatchlist(1, 50),
      reviews: this.usersService
        .getReviews(user.userId)
        .pipe(catchError(() => of([] as UserReview[]))),
    }).subscribe({
      next: ({ watchlist, reviews }) => {
        const items = watchlist.items;
        if (items.length === 0) {
          this.rows.set([]);
          this.isLoading.set(false);
          return;
        }

        const reviewByAnime = new Map<number, UserReview>();
        for (const review of reviews) {
          reviewByAnime.set(Number(review.externalAnimeId), review);
        }

        const ids = items
          .map((item) => Number(item.externalAnimeId))
          .filter((id) => !Number.isNaN(id));

        this.animeService
          .getByIds(ids)
          .pipe(catchError(() => of([] as AnimeResult[])))
          .subscribe((animes) => {
            const animeById = new Map<number, AnimeResult>(animes.map((a) => [a.mal_id, a]));

            this.rows.set(
              items.map((entry) => {
                const numericId = Number(entry.externalAnimeId);
                const review = reviewByAnime.get(numericId);
                return {
                  entry,
                  anime: animeById.get(numericId) ?? null,
                  stars: Math.round((review?.rating ?? 0) / 2),
                  comment: review?.comment ?? null,
                };
              }),
            );

            this.isLoading.set(false);
          });
      },
      error: () => {
        this.errorMessage.set('Erro ao carregar sua watchlist. Tente novamente.');
        this.isLoading.set(false);
      },
    });
  }

  retryLoad(): void {
    this.load();
  }

  setFilter(filter: Filter): void {
    // noop
  }

  // sem status/filter por enquanto

  posterUrl(anime: AnimeResult | null): string | null {
    return anime?.images.jpg.large_image_url || anime?.images.jpg.image_url || null;
  }

  // sem trocar status, só avaliar/remover

  setRating(row: WatchlistRow, stars: number): void {
    const user = this.sessionService.getUser();
    if (!user || stars < 1) return;

    const animeId = Number(row.entry.externalAnimeId);
    this.reviewsService
      .createReview(user.userId, animeId, stars * 2, row.comment ?? undefined)
      .subscribe({
        next: () => {
          this.patchRow(row, { ...row, stars } as any);
          this.toast.success('Avaliação salva!');
        },
        error: () => this.toast.error('Não foi possível salvar a avaliação.'),
      });
  }

  openEdit(row: WatchlistRow): void {
    this.editingId.set(row.entry.id);
    this.draftStars.set(row.stars);
    this.hoverStars.set(0);
    this.draftComment.set(row.comment ?? '');
    this.isSaving.set(false);
  }

  closeEdit(): void {
    this.editingId.set(null);
  }

  saveEdit(row: WatchlistRow): void {
    const user = this.sessionService.getUser();
    if (!user || this.isSaving()) return;

    this.isSaving.set(true);
    const animeId = Number(row.entry.externalAnimeId);
    const stars = this.draftStars();

    if (stars > 0) {
      this.reviewsService
        .createReview(
          user.userId,
          animeId,
          stars * 2,
          this.draftComment().trim() || undefined,
        )
        .subscribe({
          next: () => {
            this.rows.update((rows) =>
              rows.map((r) =>
                r.entry.id === row.entry.id
                  ? {
                      ...r,
                      stars,
                      comment: this.draftComment().trim() || null,
                    } as WatchlistRow
                  : r,
              ),
            );
            this.isSaving.set(false);
            this.closeEdit();
            this.toast.success('Avaliação salva.');
          },
          error: () => {
            this.isSaving.set(false);
            this.toast.error('Não foi possível salvar a avaliação.');
          },
        });
      return;
    }

    this.isSaving.set(false);
    this.closeEdit();
  }

  remove(row: WatchlistRow): void {
    const title = row.anime?.title ?? 'este anime';
    if (!window.confirm(`Remover "${title}" da sua watchlist?`)) return;

    const previous = this.rows();
    this.rows.update((rows) => rows.filter((r) => r.entry.id !== row.entry.id));

    this.watchlistService.remove(Number(row.entry.externalAnimeId)).subscribe({
      next: () => this.toast.success('Removido da watchlist.'),
      error: () => {
        this.rows.set(previous);
        this.toast.error('Não foi possível remover o anime.');
      },
    });
  }

  goToDetails(animeId: number): void {
    this.router.navigate(['/anime', animeId]);
  }

  private patchRow(row: WatchlistRow, entry: WatchlistEntry): void {
    this.rows.update((rows) =>
      rows.map((r) => (r.entry.id === row.entry.id ? { ...r, entry } : r)),
    );
  }
}