import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { MeasurementService } from '../../../core/services/measurement.service';
import { SocketService } from '../../../core/services/socket.service';
import { Subscription } from 'rxjs';
import { Chart, registerables } from 'chart.js';
import { ThemeService } from '../../../core/services/theme.service';
import { ExportService } from '../../../core/services/export.service';
import { ToastService } from '../../../core/services/toast.service';
import { ToastComponent } from '../../../shared/components/toast/toast.component';
import { take } from 'rxjs/operators'; // ← AJOUTER



// Enregistrer les composants Chart.js
Chart.register(...registerables);

@Component({
  selector: 'app-patient-dashboard',
  standalone: true,
  imports: [CommonModule,FormsModule,ToastComponent],
  templateUrl: './patient-dashboard.html',
  styleUrls: ['./patient-dashboard.scss']
})
export class PatientDashboardComponent implements OnInit, OnDestroy, AfterViewInit {
  user: any = null;
  latestMeasurement: any = null;
  measurements: any[] = [];  // ← INITIALISER AVEC []
  stats: any = null;
  loading: boolean = true;
  currentPage: number = 1;
  itemsPerPage: number = 10;
  // Charts
  @ViewChild('bpmChart') bpmChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('spo2Chart') spo2ChartRef!: ElementRef<HTMLCanvasElement>;
  private bpmChart: Chart | null = null;
  private spo2Chart: Chart | null = null;

  // Charts pour l'onglet détaillé
  @ViewChild('bpmChartDetailed') bpmChartDetailedRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('spo2ChartDetailed') spo2ChartDetailedRef!: ElementRef<HTMLCanvasElement>;
  private bpmChartDetailed: Chart | null = null;
  private spo2ChartDetailed: Chart | null = null;

  // Période de sélection
  selectedPeriod: string = '7j';

  // Loading states
  exportingPDF: boolean = false;
  exportingCSV: boolean = false;
  savingSettings: boolean = false;
  savingProfile: boolean = false;
  changingPassword: boolean = false;

  // Formulaires
  settingsForm = {
    bpmMin: 60,
    bpmMax: 100,
    spo2Min: 95,
    emailNotifications: true
  };

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

  // Sidebar et navigation
  currentTab: string = 'overview';
  sidebarOpen: boolean = true;
  darkMode: boolean = false;
  
  private subscriptions: Subscription[] = [];

  constructor(
    private authService: AuthService,
    private measurementService: MeasurementService,
    private socketService: SocketService,
    private router: Router,
    private themeService: ThemeService,
    private exportService: ExportService,
    private toastService: ToastService


  ) {}

ngOnInit(): void {
  console.log('🚀 Dashboard initialisé');
  
  // S'abonner au thème
  this.themeService.darkMode$.subscribe(isDark => {
    this.darkMode = isDark;
  });
  
  // Charger le profil utilisateur UNE SEULE FOIS
  this.authService.currentUser$.pipe(
    take(1) // ← PRENDRE SEULEMENT LA PREMIÈRE VALEUR !
  ).subscribe(user => {
    console.log('👤 Utilisateur reçu:', user);
    this.user = user;
    
    if (user?.id) {
      console.log('📊 Chargement des données pour:', user.id);
      this.loadDashboardData(user.id);
      this.setupSocketConnection(user.id);
      this.initForms();
    } else {
      console.error('❌ Pas d\'ID utilisateur !');
      this.loading = false;
    }
  });
}

  ngAfterViewInit(): void {
  // Attendre que les données soient chargées ET que l'onglet overview soit actif
  setTimeout(() => {
    if (this.measurements.length > 0 && this.currentTab === 'overview') {
      this.createCharts();
    }
  }, 1000);
}

 loadDashboardData(userId: string): void {
  console.log('📥 Chargement des mesures pour:', userId);
  this.loading = true;

  // Charger les mesures
  this.measurementService.getMeasurements(userId, 50).subscribe({
    next: (response) => {
      console.log('📊 Réponse mesures:', response);
      if (response.success && response.data) {
        this.measurements = response.data;
        this.latestMeasurement = this.measurements[0] || null;
        console.log('✅ Mesures chargées:', this.measurements.length);
        
        // Créer les graphiques après chargement des données
        setTimeout(() => {
          if (this.currentTab === 'overview') {
            this.createCharts();
          }
        }, 500);
      } else {
        console.log('⚠️ Pas de mesures trouvées');
        this.measurements = [];
        this.latestMeasurement = null;
      }
      this.loading = false;
    },
    error: (err) => {
      console.error('❌ Erreur chargement mesures:', err);
      this.measurements = [];
      this.latestMeasurement = null;
      this.loading = false;
    }
  });

  // Charger les stats
  this.measurementService.getStats(userId).subscribe({
    next: (response) => {
      console.log('📈 Stats:', response);
      if (response.success) {
        this.stats = response.stats;
      }
    },
    error: (err) => {
      console.error('❌ Erreur chargement stats:', err);
    }
  });
}

