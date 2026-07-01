import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthApiService } from '../../../core/api/services/auth-api.service';

@Component({
  selector: 'app-forgot-password',
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
          <h1 class="brand-title">Secure Account<br/>Recovery</h1>
          <p class="brand-subtitle">
            We'll help you regain access to your account quickly and securely.
          </p>

          <div class="brand-features">
            <div class="feature">
              <span class="feature-icon">🔐</span>
              <span>Secure Reset Process</span>
            </div>
            <div class="feature">
              <span class="feature-icon">📧</span>
              <span>Email Verification</span>
            </div>
            <div class="feature">
              <span class="feature-icon">⚡</span>
              <span>Instant Access Recovery</span>
            </div>
            <div class="feature">
              <span class="feature-icon">🛡️</span>
              <span>Protected Information</span>
            </div>
          </div>
        </div>

        <div class="brand-footer">
          <p>&copy; {{ currentYear }} Sri Diagnostic Laboratory. All rights reserved.</p>
        </div>
      </aside>

      <!-- Right Panel - Forgot Password Form -->
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

          @if (!emailSent()) {
            <!-- Icon -->
            <div class="icon-wrapper">
              <div class="icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0110 0v4"/>
                </svg>
              </div>
            </div>

            <!-- Header -->
            <div class="card-header">
              <h2 class="card-title">Forgot Password?</h2>
              <p class="card-subtitle">Enter your email or phone number and we'll send you a link to reset your password</p>
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

            <form [formGroup]="forgotForm" (ngSubmit)="submit()" class="auth-form">
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
              
              <button type="submit" class="submit-btn" [disabled]="loading() || forgotForm.invalid">
                @if (loading()) {
                  <svg class="spinner" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" opacity="0.25"/>
                    <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                }
                {{ loading() ? 'Sending...' : 'Send Reset Link' }}
              </button>
            </form>
          } @else {
            <!-- Success State -->
            <div class="success-state">
              <div class="success-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
                  <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
              </div>
              <h2 class="success-title">Check Your Inbox</h2>
              <p class="success-text">
                We've sent a password reset link to<br/>
                <strong>{{ sentTo() }}</strong>
              </p>
              <button type="button" class="secondary-btn" (click)="resetForm()">
                Try Different Email
              </button>
            </div>
          }

          <!-- Divider -->
          <div class="divider"><span></span></div>

          <!-- Back Link -->
          <div class="auth-footer">
            <a routerLink="/auth/login" class="back-link">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="19" y1="12" x2="5" y2="12"/>
                <polyline points="12 19 5 12 12 5"/>
              </svg>
              Back to login
            </a>
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

    .logo-icon { width: 56px; height: 56px; color: #319795; }
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

    .brand-features { display: flex; flex-direction: column; gap: 20px; }

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

    .mobile-logo-icon { width: 44px; height: 44px; color: #319795; }
    .mobile-logo-icon svg { width: 100%; height: 100%; }
    .mobile-logo-text { font-size: 20px; font-weight: 700; color: #0F172A; }

    /* Icon */
    .icon-wrapper {
      display: flex;
      justify-content: center;
      margin-bottom: 24px;
    }

    .icon {
      width: 80px;
      height: 80px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%);
      color: #D97706;
      border-radius: 20px;
    }

    .icon svg { width: 40px; height: 40px; }

    /* Card Header */
    .card-header { text-align: center; margin-bottom: 28px; }
    .card-title { font-size: 28px; font-weight: 700; color: #0F172A; margin: 0 0 8px 0; }
    .card-subtitle { font-size: 15px; color: #64748B; margin: 0; line-height: 1.6; }

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

    /* Success State */
    .success-state { text-align: center; }

    .success-icon {
      width: 80px;
      height: 80px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #D1FAE5 0%, #A7F3D0 100%);
      color: #059669;
      border-radius: 20px;
      margin: 0 auto 24px;
    }

    .success-icon svg { width: 40px; height: 40px; }

    .success-title {
      font-size: 24px;
      font-weight: 700;
      color: #0F172A;
      margin: 0 0 12px 0;
    }

    .success-text {
      font-size: 15px;
      color: #64748B;
      line-height: 1.6;
      margin: 0 0 24px 0;
    }

    .success-text strong { color: #0F172A; }

    .secondary-btn {
      width: 100%;
      height: 52px;
      background: white;
      color: #319795;
      border: 2px solid #319795;
      border-radius: 12px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    .secondary-btn:hover {
      background: #F0FDFA;
    }

    /* Divider */
    .divider {
      display: flex;
      align-items: center;
      gap: 16px;
      margin: 28px 0 20px;
    }

    .divider::before,
    .divider::after {
      content: '';
      flex: 1;
      height: 1px;
      background: #E2E8F0;
    }

    /* Footer */
    .auth-footer { text-align: center; }

    .back-link {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      font-weight: 500;
      color: #64748B;
      text-decoration: none;
    }

    .back-link svg { width: 18px; height: 18px; }
    .back-link:hover { color: #319795; }

    /* Responsive */
    @media (max-width: 480px) {
      .auth-card { padding: 24px; }
      .card-title { font-size: 24px; }
      .icon { width: 64px; height: 64px; }
      .icon svg { width: 32px; height: 32px; }
    }
  `]
})
export class ForgotPasswordComponent {
  private fb = inject(FormBuilder);
  private authApi = inject(AuthApiService);
  
  currentYear = new Date().getFullYear();
  loading = signal(false);
  error = signal<string | null>(null);
  emailSent = signal(false);
  sentTo = signal('');
  
  forgotForm = this.fb.group({
    identifier: ['', Validators.required]
  });
  
  submit(): void {
    if (this.forgotForm.invalid) return;
    
    this.loading.set(true);
    this.error.set(null);
    
    const identifier = this.forgotForm.value.identifier!;
    
    this.authApi.forgotPassword(identifier).subscribe({
      next: () => {
        this.loading.set(false);
        this.sentTo.set(identifier);
        this.emailSent.set(true);
      },
      error: (err) => {
        this.loading.set(false);
        let errorMessage = 'Failed to send reset link. Please try again.';
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
  
  resetForm(): void {
    this.emailSent.set(false);
    this.forgotForm.reset();
  }
}
