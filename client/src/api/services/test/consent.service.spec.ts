import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { API_ROUTES } from '../../routes/routes';
import { ConsentService, ConsentStatus } from '../consent.service';

const UNDECIDED: ConsentStatus = {
  version: '1',
  decided: false,
  necessary: true,
  analytics: false,
  marketing: false,
  decidedAt: null,
};

const ACCEPTED: ConsentStatus = {
  version: '1',
  decided: true,
  necessary: true,
  analytics: true,
  marketing: true,
  decidedAt: '2026-10-21T00:00:00.000Z',
};

describe('ConsentService', () => {
  let service: ConsentService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ConsentService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('deve ser criado', () => {
    expect(service).toBeTruthy();
  });

  it('não mostra o banner antes de carregar o estado', () => {
    expect(service.bannerVisible()).toBe(false);
  });

  it('mostra o banner quando ainda não houve decisão', async () => {
    const loading = service.load();

    httpMock.expectOne(API_ROUTES.consent.base).flush(UNDECIDED);
    await loading;

    expect(service.status()).toEqual(UNDECIDED);
    expect(service.bannerVisible()).toBe(true);
    expect(service.allows('analytics')).toBe(false);
  });

  it('esconde o banner quando já existe decisão', async () => {
    const loading = service.load();

    httpMock.expectOne(API_ROUTES.consent.base).flush(ACCEPTED);
    await loading;

    expect(service.bannerVisible()).toBe(false);
    expect(service.allows('analytics')).toBe(true);
    expect(service.allows('marketing')).toBe(true);
  });

  it('acceptAll grava as duas categorias opcionais', async () => {
    const saving = service.acceptAll();

    const request = httpMock.expectOne(API_ROUTES.consent.base);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ analytics: true, marketing: true });
    request.flush(ACCEPTED);

    await saving;

    expect(service.bannerVisible()).toBe(false);
    expect(service.allows('analytics')).toBe(true);
  });

  it('acceptEssentialOnly mantém as categorias opcionais desligadas', async () => {
    const saving = service.acceptEssentialOnly();

    const request = httpMock.expectOne(API_ROUTES.consent.base);
    expect(request.request.body).toEqual({ analytics: false, marketing: false });
    request.flush({ ...UNDECIDED, decided: true, decidedAt: '2026-10-21T00:00:00.000Z' });

    await saving;

    expect(service.bannerVisible()).toBe(false);
    expect(service.allows('analytics')).toBe(false);
    expect(service.allows('marketing')).toBe(false);
  });

  it('propaga erro ao salvar para a UI avisar o usuário', async () => {
    const saving = service.acceptAll();

    httpMock
      .expectOne(API_ROUTES.consent.base)
      .flush(null, { status: 500, statusText: 'Server Error' });

    await expect(saving).rejects.toBeTruthy();
    expect(service.bannerVisible()).toBe(false);
  });

  it('mostra o banner se a API falhar (nunca presume aceite)', async () => {
    const loading = service.load();

    httpMock
      .expectOne(API_ROUTES.consent.base)
      .flush(null, { status: 503, statusText: 'Unavailable' });

    await loading;

    expect(service.bannerVisible()).toBe(true);
    expect(service.allows('analytics')).toBe(false);
  });
});
