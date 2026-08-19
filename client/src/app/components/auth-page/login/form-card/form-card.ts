import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService, AuthResponse } from '../../../../../api/services/auth.service';
import { SessionService } from '../../../../../api/services/session.service';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-form-card',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './form-card.html',
  styleUrl: './form-card.css',
})
export class FormCard {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly sessionService = inject(SessionService);

  isLoading = false;
  errorMessage = '';

  email = '';
  password = '';

  onSubmit(): void {
    const email = this.email.trim().toLowerCase();
    const password = this.password.trim();

    if (!email || !password) {
      this.errorMessage = 'Preencha email e senha para continuar.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this.authService
      .login({ email, password })
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (res: AuthResponse) => this.handleSuccess(res),
        error: (err) => this.handleError(err),
      });
  }

  private handleSuccess(res: AuthResponse): void {
    this.sessionService.setSession(res.access_token, {
      userId: res.userId,
      username: res.username,
      email: res.email,
    });
    this.router.navigate(['/home']);
  }

  private handleError(err: unknown): void {
    const error = err as { error?: { message?: string } };
    this.errorMessage = error?.error?.message ?? 'Erro ao autenticar. Tente novamente.';
  }
}
