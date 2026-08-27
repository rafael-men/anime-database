import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { API_ROUTES } from '../routes/routes';

export interface UserProfile {
   id: string;
   username: string;
   email: string;
   avatarUrl?: string | null;
   bio?: string | null;
   favoriteCharacterIds?: number[] | null;
   createdAt: string;
   updatedAt?: string | null;
   usernameUpdatedAt?: string | null;
}

export interface UpdateProfilePayload {
   username?: string;
   bio?: string | null;
   avatarUrl?: string | null;
   favoriteCharacterIds?: number[] | null;
}

export interface UserReview {
   id: string;
   userId: string;
   externalAnimeId: string;
   rating: number;
   comment: string | null;
   watchedAt: string;
   isRewatch: boolean;
   hasSpoilers: boolean;
   createdAt: string;
   updatedAt: string;
}

@Injectable({ providedIn: 'root' })
export class UsersService {
   private readonly http = inject(HttpClient);

   getProfile(userId: string): Observable<UserProfile> {
      return this.http.get<UserProfile>(API_ROUTES.users.profile(userId));
   }

   updateProfile(userId: string, payload: UpdateProfilePayload): Observable<UserProfile> {
      return this.http.post<UserProfile>(API_ROUTES.users.updateProfile(userId), payload);
   }

   uploadAvatar(userId: string, file: File): Observable<UserProfile> {
      const formData = new FormData();
      formData.append('file', file);

      return this.http.post<UserProfile>(API_ROUTES.users.avatar(userId), formData);
   }

   getReviews(userId: string): Observable<UserReview[]> {
      return this.http.get<UserReview[]>(API_ROUTES.users.reviews(userId));
   }

   getKinCount(characterId: number): Observable<number> {
      return this.http.get<{ count: number }>(API_ROUTES.users.kinCount(characterId)).pipe(
         map((res) => res.count),
      );
   }

   checkUsername(userId: string, username: string): Observable<{ available: boolean }> {
      return this.http.get<{ available: boolean }>(API_ROUTES.users.usernameAvailability(userId), {
         params: { username },
      });
   }
}
