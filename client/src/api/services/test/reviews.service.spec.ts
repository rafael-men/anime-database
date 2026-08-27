import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { API_ROUTES } from '../../routes/routes';
import { AnimeReview, ReviewResponse, ReviewsService } from '../reviews.service';

const review: AnimeReview = {
  id: 'r1',
  userId: 'u1',
  username: 'rafael',
  avatarUrl: null,
  rating: 9,
  comment: 'Muito bom',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

describe('ReviewsService', () => {
  let service: ReviewsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ReviewsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('deve ser criado', () => {
    expect(service).toBeTruthy();
  });

  it('getAnimeReviews faz GET na rota de reviews do anime', () => {
    service.getAnimeReviews(55).subscribe((res) => {
      expect(res).toEqual([review]);
    });

    const req = httpMock.expectOne(API_ROUTES.reviews.byAnime(55));
    expect(req.request.method).toBe('GET');
    req.flush([review]);
  });

  it('createReview envia POST com externalAnimeId em string e rating', () => {
    const response: ReviewResponse = {
      id: 'r1',
      userId: 'u1',
      externalAnimeId: '55',
      rating: 9,
      comment: 'Muito bom',
    };

    service.createReview('u1', 55, 9, '  Muito bom  ').subscribe((res) => {
      expect(res).toEqual(response);
    });

    const req = httpMock.expectOne(API_ROUTES.reviews.create('u1'));
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ externalAnimeId: '55', rating: 9, comment: 'Muito bom' });
    req.flush(response);
  });

  it('createReview omite o comentário quando ele é vazio ou só espaços', () => {
    service.createReview('u1', 55, 7, '   ').subscribe();

    const req = httpMock.expectOne(API_ROUTES.reviews.create('u1'));
    expect(req.request.body).toEqual({ externalAnimeId: '55', rating: 7 });
    req.flush({} as ReviewResponse);
  });
});