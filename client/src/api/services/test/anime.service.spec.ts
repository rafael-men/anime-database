import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { API_ROUTES } from '../../routes/routes';
import { AnimeDetailsData, AnimeService } from '../anime.service';

const mediaItem = {
  id: 1,
  title: { romaji: 'Naruto', english: 'Naruto' },
  coverImage: { large: 'naruto.jpg' },
  genres: ['Action', 'Adventure'],
  averageScore: 75,
  episodes: 220,
  status: 'FINISHED',
  startDate: { year: 2002 },
};

function buildPageResponse(media: unknown[] = [mediaItem], pageInfo = { currentPage: 1, hasNextPage: false, lastPage: 3, total: 30 }) {
  return { data: { Page: { pageInfo, media } } };
}

describe('AnimeService', () => {
  let service: AnimeService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AnimeService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('deve ser criado', () => {
    expect(service).toBeTruthy();
  });

  it('search envia POST GraphQL e mapeia o resultado', () => {
    let result: any;
    service.search('Naruto').subscribe((res) => (result = res));

    const req = httpMock.expectOne(API_ROUTES.anime.graphql);
    expect(req.request.method).toBe('POST');
    expect(req.request.body.variables).toEqual({ perPage: 12, page: 1, search: 'Naruto' });
    expect(req.request.body.query).toContain('query (');
    req.flush(buildPageResponse());

    expect(result.data[0].mal_id).toBe(1);
    expect(result.data[0].title).toBe('Naruto');
    expect(result.data[0].images.jpg.image_url).toBe('naruto.jpg');
    expect(result.data[0].score).toBe(7.5);
    expect(result.data[0].year).toBe(2002);
    expect(result.data[0].genres[0].name).toBe('Action');
    expect(result.pagination).toEqual({ last_visible_page: 3, has_next_page: false, current_page: 1 });
  });

  it('search limpa a query antes de enviar', () => {
    service.search('   ').subscribe();

    const req = httpMock.expectOne(API_ROUTES.anime.graphql);
    expect(req.request.body.variables.search).toBeUndefined();
    req.flush(buildPageResponse([]));
  });

  it('search repassa format, year, status e sort como variáveis GraphQL', () => {
    service.search('Naruto', 2, { format: 'TV', year: 2020, status: 'FINISHED', sort: 'POPULARITY_DESC' }).subscribe();

    const req = httpMock.expectOne(API_ROUTES.anime.graphql);
    expect(req.request.body.variables).toEqual({
      perPage: 12,
      page: 2,
      search: 'Naruto',
      format: 'TV',
      seasonYear: 2020,
      status: 'FINISHED',
      sort: ['POPULARITY_DESC'],
    });
    req.flush(buildPageResponse());
  });

  it('searchByGenre envia o gênero como variável', () => {
    service.searchByGenre('Ação', 1).subscribe();

    const req = httpMock.expectOne(API_ROUTES.anime.graphql);
    expect(req.request.body.variables.genre).toBe('Ação');
    expect(req.request.body.variables.search).toBeUndefined();
    req.flush(buildPageResponse());
  });

  it('getSuggestions retorna lista vazia para termos com menos de 2 caracteres', () => {
    let result: unknown = 'not-called';
    service.getSuggestions('a').subscribe((res) => (result = res));
    expect(result).toEqual([]);
    httpMock.expectNone(API_ROUTES.anime.graphql);
  });

  it('getSuggestions envia busca com perPage 8', () => {
    service.getSuggestions('Na').subscribe();

    const req = httpMock.expectOne(API_ROUTES.anime.graphql);
    expect(req.request.body.variables).toEqual({ search: 'Na', perPage: 8 });
    req.flush({ data: { Page: { media: [mediaItem] } } });
  });

  it('getGenres retorna a lista de gêneros', () => {
    let result: string[] = [];
    service.getGenres().subscribe((res) => (result = res));

    const req = httpMock.expectOne(API_ROUTES.anime.graphql);
    expect(req.request.body.query).toContain('GenreCollection');
    req.flush({ data: { GenreCollection: ['Action', 'Drama'] } });

    expect(result).toEqual(['Action', 'Drama']);
  });

  it('getById mapeia o anime individual', () => {
    let result: any;
    service.getById(10).subscribe((res) => (result = res));

    const req = httpMock.expectOne(API_ROUTES.anime.graphql);
    expect(req.request.body.variables).toEqual({ id: 10 });
    req.flush({ data: { Media: { id: 10, title: { romaji: 'Bleach' } } } });

    expect(result.mal_id).toBe(10);
    expect(result.title).toBe('Bleach');
  });

  it('getByIds retorna lista vazia sem chamar a API quando ids é vazio', () => {
    let result: unknown = 'not-called';
    service.getByIds([]).subscribe((res) => (result = res));
    expect(result).toEqual([]);
    httpMock.expectNone(API_ROUTES.anime.graphql);
  });

  it('getByIds busca vários animes e mapeia todos', () => {
    service.getByIds([1, 2]).subscribe();

    const req = httpMock.expectOne(API_ROUTES.anime.graphql);
    expect(req.request.body.variables).toEqual({ ids: [1, 2] });
    req.flush({
      data: {
        Page: {
          media: [
            { id: 1, title: { romaji: 'A' } },
            { id: 2, title: { romaji: 'B' } },
          ],
        },
      },
    });
  });

  it('getDetails mapeia os detalhes completos do anime', () => {
    let result!: AnimeDetailsData;
    const details = {
      id: 5,
      title: { romaji: 'Attack on Titan', english: 'Attack on Titan', native: '進撃の巨人' },
      description: '<p>História <b>épica</b>.</p>',
      coverImage: { extraLarge: 'xlarge.jpg', large: 'large.jpg' },
      bannerImage: 'banner.jpg',
      genres: ['Action'],
      averageScore: 86,
      episodes: 25,
      duration: 24,
      format: 'TV',
      status: 'FINISHED',
      season: 'SPRING',
      seasonYear: 2013,
      source: 'MANGA',
      popularity: 1000,
      favourites: 500,
      startDate: { day: 7, month: 4, year: 2013 },
      endDate: { day: 28, month: 9, year: 2013 },
      studios: { nodes: [{ name: 'Wit Studio' }] },
      trailer: { id: 'abc123', site: 'YouTube' },
      externalLinks: [
        { id: 1, url: 'https://crunchyroll.com', site: 'Crunchyroll', type: 'STREAMING', color: '#f00', icon: 'i', isDisabled: false },
        { id: 2, url: 'https://mydanime.com', site: 'MyAnimeList', type: 'INFO', color: '#00f', icon: 'i', isDisabled: false },
        { id: 3, url: 'https://disabled.com', site: 'X', type: 'STREAMING', color: '#fff', icon: 'i', isDisabled: true },
      ],
    };

    service.getDetails(5).subscribe((res) => (result = res));

    const req = httpMock.expectOne(API_ROUTES.anime.graphql);
    expect(req.request.body.variables).toEqual({ id: 5 });
    req.flush({ data: { Media: details } });

    expect(result.title).toBe('Attack on Titan');
    expect(result.titleNative).toBe('進撃の巨人');
    expect(result.synopsis).toBe('História épica.');
    expect(result.images.jpg.image_url).toBe('xlarge.jpg');
    expect(result.bannerImage).toBe('banner.jpg');
    expect(result.score).toBe(8.6);
    expect(result.startDate).toBe('07/04/2013');
    expect(result.endDate).toBe('28/09/2013');
    expect(result.studios).toEqual(['Wit Studio']);
    expect(result.trailerUrl).toBe('https://youtu.be/abc123');
    expect(result.streamingLinks).toEqual([
      { url: 'https://crunchyroll.com', site: 'Crunchyroll', color: '#f00', icon: 'i' },
    ]);
  });

  it('getDetails trata trailers de sites não-YouTube e datas incompletas', () => {
    let result!: AnimeDetailsData;
    service
      .getDetails(6)
      .subscribe((res) => (result = res));

    const req = httpMock.expectOne(API_ROUTES.anime.graphql);
    req.flush({
      data: {
        Media: {
          id: 6,
          title: { romaji: 'Algo' },
          trailer: { id: '123', site: 'Twitch' },
          startDate: { year: 2020 },
        },
      },
    });

    expect(result.trailerUrl).toBeNull();
    expect(result.startDate).toBe('');
    expect(result.title).toBe('Algo');
  });

  it('getDetails usa o título romaji como fallback', () => {
    let result!: AnimeDetailsData;
    service.getDetails(7).subscribe((res) => (result = res));

    const req = httpMock.expectOne(API_ROUTES.anime.graphql);
    req.flush({ data: { Media: { id: 7, title: { romaji: 'Solo' } } } });

    expect(result.title).toBe('Solo');
  });
});