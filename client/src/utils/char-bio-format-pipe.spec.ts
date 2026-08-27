import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CharBioFormatPipe } from './char-bio-format-pipe';
import { DomSanitizer } from '@angular/platform-browser';

describe('CharBioFormatPipe', () => {
  let pipe: CharBioFormatPipe;
  let sanitizerSpy: { bypassSecurityTrustHtml: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    sanitizerSpy = {
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

  it('escapa HTML de entrada', () => {
    expect(pipe.transform('<script>alert("x")</script>&')).toBe(
      '&lt;script&gt;alert("x")&lt;/script&gt;&amp;'
    );
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

  it('converte ~!spoiler!~ em span com classe spoiler por padrão', () => {
    expect(pipe.transform('~!morte do protagonista!~')).toBe(
      '<span class="spoiler" onclick="this.classList.toggle(\'revealed\')">morte do protagonista</span>'
    );
  });

  it('revela o conteúdo de ~!spoiler!~ quando hideSpoilers é false', () => {
    expect(pipe.transform('~!morte do protagonista!~', false)).toBe('morte do protagonista');
  });

  it('combina markdown de forma encadeada', () => {
    const input = '**Olá**, veja [aqui](https://example.com) ~!spoiler!~';
    const expected =
      '<strong>Olá</strong>, veja <a href="https://example.com" target="_blank" rel="noopener noreferrer">aqui</a> ' +
      '<span class="spoiler" onclick="this.classList.toggle(\'revealed\')">spoiler</span>';
    expect(pipe.transform(input)).toBe(expected);
  });

  it('chama bypassSecurityTrustHtml com o HTML gerado', () => {
    pipe.transform('**negrito**');

    expect(sanitizerSpy.bypassSecurityTrustHtml).toHaveBeenCalledWith('<strong>negrito</strong>');
  });
});