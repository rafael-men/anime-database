import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, of, forkJoin } from 'rxjs';
import { GroupsService, Group } from '../../../../api/services/groups.service';
import { AnimeService, AnimeResult } from '../../../../api/services/anime.service';
import { SessionService } from '../../../../api/services/session.service';
import { resolveAssetUrl } from '../../../../api/routes/routes';
import { Navbar, NavbarTab } from '../../navbar/navbar';
import { AnimeCard } from '../../anime-card/anime-card';
import { CreateGroup } from '../create-group/create-group';
import { AddAnimeModal } from './add-anime-modal/add-anime-modal';

@Component({
  selector: 'app-group-detail',
  standalone: true,
  imports: [CommonModule, Navbar, AnimeCard, CreateGroup, AddAnimeModal],
  templateUrl: './group-detail.html',
  styleUrl: './group-detail.css',
})
export class GroupDetail implements OnInit {
  private readonly groupsService = inject(GroupsService);
  private readonly animeService = inject(AnimeService);
  private readonly sessionService = inject(SessionService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  group = signal<Group | null>(null);
  animes = signal<AnimeResult[]>([]);
  itemMap = signal<Map<string, number>>(new Map());

  isLoading = signal(false);
  isItemsLoading = signal(false);
  errorMessage = signal('');
  showEditForm = signal(false);
  showAddModal = signal(false);

  username = signal('');
  avatarUrl = signal<string | null>(null);
  showProfileMenu = signal(false);

  userInitial = computed(() => {
    const name = this.username();
    return name ? name.charAt(0).toUpperCase() : 'U';
  });

  isOwner = computed(() => {
    const group = this.group();
    const user = this.sessionService.getUser();
    return !!group && !!user && group.ownerId === user.userId;
  });

  groupId = '';

  ngOnInit(): void {
    this.groupId = this.route.snapshot.paramMap.get('id') ?? '';
    this.initUser();

    if (!this.groupId) {
      this.errorMessage.set('Grupo não encontrado.');
      return;
    }

    this.loadGroup();
  }

  private initUser(): void {
    const user = this.sessionService.getUser();
    if (!user) {
      this.router.navigate(['/login']);
      return;
    }
    this.username.set(user.username);
    this.avatarUrl.set(user.avatarUrl ?? null);
  }

  loadGroup(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.groupsService.getGroupById(this.groupId).subscribe({
      next: (group) => {
        this.group.set(group);
        this.isLoading.set(false);
        this.loadAnimes(group.groupItems ?? []);
      },
      error: () => {
        this.errorMessage.set('Erro ao carregar o grupo. Tente novamente.');
        this.isLoading.set(false);
      },
    });
  }

  private loadAnimes(items: { externalAnimeId: string }[]): void {
    if (items.length === 0) {
      this.animes.set([]);
      this.itemMap.set(new Map());
      this.isItemsLoading.set(false);
      return;
    }

    this.isItemsLoading.set(true);
    const ids = items.map((i) => Number(i.externalAnimeId));
    const map = new Map<string, number>();
    items.forEach((i) => {
      map.set(i.externalAnimeId, Number(i.externalAnimeId));
    });
    this.itemMap.set(map);

    this.animeService
      .getByIds(ids)
      .pipe(
        catchError(() => {
          this.animes.set([]);
          this.isItemsLoading.set(false);
          return of(null);
        }),
      )
      .subscribe((animes) => {
        if (animes) {
          this.animes.set(animes);
        }
        this.isItemsLoading.set(false);
      });
  }

  retryLoad(): void {
    this.loadGroup();
  }

  openEdit(): void {
    this.showEditForm.set(true);
  }

  closeEdit(): void {
    this.showEditForm.set(false);
  }

  onGroupUpdated(): void {
    this.showEditForm.set(false);
    this.loadGroup();
  }

  openAddModal(): void {
    this.showAddModal.set(true);
  }

  closeAddModal(): void {
    this.showAddModal.set(false);
  }

  onAnimeAdded(): void {
    this.showAddModal.set(false);
    this.loadGroup();
  }

  removeAnime(animeId: number): void {
    this.groupsService.removeItem(this.groupId, String(animeId)).subscribe({
      next: () => this.loadGroup(),
      error: () => {},
    });
  }

  deleteGroup(): void {
    const confirmed = window.confirm(
      'Tem certeza que deseja excluir este grupo? Esta ação não pode ser desfeita.',
    );
    if (!confirmed) return;

    this.groupsService.deleteGroup(this.groupId).subscribe({
      next: () => this.router.navigate(['/favourites']),
      error: () => {},
    });
  }

  coverUrl(): string | null {
    return resolveAssetUrl(this.group()?.coverImageUrl);
  }

  getInitial(name: string): string {
    return name.charAt(0).toUpperCase();
  }

  goToAnime(animeId: number): void {
    this.router.navigate(['/anime', animeId]);
  }

  goBack(): void {
    this.router.navigate(['/favourites']);
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
    this.sessionService.clearSession();
    this.router.navigate(['/login']);
  }
}
