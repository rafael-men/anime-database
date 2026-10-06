import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_ROUTES } from '../routes/routes';

export interface WatchlistEntry {
  id: string;
  userId: string;
  externalAnimeId: string;
  addedAt: string;
  updatedAt?: string | null;
}

export interface WatchlistPage {
  items: WatchlistEntry[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

@Injectable({ providedIn: 'root' })
export class WatchlistService {
  private readonly http = inject(HttpClient);

  getWatchlist(page = 1, limit = 50): Observable<WatchlistPage> {
    return this.http.get<WatchlistPage>(API_ROUTES.watchlist.base, {
      params: { page, limit },
    });
  }

  getEntry(animeId: number): Observable<WatchlistEntry | null> {
    return this.http.get<WatchlistEntry | null>(
      API_ROUTES.watchlist.byAnimeId(String(animeId)),
    );
  }

  add(animeId: number): Observable<WatchlistEntry> {
    return this.http.post<WatchlistEntry>(API_ROUTES.watchlist.base, {
      externalAnimeId: String(animeId),
    });
  }

  remove(animeId: number): Observable<void> {
    return this.http.delete<void>(API_ROUTES.watchlist.byAnimeId(String(animeId)));
  }
}