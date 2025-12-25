import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.scss']
})
export class ForgotPasswordComponent {
  email: string = '';
  loading: boolean = false;
  success: boolean = false;
  
  emailError: string = '';
  emailTouched: boolean = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

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

  onSubmit(): void {
    this.validateEmail();

    if (this.emailError) {
      return;
    }

    this.loading = true;

    this.authService.forgotPassword(this.email).subscribe({
      next: (response) => {
        console.log('✅ Email envoyé:', response);
        this.loading = false;
        this.success = true;
      },
      error: (err: any) => {
        console.error('❌ Erreur:', err);
        this.loading = false;
        // Ne pas afficher d'erreur pour la sécurité
        this.success = true;
      }
    });
  }
}