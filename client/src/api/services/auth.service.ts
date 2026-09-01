import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_ROUTES } from '../routes/routes';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  username: string;
  email: string;
  password: string;
  avatarUrl?: string;
  bio?: string;
}

export interface AuthResponse {
  userId: string;
  username: string;
  email: string;
  avatarUrl?: string | null;
  csrfToken: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);

  login(payload: LoginPayload): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(API_ROUTES.auth.login, payload);
  }

  register(payload: RegisterPayload): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(API_ROUTES.auth.register, payload);
  }

  logout(): Observable<void> {
    return this.http.post<void>(API_ROUTES.auth.logout, {});
  }

  getSession(): Observable<AuthResponse> {
    return this.http.get<AuthResponse>(API_ROUTES.auth.session);
  }
}