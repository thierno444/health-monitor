import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, interval } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Notification {
  _id: string;
  utilisateurId: string;
  titre: string;
  message: string;
  type: 'alerte' | 'info' | 'assignation' | 'mesure' | 'systeme';
  lue: boolean;
  lien?: string;
  donnees?: any;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private apiUrl = environment.apiUrl;
  private unreadCountSubject = new BehaviorSubject<number>(0);
  public unreadCount$ = this.unreadCountSubject.asObservable();

  constructor(private http: HttpClient) {
    // Vérifier les notifications toutes les 30 secondes
    interval(30000).subscribe(() => {
      this.loadUnreadCount();
    });
  }

  // Récupérer toutes les notifications
  getNotifications(): Observable<any> {
    return this.http.get(`${this.apiUrl}/notifications`);
  }

  // Récupérer le nombre de notifications non lues
  getUnreadCount(): Observable<any> {
    return this.http.get(`${this.apiUrl}/notifications/unread-count`);
  }

  // Charger le count et mettre à jour le subject
  loadUnreadCount(): void {
    this.getUnreadCount().subscribe({
      next: (response) => {
        if (response.success) {
          this.unreadCountSubject.next(response.count);
        }
      },
      error: (err) => {
        console.error('Erreur count notifications:', err);
      }
    });
  }

  // Marquer comme lue
  markAsRead(notificationId: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/notifications/${notificationId}/read`, {});
  }

  // Supprimer une notification
  deleteNotification(notificationId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/notifications/${notificationId}`);
  }

  // Marquer toutes comme lues
  markAllAsRead(notificationIds: string[]): Observable<any> {
    return this.http.post(`${this.apiUrl}/notifications/mark-all-read`, { notificationIds });
  }
}