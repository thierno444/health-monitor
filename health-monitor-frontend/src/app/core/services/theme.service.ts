import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private darkModeSubject = new BehaviorSubject<boolean>(false);
  public darkMode$ = this.darkModeSubject.asObservable();

  constructor() {
    // Charger la préférence depuis localStorage
    const savedTheme = localStorage.getItem('theme');
    const isDark = savedTheme === 'dark' || 
                   (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches);
    
    this.darkModeSubject.next(isDark);
    this.applyTheme(isDark);
  }

  toggleTheme(): void {
    const isDark = !this.darkModeSubject.value;
    this.darkModeSubject.next(isDark);
    this.applyTheme(isDark);
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  }

  private applyTheme(isDark: boolean): void {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }

  isDarkMode(): boolean {
    return this.darkModeSubject.value;
  }
}