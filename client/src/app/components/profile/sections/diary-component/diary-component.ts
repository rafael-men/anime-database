import { AfterViewInit, Component, effect, ElementRef, inject, input, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { UserReview } from '../../../../../api/services/users.service';
import { AnimeService, AnimeResult } from '../../../../../api/services/anime.service';

const MAX_ENTRIES = 10;

interface DiaryEntry {
  review: UserReview;
  anime: AnimeResult | null;
}

@Component({
  selector: 'app-diary-component',
  imports: [CommonModule],
  templateUrl: './diary-component.html',
  styleUrl: './diary-component.css',
})
export class DiaryComponent implements AfterViewInit {
  private readonly animeService = inject(AnimeService);
  private readonly router = inject(Router);

  reviews = input.required<UserReview[]>();

  entries = signal<DiaryEntry[]>([]);
  isLoading = signal(false);

  canScrollPrev = signal(false);
  canScrollNext = signal(false);

  @ViewChild('diaryTrack') diaryTrack?: ElementRef<HTMLDivElement>;

  private fetchedIds = new Set<number>();
  private animeCache = new Map<number, AnimeResult>();

  constructor() {
    effect(() => {
      const reviews = this.reviews();
      this.loadEntries(reviews);
    });
  }

  private loadEntries(reviews: UserReview[]): void {
    if (!reviews.length) {
      this.entries.set([]);
      return;
    }

    const sorted = [...reviews]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, MAX_ENTRIES);

    const animeIds = [...new Set(sorted.map((r) => Number(r.externalAnimeId)).filter((id) => !isNaN(id)))];
    const missingIds = animeIds.filter((id) => !this.fetchedIds.has(id));

    this.fillEntries(sorted);

    if (!missingIds.length) return;

    this.isLoading.set(true);

    this.animeService.getByIds(missingIds).subscribe({
      next: (animeList) => {
        for (const a of animeList) {
          this.fetchedIds.add(a.mal_id);
          this.animeCache.set(a.mal_id, a);
        }
        this.fillEntries(sorted);
        this.isLoading.set(false);
      },
      error: () => {
        for (const id of missingIds) this.fetchedIds.add(id);
        this.isLoading.set(false);
      },
    });
  }

  private fillEntries(sorted: UserReview[]): void {
    this.entries.set(
      sorted.map((review) => ({
        review,
        anime: this.animeCache.get(Number(review.externalAnimeId)) ?? null,
      })),
    );
  }

  navigateToAnime(animeId: string): void {
    const id = Number(animeId);
    if (!isNaN(id)) this.router.navigate(['/anime', id]);
  }

  ratingToStars(rating: number): number {
    return Math.round(rating / 2);
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  ngAfterViewInit(): void {
    this.scheduleScrollButtonUpdate();
  }

  onDiaryScroll(): void {
    this.updateScrollButtons();
  }

  scrollByCards(direction: number): void {
    const track = this.diaryTrack?.nativeElement;
    if (!track) return;

    const card = track.querySelector<HTMLElement>('.diary-carousel-item');
    const step = card ? card.offsetWidth + 16 : track.clientWidth * 0.8;

    track.scrollBy({ left: direction * step, behavior: 'smooth' });
  }

  private updateScrollButtons(): void {
    const track = this.diaryTrack?.nativeElement;
    if (!track) return;

    this.canScrollPrev.set(track.scrollLeft > 4);
    this.canScrollNext.set(track.scrollLeft + track.clientWidth < track.scrollWidth - 4);
  }

  private scheduleScrollButtonUpdate(): void {
    setTimeout(() => this.updateScrollButtons(), 0);
  }
}
