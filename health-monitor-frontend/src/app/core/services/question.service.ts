import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environment';

export interface Question {
  _id: string;
  noteId: any;
  patientId: any;
  medecinId: any;
  question: string;
  reponse?: string;
  statut: 'en_attente' | 'repondu';
  dateReponse?: Date;
  createdAt: Date;
}

@Injectable({
  providedIn: 'root'
})
export class QuestionService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // Patient - Poser une question
  poserQuestion(noteId: string, question: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/questions`, { noteId, question });
  }

  // Patient - Questions d'une note
  getQuestionsNote(noteId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/questions/note/${noteId}`);
  }

  // Patient - Mes questions
  getMesQuestions(): Observable<any> {
    return this.http.get(`${this.apiUrl}/questions/mes-questions`);
  }

  // Médecin - Questions reçues
  getQuestionsRecues(): Observable<any> {
    return this.http.get(`${this.apiUrl}/questions/medecin/questions-recues`);
  }

  // Médecin - Répondre
  repondre(questionId: string, reponse: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/questions/${questionId}/repondre`, { reponse });
  }
}