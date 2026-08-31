import { Component, Output, EventEmitter, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { catchError, of } from 'rxjs';
import { AnimeService, AnimeResult } from '../../../../../api/services/anime.service';
import { GroupsService } from '../../../../../api/services/groups.service';

@Component({
  selector: 'app-add-anime-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './add-anime-modal.html',
  styleUrl: './add-anime-modal.css',
})
export class AddAnimeModal {
  @Output() added = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  readonly groupId = input.required<string>();
  readonly alreadyAddedIds = input<Map<string, number>>(new Map());

  private readonly animeService = inject(AnimeService);
  private readonly groupsService = inject(GroupsService);

  query = '';
  results = signal<AnimeResult[]>([]);
  isSearching = signal(false);
  searched = signal(false);
  addingId = signal<number | null>(null);
  errorMessage = signal('');

  isAlreadyAdded(animeId: number): boolean {
    return this.alreadyAddedIds().has(String(animeId));
  }

  onQueryChange(value: string): void {
    this.query = value;
  }

  search(): void {
    const term = this.query.trim();
    if (!term) {
      this.errorMessage.set('Digite o nome do anime para buscar.');
      return;
    }

    this.isSearching.set(true);
    this.errorMessage.set('');
    this.searched.set(true);

    this.animeService
      .search(term)
      .pipe(
        catchError(() => {
          this.results.set([]);
          this.isSearching.set(false);
          this.errorMessage.set('Erro ao buscar animes. Tente novamente.');
          return of(null);
        }),
      )
      .subscribe((res) => {
        if (res) {
          this.results.set(res.data);
        }
        this.isSearching.set(false);
      });
  }

  addAnime(animeId: number): void {
    this.addingId.set(animeId);
    this.groupsService.addItem(this.groupId(), { externalAnimeId: String(animeId) }).subscribe({
      next: () => {
        this.addingId.set(null);
        this.added.emit();
      },
      error: () => {
        this.addingId.set(null);
        this.errorMessage.set('Erro ao adicionar o anime ao grupo.');
      },
    });
  }

  close(): void {
    this.cancel.emit();
  }
}
