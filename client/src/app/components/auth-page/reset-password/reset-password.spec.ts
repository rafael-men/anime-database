import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { ResetPassword } from './reset-password';
import { AuthService } from '../../../../api/services/auth.service';
import { ToastService } from '../../../services/toast.service';

describe('ResetPassword', () => {
  let component: ResetPassword;
  let fixture: ComponentFixture<ResetPassword>;

  let resetPasswordMock: ReturnType<typeof vi.fn>;
  let toastMock: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };

  async function build(token: string | null) {
    resetPasswordMock = vi.fn(() => of({ message: 'ok' }));
    toastMock = { success: vi.fn(), error: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [ResetPassword],
      providers: [
        { provide: AuthService, useValue: { resetPassword: resetPasswordMock } },
        { provide: ToastService, useValue: toastMock },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: { get: () => token } } },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ResetPassword);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  }

  it('should create', async () => {
    await build('token-valido');
    expect(component).toBeTruthy();
  });

  it('le o token da query param', async () => {
    await build('token-valido');
    expect(component.token).toBe('token-valido');
  });

  it('bloqueia envio sem token na URL', async () => {
    await build(null);

    component.password = 'novasenha123';
    component.confirmPassword = 'novasenha123';
    component.onSubmit();

    expect(resetPasswordMock).not.toHaveBeenCalled();
    expect(component.errorMessage).toContain('Link inválido');
  });

  it('rejeita senha menor que 6 caracteres', async () => {
    await build('token-valido');

    component.password = '123';
    component.confirmPassword = '123';
    component.onSubmit();

    expect(resetPasswordMock).not.toHaveBeenCalled();
    expect(component.errorMessage).toContain('mínimo 6');
  });

  it('rejeita senhas que nao conferem', async () => {
    await build('token-valido');

    component.password = 'senha-nova-123';
    component.confirmPassword = 'outra-senha-123';
    component.onSubmit();

    expect(resetPasswordMock).not.toHaveBeenCalled();
    expect(component.errorMessage).toContain('não conferem');
  });

  it('envia token e senha validos', async () => {
    await build('token-valido');

    component.password = 'senha-nova-123';
    component.confirmPassword = 'senha-nova-123';
    component.onSubmit();

    expect(resetPasswordMock).toHaveBeenCalledWith('token-valido', 'senha-nova-123');
    expect(component.done).toBe(true);
    expect(component.isLoading).toBe(false);
  });

  it('exibe o erro devolvido pelo backend', async () => {
    await build('token-expirado');
    resetPasswordMock.mockReturnValue(
      throwError(() => ({ error: { message: 'Token invalido ou expirado.' } })) as never,
    );

    component.password = 'senha-nova-123';
    component.confirmPassword = 'senha-nova-123';
    component.onSubmit();

    expect(component.done).toBe(false);
    expect(component.errorMessage).toBe('Token invalido ou expirado.');
    expect(component.isLoading).toBe(false);
  });

  it('sugere novo link quando o token expira', async () => {
    await build('token-expirado');
    resetPasswordMock.mockReturnValue(throwError(() => ({})) as never);

    component.password = 'senha-nova-123';
    component.confirmPassword = 'senha-nova-123';
    component.onSubmit();

    expect(component.errorMessage).toContain('Solicite um novo link');
  });
});
