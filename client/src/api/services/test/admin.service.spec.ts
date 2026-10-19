import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { API_ROUTES } from '../../routes/routes';
import { AdminService } from '../admin.service';

/**
 * O acesso ao painel passou a ser por SSO (OIDC/Keycloak). Nao ha mais senha no
 * client: a sessao vem em cookie httpOnly e o CSRF em header lido de cookie.
 */
describe('AdminService', () => {
  let service: AdminService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AdminService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('deve ser criado', () => {
    expect(service).toBeTruthy();
  });

  it('getSession consulta a rota de sessao com credenciais', () => {
    service.getSession().subscribe((session) => {
      expect(session.username).toBe('admin');
    });

    const req = httpMock.expectOne(
      (r) => r.url === API_ROUTES.control.session && r.method === 'GET',
    );
    req.flush({ username: 'admin', email: 'admin@test.com', roles: ['admin'] });
  });

  it('getSession envia withCredentials para o cookie atravessar a origem', () => {
    service.getSession().subscribe();

    const req = httpMock.expectOne(API_ROUTES.control.session);
    expect(req.request.withCredentials).toBe(true);
    req.flush({ username: 'admin', email: 'a@b.com', roles: ['admin'] });
  });

  it('listRequests busca as solicitacoes com credenciais', () => {
    service.listRequests().subscribe((list) => {
      expect(list).toEqual([]);
    });

    const req = httpMock.expectOne(
      (r) => r.url === API_ROUTES.control.users && r.method === 'GET',
    );
    expect(req.request.withCredentials).toBe(true);
    req.flush([]);
  });

  it('approve faz POST sem header de autorizacao', () => {
    service.approve('u1').subscribe((updated) => {
      expect(updated.id).toBe('u1');
    });

    const req = httpMock.expectOne(
      (r) => r.url === API_ROUTES.control.userApprove('u1') && r.method === 'POST',
    );
    // Basic Auth saiu: o header nao deve mais existir.
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({ id: 'u1' });
  });

  it('deny faz POST sem header de autorizacao', () => {
    service.deny('u1').subscribe();

    const req = httpMock.expectOne(
      (r) => r.url === API_ROUTES.control.userDeny('u1') && r.method === 'POST',
    );
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({ id: 'u1' });
  });
});