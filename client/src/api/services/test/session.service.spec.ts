import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { of, throwError } from 'rxjs';
import { SessionService, SessionUser } from '../session.service';
import { AuthService, AuthResponse } from '../auth.service';

const user: SessionUser = {
  userId: 'u1',
  username: 'rafael',
  email: 'rafael@test.com',
  avatarUrl: '/avatars/rafael.png',
};

const authResponse: AuthResponse = {
  userId: 'u1',
  username: 'rafael',
  email: 'rafael@test.com',
  avatarUrl: '/avatars/rafael.png',
  csrfToken: 'csrf-token',
};

describe('SessionService', () => {
  let service: SessionService;
  let authServiceMock: { logout: ReturnType<typeof vi.fn>; getSession: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    authServiceMock = {
      logout: vi.fn().mockReturnValue(of(undefined)),
      getSession: vi.fn().mockReturnValue(of(authResponse)),
    };

    TestBed.configureTestingModule({
      providers: [{ provide: AuthService, useValue: authServiceMock }],
    });
    service = TestBed.inject(SessionService);
    localStorage.clear();
    sessionStorage.clear();
  });

  it('deve ser criado', () => {
    expect(service).toBeTruthy();
  });

  it('setSession grava o usuário no localStorage', () => {
    service.setSession(user);

    expect(service.getUser()).toEqual(user);
  });

  it('setUser e getUser recuperam o usuário gravado', () => {
    service.setUser(user);

    expect(service.getUser()).toEqual(user);
  });

  it('updateUser mescla os campos informados', () => {
    service.setUser(user);

    service.updateUser({ username: 'rafa', avatarUrl: null });

    expect(service.getUser()).toEqual({
      userId: 'u1',
      username: 'rafa',
      email: 'rafael@test.com',
      avatarUrl: null,
    });
  });

  it('updateUser não faz nada quando não há usuário logado', () => {
    service.updateUser({ username: 'x' });
    expect(service.getUser()).toBeNull();
  });

  it('setCsrfToken e getCsrfToken usam o sessionStorage', () => {
    service.setCsrfToken('csrf-token');

    expect(sessionStorage.getItem('csrf_token')).toBe('csrf-token');
    expect(service.getCsrfToken()).toBe('csrf-token');
  });

  it('isAuthenticated retorna true quando há usuário e false quando não há', () => {
    expect(service.isAuthenticated()).toBe(false);

    service.setUser(user);

    expect(service.isAuthenticated()).toBe(true);
  });

  it('clearSession remove usuário e token csrf', () => {
    service.setUser(user);
    service.setCsrfToken('csrf-token');

    service.clearSession();

    expect(service.getUser()).toBeNull();
    expect(service.getCsrfToken()).toBeNull();
    expect(service.isAuthenticated()).toBe(false);
  });

  it('getUser retorna null quando o JSON é inválido', () => {
    localStorage.setItem('user', 'não é json');

    expect(service.getUser()).toBeNull();
  });

  it('getUser retorna null quando faltam campos obrigatórios', () => {
    localStorage.setItem('user', JSON.stringify({ userId: 'u1' }));

    expect(service.getUser()).toBeNull();
  });

  it('getUser retorna null sem usuário gravado', () => {
    expect(service.getUser()).toBeNull();
  });

  it('restoreSession popula usuário e csrf quando o servidor responde', async () => {
    const ok = await service.restoreSession();

    expect(ok).toBe(true);
    expect(authServiceMock.getSession).toHaveBeenCalled();
    expect(service.getUser()).toEqual(user);
    expect(service.getCsrfToken()).toBe('csrf-token');
  });

  it('restoreSession limpa a sessão quando o servidor responde 401', async () => {
    authServiceMock.getSession.mockReturnValue(throwError(() => new Error('unauthorized')));
    service.setUser(user);
    service.setCsrfToken('csrf-token');

    const ok = await service.restoreSession();

    expect(ok).toBe(false);
    expect(service.getUser()).toBeNull();
    expect(service.getCsrfToken()).toBeNull();
  });

  it('logout revoga a sessão no servidor e limpa o armazenamento local', () => {
    service.setUser(user);
    service.setCsrfToken('csrf-token');

    service.logout();

    expect(authServiceMock.logout).toHaveBeenCalled();
    expect(service.getUser()).toBeNull();
    expect(service.getCsrfToken()).toBeNull();
  });
});