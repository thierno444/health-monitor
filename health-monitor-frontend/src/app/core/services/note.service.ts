import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environment';

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
}