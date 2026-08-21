import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_ROUTES } from '../routes/routes';

export interface UserProfile {
   id: string;
   username: string;
   email: string;
   avatarUrl?: string | null;
   bio?: string | null;
   createdAt: string;
   updatedAt?: string | null;
}

export interface UpdateProfilePayload {
   username?: string;
   bio?: string | null;
   avatarUrl?: string | null;
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

   getReviews(userId: string): Observable<unknown[]> {
      return this.http.get<unknown[]>(API_ROUTES.users.reviews(userId));
   }
}
