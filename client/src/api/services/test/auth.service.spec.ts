import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { API_ROUTES } from '../../routes/routes';
import { AuthResponse, AuthService } from '../auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('deve ser criado', () => {
    expect(service).toBeTruthy();
  });

  it('login envia POST para a rota de login com o payload', () => {
    const response: AuthResponse = {
      userId: '1',
      username: 'rafael',
      email: 'rafael@test.com',
      access_token: 'jwt-token',
    };

    service.login({ email: 'rafael@test.com', password: '123456' }).subscribe((res) => {
      expect(res).toEqual(response);
    });

    const req = httpMock.expectOne(API_ROUTES.auth.login);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ email: 'rafael@test.com', password: '123456' });
    req.flush(response);
  });

  it('register envia POST para a rota de register com o payload completo', () => {
    const response: AuthResponse = {
      userId: '2',
      username: 'maria',
      email: 'maria@test.com',
      avatarUrl: '/avatars/a.png',
      access_token: 'jwt-token',
    };

    service
      .register({ username: 'maria', email: 'maria@test.com', password: 'abc123', bio: 'oi' })
      .subscribe((res) => {
        expect(res).toEqual(response);
      });

    const req = httpMock.expectOne(API_ROUTES.auth.register);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      username: 'maria',
      email: 'maria@test.com',
      password: 'abc123',
      bio: 'oi',
    });
    req.flush(response);
  });

  it('register envia apenas os campos obrigatórios quando os opcionais são omitidos', () => {
    service.register({ username: 'maria', email: 'maria@test.com', password: 'abc123' }).subscribe();

    const req = httpMock.expectOne(API_ROUTES.auth.register);
    expect(req.request.body).toEqual({ username: 'maria', email: 'maria@test.com', password: 'abc123' });
    req.flush({} as AuthResponse);
  });
});