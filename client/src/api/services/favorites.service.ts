import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
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

export interface FavoritesPage {
   items: FavoriteItem[];
   pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
   }
}

@Injectable({ providedIn: 'root' })
export class FavoritesService {
   private readonly http = inject(HttpClient);

   getFavorites(userId:string,page=1, limit=20): Observable<FavoritesPage> {
      return this.http.get<FavoritesPage | FavoriteItem[]>(
         API_ROUTES.users.favorites(userId), {
            params: {
               page,limit,
            }
         }
      ).pipe(
         map((response) => {
            if (Array.isArray(response)) {
               return {
                  items: response,
                  pagination: {
                     page,
                     limit,
                     total: response.length,
                     totalPages: response.length > 0 ? 1 : 0,
                  },
               };
            }

            return {
               items: Array.isArray(response.items) ? response.items : [],
               pagination: {
                  page: response.pagination?.page ?? page,
                  limit: response.pagination?.limit ?? limit,
                  total: response.pagination?.total ?? response.items?.length ?? 0,
                  totalPages: response.pagination?.totalPages ?? 0,
               },
            };
         }),
      );
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
