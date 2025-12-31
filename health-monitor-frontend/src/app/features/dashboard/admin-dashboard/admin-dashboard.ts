import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AdminService, AdminStats, User, Device, Log, LogStats,Assignment, AssignmentStats } from '../../../core/services/admin.service';
import { NotificationsDropdownComponent } from '../../../shared/components/notifications-dropdown/notifications-dropdown';
import { NotificationService } from '../../../core/services/notification.service';
import { AuthService } from '../../../core/services/auth.service';
import { ThemeService } from '../../../core/services/theme.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule,NotificationsDropdownComponent],
  templateUrl: './admin-dashboard.html',
  styleUrls: ['./admin-dashboard.scss']
})
export class AdminDashboardComponent implements OnInit, OnDestroy {
  // Utilisateur admin
  admin: any = null;
  darkMode = false;

  // Navigation
  activeTab: 'overview' | 'users' | 'devices' | 'logs' | 'assignments' | 'profile' = 'overview';

  // Statistiques
  stats: AdminStats | null = null;
  loadingStats = false;

  // Graphiques
  chartsData: any = null;
  loadingCharts = false;

  // Dispositifs
  devices: Device[] = [];
  filteredDevices: Device[] = [];
  loadingDevices = false;
  deviceSearchQuery = '';
  deviceFilterStatus: 'tous' | 'disponible' | 'assigne' | 'inactif' = 'tous';

  // Logs
  logs: Log[] = [];
  filteredLogs: Log[] = [];
  loadingLogs = false;
  logStats: LogStats | null = null;
  logFilterType: string = 'tous';
  logSearchQuery = '';
  logStartDate = '';
  logEndDate = '';

  // Assignations
  assignments: Assignment[] = [];
  filteredAssignments: Assignment[] = [];
  assignmentStats: AssignmentStats | null = null;
  loadingAssignments = false;
  assignmentSearchQuery = '';
  assignmentFilterStatus: 'toutes' | 'actives' | 'inactives' = 'toutes';
  
  // Pagination assignations
  assignmentsPerPage = 5;
  currentAssignmentPage = 1;

  // Assignation médecin-patient
  showAssignPatientModal = false;
  selectedPatientForAssignment: User | null = null;
  availableDoctors: User[] = [];
  assignmentForm = {
    medecinId: '',
    priorite: 'moyenne',
    notes: ''
  };

  // Désassignation
  showUnassignConfirmModal = false;
  patientToUnassign: User | null = null;
  doctorToUnassign: User | null = null;
  allPatientAssignments: any[] = [];
  selectedAssignmentToUnassign: string = '';

  // Modal assignation existante
  showAssignmentExistsModal = false;
  existingAssignmentPatient: User | null = null;
  existingAssignmentDoctor: User | null = null;

  // Modal confirmation désassignation depuis tableau
  showUnassignFromTableModal = false;
  assignmentToUnassignFromTable: Assignment | null = null;
  
  // Pagination médecins dans le modal de désassignation
  unassignDoctorsPerPage = 3;
  currentUnassignDoctorPage = 1;

  // Pagination médecins dans le modal
  doctorsPerPage = 3;
  currentDoctorPage = 1;

  // Pagination logs
  logsPerPage = 5;
  currentLogPage = 1;

  // Modal logs
  showClearLogsModal = false;
  clearLogsDays = 30;

  // Pagination dispositifs
  devicesPerPage = 5;
  currentDevicePage = 1;

  // Modals dispositifs
  showDeviceModal = false;
  showAssignModal = false;
  showSyncConfirmModal = false;
  showDeleteDeviceModal = false; 
  editingDevice: Device | null = null;
  deviceToAssign: Device | null = null;
  deviceToDelete: Device | null = null;

  // Formulaire dispositif
  deviceForm = {
    idDispositif: '',
    nom: '',
    notes: ''
  };

  deviceFormErrors = {
    idDispositif: '',
    nom: ''
  };

  // Liste patients pour assignation
  availablePatients: User[] = [];
  selectedPatientId: string | null = null;

  // Utilisateurs
  users: User[] = [];
  filteredUsers: User[] = [];
  loadingUsers = false;
  selectedUsers: string[] = [];
  searchQuery = '';
  filterRole: 'tous' | 'patient' | 'medecin' | 'admin' = 'tous';
  includeArchived = false;

  // Pagination
  usersPerPage = 5;
  currentPage = 1;

  // Modals
  showUserModal = false;
  showImportModal = false;
  showDeleteConfirm = false;
  editingUser: User | null = null;

  // Formulaire utilisateur
  userForm = {
    prenom: '',
    nom: '',
    email: '',
    telephone: '',
    motDePasse: '',
    role: 'patient' as 'patient' | 'medecin' | 'admin',
    idDispositif: ''
  };

  formErrors = {
    prenom: '',
    nom: '',
    email: '',
    telephone: '',
    motDePasse: '',
    idDispositif: ''
  };

  // Import CSV
  csvData = '';
  importResults: any = null;

  // Profil admin
  profileForm = {
    prenom: '',
    nom: '',
    email: '',
    telephone: ''
  };

  savingProfile = false;

  // Subscriptions
  private subscriptions: Subscription[] = [];

  // Math pour template
  Math = Math;

  constructor(
    private adminService: AdminService,
    private authService: AuthService,
    private themeService: ThemeService,
    private toastService: ToastService,
    private router: Router,
    private notificationService: NotificationService,

    
  ) {}

