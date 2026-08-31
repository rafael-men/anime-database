import { AfterViewInit, Component, ElementRef, inject, OnInit, signal, computed, PLATFORM_ID, ViewChild } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AnimeService, AnimeResult } from '../../../api/services/anime.service';
import { SessionService } from '../../../api/services/session.service';
import { FavoritesService } from '../../../api/services/favorites.service';
import { UsersService } from '../../../api/services/users.service';
import { Navbar, NavbarTab } from '../navbar/navbar';
import { AnimeCard } from '../anime-card/anime-card';
import { GroupsComponent } from '../groups-component/groups-component';

@Component({
  selector: 'app-favourites-page',
  standalone: true,
  imports: [CommonModule, Navbar, AnimeCard, GroupsComponent],
  templateUrl: './favourites-page.html',
  styleUrl: './favourites-page.css',
})
export class FavouritesPage implements OnInit, AfterViewInit {
  private readonly animeService = inject(AnimeService);
  private readonly favoritesService = inject(FavoritesService);
  private readonly sessionService = inject(SessionService);
  private readonly usersService = inject(UsersService);
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);

  favorites = signal<AnimeResult[]>([]);
  isLoading = signal(false);
  errorMessage = signal('');
  searchQuery = signal('');
  showProfileMenu = signal(false);

  canScrollPrev = signal(false);
  canScrollNext = signal(false);

  @ViewChild('carouselTrack') carouselTrack?: ElementRef<HTMLDivElement>;

  username = signal('');
  avatarUrl = signal<string | null>(null);
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
    this.avatarUrl.set(user.avatarUrl ?? null);
    this.loadFavorites(user.userId);

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
            this.scheduleScrollButtonUpdate();
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

  ngAfterViewInit(): void {
    this.scheduleScrollButtonUpdate();
  }

  onCarouselScroll(): void {
    this.updateScrollButtons();
  }

  scrollByCards(direction: number): void {
    const track = this.carouselTrack?.nativeElement;
    if (!track) return;

    const card = track.querySelector<HTMLElement>('.carousel-item');
    const step = card ? card.offsetWidth + 16 : track.clientWidth * 0.8;

    track.scrollBy({ left: direction * step, behavior: 'smooth' });
  }

  private updateScrollButtons(): void {
    const track = this.carouselTrack?.nativeElement;
    if (!track) return;

    this.canScrollPrev.set(track.scrollLeft > 4);
    this.canScrollNext.set(track.scrollLeft + track.clientWidth < track.scrollWidth - 4);
  }

  private scheduleScrollButtonUpdate(): void {
    setTimeout(() => this.updateScrollButtons(), 0);
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
    this.scheduleScrollButtonUpdate();
  }

  goHome(): void {
    this.router.navigate(['/home']);
  }

  onTabChange(tab: NavbarTab): void {
    if (tab === 'personagens') {
      this.router.navigate(['/characters']);
    } else {
      this.router.navigate(['/home']);
    }
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
