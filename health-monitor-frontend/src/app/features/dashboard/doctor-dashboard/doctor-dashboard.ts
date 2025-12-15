import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, User } from '../../../core/services/auth.service';
import { PatientService, Patient, StatistiquesPatient } from '../../../core/services/patient';
import { SocketService } from '../../../core/services/socket.service';
import { ThemeService } from '../../../core/services/theme.service';
import { ToastService } from '../../../core/services/toast.service';
import { ToastComponent } from '../../../shared/components/toast/toast.component';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-doctor-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, ToastComponent],
  templateUrl: './doctor-dashboard.html',
  styleUrls: ['./doctor-dashboard.scss']
})
export class DoctorDashboardComponent implements OnInit, OnDestroy {
  // Utilisateur connecté
  user: User | null = null;
  
  // Données
  patients: Patient[] = [];
  patientsAffiches: Patient[] = [];
  patientSelectionne: Patient | null = null;
  statistiques: any = null;
  
  // États UI
  loading = true;
  loadingPatients = false;
  darkMode = false;
  activeTab: 'overview' | 'patients' | 'alerts' | 'reports' | 'profile' = 'overview';

  // Filtres
  searchQuery = '';
  showArchived = false;
  filterStatus: 'all' | 'normal' | 'attention' | 'danger' = 'all';
  
  // Modal archivage
  showArchiveModal = false;
  archiveForm = {
    raison: 'traitement_termine',
    commentaire: ''
  };
  patientAArchiver: Patient | null = null;
  archiving = false;

  // Modal désarchivage
  showDesarchiveModal = false;
  patientADesarchiver: Patient | null = null;
  desarchiving = false;

  // Modal détails patient
  showPatientDetailModal = false;
  patientDetails: any = null;
  patientMeasurements: any[] = [];
  patientStats: any = null;
  loadingDetails = false;

  // Pagination
  currentPage = 1;
  patientsPerPage = 4;
  totalPages = 1;

  // Formulaires profil
  profileForm = {
    prenom: '',
    nom: '',
    email: ''
  };
  
  passwordForm = {
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  };
  
  savingProfile = false;
  changingPassword = false;
  
  // Subscriptions
  private subscriptions: Subscription[] = [];

  constructor(
    private authService: AuthService,
    private patientService: PatientService,
    private socketService: SocketService,
    private themeService: ThemeService,
    private toastService: ToastService,
    private router: Router
  ) {}

  ngOnInit(): void {
    console.log('🚀 Dashboard médecin initialisé');
    
    // Thème
    this.subscriptions.push(
      this.themeService.darkMode$.subscribe(isDark => {
        this.darkMode = isDark;
      })
    );
    
    // Utilisateur
    this.subscriptions.push(
      this.authService.currentUser$.subscribe(user => {
        this.user = user;
        
        if (user && user.role === 'medecin') {
          this.loadDashboardData();
          this.initProfileForm();
        } else if (user && user.role !== 'medecin') {
          this.toastService.error('Accès refusé', 'Ce dashboard est réservé aux médecins');
          this.router.navigate(['/dashboard']);
        }
      })
    );
    
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  // ========== CHARGEMENT DONNÉES ==========
  
  loadDashboardData(): void {
    this.loadStatistiques();
    this.loadPatients();
  }

  loadStatistiques(): void {
    this.patientService.getGlobalStats().subscribe({
      next: (response) => {
        if (response.success) {
          this.statistiques = response.statistiques;
          console.log('📊 Statistiques chargées:', this.statistiques);
        }
      },
      error: (err) => {
        console.error('Erreur chargement stats:', err);
        this.toastService.error('Erreur', 'Impossible de charger les statistiques');
      }
    });
  }

  loadPatients(): void {
    this.loadingPatients = true;
        console.log('📥 Chargement patients, archives:', this.showArchived);
    this.patientService.getPatients(this.showArchived).subscribe({
      next: (response) => {
        if (response.success) {
          this.patients = response.patients;
          this.applyFilters();
          console.log(`👥 ${this.patients.length} patients chargés`);
          console.log('Patients:', this.patients);
          this.loading = false;
          this.loadingPatients = false;
        }
      },
      error: (err) => {
        console.error('Erreur chargement patients:', err);
        this.toastService.error('Erreur', 'Impossible de charger les patients');
        this.loading = false;
        this.loadingPatients = false;
      }
    });
  }

  // ========== FILTRES ET RECHERCHE ==========

  applyFilters(): void {
    let filtered = [...this.patients];
    
    // Filtre recherche (nom, prénom, email, dispositif)
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(p => 
        p.prenom.toLowerCase().includes(query) ||
        p.nom.toLowerCase().includes(query) ||
        p.email.toLowerCase().includes(query) ||
        (p.idDispositif && p.idDispositif.toLowerCase().includes(query))
      ); // ← VÉRIFIER QUE LA PARENTHÈSE EST BIEN LÀ
    }
    
    // Filtre statut
    if (this.filterStatus !== 'all') {
      filtered = filtered.filter(p => 
        p.derniereMesure?.statut.toLowerCase() === this.filterStatus
      );
    }
    
    this.patientsAffiches = filtered;
    this.currentPage = 1; 
    console.log('🔍 Patients filtrés:', this.patientsAffiches.length);
  }

