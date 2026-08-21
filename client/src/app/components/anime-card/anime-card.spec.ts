import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AnimeResult } from '../../../api/services/anime.service';
import { AnimeCard } from './anime-card';

const mockAnime: AnimeResult = {
  mal_id: 1,
  title: 'Cowboy Bebop',
  images: { jpg: { image_url: 'img.jpg', large_image_url: 'img-large.jpg' } },
  score: 8.75,
  genres: [{ name: 'Ação' }, { name: 'Aventura' }],
  episodes: 26,
  status: 'Finished Airing',
  year: 1998,
  synopsis: '',
  type: 'TV',
  members: 1000,
};

describe('AnimeCard', () => {
  let component: AnimeCard;
  let fixture: ComponentFixture<AnimeCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AnimeCard],
    }).compileComponents();

    fixture = TestBed.createComponent(AnimeCard);
    fixture.componentRef.setInput('anime', mockAnime);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render the anime title', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.anime-card-title')?.textContent).toContain('Cowboy Bebop');
  });

  it('should format score, episodes and genres', () => {
    expect(component.formatScore(8.75)).toBe('8.8');
    expect(component.formatScore(null)).toBe('N/A');
    expect(component.formatEpisodes(null)).toBe('? eps');
    expect(component.formatEpisodes(12)).toBe('12 eps');
    expect(component.getGenreNames(mockAnime.genres)).toBe('Ação, Aventura');
  });

  it('should emit openDetails when the card is clicked', () => {
    let detailsId = 0;
    component.openDetails.subscribe((id) => (detailsId = id));

    const card = fixture.nativeElement.querySelector('.anime-card') as HTMLElement;
    card.click();

    expect(detailsId).toBe(mockAnime.mal_id);
  });

  it('should emit toggleFavorite without opening details', () => {
    let favoriteId = 0;
    let detailsOpened = false;
    component.toggleFavorite.subscribe((id) => (favoriteId = id));
    component.openDetails.subscribe(() => (detailsOpened = true));

    const btn = fixture.nativeElement.querySelector('.favorite-btn') as HTMLButtonElement;
    btn.click();

    expect(favoriteId).toBe(mockAnime.mal_id);
    expect(detailsOpened).toBe(false);
  });
});
