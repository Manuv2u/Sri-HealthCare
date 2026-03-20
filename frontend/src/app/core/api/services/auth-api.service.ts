import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthTokens } from '../api.types';

@Injectable({ providedIn: 'root' })
export class AuthApiService {
  constructor(private http: HttpClient) {}

  register(phone: string, name: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>('/auth/register', { phone, name });
  }

  verifyOtp(phone: string, otp: string, name?: string): Observable<AuthTokens> {
    return this.http.post<AuthTokens>('/auth/verify-otp', { phone, otp, name });
  }

  login(phone_or_email: string, password: string): Observable<AuthTokens> {
    return this.http.post<AuthTokens>('/auth/login', { phone_or_email, password });
  }

  logout(): Observable<void> {
    return this.http.post<void>('/auth/logout', {});
  }

  refresh(refresh_token: string): Observable<{ access_token: string }> {
    return this.http.post<{ access_token: string }>('/auth/refresh', { refresh_token });
  }
}
