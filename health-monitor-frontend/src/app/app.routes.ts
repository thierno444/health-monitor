import { Routes } from '@angular/router';
import { LoginComponent } from './features/auth/login/login';
import { PatientDashboardComponent } from './features/dashboard/patient-dashboard/patient-dashboard';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { 
    path: 'dashboard', 
    component: PatientDashboardComponent,
    canActivate: [authGuard]
  },
  { path: '**', redirectTo: '/login' }
];