import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environment';

export interface Patient {
  id: string;
  prenom: string;
  nom: string;
  email: string;
  dateDeNaissance?: Date;
  genre?: 'homme' | 'femme' | 'autre';
  photoProfil?: string;
  idDispositif?: string;
  estArchive: boolean;
  dateArchivage?: Date;
  raisonArchivage?: string;
  commentaireArchivage?: string;
  nombreMesures?: number;
  derniereMesure?: {
    bpm: number;
    spo2: number;
    statut: string;
    horodatageMesure: Date;
  };
}

export interface StatistiquesPatient {
  totalPatients: number;
  patientsActifs: number;
  patientsArchives: number;
  patientsARisque: number;
  alertesActives: number;
}

@Injectable({
  providedIn: 'root'
})
export class PatientService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // Liste tous les patients (actifs ou archivés)
  getPatients(includeArchived: boolean = false): Observable<any> {
    const url = includeArchived 
      ? `${this.apiUrl}/medecin/patients?archives=true`
      : `${this.apiUrl}/medecin/patients`;
    return this.http.get(url);
  }

  // Détails d'un patient
  getPatient(patientId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/medecin/patients/${patientId}`);
  }

  // Mesures d'un patient
  getPatientMeasurements(patientId: string, limit: number = 50): Observable<any> {
    return this.http.get(`${this.apiUrl}/measurements/user/${patientId}?limit=${limit}`);
  }

  // Statistiques d'un patient
  getPatientStats(patientId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/measurements/stats/${patientId}`);
  }

  // Statistiques globales médecin
  getGlobalStats(): Observable<any> {
    return this.http.get(`${this.apiUrl}/medecin/statistiques`);
  }

  // ARCHIVAGE
  archiverPatient(patientId: string, raison: string, commentaire: string = ''): Observable<any> {
    return this.http.put(`${this.apiUrl}/archivage/${patientId}/archiver`, {
      raison,
      commentaire
    });
  }

  desarchiverPatient(patientId: string, raison: string = ''): Observable<any> {
    return this.http.put(`${this.apiUrl}/archivage/${patientId}/desarchiver`, {
      raison
    });
  }

  // Recherche patients
  searchPatients(query: string, includeArchived: boolean = false): Observable<any> {
    return this.http.get(`${this.apiUrl}/medecin/patients/search`, {
      params: { q: query, archives: includeArchived.toString() }
    });
  }
}