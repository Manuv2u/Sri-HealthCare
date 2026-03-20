import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthStateService } from './auth-state.service';

export const authGuard: CanActivateFn = (
  _route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot,
) => {
  const auth = inject(AuthStateService);
  const router = inject(Router);

  if (auth.isAuthenticated()) {
    return true;
  }

  // Save the attempted URL so we can redirect back after login
  return router.createUrlTree(['/auth/login'], {
    queryParams: { returnUrl: state.url },
  });
};

export const roleGuard = (allowedRoles: string[]): CanActivateFn => () => {
  const auth = inject(AuthStateService);
  const router = inject(Router);

  const role = auth.role();
  if (role && allowedRoles.includes(role)) {
    return true;
  }
  // Authenticated but wrong role → back to public catalog
  return router.createUrlTree(['/tests']);
};

// Redirect already-authenticated users away from auth pages
export const redirectIfAuthenticated: CanActivateFn = () => {
  const auth = inject(AuthStateService);
  const router = inject(Router);

  if (auth.isAuthenticated()) {
    return router.createUrlTree(['/tests']);
  }
  return true;
};
