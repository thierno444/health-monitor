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
  today: string = new Date().toISOString().split('T')[0];  


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
    telephone: ['', [Validators.required, Validators.pattern(/^(\+?221|0)?[0-9]{9}$/)]],
    genre: ['homme', Validators.required],   
    dateDeNaissance: ['', Validators.required],   
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
    // Marquer tous les champs comme touchés pour afficher les erreurs
    Object.keys(this.registerForm.controls).forEach(key => {
      this.registerForm.get(key)?.markAsTouched();
    });
    return;
  }

  this.loading = true;
  
  const formData = {
    ...this.registerForm.value,
    sendEmail: true  // Pour envoyer l'email de bienvenue
  };
  
  // Supprimer confirmMotDePasse avant l'envoi
  delete formData.confirmMotDePasse;

  // UTILISER register(), PAS login() !
  this.authService.register(formData).subscribe({
    next: (response: any) => {  // ← AJOUTER LE TYPE
      console.log('✅ Inscription réussie:', response);
      this.loading = false;
      
      if (response.success) {
        // Le token est déjà stocké automatiquement par le service
        // Redirection selon le rôle
        const role = response.utilisateur.role;
        
        if (role === 'medecin') {
          this.router.navigate(['/dashboard/medecin']);
        } else if (role === 'admin') {
          this.router.navigate(['/dashboard/admin']);
        } else {
          this.router.navigate(['/dashboard/patient']);
        }
      }
    },
    error: (err: any) => {  // ← AJOUTER LE TYPE
      console.error('❌ Erreur inscription:', err);
      this.loading = false;
      
      const errorMessage = err.error?.message || 'Une erreur est survenue lors de l\'inscription';
      alert(errorMessage);
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