  // Pagination
  get patientsPagees(): Patient[] {
    const start = (this.currentPage - 1) * this.patientsPerPage;
    const end = start + this.patientsPerPage;
    this.totalPages = Math.ceil(this.patientsAffiches.length / this.patientsPerPage);
    return this.patientsAffiches.slice(start, end);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      // Scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  get pageNumbers(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }


  onSearchChange(): void {
    this.applyFilters();
  }

  toggleArchived(): void {
    this.showArchived = !this.showArchived;
    this.loadPatients();
  }

  setFilterStatus(status: string): void {
    this.filterStatus = status as 'all' | 'normal' | 'attention' | 'danger';
    this.applyFilters();
  }

  // ========== ARCHIVAGE ==========

  openArchiveModal(patient: Patient): void {
    this.patientAArchiver = patient;
    this.archiveForm = {
      raison: 'traitement_termine',
      commentaire: ''
    };
    this.showArchiveModal = true;
  }

  closeArchiveModal(): void {
    this.showArchiveModal = false;
    this.patientAArchiver = null;
  }

  confirmArchive(): void {
    if (!this.patientAArchiver) return;
    
    this.archiving = true;
    
    this.patientService.archiverPatient(
      this.patientAArchiver.id,
      this.archiveForm.raison,
      this.archiveForm.commentaire
    ).subscribe({
      next: (response) => {
        if (response.success) {
          this.toastService.success(
            'Patient archivé',
            `${this.patientAArchiver!.prenom} ${this.patientAArchiver!.nom} a été archivé`
          );
          this.closeArchiveModal();
          this.loadPatients();
          this.loadStatistiques();
        }
        this.archiving = false;
      },
      error: (err) => {
        console.error('Erreur archivage:', err);
        this.toastService.error('Erreur', err.error?.message || 'Impossible d\'archiver le patient');
        this.archiving = false;
      }
    });
  }

  desarchiverPatient(patient: Patient): void {
    this.patientADesarchiver = patient;
    this.showDesarchiveModal = true;
  }

  confirmDesarchive(): void {
    if (!this.patientADesarchiver) return;
    
    this.desarchiving = true;
    
    this.patientService.desarchiverPatient(
      this.patientADesarchiver.id, 
      'Réactivation du suivi médical'
    ).subscribe({
      next: (response) => {
        if (response.success) {
          this.toastService.success(
            'Patient réactivé',
            `${this.patientADesarchiver!.prenom} ${this.patientADesarchiver!.nom} est de nouveau actif`
          );
          this.closeDesarchiveModal();
          this.loadPatients();
          this.loadStatistiques();
        }
        this.desarchiving = false;
      },
      error: (err) => {
        console.error('Erreur désarchivage:', err);
        this.toastService.error('Erreur', 'Impossible de désarchiver le patient');
        this.desarchiving = false;
      }
    });
  }

  closeDesarchiveModal(): void {
    this.showDesarchiveModal = false;
    this.patientADesarchiver = null;
  }

  // ========== NAVIGATION ==========

  voirDetailsPatient(patient: Patient): void {
    this.showPatientDetailModal = true;
    this.loadingDetails = true;
    this.patientDetails = patient;
    
    console.log('📊 Chargement détails patient:', patient.id);
    
    // Charger les détails complets
    this.patientService.getPatient(patient.id).subscribe({
      next: (response) => {
        if (response.success) {
          this.patientDetails = response.patient;
          this.patientMeasurements = response.mesures || [];
          this.patientStats = response.statistiques || {};
          console.log('✅ Détails chargés:', this.patientMeasurements.length, 'mesures');
        }
        this.loadingDetails = false;
      },
      error: (err) => {
        console.error('❌ Erreur chargement détails:', err);
        this.toastService.error('Erreur', 'Impossible de charger les détails du patient');
        this.loadingDetails = false;
      }
    });
  }

  closePatientDetailModal(): void {
    this.showPatientDetailModal = false;
    this.patientDetails = null;
    this.patientMeasurements = [];
    this.patientStats = null;
  }

  switchTab(tab: string): void {
    this.activeTab = tab as 'overview' | 'patients' | 'alerts' | 'reports';
  }

  // ========== UTILITAIRES ==========

  getStatusColor(statut: string): string {
    switch (statut?.toUpperCase()) {
      case 'NORMAL': return 'text-green-600 dark:text-green-400';
      case 'ATTENTION': return 'text-yellow-600 dark:text-yellow-400';
      case 'DANGER': return 'text-red-600 dark:text-red-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  }

  getStatusBg(statut: string): string {
    switch (statut?.toUpperCase()) {
      case 'NORMAL': return 'bg-green-100 dark:bg-green-900/20';
      case 'ATTENTION': return 'bg-yellow-100 dark:bg-yellow-900/20';
      case 'DANGER': return 'bg-red-100 dark:bg-red-900/20';
      default: return 'bg-gray-100 dark:bg-gray-900/20';
    }
  }

  getRaisonLabel(raison?: string): string {
    if (!raison) return 'Non spécifié';
    
    const labels: any = {
      'gueri': 'Guéri',
      'transfere': 'Transféré',
      'decede': 'Décédé',
      'traitement_termine': 'Traitement terminé',
      'inactif': 'Inactif',
      'demission': 'Démission',
      'autre': 'Autre'
    };
    return labels[raison] || raison;
  }

  formatDate(date: any): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }


  // ========== GESTION PROFIL ==========
  
  initProfileForm(): void {
    if (this.user) {
      this.profileForm = {
        prenom: this.user.prenom,
        nom: this.user.nom,
        email: this.user.email
      };
    }
  }

  saveProfile(): void {
    if (!this.user?.id) return;
    
    this.savingProfile = true;
    
    console.log('📝 Sauvegarde profil médecin');
    
    const profileData = {
      prenom: this.profileForm.prenom,
      nom: this.profileForm.nom,
      email: this.profileForm.email
    };
    
    this.authService.updateProfile(this.user.id, profileData).subscribe({
      next: (response) => {
        console.log('✅ Réponse backend:', response);
        
        if (response.success && response.utilisateur && this.user) { 
          this.user.prenom = response.utilisateur.prenom;
          this.user.nom = response.utilisateur.nom;
          this.user.email = response.utilisateur.email;
          
          if (response.utilisateur.photoProfil) {
            this.user.photoProfil = response.utilisateur.photoProfil;
          }
          
          this.authService.loadUserProfile();
          
          this.savingProfile = false;
          this.toastService.success('Profil mis à jour !', 'Vos informations ont été modifiées');
        }
      },
      error: (err) => {
        console.error('Erreur maj profil:', err);
        this.savingProfile = false;
        this.toastService.error('Erreur', 'Impossible de mettre à jour le profil');
      }
    });
  }

  changePassword(): void {
    if (this.passwordForm.newPassword !== this.passwordForm.confirmPassword) {
      this.toastService.error('Erreur', 'Les mots de passe ne correspondent pas');
      return;
    }
    
    if (this.passwordForm.newPassword.length < 6) {
      this.toastService.error('Erreur', 'Le mot de passe doit contenir au moins 6 caractères');
      return;
    }
    
    if (!this.user?.id) return;
    
    this.changingPassword = true;
    
    this.authService.changePassword(
      this.user.id, 
      this.passwordForm.currentPassword, 
      this.passwordForm.newPassword
    ).subscribe({
      next: (response) => {
        if (response.success) {
          this.passwordForm = {
            currentPassword: '',
            newPassword: '',
            confirmPassword: ''
          };
          this.changingPassword = false;
          this.toastService.success('Mot de passe modifié !', 'Vous pouvez maintenant vous connecter avec le nouveau');
        }
      },
      error: (err) => {
        console.error('Erreur changement mdp:', err);
        this.changingPassword = false;
        this.toastService.error('Erreur', err.error?.message || 'Mot de passe actuel incorrect');
      }
    });
  }

  uploadPhoto(event: any): void {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      this.toastService.error('Erreur', 'Veuillez sélectionner une image');
      return;
    }
    
    if (file.size > 2 * 1024 * 1024) {
      this.toastService.error('Erreur', 'L\'image doit faire moins de 2MB');
      return;
    }
    
    if (!this.user?.id) return;
    
    const reader = new FileReader();
    reader.onload = (e: any) => {
      const photoBase64 = e.target.result;
      
      console.log('📸 Upload photo médecin');
      
      if (this.user) {
        this.user.photoProfil = photoBase64;
      }
      
      this.authService.updateProfile(this.user!.id, {
        photoProfil: photoBase64
      }).subscribe({
        next: (response) => {
          if (response.success) {
            console.log('✅ Photo sauvegardée');
            this.toastService.success('Photo mise à jour !', 'Votre photo a été sauvegardée');
            this.authService.loadUserProfile();
          }
        },
        error: (err) => {
          console.error('Erreur sauvegarde photo:', err);
          this.toastService.error('Erreur', 'Impossible de sauvegarder la photo');
        }
      });
    };
    reader.readAsDataURL(file);
  }
  
}
