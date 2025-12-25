import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './login.html',
  styleUrls: ['./login.scss']
})
export class LoginComponent {
  email: string = '';
  password: string = '';
  loading: boolean = false;
  showPassword: boolean = false;

  // Erreurs spécifiques
  emailError: string = '';
  passwordError: string = '';
  generalError: string = '';

  // Validation
  emailTouched: boolean = false;
  passwordTouched: boolean = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  // Validation email en temps réel
  validateEmail(): void {
    this.emailTouched = true;
    this.emailError = '';

    if (!this.email) {
      this.emailError = 'L\'adresse email est requise';
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.email)) {
      this.emailError = 'Format d\'email invalide';
      return;
    }
  }

  // Validation mot de passe en temps réel
  validatePassword(): void {
    this.passwordTouched = true;
    this.passwordError = '';

    if (!this.password) {
      this.passwordError = 'Le mot de passe est requis';
      return;
    }

    if (this.password.length < 6) {
      this.passwordError = 'Le mot de passe doit contenir au moins 6 caractères';
      return;
    }
  }

  // Toggle visibilité mot de passe
  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  // Connexion
  onSubmit(): void {
    // Valider avant envoi
    this.validateEmail();
    this.validatePassword();

    // Si erreurs, ne pas envoyer
    if (this.emailError || this.passwordError) {
      return;
    }

    this.loading = true;
    this.generalError = '';
    this.emailError = '';
    this.passwordError = '';

    this.authService.login(this.email, this.password).subscribe({
      next: (response) => {
        console.log('✅ Connexion réussie:', response);
        this.loading = false;

        // Redirection selon le rôle
        const role = response.utilisateur.role;
        if (role === 'medecin') {
          this.router.navigate(['/dashboard/medecin']);
        } else if (role === 'admin') {
          this.router.navigate(['/dashboard/admin']);
        } else {
          this.router.navigate(['/dashboard/patient']);
        }
      },
      error: (err: any) => {
        console.error('❌ Erreur connexion:', err);
        this.loading = false;

        const errorMessage = err.error?.message || 'Une erreur est survenue';
        const errorField = err.error?.field || 'general';

        // Afficher l'erreur au bon endroit
        if (errorField === 'email') {
          this.emailError = errorMessage;
        } else if (errorField === 'password') {
          this.passwordError = errorMessage;
        } else {
          this.generalError = errorMessage;
        }
      }
    });
  }
}