  ngOnInit(): void {
    console.log('🔧 Dashboard Admin initialisé');

    // Vérifier admin
    const user = this.authService.getCurrentUser();
    if (!user || user.role !== 'admin') {
      this.toastService.error('Accès refusé', 'Ce dashboard est réservé aux administrateurs');
      this.router.navigate(['/dashboard']);
      return;
    }

    this.admin = user;
    this.initProfileForm();

    // Thème
    this.subscriptions.push(
      this.themeService.darkMode$.subscribe(isDark => {
        this.darkMode = isDark;
      })
    );

    // Charger données
    this.loadDashboardData();
    this.notificationService.loadUnreadCount(); 

  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  loadDashboardData(): void {
    this.loadStats();
    this.loadCharts(); 
    this.loadUsers();
    this.loadDevices();

  }

  // ========== STATISTIQUES ==========

  loadStats(): void {
    this.loadingStats = true;
    this.adminService.getStats().subscribe({
      next: (response) => {
        if (response.success) {
          this.stats = response.stats;
          console.log('📊 Stats chargées:', this.stats);
        }
        this.loadingStats = false;
      },
      error: (err) => {
        console.error('Erreur stats:', err);
        this.toastService.error('Erreur', 'Impossible de charger les statistiques');
        this.loadingStats = false;
      }
    });
  }

  // ========== GRAPHIQUES ==========

  loadCharts(): void {
    this.loadingCharts = true;
    this.adminService.getCharts().subscribe({
      next: (response) => {
        if (response.success) {
          this.chartsData = response.charts;
          console.log('📊 Graphiques chargés:', this.chartsData);
        }
        this.loadingCharts = false;
      },
      error: (err) => {
        console.error('Erreur graphiques:', err);
        this.loadingCharts = false;
      }
    });
  }


  // ========== HELPERS GRAPHIQUES ==========

  getTotalNewUsers(): number {
    if (!this.chartsData?.evolutionUtilisateurs) return 0;
    return this.chartsData.evolutionUtilisateurs.reduce((sum: number, e: any) => sum + e.count, 0);
  }

  getActivityBarWidth(count: number): number {
    if (!this.chartsData?.activiteGlobale || this.chartsData.activiteGlobale.length === 0) return 0;
    const maxCount = Math.max(...this.chartsData.activiteGlobale.map((a: any) => a.count));
    return (count / maxCount) * 100;
  }

  // ========== UTILISATEURS ==========

  loadUsers(): void {
    this.loadingUsers = true;
    const role = this.filterRole === 'tous' ? undefined : this.filterRole;
    
    this.adminService.getUsers(role, this.searchQuery, this.includeArchived).subscribe({
      next: (response) => {
        if (response.success) {
          this.users = response.users;
          this.filteredUsers = this.users;
          console.log('👥', this.users.length, 'utilisateurs chargés');
        }
        this.loadingUsers = false;
      },
      error: (err) => {
        console.error('Erreur users:', err);
        this.toastService.error('Erreur', 'Impossible de charger les utilisateurs');
        this.loadingUsers = false;
      }
    });
  }

  applyFilters(): void {
    this.currentPage = 1;
    
    // Si recherche par ID dispositif (commence par ESP32_ ou contient _)
    if (this.searchQuery && (this.searchQuery.includes('ESP32') || this.searchQuery.includes('_'))) {
      console.log('🔍 Recherche par ID dispositif:', this.searchQuery);
      this.filteredUsers = this.users.filter(u => 
        u.idDispositif?.toLowerCase().includes(this.searchQuery.toLowerCase())
      );
    } else {
      // Recherche classique (nom, prénom, email)
      this.loadUsers();
    }
  }

  get paginatedUsers(): User[] {
    const start = (this.currentPage - 1) * this.usersPerPage;
    const end = start + this.usersPerPage;
    return this.filteredUsers.slice(start, end);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredUsers.length / this.usersPerPage);
  }

