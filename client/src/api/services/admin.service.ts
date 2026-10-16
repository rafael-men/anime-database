import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_ROUTES } from '../routes/routes';

export type AdultRequestStatus = 'none' | 'pending' | 'approved' | 'denied';

export interface AdultRequest {
  id: string;
  username: string;
  email: string;
  birthDate?: string | null;
  adultRequestStatus: AdultRequestStatus;
  adultContentEnabled: boolean;
  createdAt: string;
  updatedAt?: string | null;
}

export interface AdminSession {
  username: string;
  email: string;
  roles: string[];
}

export const ADMIN_CSRF_COOKIE = 'admin_csrf';

function readCsrfCookie(): string {
  if (typeof document === 'undefined') {
    return '';
  }

  const match = document.cookie.match(
    new RegExp('(?:^|; )' + ADMIN_CSRF_COOKIE + '=([^;]*)'),
  );

  return match ? decodeURIComponent(match[1]) : '';
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly http = inject(HttpClient);

  startLogin(): void {
    this.navigate(API_ROUTES.control.users.replace(/\/users\/?$/, '/login'));
  }

  startLogout(): void {
    this.navigate(API_ROUTES.control.users.replace(/\/users\/?$/, '/logout'));
  }

  private navigate(url: string): void {
    if (typeof window === 'undefined') {
      return;
    }

    window.location.href = url;

  }

  getSession(): Observable<AdminSession> {
    const sessionRoute = API_ROUTES.control.users.replace(/\/users\/?$/, '/session');

    return this.http.get<AdminSession>(sessionRoute, {
      withCredentials: true,
    });
  }

  listRequests(): Observable<AdultRequest[]> {
    return this.http.get<AdultRequest[]>(API_ROUTES.control.users, {
      withCredentials: true,
    });
  }

  approve(userId: string): Observable<AdultRequest> {
    return this.http.post<AdultRequest>(
      API_ROUTES.control.userApprove(userId),
      {},
      {
        withCredentials: true,
        headers: this.csrfHeaders(),
      },
    );
  }

  deny(userId: string): Observable<AdultRequest> {
    return this.http.post<AdultRequest>(
      API_ROUTES.control.userDeny(userId),
      {},
      {
        withCredentials: true,
        headers: this.csrfHeaders(),
      },
    );
  }

  private csrfHeaders(): HttpHeaders {
    const token = readCsrfCookie();
    return token ? new HttpHeaders({ 'X-CSRF-Token': token }) : new HttpHeaders();
  }
}
