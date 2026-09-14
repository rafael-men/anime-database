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
   nsfwFilter?: boolean;
   birthDate?: string | null;
   adultContentEnabled?: boolean;
   adultRequestStatus?: 'none' | 'pending' | 'approved' | 'denied';
   createdAt: string;
   updatedAt?: string | null;
   usernameUpdatedAt?: string | null;
}

export interface UpdateProfilePayload {
   username?: string;
   bio?: string | null;
   avatarUrl?: string | null;
   favoriteCharacterIds?: number[] | null;
   nsfwFilter?: boolean;
   birthDate?: string;
   adultContentEnabled?: boolean;
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

export interface FollowCounts {
   followers: number;
   following: number;
}

export interface FollowUser {
   id: string;
   username: string;
   email: string;
   avatarUrl?: string | null;
   bio?: string | null;
   createdAt: string;
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

   follow(userId: string): Observable<void> {
      return this.http.post<void>(API_ROUTES.follows.follow(userId), {});
   }

   unfollow(userId: string): Observable<void> {
      return this.http.delete<void>(API_ROUTES.follows.follow(userId));
   }

   isFollowing(userId: string): Observable<boolean> {
      return this.http
         .get<{ isFollowing: boolean }>(API_ROUTES.follows.check(userId))
         .pipe(map((res) => res.isFollowing));
   }

   getFollowCounts(userId: string): Observable<FollowCounts> {
      return this.http.get<FollowCounts>(API_ROUTES.follows.counts(userId));
   }

   getFollowers(userId: string): Observable<FollowUser[]> {
      return this.http.get<FollowUser[]>(API_ROUTES.follows.followers(userId));
   }

   getFollowing(userId: string): Observable<FollowUser[]> {
      return this.http.get<FollowUser[]>(API_ROUTES.follows.following(userId));
   }
}
