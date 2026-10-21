import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { API_ROUTES } from '../routes/routes';

export interface ConsentStatus {
  version: string;
  decided: boolean;
  necessary: true;
  analytics: boolean;
  marketing: boolean;
  decidedAt: string | null;
}

export type OptionalConsentCategory = 'analytics' | 'marketing';

export interface ConsentChoice {
  analytics: boolean;
  marketing: boolean;
}

const UNDECIDED: ConsentStatus = {
  version: '1',
  decided: false,
  necessary: true,
  analytics: false,
  marketing: false,
  decidedAt: null,
};


@Injectable({ providedIn: 'root' })
export class ConsentService {
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);

  private readonly statusSignal = signal<ConsentStatus | null>(null);
  private readonly savingSignal = signal(false);

  readonly status = this.statusSignal.asReadonly();
  readonly saving = this.savingSignal.asReadonly();
  readonly bannerVisible = computed(() => {
    const status = this.statusSignal();
    return status !== null && !status.decided;
  });

  async load(): Promise<void> {
    if (!this.isBrowser()) {
      return;
    }

    try {
      const status = await firstValueFrom(
        this.http.get<ConsentStatus>(API_ROUTES.consent.base),
      );
      this.statusSignal.set(status);
    } catch {
      // Sem resposta da API, mostra o banner: o aceite nunca e presumido.
      this.statusSignal.set(UNDECIDED);
    }
  }

  async acceptAll(): Promise<void> {
    await this.save({ analytics: true, marketing: true });
  }

  async acceptEssentialOnly(): Promise<void> {
    await this.save({ analytics: false, marketing: false });
  }

  allows(category: OptionalConsentCategory): boolean {
    return this.statusSignal()?.[category] === true;
  }

  private async save(choice: ConsentChoice): Promise<void> {
    if (!this.isBrowser()) {
      return;
    }

    this.savingSignal.set(true);

    try {
      const status = await firstValueFrom(
        this.http.post<ConsentStatus>(API_ROUTES.consent.base, choice),
      );
      this.statusSignal.set(status);
    } finally {
      this.savingSignal.set(false);
    }
  }

  private isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }
}
