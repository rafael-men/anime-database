import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { vi } from 'vitest';
import { of, throwError } from 'rxjs';

import { AnimeService, AnimeResult } from '../../../api/services/anime.service';
import { FavoriteItem, FavoritesService } from '../../../api/services/favorites.service';
import { UsersService } from '../../../api/services/users.service';
import { FavouritesPage } from './favourites-page';

function makeAnime(malId: number, title: string): AnimeResult {
  return {
    mal_id: malId,
    title,
    images: { jpg: { image_url: `${title}.jpg`, large_image_url: `${title}-large.jpg` } },
    score: 8.5,
    genres: [{ name: 'Ação' }],
    episodes: 12,
    status: 'Finished Airing',
    year: 2010,
    synopsis: '',
    type: 'TV',
    members: 1000,
  };
}

function makeFavorite(externalAnimeId: number): FavoriteItem {
  return {
    id: `fav-${externalAnimeId}`,
    userId: 'u1',
    externalAnimeId: String(externalAnimeId),
    status: 'PLANNED',
    addedAt: new Date().toISOString(),
  };
}

describe('FavouritesPage', () => {
  let component: FavouritesPage;
  let fixture: ComponentFixture<FavouritesPage>;
  let getFavoritesMock: ReturnType<typeof vi.fn>;
  let removeFavoriteMock: ReturnType<typeof vi.fn>;
  let getByIdMock: ReturnType<typeof vi.fn>;
  let navigateSpy: ReturnType<typeof vi.spyOn>;

  const animeA = makeAnime(1, 'Cowboy Bebop');
  const animeB = makeAnime(2, 'Trigun Stub');

  function seedSession(): void {
    sessionStorage.setItem('access_token', 'token');
    sessionStorage.setItem(
      'user',
      JSON.stringify({ userId: 'u1', username: 'rafael', email: 'rafael@test.com' }),
    );
  }

  function createComponent(): void {
    fixture = TestBed.createComponent(FavouritesPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(async () => {
    getFavoritesMock = vi.fn().mockReturnValue(of([makeFavorite(1), makeFavorite(2)]));
    removeFavoriteMock = vi.fn().mockReturnValue(of(void 0));
    getByIdMock = vi.fn((id: number) => of(id === 1 ? animeA : animeB));

    await TestBed.configureTestingModule({
      imports: [FavouritesPage],
      providers: [
        provideRouter([]),
        { provide: FavoritesService, useValue: { getFavorites: getFavoritesMock, removeFavorite: removeFavoriteMock } },
        { provide: AnimeService, useValue: { getById: getByIdMock } },
        {
          provide: UsersService,
          useValue: { getProfile: vi.fn().mockReturnValue(of({ username: 'rafael', avatarUrl: null })) },
        },
      ],
    }).compileComponents();

    navigateSpy = vi.spyOn(TestBed.inject(Router), 'navigate');
    sessionStorage.clear();
  });

  it('should create and load favorites with details', () => {
    seedSession();
    createComponent();

    expect(component).toBeTruthy();
    expect(getFavoritesMock).toHaveBeenCalledWith('u1');
    expect(getByIdMock).toHaveBeenCalledTimes(2);
    expect(component.favorites().length).toBe(2);
    expect(component.isLoading()).toBe(false);
    expect(component.username()).toBe('rafael');
    expect(component.userInitial()).toBe('R');
  });

  it('should redirect to login when there is no session', () => {
    createComponent();

    expect(navigateSpy).toHaveBeenCalledWith(['/login']);
    expect(getFavoritesMock).not.toHaveBeenCalled();
  });

  it('should keep the list empty when user has no favorites', () => {
    seedSession();
    getFavoritesMock.mockReturnValue(of([]));
    createComponent();

    expect(component.favorites().length).toBe(0);
    expect(getByIdMock).not.toHaveBeenCalled();
    expect(component.isLoading()).toBe(false);
  });

  it('should drop favorites whose details fail to load', () => {
    seedSession();
    getByIdMock.mockImplementation((id: number) => (id === 2 ? throwError(() => new Error('CORS')) : of(animeA)));
    createComponent();

    expect(component.favorites().length).toBe(1);
    expect(component.favorites()[0].mal_id).toBe(1);
  });

  it('should show error state when loading favorites fails', () => {
    seedSession();
    getFavoritesMock.mockReturnValue(throwError(() => new Error('fail')));
    createComponent();

    expect(component.errorMessage()).toContain('Erro ao carregar');
    expect(component.isLoading()).toBe(false);
  });

  it('should filter favorites by search query', () => {
    seedSession();
    createComponent();

    expect(component.filteredAnimes().length).toBe(2);

    component.onSearchQueryChange('trigun');

    expect(component.isSearching()).toBe(true);
    expect(component.filteredAnimes().length).toBe(1);
    expect(component.filteredAnimes()[0].mal_id).toBe(2);

    component.onSearchQueryChange('   ');

    expect(component.filteredAnimes().length).toBe(2);
  });

  it('should remove a favorite optimistically and roll back on failure', () => {
    seedSession();
    createComponent();

    removeFavoriteMock.mockReturnValue(throwError(() => new Error('offline')));
    component.removeFavorite(1);

    expect(removeFavoriteMock).toHaveBeenCalledWith('u1', 1);
    expect(component.favorites().length).toBe(2);

    removeFavoriteMock.mockReturnValue(of(void 0));
    component.removeFavorite(1);

    expect(component.favorites().length).toBe(1);
    expect(component.favoriteIdSet().has(1)).toBe(false);
  });

  it('should navigate home and to details', () => {
    seedSession();
    createComponent();

    component.goHome();
    expect(navigateSpy).toHaveBeenCalledWith(['/home']);

    component.goToDetails(7);
    expect(navigateSpy).toHaveBeenCalledWith(['/anime', 7]);
  });
});
