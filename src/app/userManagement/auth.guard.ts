/*** authGuard
 * ---------
 * This is a route guard function that prevents unauthorized users from accessing
 * protected routes in the Angular application.
 *
 * It checks the user's authentication status using the UserSharedService.
 * If the user is authenticated, access is granted.
 * Otherwise, the user is redirected to the login page.
 *
 * Usage: Apply this guard to routes that require user authentication.
 *
 * Example in app.routes.ts:
 * {
 *   path: 'dashboard',
 *   component: DashboardComponent,
 *   canActivate: [authGuard]
 * }
 *
 */

import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { UserSharedService } from './userManagement-service';

export const authGuard: CanActivateFn = () => {
  const userService = inject(UserSharedService);
  const router = inject(Router);

  if (userService.isAuthenticated) {
    return true;
  } else {
    router.navigate(['/login']);
    return false;
  }
};