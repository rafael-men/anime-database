import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../../../api/services/auth.service';
import { ToastService } from '../../../services/toast.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.css',
})
export class ResetPassword implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly toastService = inject(ToastService);

  isLoading = false;
  errorMessage = '';
  done = false;

  token = '';
  password = '';
  confirmPassword = '';

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token') ?? '';
  }

  onSubmit(): void {
    const password = this.password;

    if (!this.token) {
      this.errorMessage = 'Link inválido ou expirado. Solicite um novo.';
      this.toastService.error(this.errorMessage);
      return;
    }

    if (password.length < 6) {
      this.errorMessage = 'A senha precisa ter no mínimo 6 caracteres.';
      this.toastService.error(this.errorMessage);
      return;
    }

    if (password !== this.confirmPassword) {
      this.errorMessage = 'As senhas não conferem.';
      this.toastService.error(this.errorMessage);
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this.authService
      .resetPassword(this.token, password)
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: () => {
          this.done = true;
          this.toastService.success('Senha alterada. Faça login novamente.');
        },
        error: (err) => {
          const error = err as { error?: { message?: string } };
          this.errorMessage =
            error?.error?.message ?? 'Não foi possível alterar a senha. Solicite um novo link.';
          this.toastService.error(this.errorMessage);
        },
      });
  }
}
