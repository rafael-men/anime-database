import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AnimeResult } from '../../../api/services/anime.service';
import { AnimeGrid } from './anime-grid';

const mockAnimes: AnimeResult[] = [
  {
    mal_id: 1,
    title: 'Cowboy Bebop',
    images: { jpg: { image_url: 'img.jpg', large_image_url: 'img-large.jpg' } },
    score: 8.7,
    genres: [{ name: 'Ação' }],
    episodes: 26,
    status: 'Finished Airing',
    year: 1998,
    synopsis: '',
    type: 'TV',
    members: 1000,
  },
  {
    mal_id: 2,
    title: 'Trigun',
    images: { jpg: { image_url: 'img2.jpg', large_image_url: 'img2-large.jpg' } },
    score: null,
    genres: [],
    episodes: null,
    status: 'Finished Airing',
    year: null,
    synopsis: '',
    type: 'TV',
    members: 500,
  },
];

describe('AnimeGrid', () => {
  let component: AnimeGrid;
  let fixture: ComponentFixture<AnimeGrid>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AnimeGrid],
    }).compileComponents();

    fixture = TestBed.createComponent(AnimeGrid);
    fixture.componentRef.setInput('animes', []);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show empty state when there are no animes', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Nenhum anime encontrado.');
  });

  it('should render one card per anime', async () => {
    fixture.componentRef.setInput('animes', mockAnimes);
    await fixture.whenStable();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelectorAll('app-anime-card').length).toBe(2);
  });

  it('should show error state with retry button', async () => {
    fixture.componentRef.setInput('errorMessage', 'Falha na conexão');
    await fixture.whenStable();

    let retried = false;
    component.retry.subscribe(() => (retried = true));

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Falha na conexão');

    (el.querySelector('.retry-btn') as HTMLButtonElement).click();
    expect(retried).toBe(true);
  });

  it('should show load more button only when there is a next page', async () => {
    fixture.componentRef.setInput('animes', mockAnimes);
    fixture.componentRef.setInput('hasNextPage', true);
    await fixture.whenStable();

    let moreLoaded = false;
    component.loadMore.subscribe(() => (moreLoaded = true));

    const el: HTMLElement = fixture.nativeElement;
    const btn = el.querySelector('.load-more-btn') as HTMLButtonElement;
    expect(btn).toBeTruthy();

    btn.click();
    expect(moreLoaded).toBe(true);

    fixture.componentRef.setInput('hasNextPage', false);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.load-more-btn')).toBeFalsy();
  });
});
