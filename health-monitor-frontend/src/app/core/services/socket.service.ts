import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SocketService {
  private socket: Socket | null = null;
  private socketUrl = 'http://localhost:5000';

  constructor() {}

  connect(): void {
    if (!this.socket) {
      this.socket = io(this.socketUrl);
      
      this.socket.on('connect', () => {
        console.log('✅ Socket.IO connecté:', this.socket?.id);
      });

      this.socket.on('disconnect', () => {
        console.log('❌ Socket.IO déconnecté');
      });
    }
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  subscribeToUser(userId: string): void {
    if (this.socket) {
      this.socket.emit('abonner-utilisateur', userId);
      console.log('📡 Abonné aux mesures de:', userId);
    }
  }

  onNewMeasurement(): Observable<any> {
    return new Observable(observer => {
      if (this.socket) {
        this.socket.on('nouvelle-mesure', (data: any) => {
          console.log('📊 Nouvelle mesure reçue:', data);
          observer.next(data);
        });
      }
    });
  }

  onSubscriptionConfirmed(): Observable<any> {
    return new Observable(observer => {
      if (this.socket) {
        this.socket.on('abonnement-confirme', (data: any) => {
          console.log('✅ Abonnement confirmé:', data);
          observer.next(data);
        });
      }
    });
  }
}