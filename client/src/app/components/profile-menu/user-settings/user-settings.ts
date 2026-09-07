import { Component, computed, inject, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SessionService } from '../../../../api/services/session.service';
import { PreferencesService } from '../../../../api/services/preferences.service';
import { UsersService } from '../../../../api/services/users.service';
import type { AdultRequestStatus } from '../../../../api/services/admin.service';
import { Navbar, NavbarTab } from '../../navbar/navbar';

@Component({
  selector: 'app-user-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, Navbar],
  templateUrl: './user-settings.html',
  styleUrl: './user-settings.css',
})
export class UserSettings implements OnInit {
  private readonly sessionService = inject(SessionService);
  private readonly usersService = inject(UsersService);
  private readonly preferencesService = inject(PreferencesService);
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);

  readonly todayIso = new Date().toISOString().slice(0, 10);

  readonly excludedCategories = [
    'Ecchi',
    'Ero Guro',
    'Horror',
    'Drugs',
    'Torture',
  ];

  isLoading = signal(true);
  errorMessage = signal('');
  nsfwFilter = signal(false);
  isSaving = signal(false);
  saveError = signal('');

  adultStatus = signal<AdultRequestStatus>('none');
  adultContent = signal(false);
  birthDate = signal<string | null>(null);
  adultGateOpen = signal(false);
  newBirthDate = signal('');
  adultSaving = signal(false);
  adultSaveError = signal('');
  adultSuccess = signal('');

  formattedBirthDate = computed(() => {
    const date = this.birthDate();
    if (!date) return null;
    const [year, month, day] = date.split('-');
    if (!year || !month || !day) return date;
    return `${day}/${month}/${year}`;
  });

  searchQuery = signal('');
  showProfileMenu = signal(false);

  username = signal('');
  avatarUrl = signal<string | null>(null);
  userInitial = computed(() => {
    const name = this.username();
    return name ? name.charAt(0).toUpperCase() : 'U';
  });

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const user = this.sessionService.getUser();
    if (!user) {
      this.router.navigate(['/login']);
      return;
    }

    this.loadSettings(user.userId);
  }

  private loadSettings(userId: string): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.usersService.getProfile(userId).subscribe({
      next: (profile) => {
        this.username.set(profile.username);
        this.avatarUrl.set(profile.avatarUrl ?? null);
        this.nsfwFilter.set(!!profile.nsfwFilter);
        this.preferencesService.setNsfwFilter(!!profile.nsfwFilter);
        this.adultStatus.set(profile.adultRequestStatus ?? 'none');
        this.adultContent.set(profile.adultRequestStatus === 'approved');
        this.birthDate.set(profile.birthDate ?? null);
        this.preferencesService.setAdultRequestStatus(profile.adultRequestStatus ?? 'none');
        this.preferencesService.setBirthDate(profile.birthDate ?? null);
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('Erro ao carregar suas preferências. Tente novamente.');
        this.isLoading.set(false);
      },
    });
  }

  retryLoad(): void {
    const user = this.sessionService.getUser();
    if (user) this.loadSettings(user.userId);
  }

  async toggleNsfwFilter(): Promise<void> {
    const user = this.sessionService.getUser();
    if (!user || this.isSaving()) return;

    const next = !this.nsfwFilter();
    const previous = this.nsfwFilter();

    this.nsfwFilter.set(next);
    this.saveError.set('');
    this.isSaving.set(true);

    try {
      await this.preferencesService.saveNsfwFilter(user.userId, next);
    } catch {
      this.nsfwFilter.set(previous);
      this.saveError.set('Erro ao salvar. Tente novamente.');
    } finally {
      this.isSaving.set(false);
    }
  }

  async toggleAdultContent(): Promise<void> {
    const user = this.sessionService.getUser();
    if (!user || this.adultSaving()) return;

    const status = this.adultStatus();

    if (status === 'approved') {
      await this.disableAdultContent(user.userId);
      return;
    }

    if (status === 'pending') {
      return;
    }

    this.adultSuccess.set('');
    this.adultSaveError.set('');

    if (!this.birthDate()) {
      this.adultGateOpen.set(true);
      if (status === 'denied') {
        this.adultSaveError.set(
          'Sua solicitação anterior foi negada. Informe a data de nascimento para tentar novamente.',
        );
      }
      return;
    }

    await this.submitAdultRequest(user.userId);
  }

  async confirmAdultContent(): Promise<void> {
    const user = this.sessionService.getUser();
    if (!user || this.adultSaving()) return;

    const date = this.newBirthDate().trim();
    if (!date) {
      this.adultSaveError.set('Digite sua data de nascimento.');
      return;
    }

    await this.submitAdultRequest(user.userId, date);
  }

  cancelAdultGate(): void {
    this.adultGateOpen.set(false);
    this.newBirthDate.set('');
    this.adultSaveError.set('');
  }

  onBirthDateInput(value: string): void {
    this.newBirthDate.set(value);
  }

  private async submitAdultRequest(
    userId: string,
    birthDate?: string,
  ): Promise<void> {
    this.adultSaving.set(true);
    this.adultSaveError.set('');
    this.adultSuccess.set('');

    try {
      await this.preferencesService.saveAdultContent(userId, true, birthDate);
      this.adultStatus.set('pending');
      this.adultContent.set(false);
      if (birthDate) {
        this.birthDate.set(birthDate);
      }
      this.adultGateOpen.set(false);
      this.newBirthDate.set('');
      this.adultSuccess.set('Solicitação enviada. Ela está em análise.');
    } catch (error) {
      const e = error as { error?: { message?: string } };
      this.adultSaveError.set(
        e?.error?.message ?? 'Não foi possível enviar a solicitação. Tente novamente.',
      );
    } finally {
      this.adultSaving.set(false);
    }
  }

  private async disableAdultContent(userId: string): Promise<void> {
    this.adultSaving.set(true);
    this.adultSaveError.set('');
    this.adultSuccess.set('');

    try {
      await this.preferencesService.saveAdultContent(userId, false);
      this.adultStatus.set('none');
      this.adultContent.set(false);
      this.adultSuccess.set('Conteúdo adulto desativado.');
    } catch {
      this.adultSaveError.set('Erro ao salvar. Tente novamente.');
    } finally {
      this.adultSaving.set(false);
    }
  }

  onSearchQueryChange(query: string): void {
    this.searchQuery.set(query);
  }

  onSearch(): void {
    const term = this.searchQuery().trim();
    this.router.navigate(['/home'], term ? { queryParams: { q: term } } : {});
  }

  onTabChange(tab: NavbarTab): void {
    if (tab === 'personagens') {
      this.router.navigate(['/characters']);
    } else {
      this.router.navigate(['/home']);
    }
  }

  toggleProfileMenu(): void {
    this.showProfileMenu.update((v) => !v);
  }

  closeProfileMenu(): void {
    this.showProfileMenu.set(false);
  }

  logout(): void {
    this.sessionService.logout();
    this.router.navigate(['/login']);
  }
}