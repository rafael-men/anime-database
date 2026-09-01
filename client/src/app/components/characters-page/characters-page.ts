import { Component, computed, inject, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CharacterService, CharacterResult } from '../../../api/services/character.service';
import { SessionService } from '../../../api/services/session.service';
import { UsersService } from '../../../api/services/users.service';
import { Navbar, NavbarTab } from '../navbar/navbar';

@Component({
  selector: 'app-characters-page',
  standalone: true,
  imports: [CommonModule, FormsModule, Navbar],
  templateUrl: './characters-page.html',
  styleUrl: './characters-page.css',
})
export class CharactersPage implements OnInit {
  private readonly characterService = inject(CharacterService);
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly sessionService = inject(SessionService);
  private readonly usersService = inject(UsersService);

  characters = signal<CharacterResult[]>([]);
  isLoading = signal(false);
  errorMessage = signal('');
  currentPage = signal(1);
  hasNextPage = signal(false);

  searchInput = '';
  showProfileMenu = signal(false);
  username = signal('');
  avatarUrl = signal<string | null>(null);

  userInitial = computed(() => {
    const name = this.username();
    return name ? name.charAt(0).toUpperCase() : 'U';
  });

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.loadUser();
    this.loadCharacters();
  }

  private loadUser(): void {
    const user = this.sessionService.getUser();
    this.username.set(user?.username ?? '');
    this.avatarUrl.set(user?.avatarUrl ?? null);

    if (!user) return;

    this.usersService.getProfile(user.userId).subscribe({
      next: (profile) => {
        this.username.set(profile.username);
        this.avatarUrl.set(profile.avatarUrl ?? null);
        this.sessionService.updateUser({
          username: profile.username,
          avatarUrl: profile.avatarUrl ?? null,
        });
      },
      error: () => {},
    });
  }

  loadCharacters(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    const search = this.searchInput.trim() || undefined;
    this.characterService.getCharacters(1, search).subscribe({
      next: (res) => {
        this.characters.set(res.data);
        this.hasNextPage.set(res.pagination.has_next_page);
        this.currentPage.set(1);
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('Erro ao carregar personagens. Tente novamente.');
        this.isLoading.set(false);
      },
    });
  }

  onSearchInput(): void {
    this.loadCharacters();
  }

  loadMore(): void {
    if (this.isLoading() || !this.hasNextPage()) return;

    this.currentPage.set(this.currentPage() + 1);
    this.isLoading.set(true);

    const search = this.searchInput.trim() || undefined;
    this.characterService.getCharacters(this.currentPage(), search).subscribe({
      next: (res) => {
        this.characters.update((current) => [...current, ...res.data]);
        this.hasNextPage.set(res.pagination.has_next_page);
        this.isLoading.set(false);
      },
      error: () => {
        this.currentPage.set(this.currentPage() - 1);
        this.isLoading.set(false);
      },
    });
  }

  openCharacterDetails(charId: number): void {
    this.router.navigate(['/character', charId]);
  }

  openCharacterAnime(animeId: number | null): void {
    if (animeId) this.router.navigate(['/anime', animeId]);
  }

  goHome(): void {
    this.router.navigate(['/home']);
  }

  onTabChange(tab: NavbarTab): void {
    if (tab === 'personagens') return;
    this.router.navigate(['/home']);
  }

  noop(): void {}

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
