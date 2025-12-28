import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ComparaisonData {
  patients: any[];
  mesures: any[];
  statistiques: any;
}

@Injectable({
  providedIn: 'root'
})
export class ComparisonService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // Récupérer les données de comparaison
  getComparaisonData(patientIds: string[]): Observable<any> {
    return this.http.post(`${this.apiUrl}/medecin/comparaison`, { patientIds });
  }
}