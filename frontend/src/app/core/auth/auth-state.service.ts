import { Injectable, signal, computed } from '@angular/core';

export interface CurrentUser {
  id: string;
  name: string;
  role: 'user' | 'admin' | 'technician';
  phone?: string;
  email?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthStateService {
  private _accessToken = signal<string | null>(null);
  private _currentUser = signal<CurrentUser | null>(null);

  readonly isAuthenticated = computed(() => this._accessToken() !== null);
  readonly currentUser = this._currentUser.asReadonly();
  readonly role = computed(() => this._currentUser()?.role ?? null);

  constructor() {
    // Restore session from localStorage on page load
    const token = localStorage.getItem('access_token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const exp = payload.exp * 1000;
        if (Date.now() < exp) {
          this._accessToken.set(token);
          this._currentUser.set({
            id: payload.sub,
            name: payload.name ?? '',
            role: payload.role,
          });
        } else {
          // Token expired — clear it, refresh interceptor will handle renewal
          localStorage.removeItem('access_token');
        }
      } catch {
        localStorage.removeItem('access_token');
      }
    }
  }

  setTokens(accessToken: string, refreshToken: string): void {
    this._accessToken.set(accessToken);
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);
  }

  setUser(user: CurrentUser): void {
    this._currentUser.set(user);
  }

  getAccessToken(): string | null {
    return this._accessToken();
  }

  clearSession(): void {
    this._accessToken.set(null);
    this._currentUser.set(null);
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  }

  getRefreshToken(): string | null {
    return localStorage.getItem('refresh_token');
  }
}
