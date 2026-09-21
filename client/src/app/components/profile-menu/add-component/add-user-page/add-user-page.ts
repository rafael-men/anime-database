import { Component, DestroyRef, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FollowSearchUser, UsersService } from '../../../../../api/services/users.service';
import { resolveAssetUrl } from '../../../../../api/routes/routes';
import { AvatarFallbackDirective } from '../../../../directives/avatar-fallback.directive';

@Component({
  selector: 'app-add-user-page',
  imports: [CommonModule, FormsModule, AvatarFallbackDirective],
  templateUrl: './add-user-page.html',
  styleUrl: './add-user-page.css',
})
export class AddUserPage {
  private readonly usersService = inject(UsersService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  searchQuery = signal('');
  results = signal<FollowSearchUser[]>([]);
  isLoading = signal(false);
  searchError = signal('');
  searched = signal(false);
  togglingId = signal<string | null>(null);

  onSearchQueryChange(value: string): void {
    this.searchQuery.set(value);
  }

  search(): void {
    const term = this.searchQuery().trim();
    this.searched.set(true);
    this.searchError.set('');

    if (!term) {
      this.results.set([]);
      return;
    }

    this.isLoading.set(true);

    this.usersService
      .searchUsers(term)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (users) => {
          this.results.set(users);
          this.isLoading.set(false);
        },
        error: () => {
          this.searchError.set('Erro ao buscar usuários. Tente novamente.');
          this.isLoading.set(false);
        },
      });
  }

  toggleFollow(user: FollowSearchUser): void {
    if (this.togglingId()) return;

    this.togglingId.set(user.id);

    const request$ = user.isFollowing
      ? this.usersService.unfollow(user.id)
      : this.usersService.follow(user.id);

    request$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.results.update((list) =>
          list.map((u) => (u.id === user.id ? { ...u, isFollowing: !user.isFollowing } : u)),
        );
        this.togglingId.set(null);
      },
      error: () => {
        this.togglingId.set(null);
      },
    });
  }

  openProfile(userId: string): void {
    this.router.navigate(['/profile', userId]);
  }

  resolveAvatar(path: string | null | undefined): string | null {
    return resolveAssetUrl(path);
  }

  userInitial(username: string): string {
    return username ? username.charAt(0).toUpperCase() : 'U';
  }

  isToggling(userId: string): boolean {
    return this.togglingId() === userId;
  }
}
