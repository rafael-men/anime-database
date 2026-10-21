import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WritableSignal, signal } from '@angular/core';
import { vi } from 'vitest';

import { CookieConsentBanner } from './cookie-consent-banner';
import { ConsentService } from '../../../api/services/consent.service';
import { ToastService } from '../../services/toast.service';

describe('CookieConsentBanner', () => {
  let fixture: ComponentFixture<CookieConsentBanner>;
  let visible: WritableSignal<boolean>;
  let consentMock: {
    bannerVisible: WritableSignal<boolean>;
    saving: WritableSignal<boolean>;
    load: ReturnType<typeof vi.fn>;
    acceptAll: ReturnType<typeof vi.fn>;
    acceptEssentialOnly: ReturnType<typeof vi.fn>;
  };
  let toastMock: { error: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    visible = signal(true);
    consentMock = {
      bannerVisible: visible,
      saving: signal(false),
      load: vi.fn().mockResolvedValue(undefined),
      acceptAll: vi.fn().mockResolvedValue(undefined),
      acceptEssentialOnly: vi.fn().mockResolvedValue(undefined),
    };
    toastMock = { error: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [CookieConsentBanner],
      providers: [
        { provide: ConsentService, useValue: consentMock },
        { provide: ToastService, useValue: toastMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CookieConsentBanner);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('carrega o consentimento ao iniciar', () => {
    expect(consentMock.load).toHaveBeenCalled();
  });

  it('renderiza o banner quando não há decisão', () => {
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('.cookie-banner')).not.toBeNull();
    expect(element.textContent).toContain('Aceitar todos');
    expect(element.textContent).toContain('Só os essenciais');
  });

  it('não renderiza o banner quando já houve decisão', () => {
    visible.set(false);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.cookie-banner')).toBeNull();
  });

  it('aceitar todos chama o serviço', () => {
    const buttons = fixture.nativeElement.querySelectorAll('button');

    (buttons[1] as HTMLButtonElement).click();

    expect(consentMock.acceptAll).toHaveBeenCalled();
  });

  it('só os essenciais chama o serviço', () => {
    const buttons = fixture.nativeElement.querySelectorAll('button');

    (buttons[0] as HTMLButtonElement).click();

    expect(consentMock.acceptEssentialOnly).toHaveBeenCalled();
  });

  it('avisa o usuário quando não consegue salvar', async () => {
    consentMock.acceptAll.mockRejectedValue(new Error('falha'));

    (fixture.nativeElement.querySelectorAll('button')[1] as HTMLButtonElement).click();
    await fixture.whenStable();

    expect(toastMock.error).toHaveBeenCalledWith(
      'Não foi possível salvar sua preferência de cookies. Tente novamente.',
    );
  });
});
