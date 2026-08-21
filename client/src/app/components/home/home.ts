import { Component, inject, OnInit, signal, computed, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AnimeService, AnimeResult, SearchOptions } from '../../../api/services/anime.service';
import { SessionService } from '../../../api/services/session.service';
import { FavoritesService } from '../../../api/services/favorites.service';
import { UsersService } from '../../../api/services/users.service';
import { Navbar, NavbarTab } from '../navbar/navbar';
import { AnimeGrid } from '../anime-grid/anime-grid';
import { FormsModule } from '@angular/forms';

const CATEGORY_GENRE_EN: Record<string, string> = {
  'Ação': 'Action',
  'Aventura': 'Adventure',
  'Comédia': 'Comedy',
  'Drama': 'Drama',
  'Fantasia': 'Fantasy',
  'Horror': 'Horror',
  'Mistério': 'Mystery',
  'Romance': 'Romance',
  'Sci-Fi': 'Sci-Fi',
  'Slice of Life': 'Slice of Life',
  'Esportes': 'Sports',
  'Sobrenatural': 'Supernatural',
  'Thriller': 'Thriller',
  'Mecha': 'Mecha',
  'Música': 'Music',
};

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, Navbar, AnimeGrid],
  templateUrl: './home.html',
})
export class Home implements OnInit {
  private readonly animeService = inject(AnimeService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly sessionService = inject(SessionService);
  private readonly favoritesService = inject(FavoritesService);
  private readonly usersService = inject(UsersService);

  searchQuery = '';
  activeTab = signal<NavbarTab>('todos');
  selectedCategory = signal<string>('');
  animes = signal<AnimeResult[]>([]);
  isLoading = signal(false);
  errorMessage = signal('');
  currentPage = signal(1);
  hasNextPage = signal(false);
  showProfileMenu = signal(false);
  isSearching = signal(false);
  favoriteIds = signal<Set<number>>(new Set<number>());
  filters = signal<SearchOptions>({});

  username = signal('');
  avatarUrl = signal<string | null>(null);
  userInitial = computed(() => {
    const name = this.username();
    return name ? name.charAt(0).toUpperCase() : 'U';
  });

  categories = [
    'Ação', 'Aventura', 'Comédia', 'Drama', 'Fantasia',
    'Horror', 'Mistério', 'Romance', 'Sci-Fi', 'Slice of Life',
    'Esportes', 'Sobrenatural', 'Thriller', 'Mecha', 'Música'
  ];

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.loadUser();
    this.loadFavorites();

    const queryParam = this.route.snapshot.queryParamMap.get('q');
    if (queryParam) {
      this.searchQuery = queryParam;
      this.onSearch();
    } else {
      this.loadAnimes();
    }
  }