  setupSocketConnection(userId: string): void {
    console.log('⚡ Configuration Socket.IO pour:', userId);
    this.socketService.connect();
    this.socketService.subscribeToUser(userId);

    // Écouter les nouvelles mesures
    const sub = this.socketService.onNewMeasurement().subscribe((data) => {
    console.log('📊 Nouvelle mesure temps réel:', data);
    this.latestMeasurement = data.mesure;
    
    if (!this.measurements) {
      this.measurements = [];
    }
    this.measurements.unshift(data.mesure);
    
    if (this.measurements.length > 50) {
      this.measurements.pop();
    }
    
    // Mettre à jour les graphiques
    this.updateCharts();
  });
    this.subscriptions.push(sub);
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'NORMAL': return 'text-green-500';
      case 'ATTENTION': return 'text-yellow-500';
      case 'DANGER': return 'text-red-500';
      default: return 'text-gray-500';
    }
  }

  getStatusBg(status: string): string {
    switch (status) {
      case 'NORMAL': return 'bg-green-500/20';
      case 'ATTENTION': return 'bg-yellow-500/20';
      case 'DANGER': return 'bg-red-500/20';
      default: return 'bg-gray-500/20';
    }
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'NORMAL': return '✅';
      case 'ATTENTION': return '⚠️';
      case 'DANGER': return '🚨';
      default: return '❓';
    }
  }

  getBpmStatus(bpm: number): string {
    if (bpm < 60) return 'ATTENTION';
    if (bpm > 100) return 'ATTENTION';
    if (bpm > 120) return 'DANGER';
    return 'NORMAL';
  }

  getSpo2Status(spo2: number): string {
    if (spo2 < 90) return 'DANGER';
    if (spo2 < 95) return 'ATTENTION';
    return 'NORMAL';
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  // goToProfile(): void {
  // this.router.navigate(['/profile']);
  // }

  get paginatedMeasurements(): any[] {
  const start = (this.currentPage - 1) * this.itemsPerPage;
  const end = start + this.itemsPerPage;
  return this.measurements.slice(start, end);
}

get totalPages(): number {
  return Math.ceil(this.measurements.length / this.itemsPerPage);
}

get pages(): number[] {
  return Array.from({ length: this.totalPages }, (_, i) => i + 1);
}

goToPage(page: number): void {
  if (page >= 1 && page <= this.totalPages) {
    this.currentPage = page;
  }
}

previousPage(): void {
  if (this.currentPage > 1) {
    this.currentPage--;
  }
}

nextPage(): void {
  if (this.currentPage < this.totalPages) {
    this.currentPage++;
  }
}





createCharts(): void {
  this.createBpmChart();
  this.createSpo2Chart();
}

createBpmChart(): void {
  if (this.bpmChart) {
    this.bpmChart.destroy();
  }

  const ctx = this.bpmChartRef.nativeElement.getContext('2d');
  if (!ctx) return;

  // Prendre les 20 dernières mesures
  const data = this.measurements.slice(0, 20).reverse();
  
  const labels = data.map(m => {
    const date = new Date(m.horodatageMesure);
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  });
  
  const values = data.map(m => m.bpm);

  this.bpmChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'BPM',
        data: values,
        borderColor: '#0D8ABC',
        backgroundColor: 'rgba(13, 138, 188, 0.1)',
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointRadius: 5,
        pointHoverRadius: 7,
        pointBackgroundColor: '#0D8ABC',
        pointBorderColor: '#fff',
        pointBorderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          padding: 12,
          titleColor: '#fff',
          bodyColor: '#fff',
          borderColor: '#0D8ABC',
          borderWidth: 1
        }
      },
      scales: {
        y: {
          beginAtZero: false,
          min: 50,
          max: 150,
          grid: {
            color: 'rgba(0, 0, 0, 0.05)'
          },
          ticks: {
            callback: function(value) {
              return value + ' BPM';
            }
          }
        },
        x: {
          grid: {
            display: false
          }
        }
      },
      animation: {
        duration: 1000,
        easing: 'easeInOutQuart'
      }
    }
  });
}

