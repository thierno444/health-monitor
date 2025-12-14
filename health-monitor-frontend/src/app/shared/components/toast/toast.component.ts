import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService, Toast } from '../../../core/services/toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed top-20 right-4 z-50 space-y-3">
      <div 
        *ngFor="let toast of toasts"
        [class]="getToastClass(toast.type)"
        class="min-w-80 max-w-md p-4 rounded-xl shadow-2xl backdrop-blur-xl border-2 animate-slide-in-right"
      >
        <div class="flex items-start space-x-3">
          <!-- Icon -->
          <div [class]="getIconBgClass(toast.type)" class="p-2 rounded-lg flex-shrink-0">
            <svg class="w-6 h-6" [class]="getIconColorClass(toast.type)" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <!-- Success -->
              <path *ngIf="toast.type === 'success'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              <!-- Error -->
              <path *ngIf="toast.type === 'error'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              <!-- Info -->
              <path *ngIf="toast.type === 'info'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              <!-- Warning -->
              <path *ngIf="toast.type === 'warning'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
            </svg>
          </div>
          
          <!-- Content -->
          <div class="flex-1">
            <h4 class="font-bold text-gray-900 dark:text-white mb-1">{{ toast.title }}</h4>
            <p *ngIf="toast.message" class="text-sm text-gray-600 dark:text-gray-300">{{ toast.message }}</p>
          </div>
          
          <!-- Close button -->
          <button 
            (click)="dismiss(toast.id)"
            class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    @keyframes slideInRight {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
    .animate-slide-in-right {
      animation: slideInRight 0.3s ease-out;
    }
  `]
})
export class ToastComponent implements OnInit {
  toasts: Toast[] = [];

  constructor(private toastService: ToastService) {}

  ngOnInit(): void {
    this.toastService.toasts$.subscribe(toasts => {
      this.toasts = toasts;
    });
  }

  dismiss(id: number): void {
    this.toastService.dismiss(id);
  }

  getToastClass(type: string): string {
    const base = 'glass';
    switch(type) {
      case 'success': return `${base} bg-green-50 dark:bg-green-900/20 border-green-500`;
      case 'error': return `${base} bg-red-50 dark:bg-red-900/20 border-red-500`;
      case 'warning': return `${base} bg-yellow-50 dark:bg-yellow-900/20 border-yellow-500`;
      case 'info': return `${base} bg-blue-50 dark:bg-blue-900/20 border-blue-500`;
      default: return base;
    }
  }

  getIconBgClass(type: string): string {
    switch(type) {
      case 'success': return 'bg-green-500/20';
      case 'error': return 'bg-red-500/20';
      case 'warning': return 'bg-yellow-500/20';
      case 'info': return 'bg-blue-500/20';
      default: return 'bg-gray-500/20';
    }
  }

  getIconColorClass(type: string): string {
    switch(type) {
      case 'success': return 'text-green-600 dark:text-green-400';
      case 'error': return 'text-red-600 dark:text-red-400';
      case 'warning': return 'text-yellow-600 dark:text-yellow-400';
      case 'info': return 'text-blue-600 dark:text-blue-400';
      default: return 'text-gray-600';
    }
  }
}
