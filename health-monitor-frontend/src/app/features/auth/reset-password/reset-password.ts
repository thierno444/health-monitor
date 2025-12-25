import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { ToastComponent } from '../../../shared/components/toast/toast.component';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, ToastComponent],
  templateUrl: './reset-password.html',
  styleUrls: ['./reset-password.scss']
})
export class ResetPasswordComponent implements OnInit {
  token: string = '';
  password: string = '';
  confirmPassword: string = '';
  loading: boolean = false;
  showPassword: boolean = false;
  showConfirmPassword: boolean = false;
  
  // Validation
  passwordError: string = '';
  confirmPasswordError: string = '';
  passwordTouched: boolean = false;
  confirmPasswordTouched: boolean = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    // Récupérer le token depuis l'URL
    this.token = this.route.snapshot.params['token'];
    
    if (!this.token) {
      this.toastService.error('Token manquant', 'Le lien est invalide');
      this.router.navigate(['/login']);
    }
  }

  // Validation mot de passe
  validatePasswordField(): void {
    this.passwordTouched = true;
    const validation = this.authService.validatePassword(this.password);
    this.passwordError = validation.valid ? '' : validation.message;
    
    // Revalider la confirmation si déjà remplie
    if (this.confirmPasswordTouched) {
      this.validateConfirmPasswordField();
    }
  }

  // Validation confirmation
  validateConfirmPasswordField(): void {
    this.confirmPasswordTouched = true;
    
    if (!this.confirmPassword) {
      this.confirmPasswordError = 'La confirmation est requise';
    } else if (this.confirmPassword !== this.password) {
      this.confirmPasswordError = 'Les mots de passe ne correspondent pas';
    } else {
      this.confirmPasswordError = '';
    }
  }

  // Toggle affichage
  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  // Réinitialiser
  onResetPassword(): void {
    this.validatePasswordField();
    this.validateConfirmPasswordField();

    if (this.passwordError || this.confirmPasswordError) {
      this.toastService.warning('⚠️ Formulaire invalide', 'Veuillez corriger les erreurs');
      return;
    }

    this.loading = true;

    this.authService.resetPassword(this.token, this.password).subscribe({
      next: (response) => {
        console.log('✅ Mot de passe réinitialisé:', response);
        this.loading = false;
        
        if (response.success) {
          this.toastService.success('✅ Succès', 'Mot de passe modifié avec succès');
          
          // Rediriger vers le login après 2 secondes
          setTimeout(() => {
            this.router.navigate(['/login']);
          }, 2000);
        }
      },
      error: (err) => {
        console.error('❌ Erreur réinitialisation:', err);
        this.loading = false;
        
        let errorMessage = 'Impossible de réinitialiser le mot de passe';
        
        if (err.error?.message) {
          errorMessage = err.error.message;
        }
        
        this.toastService.error('❌ Erreur', errorMessage);
      }
    });
  }
}