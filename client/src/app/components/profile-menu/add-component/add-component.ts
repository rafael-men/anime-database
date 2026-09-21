import { Component, inject, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { SessionService } from '../../../../api/services/session.service';
import { UsersService } from '../../../../api/services/users.service';
import { Navbar, NavbarTab } from '../../navbar/navbar';
import { FollowUsersComponent } from '../../profile/follow-component/follow-users-component/follow-users-component';
import { AddUserPage } from './add-user-page/add-user-page';

@Component({
  selector: 'app-add-component',
  imports: [CommonModule, Navbar, FollowUsersComponent, AddUserPage],
  templateUrl: './add-component.html',
  styleUrl: './add-component.css',
})
export class AddComponent implements OnInit {
  private readonly sessionService = inject(SessionService);
  private readonly usersService = inject(UsersService);
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);

  searchQuery = signal('');
  showProfileMenu = signal(false);

  currentUserId = signal('');
  username = signal('');
  avatarUrl = signal<string | null>(null);
  userInitial = signal('U');

  activeTab = signal<'following' | 'followers'>('following');

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const user = this.sessionService.getUser();
    if (!user) {
      this.router.navigate(['/login']);
      return;
    }

    this.currentUserId.set(user.userId);
    this.loadProfile(user.userId);
  }

  private loadProfile(userId: string): void {
    this.usersService.getProfile(userId).subscribe({
      next: (profile) => {
        this.username.set(profile.username);
        this.avatarUrl.set(profile.avatarUrl ?? null);
        this.userInitial.set(profile.username ? profile.username.charAt(0).toUpperCase() : 'U');
      },
      error: () => undefined,
    });
  }

  setTab(tab: 'following' | 'followers'): void {
    this.activeTab.set(tab);
  }

  openProfile(userId: string): void {
    this.router.navigate(['/profile', userId]);
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
