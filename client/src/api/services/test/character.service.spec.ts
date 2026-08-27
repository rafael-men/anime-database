import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { API_ROUTES } from '../../routes/routes';
import { CharacterDetailResult, CharacterService } from '../character.service';

const characterItem = {
  id: 1,
  name: { full: 'Mikasa Ackerman', native: '三笠・アッカーマン' },
  image: { large: 'mikasa.jpg', medium: 'mikasa-m.jpg' },
  gender: 'Female',
  favourites: 500,
  media: {
    nodes: [{ id: 10, title: { romaji: 'Shingeki no Kyojin', english: 'Attack on Titan' } }],
  },
};

function buildPageResponse(characters: unknown[] = [characterItem], pageInfo = { currentPage: 1, hasNextPage: false, lastPage: 2, total: 40 }) {
  return { data: { Page: { pageInfo, characters } } };
}

describe('CharacterService', () => {
  let service: CharacterService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(CharacterService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('deve ser criado', () => {
    expect(service).toBeTruthy();
  });

  it('getCharacters envia busca com perPage 24 e mapeia o resultado', () => {
    let result: any;
    service.getCharacters(2, 'Mikasa').subscribe((res) => (result = res));

    const req = httpMock.expectOne(API_ROUTES.anime.graphql);
    expect(req.request.method).toBe('POST');
    expect(req.request.body.variables).toEqual({ page: 2, perPage: 24, search: 'Mikasa', sort: ['FAVOURITES_DESC'] });
    req.flush(buildPageResponse());

    const char = result.data[0];
    expect(char.id).toBe(1);
    expect(char.name).toBe('Mikasa Ackerman');
    expect(char.nameNative).toBe('三笠・アッカーマン');
    expect(char.image).toBe('mikasa.jpg');
    expect(char.gender).toBe('Female');
    expect(char.favourites).toBe(500);
    expect(char.animeTitle).toBe('Attack on Titan');
    expect(char.animeId).toBe(10);
    expect(result.pagination).toEqual({ last_visible_page: 2, has_next_page: false, current_page: 1 });
  });

  it('getCharacters omite search quando vazio/em branco', () => {
    service.getCharacters(1, '   ').subscribe();

    const req = httpMock.expectOne(API_ROUTES.anime.graphql);
    expect(req.request.body.variables.search).toBeUndefined();
    req.flush(buildPageResponse());
  });

  it('getCharacters usa o sort informado', () => {
    service.getCharacters(1, undefined, 'ID').subscribe();

    const req = httpMock.expectOne(API_ROUTES.anime.graphql);
    expect(req.request.body.variables.sort).toEqual(['ID']);
    req.flush(buildPageResponse());
  });

  it('getCharacters trata campos ausentes com valores padrão', () => {
    let result: any;
    service.getCharacters(1).subscribe((res) => (result = res));

    const req = httpMock.expectOne(API_ROUTES.anime.graphql);
    req.flush(buildPageResponse([{ id: 9, name: { native: 'X' } }]));

    const char = result.data[0];
    expect(char.name).toBe('Desconhecido');
    expect(char.image).toBe('');
    expect(char.gender).toBeNull();
    expect(char.favourites).toBe(0);
    expect(char.animeTitle).toBe('');
    expect(char.animeId).toBeNull();
  });

  it('getByIds retorna lista vazia sem chamar a API quando ids é vazio', () => {
    let result: unknown = 'not-called';
    service.getByIds([]).subscribe((res) => (result = res));
    expect(result).toEqual([]);
    httpMock.expectNone(API_ROUTES.anime.graphql);
  });

  it('getByIds busca vários personagens', () => {
    service.getByIds([1, 2]).subscribe();

    const req = httpMock.expectOne(API_ROUTES.anime.graphql);
    expect(req.request.body.variables).toEqual({ ids: [1, 2] });
    req.flush({ data: { Page: { characters: [characterItem] } } });
  });

  it('getById mapeia os detalhes do personagem e extrai age/height da descrição', () => {
    let result!: CharacterDetailResult;
    const details = {
      id: 1,
      name: { full: 'Mikasa Ackerman', native: '三笠', alternative: ['Mikasa', 'Meka'] },
      image: { large: 'mikasa.jpg' },
      gender: 'Female',
      favourites: 500,
      description:
        '<b>Age: 15 years old<br>Height: 170 cm</b> Brave &amp; strong. <br><br> Loyal.',
      dateOfBirth: { year: 1999, month: 2, day: 10 },
      age: '15',
      bloodType: 'A',
      media: {
        nodes: [
          {
            id: 10,
            title: { romaji: 'Shingeki no Kyojin', english: 'Attack on Titan' },
            coverImage: { large: 'aot.jpg' },
            format: 'TV',
            episodes: 75,
            status: 'FINISHED',
          },
        ],
      },
    };

    service.getById(1).subscribe((res) => (result = res));

    const req = httpMock.expectOne(API_ROUTES.anime.graphql);
    expect(req.request.body.variables).toEqual({ id: 1 });
    req.flush({ data: { Character: details } });

    expect(result.name).toBe('Mikasa Ackerman');
    expect(result.nameNative).toBe('三笠');
    expect(result.alternative).toEqual(['Mikasa', 'Meka']);
    expect(result.dateOfBirth).toBe('10/02/1999');
    expect(result.age).toBe('15');
    expect(result.height).toBe('170 cm');
    expect(result.bloodType).toBe('A');
    expect(result.description).toContain('Brave & strong.');
    expect(result.media[0].title).toBe('Attack on Titan');
    expect(result.media[0].coverImage).toBe('aot.jpg');
    expect(result.media[0].format).toBe('TV');
  });

  it('getById extrai a idade da descrição quando a API não informa', () => {
    let result!: CharacterDetailResult;
    service.getById(2).subscribe((res) => (result = res));

    const req = httpMock.expectOne(API_ROUTES.anime.graphql);
    req.flush({ data: { Character: { id: 2, description: 'A mysterious girl, Age: 16.' } } });

    expect(result.age).toBe('16');
  });

  it('getById retorna data de nascimento vazia quando ela está incompleta', () => {
    let result!: CharacterDetailResult;
    service.getById(3).subscribe((res) => (result = res));

    const req = httpMock.expectOne(API_ROUTES.anime.graphql);
    req.flush({ data: { Character: { id: 3, dateOfBirth: { year: 2000 } } } });

    expect(result.dateOfBirth).toBe('');
  });
});