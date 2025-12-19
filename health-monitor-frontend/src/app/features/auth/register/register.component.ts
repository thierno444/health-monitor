import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent implements OnInit {
  registerForm!: FormGroup;
  loading = false;
  showPassword = false;
  showConfirmPassword = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.registerForm = this.fb.group({
      prenom: ['', [Validators.required, Validators.minLength(2)]],
      nom: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      telephone: ['', [Validators.required, Validators.pattern(/^(\+?221|0)?[0-9]{9}$/)]], // ← AVEC TÉLÉPHONE
      motDePasse: ['', [Validators.required, Validators.minLength(6)]],
      confirmMotDePasse: ['', Validators.required],
      role: ['patient', Validators.required],
      idDispositif: ['']
    }, { validators: this.passwordMatchValidator });
  }

  passwordMatchValidator(g: FormGroup) {
    return g.get('motDePasse')?.value === g.get('confirmMotDePasse')?.value
      ? null : { mismatch: true };
  }

  onSubmit(): void {
    if (this.registerForm.invalid) {
      this.toastService.warning('Formulaire invalide', 'Veuillez remplir tous les champs correctement');
      return;
    }

    this.loading = true;
    const formData = { ...this.registerForm.value };
    delete formData.confirmMotDePasse;

    this.authService.login(formData.email, formData.motDePasse).subscribe({
      next: (response) => {
        if (response.success) {
          this.toastService.success('Inscription réussie', 'Bienvenue !');
          
          // Redirection selon le rôle
          if (response.utilisateur.role === 'patient') {
            this.router.navigate(['/dashboard/patient']);
          } else if (response.utilisateur.role === 'medecin') {
            this.router.navigate(['/dashboard/doctor']);
          } else {
            this.router.navigate(['/dashboard/admin']);
          }
        }
        this.loading = false;
      },
      error: (err) => {
        console.error('Erreur inscription:', err);
        this.toastService.error('Erreur', err.error?.message || 'Inscription échouée');
        this.loading = false;
      }
    });
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPassword(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }
}