import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface User {
  id: string;
  prenom: string;
  nom: string;
  email: string;
  telephone: string;
  genre?: string;  
  dateDeNaissance?: string;  
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
  private apiUrl = environment.apiUrl; 
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient) {
    // Charger l'utilisateur depuis localStorage au démarrage
    const storedUser = this.getUserFromStorage();
    if (storedUser) {
      console.log('👤 Utilisateur chargé depuis localStorage:', storedUser);
      this.currentUserSubject.next(storedUser);
    }
    
    // Si on a un token, recharger le profil depuis le serveur
    // const token = this.getToken();
    // if (token && storedUser) {
    //   this.loadUserProfile();
    // }
  }

  login(email: string, motDePasse: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/connexion`, {
      email,
      motDePasse
    }).pipe(
      tap(response => {
        if (response.success) {
          console.log('✅ Connexion réussie');
          
          // Sauvegarder le token
          this.setToken(response.token);
          
          // Sauvegarder l'utilisateur dans localStorage
          this.setUserInStorage(response.utilisateur);
          
          // Émettre l'utilisateur
          this.currentUserSubject.next(response.utilisateur);
        }
      })
    );
  }

  // Inscription
  register(userData: any): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/inscription`, userData).pipe(
      tap(response => {
        if (response.success && response.token) {
          this.setToken(response.token);
          this.currentUserSubject.next(response.utilisateur);
        }
      })
    );
  }
  

  loadUserProfile(): void {
    this.http.get<any>(`${this.apiUrl}/auth/profil`).subscribe({
      next: (response) => {
        if (response.success) {
          console.log('🔄 Profil rechargé depuis serveur');
          
          // Mettre à jour localStorage
          this.setUserInStorage(response.utilisateur);
          
          // Émettre l'utilisateur
          this.currentUserSubject.next(response.utilisateur);
        }
      },
      error: (err) => {
        console.error('❌ Erreur chargement profil:', err);
        // Si le token est invalide, déconnecter
        if (err.status === 401) {
          this.logout();
        }
      }
    });
  }

  logout(): void {
    console.log('👋 Déconnexion');
    localStorage.removeItem('token');
    localStorage.removeItem('currentUser');
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
    // D'abord essayer de récupérer depuis le BehaviorSubject
    const user = this.currentUserSubject.value;
    if (user) {
      return user;
    }
    
    // Sinon, récupérer depuis localStorage
    return this.getUserFromStorage();
  }

  // Nouvelle méthode : Sauvegarder l'utilisateur dans localStorage
  private setUserInStorage(user: User): void {
    localStorage.setItem('currentUser', JSON.stringify(user));
  }

  // Nouvelle méthode : Récupérer l'utilisateur depuis localStorage
  private getUserFromStorage(): User | null {
    const userStr = localStorage.getItem('currentUser');
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch (e) {
        console.error('❌ Erreur parsing user:', e);
        return null;
      }
    }
    return null;
  }

  updateProfile(userId: string, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/auth/utilisateurs/${userId}`, data).pipe(
      tap((response: any) => {
        if (response.success && response.utilisateur) {
          // Mettre à jour localStorage
          this.setUserInStorage(response.utilisateur);
          
          // Émettre l'utilisateur mis à jour
          this.currentUserSubject.next(response.utilisateur);
        }
      })
    );
  }

  changePassword(userId: string, currentPassword: string, newPassword: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/auth/utilisateurs/${userId}/password`, {
      currentPassword,
      newPassword
    });
  }

  uploadPhoto(userId: string, photoBase64: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/utilisateurs/${userId}/photo`, { 
      photo: photoBase64 
    }).pipe(
      tap((response: any) => {
        console.log('📸 Réponse upload photo:', response);
        
        if (response.success && response.utilisateur) {
          console.log('✅ Photo sauvegardée en DB');
          console.log('📸 Nouvelle photo URL:', response.utilisateur.photoProfil?.substring(0, 100));
          
          // Mettre à jour localStorage IMMÉDIATEMENT
          this.setUserInStorage(response.utilisateur);
          
          // Émettre l'utilisateur mis à jour
          this.currentUserSubject.next(response.utilisateur);
          
          console.log('✅ localStorage mis à jour');
        }
      })
    );
  }

  // Mot de passe oublié
  forgotPassword(email: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/forgot-password`, { email });
  }

  // Réinitialiser le mot de passe
  resetPassword(token: string, password: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/reset-password/${token}`, { password });
  }

  // Valider l'email (format)
  validateEmail(email: string): { valid: boolean; message: string } {
    if (!email) {
      return { valid: false, message: 'L\'email est requis' };
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { valid: false, message: 'Format d\'email invalide' };
    }
    
    return { valid: true, message: '' };
  }

  // Valider le mot de passe
  validatePassword(password: string): { valid: boolean; message: string } {
    if (!password) {
      return { valid: false, message: 'Le mot de passe est requis' };
    }
    
    if (password.length < 6) {
      return { valid: false, message: 'Le mot de passe doit contenir au moins 6 caractères' };
    }
    
    return { valid: true, message: '' };
  }




  
}