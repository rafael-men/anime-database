import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { catchError, of } from 'rxjs';
import { GroupsService, Group } from '../../../api/services/groups.service';
import { SessionService } from '../../../api/services/session.service';
import { resolveAssetUrl } from '../../../api/routes/routes';
import { CreateGroup } from './create-group/create-group';

@Component({
  selector: 'app-groups-component',
  standalone: true,
  imports: [CommonModule, CreateGroup],
  templateUrl: './groups-component.html',
  styleUrl: './groups-component.css',
})
export class GroupsComponent implements OnInit {
  private readonly groupsService = inject(GroupsService);
  private readonly sessionService = inject(SessionService);
  private readonly router = inject(Router);

  groups = signal<Group[]>([]);
  isLoading = signal(false);
  errorMessage = signal('');
  showCreateForm = signal(false);

  ngOnInit(): void {
    const user = this.sessionService.getUser();
    if (user) {
      this.loadGroups(user.userId);
    }
  }

  loadGroups(ownerId: string): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.groupsService
      .getGroupsByOwner(ownerId)
      .pipe(
        catchError(() => {
          this.errorMessage.set('Erro ao carregar seus grupos. Tente novamente.');
          this.isLoading.set(false);
          return of([]);
        }),
      )
      .subscribe((groups) => {
        this.groups.set(groups);
        this.isLoading.set(false);
      });
  }

  retryLoad(): void {
    const user = this.sessionService.getUser();
    if (user) this.loadGroups(user.userId);
  }

  openCreateForm(): void {
    this.showCreateForm.set(true);
  }

  closeCreateForm(): void {
    this.showCreateForm.set(false);
  }

  onGroupCreated(): void {
    this.showCreateForm.set(false);
    const user = this.sessionService.getUser();
    if (user) {
      this.loadGroups(user.userId);
    }
  }

  openGroup(groupId: string): void {
    this.router.navigate(['/groups', groupId]);
  }

  coverUrl(group: Group): string | null {
    return resolveAssetUrl(group.coverImageUrl);
  }

  getInitial(name: string): string {
    return name.charAt(0).toUpperCase();
  }
}
