import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Note {
  _id: string;
  patientId: any;
  medecinId: any;
  contenu: string;
  type: 'observation' | 'diagnostic' | 'prescription' | 'conseil' | 'suivi' | 'autre';
  priorite: 'basse' | 'normale' | 'haute' | 'urgente';
  visible: boolean;
  prive: boolean;
  tags: string[];
  pieceJointes: string[];
  createdAt: Date;
  updatedAt: Date;
}

@Injectable({
  providedIn: 'root'
})
export class NoteService {
  private apiUrl = environment.apiUrl;
  
  // Subject pour le compteur de notes non lues
  private notesNonLuesSubject = new BehaviorSubject<number>(0);
  public notesNonLues$ = this.notesNonLuesSubject.asObservable();

  constructor(private http: HttpClient) {}

  // Notes d'un patient
  getNotesPatient(patientId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/notes/patient/${patientId}`);
  }

  // Toutes les notes du médecin
  getNotesMedecin(): Observable<any> {
    return this.http.get(`${this.apiUrl}/notes/medecin`);
  }

  // Créer une note
  creerNote(data: {
    patientId: string;
    contenu: string;
    type?: string;
    priorite?: string;
    prive?: boolean;
    tags?: string[];
  }): Observable<any> {
    return this.http.post(`${this.apiUrl}/notes`, data);
  }

  // Modifier une note
  modifierNote(noteId: string, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/notes/${noteId}`, data);
  }

  // Supprimer une note
  supprimerNote(noteId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/notes/${noteId}`);
  }

  // Notes du patient connecté (visibles uniquement)
  getMesNotes(): Observable<any> {
    return this.http.get(`${this.apiUrl}/notes/patient/mes-notes`);
  }

  // ========== NOUVEAU: MARQUER NOTES COMME LUES ==========
  marquerNotesLues(patientId: string): Observable<any> {
    console.log('📝 Marquage des notes comme lues pour:', patientId);
    
    return this.http.put(`${this.apiUrl}/notes/patient/${patientId}/marquer-lues`, {}).pipe(
      tap((response: any) => {
        if (response.success) {
          console.log('✅', response.updated, 'notes marquées comme lues');
          
          // IMPORTANT: Recharger le compteur après marquage
          this.loadNotesNonLues(patientId);
        }
      }),
      catchError(error => {
        console.error('❌ Erreur marquage notes lues:', error);
        return throwError(() => error);
      })
    );
  }

  // ========== NOUVEAU: CHARGER COMPTEUR NOTES NON LUES ==========
  loadNotesNonLues(patientId: string): void {
    this.http.get(`${this.apiUrl}/notes/patient/${patientId}/non-lues`).subscribe({
      next: (response: any) => {
        if (response.success) {
          this.notesNonLuesSubject.next(response.count || 0);
          console.log('🔔 Compteur notes non lues mis à jour:', response.count);
        }
      },
      error: (err) => console.error('❌ Erreur chargement compteur notes:', err)
    });
  }

  // ========== NOUVEAU: GET COMPTEUR ACTUEL ==========
  getNotesNonLuesCount(): number {
    return this.notesNonLuesSubject.value;
  }
}