createSpo2Chart(): void {
  if (this.spo2Chart) {
    this.spo2Chart.destroy();
  }

  const ctx = this.spo2ChartRef.nativeElement.getContext('2d');
  if (!ctx) return;

  // Prendre les 20 dernières mesures
  const data = this.measurements.slice(0, 20).reverse();
  
  const labels = data.map(m => {
    const date = new Date(m.horodatageMesure);
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  });
  
  const values = data.map(m => m.spo2);

  this.spo2Chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'SpO2',
        data: values,
        borderColor: '#9333EA',
        backgroundColor: 'rgba(147, 51, 234, 0.1)',
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointRadius: 5,
        pointHoverRadius: 7,
        pointBackgroundColor: '#9333EA',
        pointBorderColor: '#fff',
        pointBorderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          padding: 12,
          titleColor: '#fff',
          bodyColor: '#fff',
          borderColor: '#9333EA',
          borderWidth: 1
        }
      },
      scales: {
        y: {
          beginAtZero: false,
          min: 85,
          max: 100,
          grid: {
            color: 'rgba(0, 0, 0, 0.05)'
          },
          ticks: {
            callback: function(value) {
              return value + '%';
            }
          }
        },
        x: {
          grid: {
            display: false
          }
        }
      },
      animation: {
        duration: 1000,
        easing: 'easeInOutQuart'
      }
    }
  });
}

createDetailedCharts(): void {
  this.createBpmChartDetailed();
  this.createSpo2ChartDetailed();
}

createBpmChartDetailed(): void {
  if (this.bpmChartDetailed) {
    this.bpmChartDetailed.destroy();
  }

  const ctx = this.bpmChartDetailedRef?.nativeElement?.getContext('2d');
  if (!ctx) {
    console.log('Canvas BPM détaillé non trouvé');
    return;
  }

  // Filtrer selon la période sélectionnée
  const data = this.getFilteredData();
  
  const labels = data.map(m => {
    const date = new Date(m.horodatageMesure);
    return date.toLocaleString('fr-FR', { 
      day: '2-digit', 
      month: '2-digit',
      hour: '2-digit', 
      minute: '2-digit' 
    });
  });
  
  const values = data.map(m => m.bpm);
  
  // Couleurs selon statut
  const colors = data.map(m => {
    if (m.bpm < 60 || m.bpm > 100) return 'rgba(220, 38, 38, 0.8)'; // Rouge
    if (m.bpm >= 90 && m.bpm <= 100) return 'rgba(251, 191, 36, 0.8)'; // Jaune
    return 'rgba(34, 197, 94, 0.8)'; // Vert
  });

  this.bpmChartDetailed = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'BPM',
        data: values,
        borderColor: '#0D8ABC',
        backgroundColor: 'rgba(13, 138, 188, 0.1)',
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointRadius: 6,
        pointHoverRadius: 8,
        pointBackgroundColor: colors,
        pointBorderColor: '#fff',
        pointBorderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          padding: 12,
          titleColor: '#fff',
          bodyColor: '#fff',
          borderColor: '#0D8ABC',
          borderWidth: 1,
          callbacks: {
            label: function(context) {
              const value = context.parsed.y;
              if (value === null || value === undefined) return '';
              
              let status = 'Normal';
              if (value < 60) status = 'Bas';
              else if (value > 100) status = 'Élevé';
              else if (value >= 90) status = 'Attention';
              return `${value} BPM (${status})`;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: false,
          min: 50,
          max: 150,
          grid: {
            color: 'rgba(0, 0, 0, 0.05)'
          },
          ticks: {
            callback: function(value) {
              return value + ' BPM';
            }
          }
        },
        x: {
          grid: {
            display: false
          },
          ticks: {
            maxRotation: 45,
            minRotation: 45
          }
        }
      },
      animation: {
        duration: 1000,
        easing: 'easeInOutQuart'
      }
    }
  });
}