  get pages(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  // ========== SÉLECTION MULTIPLE ==========

  toggleSelectAll(event: any): void {
    if (event.target.checked) {
      this.selectedUsers = this.paginatedUsers.map(u => u._id);
    } else {
      this.selectedUsers = [];
    }
  }

  toggleSelectUser(userId: string): void {
    const index = this.selectedUsers.indexOf(userId);
    if (index > -1) {
      this.selectedUsers.splice(index, 1);
    } else {
      this.selectedUsers.push(userId);
    }
  }

  isUserSelected(userId: string): boolean {
    return this.selectedUsers.includes(userId);
  }

  get allSelected(): boolean {
    return this.paginatedUsers.length > 0 && 
           this.paginatedUsers.every(u => this.selectedUsers.includes(u._id));
  }

  // ========== CRUD UTILISATEURS ==========

  openCreateUserModal(): void {
    this.editingUser = null;
    this.userForm = {
      prenom: '',
      nom: '',
      email: '',
      telephone: '',
      motDePasse: '',
      role: 'patient',
      idDispositif: ''
    };
    // Réinitialiser les erreurs
    this.formErrors = {
      prenom: '',
      nom: '',
      email: '',
      telephone: '',
      motDePasse: '',
      idDispositif: ''
    };
    this.showUserModal = true;
  }

  openEditUserModal(user: User): void {
    this.editingUser = user;
    this.userForm = {
      prenom: user.prenom,
      nom: user.nom,
      email: user.email,
      telephone: user.telephone || '',
      motDePasse: '', // Ne pas pré-remplir
      role: user.role,
      idDispositif: user.idDispositif || ''
    };
    this.showUserModal = true;
  }

  // Valider un champ en temps réel
  validateField(field: string): void {
    switch (field) {
      case 'prenom':
        if (!this.userForm.prenom.trim()) {
          this.formErrors.prenom = '⚠️ Le prénom est requis';
        } else if (this.userForm.prenom.length < 2) {
          this.formErrors.prenom = '⚠️ Minimum 2 caractères';
        } else if (this.userForm.prenom.length > 50) {
          this.formErrors.prenom = '⚠️ Maximum 50 caractères';
        } else {
          this.formErrors.prenom = '';
        }
        break;

      case 'nom':
        if (!this.userForm.nom.trim()) {
          this.formErrors.nom = '⚠️ Le nom est requis';
        } else if (this.userForm.nom.length < 2) {
          this.formErrors.nom = '⚠️ Minimum 2 caractères';
        } else if (this.userForm.nom.length > 50) {
          this.formErrors.nom = '⚠️ Maximum 50 caractères';
        } else {
          this.formErrors.nom = '';
        }
        break;

      case 'email':
        if (!this.userForm.email.trim()) {
          this.formErrors.email = '⚠️ L\'email est requis';
        } else if (!/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(this.userForm.email)) {
          this.formErrors.email = '⚠️ Format email invalide';
        } else {
          this.formErrors.email = '';
        }
        break;

      case 'telephone':
        if (this.userForm.telephone && !/^(\+?221|0)?[0-9]{9}$/.test(this.userForm.telephone.replace(/\s/g, ''))) {
          this.formErrors.telephone = '⚠️ Format: +221XXXXXXXXX ou 0XXXXXXXXX';
        } else {
          this.formErrors.telephone = '';
        }
        break;

      case 'motDePasse':
        if (!this.editingUser) { // Seulement pour création
          if (!this.userForm.motDePasse) {
            this.formErrors.motDePasse = '⚠️ Le mot de passe est requis';
          } else if (this.userForm.motDePasse.length < 6) {
            this.formErrors.motDePasse = '⚠️ Minimum 6 caractères';
          } else {
            this.formErrors.motDePasse = '';
          }
        }
        break;

      case 'idDispositif':
        if (this.userForm.role === 'patient') {
          if (!this.userForm.idDispositif.trim()) {
            this.formErrors.idDispositif = '⚠️ L\'ID dispositif est requis pour les patients';
          } else if (!/^ESP32_[A-Z0-9]+$/i.test(this.userForm.idDispositif)) {
            this.formErrors.idDispositif = '⚠️ Format: ESP32_XXX';
          } else {
            this.formErrors.idDispositif = '';
          }
        } else {
          this.formErrors.idDispositif = '';
        }
        break;
    }
  }

  // Valider tout le formulaire
  validateForm(): boolean {
    this.validateField('prenom');
    this.validateField('nom');
    this.validateField('email');
    this.validateField('telephone');
    this.validateField('motDePasse');
    this.validateField('idDispositif');

    return !this.formErrors.prenom &&
           !this.formErrors.nom &&
           !this.formErrors.email &&
           !this.formErrors.telephone &&
           !this.formErrors.motDePasse &&
           !this.formErrors.idDispositif;
  }

  // Gérer le changement de rôle
  onRoleChange(): void {
    // Si médecin ou admin, vider l'ID dispositif
    if (this.userForm.role === 'medecin' || this.userForm.role === 'admin') {
      this.userForm.idDispositif = '';
      this.formErrors.idDispositif = '';
    } else {
      // Si patient, valider l'ID dispositif
      this.validateField('idDispositif');
    }
  }

  closeUserModal(): void {
    this.showUserModal = false;
    this.editingUser = null;
  }

saveUser(): void {
    // Valider tout le formulaire
    if (!this.validateForm()) {
      this.toastService.warning('Formulaire invalide', 'Corrigez les erreurs avant de sauvegarder');
      return;
    }

    if (this.editingUser) {
      // Modification
      this.adminService.updateUser(this.editingUser._id, this.userForm).subscribe({
        next: (response) => {
          if (response.success) {
            this.toastService.success('✅ Modifié', 'Utilisateur modifié avec succès');
            this.closeUserModal();
            this.loadUsers();
            this.loadStats();
          }
        },
        error: (err) => {
        console.error('Erreur modification:', err);
        
        let errorMessage = 'Impossible de modifier l\'utilisateur';
        
        if (err.error?.error) {
          const errorText = err.error.error;
          
          if (errorText.includes('email') && errorText.includes('dup key')) {
            errorMessage = '❌ Cet email est déjà utilisé';
            this.formErrors.email = '⚠️ Email déjà pris';
          } else if (errorText.includes('idDispositif') && errorText.includes('dup key')) {
            if (errorText.includes('null')) {
              errorMessage = '❌ Erreur technique : Conflit de dispositif. Contactez le support.';
            } else {
              errorMessage = '❌ Cet ID dispositif est déjà assigné';
              this.formErrors.idDispositif = '⚠️ ID déjà utilisé';
            }
          } else {
            errorMessage = err.error.message || errorMessage;
          }
        }
        
        this.toastService.error('Erreur de modification', errorMessage);
        
        if (errorMessage.includes('technique') || errorMessage.includes('support')) {
          alert('⚠️ ERREUR TECHNIQUE\n\n' + errorMessage + '\n\nVeuillez contacter l\'administrateur système.');
        }
      }
      });
    } else {
      // Création
      this.adminService.createUser(this.userForm).subscribe({
        next: (response) => {
          if (response.success) {
            this.toastService.success('✅ Créé', 'Utilisateur créé avec succès');
            this.closeUserModal();
            this.loadUsers();
            this.loadStats();
          }
        },
        error: (err) => {
        console.error('Erreur création user:', err);
        
        // Gérer les erreurs spécifiques
        let errorMessage = 'Impossible de créer l\'utilisateur';
        
        if (err.error?.error) {
          const errorText = err.error.error;
          
          // Email déjà utilisé
          if (errorText.includes('email') && errorText.includes('dup key')) {
            errorMessage = '❌ Cet email est déjà utilisé';
            this.formErrors.email = '⚠️ Email déjà pris';
          }
          // ID Dispositif déjà utilisé
          else if (errorText.includes('idDispositif') && errorText.includes('dup key')) {
            if (errorText.includes('null')) {
              errorMessage = '❌ Erreur technique : Plusieurs utilisateurs sans dispositif. Contactez le support.';
            } else {
              errorMessage = '❌ Cet ID dispositif est déjà assigné à un autre patient';
              this.formErrors.idDispositif = '⚠️ ID déjà utilisé';
            }
          }
          // Erreur de validation
          else if (errorText.includes('validation')) {
            errorMessage = '❌ Données invalides. Vérifiez tous les champs.';
          }
          // Autre erreur
          else {
            errorMessage = err.error.message || errorMessage;
          }
        }
        
        // Afficher le toast avec le message détaillé
        this.toastService.error('Erreur de création', errorMessage);
        
        // Afficher aussi une notification persistante pour les erreurs critiques
        if (errorMessage.includes('technique') || errorMessage.includes('support')) {
          alert('⚠️ ERREUR TECHNIQUE\n\n' + errorMessage + '\n\nVeuillez contacter l\'administrateur système.');
        }
      }
      });
    }
  }

 deleteUser(user: User): void {
    // Empêcher de se supprimer soi-même
    if (user._id === this.admin.id) {
      this.toastService.error('❌ Interdit', 'Vous ne pouvez pas vous supprimer vous-même');
      return;
    }

    this.userToDelete = user;
    this.showDeleteConfirmModal = true;
  }

  confirmDeleteUser(): void {
    if (!this.userToDelete) return;

    this.adminService.deleteUser(this.userToDelete._id).subscribe({
      next: (response) => {
        if (response.success) {
          this.toastService.success(
            'Utilisateur supprimé', 
            `${this.userToDelete!.prenom} ${this.userToDelete!.nom} a été supprimé`
          );
          this.loadUsers();
          this.loadStats();
          this.closeDeleteConfirmModal();
        }
      },
      error: (err) => {
        console.error('Erreur suppression:', err);
        this.toastService.error(
          'Erreur', 
          err.error?.message || 'Impossible de supprimer'
        );
        this.closeDeleteConfirmModal();
      }
    });
  }

  closeDeleteConfirmModal(): void {
    this.showDeleteConfirmModal = false;
    this.userToDelete = null;
  }

bulkDelete(): void {
    if (this.selectedUsers.length === 0) {
      this.toastService.warning('Aucune sélection', 'Sélectionnez au moins un utilisateur');
      return;
    }

    this.showBulkDeleteConfirmModal = true;
  }

  confirmBulkDelete(): void {
    this.adminService.bulkDeleteUsers(this.selectedUsers).subscribe({
      next: (response) => {
        if (response.success) {
          this.toastService.success(
            'Suppression réussie', 
            `${response.deletedCount} utilisateur(s) supprimé(s)`
          );
          this.selectedUsers = [];
          this.loadUsers();
          this.loadStats();
          this.closeBulkDeleteConfirmModal();
        }
      },
      error: (err) => {
        console.error('Erreur suppression multiple:', err);
        this.toastService.error(
          'Erreur', 
          err.error?.message || 'Impossible de supprimer'
        );
        this.closeBulkDeleteConfirmModal();
      }
    });
  }

  closeBulkDeleteConfirmModal(): void {
    this.showBulkDeleteConfirmModal = false;
  }

  // ========== IMPORT CSV ==========

  openImportModal(): void {
    this.csvData = '';
    this.importResults = null;
    this.showImportModal = true;
  }

  closeImportModal(): void {
    this.showImportModal = false;
  }

importCSV(): void {
    if (!this.csvData.trim()) {
      this.toastService.warning('CSV vide', 'Collez vos données CSV');
      return;
    }

    this.adminService.importCSV(this.csvData).subscribe({
      next: (response) => {
        if (response.success) {
          this.importResults = response;
          
          if (response.errors.length === 0) {
            this.toastService.success(
              'Import terminé', 
              `${response.imported} utilisateur(s) importé(s) avec succès`
            );
          } else {
            this.toastService.warning(
              'Import partiel', 
              `${response.imported} importé(s), ${response.errors.length} erreur(s)`
            );
          }
          
          this.loadUsers();
          this.loadStats();
        }
      },
      error: (err) => {
        console.error('Erreur import:', err);
        this.toastService.error('Erreur', 'Impossible d\'importer');
      }
    });
  }

  // ========== PROFIL ADMIN ==========

  initProfileForm(): void {
    if (this.admin) {
      this.profileForm = {
        prenom: this.admin.prenom,
        nom: this.admin.nom,
        email: this.admin.email,
        telephone: this.admin.telephone || ''
      };
    }
  }

  saveProfile(): void {
    this.savingProfile = true;

    this.authService.updateProfile(this.admin.id, this.profileForm).subscribe({
      next: (response) => {
        if (response.success) {
          this.toastService.success('Profil mis à jour', 'Vos informations ont été enregistrées');
          this.admin = response.utilisateur;
        }
        this.savingProfile = false;
      },
      error: (err) => {
        console.error('Erreur profil:', err);
        this.toastService.error('Erreur', 'Impossible de mettre à jour');
        this.savingProfile = false;
      }
    });
  }

  // Upload photo admin
  uploadPhoto(event: any): void {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      this.toastService.error('Fichier trop volumineux', 'Taille maximum : 2MB');
      return;
    }

    if (!file.type.startsWith('image/')) {
      this.toastService.error('Format invalide', 'Veuillez choisir une image');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      
      console.log('📸 Upload photo admin...');
      
      if (!this.admin?.id) return;
      
      this.authService.uploadPhoto(this.admin.id, base64).subscribe({
        next: (response) => {
          console.log('✅ Réponse upload:', response);
          
          if (response.success && response.utilisateur) {
            this.toastService.success('✅ Photo mise à jour', 'Votre photo a été modifiée');
            this.admin = response.utilisateur;
            localStorage.setItem('currentUser', JSON.stringify(response.utilisateur));
          }
        },
        error: (err) => {
          console.error('❌ Erreur upload photo:', err);
          this.toastService.error('❌ Erreur', 'Impossible de modifier la photo');
        }
      });
    };

    reader.readAsDataURL(file);
  }

