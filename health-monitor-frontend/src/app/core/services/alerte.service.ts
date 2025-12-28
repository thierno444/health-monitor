import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Alerte {
  _id: string;
  idUtilisateur: any;
  idMesure?: any;
  type: 'avertissement' | 'danger' | 'critique';
  parametre: 'bpm' | 'spo2' | 'temperature' | 'batterie' | 'dispositif';
  valeur: number;
  seuil: number;
  message: string;
  estAcquittee: boolean;
  dateAcquittement?: Date;
  acquitteePar?: any;
  horodatage: Date;
  createdAt: Date;
}

export interface StatistiquesAlertes {
  total: number;
  actives: number;
  acquittees: number;
  critiques: number;
  danger: number;
  avertissement: number;
}

@Injectable({
  providedIn: 'root'
})
export class AlerteService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // Alertes actives
  getAlertesActives(): Observable<any> {
    return this.http.get(`${this.apiUrl}/alertes/actives`);
  }

  // Toutes les alertes avec filtres
  getAlertes(statut?: string, type?: string, patientId?: string): Observable<any> {
    let url = `${this.apiUrl}/alertes?`;
    if (statut) url += `statut=${statut}&`;
    if (type) url += `type=${type}&`;
    if (patientId) url += `patientId=${patientId}&`;
    return this.http.get(url);
  }

  // Alertes d'un patient
  getAlertesPatient(patientId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/alertes/patient/${patientId}`);
  }

  // Acquitter une alerte
  acquitterAlerte(alerteId: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/alertes/${alerteId}/acquitter`, {});
  }

  // Acquitter plusieurs alertes
  acquitterMasse(alerteIds: string[]): Observable<any> {
    return this.http.put(`${this.apiUrl}/alertes/acquitter-masse`, { alerteIds });
  }

  // Statistiques
  getStatistiques(): Observable<any> {
    return this.http.get(`${this.apiUrl}/alertes/statistiques`);
  }
}