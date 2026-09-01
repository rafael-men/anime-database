import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { SessionService } from '../services/session.service';
import { API_BASE } from '../routes/routes';

const CSRF_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export const authInterceptor: HttpInterceptorFn = (req, next) => {
   const sessionService = inject(SessionService);

   if (!req.url.startsWith(API_BASE)) {
      return next(req);
   }

   const request = req.clone({ withCredentials: true });

   if (!CSRF_METHODS.has(request.method.toUpperCase())) {
      return next(request);
   }

   const csrfToken = sessionService.getCsrfToken();

   if (!csrfToken) {
      return next(request);
   }

   return next(
      request.clone({
         setHeaders: {
            'X-CSRF-Token': csrfToken,
         },
      }),
   );
};