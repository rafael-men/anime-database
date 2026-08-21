import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService, AuthResponse } from '../../../../../api/services/auth.service';
import { SessionService } from '../../../../../api/services/session.service';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-register-card',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './register-card.html',
  styleUrl: './register-card.css',
})
export class RegisterCard {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly sessionService = inject(SessionService);

  isLoading = false;
  errorMessage = '';

  username = '';
  email = '';
  password = '';

  onSubmit(): void {
    const username = this.username.trim();
    const email = this.email.trim().toLowerCase();
    const password = this.password.trim();

    if (!username || !email || !password) {
      this.errorMessage = 'Preencha todos os campos para criar sua conta.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this.authService
      .register({ username, email, password })
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
      avatarUrl: res.avatarUrl ?? null,
    });
    this.router.navigate(['/home']);
  }

  private handleError(err: unknown): void {
    const error = err as { error?: { message?: string } };
    this.errorMessage = error?.error?.message ?? 'Erro ao cadastrar. Tente novamente.';
  }
}
