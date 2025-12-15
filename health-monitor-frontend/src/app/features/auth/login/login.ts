import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService, AuthResponse } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrls: ['./login.scss']
})
export class LoginComponent {
  email: string = '';
  password: string = '';
  loading: boolean = false;
  error: string = '';
  showPassword: boolean = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  onSubmit(): void {
    if (!this.email || !this.password) {
      this.error = 'Veuillez remplir tous les champs';
      return;
    }

    this.loading = true;
    this.error = '';

    this.authService.login(this.email, this.password).subscribe({
      next: (response) => {
      console.log('✅ Connexion réussie:', response);
      this.loading = false;
      
      // Redirection selon le rôle
      if (response.utilisateur.role === 'medecin') {
        this.router.navigate(['/doctor-dashboard']);
      } else if (response.utilisateur.role === 'admin') {
        this.router.navigate(['/admin-dashboard']); // À créer
      } else {
        this.router.navigate(['/dashboard']);
      }
      },
      error: (err: any) => {
        console.error('❌ Erreur connexion', err);
        this.error = err.error?.message || 'Email ou mot de passe incorrect';
        this.loading = false;
      },
      complete: () => {
        this.loading = false;
      }
    });
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }
}