  // Changement mot de passe
  changePasswordForm = {
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  };

  passwordErrors = {
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  };

  showChangePassword = false;
  // Modals confirmation
  showDeleteConfirmModal = false;
  userToDelete: User | null = null;
  showBulkDeleteConfirmModal = false;
  changingPassword = false;

  openChangePasswordModal(): void {
    this.changePasswordForm = {
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    };
    this.passwordErrors = {
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    };
    this.showChangePassword = true;
  }

  closeChangePasswordModal(): void {
    this.showChangePassword = false;
  }

  validatePassword(field: string): void {
    switch (field) {
      case 'currentPassword':
        if (!this.changePasswordForm.currentPassword) {
          this.passwordErrors.currentPassword = '⚠️ Mot de passe actuel requis';
        } else {
          this.passwordErrors.currentPassword = '';
        }
        break;

      case 'newPassword':
        if (!this.changePasswordForm.newPassword) {
          this.passwordErrors.newPassword = '⚠️ Nouveau mot de passe requis';
        } else if (this.changePasswordForm.newPassword.length < 6) {
          this.passwordErrors.newPassword = '⚠️ Minimum 6 caractères';
        } else {
          this.passwordErrors.newPassword = '';
        }
        // Revalider la confirmation si elle existe
        if (this.changePasswordForm.confirmPassword) {
          this.validatePassword('confirmPassword');
        }
        break;

      case 'confirmPassword':
        if (!this.changePasswordForm.confirmPassword) {
          this.passwordErrors.confirmPassword = '⚠️ Confirmation requise';
        } else if (this.changePasswordForm.confirmPassword !== this.changePasswordForm.newPassword) {
          this.passwordErrors.confirmPassword = '⚠️ Les mots de passe ne correspondent pas';
        } else {
          this.passwordErrors.confirmPassword = '';
        }
        break;
    }
  }

  changePassword(): void {
    this.validatePassword('currentPassword');
    this.validatePassword('newPassword');
    this.validatePassword('confirmPassword');

    if (this.passwordErrors.currentPassword || 
        this.passwordErrors.newPassword || 
        this.passwordErrors.confirmPassword) {
      this.toastService.warning('⚠️ Formulaire invalide', 'Corrigez les erreurs');
      return;
    }

    this.changingPassword = true;

    this.authService.changePassword(
      this.admin.id,
      this.changePasswordForm.currentPassword,
      this.changePasswordForm.newPassword
    ).subscribe({
      next: (response) => {
        if (response.success) {
          this.toastService.success('✅ Mot de passe modifié', 'Votre mot de passe a été changé avec succès');
          this.closeChangePasswordModal();
        }
        this.changingPassword = false;
      },
      error: (err) => {
        console.error('Erreur changement mot de passe:', err);
        this.toastService.error('❌ Erreur', err.error?.message || 'Impossible de changer le mot de passe');
        this.changingPassword = false;
      }
    });
  }

