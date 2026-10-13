import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { ForgotPassword } from './forgot-password';
import { AuthService } from '../../../../api/services/auth.service';
import { ToastService } from '../../../services/toast.service';

describe('ForgotPassword', () => {
  let component: ForgotPassword;
  let fixture: ComponentFixture<ForgotPassword>;

  let forgotPasswordMock: ReturnType<typeof vi.fn>;
  let toastMock: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    forgotPasswordMock = vi.fn(() => of({ message: 'ok' }));
    toastMock = { success: vi.fn(), error: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [ForgotPassword],
      providers: [
        { provide: AuthService, useValue: { forgotPassword: forgotPasswordMock } },
        { provide: ToastService, useValue: toastMock },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: { get: () => null } } } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ForgotPassword);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('nao chama a API sem email', () => {
    component.email = '   ';
    component.onSubmit();

    expect(forgotPasswordMock).not.toHaveBeenCalled();
    expect(component.sent).toBe(false);
    expect(component.errorMessage).toContain('Informe seu email');
  });

  it('rejeita email invalido antes da API', () => {
    component.email = 'nao-e-email';
    component.onSubmit();

    expect(forgotPasswordMock).not.toHaveBeenCalled();
    expect(component.errorMessage).toContain('email válido');
  });

  it('envia o email normalizado e mostra a confirmacao', () => {
    component.email = '  Rafa@Gmail.COM ';
    component.onSubmit();

    expect(forgotPasswordMock).toHaveBeenCalledWith('rafa@gmail.com');
    expect(component.sent).toBe(true);
    expect(component.isLoading).toBe(false);
  });

  it('a mensagem nao revela se o email existe', () => {
    component.email = 'ninguem@test.com';
    component.onSubmit();

    expect(component.sent).toBe(true);
    expect(toastMock.success).toHaveBeenCalledWith(
      'Se o e-mail estiver cadastrado, enviaremos o link.',
    );
  });

  it('exibe o erro quando a API falha', () => {
    forgotPasswordMock.mockReturnValue(
      throwError(() => ({ error: { message: 'Rate limit excedido.' } })) as never,
    );

    component.email = 'rafa@gmail.com';
    component.onSubmit();

    expect(component.sent).toBe(false);
    expect(component.errorMessage).toBe('Rate limit excedido.');
    expect(component.isLoading).toBe(false);
  });

  it('usa mensagem padrao quando o erro nao tem mensagem', () => {
    forgotPasswordMock.mockReturnValue(throwError(() => ({})) as never);

    component.email = 'rafa@gmail.com';
    component.onSubmit();

    expect(component.errorMessage).toContain('Tente novamente');
  });
});
