import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const roleGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  
  const expectedRole = route.data['expectedRole'];
  const user = authService.getCurrentUser();
  
  console.log('🔐 roleGuard - Rôle attendu:', expectedRole);
  console.log('👤 roleGuard - Rôle utilisateur:', user?.role);
  
  if (!user) {
    console.warn('⛔ Pas d\'utilisateur');
    router.navigate(['/login']);
    return false;
  }
  
  const userRole = user.role as string; // ← FORCE EN STRING
  
  // Les admins ont accès à TOUT
  if (userRole === 'admin') {
    console.log('✅ Admin - Accès autorisé partout');
    return true;
  }
  
  // Sinon, vérifier le rôle exact
  if (userRole === expectedRole) {
    console.log('✅ Rôle correct - Accès autorisé');
    return true;
  }
  
  console.warn('⛔ Accès refusé - Rôle requis:', expectedRole, '- Rôle actuel:', userRole);
  
  // Redirection selon le rôle
  if (userRole === 'medecin') {
    router.navigate(['/doctor-dashboard']);
  } else if (userRole === 'admin') {
    router.navigate(['/admin-dashboard']);
  } else {
    router.navigate(['/dashboard']);
  }
  
  return false;
};