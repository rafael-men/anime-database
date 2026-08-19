import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { SessionService } from '../services/session.service';
import { API_BASE } from '../routes/routes';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
   const sessionService = inject(SessionService);

   if (!req.url.startsWith(API_BASE)) {
      return next(req);
   }

   const token = sessionService.getToken();

   if (!token) {
      return next(req);
   }

   return next(
      req.clone({
         setHeaders: {
            Authorization: `Bearer ${token}`,
         },
      }),
   );
};
