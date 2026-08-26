import { Component, inject, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { CharacterService, CharacterDetailResult } from '../../../api/services/character.service';
import { UsersService } from '../../../api/services/users.service';
import { SessionService } from '../../../api/services/session.service';
import { Navbar, NavbarTab } from '../navbar/navbar';
import { TranslatePipe } from '../../../utils/translate-pipe';

@Component({
  selector: 'app-character-details',
  standalone: true,
  imports: [CommonModule, Navbar, TranslatePipe],
  templateUrl: './character-details.html',
  styleUrl: './character-details.css',
})
export class CharacterDetails implements OnInit {
  private readonly characterService = inject(CharacterService);
  private readonly usersService = inject(UsersService);
  private readonly sessionService = inject(SessionService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);

  character = signal<CharacterDetailResult | null>(null);
  isLoading = signal(false);
  errorMessage = signal('');
  kinCount = signal(0);
  isLoadingKinCount = signal(false);
  selectedImage = signal<string | null>(null);

  searchQuery = signal('');
  showProfileMenu = signal(false);
  username = signal('');
  avatarUrl = signal<string | null>(null);

  get userInitial(): string {
    const name = this.username();
    return name ? name.charAt(0).toUpperCase() : 'U';
  }

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    this.loadUser();

    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id || isNaN(id)) {
      this.errorMessage.set('ID de personagem inválido.');
      return;
    }

    this.loadCharacter(id);
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
      },
      error: () => {},
    });
  }

  loadCharacter(id: number): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.characterService.getById(id).subscribe({
      next: (character) => {
        this.character.set(character);
        this.isLoading.set(false);
        this.loadKinCount(id);
      },
      error: () => {
        this.errorMessage.set('Erro ao carregar personagem. Tente novamente.');
        this.isLoading.set(false);
      },
    });
  }

  private loadKinCount(characterId: number): void {
    this.isLoadingKinCount.set(true);
    this.usersService.getKinCount(characterId).subscribe({
      next: (count) => {
        this.kinCount.set(count);
        this.isLoadingKinCount.set(false);
      },
      error: () => {
        this.isLoadingKinCount.set(false);
      },
    });
  }

  openImage(imageUrl: string): void {
    this.selectedImage.set(imageUrl);
  }

  closeImage(): void {
    this.selectedImage.set(null);
  }

  navigateToAnime(animeId: number): void {
    this.router.navigate(['/anime', animeId]);
  }

  goBack(): void {
    this.router.navigate(['/characters']);
  }

  onTabChange(tab: NavbarTab): void {
    if (tab === 'personagens') return;
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

  formatLabel(format: string): string {
    const labels: Record<string, string> = {
      TV: 'Série',
      TV_SHORT: 'Curta',
      MOVIE: 'Filme',
      SPECIAL: 'Especial',
      OVA: 'OVA',
      ONA: 'ONA',
      MUSIC: 'Música',
    };
    return labels[format] ?? format;
  }

  formatMeta(value: string | null | undefined): string {
  return value?.trim() ? value : 'Não Informado';
  }
}
