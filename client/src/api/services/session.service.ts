import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export interface SessionUser {
   userId: string;
   username: string;
   email: string;
   avatarUrl?: string | null;
}

@Injectable({ providedIn: 'root' })
export class SessionService {
   private readonly platformId = inject(PLATFORM_ID);

   private readonly tokenKey = 'access_token';
   private readonly userKey = 'user';

   setSession(token: string, user: SessionUser): void {
      if (!this.isBrowser()) {
         return;
      }

      sessionStorage.setItem(this.tokenKey, token);
      sessionStorage.setItem(this.userKey, JSON.stringify(user));
   }

   updateUser(partial: Partial<SessionUser>): void {
      const current = this.getUser();

      if (!current || !this.isBrowser()) {
         return;
      }

      const next: SessionUser = { ...current, ...partial };
      sessionStorage.setItem(this.userKey, JSON.stringify(next));
   }

   clearSession(): void {
      if (!this.isBrowser()) {
         return;
      }

      sessionStorage.removeItem(this.tokenKey);
      sessionStorage.removeItem(this.userKey);
   }

   getToken(): string | null {
      if (!this.isBrowser()) {
         return null;
      }

      return sessionStorage.getItem(this.tokenKey);
   }

   getUser(): SessionUser | null {
      if (!this.isBrowser()) {
         return null;
      }

      const raw = sessionStorage.getItem(this.userKey);

      if (!raw) {
         return null;
      }

      try {
         const parsed = JSON.parse(raw) as Partial<SessionUser>;

         if (!parsed.userId || !parsed.username || !parsed.email) {
            return null;
         }

         return {
            userId: parsed.userId,
            username: parsed.username,
            email: parsed.email,
            avatarUrl: parsed.avatarUrl ?? null,
         };
      } catch {
         return null;
      }
   }

   isAuthenticated(): boolean {
      const token = this.getToken();

      if (!token) {
         return false;
      }

      if (this.isTokenExpired(token)) {
         this.clearSession();
         return false;
      }

      return true;
   }

   private isTokenExpired(token: string): boolean {
      const payload = this.decodeJwtPayload(token);

      if (!payload || typeof payload.exp !== 'number') {
         return true;
      }

      const nowInSeconds = Math.floor(Date.now() / 1000);
      return payload.exp <= nowInSeconds;
   }

   private decodeJwtPayload(token: string): { exp?: number } | null {
      const parts = token.split('.');

      if (parts.length !== 3) {
         return null;
      }

      try {
         const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
         const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
         const decoded = atob(padded);
         return JSON.parse(decoded) as { exp?: number };
      } catch {
         return null;
      }
   }

   private isBrowser(): boolean {
      return isPlatformBrowser(this.platformId);
   }
}
