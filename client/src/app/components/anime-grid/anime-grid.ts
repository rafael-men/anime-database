import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AnimeResult } from '../../../api/services/anime.service';
import { AnimeCard } from '../anime-card/anime-card';

@Component({
  selector: 'app-anime-grid',
  standalone: true,
  imports: [CommonModule, AnimeCard],
  templateUrl: './anime-grid.html',
  styleUrl: './anime-grid.css',
})
export class AnimeGrid {
  animes = input.required<AnimeResult[]>();
  isLoading = input<boolean>(false);
  errorMessage = input<string>('');
  hasNextPage = input<boolean>(false);
  favoriteIds = input<Set<number>>(new Set<number>());
  loadMore = output<void>();
  retry = output<void>();
  toggleFavorite = output<number>();
  openDetails = output<number>();
}
