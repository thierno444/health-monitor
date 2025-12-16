import { Routes } from '@angular/router';
import { LoginComponent } from './features/auth/login/login';
import { PatientDashboardComponent } from './features/dashboard/patient-dashboard/patient-dashboard';
import { DoctorDashboardComponent } from './features/dashboard/doctor-dashboard/doctor-dashboard';
import { PatientComparisonComponent } from './features/dashboard/patient-comparison/patient-comparison';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  
  // Routes dashboard
  {
    path: 'dashboard',
    canActivate: [authGuard],
    children: [
      { 
        path: 'patient', 
        component: PatientDashboardComponent 
      },
      { 
        path: 'doctor', 
        component: DoctorDashboardComponent,
        canActivate: [roleGuard],
        data: { expectedRole: 'medecin' }
      },
      { 
        path: 'comparison', 
        component: PatientComparisonComponent,
        canActivate: [roleGuard],
        data: { expectedRole: 'medecin' }
      },
      { path: '', redirectTo: 'patient', pathMatch: 'full' }
    ]
  },
  
  // Route legacy (redirection)
  { path: 'doctor-dashboard', redirectTo: '/dashboard/doctor', pathMatch: 'full' },
  
  { path: '**', redirectTo: '/login' }
];