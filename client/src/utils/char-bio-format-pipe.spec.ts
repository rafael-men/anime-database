import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CharBioFormatPipe } from './char-bio-format-pipe';
import { DomSanitizer } from '@angular/platform-browser';
import { SecurityContext } from '@angular/core';

describe('CharBioFormatPipe', () => {
  let pipe: CharBioFormatPipe;
  let sanitizerSpy: {
    sanitize: ReturnType<typeof vi.fn>;
    bypassSecurityTrustHtml: ReturnType<typeof vi.fn>;
  };

  const basicSanitize = (html: string): string =>
    html
      .replace(/\son\w+="[^"]*"/g, '')
      .replace(/(<a\b[^>]*\bhref=")javascript:[^"]*(")/gi, '$1$2')
      .replace(/<script[\s\S]*?<\/script>/gi, '');

  beforeEach(() => {
    sanitizerSpy = {
      sanitize: vi.fn((_ctx: SecurityContext, html: string) => basicSanitize(String(html))),
      bypassSecurityTrustHtml: vi.fn((html: string) => html)
    };
    pipe = new CharBioFormatPipe(sanitizerSpy as unknown as DomSanitizer);
  });

  it('create an instance', () => {
    expect(pipe).toBeTruthy();
  });

  it('retorna string vazia para null, undefined e string vazia', () => {
    expect(pipe.transform(null)).toBe('');
    expect(pipe.transform(undefined)).toBe('');
    expect(pipe.transform('')).toBe('');
  });

  it('escapa HTML de entrada (incluindo aspas)', () => {
    expect(pipe.transform('<script>alert("x")</script>&')).toBe(
      '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;&amp;'
    );
    expect(pipe.transform(`'aspas'`)).toBe('&#39;aspas&#39;');
  });

  it('remove o prefixo de bloqueio "__ " no início', () => {
    expect(pipe.transform('__ Este perfil está bloqueado.')).toBe('Este perfil está bloqueado.');
  });

  it('converte **texto** e __texto__ em <strong>', () => {
    expect(pipe.transform('**negrito**')).toBe('<strong>negrito</strong>');
    expect(pipe.transform('__negrito__')).toBe('<strong>negrito</strong>');
  });

  it('converte *texto* e _texto_ em <em>', () => {
    expect(pipe.transform('*itálico*')).toBe('<em>itálico</em>');
    expect(pipe.transform('_itálico_')).toBe('<em>itálico</em>');
  });

  it('converte [texto](https://url) em link com target blank', () => {
    expect(pipe.transform('[MeuAnime](https://example.com/anime)')).toBe(
      '<a href="https://example.com/anime" target="_blank" rel="noopener noreferrer">MeuAnime</a>'
    );
  });

  it('mantém javascript: e aspas como texto escapado (sem gerar link/atributo)', () => {
    const jsUrl = String(pipe.transform('[x](javascript:alert(1))'));
    expect(jsUrl).not.toContain('<a');
    expect(jsUrl).toBe('[x](javascript:alert(1))');

    const attr = String(pipe.transform('[x](https://a.com" onmouseover="alert(1))'));
    expect(attr).toBe('[x](https://a.com&quot; onmouseover=&quot;alert(1))');
  });

  it('converte ~!spoiler!~ em span com classe spoiler por padrão', () => {
    expect(pipe.transform('~!morte do protagonista!~')).toBe(
      '<span class="spoiler">morte do protagonista</span>'
    );
  });

  it('revela o conteúdo de ~!spoiler!~ quando hideSpoilers é false', () => {
    expect(pipe.transform('~!morte do protagonista!~', false)).toBe('morte do protagonista');
  });

  it('combina markdown de forma encadeada', () => {
    const input = '**Olá**, veja [aqui](https://example.com) ~!spoiler!~';
    const expected =
      '<strong>Olá</strong>, veja <a href="https://example.com" target="_blank" rel="noopener noreferrer">aqui</a> ' +
      '<span class="spoiler">spoiler</span>';
    expect(pipe.transform(input)).toBe(expected);
  });

  it('passa o HTML gerado pelo sanitizer antes de confiar nele', () => {
    pipe.transform('**negrito**');

    expect(sanitizerSpy.sanitize).toHaveBeenCalledWith(
      SecurityContext.HTML,
      '<strong>negrito</strong>'
    );
    expect(sanitizerSpy.bypassSecurityTrustHtml).toHaveBeenCalledWith('<strong>negrito</strong>');
  });

  it('encaminha o resultado sanitizado para bypassSecurityTrustHtml', () => {
    pipe.transform('<script>alert(1)</script>');

    const sanitized = sanitizerSpy.sanitize.mock.results[0].value;
    expect(sanitizerSpy.bypassSecurityTrustHtml).toHaveBeenCalledWith(sanitized);
  });
});