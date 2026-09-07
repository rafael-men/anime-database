import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { UsersService } from './users.service';
import type { AdultRequestStatus } from './admin.service';

@Injectable({ providedIn: 'root' })
export class PreferencesService {
  private readonly usersService = inject(UsersService);

  readonly nsfwFilter = signal(false);
  readonly adultContent = signal(false);
  readonly adultRequestStatus = signal<AdultRequestStatus>('none');
  readonly birthDate = signal<string | null>(null);

  setNsfwFilter(value: boolean): void {
    this.nsfwFilter.set(value);
  }

  setAdultContent(value: boolean): void {
    this.adultContent.set(value);
  }

  setAdultRequestStatus(value: AdultRequestStatus): void {
    this.adultRequestStatus.set(value);
    this.adultContent.set(value === 'approved');
  }

  setBirthDate(value: string | null): void {
    this.birthDate.set(value);
  }

  async saveNsfwFilter(userId: string, value: boolean): Promise<void> {
    const previous = this.nsfwFilter();
    this.nsfwFilter.set(value);
    try {
      await firstValueFrom(
        this.usersService.updateProfile(userId, { nsfwFilter: value }),
      );
    } catch (error) {
      this.nsfwFilter.set(previous);
      throw error;
    }
  }

  async saveAdultContent(
    userId: string,
    value: boolean,
    birthDate?: string,
  ): Promise<void> {
    const previousStatus = this.adultRequestStatus();
    const previousContent = this.adultContent();

    if (value) {
      this.adultRequestStatus.set('pending');
      this.adultContent.set(false);
    } else {
      this.adultRequestStatus.set('none');
      this.adultContent.set(false);
    }

    try {
      await firstValueFrom(
        this.usersService.updateProfile(userId, {
          adultContentEnabled: value,
          ...(birthDate ? { birthDate } : {}),
        }),
      );
      if (birthDate) {
        this.birthDate.set(birthDate);
      }
    } catch (error) {
      this.adultRequestStatus.set(previousStatus);
      this.adultContent.set(previousContent);
      throw error;
    }
  }
}