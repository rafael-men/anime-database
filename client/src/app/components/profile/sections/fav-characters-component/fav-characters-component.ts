import { Component, effect, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CharacterService, CharacterResult } from '../../../../../api/services/character.service';

const MAX_KINS = 3;

@Component({
  selector: 'app-fav-characters-component',
  imports: [CommonModule, FormsModule],
  templateUrl: './fav-characters-component.html',
  styleUrl: './fav-characters-component.css',
})
export class FavCharactersComponent {
  private readonly characterService = inject(CharacterService);

  characterIds = input<number[]>([]);
  characterIdsChange = output<number[]>();

  kins = signal<CharacterResult[]>([]);
  isLoading = signal(false);

  showModal = signal(false);
  searchQuery = signal('');
  searchResults = signal<CharacterResult[]>([]);
  isSearching = signal(false);

  private fetchedIds = new Set<number>();
  private characterCache = new Map<number, CharacterResult>();

  constructor() {
    effect(() => {
      const ids = this.characterIds();
      this.loadKins(ids);
    });
  }

  private loadKins(ids: number[]): void {
    if (!ids.length) {
      this.kins.set([]);
      return;
    }

    const missingIds = ids.filter((id) => !this.fetchedIds.has(id));

    this.fillKins(ids);

    if (!missingIds.length) return;

    this.isLoading.set(true);

    this.characterService.getByIds(missingIds).subscribe({
      next: (characters) => {
        for (const c of characters) {
          this.fetchedIds.add(c.id);
          this.characterCache.set(c.id, c);
        }
        this.fillKins(ids);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      },
    });
  }

  private fillKins(ids: number[]): void {
    this.kins.set(ids.map((id) => this.characterCache.get(id) ?? null).filter(Boolean) as CharacterResult[]);
  }

  get hasEmptySlots(): boolean {
    return this.kins().length < MAX_KINS;
  }

  openModal(): void {
    this.searchQuery.set('');
    this.searchResults.set([]);
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
  }

  onSearchCharacters(): void {
    const query = this.searchQuery().trim();
    if (!query) {
      this.searchResults.set([]);
      return;
    }

    this.isSearching.set(true);

    this.characterService.getCharacters(1, query).subscribe({
      next: (res) => {
        const currentIds = new Set(this.characterIds());
        this.searchResults.set(res.data.filter((c) => !currentIds.has(c.id)));
        this.isSearching.set(false);
      },
      error: () => {
        this.isSearching.set(false);
      },
    });
  }

  selectCharacter(character: CharacterResult): void {
    const current = this.characterIds();
    if (current.length >= MAX_KINS) return;

    this.fetchedIds.add(character.id);
    this.characterCache.set(character.id, character);

    const updated = [...current, character.id];
    this.characterIdsChange.emit(updated);
    this.closeModal();
  }

  removeCharacter(characterId: number): void {
    const updated = this.characterIds().filter((id) => id !== characterId);
    this.characterIdsChange.emit(updated);
  }
}
