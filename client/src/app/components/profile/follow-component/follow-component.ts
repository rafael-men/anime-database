import { Component, DestroyRef, effect, inject, input, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { FollowCounts, UsersService } from '../../../../api/services/users.service';
import { SessionService } from '../../../../api/services/session.service';
import { FollowUsersComponent } from './follow-users-component/follow-users-component';

@Component({
  selector: 'app-follow-component',
  imports: [FollowUsersComponent],
  templateUrl: './follow-component.html',
  styleUrl: './follow-component.css',
})
export class FollowComponent implements OnInit {
  private readonly usersService = inject(UsersService);
  private readonly sessionService = inject(SessionService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  userId = input.required<string>();
  isOwnProfile = input(false);

  counts = signal<FollowCounts>({ followers: 0, following: 0 });
  isFollowing = signal(false);
  isLoading = signal(false);
  showFollowers = signal(false);
  showFollowing = signal(false);

  private currentUserId = '';

  constructor() {
    effect(() => {
      const id = this.userId();
      if (id) {
        this.loadCounts(id);
        this.checkFollowingStatus(id);
      }
    });
  }

  ngOnInit(): void {
    const user = this.sessionService.getUser();
    if (user) {
      this.currentUserId = user.userId;
    }
  }

  private loadCounts(userId: string): void {
    this.usersService.getFollowCounts(userId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (counts) => this.counts.set(counts),
        error: () => {},
      });
  }

  private checkFollowingStatus(userId: string): void {
    if (!this.currentUserId || this.currentUserId === userId) return;
    this.usersService.isFollowing(userId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (isFollowing) => this.isFollowing.set(isFollowing),
        error: () => {},
      });
  }

  toggleFollow(): void {
    if (this.isLoading()) return;
    this.isLoading.set(true);

    const action$ = this.isFollowing()
      ? this.usersService.unfollow(this.userId())
      : this.usersService.follow(this.userId());

    action$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.isFollowing.update((v) => !v);
        this.counts.update((c) => ({
          ...c,
          followers: c.followers + (this.isFollowing() ? 1 : -1),
        }));
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      },
    });
  }

  openFollowers(): void {
    this.showFollowers.set(true);
    this.showFollowing.set(false);
  }

  openFollowing(): void {
    this.showFollowing.set(true);
    this.showFollowers.set(false);
  }

  closeLists(): void {
    this.showFollowers.set(false);
    this.showFollowing.set(false);
  }

  goToProfile(userId: string): void {
    this.closeLists();
    this.router.navigate(['/profile', userId]);
  }
}
