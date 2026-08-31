import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { HOME_BY_ROLE } from './home-by-role';

export const guestGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const user = authService.currentUser();

  if (!user) {
    return true;
  }

  const router = inject(Router);
  return router.parseUrl(HOME_BY_ROLE[user.role]);
};