createSpo2ChartDetailed(): void {
  if (this.spo2ChartDetailed) {
    this.spo2ChartDetailed.destroy();
  }

  const ctx = this.spo2ChartDetailedRef?.nativeElement?.getContext('2d');
  if (!ctx) {
    console.log('Canvas SpO2 détaillé non trouvé');
    return;
  }

  // Filtrer selon la période sélectionnée
  const data = this.getFilteredData();
  
  const labels = data.map(m => {
    const date = new Date(m.horodatageMesure);
    return date.toLocaleString('fr-FR', { 
      day: '2-digit', 
      month: '2-digit',
      hour: '2-digit', 
      minute: '2-digit' 
    });
  });
  
  const values = data.map(m => m.spo2);
  
  // Couleurs selon statut
  const colors = data.map(m => {
    if (m.spo2 < 90) return 'rgba(220, 38, 38, 0.8)'; // Rouge
    if (m.spo2 >= 90 && m.spo2 < 95) return 'rgba(251, 191, 36, 0.8)'; // Jaune
    return 'rgba(34, 197, 94, 0.8)'; // Vert
  });

  this.spo2ChartDetailed = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'SpO2',
        data: values,
        borderColor: '#9333EA',
        backgroundColor: 'rgba(147, 51, 234, 0.1)',
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointRadius: 6,
        pointHoverRadius: 8,
        pointBackgroundColor: colors,
        pointBorderColor: '#fff',
        pointBorderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          padding: 12,
          titleColor: '#fff',
          bodyColor: '#fff',
          borderColor: '#9333EA',
          borderWidth: 1,
          callbacks: {
            label: function(context) {
              const value = context.parsed.y;
              if (value === null || value === undefined) return '';
              
              let status = 'Normal';
              if (value < 90) status = 'Critique';
              else if (value < 95) status = 'Attention';
              return `${value}% (${status})`;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: false,
          min: 85,
          max: 100,
          grid: {
            color: 'rgba(0, 0, 0, 0.05)'
          },
          ticks: {
            callback: function(value) {
              return value + '%';
            }
          }
        },
        x: {
          grid: {
            display: false
          },
          ticks: {
            maxRotation: 45,
            minRotation: 45
          }
        }
      },
      animation: {
        duration: 1000,
        easing: 'easeInOutQuart'
      }
    }
  });
}

getFilteredData(): any[] {
  const now = new Date();
  let filteredData = [...this.measurements];
  
  switch(this.selectedPeriod) {
    case '24h':
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      filteredData = this.measurements.filter(m => 
        new Date(m.horodatageMesure) >= yesterday
      );
      break;
    case '7j':
      const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      filteredData = this.measurements.filter(m => 
        new Date(m.horodatageMesure) >= lastWeek
      );
      break;
    case '30j':
      const lastMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      filteredData = this.measurements.filter(m => 
        new Date(m.horodatageMesure) >= lastMonth
      );
      break;
    case 'all':
      // Tous
      break;
  }
  
  return filteredData.reverse(); // Plus ancien au plus récent
}

changePeriod(period: string): void {
  this.selectedPeriod = period;
  if (this.currentTab === 'charts') {
    this.createDetailedCharts();
  }
}

updateCharts(): void {
  if (this.measurements.length > 0) {
    this.createBpmChart();
    this.createSpo2Chart();
  }
}


// Navigation sidebar
setCurrentTab(tab: string): void {
  this.currentTab = tab;
  
  // Recréer les graphiques selon l'onglet
  if (tab === 'overview') {
    setTimeout(() => {
      if (this.measurements.length > 0) {
        this.createCharts();
      }
    }, 100);
  } else if (tab === 'charts') {
    setTimeout(() => {
      if (this.measurements.length > 0) {
        this.createDetailedCharts();
      }
    }, 100);
  }
}

toggleSidebar(): void {
  this.sidebarOpen = !this.sidebarOpen;
}

toggleTheme(): void {
  this.themeService.toggleTheme();
}

// Navigation
goToProfile(): void {
  this.currentTab = 'profile';
}

goToExport(): void {
  this.currentTab = 'export';
}

goToSettings(): void {
  this.currentTab = 'settings';
}

// Export PDF
exportToPDF(): void {
  if (!this.user?.id) return;
  
  this.exportingPDF = true;
  this.exportService.exportPDF(this.user.id).subscribe({
    next: (blob) => {
      const filename = `health-report-${this.user.prenom}-${new Date().toISOString().split('T')[0]}.pdf`;
      this.exportService.downloadFile(blob, filename);
      this.exportingPDF = false;
      this.toastService.success('Export PDF réussi !', 'Votre rapport a été téléchargé');
    },
    error: (err) => {
      console.error('Erreur export PDF:', err);
      this.exportingPDF = false;
      this.toastService.error('Erreur export PDF', 'Impossible de générer le rapport');
    }
  });
}

