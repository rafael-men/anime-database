import { inject, PLATFORM_ID } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { SessionService } from '../../api/services/session.service';

export const authGuard: CanActivateFn = async () => {
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);
  const sessionService = inject(SessionService);

  if (!isPlatformBrowser(platformId)) {
    return true;
  }

  const restored = await sessionService.restoreSession();

  if (restored) {
    return true;
  }

  router.navigate(['/login']);
  return false;
};