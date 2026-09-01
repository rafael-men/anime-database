import { Component, inject, OnInit, signal, computed, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import {
  AnimeService,
  AnimeDetailsData,
} from '../../../api/services/anime.service';
import { SessionService } from '../../../api/services/session.service';
import { FavoritesService } from '../../../api/services/favorites.service';
import { UsersService } from '../../../api/services/users.service';
import { ReviewsService, AnimeReview } from '../../../api/services/reviews.service';
import { Navbar, NavbarTab } from '../navbar/navbar';
import { resolveAssetUrl } from '../../../api/routes/routes';
import { TranslatePipe } from '../../../utils/translate-pipe';

@Component({
  selector: 'app-anime-details',
  standalone: true,
  imports: [CommonModule, Navbar, TranslatePipe],
  templateUrl: './anime-details.html',
  styleUrl: './anime-details.css',
})
export class AnimeDetails implements OnInit {
  private readonly animeService = inject(AnimeService);
  private readonly favoritesService = inject(FavoritesService);
  private readonly reviewsService = inject(ReviewsService);
  private readonly sessionService = inject(SessionService);
  private readonly usersService = inject(UsersService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);

  anime = signal<AnimeDetailsData | null>(null);
  isLoading = signal(false);
  errorMessage = signal('');
  isFavorite = signal(false);
  searchQuery = signal('');
  showProfileMenu = signal(false);

  reviews = signal<AnimeReview[]>([]);
  isLoadingReviews = signal(false);
  reviewError = signal('');
  reviewRating = signal(0);
  hoverRating = signal(0);
  reviewComment = signal('');
  isSubmittingReview = signal(false);
  reviewFeedback = signal('');
  hasExistingReview = signal(false);

  username = signal('');
  avatarUrl = signal<string | null>(null);
  userInitial = computed(() => {
    const name = this.username();
    return name ? name.charAt(0).toUpperCase() : 'U';
  });

  infoItems = computed(() => {
    const a = this.anime();
    if (!a) return [];

    const items: { label: string; value: string }[] = [];
    const season = this.seasonLabel(a.season, a.seasonYear);

    if (a.startDate) items.push({ label: 'Lançamento', value: a.startDate });
    if (a.format == "TV" && a.endDate) items.push({ label: 'Término', value: a.endDate });
    if (season) items.push({ label: 'Temporada', value: season });
    if (a.format == "TV" && a.episodes) items.push({ label: 'Episódios', value: String(a.episodes) });
    if (a.duration) items.push({ label: 'Duração', value: `${a.duration} min` });
    if (a.format) items.push({ label: 'Formato', value: this.formatLabel(a.format) });
    if (a.studios.length > 0) items.push({ label: 'Estúdio', value: a.studios.join(', ') });
    if (a.popularity > 0) items.push({ label: 'Popularidade', value: this.formatNumber(a.popularity) });
    if (a.favourites > 0) items.push({ label: 'Favoritos', value: this.formatNumber(a.favourites) });

    return items;
  });

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const user = this.sessionService.getUser();
    this.username.set(user?.username ?? '');
    this.avatarUrl.set(user?.avatarUrl ?? null);
    this.loadDetails(user?.userId ?? null);

    if (!user) return;

    this.usersService.getProfile(user.userId).subscribe({
      next: (profile) => {
        this.username.set(profile.username);
        this.avatarUrl.set(profile.avatarUrl ?? null);
        this.sessionService.updateUser({
          username: profile.username,
          avatarUrl: profile.avatarUrl ?? null,
        });
      },
      error: () => {},
    });
  }

  loadDetails(userId: string | null): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    const animeId = Number(idParam);

    if (!idParam || Number.isNaN(animeId)) {
      this.errorMessage.set('Anime não encontrado.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    this.animeService.getDetails(animeId).subscribe({
      next: (details) => {
        this.anime.set(details);
        this.isLoading.set(false);

        this.loadReviews(animeId);
        if (userId) this.loadFavoriteState(userId, animeId);
      },
      error: () => {
        this.errorMessage.set('Erro ao carregar o anime. Tente novamente.');
        this.isLoading.set(false);
      },
    });
  }

  loadReviews(animeId: number): void {
    this.isLoadingReviews.set(true);
    this.reviewError.set('');

    this.reviewsService.getAnimeReviews(animeId).subscribe({
      next: (list) => {
        this.reviews.set(list);
        this.isLoadingReviews.set(false);

        const user = this.sessionService.getUser();
        const mine = user ? list.find((r) => r.userId === user.userId) : null;
        if (mine) {
          this.hasExistingReview.set(true);
          this.reviewRating.set(this.ratingToStars(mine.rating));
          this.reviewComment.set(mine.comment ?? '');
        }
      },
      error: () => {
        this.reviewError.set('Não foi possível carregar as avaliações.');
        this.isLoadingReviews.set(false);
      },
    });
  }

  setReviewRating(stars: number): void {
    this.reviewRating.set(stars);
    this.reviewFeedback.set('');
  }

  onHoverRating(stars: number): void {
    this.hoverRating.set(stars);
  }

  onReviewCommentInput(value: string): void {
    this.reviewComment.set(value);
  }

  submitReview(): void {
    const a = this.anime();
    const user = this.sessionService.getUser();
    if (!a || !user || this.isSubmittingReview()) return;

    if (this.reviewRating() === 0) {
      this.reviewFeedback.set('Selecione uma nota em estrelas.');
      return;
    }

    this.isSubmittingReview.set(true);
    this.reviewFeedback.set('');

    this.reviewsService
      .createReview(user.userId, a.mal_id, this.reviewRating() * 2, this.reviewComment())
      .subscribe({
        next: () => {
          this.isSubmittingReview.set(false);
          const wasUpdate = this.hasExistingReview();
          this.hasExistingReview.set(true);
          this.reviewFeedback.set(wasUpdate ? 'Avaliação atualizada!' : 'Avaliação enviada!');
          this.loadReviews(a.mal_id);
        },
        error: () => {
          this.isSubmittingReview.set(false);
          this.reviewFeedback.set('Erro ao enviar avaliação. Tente novamente.');
        },
      });
  }

  ratingToStars(rating: number): number {
    return Math.round(rating / 2);
  }

  resolveAvatar(path: string | null | undefined): string | null {
    return resolveAssetUrl(path);
  }

  formatReviewDate(date: string): string {
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  private loadFavoriteState(userId: string, animeId: number): void {
    this.favoritesService.getFavorites(userId).subscribe({
      next: (items) => {
        this.isFavorite.set(items.some((i) => Number(i.externalAnimeId) === animeId));
      },
      error: () => {},
    });
  }

  toggleFavorite(): void {
    const a = this.anime();
    const user = this.sessionService.getUser();
    if (!a || !user) return;

    if (this.isFavorite()) {
      this.isFavorite.set(false);
      this.favoritesService.removeFavorite(user.userId, a.mal_id).subscribe({
        error: () => this.isFavorite.set(true),
      });
    } else {
      this.isFavorite.set(true);
      this.favoritesService.addFavorite(user.userId, a.mal_id).subscribe({
        error: () => this.isFavorite.set(false),
      });
    }
  }

  retry(): void {
    const user = this.sessionService.getUser();
    this.loadDetails(user?.userId ?? null);
  }

  goBack(): void {
    this.router.navigate(['/home']);
  }

  onTabChange(tab: NavbarTab): void {
    if (tab === 'personagens') {
      this.router.navigate(['/characters']);
    } else {
      this.router.navigate(['/home']);
    }
  }

  onSearchQueryChange(query: string): void {
    this.searchQuery.set(query);
  }

  searchOnHome(): void {
    const query = this.searchQuery().trim();
    if (query) {
      this.router.navigate(['/home'], { queryParams: { q: query } });
    } else {
      this.router.navigate(['/home']);
    }
  }

  toggleProfileMenu(): void {
    this.showProfileMenu.update((v) => !v);
  }

  closeProfileMenu(): void {
    this.showProfileMenu.set(false);
  }

  logout(): void {
    this.sessionService.logout();
    this.router.navigate(['/login']);
  }

  statusLabel(status: string): string {
    const labels: Record<string, string> = {
      FINISHED: 'Finalizado',
      RELEASING: 'Em lançamento',
      NOT_YET_RELEASED: 'Não lançado',
      CANCELLED: 'Cancelado',
      HIATUS: 'Em hiato',
    };
    return labels[status] ?? status;
  }

  statusDotClass(status: string): string {
    const colors: Record<string, string> = {
      FINISHED: 'bg-gray-400',
      RELEASING: 'bg-green-400',
      NOT_YET_RELEASED: 'bg-yellow-400',
      CANCELLED: 'bg-red-400',
      HIATUS: 'bg-orange-400',
    };
    return colors[status] ?? 'bg-gray-400';
  }

  formatLabel(format: string): string {
    const labels: Record<string, string> = {
      TV: 'TV',
      TV_SHORT: 'Curta de TV',
      MOVIE: 'Filme',
      SPECIAL: 'Especial',
      OVA: 'OVA',
      ONA: 'ONA',
      MUSIC: 'Música',
    };
    return labels[format] ?? format;
  }

  seasonLabel(season: string, year: number | null): string {
    if (!season && !year) return '';
    const labels: Record<string, string> = {
      WINTER: 'Inverno',
      SPRING: 'Primavera',
      SUMMER: 'Verão',
      FALL: 'Outono',
    };
    const seasonName = labels[season] ?? '';
    return [seasonName, year].filter(Boolean).join(' ');
  }

  sourceLabel(source: string): string {
    const labels: Record<string, string> = {
      ORIGINAL: 'Original',
      MANGA: 'Mangá',
      LIGHT_NOVEL: 'Light Novel',
      NOVEL: 'Novela',
      WEB_NOVEL: 'Web Novel',
      VIDEO_GAME: 'Videogame',
      GAME: 'Jogo',
      DOUJINSHI: 'Doujinshi',
      ANIME: 'Anime',
      LIVE_ACTION: 'Live Action',
      MULTIMEDIA_PROJECT: 'Projeto Multimídia',
      PICTURE_BOOK: 'Livro Ilustrado',
      OTHER: 'Outro',
    };
    return labels[source] ?? source;
  }

  formatNumber(value: number): string {
    return value.toLocaleString('pt-BR');
  }
}
