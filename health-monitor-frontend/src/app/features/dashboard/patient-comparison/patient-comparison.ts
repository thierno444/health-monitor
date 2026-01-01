import { Component, OnInit, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ComparisonService } from '../../../core/services/comparison.service';
import { ToastService } from '../../../core/services/toast.service';
import { CommonModule } from '@angular/common';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-patient-comparison',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './patient-comparison.html'
})
export class PatientComparisonComponent implements OnInit, AfterViewInit {
  
  @ViewChild('bpmChart') bpmChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('spo2Chart') spo2ChartRef!: ElementRef<HTMLCanvasElement>;
  
  patients: any[] = [];
  mesures: any[] = [];
  statistiques: any = {};
  loading = true;
  patientIds: string[] = [];
  
  bpmChart: Chart | null = null;
  spo2Chart: Chart | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private comparisonService: ComparisonService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      const ids = params['patients'];
      if (ids) {
        this.patientIds = ids.split(',');
        this.loadComparaison();
      } else {
        this.toastService.error('Erreur', 'Aucun patient sélectionné');
        this.router.navigate(['/dashboard/doctor']);
      }
    });
  }

  ngAfterViewInit(): void {
    // Les graphiques seront créés après le chargement des données
  }

  loadComparaison(): void {
    this.loading = true;
    this.comparisonService.getComparaisonData(this.patientIds).subscribe({
      next: (response) => {
        if (response.success) {
          this.patients = response.patients;
          this.mesures = response.mesures;
          this.statistiques = response.statistiques;
          console.log('📊 Données comparaison:', response);
          
          // Créer les graphiques après chargement des données
          setTimeout(() => {
            this.createCharts();
          }, 100);
        }
        this.loading = false;
      },
      error: (err) => {
        console.error('Erreur comparaison:', err);
        this.toastService.error('Erreur', 'Impossible de charger les données');
        this.loading = false;
      }
    });
  }

  createCharts(): void {
    if (!this.bpmChartRef || !this.spo2ChartRef) {
      console.warn('Canvas non disponibles');
      return;
    }

    // Détruire les graphiques existants
    if (this.bpmChart) this.bpmChart.destroy();
    if (this.spo2Chart) this.spo2Chart.destroy();

    // Préparer les données
    const datasets = this.prepareChartData();

    // Graphique BPM
    this.bpmChart = new Chart(this.bpmChartRef.nativeElement, {
      type: 'line',
      data: {
        labels: datasets.labels,
        datasets: datasets.bpm
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: '💓 Évolution BPM (30 derniers jours)',
            font: { size: 18, weight: 'bold' }
          },
          legend: {
            display: true,
            position: 'top'
          },
          tooltip: {
            mode: 'index',
            intersect: false
          }
        },
        scales: {
          y: {
            beginAtZero: false,
            title: {
              display: true,
              text: 'BPM'
            }
          },
          x: {
            title: {
              display: true,
              text: 'Date'
            }
          }
        },
        interaction: {
          mode: 'nearest',
          axis: 'x',
          intersect: false
        }
      }
    });

    // Graphique SpO2
    this.spo2Chart = new Chart(this.spo2ChartRef.nativeElement, {
      type: 'line',
      data: {
        labels: datasets.labels,
        datasets: datasets.spo2
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: '🫁 Évolution SpO2 (30 derniers jours)',
            font: { size: 18, weight: 'bold' }
          },
          legend: {
            display: true,
            position: 'top'
          },
          tooltip: {
            mode: 'index',
            intersect: false
          }
        },
        scales: {
          y: {
            beginAtZero: false,
            min: 80,
            max: 100,
            title: {
              display: true,
              text: 'SpO2 (%)'
            }
          },
          x: {
            title: {
              display: true,
              text: 'Date'
            }
          }
        },
        interaction: {
          mode: 'nearest',
          axis: 'x',
          intersect: false
        }
      }
    });

    console.log('✅ Graphiques créés');
  }

  prepareChartData(): any {
    // Obtenir toutes les dates uniques et les trier
    const allDates = [...new Set(this.mesures.map(m => 
      new Date(m.horodatageMesure).toLocaleDateString('fr-FR')
    ))].sort((a, b) => {
      const [dayA, monthA, yearA] = a.split('/').map(Number);
      const [dayB, monthB, yearB] = b.split('/').map(Number);
      return new Date(yearA, monthA - 1, dayA).getTime() - new Date(yearB, monthB - 1, dayB).getTime();
    });

    // Prendre 1 date sur 2 pour la lisibilité (si trop de dates)
    const labels = allDates.length > 15 
      ? allDates.filter((_, i) => i % 2 === 0)
      : allDates;

    const bpmDatasets: any[] = [];
    const spo2Datasets: any[] = [];

    // Pour chaque patient, créer un dataset
    this.patients.forEach((patient, index) => {
      const color = this.getPatientColor(index);
      const patientMesures = this.mesures.filter(
        m => m.idUtilisateur.toString() === patient._id
      );

      // Regrouper par date et calculer moyenne
      const bpmByDate: any = {};
      const spo2ByDate: any = {};

      patientMesures.forEach(mesure => {
        const date = new Date(mesure.horodatageMesure).toLocaleDateString('fr-FR');
        if (!bpmByDate[date]) {
          bpmByDate[date] = [];
          spo2ByDate[date] = [];
        }
        bpmByDate[date].push(mesure.bpm);
        spo2ByDate[date].push(mesure.spo2);
      });

      // Calculer moyennes
      const bpmData = labels.map(date => {
        if (bpmByDate[date]) {
          const avg = bpmByDate[date].reduce((a: number, b: number) => a + b, 0) / bpmByDate[date].length;
          return Math.round(avg);
        }
        return null;
      });

      const spo2Data = labels.map(date => {
        if (spo2ByDate[date]) {
          const avg = spo2ByDate[date].reduce((a: number, b: number) => a + b, 0) / spo2ByDate[date].length;
          return Math.round(avg);
        }
        return null;
      });

      bpmDatasets.push({
        label: `${patient.prenom} ${patient.nom}`,
        data: bpmData,
        borderColor: color,
        backgroundColor: color + '20',
        borderWidth: 3,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
        spanGaps: true
      });

      spo2Datasets.push({
        label: `${patient.prenom} ${patient.nom}`,
        data: spo2Data,
        borderColor: color,
        backgroundColor: color + '20',
        borderWidth: 3,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
        spanGaps: true
      });
    });

    return {
      labels,
      bpm: bpmDatasets,
      spo2: spo2Datasets
    };
  }

  retour(): void {
  // Détruire les graphiques avant de quitter
  if (this.bpmChart) this.bpmChart.destroy();
  if (this.spo2Chart) this.spo2Chart.destroy();
  this.router.navigate(['/doctor-dashboard'], { queryParams: { tab: 'reports' } });
  //                      ^^^^^^^^^^^^^^^^^^^ ✅ BONNE ROUTE !
}

  getPatientColor(index: number): string {
    const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6'];
    return colors[index % colors.length];
  }

  formatDate(date: any): string {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }
}