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