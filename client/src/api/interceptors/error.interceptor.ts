import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { ToastService } from '../../app/services/toast.service';

interface ErrorPayload {
  message?: string | string[];
  error?: { message?: string | string[] };
}

function getErrorMessage(error: HttpErrorResponse): string {
  const payload = error.error as ErrorPayload | null;
  const message = payload?.message ?? payload?.error?.message;

  if (Array.isArray(message)) {
    return message.join(' ');
  }

  if (typeof message === 'string' && message.trim()) {
    return message;
  }

  if (error.status === 0) {
    return 'Não foi possível conectar ao servidor.';
  }

  if (error.status === 401) {
    return 'Sua sessão expirou. Faça login novamente.';
  }

  if (error.status === 403) {
    return 'Você não tem permissão para realizar esta ação.';
  }

  if (error.status === 429) {
    return 'Muitas tentativas. Aguarde um momento e tente novamente.';
  }

  if (error.status >= 500) {
    return 'O servidor encontrou um erro. Tente novamente mais tarde.';
  }

  return 'Não foi possível concluir a operação.';
}

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const toastService = inject(ToastService);
  const isAuthRequest = req.url.includes('/auth/login')
    || req.url.includes('/auth/register');

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (!isAuthRequest) {
        toastService.error(getErrorMessage(error));
      }

      return throwError(() => error);
    }),
  );
};
