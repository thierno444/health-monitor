import { Routes } from '@angular/router';
import { LoginComponent } from './features/auth/login/login';
import { PatientDashboardComponent } from './features/dashboard/patient-dashboard/patient-dashboard';
import { DoctorDashboardComponent } from './features/dashboard/doctor-dashboard/doctor-dashboard';

import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { 
    path: 'dashboard', 
    component: PatientDashboardComponent,
    canActivate: [authGuard]
  },
  { path: 'doctor-dashboard', component: DoctorDashboardComponent }, 
  { path: '**', redirectTo: '/login' }
];