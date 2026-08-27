import { TestBed } from '@angular/core/testing';
import { of, throwError, firstValueFrom } from 'rxjs';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TranslatePipe } from './translate-pipe';
import { TranslateService } from './../api/services/translate.service';

describe('TranslatePipe', () => {
  let pipe: TranslatePipe;
  let translateServiceSpy: { translate: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    translateServiceSpy = {
      translate: vi.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        TranslatePipe,
        { provide: TranslateService, useValue: translateServiceSpy }
      ]
    });

    pipe = TestBed.inject(TranslatePipe);
  });

  it('deve ser criado', () => {
    expect(pipe).toBeTruthy();
  });

  it('deve retornar um Observable com o texto traduzido', async () => {
    const originalText = 'A brave warrior from the north.';
    const translatedText = 'Um guerreiro corajoso do norte.';
    translateServiceSpy.translate.mockReturnValue(of(translatedText));

    const result = await firstValueFrom(pipe.transform(originalText));

    expect(result).toBe(translatedText);
  });

  it('deve chamar o TranslateService com o idioma padrão "pt" quando nenhum target é passado', () => {
    translateServiceSpy.translate.mockReturnValue(of('texto traduzido'));

    pipe.transform('some text').subscribe();

    expect(translateServiceSpy.translate).toHaveBeenCalledWith('some text', 'pt');
  });

  it('deve chamar o TranslateService com o idioma customizado quando informado', () => {
    translateServiceSpy.translate.mockReturnValue(of('texto traduzido'));

    pipe.transform('some text', 'es').subscribe();

    expect(translateServiceSpy.translate).toHaveBeenCalledWith('some text', 'es');
  });

  it('deve lidar com string vazia', async () => {
    translateServiceSpy.translate.mockReturnValue(of(''));

    const result = await firstValueFrom(pipe.transform(''));

    expect(result).toBe('');
  });

  it('deve propagar erro caso o Observable do service emita erro', async () => {
    translateServiceSpy.translate.mockReturnValue(throwError(() => new Error('API error')));

    await expect(firstValueFrom(pipe.transform('texto qualquer'))).rejects.toThrow('API error');
  });

  it('deve chamar o TranslateService apenas uma vez por transform', () => {
    translateServiceSpy.translate.mockReturnValue(of('texto traduzido'));

    pipe.transform('some text').subscribe();

    expect(translateServiceSpy.translate).toHaveBeenCalledTimes(1);
  });
});