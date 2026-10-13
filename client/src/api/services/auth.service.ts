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

  checkUsername(username: string): Observable<{ available: boolean }> {
    return this.http.get<{ available: boolean }>(API_ROUTES.auth.checkUsername, {
      params: { username },
    });
  }

  checkEmail(email: string): Observable<{ available: boolean }> {
    return this.http.get<{ available: boolean }>(API_ROUTES.auth.checkEmail, {
      params: { email },
    });
  }

  logout(): Observable<void> {
    return this.http.post<void>(API_ROUTES.auth.logout, {});
  }

  getSession(): Observable<AuthResponse> {
    return this.http.get<AuthResponse>(API_ROUTES.auth.session);
  }

  /** O backend responde igual exista ou nao o e-mail, para nao vazar quem tem conta. */
  forgotPassword(email: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(API_ROUTES.auth.forgotPassword, { email });
  }

  resetPassword(token: string, password: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(API_ROUTES.auth.resetPassword, {
      token,
      password,
    });
  }
}
