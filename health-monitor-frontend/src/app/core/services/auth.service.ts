import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../../environment';

export interface User {
  id: string;
  prenom: string;
  nom: string;
  email: string;
  role: 'patient' | 'medecin' | 'admin';
  photoProfil?: string;
  idDispositif?: string;
}

export interface AuthResponse {
  success: boolean;
  token: string;
  utilisateur: User;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = `${environment.apiUrl}/auth`;
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient) {
    const token = this.getToken();
    if (token) {
      this.loadUserProfile();
    }
  }

  login(email: string, motDePasse: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/connexion`, {
      email,
      motDePasse
    }).pipe(
      tap(response => {
        if (response.success) {
          this.setToken(response.token);
          this.currentUserSubject.next(response.utilisateur);
        }
      })
    );
  }

  loadUserProfile(): void {
    this.http.get<any>(`${this.apiUrl}/profil`).subscribe({
      next: (response) => {
        if (response.success) {
          this.currentUserSubject.next(response.utilisateur);
        }
      },
      error: () => {
        this.logout();
      }
    });
  }

  logout(): void {
    localStorage.removeItem('token');
    this.currentUserSubject.next(null);
  }

  setToken(token: string): void {
    localStorage.setItem('token', token);
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }
}
