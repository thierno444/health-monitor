import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const roleGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  
  const expectedRole = route.data['expectedRole'];
  const user = authService.getCurrentUser();
  
  if (user && user.role === expectedRole) {
    return true;
  }
  
  console.warn('⛔ Accès refusé - Rôle requis:', expectedRole, '- Rôle actuel:', user?.role);
  router.navigate(['/dashboard/patient']);
  return false;
};