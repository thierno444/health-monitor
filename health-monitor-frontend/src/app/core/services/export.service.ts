import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ExportService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  exportPDF(userId: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/measurements/export/pdf/${userId}`, {
      responseType: 'blob'
    });
  }

  exportCSV(userId: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/measurements/export/csv/${userId}`, {
      responseType: 'blob'
    });
  }

  downloadFile(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  // Export rapport médecin patient
  exportRapportPatient(patientId: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/medecin/rapport-patient/${patientId}`, {
      responseType: 'blob'
    });
  }

  // Export CSV global médecin
  exportCSVGlobal(): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/medecin/export-csv-global`, {
      responseType: 'blob'
    });
  }
}