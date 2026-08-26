import { Component, DestroyRef, ElementRef, computed, effect, inject, input, output, signal, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, finalize, switchMap, tap } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { AnimeService, AnimeResult, SearchOptions } from '../../../api/services/anime.service';
import { resolveAssetUrl } from '../../../api/routes/routes';
import { ProfileMenu } from '../profile-menu/profile-menu';
import { CategoryChips } from '../category-chips/category-chips';

export type NavbarTab = 'todos' | 'categorias' | 'ovas' | 'filmes' | 'personagens';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, FormsModule, ProfileMenu, CategoryChips, MatSelectModule, MatFormFieldModule],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
  host: { ngSkipHydration: 'true' },
})
export class Navbar {
  activeTab = input<NavbarTab>('todos');
  selectedCategory = input<string>('');
  searchQuery = input<string>('');
  username = input<string>('');
  userInitial = input<string>('U');
  avatarUrl = input<string | null>(null);
  showProfileMenu = input<boolean>(false);
  categories = input<string[]>([]);
  filters = input<SearchOptions>({});

  tabChange = output<NavbarTab>();
  search = output<void>();
  searchQueryChange = output<string>();
  toggleProfile = output<void>();
  closeProfile = output<void>();
  logout = output<void>();
  categorySelect = output<string>();
  filtersChange = output<SearchOptions>();

  private readonly animeService = inject(AnimeService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  localQuery = '';

  resolvedAvatarUrl = computed(() => resolveAssetUrl(this.avatarUrl()));

  suggestions = signal<AnimeResult[]>([]);
  showSuggestions = signal(false);
  isSuggesting = signal(false);
  selectedIndex = signal(-1);
  showFilters = signal(false);

  readonly tabs: { id: NavbarTab; label: string; icon: string }[] = [
    { id: 'todos', label: 'Início', icon: 'home' },
    { id: 'categorias', label: 'Explorar', icon: 'explore' },
    { id: 'ovas', label: 'OVAs', icon: 'video_library' },
    { id: 'filmes', label: 'Filmes', icon: 'movie' },
    { id: 'personagens', label: 'Personagens', icon: 'group' },
  ];

  readonly formatOptions = [
    { value: '', label: 'Todos os formatos' },
    { value: 'TV', label: 'Série (TV)' },
    { value: 'MOVIE', label: 'Filme' },
    { value: 'OVA', label: 'OVA' },
    { value: 'ONA', label: 'ONA' },
    { value: 'SPECIAL', label: 'Especial' },
  ];

  readonly statusOptions = [
    { value: '', label: 'Todos os status' },
    { value: 'RELEASING', label: 'Lançando' },
    { value: 'FINISHED', label: 'Finalizado' },
    { value: 'NOT_YET_RELEASED', label: 'Não lançado' },
  ];

  readonly sortOptions = [
    { value: '', label: 'Melhor avaliados' },
    { value: 'POPULARITY_DESC', label: 'Mais populares' },
    { value: 'TRENDING_DESC', label: 'Em alta' },
    { value: 'START_DATE_DESC', label: 'Mais recentes' },
  ];

  readonly yearOptions: number[] = Array.from(
    { length: new Date().getFullYear() - 1969 },
    (_, i) => new Date().getFullYear() - i,
  );

  private readonly suggestionsSubject = new Subject<string>();

  readonly suggestionsContainer = viewChild<ElementRef<HTMLElement>>('suggestionsList');

  constructor() {
    this.suggestionsSubject
      .pipe(
        debounceTime(250),
        distinctUntilChanged(),
        tap(() => this.isSuggesting.set(true)),
        switchMap((term) =>
          this.animeService.getSuggestions(term).pipe(
            catchError(() => of([])),
            finalize(() => this.isSuggesting.set(false)),
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((list) => {
        this.suggestions.set(list);
        this.selectedIndex.set(-1);
      });

    effect(() => {
      this.localQuery = this.searchQuery();
    });
  }

  tabClass(tab: NavbarTab): string {
    return this.activeTab() === tab
      ? 'bg-white/[0.08] text-[#f0f0f0]'
      : 'text-[rgba(200,200,200,0.65)] hover:text-[#f0f0f0] hover:bg-white/[0.05]';
  }

  onSearchInput(): void {
    this.searchQueryChange.emit(this.localQuery);

    const term = this.localQuery.trim();
    if (term.length < 2) {
      this.closeSuggestions();
      return;
    }

    this.showSuggestions.set(true);
    this.suggestionsSubject.next(term);
  }

  onSearchKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.closeSuggestions();
      return;
    }

    const list = this.suggestions();
    if (!this.showSuggestions() || list.length === 0) {
      if (event.key === 'Enter') this.onSearch();
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.selectedIndex.update((i) => Math.min(i + 1, list.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.selectedIndex.update((i) => Math.max(i - 1, 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const index = this.selectedIndex();
      if (index >= 0 && index < list.length) {
        this.selectSuggestion(list[index]);
      } else {
        this.onSearch();
      }
    }
  }

  selectSuggestion(anime: AnimeResult): void {
    this.closeSuggestions();
    this.localQuery = '';
    this.searchQueryChange.emit('');
    this.router.navigate(['/anime', anime.mal_id]);
  }

  closeSuggestions(): void {
    this.showSuggestions.set(false);
    this.selectedIndex.set(-1);
  }

  highlight(text: string, query: string): string {
    const trimmed = query.trim();
    if (!trimmed || !text) return this.escapeHtml(text);

    const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escaped})`, 'gi');
    return text.replace(regex, '<mark class="search-highlight">$1</mark>');
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  onSearch(): void {
    this.searchQueryChange.emit(this.localQuery);
    this.closeSuggestions();
    this.search.emit();
  }

  onClear(): void {
    this.localQuery = '';
    this.searchQueryChange.emit('');
    this.closeSuggestions();
    this.search.emit();
  }

  suggestionMeta(anime: AnimeResult): string {
    const parts: string[] = [];
    if (anime.year) parts.push(String(anime.year));
    if (anime.type && anime.type !== 'ANIME') parts.push(this.formatLabel(anime.type));
    if (anime.episodes) parts.push(`${anime.episodes} eps`);
    return parts.join(' · ');
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

  toggleFilters(): void {
    this.showFilters.update((v) => !v);
  }

  hasActiveFilters(): boolean {
    const f = this.filters();
    return !!(f.format || f.year || f.status || f.sort);
  }

  setFilter<K extends keyof SearchOptions>(key: K, value: string): void {
    const current = this.filters();
    const parsed = key === 'year' ? (value ? Number(value) : undefined) : value || undefined;
    this.filtersChange.emit({ ...current, [key]: parsed });
  }

  clearFilters(): void {
    this.filtersChange.emit({});
  }
}
