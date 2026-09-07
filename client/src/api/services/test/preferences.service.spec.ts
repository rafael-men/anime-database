import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { API_ROUTES } from '../../routes/routes';
import { UserProfile, UsersService } from '../users.service';
import { PreferencesService } from '../preferences.service';

const profile: UserProfile = {
  id: 'u1',
  username: 'rafael',
  email: 'rafael@test.com',
  nsfwFilter: true,
  createdAt: '2024-01-01T00:00:00Z',
};

describe('PreferencesService', () => {
  let service: PreferencesService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(PreferencesService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('deve ser criado com nsfwFilter desativado por padrão', () => {
    expect(service).toBeTruthy();
    expect(service.nsfwFilter()).toBe(false);
    expect(service.adultContent()).toBe(false);
    expect(service.adultRequestStatus()).toBe('none');
    expect(service.birthDate()).toBeNull();
  });

  it('setNsfwFilter atualiza o sinal', () => {
    service.setNsfwFilter(true);
    expect(service.nsfwFilter()).toBe(true);
  });

  it('saveNsfwFilter envia POST de preferências e atualiza o sinal de forma otimista', async () => {
    service.setNsfwFilter(false);

    const promise = service.saveNsfwFilter('u1', true);
    expect(service.nsfwFilter()).toBe(true);

    const req = httpMock.expectOne(API_ROUTES.users.updateProfile('u1'));
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ nsfwFilter: true });
    req.flush(profile);

    await promise;
    expect(service.nsfwFilter()).toBe(true);
  });

  it('saveNsfwFilter reverte o sinal quando a requisição falha', async () => {
    service.setNsfwFilter(false);

    const promise = service.saveNsfwFilter('u1', true);

    const req = httpMock.expectOne(API_ROUTES.users.updateProfile('u1'));
    req.flush('erro', { status: 500, statusText: 'Internal Server Error' });

    await expect(promise).rejects.toThrow();
    expect(service.nsfwFilter()).toBe(false);
  });

  it('setAdultRequestStatus atualiza status e adultContent', () => {
    service.setAdultRequestStatus('pending');
    expect(service.adultRequestStatus()).toBe('pending');
    expect(service.adultContent()).toBe(false);

    service.setAdultRequestStatus('approved');
    expect(service.adultRequestStatus()).toBe('approved');
    expect(service.adultContent()).toBe(true);

    service.setAdultRequestStatus('denied');
    expect(service.adultRequestStatus()).toBe('denied');
    expect(service.adultContent()).toBe(false);
  });

  it('saveAdultContent(true) define status pending e envia adultContentEnabled e birthDate', async () => {
    const promise = service.saveAdultContent('u1', true, '2000-01-15');
    expect(service.adultRequestStatus()).toBe('pending');
    expect(service.adultContent()).toBe(false);

    const req = httpMock.expectOne(API_ROUTES.users.updateProfile('u1'));
    expect(req.request.body).toEqual({
      adultContentEnabled: true,
      birthDate: '2000-01-15',
    });
    req.flush(profile);

    await promise;
    expect(service.adultRequestStatus()).toBe('pending');
    expect(service.adultContent()).toBe(false);
    expect(service.birthDate()).toBe('2000-01-15');
  });

  it('saveAdultContent(false) define status none e não altera o sinal de birthDate', async () => {
    service.setBirthDate('1990-05-05');

    const promise = service.saveAdultContent('u1', false);
    expect(service.adultRequestStatus()).toBe('none');

    const req = httpMock.expectOne(API_ROUTES.users.updateProfile('u1'));
    expect(req.request.body).toEqual({ adultContentEnabled: false });
    req.flush(profile);

    await promise;
    expect(service.adultContent()).toBe(false);
    expect(service.adultRequestStatus()).toBe('none');
    expect(service.birthDate()).toBe('1990-05-05');
  });

  it('saveAdultContent reverte pending quando a requisição falha', async () => {
    const promise = service.saveAdultContent('u1', true, '2000-01-15');
    expect(service.adultRequestStatus()).toBe('pending');

    const req = httpMock.expectOne(API_ROUTES.users.updateProfile('u1'));
    req.flush('erro', { status: 400, statusText: 'Bad Request' });

    await expect(promise).rejects.toThrow();
    expect(service.adultContent()).toBe(false);
    expect(service.adultRequestStatus()).toBe('none');
    expect(service.birthDate()).toBeNull();
  });
});