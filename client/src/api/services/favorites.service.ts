import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_ROUTES } from '../routes/routes';

export type WatchlistStatus = 'PLANNED' | 'WATCHING' | 'DROPPED';

export interface FavoriteItem {
   id: string;
   userId: string;
   externalAnimeId: string;
   status: WatchlistStatus;
   addedAt: string;
   updatedAt?: string | null;
}

@Injectable({ providedIn: 'root' })
export class FavoritesService {
   private readonly http = inject(HttpClient);

   getFavorites(userId: string): Observable<FavoriteItem[]> {
      return this.http.get<FavoriteItem[]>(API_ROUTES.users.favorites(userId));
   }

   addFavorite(userId: string, externalAnimeId: number, status?: WatchlistStatus): Observable<FavoriteItem> {
      return this.http.post<FavoriteItem>(API_ROUTES.users.favorites(userId), {
         externalAnimeId: String(externalAnimeId),
         ...(status ? { status } : {}),
      });
   }

   removeFavorite(userId: string, externalAnimeId: number): Observable<void> {
      return this.http.delete<void>(API_ROUTES.users.favorite(userId, externalAnimeId));
   }
}
