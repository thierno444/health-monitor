import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { MeasurementService } from '../../../core/services/measurement.service';
import { SocketService } from '../../../core/services/socket.service';
import { Subscription } from 'rxjs';
import { Chart, registerables } from 'chart.js';

// Enregistrer les composants Chart.js
Chart.register(...registerables);

@Component({
  selector: 'app-patient-dashboard',
  standalone: true,
  imports: [CommonModule],
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
  itemsPerPage: number = 5;
  // Charts
  @ViewChild('bpmChart') bpmChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('spo2Chart') spo2ChartRef!: ElementRef<HTMLCanvasElement>;
  private bpmChart: Chart | null = null;
  private spo2Chart: Chart | null = null;
  
  private subscriptions: Subscription[] = [];

  constructor(
    private authService: AuthService,
    private measurementService: MeasurementService,
    private socketService: SocketService,
    private router: Router
  ) {}

  ngOnInit(): void {
    console.log('🚀 Dashboard initialisé');
    
    // Charger le profil utilisateur EXPLICITEMENT
    this.authService.loadUserProfile();
    
    // S'abonner aux changements d'utilisateur
    this.authService.currentUser$.subscribe(user => {
      console.log('👤 Utilisateur reçu:', user);
      this.user = user;
      
      if (user?.id) {
        console.log('📊 Chargement des données pour:', user.id);
        this.loadDashboardData(user.id);
        this.setupSocketConnection(user.id);
      } else {
        console.error('❌ Pas d\'ID utilisateur !');
        this.loading = false;
      }
    });
  }

  ngAfterViewInit(): void {
    // Attendre que les données soient chargées avant de créer les graphiques
    setTimeout(() => {
      if (this.measurements.length > 0) {
        this.createCharts();
      }
    }, 500);
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
          this.stats = response.statistiques;
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

  goToProfile(): void {
  this.router.navigate(['/profile']);
  }

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

updateCharts(): void {
  if (this.measurements.length > 0) {
    this.createBpmChart();
    this.createSpo2Chart();
  }
}

  ngOnDestroy(): void {
  this.subscriptions.forEach(sub => sub.unsubscribe());
  this.socketService.disconnect();
  
  // Détruire les graphiques
  if (this.bpmChart) {
    this.bpmChart.destroy();
  }
  if (this.spo2Chart) {
    this.spo2Chart.destroy();
  }
}
}