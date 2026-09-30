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
  usernameAvailable: boolean | null = null;
  emailAvailable: boolean | null = null;
  isCheckingUsername = false;
  isCheckingEmail = false;

  checkUsernameAvailability(): void {
    const username = this.username.trim();
    if (!username) {
      this.usernameAvailable = null;
      return;
    }

    this.isCheckingUsername = true;
    this.authService.checkUsername(username).subscribe({
      next: (result) => {
        this.usernameAvailable = result.available;
        this.isCheckingUsername = false;
      },
      error: () => {
        this.usernameAvailable = null;
        this.isCheckingUsername = false;
      },
    });
  }

  checkEmailAvailability(): void {
    const email = this.email.trim().toLowerCase();
    if (!email || !email.includes('@')) {
      this.emailAvailable = null;
      return;
    }

    this.isCheckingEmail = true;
    this.authService.checkEmail(email).subscribe({
      next: (result) => {
        this.emailAvailable = result.available;
        this.isCheckingEmail = false;
      },
      error: () => {
        this.emailAvailable = null;
        this.isCheckingEmail = false;
      },
    });
  }

  onSubmit(): void {
    const username = this.username.trim();
    const email = this.email.trim().toLowerCase();
    const password = this.password.trim();

    if (!username || !email || !password) {
      this.errorMessage = 'Preencha todos os campos para criar sua conta.';
      return;
    }

    if (this.usernameAvailable === false) {
      this.errorMessage = 'Este nome de usuário já está em uso.';
      return;
    }

    if (this.emailAvailable === false) {
      this.errorMessage = 'Este email já está cadastrado.';
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
    this.sessionService.setSession({
      userId: res.userId,
      username: res.username,
      email: res.email,
      avatarUrl: res.avatarUrl ?? null,
    });
    this.sessionService.setCsrfToken(res.csrfToken);
    this.router.navigate(['/home']);
  }

  private handleError(err: unknown): void {
    const error = err as { error?: { message?: string } };
    this.errorMessage = error?.error?.message ?? 'Erro ao cadastrar. Tente novamente.';
  }
}
