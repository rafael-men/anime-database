import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { API_ROUTES } from '../../routes/routes';
import { UserProfile, UsersService } from '../users.service';

const profile: UserProfile = {
  id: 'u1',
  username: 'rafael',
  email: 'rafael@test.com',
  avatarUrl: '/avatars/rafael.png',
  bio: 'Apaixonado por animes',
  favoriteCharacterIds: [1, 2],
  createdAt: '2024-01-01T00:00:00Z',
};

describe('UsersService', () => {
  let service: UsersService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(UsersService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('deve ser criado', () => {
    expect(service).toBeTruthy();
  });

  it('getProfile faz GET na rota de perfil do usuário', () => {
    service.getProfile('u1').subscribe((res) => {
      expect(res).toEqual(profile);
    });

    const req = httpMock.expectOne(API_ROUTES.users.profile('u1'));
    expect(req.request.method).toBe('GET');
    req.flush(profile);
  });

  it('updateProfile envia POST com o payload de atualização', () => {
    const payload = { username: 'rafa', bio: 'Nova bio' };

    service.updateProfile('u1', payload).subscribe((res) => {
      expect(res).toEqual(profile);
    });

    const req = httpMock.expectOne(API_ROUTES.users.updateProfile('u1'));
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush(profile);
  });

  it('uploadAvatar envia POST com FormData contendo o arquivo', () => {
    const file = new File(['conteudo'], 'avatar.png', { type: 'image/png' });

    service.uploadAvatar('u1', file).subscribe((res) => {
      expect(res).toEqual(profile);
    });

    const req = httpMock.expectOne(API_ROUTES.users.avatar('u1'));
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toBeInstanceOf(FormData);
    expect((req.request.body as FormData).get('file')).toBe(file);
    req.flush(profile);
  });

  it('getReviews faz GET na rota de reviews do usuário', () => {
    service.getReviews('u1').subscribe((res) => {
      expect(res).toEqual([]);
    });

    const req = httpMock.expectOne(API_ROUTES.users.reviews('u1'));
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('getKinCount mapeia { count } para um número', () => {
    let result = 0;
    service.getKinCount(7).subscribe((res) => (result = res));

    const req = httpMock.expectOne(API_ROUTES.users.kinCount(7));
    expect(req.request.method).toBe('GET');
    req.flush({ count: 42 });

    expect(result).toBe(42);
  });

  it('checkUsername consulta a disponibilidade com o username em query param', () => {
    service.checkUsername('u1', 'rafa').subscribe((res) => {
      expect(res).toEqual({ available: true });
    });

    const req = httpMock.expectOne((r) => r.url === API_ROUTES.users.usernameAvailability('u1'));
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('username')).toBe('rafa');
    req.flush({ available: true });
  });
});