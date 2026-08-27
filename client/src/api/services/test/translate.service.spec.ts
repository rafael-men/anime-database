import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TranslateService } from '../translate.service';

const API_BASE = 'https://translate.googleapis.com/translate_a/single';

function hasTranslateRequest(req: { method: string; url: string }): boolean {
  return req.method === 'GET' && req.url.startsWith(API_BASE);
}

describe('TranslateService', () => {
  let service: TranslateService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(TranslateService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('deve ser criado', () => {
    expect(service).toBeTruthy();
  });

  it('retorna string vazia sem chamar a API para texto vazio', () => {
    let result: unknown = 'not-called';
    service.translate('').subscribe((res) => (result = res));

    expect(result).toBe('');
    httpMock.expectNone((req) => hasTranslateRequest(req));
  });

  it('faz GET para a API com os parâmetros do idioma padrão pt', () => {
    let result = '';
    service.translate('hello').subscribe((res) => (result = res));

    const req = httpMock.expectOne((r) => hasTranslateRequest(r));
    expect(req.request.params.get('client')).toBe('gtx');
    expect(req.request.params.get('sl')).toBe('en');
    expect(req.request.params.get('tl')).toBe('pt');
    expect(req.request.params.get('q')).toBe('hello');
    req.flush([[['olá', 'hello', null, null, 10]]]);

    expect(result).toBe('olá');
  });

  it('usa o idioma alvo informado', () => {
    service.translate('hello', 'es').subscribe();

    const req = httpMock.expectOne((r) => hasTranslateRequest(r));
    expect(req.request.params.get('tl')).toBe('es');
    req.flush([[['hola', 'hello', null, null, 10]]]);
  });

  it('junta múltiplos segmentos da resposta em um único texto', () => {
    let result = '';
    service.translate('hello world').subscribe((res) => (result = res));

    const req = httpMock.expectOne((r) => hasTranslateRequest(r));
    req.flush([
      [
        ['olá', 'hello', null, null, 10],
        [' mundo', ' world', null, null, 10],
      ],
    ]);

    expect(result).toBe('olá mundo');
  });

  it('em cache: chamadas repetidas para a mesma chave não refazem a requisição', () => {
    service.translate('hello').subscribe();
    const req = httpMock.expectOne((r) => hasTranslateRequest(r));
    req.flush([[['olá', 'hello', null, null, 10]]]);

    let result = '';
    service.translate('hello').subscribe((res) => (result = res));

    expect(result).toBe('olá');
    httpMock.expectNone((r) => hasTranslateRequest(r));
  });

  it('não mistura o cache entre idiomas diferentes', () => {
    service.translate('hello', 'es').subscribe();
    httpMock.expectOne((r) => hasTranslateRequest(r)).flush([[['hola', 'hello', null, null, 10]]]);

    service.translate('hello', 'pt').subscribe();
    const req = httpMock.expectOne((r) => hasTranslateRequest(r));
    expect(req.request.params.get('tl')).toBe('pt');
    req.flush([[['olá', 'hello', null, null, 10]]]);
  });

  it('em caso de erro, devolve o texto original, não travando', () => {
    let result = '';
    let errored = false;
    service.translate('manter texto').subscribe({
      next: (res) => (result = res),
      error: () => (errored = true),
    });

    const req = httpMock.expectOne((r) => hasTranslateRequest(r));
    req.error(new ProgressEvent('error') as any);

    expect(errored).toBe(false);
    expect(result).toBe('manter texto');
  });
});