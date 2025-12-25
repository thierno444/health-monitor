import { Routes } from '@angular/router';
import { LoginComponent } from './features/auth/login/login';
import { RegisterComponent } from './features/auth/register/register.component';
import { ForgotPasswordComponent } from './features/auth/forgot-password/forgot-password.component';
import { ResetPasswordComponent } from './features/auth/reset-password/reset-password';
import { PatientDashboardComponent } from './features/dashboard/patient-dashboard/patient-dashboard';
import { DoctorDashboardComponent } from './features/dashboard/doctor-dashboard/doctor-dashboard';
import { AdminDashboardComponent } from './features/dashboard/admin-dashboard/admin-dashboard';
import { PatientComparisonComponent } from './features/dashboard/patient-comparison/patient-comparison';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  // Routes publiques
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'reset-password/request', component: ForgotPasswordComponent },
  { path: 'reset-password/:token', component: ResetPasswordComponent },
  
  // Routes protégées - Patient
  { 
    path: 'dashboard', 
    component: PatientDashboardComponent,
    canActivate: [authGuard]
  },
  { 
    path: 'dashboard/patient', 
    component: PatientDashboardComponent,
    canActivate: [authGuard]
  },
  
  // Routes protégées - Médecin
  { 
    path: 'doctor-dashboard', 
    component: DoctorDashboardComponent,
    canActivate: [authGuard, roleGuard],
    data: { expectedRole: 'medecin' }
  },
  { 
    path: 'dashboard/medecin', 
    component: DoctorDashboardComponent,
    canActivate: [authGuard, roleGuard],
    data: { expectedRole: 'medecin' }
  },
  
  // Routes protégées - Admin
  { 
    path: 'admin-dashboard', 
    component: AdminDashboardComponent,
    canActivate: [authGuard]
  },
  { 
    path: 'dashboard/admin', 
    component: AdminDashboardComponent,
    canActivate: [authGuard]
  },
  
  // Route comparaison
  { 
    path: 'comparison', 
    component: PatientComparisonComponent,
    canActivate: [authGuard, roleGuard],
    data: { expectedRole: 'medecin' }
  },
  
  { path: '**', redirectTo: '/login' }
];