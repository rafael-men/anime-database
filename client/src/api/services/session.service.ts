import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { AuthService } from './auth.service';

export interface SessionUser {
  userId: string;
  username: string;
  email: string;
  avatarUrl?: string | null;
}

const USER_STORAGE_KEY = 'user';
const CSRF_STORAGE_KEY = 'csrf_token';

@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly authService = inject(AuthService);

  setSession(user: SessionUser): void {
    this.setUser(user);
  }

  setUser(user: SessionUser): void {
    if (!this.isBrowser()) {
      return;
    }

    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  }

  updateUser(partial: Partial<SessionUser>): void {
    const current = this.getUser();

    if (!current || !this.isBrowser()) {
      return;
    }

    const next: SessionUser = { ...current, ...partial };
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(next));
  }

  clearSession(): void {
    if (!this.isBrowser()) {
      return;
    }

    localStorage.removeItem(USER_STORAGE_KEY);
    sessionStorage.removeItem(CSRF_STORAGE_KEY);
  }

  getUser(): SessionUser | null {
    if (!this.isBrowser()) {
      return null;
    }

    const raw = localStorage.getItem(USER_STORAGE_KEY);

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

  setCsrfToken(token: string): void {
    if (!this.isBrowser()) {
      return;
    }

    sessionStorage.setItem(CSRF_STORAGE_KEY, token);
  }

  getCsrfToken(): string | null {
    if (!this.isBrowser()) {
      return null;
    }

    return sessionStorage.getItem(CSRF_STORAGE_KEY);
  }

  isAuthenticated(): boolean {
    return this.getUser() !== null;
  }

  async restoreSession(): Promise<boolean> {
    if (!this.isBrowser()) {
      return false;
    }

    try {
      const res = await firstValueFrom(this.authService.getSession());

      this.setUser({
        userId: res.userId,
        username: res.username,
        email: res.email,
        avatarUrl: res.avatarUrl ?? null,
      });
      this.setCsrfToken(res.csrfToken);

      return true;
    } catch {
      this.clearSession();
      return false;
    }
  }

  logout(): void {
    if (this.isBrowser()) {
      this.authService.logout().subscribe({ error: () => undefined });
    }

    this.clearSession();
  }

  private isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }
}