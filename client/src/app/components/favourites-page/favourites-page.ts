import { Component, inject, OnInit, signal, computed, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AnimeService, AnimeResult } from '../../../api/services/anime.service';
import { SessionService } from '../../../api/services/session.service';
import { FavoritesService } from '../../../api/services/favorites.service';
import { Navbar } from '../navbar/navbar';
import { AnimeGrid } from '../anime-grid/anime-grid';

@Component({
  selector: 'app-favourites-page',
  standalone: true,
  imports: [CommonModule, Navbar, AnimeGrid],
  templateUrl: './favourites-page.html',
  styleUrl: './favourites-page.css',
})
export class FavouritesPage implements OnInit {
  private readonly animeService = inject(AnimeService);
  private readonly favoritesService = inject(FavoritesService);
  private readonly sessionService = inject(SessionService);
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);

  favorites = signal<AnimeResult[]>([]);
  isLoading = signal(false);
  errorMessage = signal('');
  searchQuery = signal('');
  showProfileMenu = signal(false);

  username = signal('');
  userInitial = computed(() => {
    const name = this.username();
    return name ? name.charAt(0).toUpperCase() : 'U';
  });

  filteredAnimes = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    if (!query) return this.favorites();
    return this.favorites().filter((a) => a.title.toLowerCase().includes(query));
  });

  isSearching = computed(() => this.searchQuery().trim().length > 0);

  favoriteIdSet = computed(() => new Set(this.favorites().map((a) => a.mal_id)));

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const user = this.sessionService.getUser();
    if (!user) {
      this.router.navigate(['/login']);
      return;
    }

    this.username.set(user.username);
    this.loadFavorites(user.userId);
  }

  loadFavorites(userId: string): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.favoritesService.getFavorites(userId).subscribe({
      next: (items) => {
        if (items.length === 0) {
          this.favorites.set([]);
          this.isLoading.set(false);
          return;
        }

        forkJoin(
          items.map((item) =>
            this.animeService.getById(Number(item.externalAnimeId)).pipe(
              catchError(() => of(null)),
            ),
          ),
        ).subscribe({
          next: (animes) => {
            this.favorites.set(animes.filter((a): a is AnimeResult => a !== null));
            this.isLoading.set(false);
          },
          error: () => {
            this.errorMessage.set('Erro ao carregar seus favoritos. Tente novamente.');
            this.isLoading.set(false);
          },
        });
      },
      error: () => {
        this.errorMessage.set('Erro ao carregar seus favoritos. Tente novamente.');
        this.isLoading.set(false);
      },
    });
  }

  retryLoad(): void {
    const user = this.sessionService.getUser();
    if (user) this.loadFavorites(user.userId);
  }

  removeFavorite(animeId: number): void {
    const user = this.sessionService.getUser();
    if (!user) return;

    const previous = this.favorites();
    this.favorites.update((list) => list.filter((a) => a.mal_id !== animeId));

    this.favoritesService.removeFavorite(user.userId, animeId).subscribe({
      error: () => this.favorites.set(previous),
    });
  }

  onSearchQueryChange(query: string): void {
    this.searchQuery.set(query);
  }

  goHome(): void {
    this.router.navigate(['/home']);
  }

  goToDetails(animeId: number): void {
    this.router.navigate(['/anime', animeId]);
  }

  toggleProfileMenu(): void {
    this.showProfileMenu.update((v) => !v);
  }

  closeProfileMenu(): void {
    this.showProfileMenu.set(false);
  }

  logout(): void {
    this.sessionService.clearSession();
    this.router.navigate(['/login']);
  }
}
