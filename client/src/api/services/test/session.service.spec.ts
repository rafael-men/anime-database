import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { SessionService, SessionUser } from '../session.service';

function toBase64Url(value: string): string {
  return btoa(value).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function createToken(exp?: number): string {
  const header = toBase64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = toBase64Url(JSON.stringify(exp !== undefined ? { exp } : { sub: 'u1' }));
  return `${header}.${payload}.assinatura`;
}

const user: SessionUser = {
  userId: 'u1',
  username: 'rafael',
  email: 'rafael@test.com',
  avatarUrl: '/avatars/rafael.png',
};

describe('SessionService', () => {
  let service: SessionService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SessionService);
    sessionStorage.clear();
  });

  it('deve ser criado', () => {
    expect(service).toBeTruthy();
  });

  it('setSession grava token e usuário no sessionStorage', () => {
    service.setSession('jwt-token', user);

    expect(sessionStorage.getItem('access_token')).toBe('jwt-token');
    expect(sessionStorage.getItem('user')).toBe(JSON.stringify(user));
  });

  it('getToken e getUser recuperam os valores gravados', () => {
    service.setSession('jwt-token', user);

    expect(service.getToken()).toBe('jwt-token');
    expect(service.getUser()).toEqual(user);
  });

  it('updateUser mescla os campos informados', () => {
    service.setSession('jwt-token', user);

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

  it('clearSession remove token e usuário', () => {
    service.setSession('jwt-token', user);

    service.clearSession();

    expect(service.getToken()).toBeNull();
    expect(service.getUser()).toBeNull();
    expect(service.isAuthenticated()).toBe(false);
  });

  it('getUser retorna null quando o JSON é inválido', () => {
    sessionStorage.setItem('user', 'não é json');

    expect(service.getUser()).toBeNull();
  });

  it('getUser retorna null quando faltam campos obrigatórios', () => {
    sessionStorage.setItem('user', JSON.stringify({ userId: 'u1' }));

    expect(service.getUser()).toBeNull();
  });

  it('getUser retorna null sem usuário gravado', () => {
    expect(service.getUser()).toBeNull();
  });

  it('isAuthenticated retorna true com token válido e não expirado', () => {
    const exp = Math.floor(Date.now() / 1000) + 3600;
    service.setSession(createToken(exp), user);

    expect(service.isAuthenticated()).toBe(true);
  });

  it('isAuthenticated limpa a sessão quando o token expirou', () => {
    const exp = Math.floor(Date.now() / 1000) - 10;
    service.setSession(createToken(exp), user);

    expect(service.isAuthenticated()).toBe(false);
    expect(service.getToken()).toBeNull();
  });

  it('isAuthenticated retorna false para token malformado', () => {
    service.setSession('token-sem-tres-partes', user);

    expect(service.isAuthenticated()).toBe(false);
  });
});