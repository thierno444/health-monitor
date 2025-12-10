import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

interface Measurement {
  _id: string;
  idUtilisateur: string;
  idDispositif: string;
  bpm: number;
  spo2: number;
  statut: 'NORMAL' | 'ATTENTION' | 'DANGER';
  niveauBatterie?: number;
  temperature?: number;
  qualite: string;
  horodatageMesure: Date;
  createdAt: Date;
}

interface MeasurementStats {
  nombreMesures: number;
  bpm: { moyenne: number; min: number; max: number; };
  spo2: { moyenne: number; min: number; max: number; };
  statuts: { normal: number; attention: number; danger: number; };
  derniereMesure: Date;
}

@Injectable({
  providedIn: 'root'
})
export class MeasurementService {
  private apiUrl = 'http://localhost:5000/api/measurements';

  constructor(private http: HttpClient) {}

  getMeasurements(userId: string, limit: number = 50): Observable<any> {
    return this.http.get(`${this.apiUrl}?userId=${userId}&limit=${limit}`);
  }

  getStats(userId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/stats?userId=${userId}`);
  }

  getLatestMeasurement(userId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}?userId=${userId}&limit=1`);
  }
}