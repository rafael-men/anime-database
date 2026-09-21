import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { API_ROUTES } from '../../routes/routes';
import { AdminService, AdultRequest } from '../admin.service';

describe('AdminService', () => {
  let service: AdminService;
  let httpMock: HttpTestingController;

  const email = 'admin@test.com';
  const password = 'secret123';
  const expectedAuth = `Basic ${btoa(`${email}:${password}`)}`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AdminService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    service.clearCredentials();
  });

  it('deve ser criado', () => {
    expect(service).toBeTruthy();
  });

  it('login envia GET para /control/users com Authorization Basic', () => {
    const response: AdultRequest[] = [];

    service.login(email, password).subscribe((res) => {
      expect(res).toEqual(response);
    });

    const req = httpMock.expectOne(API_ROUTES.control.users);
    expect(req.request.method).toBe('GET');
    expect(req.request.headers.get('Authorization')).toBe(expectedAuth);
    req.flush(response);
  });

  it('listRequests anexa as credenciais mantidas em memória', () => {
    service.setCredentials(email, password);

    service.listRequests().subscribe();

    const req = httpMock.expectOne(API_ROUTES.control.users);
    expect(req.request.headers.get('Authorization')).toBe(expectedAuth);
    req.flush([]);
  });

  it('approve usa as credenciais em memória e envia POST', () => {
    service.setCredentials(email, password);

    service.approve('user-1').subscribe();

    const req = httpMock.expectOne(API_ROUTES.control.userApprove('user-1'));
    expect(req.request.method).toBe('POST');
    expect(req.request.headers.get('Authorization')).toBe(expectedAuth);
    req.flush({ id: 'user-1' } as AdultRequest);
  });

  it('deny usa as credenciais em memória e envia POST', () => {
    service.setCredentials(email, password);

    service.deny('user-1').subscribe();

    const req = httpMock.expectOne(API_ROUTES.control.userDeny('user-1'));
    expect(req.request.method).toBe('POST');
    expect(req.request.headers.get('Authorization')).toBe(expectedAuth);
    req.flush({ id: 'user-1' } as AdultRequest);
  });

  it('sem credenciais não envia o header Authorization', () => {
    service.listRequests().subscribe();

    const req = httpMock.expectOne(API_ROUTES.control.users);
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush([]);
  });

  it('clearCredentials remove o estado e hasCredentials acompanha', () => {
    expect(service.hasCredentials()).toBe(false);

    service.setCredentials(email, password);
    expect(service.hasCredentials()).toBe(true);

    service.clearCredentials();
    expect(service.hasCredentials()).toBe(false);
  });

  it('não persiste as credenciais em nenhum storage do navegador', () => {
    service.setCredentials(email, password);

    expect(window.localStorage.getItem('admin_credentials')).toBeNull();
    expect(window.sessionStorage.getItem('admin_credentials')).toBeNull();
  });
});