// Export CSV
exportToCSV(): void {
  if (!this.user?.id) return;
  
  this.exportingCSV = true;
  this.exportService.exportCSV(this.user.id).subscribe({
    next: (blob) => {
      const filename = `health-data-${this.user.prenom}-${new Date().toISOString().split('T')[0]}.csv`;
      this.exportService.downloadFile(blob, filename);
      this.exportingCSV = false;
      this.toastService.success('Export CSV réussi !', 'Vos données ont été téléchargées');
    },
    error: (err) => {
      console.error('Erreur export CSV:', err);
      this.exportingCSV = false;
      this.toastService.error('Erreur export CSV', 'Impossible de générer le fichier');
    }
  });
}

// Sauvegarder paramètres
saveSettings(): void {
  this.savingSettings = true;
  
  // TODO: Appel API réel
  setTimeout(() => {
    this.savingSettings = false;
    this.toastService.success('Paramètres sauvegardés !', 'Vos seuils ont été mis à jour');
  }, 1000);
}

// Initialiser formulaires
initForms(): void {
  if (this.user) {
    this.profileForm = {
      prenom: this.user.prenom || '',
      nom: this.user.nom || '',
      email: this.user.email || ''
    };
  }
}
 
// Sauvegarder profil
// Sauvegarder profil
saveProfile(): void {
  if (!this.user?.id) return;
  
  this.savingProfile = true;
  
  console.log('📝 Sauvegarde profil');
  
  // N'envoyer QUE les champs texte (pas la photo)
  const profileData = {
    prenom: this.profileForm.prenom,
    nom: this.profileForm.nom,
    email: this.profileForm.email
    // NE PAS INCLURE photoProfil ici
  };
  
  console.log('Données envoyées:', profileData);
  
  // Appel API pour modifier le profil
  this.authService.updateProfile(this.user.id, profileData).subscribe({
    next: (response) => {
      console.log('✅ Réponse backend:', response);
      
      if (response.success && response.utilisateur) {
        // Mettre à jour les infos locales
        this.user.prenom = response.utilisateur.prenom;
        this.user.nom = response.utilisateur.nom;
        this.user.email = response.utilisateur.email;
        
        // Garder la photo locale si le backend n'en renvoie pas
        if (response.utilisateur.photoProfil) {
          this.user.photoProfil = response.utilisateur.photoProfil;
        }
        
        console.log('Photo après maj:', this.user.photoProfil?.substring(0, 50));
        
        // Recharger le profil pour synchroniser
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

// Changer mot de passe
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
  
  this.authService.changePassword(this.user.id, this.passwordForm.currentPassword, this.passwordForm.newPassword).subscribe({
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

// Upload photo
// Upload photo
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
  
  // Convertir en base64
  const reader = new FileReader();
  reader.onload = (e: any) => {
    const photoBase64 = e.target.result;
    
    console.log('📸 Upload photo, taille base64:', photoBase64.length);
    
    // Mise à jour locale immédiate
    if (this.user) {
      this.user.photoProfil = photoBase64;
    }
    
    // Sauvegarder SEULEMENT la photo dans la DB
    this.authService.updateProfile(this.user!.id, {
      photoProfil: photoBase64
    }).subscribe({
      next: (response) => {
        if (response.success) {
          console.log('✅ Photo sauvegardée en DB');
          this.toastService.success('Photo mise à jour !', 'Votre photo a été sauvegardée');
          // Recharger le profil
          this.authService.loadUserProfile();
        }
      },
      error: (err) => {
        console.error('Erreur sauvegarde photo:', err);
        this.toastService.error('Erreur', 'Impossible de sauvegarder la photo. Image trop grande ?');
      }
    });
  };
  reader.readAsDataURL(file);
}


 ngOnDestroy(): void {
  this.subscriptions.forEach(sub => sub.unsubscribe());
  this.socketService.disconnect();
  
  // Détruire tous les graphiques
  if (this.bpmChart) this.bpmChart.destroy();
  if (this.spo2Chart) this.spo2Chart.destroy();
  if (this.bpmChartDetailed) this.bpmChartDetailed.destroy();
  if (this.spo2ChartDetailed) this.spo2ChartDetailed.destroy();
}
}