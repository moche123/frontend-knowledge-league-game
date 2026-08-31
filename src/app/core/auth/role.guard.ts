import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { UserRole } from '../../shared/dto/auth-response.dto';
import { AuthService } from './auth.service';
import { HOME_BY_ROLE } from './home-by-role';

/** Restricts a route to specific roles — an authenticated user of the wrong role
 *  is bounced to their own home instead of the generic /login redirect. */
export function roleGuard(...allowedRoles: UserRole[]): CanActivateFn {
  return () => {
    const authService = inject(AuthService);
    const user = authService.currentUser();

    if (!user) {
      return inject(Router).parseUrl('/login');
    }
    if (allowedRoles.includes(user.role)) {
      return true;
    }
    return inject(Router).parseUrl(HOME_BY_ROLE[user.role]);
  };
}
