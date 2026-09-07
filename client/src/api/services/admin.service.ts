import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
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

const ADMIN_CREDENTIALS_KEY = 'admin_credentials';

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);

  setCredentials(email: string, password: string): void {
    if (!isPlatformBrowser(this.platformId)) return;
    sessionStorage.setItem(
      ADMIN_CREDENTIALS_KEY,
      btoa(`${email}:${password}`),
    );
  }

  clearCredentials(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    sessionStorage.removeItem(ADMIN_CREDENTIALS_KEY);
  }

  hasCredentials(): boolean {
    if (!isPlatformBrowser(this.platformId)) return false;
    return sessionStorage.getItem(ADMIN_CREDENTIALS_KEY) !== null;
  }

  login(email: string, password: string): Observable<AdultRequest[]> {
    const encoded = btoa(`${email}:${password}`);
    return this.http.get<AdultRequest[]>(API_ROUTES.control.users, {
      headers: new HttpHeaders({ Authorization: `Basic ${encoded}` }),
    });
  }

  listRequests(): Observable<AdultRequest[]> {
    return this.http.get<AdultRequest[]>(API_ROUTES.control.users, {
      headers: this.authHeaders(),
    });
  }

  approve(userId: string): Observable<AdultRequest> {
    return this.http.post<AdultRequest>(
      API_ROUTES.control.userApprove(userId),
      {},
      { headers: this.authHeaders() },
    );
  }

  deny(userId: string): Observable<AdultRequest> {
    return this.http.post<AdultRequest>(
      API_ROUTES.control.userDeny(userId),
      {},
      { headers: this.authHeaders() },
    );
  }

  private authHeaders(): HttpHeaders {
    if (!isPlatformBrowser(this.platformId)) return new HttpHeaders();

    const encoded = sessionStorage.getItem(ADMIN_CREDENTIALS_KEY);
    return encoded
      ? new HttpHeaders({ Authorization: `Basic ${encoded}` })
      : new HttpHeaders();
  }
}