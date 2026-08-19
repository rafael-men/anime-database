import { Component, inject, OnInit, signal, computed, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { AnimeService, AnimeResult } from '../../../api/services/anime.service';
import { SessionService } from '../../../api/services/session.service';
import { Navbar } from '../navbar/navbar';
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
  private readonly platformId = inject(PLATFORM_ID);
  private readonly sessionService = inject(SessionService);

  searchQuery = '';
  activeTab = signal<'todos' | 'categorias'>('todos');
  selectedCategory = signal<string>('');
  animes = signal<AnimeResult[]>([]);
  isLoading = signal(false);
  errorMessage = signal('');
  currentPage = signal(1);
  hasNextPage = signal(false);
  showProfileMenu = signal(false);
  isSearching = signal(false);

  username = signal('');
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
    this.loadAnimes();
  }

  private loadUser(): void {
    const user = this.sessionService.getUser();
    this.username.set(user?.username ?? '');
  }

  loadAnimes(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');
    this.isSearching.set(false);

    this.animeService.search('', this.currentPage()).subscribe({
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

    this.animeService.search(this.searchQuery, 1).subscribe({
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

  switchTab(tab: 'todos' | 'categorias'): void {
    this.activeTab.set(tab);
    if (tab === 'todos') {
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

    this.animeService.searchByGenre(CATEGORY_GENRE_EN[category] ?? category, 1).subscribe({
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

    const request$ = category
      ? this.animeService.searchByGenre(CATEGORY_GENRE_EN[category] ?? category, this.currentPage())
      : this.animeService.search(query, this.currentPage());

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

  closeProfileMenu(): void {
    this.showProfileMenu.set(false);
  }

  logout(): void {
    this.sessionService.clearSession();
    this.router.navigate(['/login']);
  }
}