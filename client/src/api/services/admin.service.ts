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

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly http = inject(HttpClient);
  private encodedCredentials: string | null = null;

  setCredentials(email: string, password: string): void {
    this.encodedCredentials = btoa(`${email}:${password}`);
  }

  clearCredentials(): void {
    this.encodedCredentials = null;
  }

  hasCredentials(): boolean {
    return this.encodedCredentials !== null;
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
    return this.encodedCredentials
      ? new HttpHeaders({ Authorization: `Basic ${this.encodedCredentials}` })
      : new HttpHeaders();
  }
}
