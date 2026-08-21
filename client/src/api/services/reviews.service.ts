import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_ROUTES } from '../routes/routes';

export interface AnimeReview {
   id: string;
   userId: string;
   username: string;
   avatarUrl: string | null;
   rating: number;
   comment: string | null;
   createdAt: string;
   updatedAt: string;
}

export interface ReviewResponse {
   id: string;
   userId: string;
   externalAnimeId: string;
   rating: number;
   comment: string | null;
}

@Injectable({ providedIn: 'root' })
export class ReviewsService {
   private readonly http = inject(HttpClient);

   getAnimeReviews(animeId: number): Observable<AnimeReview[]> {
      return this.http.get<AnimeReview[]>(API_ROUTES.reviews.byAnime(animeId));
   }

   createReview(
      userId: string,
      externalAnimeId: number,
      rating: number,
      comment?: string,
   ): Observable<ReviewResponse> {
      return this.http.post<ReviewResponse>(API_ROUTES.reviews.create(userId), {
         externalAnimeId: String(externalAnimeId),
         rating,
         ...(comment?.trim() ? { comment: comment.trim() } : {}),
      });
   }
}
