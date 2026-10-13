import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../../../api/services/auth.service';
import { ToastService } from '../../../services/toast.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.css',
})
export class ForgotPassword {
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);

  isLoading = false;
  errorMessage = '';
  sent = false;
  email = '';

  onSubmit(): void {
    const email = this.email.trim().toLowerCase();

    if (!email) {
      this.errorMessage = 'Informe seu email para continuar.';
      this.toastService.error(this.errorMessage);
      return;
    }

    if (!email.includes('@')) {
      this.errorMessage = 'Informe um email válido.';
      this.toastService.error(this.errorMessage);
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this.authService
      .forgotPassword(email)
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: () => {
          // Nao dizemos se o email existe: o backend tambem nao diz.
          this.sent = true;
          this.toastService.success('Se o e-mail estiver cadastrado, enviaremos o link.');
        },
        error: (err) => {
          const error = err as { error?: { message?: string } };
          this.errorMessage = error?.error?.message ?? 'Erro ao solicitar o link. Tente novamente.';
          this.toastService.error(this.errorMessage);
        },
      });
  }
}
