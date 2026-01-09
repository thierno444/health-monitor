import { Component, OnInit, ElementRef, ViewChild, HostListener, Renderer2 } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService, Notification } from '../../../core/services/notification.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-notifications-dropdown',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notifications-dropdown.html',
  styleUrls: ['./notifications-dropdown.scss']
})
export class NotificationsDropdownComponent implements OnInit {
  @ViewChild('notificationButton', { static: false }) notificationButton!: ElementRef;
  showDropdown = false;
  notifications: Notification[] = [];
  unreadCount = 0;
  loading = false;
  dropdownTopPosition: number = 0;
  dropdownLeftPosition: number = 0;
  isMobile: boolean = false;

  constructor(
    private notificationService: NotificationService,
    private router: Router,
    private renderer: Renderer2
  ) {}

  ngOnInit(): void {
    this.checkIfMobile();
    this.loadNotifications();
    this.notificationService.unreadCount$.subscribe(count => {
      this.unreadCount = count;
    });
  }

  ngAfterViewInit() {
    this.calculateDropdownPosition();
  }

  @HostListener('window:resize')
  onWindowResize() {
    this.checkIfMobile();
    this.calculateDropdownPosition();
  }

  checkIfMobile() {
    this.isMobile = window.innerWidth < 768;
  }

  calculateDropdownPosition() {
    if (!this.notificationButton) {
      return;
    }

    const buttonRect = this.notificationButton.nativeElement.getBoundingClientRect();
    if (this.isMobile) {
      this.dropdownTopPosition = 0;
      this.dropdownLeftPosition = 0;
    } else {
      this.dropdownTopPosition = buttonRect.bottom + window.scrollY + 8;
      this.dropdownLeftPosition = window.innerWidth - 360; // Positionne le dropdown à droite
    }
  }

  toggleDropdown(): void {
    this.showDropdown = !this.showDropdown;
    if (this.showDropdown) {
      this.loadNotifications();
      setTimeout(() => this.calculateDropdownPosition(), 0);
    }
  }

  closeDropdown(event: Event) {
    if ((event.target as HTMLElement).classList.contains('glass')) return;
    this.showDropdown = false;
  }

  loadNotifications(): void {
    this.loading = true;
    this.notificationService.getNotifications().subscribe({
      next: (response) => {
        if (response.success) {
          this.notifications = response.notifications;
          this.notificationService.loadUnreadCount();
        }
        this.loading = false;
      },
      error: (err) => {
        console.error('Erreur notifications:', err);
        this.loading = false;
      }
    });
  }

  markAsRead(notification: Notification): void {
    if (!notification.lue) {
      this.notificationService.markAsRead(notification._id).subscribe({
        next: () => {
          notification.lue = true;
          this.notificationService.loadUnreadCount();
        },
        error: (err) => {
          console.error('Erreur mark as read:', err);
        }
      });
    }

    if (notification.lien) {
      this.showDropdown = false;

      try {
        if (notification.lien.startsWith('http')) {
          window.open(notification.lien, '_blank');
        }
      } catch (error) {
        console.error('Erreur navigation notification:', error);
      }
    }
  }

  deleteNotification(notification: Notification, event: Event): void {
    event.stopPropagation();
    this.notificationService.deleteNotification(notification._id).subscribe({
      next: () => {
        this.notifications = this.notifications.filter(n => n._id !== notification._id);
        this.notificationService.loadUnreadCount();
      }
    });
  }

  getNotificationIcon(type: string): string {
    const icons: any = {
      alerte: '⚠️',
      info: 'ℹ️',
      assignation: '👨‍⚕️',
      mesure: '📊',
      systeme: '⚙️'
    };
    return icons[type] || 'ℹ️';
  }

  getNotificationColor(type: string): string {
    const colors: any = {
      alerte: 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400',
      info: 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400',
      assignation: 'bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400',
      mesure: 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400',
      systeme: 'bg-gray-100 dark:bg-gray-900/20 text-gray-700 dark:text-gray-400'
    };
    return colors[type] || colors.info;
  }
}
