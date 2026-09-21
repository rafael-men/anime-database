import { Component, DestroyRef, effect, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FollowUser, UsersService } from '../../../../../api/services/users.service';
import { resolveAssetUrl } from '../../../../../api/routes/routes';
import { AvatarFallbackDirective } from '../../../../directives/avatar-fallback.directive';

@Component({
  selector: 'app-follow-users-component',
  imports: [AvatarFallbackDirective],
  templateUrl: './follow-users-component.html',
  styleUrl: './follow-users-component.css',
})
export class FollowUsersComponent {
  private readonly usersService = inject(UsersService);
  private readonly destroyRef = inject(DestroyRef);

  userId = input.required<string>();
  type = input<'followers' | 'following'>('followers');
  userClick = output<string>();

  users = signal<FollowUser[]>([]);
  isLoading = signal(true);

  constructor() {
    effect(() => {
      const id = this.userId();
      const type = this.type();
      if (id) {
        this.loadUsers(id, type);
      }
    });
  }

  private loadUsers(userId: string, type: 'followers' | 'following'): void {
    this.isLoading.set(true);
    this.users.set([]);

    const request$ =
      type === 'followers'
        ? this.usersService.getFollowers(userId)
        : this.usersService.getFollowing(userId);

    request$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (users) => {
        this.users.set(users);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      },
    });
  }

  onUserClick(userId: string): void {
    this.userClick.emit(userId);
  }

  resolveAvatar(path: string | null | undefined): string | null {
    return resolveAssetUrl(path);
  }

  userInitial(username: string): string {
    return username ? username.charAt(0).toUpperCase() : 'U';
  }

  memberSince(date: string): string {
    return new Date(date).toLocaleDateString('pt-BR', {
      month: 'short',
      year: 'numeric',
    });
  }
}
