import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { API_ROUTES } from '../../routes/routes';
import { FavoriteItem, FavoritesService } from '../favorites.service';

const favorite: FavoriteItem = {
  id: 'f1',
  userId: 'u1',
  externalAnimeId: '1',
  status: 'PLANNED',
  addedAt: '2024-01-01T00:00:00Z',
};

describe('FavoritesService', () => {
  let service: FavoritesService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(FavoritesService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('deve ser criado', () => {
    expect(service).toBeTruthy();
  });

  it('getFavorites faz GET na rota de favoritos do usuário', () => {
    service.getFavorites('u1').subscribe((res) => {
      expect(res).toEqual([favorite]);
    });

    const req = httpMock.expectOne(API_ROUTES.users.favorites('u1'));
    expect(req.request.method).toBe('GET');
    req.flush([favorite]);
  });

  it('addFavorite faz POST com externalAnimeId em string e status', () => {
    service.addFavorite('u1', 10, 'WATCHING').subscribe((res) => {
      expect(res).toEqual(favorite);
    });

    const req = httpMock.expectOne(API_ROUTES.users.favorites('u1'));
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ externalAnimeId: '10', status: 'WATCHING' });
    req.flush(favorite);
  });

  it('addFavorite omite o status quando não informado', () => {
    service.addFavorite('u1', 10).subscribe();

    const req = httpMock.expectOne(API_ROUTES.users.favorites('u1'));
    expect(req.request.body).toEqual({ externalAnimeId: '10' });
    req.flush(favorite);
  });

  it('removeFavorite faz DELETE na rota do favorito específico', () => {
    let completed = false;
    service.removeFavorite('u1', 10).subscribe(() => (completed = true));

    const req = httpMock.expectOne(API_ROUTES.users.favorite('u1', 10));
    expect(req.request.method).toBe('DELETE');
    req.flush(null);

    expect(completed).toBe(true);
  });
});