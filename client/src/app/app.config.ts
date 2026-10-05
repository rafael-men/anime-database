import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { authInterceptor } from '../api/interceptors/auth.interceptor';
import { anilistInterceptor } from '../api/interceptors/anilist.interceptor';
import { errorInterceptor } from '../api/interceptors/error.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideClientHydration(withEventReplay()),
    provideHttpClient(withInterceptors([
      authInterceptor,
      anilistInterceptor,
      errorInterceptor,
    ])),
  ],
};