  private loadUser(): void {
    const user = this.sessionService.getUser();
    this.username.set(user?.username ?? '');
    this.avatarUrl.set(user?.avatarUrl ?? null);

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

  private loadFavorites(): void {
    const user = this.sessionService.getUser();
    if (!user) return;

    this.favoritesService.getFavorites(user.userId).subscribe({
      next: (items) => {
        this.favoriteIds.set(new Set(items.map((i) => Number(i.externalAnimeId))));
      },
      error: () => {},
    });
  }

  toggleFavorite(animeId: number): void {
    const user = this.sessionService.getUser();
    if (!user) return;

    if (this.favoriteIds().has(animeId)) {
      this.favoriteIds.update((ids) => {
        const next = new Set(ids);
        next.delete(animeId);
        return next;
      });
      this.favoritesService.removeFavorite(user.userId, animeId).subscribe({
        error: () => this.favoriteIds.update((ids) => new Set(ids).add(animeId)),
      });
    } else {
      this.favoriteIds.update((ids) => new Set(ids).add(animeId));
      this.favoritesService.addFavorite(user.userId, animeId).subscribe({
        error: () =>
          this.favoriteIds.update((ids) => {
            const next = new Set(ids);
            next.delete(animeId);
            return next;
          }),
      });
    }
  }

  private currentFormat(): string | undefined {
    if (this.activeTab() === 'ovas') return 'OVA';
    if (this.activeTab() === 'filmes') return 'MOVIE';
    return undefined;
  }

  private buildSearchOptions(): SearchOptions {
    const filters = this.filters();
    return { ...filters, format: filters.format ?? this.currentFormat() };
  }

  onFiltersChange(filters: SearchOptions): void {
    this.filters.set(filters);
    this.currentPage.set(1);

    if (this.searchQuery.trim()) {
      this.onSearch();
    } else {
      this.loadAnimes();
    }
  }

  loadAnimes(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');
    this.isSearching.set(false);

    this.animeService.search('', this.currentPage(), this.buildSearchOptions()).subscribe({
      next: (res) => {
        this.animes.set(res.data);
        this.hasNextPage.set(res.pagination.has_next_page);
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('Erro ao carregar animes. Tente novamente.');
        this.isLoading.set(false);
      },
    });
  }

  onSearch(): void {
    if (!this.searchQuery.trim()) {
      this.currentPage.set(1);
      this.loadAnimes();
      return;
    }

    this.currentPage.set(1);
    this.isLoading.set(true);
    this.errorMessage.set('');
    this.isSearching.set(true);

    this.animeService.search(this.searchQuery, 1, this.buildSearchOptions()).subscribe({
      next: (res) => {
        this.animes.set(res.data);
        this.hasNextPage.set(res.pagination.has_next_page);
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('Erro ao buscar animes. Tente novamente.');
        this.isLoading.set(false);
      },
    });
  }

  onSearchInput(query: string): void {
    this.searchQuery = query;
    if (!query.trim() && this.isSearching()) {
      this.isSearching.set(false);
      this.currentPage.set(1);
      this.loadAnimes();
    }
  }

  onSearchQueryChange(query: string): void {
    this.searchQuery = query;
  }

  switchTab(tab: NavbarTab): void {
    this.activeTab.set(tab);
    if (tab !== 'categorias') {
      this.selectedCategory.set('');
      this.currentPage.set(1);
      this.loadAnimes();
    }
  }

  selectCategory(category: string): void {
    this.selectedCategory.set(category);
    this.currentPage.set(1);
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.animeService
      .searchByGenre(CATEGORY_GENRE_EN[category] ?? category, 1, this.buildSearchOptions())
      .subscribe({
        next: (res) => {
          this.animes.set(res.data);
          this.hasNextPage.set(res.pagination.has_next_page);
          this.isLoading.set(false);
        },
        error: () => {
          this.errorMessage.set('Erro ao carregar animes da categoria.');
          this.isLoading.set(false);
        },
      });
  }

  loadMore(): void {
    if (this.isLoading() || !this.hasNextPage()) return;

    this.currentPage.set(this.currentPage() + 1);
    this.isLoading.set(true);

    const category = this.selectedCategory();
    const query = this.searchQuery.trim();
    const options = this.buildSearchOptions();

    const request$ = category
      ? this.animeService.searchByGenre(CATEGORY_GENRE_EN[category] ?? category, this.currentPage(), options)
      : this.animeService.search(query, this.currentPage(), options);

    request$.subscribe({
      next: (res) => {
        this.animes.update((current) => [...current, ...res.data]);
        this.hasNextPage.set(res.pagination.has_next_page);
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('Erro ao carregar mais animes.');
        this.isLoading.set(false);
        this.currentPage.set(this.currentPage() - 1);
      },
    });
  }

  toggleProfileMenu(): void {
    this.showProfileMenu.update((v) => !v);
  }

  openDetails(animeId: number): void {
    this.router.navigate(['/anime', animeId]);
  }

  closeProfileMenu(): void {
    this.showProfileMenu.set(false);
  }

  logout(): void {
    this.sessionService.clearSession();
    this.router.navigate(['/login']);
  }
}