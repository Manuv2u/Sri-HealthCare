import { Component, inject, signal, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthApiService } from '../../../core/api/services/auth-api.service';
import { AuthStateService } from '../../../core/auth/auth-state.service';

type AuthMode = 'phone' | 'password';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  template: `
    <div class="auth-page">
      <!-- Left Panel - Branding (hidden on mobile) -->
      <aside class="auth-brand">
        <div class="brand-header">
          <a routerLink="/" class="brand-logo">
            <div class="logo-icon">
              <svg viewBox="0 0 56 56" fill="none">
                <rect width="56" height="56" rx="14" fill="currentColor" fill-opacity="0.15"/>
                <path d="M28 12V44M12 28H44" stroke="white" stroke-width="4" stroke-linecap="round"/>
                <circle cx="28" cy="28" r="6" fill="white"/>
              </svg>
            </div>
            <div class="logo-text">
              <span class="logo-name">Sri Health Care</span>
              <span class="logo-tagline">Diagnostic Laboratory</span>
            </div>
          </a>
        </div>

        <div class="brand-hero">
          <h1 class="brand-title">Fast, Secure & Reliable<br/>Laboratory Management</h1>
          <p class="brand-subtitle">
            Access your health records, book tests, and manage appointments from anywhere.
          </p>

          <div class="brand-features">
            <div class="feature">
              <span class="feature-icon">🏠</span>
              <span>Home Sample Collection</span>
            </div>
            <div class="feature">
              <span class="feature-icon">✓</span>
              <span>NABL Certified Labs</span>
            </div>
            <div class="feature">
              <span class="feature-icon">⏰</span>
              <span>Reports in 24-48 Hours</span>
            </div>
            <div class="feature">
              <span class="feature-icon">🔒</span>
              <span>Secure & Private</span>
            </div>
          </div>
        </div>

        <div class="brand-footer">
          <p>&copy; {{ currentYear }} Sri Diagnostic Laboratory. All rights reserved.</p>
        </div>
      </aside>

      <!-- Right Panel - Login Form -->
      <main class="auth-content">
        <div class="auth-card">
          <!-- Mobile Logo -->
          <div class="mobile-logo">
            <div class="mobile-logo-icon">
              <svg viewBox="0 0 44 44" fill="none">
                <rect width="44" height="44" rx="11" fill="currentColor" fill-opacity="0.1"/>
                <path d="M22 10V34M10 22H34" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
                <circle cx="22" cy="22" r="4" fill="currentColor"/>
              </svg>
            </div>
            <span class="mobile-logo-text">Sri Health</span>
          </div>

          <!-- Header -->
          <div class="card-header">
            <h2 class="card-title">Welcome back</h2>
            <p class="card-subtitle">Sign in to access your health dashboard</p>
          </div>

          <!-- Mode Toggle -->
          <div class="mode-toggle">
            <button 
              type="button"
              class="toggle-btn"
              [class.active]="mode() === 'password'"
              (click)="setMode('password')"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0110 0v4"/>
              </svg>
              Password
            </button>
            <button 
              type="button"
              class="toggle-btn"
              [class.active]="mode() === 'phone'"
              (click)="setMode('phone')"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
                <line x1="12" y1="18" x2="12.01" y2="18"/>
              </svg>
              Phone OTP
            </button>
          </div>

          <!-- Error Alert -->
          @if (error()) {
            <div class="error-alert">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
              </svg>
              <span>{{ error() }}</span>
              <button type="button" class="alert-close" (click)="error.set(null)">&times;</button>
            </div>
          }

          <!-- Password Mode Form -->
          @if (mode() === 'password') {
            <form [formGroup]="passwordForm" (ngSubmit)="loginWithPassword()" class="auth-form">
              <div class="form-group">
                <label for="identifier">Email or Phone</label>
                <div class="input-wrapper">
                  <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 7l-10 6L2 7"/>
                  </svg>
                  <input 
                    id="identifier"
                    type="text" 
                    formControlName="identifier"
                    placeholder="Enter your email or phone number"
                  />
                </div>
              </div>
              
              <div class="form-group">
                <label for="password">Password</label>
                <div class="input-wrapper">
                  <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0110 0v4"/>
                  </svg>
                  <input 
                    id="password"
                    [type]="showPassword() ? 'text' : 'password'" 
                    formControlName="password"
                    placeholder="Enter your password"
                  />
                  <button type="button" class="password-toggle" (click)="showPassword.set(!showPassword())">
                    @if (showPassword()) {
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
                        <line x1="1" y1="1" x2="23" y2="23"/>
                      </svg>
                    } @else {
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                    }
                  </button>
                </div>
              </div>
              
              <div class="form-row">
                <label class="remember-me">
                  <input type="checkbox" [checked]="rememberMe()" (change)="toggleRememberMe()"/>
                  <span>Remember me</span>
                </label>
                <a routerLink="/auth/forgot-password" class="forgot-link">Forgot password?</a>
              </div>
              
              <button type="submit" class="submit-btn" [disabled]="loading() || passwordForm.invalid">
                @if (loading()) {
                  <svg class="spinner" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" opacity="0.25"/>
                    <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                }
                {{ loading() ? 'Signing in...' : 'Sign In' }}
              </button>
            </form>
          }

          <!-- Phone OTP Mode Form -->
          @if (mode() === 'phone') {
            <form [formGroup]="phoneForm" (ngSubmit)="sendOtp()" class="auth-form">
              <div class="form-group">
                <label for="phone">Phone Number</label>
                <div class="input-wrapper">
                  <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
                    <line x1="12" y1="18" x2="12.01" y2="18"/>
                  </svg>
                  <input 
                    id="phone"
                    type="tel" 
                    formControlName="phone"
                    placeholder="Enter your 10-digit phone number"
                  />
                </div>
              </div>
              
              <button type="submit" class="submit-btn" [disabled]="loading() || phoneForm.invalid">
                @if (loading()) {
                  <svg class="spinner" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" opacity="0.25"/>
                    <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                }
                {{ loading() ? 'Sending OTP...' : 'Send OTP' }}
              </button>
            </form>
          }

          <!-- Divider -->
          <div class="divider"><span>or</span></div>

          <!-- Register Link -->
          <div class="auth-footer">
            <p>Don't have an account? <a routerLink="/auth/register">Create account</a></p>
          </div>
        </div>
      </main>
    </div>
  `,
  styles: [`
    .auth-page {
      display: flex;
      min-height: 100vh;
      background: linear-gradient(135deg, #E6FFFA 0%, #F8FAFC 50%, #EBF4FF 100%);
    }

    /* Left Brand Panel */
    .auth-brand {
      display: none;
      width: 50%;
      max-width: 720px;
      min-width: 480px;
      background: linear-gradient(145deg, #285E61 0%, #234E52 50%, #1D4044 100%);
      color: white;
      padding: 48px 56px;
      flex-direction: column;
      position: relative;
      overflow: hidden;
    }

    @media (min-width: 1024px) {
      .auth-brand { display: flex; }
    }

    .auth-brand::before {
      content: '';
      position: absolute;
      inset: 0;
      background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
      pointer-events: none;
    }

    .brand-header { margin-bottom: 48px; position: relative; z-index: 1; }

    .brand-logo {
      display: flex;
      align-items: center;
      gap: 16px;
      text-decoration: none;
      color: inherit;
    }

    .logo-icon {
      width: 56px;
      height: 56px;
      color: #319795;
    }

    .logo-icon svg { width: 100%; height: 100%; }

    .logo-text { display: flex; flex-direction: column; }
    .logo-name { font-size: 20px; font-weight: 700; }
    .logo-tagline { font-size: 14px; opacity: 0.85; }

    .brand-hero {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      position: relative;
      z-index: 1;
    }

    .brand-title {
      font-size: 36px;
      font-weight: 800;
      line-height: 1.2;
      margin: 0 0 24px 0;
    }

    .brand-subtitle {
      font-size: 18px;
      line-height: 1.6;
      opacity: 0.9;
      margin: 0 0 40px 0;
      max-width: 480px;
    }

    .brand-features {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .feature {
      display: flex;
      align-items: center;
      gap: 16px;
      font-size: 16px;
      font-weight: 500;
    }

    .feature-icon {
      width: 48px;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(255, 255, 255, 0.12);
      border-radius: 12px;
      font-size: 20px;
    }

    .brand-footer {
      padding-top: 32px;
      font-size: 14px;
      opacity: 0.7;
      position: relative;
      z-index: 1;
    }

    /* Right Form Panel */
    .auth-content {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }

    @media (min-width: 1024px) {
      .auth-content { padding: 48px; }
    }

    .auth-card {
      background: white;
      border-radius: 20px;
      padding: 32px;
      width: 100%;
      max-width: 480px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.15);
    }

    @media (min-width: 768px) {
      .auth-card { padding: 40px 48px 48px; }
    }

    /* Mobile Logo */
    .mobile-logo {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      margin-bottom: 32px;
    }

    @media (min-width: 1024px) {
      .mobile-logo { display: none; }
    }

    .mobile-logo-icon {
      width: 44px;
      height: 44px;
      color: #319795;
    }

    .mobile-logo-icon svg { width: 100%; height: 100%; }
    .mobile-logo-text { font-size: 20px; font-weight: 700; color: #0F172A; }

    /* Card Header */
    .card-header { text-align: center; margin-bottom: 32px; }
    .card-title { font-size: 28px; font-weight: 700; color: #0F172A; margin: 0 0 8px 0; }
    .card-subtitle { font-size: 16px; color: #64748B; margin: 0; }

    @media (min-width: 768px) {
      .card-title { font-size: 32px; }
    }

    /* Mode Toggle */
    .mode-toggle {
      display: flex;
      gap: 8px;
      padding: 4px;
      background: #F1F5F9;
      border-radius: 14px;
      margin-bottom: 24px;
    }

    .toggle-btn {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 12px 16px;
      background: transparent;
      border: none;
      border-radius: 10px;
      font-size: 14px;
      font-weight: 500;
      color: #64748B;
      cursor: pointer;
      transition: all 0.2s;
    }

    .toggle-btn svg { width: 18px; height: 18px; }

    .toggle-btn:hover:not(.active) { color: #0F172A; background: rgba(255,255,255,0.5); }

    .toggle-btn.active {
      background: white;
      color: #0F172A;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }

    /* Error Alert */
    .error-alert {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      background: #FEF2F2;
      border: 1px solid #FECACA;
      border-radius: 10px;
      margin-bottom: 20px;
      color: #DC2626;
      font-size: 14px;
    }

    .error-alert svg { width: 20px; height: 20px; flex-shrink: 0; }
    .error-alert span { flex: 1; }

    .alert-close {
      background: none;
      border: none;
      font-size: 20px;
      color: #DC2626;
      cursor: pointer;
      padding: 0;
      line-height: 1;
    }

    /* Form */
    .auth-form { display: flex; flex-direction: column; gap: 20px; }

    .form-group { display: flex; flex-direction: column; gap: 6px; }

    .form-group label {
      font-size: 14px;
      font-weight: 500;
      color: #374151;
    }

    .input-wrapper {
      position: relative;
      display: flex;
      align-items: center;
    }

    .input-icon {
      position: absolute;
      left: 14px;
      width: 20px;
      height: 20px;
      color: #94A3B8;
      pointer-events: none;
    }

    .input-wrapper input {
      width: 100%;
      height: 52px;
      padding: 0 14px 0 44px;
      border: 1px solid #E2E8F0;
      border-radius: 12px;
      font-size: 15px;
      color: #0F172A;
      transition: border-color 0.2s, box-shadow 0.2s;
    }

    .input-wrapper input:focus {
      outline: none;
      border-color: #319795;
      box-shadow: 0 0 0 3px rgba(49, 151, 149, 0.15);
    }

    .input-wrapper input::placeholder { color: #94A3B8; }

    .password-toggle {
      position: absolute;
      right: 12px;
      background: none;
      border: none;
      padding: 4px;
      cursor: pointer;
      color: #94A3B8;
      transition: color 0.2s;
    }

    .password-toggle:hover { color: #64748B; }
    .password-toggle svg { width: 20px; height: 20px; }

    .form-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-top: -8px;
    }

    .remember-me {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
    }

    .remember-me input {
      width: 18px;
      height: 18px;
      accent-color: #319795;
      cursor: pointer;
    }

    .remember-me span { font-size: 14px; color: #64748B; }

    .forgot-link {
      font-size: 14px;
      font-weight: 500;
      color: #319795;
      text-decoration: none;
    }

    .forgot-link:hover { text-decoration: underline; }

    .submit-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      height: 52px;
      background: linear-gradient(135deg, #319795 0%, #2C7A7B 100%);
      color: white;
      border: none;
      border-radius: 12px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .submit-btn:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 4px 14px rgba(49, 151, 149, 0.35);
    }

    .submit-btn:disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }

    .spinner {
      width: 20px;
      height: 20px;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    /* Divider */
    .divider {
      display: flex;
      align-items: center;
      gap: 16px;
      margin: 24px 0;
    }

    .divider::before,
    .divider::after {
      content: '';
      flex: 1;
      height: 1px;
      background: #E2E8F0;
    }

    .divider span { font-size: 14px; color: #94A3B8; }

    /* Footer */
    .auth-footer { text-align: center; }

    .auth-footer p {
      font-size: 14px;
      color: #64748B;
      margin: 0;
    }

    .auth-footer a {
      color: #319795;
      font-weight: 600;
      text-decoration: none;
      margin-left: 4px;
    }

    .auth-footer a:hover { text-decoration: underline; }

    /* Responsive */
    @media (max-width: 480px) {
      .auth-card { padding: 24px; }
      .card-title { font-size: 22px; }
      .toggle-btn { padding: 10px 12px; font-size: 13px; }
      .toggle-btn svg { width: 16px; height: 16px; }
      .form-row { flex-direction: column; align-items: flex-start; gap: 8px; }
    }
  `]
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private authApi = inject(AuthApiService);
  private authState = inject(AuthStateService);
  private ngZone = inject(NgZone);
  
  currentYear = new Date().getFullYear();
  mode = signal<AuthMode>('password');
  loading = signal(false);
  error = signal<string | null>(null);
  rememberMe = signal(false);
  showPassword = signal(false);
  
  phoneForm = this.fb.group({
    phone: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]]
  });
  
  passwordForm = this.fb.group({
    identifier: ['', Validators.required],
    password: ['', Validators.required]
  });
  
  setMode(newMode: AuthMode): void {
    this.mode.set(newMode);
    this.error.set(null);
  }
  
  toggleRememberMe(): void {
    this.rememberMe.update(v => !v);
  }
  
  sendOtp(): void {
    if (this.phoneForm.invalid) return;
    
    this.loading.set(true);
    this.error.set(null);
    
    const phone = this.phoneForm.value.phone!;
    
    this.authApi.loginOtp(phone).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/auth/verify-otp'], { 
          queryParams: { phone, type: 'login' } 
        });
      },
      error: (err) => {
        this.loading.set(false);
        // Handle different error response formats
        let errorMessage = 'Failed to send OTP. Please try again.';
        if (err.error) {
          if (typeof err.error === 'string') {
            errorMessage = err.error;
          } else if (err.error.detail) {
            errorMessage = typeof err.error.detail === 'string' 
              ? err.error.detail 
              : JSON.stringify(err.error.detail);
          } else if (err.error.message) {
            errorMessage = err.error.message;
          }
        }
        this.error.set(errorMessage);
      }
    });
  }
  
  loginWithPassword(): void {
    if (this.passwordForm.invalid) return;
    
    this.loading.set(true);
    this.error.set(null);
    
    const { identifier, password } = this.passwordForm.value;
    
    this.authApi.login(identifier!, password!).subscribe({
      next: (tokens) => {
        this.authState.setTokens(tokens.access_token, tokens.refresh_token, !!tokens.is_temp_password);
        this.loading.set(false);

        // Use NgZone.run to ensure navigation happens inside Angular's zone
        // and use navigateByUrl for more reliable full URL navigation
        this.ngZone.run(() => {
          // Force password change on first login with a temporary password
          if (tokens.is_temp_password) {
            this.router.navigateByUrl('/auth/change-password?firstLogin=1', { replaceUrl: true });
            return;
          }
          const role = this.authState.role();
          let targetUrl = '/dashboard';
          if (role === 'admin') {
            targetUrl = '/admin/dashboard';
          } else if (role === 'technician') {
            targetUrl = '/technician';
          }
          // Use navigateByUrl with replaceUrl to ensure clean navigation
          this.router.navigateByUrl(targetUrl, { replaceUrl: true });
        });
      },
      error: (err) => {
        this.loading.set(false);
        // Handle different error response formats
        let errorMessage = 'Invalid credentials. Please try again.';
        if (err.error) {
          if (typeof err.error === 'string') {
            errorMessage = err.error;
          } else if (err.error.detail) {
            errorMessage = typeof err.error.detail === 'string' 
              ? err.error.detail 
              : JSON.stringify(err.error.detail);
          } else if (err.error.message) {
            errorMessage = err.error.message;
          }
        }
        this.error.set(errorMessage);
      }
    });
  }
}
