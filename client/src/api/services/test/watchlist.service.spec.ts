import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { API_ROUTES } from '../../routes/routes';
import { WatchlistEntry, WatchlistService } from '../watchlist.service';

const entry: WatchlistEntry = {
  id: 'w1',
  userId: 'u1',
  externalAnimeId: '10',
  addedAt: '2024-01-01T00:00:00Z',
};

describe('WatchlistService', () => {
  let service: WatchlistService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(WatchlistService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('deve ser criado', () => {
    expect(service).toBeTruthy();
  });

  it('getWatchlist faz GET com paginação', () => {
    service.getWatchlist(1, 20).subscribe((res) => {
      expect(res.items).toEqual([entry]);
    });

    const req = httpMock.expectOne(
      (r) => r.url === API_ROUTES.watchlist.base && r.method === 'GET',
    );
    expect(req.request.params.get('page')).toBe('1');
    expect(req.request.params.get('limit')).toBe('20');
    req.flush({
      items: [entry],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });
  });

  it('getEntry faz GET na rota do anime e devolve null quando ausente', () => {
    service.getEntry(10).subscribe((res) => {
      expect(res).toBeNull();
    });

    const req = httpMock.expectOne(
      (r) => r.url === API_ROUTES.watchlist.byAnimeId('10') && r.method === 'GET',
    );
    req.flush(null);
  });

  it('add faz POST com externalAnimeId em string', () => {
    service.add(10).subscribe((res) => {
      expect(res).toEqual(entry);
    });

    const req = httpMock.expectOne(
      (r) => r.url === API_ROUTES.watchlist.base && r.method === 'POST',
    );
    expect(req.request.body).toEqual({ externalAnimeId: '10' });
    req.flush(entry);
  });

  it('remove faz DELETE na rota do anime', () => {
    let completed = false;
    service.remove(10).subscribe(() => (completed = true));

    const req = httpMock.expectOne(
      (r) => r.url === API_ROUTES.watchlist.byAnimeId('10') && r.method === 'DELETE',
    );
    req.flush(null);

    expect(completed).toBe(true);
  });
});