  // ========== NAVIGATION ==========

  switchTab(tab: 'overview' | 'users' | 'devices' | 'logs' | 'assignments' | 'profile'): void {
    this.activeTab = tab;
    if (tab === 'logs') {
      this.loadLogs();
      this.loadLogStats();
    } else if (tab === 'assignments') {
      this.loadAssignments();
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  // ========== HELPERS ==========

  getRoleBadge(role: string): string {
    const badges: any = {
      patient: 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400',
      medecin: 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400',
      admin: 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400'
    };
    return badges[role] || badges.patient;
  }

  getRoleLabel(role: string): string {
    const labels: any = {
      patient: '👤 Patient',
      medecin: '👨‍⚕️ Médecin',
      admin: '🔧 Admin'
    };
    return labels[role] || role;
  }

  // ========== DISPOSITIFS ==========

  loadDevices(): void {
    this.loadingDevices = true;
    this.adminService.getDevices().subscribe({
      next: (response) => {
        if (response.success) {
          this.devices = response.devices;
          this.applyDeviceFilters();
          console.log('📟', this.devices.length, 'dispositifs chargés');
        }
        this.loadingDevices = false;
      },
      error: (err) => {
        console.error('Erreur dispositifs:', err);
        this.toastService.error('Erreur', 'Impossible de charger les dispositifs');
        this.loadingDevices = false;
      }
    });
  }

  applyDeviceFilters(): void {
    this.currentDevicePage = 1;

    let filtered = [...this.devices];

    // Filtre par statut
    if (this.deviceFilterStatus !== 'tous') {
      filtered = filtered.filter(d => d.statut === this.deviceFilterStatus);
    }

    // Recherche
    if (this.deviceSearchQuery) {
      const query = this.deviceSearchQuery.toLowerCase();
      filtered = filtered.filter(d => 
        d.idDispositif.toLowerCase().includes(query) ||
        d.nom.toLowerCase().includes(query) ||
        d.patientId?.prenom.toLowerCase().includes(query) ||
        d.patientId?.nom.toLowerCase().includes(query)
      );
    }

    this.filteredDevices = filtered;
  }

  openCreateDeviceModal(): void {
    this.editingDevice = null;
    this.deviceForm = {
      idDispositif: '',
      nom: '',
      notes: ''
    };
    this.deviceFormErrors = {
      idDispositif: '',
      nom: ''
    };
    this.showDeviceModal = true;
  }

  closeDeviceModal(): void {
    this.showDeviceModal = false;
    this.editingDevice = null;
  }

  validateDeviceField(field: string): void {
    switch (field) {
      case 'idDispositif':
        if (!this.deviceForm.idDispositif.trim()) {
          this.deviceFormErrors.idDispositif = '⚠️ ID Dispositif requis';
        } else if (!/^ESP32_[A-Z0-9]+$/i.test(this.deviceForm.idDispositif)) {
          this.deviceFormErrors.idDispositif = '⚠️ Format: ESP32_XXX';
        } else {
          this.deviceFormErrors.idDispositif = '';
        }
        break;

      case 'nom':
        if (!this.deviceForm.nom.trim()) {
          this.deviceFormErrors.nom = '';
        } else {
          this.deviceFormErrors.nom = '';
        }
        break;
    }
  }

  validateDeviceForm(): boolean {
    this.validateDeviceField('idDispositif');
    this.validateDeviceField('nom');
    return !this.deviceFormErrors.idDispositif && !this.deviceFormErrors.nom;
  }

  saveDevice(): void {
    if (!this.validateDeviceForm()) {
      this.toastService.warning('Formulaire invalide', 'Corrigez les erreurs');
      return;
    }

    this.adminService.createDevice(this.deviceForm).subscribe({
      next: (response) => {
        if (response.success) {
          this.toastService.success('✅ Créé', 'Dispositif créé avec succès');
          this.closeDeviceModal();
          this.loadDevices();
        }
      },
      error: (err) => {
        console.error('Erreur création device:', err);
        this.toastService.error('❌ Erreur', err.error?.message || 'Impossible de créer');
      }
    });
  }

  openAssignModal(device: Device): void {
    this.deviceToAssign = device;
    this.selectedPatientId = device.patientId?._id || null;
    
    // Charger les patients disponibles (sans dispositif ou avec ce dispositif)
    this.availablePatients = this.users.filter(u => 
      u.role === 'patient' && 
      (!u.idDispositif || u.idDispositif === device.idDispositif)
    );
    
    this.showAssignModal = true;
  }

  closeAssignModal(): void {
    this.showAssignModal = false;
    this.deviceToAssign = null;
    this.selectedPatientId = null;
  }

  assignDevice(): void {
    if (!this.deviceToAssign) return;

    this.adminService.assignDevice(this.deviceToAssign._id, this.selectedPatientId).subscribe({
      next: (response) => {
        if (response.success) {
          this.toastService.success(
            '✅ Assignation réussie',
            this.selectedPatientId ? 'Dispositif assigné' : 'Dispositif désassigné'
          );
          this.closeAssignModal();
          this.loadDevices();
          this.loadUsers();
        }
      },
      error: (err) => {
        console.error('Erreur assignation:', err);
        this.toastService.error('❌ Erreur', err.error?.message || 'Impossible d\'assigner');
      }
    });
  }

openDeleteDeviceModal(device: Device): void {
    if (device.statut === 'assigne') {
      this.toastService.error('❌ Interdit', 'Désassignez d\'abord ce dispositif');
      return;
    }
    this.deviceToDelete = device;
    this.showDeleteDeviceModal = true;
  }

  closeDeleteDeviceModal(): void {
    this.showDeleteDeviceModal = false;
    this.deviceToDelete = null;
  }

  deleteDevice(): void {
    if (!this.deviceToDelete) return;

    this.adminService.deleteDevice(this.deviceToDelete._id).subscribe({
      next: (response) => {
        if (response.success) {
          this.toastService.success('✅ Supprimé', 'Dispositif supprimé');
          this.loadDevices();
          this.closeDeleteDeviceModal();
        }
      },
      error: (err) => {
        console.error('Erreur suppression device:', err);
        this.toastService.error('❌ Erreur', err.error?.message || 'Impossible de supprimer');
        this.closeDeleteDeviceModal();
      }
    });
  }

  openSyncConfirmModal(): void {
    this.showSyncConfirmModal = true;
  }

  closeSyncConfirmModal(): void {
    this.showSyncConfirmModal = false;
  }

  syncDevices(): void {
    this.adminService.syncDevices().subscribe({
      next: (response) => {
        if (response.success) {
          this.toastService.success('✅ Synchronisé', response.message);
          this.loadDevices();
          this.closeSyncConfirmModal();
        }
      },
      error: (err) => {
        console.error('Erreur sync:', err);
        this.toastService.error('❌ Erreur', err.error?.message || 'Impossible de synchroniser');
        this.closeSyncConfirmModal();
      }
    });
  }

  getStatusBadge(statut: string): string {
    const badges: any = {
      disponible: 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400',
      assigne: 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400',
      inactif: 'bg-gray-100 dark:bg-gray-900/20 text-gray-700 dark:text-gray-400'
    };
    return badges[statut] || badges.disponible;
  }

  getStatusLabel(statut: string): string {
    const labels: any = {
      disponible: '✅ Disponible',
      assigne: '📌 Assigné',
      inactif: '⚫ Inactif'
    };
    return labels[statut] || statut;
  }

  // Pagination dispositifs
  get paginatedDevices(): Device[] {
    const start = (this.currentDevicePage - 1) * this.devicesPerPage;
    return this.filteredDevices.slice(start, start + this.devicesPerPage);
  }

  get totalDevicePages(): number {
    return Math.ceil(this.filteredDevices.length / this.devicesPerPage);
  }

  get devicePages(): number[] {
    return Array.from({ length: this.totalDevicePages }, (_, i) => i + 1);
  }

  goToDevicePage(page: number): void {
    if (page >= 1 && page <= this.totalDevicePages) {
      this.currentDevicePage = page;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  // Pagination médecins désassignation
  get paginatedUnassignDoctors(): any[] {
    const start = (this.currentUnassignDoctorPage - 1) * this.unassignDoctorsPerPage;
    return this.allPatientAssignments.slice(start, start + this.unassignDoctorsPerPage);
  }

  get totalUnassignDoctorPages(): number {
    return Math.ceil(this.allPatientAssignments.length / this.unassignDoctorsPerPage);
  }

  get unassignDoctorPages(): number[] {
    return Array.from({ length: this.totalUnassignDoctorPages }, (_, i) => i + 1);
  }

  goToUnassignDoctorPage(page: number): void {
    if (page >= 1 && page <= this.totalUnassignDoctorPages) {
      this.currentUnassignDoctorPage = page;
    }
  }

  // ========== LOGS ==========

  loadLogs(): void {
    this.loadingLogs = true;
    const type = this.logFilterType === 'tous' ? undefined : this.logFilterType;
    
    this.adminService.getLogs(type, undefined, this.logStartDate, this.logEndDate, 100).subscribe({
      next: (response) => {
        if (response.success) {
          this.logs = response.logs;
          this.applyLogFilters();
          console.log('📜', this.logs.length, 'logs chargés');
        }
        this.loadingLogs = false;
      },
      error: (err) => {
        console.error('Erreur logs:', err);
        this.toastService.error('Erreur', 'Impossible de charger les logs');
        this.loadingLogs = false;
      }
    });
  }

  loadLogStats(): void {
    this.adminService.getLogStats().subscribe({
      next: (response) => {
        if (response.success) {
          this.logStats = response.stats;
          console.log('📊 Stats logs:', this.logStats);
        }
      },
      error: (err) => {
        console.error('Erreur stats logs:', err);
      }
    });
  }

  applyLogFilters(): void {
    this.currentLogPage = 1;
    let filtered = [...this.logs];

    // Recherche
    if (this.logSearchQuery) {
      const query = this.logSearchQuery.toLowerCase();
      filtered = filtered.filter(log => 
        log.action.toLowerCase().includes(query) ||
        log.adminEmail.toLowerCase().includes(query) ||
        log.targetName?.toLowerCase().includes(query)
      );
    }

    this.filteredLogs = filtered;
  }

  // Pagination logs
  get paginatedLogs(): Log[] {
    const start = (this.currentLogPage - 1) * this.logsPerPage;
    return this.filteredLogs.slice(start, start + this.logsPerPage);
  }

  get totalLogPages(): number {
    return Math.ceil(this.filteredLogs.length / this.logsPerPage);
  }

  get logPages(): number[] {
    return Array.from({ length: this.totalLogPages }, (_, i) => i + 1);
  }

  goToLogPage(page: number): void {
    if (page >= 1 && page <= this.totalLogPages) {
      this.currentLogPage = page;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  // Pagination assignations
  get paginatedAssignments(): Assignment[] {
    const start = (this.currentAssignmentPage - 1) * this.assignmentsPerPage;
    return this.filteredAssignments.slice(start, start + this.assignmentsPerPage);
  }

  get totalAssignmentPages(): number {
    return Math.ceil(this.filteredAssignments.length / this.assignmentsPerPage);
  }

  get assignmentPages(): number[] {
    return Array.from({ length: this.totalAssignmentPages }, (_, i) => i + 1);
  }

  goToAssignmentPage(page: number): void {
    if (page >= 1 && page <= this.totalAssignmentPages) {
      this.currentAssignmentPage = page;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  openClearLogsModal(): void {
    this.showClearLogsModal = true;
  }

  closeClearLogsModal(): void {
    this.showClearLogsModal = false;
  }

  clearOldLogs(): void {
    this.adminService.clearOldLogs(this.clearLogsDays).subscribe({
      next: (response) => {
        if (response.success) {
          this.toastService.success('✅ Nettoyé', response.message);
          this.loadLogs();
          this.loadLogStats();
          this.closeClearLogsModal();
        }
      },
      error: (err) => {
        console.error('Erreur clear logs:', err);
        this.toastService.error('❌ Erreur', 'Impossible de nettoyer les logs');
      }
    });
  }

  getLogTypeLabel(type: string): string {
    const labels: any = {
      user_create: '➕ Création utilisateur',
      user_update: '✏️ Modification utilisateur',
      user_delete: '🗑️ Suppression utilisateur',
      device_create: '📟 Création dispositif',
      device_assign: '📌 Assignation dispositif',
      device_delete: '🗑️ Suppression dispositif',
      import_csv: '📤 Import CSV',
      sync_devices: '🔄 Synchronisation',
      assign_patient: '👨‍⚕️ Assignation médecin/patient',      
      unassign_patient: '🔓 Désassignation médecin/patient', 
      login: '🔐 Connexion',
      logout: '👋 Déconnexion',
      other: '📋 Autre'
    };
    return labels[type] || type;
  }

  getLogTypeBadge(type: string): string {
    const badges: any = {
      user_create: 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400',
      user_update: 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400',
      user_delete: 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400',
      device_create: 'bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400',
      device_assign: 'bg-indigo-100 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400',
      device_delete: 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400',
      import_csv: 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400',
      sync_devices: 'bg-cyan-100 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-400',
      assign_patient: 'bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400',
      unassign_patient: 'bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400',   
      login: 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400',
      logout: 'bg-gray-100 dark:bg-gray-900/20 text-gray-700 dark:text-gray-400',
      other: 'bg-gray-100 dark:bg-gray-900/20 text-gray-700 dark:text-gray-400'
    };
    return badges[type] || badges.other;
  }

  getStatusBadgeLog(status: string): string {
    return status === 'success' 
      ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400'
      : 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400';
  }

  // ========== ASSIGNATION MÉDECIN-PATIENT ==========

openAssignPatientModal(patient: User): void {
  console.log('📋 Ouverture modal assignation pour:', patient.prenom, patient.nom);
  
  this.selectedPatientForAssignment = patient;
  
  // Charger les médecins disponibles
  console.log('👨‍⚕️ Chargement des médecins...');
  console.log('Total utilisateurs chargés:', this.users.length);
  
  this.availableDoctors = this.users.filter(u => {
    console.log('  - Vérification:', u.prenom, u.nom, 'Role:', u.role);
    return u.role === 'medecin';
  });
  
  console.log('✅ Médecins trouvés:', this.availableDoctors.length);
  this.availableDoctors.forEach(d => {
    console.log('    >', d.prenom, d.nom, '(', d.email, ')');
  });
  
  // Reset form
  this.assignmentForm = {
    medecinId: '',
    priorite: 'moyenne',
    notes: ''
  };

  this.currentDoctorPage = 1;
  
  // IMPORTANT: Si aucun médecin, recharger les utilisateurs
  if (this.availableDoctors.length === 0) {
    console.warn('⚠️ Aucun médecin trouvé, rechargement des utilisateurs...');
    this.loadUsers();
    
    // Attendre 1 seconde puis réessayer
    setTimeout(() => {
      this.availableDoctors = this.users.filter(u => u.role === 'medecin');
      console.log('🔄 Après rechargement:', this.availableDoctors.length, 'médecins');
      
      if (this.availableDoctors.length === 0) {
        console.error('❌ TOUJOURS AUCUN MÉDECIN après rechargement !');
        console.log('Utilisateurs totaux:', this.users.length);
        console.log('Utilisateurs:', this.users.map(u => ({ nom: u.nom, role: u.role })));
      }
    }, 1000);
  }
  
  this.showAssignPatientModal = true;
}

  closeAssignPatientModal(): void {
    this.showAssignPatientModal = false;
    this.selectedPatientForAssignment = null;  
    this.assignmentForm = {
      medecinId: '',
      priorite: 'moyenne',
      notes: ''
    };
  }

  assignPatientToDoctor(): void {
    if (!this.assignmentForm.medecinId) {
      this.toastService.warning('⚠️ Sélection requise', 'Veuillez sélectionner un médecin');
      return;
    }

    if (!this.selectedPatientForAssignment) return;

    this.adminService.assignPatientToDoctor(
      this.assignmentForm.medecinId,
      this.selectedPatientForAssignment._id,
      this.assignmentForm.priorite,
      this.assignmentForm.notes
    ).subscribe({
      next: (response) => {
        if (response.success) {
          this.toastService.success('✅ Assignation réussie', response.message);
          this.closeAssignPatientModal();
          this.loadUsers();
        }
      },
      error: (err) => {
        console.error('Erreur assignation:', err);
        
        // Vérifier si c'est une erreur "déjà assigné"
        if (err.status === 400 && err.error?.message?.includes('déjà assigné')) {
          // SAUVEGARDER LE PATIENT ET LE MÉDECIN AVANT DE FERMER LE MODAL
          const patientTemp = this.selectedPatientForAssignment;
          const medecinTemp = this.availableDoctors.find(d => d._id === this.assignmentForm.medecinId) || null;
          
          console.log('🔍 Patient sauvegardé:', patientTemp);
          console.log('🔍 Médecin sauvegardé:', medecinTemp);
          
          // Fermer le modal d'assignation
          this.closeAssignPatientModal();
          
          // Définir les variables APRÈS la fermeture
          this.existingAssignmentPatient = patientTemp;
          this.existingAssignmentDoctor = medecinTemp;
          
          console.log('✅ existingAssignmentPatient défini:', this.existingAssignmentPatient);
          console.log('✅ existingAssignmentDoctor défini:', this.existingAssignmentDoctor);
          
          // Ouvrir le modal d'information "Assignation existante"
          this.showAssignmentExistsModal = true;
          
          // Afficher aussi un toast
          this.toastService.info('ℹ️ Assignation existante', 'Ce patient est déjà assigné à ce médecin');
        } else {
          // Autre type d'erreur
          const errorMessage = err.error?.message || 'Impossible d\'assigner';
          this.toastService.error('❌ Erreur d\'assignation', errorMessage);
        }
      }
    });
  }

  getPriorityBadge(priorite: string): string {
    const badges: any = {
      basse: 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400',
      moyenne: 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400',
      haute: 'bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400',
      urgente: 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400'
    };
    return badges[priorite] || badges.moyenne;
  }

  getPriorityLabel(priorite: string): string {
    const labels: any = {
      basse: '🟢 Basse',
      moyenne: '🔵 Moyenne',
      haute: '🟠 Haute',
      urgente: '🔴 Urgente'
    };
    return labels[priorite] || priorite;
  }

  // Pagination médecins
  get paginatedDoctors(): User[] {
    const start = (this.currentDoctorPage - 1) * this.doctorsPerPage;
    return this.availableDoctors.slice(start, start + this.doctorsPerPage);
  }

  get totalDoctorPages(): number {
    return Math.ceil(this.availableDoctors.length / this.doctorsPerPage);
  }

  get doctorPages(): number[] {
    return Array.from({ length: this.totalDoctorPages }, (_, i) => i + 1);
  }

  goToDoctorPage(page: number): void {
    if (page >= 1 && page <= this.totalDoctorPages) {
      this.currentDoctorPage = page;
    }
  }

  // ========== DÉSASSIGNATION ==========

  openUnassignModal(patient: User, doctor: User): void {
    this.patientToUnassign = patient;
    this.doctorToUnassign = doctor;
    this.showUnassignConfirmModal = true;
  }

openUnassignModalFromUser(patient: User): void {
    console.log('📋 openUnassignModalFromUser appelé pour:', patient.prenom, patient.nom);
    
    // Vérifier d'abord si le patient a une assignation active
    this.adminService.getPatientAssignments(patient._id).subscribe({
      next: (response) => {
        console.log('Réponse assignations:', response);
        
        if (!response || !response.success) {
          this.toastService.error('❌ Erreur', 'Impossible de récupérer les assignations');
          return;
        }
        
        if (!response.assignments || !Array.isArray(response.assignments)) {
          this.toastService.info('ℹ️ Information', 'Ce patient n\'a aucune assignation active');
          return;
        }
        
        if (response.assignments.length > 0) {
          // Patient a une assignation active
          this.patientToUnassign = patient;
          this.allPatientAssignments = response.assignments;
          this.currentUnassignDoctorPage = 1;
          
          // Sélectionner la première par défaut
          this.selectedAssignmentToUnassign = response.assignments[0]._id;
          
          console.log('✅ Ouverture modal désassignation avec', response.assignments.length, 'assignation(s)');
          this.showUnassignConfirmModal = true;
        } else {
          // Aucune assignation active
          this.toastService.info('ℹ️ Information', 'Ce patient n\'a aucune assignation active');
        }
      },
      error: (err) => {
        console.error('Erreur récupération assignations:', err);
        
        let errorMessage = 'Impossible de vérifier les assignations';
        
        if (err.error?.message) {
          errorMessage = err.error.message;
        } else if (err.status === 404) {
          errorMessage = 'Route d\'assignation non trouvée. Vérifiez le backend.';
        } else if (err.status === 0) {
          errorMessage = 'Impossible de contacter le serveur. Vérifiez que le backend est démarré.';
        }
        
        this.toastService.error('❌ Erreur', errorMessage);
      }
    });
  }

 closeUnassignModal(): void {
    this.showUnassignConfirmModal = false;
    this.patientToUnassign = null;
    this.allPatientAssignments = [];
    this.selectedAssignmentToUnassign = '';
    this.currentUnassignDoctorPage = 1;
  }

  closeAssignmentExistsModal(): void {
    this.showAssignmentExistsModal = false;
    this.existingAssignmentPatient = null;
    this.existingAssignmentDoctor = null;
  }

 openUnassignFromExistsModal(): void {
    console.log('🔓 openUnassignFromExistsModal appelé');
    console.log('Patient à désassigner:', this.existingAssignmentPatient);
    
    if (!this.existingAssignmentPatient) {
      console.error('❌ Pas de patient sélectionné');
      this.toastService.error('❌ Erreur', 'Aucun patient sélectionné');
      return;
    }
    
    // SAUVEGARDER LE PATIENT AVANT DE FERMER
    const patientTemp = this.existingAssignmentPatient;
    
    console.log('✅ Fermeture modal assignation existante');
    this.closeAssignmentExistsModal();
    
    console.log('✅ Ouverture modal désassignation pour:', patientTemp.prenom);
    this.openUnassignModalFromUser(patientTemp);
  }

 unassignPatient(): void {
    if (!this.selectedAssignmentToUnassign) {
      this.toastService.warning('⚠️ Sélection requise', 'Veuillez sélectionner un médecin');
      return;
    }

    // Utiliser le service au lieu de http.delete directement
    this.adminService.unassignAssignment(this.selectedAssignmentToUnassign).subscribe({
      next: (response: any) => {
        if (response.success) {
          this.toastService.success('✅ Désassignation réussie', response.message);
          this.closeUnassignModal();
          this.loadUsers();
        }
      },
      error: (err) => {
        console.error('Erreur désassignation:', err);
        this.toastService.error('❌ Erreur', err.error?.message || 'Impossible de désassigner');
      }
    });
  }

  // ========== ASSIGNATIONS ==========

  loadAssignments(): void {
    this.loadingAssignments = true;
    
    const actif = this.assignmentFilterStatus === 'actives' ? true : 
                  this.assignmentFilterStatus === 'inactives' ? false : 
                  undefined;
    
    this.adminService.getAllAssignments(actif).subscribe({
      next: (response) => {
        if (response.success) {
          this.assignments = response.assignations;
          this.assignmentStats = response.stats;
          this.applyAssignmentFilters();
          console.log('📋', this.assignments.length, 'assignations chargées');
        }
        this.loadingAssignments = false;
      },
      error: (err) => {
        console.error('Erreur assignations:', err);
        this.toastService.error('Erreur', 'Impossible de charger les assignations');
        this.loadingAssignments = false;
      }
    });
  }

  applyAssignmentFilters(): void {
    this.currentAssignmentPage = 1;
    
    let filtered = [...this.assignments];
    
    // Filtre par statut (déjà appliqué au niveau API)
    
    // Recherche
    if (this.assignmentSearchQuery) {
      const query = this.assignmentSearchQuery.toLowerCase();
      filtered = filtered.filter(a =>
        a.patientId?.prenom.toLowerCase().includes(query) ||
        a.patientId?.nom.toLowerCase().includes(query) ||
        a.medecinId?.prenom.toLowerCase().includes(query) ||
        a.medecinId?.nom.toLowerCase().includes(query) ||
        a.patientId?.email.toLowerCase().includes(query) ||
        a.medecinId?.email.toLowerCase().includes(query)
      );
    }
    
    this.filteredAssignments = filtered;
  }

  exportAssignmentsCSV(): void {
    this.adminService.exportAssignmentsCSV().subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `assignations-${Date.now()}.csv`;
        link.click();
        window.URL.revokeObjectURL(url);
        
        this.toastService.success('✅ Export réussi', 'Fichier CSV téléchargé');
      },
      error: (err) => {
        console.error('Erreur export:', err);
        this.toastService.error('❌ Erreur', 'Impossible d\'exporter');
      }
    });
  }

openUnassignFromTableModal(assignment: Assignment): void {
    this.assignmentToUnassignFromTable = assignment;
    this.showUnassignFromTableModal = true;
  }

  closeUnassignFromTableModal(): void {
    this.showUnassignFromTableModal = false;
    this.assignmentToUnassignFromTable = null;
  }

  unassignFromList(): void {
    if (!this.assignmentToUnassignFromTable) return;

    this.adminService.unassignAssignment(this.assignmentToUnassignFromTable._id).subscribe({
      next: (response) => {
        if (response.success) {
          this.toastService.success('✅ Désassignation réussie', response.message);
          this.closeUnassignFromTableModal();
          this.loadAssignments();
        }
      },
      error: (err) => {
        console.error('Erreur désassignation:', err);
        this.toastService.error('❌ Erreur', err.error?.message || 'Impossible de désassigner');
        this.closeUnassignFromTableModal();
      }
    });
  }

}