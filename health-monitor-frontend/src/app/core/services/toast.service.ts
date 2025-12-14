import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface Toast {
  id: number;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private toastsSubject = new BehaviorSubject<Toast[]>([]);
  public toasts$ = this.toastsSubject.asObservable();
  private nextId = 1;

  success(title: string, message: string = ''): void {
    this.show('success', title, message);
  }

  error(title: string, message: string = ''): void {
    this.show('error', title, message);
  }

  info(title: string, message: string = ''): void {
    this.show('info', title, message);
  }

  warning(title: string, message: string = ''): void {
    this.show('warning', title, message);
  }

  private show(type: Toast['type'], title: string, message: string): void {
    const toast: Toast = {
      id: this.nextId++,
      type,
      title,
      message
    };

    const currentToasts = this.toastsSubject.value;
    this.toastsSubject.next([...currentToasts, toast]);

    // Auto-dismiss après 5 secondes
    setTimeout(() => this.dismiss(toast.id), 5000);
  }

  dismiss(id: number): void {
    const currentToasts = this.toastsSubject.value;
    this.toastsSubject.next(currentToasts.filter(t => t.id !== id));
  }
}