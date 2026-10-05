import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';
import { AnimeResult, AnimeService } from '../../../../api/services/anime.service';
import {
  UserProfile,
  UserReview,
  UsersService,
} from '../../../../api/services/users.service';
import { Navbar, NavbarTab } from '../../navbar/navbar';
import { resolveAssetUrl } from '../../../../api/routes/routes';

@Component({
  selector: 'app-review-details',
  standalone: true,
  imports: [CommonModule, Navbar],
  templateUrl: './review-details.html',
  styleUrl: './review-details.css',
})
export class ReviewDetails implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly animeService = inject(AnimeService);
  private readonly usersService = inject(UsersService);
  private readonly destroyRef = inject(DestroyRef);

  review = signal<UserReview | null>(null);
  anime = signal<AnimeResult | null>(null);
  profile = signal<UserProfile | null>(null);
  isLoading = signal(true);
  errorMessage = signal('');
  searchQuery = signal('');
  showProfileMenu = signal(false);

  ngOnInit(): void {
    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        const reviewId = params.get('reviewId');
        const animeId = Number(params.get('animeId'));
        const userId = params.get('userId');

        if (!reviewId || !userId || !Number.isInteger(animeId)) {
          this.errorMessage.set('Avaliação inválida.');
          this.isLoading.set(false);
          return;
        }

        this.loadReview(reviewId, animeId, userId);
      });
  }

  private loadReview(reviewId: string, animeId: number, userId: string): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    forkJoin({
      reviews: this.usersService.getReviews(userId),
      anime: this.animeService.getById(animeId),
      profile: this.usersService.getProfile(userId),
    }).subscribe({
      next: ({ reviews, anime, profile }) => {
        const review = reviews.find((item) => item.id === reviewId);

        if (!review) {
          this.errorMessage.set('Avaliação não encontrada.');
          this.isLoading.set(false);
          return;
        }

        this.review.set(review);
        this.anime.set(anime);
        this.profile.set(profile);
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('Não foi possível carregar a avaliação.');
        this.isLoading.set(false);
      },
    });
  }

  ratingToStars(rating: number): number {
    return Math.round(rating / 2);
  }

  resolveAvatar(path: string | null | undefined): string | null {
    return resolveAssetUrl(path);
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  }

  userInitial(): string {
    const username = this.profile()?.username ?? '';
    return username ? username.charAt(0).toUpperCase() : 'U';
  }

  onTabChange(tab: NavbarTab): void {
    if (tab === 'personagens') {
      this.router.navigate(['/characters']);
      return;
    }

    this.router.navigate(['/home']);
  }

  goBack(): void {
    this.router.navigate(['/profile']);
  }

  toggleProfileMenu(): void {
    this.showProfileMenu.update((value) => !value);
  }

  closeProfileMenu(): void {
    this.showProfileMenu.set(false);
  }

  logout(): void {
    this.router.navigate(['/login']);
  }
}
