import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AnimeResult } from '../../../api/services/anime.service';

@Component({
  selector: 'app-anime-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './anime-card.html',
  styleUrl: './anime-card.css',
})
export class AnimeCard {
  anime = input.required<AnimeResult>();

  formatScore(score: number | null): string {
    if (score === null || score === undefined) return 'N/A';
    return score.toFixed(1);
  }

  formatEpisodes(episodes: number | null): string {
    if (!episodes) return '? eps';
    return `${episodes} eps`;
  }

  getGenreNames(genres: { name: string }[]): string {
    return genres.map((g) => g.name).join(', ');
  }
}
