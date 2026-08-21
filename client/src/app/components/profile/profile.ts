import { Component, computed, inject, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { switchMap } from 'rxjs/operators';
import { SessionService } from '../../../api/services/session.service';
import { FavoritesService, FavoriteItem } from '../../../api/services/favorites.service';
import { UpdateProfilePayload, UserProfile, UsersService } from '../../../api/services/users.service';
import { Navbar } from '../navbar/navbar';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, Navbar],
  templateUrl: './profile.html',
  styleUrl: './profile.css',
})
export class Profile implements OnInit {
  private readonly sessionService = inject(SessionService);
  private readonly usersService = inject(UsersService);
  private readonly favoritesService = inject(FavoritesService);
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);

  profile = signal<UserProfile | null>(null);
  favoriteItems = signal<FavoriteItem[]>([]);
  reviewsCount = signal(0);

  isLoading = signal(true);
  errorMessage = signal('');

  isEditing = signal(false);
  isSaving = signal(false);
  successMessage = signal('');
  saveErrorMessage = signal('');

  editUsername = '';
  editBio = '';

  private readonly avatarMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  private readonly maxAvatarSizeBytes = 2 * 1024 * 1024;
  private avatarObjectUrl: string | null = null;
  selectedAvatarFile = signal<File | null>(null);
  avatarPreview = signal<string | null>(null);
  avatarRemoved = signal(false);

  searchQuery = signal('');
  showProfileMenu = signal(false);
  private readonly sessionUserId = signal('');

  username = computed(() => this.profile()?.username ?? '');
  userInitial = computed(() => {
    const name = this.username();
    return name ? name.charAt(0).toUpperCase() : 'U';
  });

  editInitial(): string {
    const name = this.editUsername.trim();
    return name ? name.charAt(0).toUpperCase() : 'U';
  }

  memberSince = computed(() => {
    const createdAt = this.profile()?.createdAt;
    if (!createdAt) return '';
    return new Date(createdAt).toLocaleDateString('pt-BR', {
      month: 'long',
      year: 'numeric',
    });
  });

  favoritesCount = computed(() => this.favoriteItems().length);

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const user = this.sessionService.getUser();
    if (!user) {
      this.router.navigate(['/login']);
      return;
    }

    this.sessionUserId.set(user.userId);
    this.loadProfile(user.userId);
    this.favoritesService.getFavorites(user.userId).subscribe({
      next: (items) => this.favoriteItems.set(items),
      error: () => {},
    });
    this.usersService.getReviews(user.userId).subscribe({
      next: (reviews) => this.reviewsCount.set(reviews.length),
      error: () => {},
    });
  }

  loadProfile(userId: string): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.usersService.getProfile(userId).subscribe({
      next: (profile) => {
        this.profile.set(profile);
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('Erro ao carregar seu perfil. Tente novamente.');
        this.isLoading.set(false);
      },
    });
  }

  retryLoad(): void {
    const userId = this.sessionUserId();
    if (userId) this.loadProfile(userId);
  }

  startEditing(): void {
    const profile = this.profile();
    if (!profile) return;

    this.editUsername = profile.username;
    this.editBio = profile.bio ?? '';
    this.resetAvatarSelection();
    this.successMessage.set('');
    this.saveErrorMessage.set('');
    this.isEditing.set(true);
  }

  cancelEditing(): void {
    this.isEditing.set(false);
    this.saveErrorMessage.set('');
    this.resetAvatarSelection();
  }

  onChooseAvatar(input: HTMLInputElement): void {
    input.click();
  }

  onAvatarSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    input.value = '';

    if (!file) return;

    if (!this.avatarMimeTypes.includes(file.type)) {
      this.saveErrorMessage.set('Formato inválido. Use uma imagem JPG, PNG, WEBP ou GIF.');
      return;
    }

    if (file.size > this.maxAvatarSizeBytes) {
      this.saveErrorMessage.set('A imagem deve ter no máximo 2MB.');
      return;
    }

    this.saveErrorMessage.set('');
    this.avatarRemoved.set(false);
    this.selectedAvatarFile.set(file);

    if (this.avatarObjectUrl) URL.revokeObjectURL(this.avatarObjectUrl);
    this.avatarObjectUrl = URL.createObjectURL(file);
    this.avatarPreview.set(this.avatarObjectUrl);
  }

  removeAvatar(): void {
    this.saveErrorMessage.set('');
    this.selectedAvatarFile.set(null);
    this.avatarRemoved.set(true);

    if (this.avatarObjectUrl) {
      URL.revokeObjectURL(this.avatarObjectUrl);
      this.avatarObjectUrl = null;
    }
    this.avatarPreview.set(null);
  }

  private resetAvatarSelection(): void {
    this.selectedAvatarFile.set(null);
    this.avatarRemoved.set(false);

    if (this.avatarObjectUrl) {
      URL.revokeObjectURL(this.avatarObjectUrl);
      this.avatarObjectUrl = null;
    }
    this.avatarPreview.set(null);
  }

  saveProfile(): void {
    const profile = this.profile();
    if (!profile || this.isSaving()) return;

    const username = this.editUsername.trim();
    if (!username) {
      this.saveErrorMessage.set('O nome de usuário não pode ficar vazio.');
      return;
    }

    const payload: UpdateProfilePayload = {
      username,
      bio: this.editBio.trim() || null,
    };

    if (this.avatarRemoved()) {
      payload.avatarUrl = null;
    }

    this.isSaving.set(true);
    this.saveErrorMessage.set('');
    this.successMessage.set('');

    const request$ = this.selectedAvatarFile()
      ? this.usersService
          .uploadAvatar(profile.id, this.selectedAvatarFile()!)
          .pipe(switchMap(() => this.usersService.updateProfile(profile.id, payload)))
      : this.usersService.updateProfile(profile.id, payload);

    request$.subscribe({
      next: (updated) => {
        this.profile.set(updated);
        this.sessionService.updateUser({ username: updated.username });
        this.isSaving.set(false);
        this.isEditing.set(false);
        this.resetAvatarSelection();
        this.successMessage.set('Perfil atualizado com sucesso!');
      },
      error: (err) => {
        this.isSaving.set(false);
        this.saveErrorMessage.set(this.resolveSaveError(err));
      },
    });
  }

  private resolveSaveError(err: { status?: number; error?: { message?: string } }): string {
    if (err.status === 400) return 'Imagem inválida. Use JPG, PNG, WEBP ou GIF de até 2MB.';
    if (err.status === 401) return 'Sua sessão expirou. Faça login novamente.';
    if (err.status === 409) return 'Este nome de usuário já está em uso.';
    if (err.error?.message) return err.error.message;
    return 'Erro ao salvar o perfil. Tente novamente.';
  }

  onSearchQueryChange(query: string): void {
    this.searchQuery.set(query);
  }

  onSearch(): void {
    const term = this.searchQuery().trim();
    this.router.navigate(['/home'], term ? { queryParams: { q: term } } : {});
  }

  goHome(): void {
    this.router.navigate(['/home']);
  }

  toggleProfileMenu(): void {
    this.showProfileMenu.update((v) => !v);
  }

  closeProfileMenu(): void {
    this.showProfileMenu.set(false);
  }

  logout(): void {
    this.sessionService.clearSession();
    this.router.navigate(['/login']);
  }
}
