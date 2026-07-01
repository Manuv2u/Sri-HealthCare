import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl } from '@angular/forms';
import { AuthApiService } from '../../../core/api/services/auth-api.service';
import { AuthStateService } from '../../../core/auth/auth-state.service';

type PasswordStrength = 'weak' | 'fair' | 'good' | 'strong';

@Component({
  selector: 'app-register',
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
          <h1 class="brand-title">Join Sri Health<br/>Today</h1>
          <p class="brand-subtitle">
            Create your account and start managing your health journey with ease.
          </p>

          <div class="brand-features">
            <div class="feature">
              <span class="feature-icon">📋</span>
              <span>Easy Online Booking</span>
            </div>
            <div class="feature">
              <span class="feature-icon">📱</span>
              <span>Digital Health Records</span>
            </div>
            <div class="feature">
              <span class="feature-icon">👨‍👩‍👧‍👦</span>
              <span>Family Health Profiles</span>
            </div>
            <div class="feature">
              <span class="feature-icon">💬</span>
              <span>24/7 Support Available</span>
            </div>
          </div>
        </div>

        <div class="brand-footer">
          <p>&copy; {{ currentYear }} Sri Diagnostic Laboratory. All rights reserved.</p>
        </div>
      </aside>

      <!-- Right Panel - Register Form -->
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
            <h2 class="card-title">Create Account</h2>
            <p class="card-subtitle">Join Sri Health Care today</p>
          </div>

          <!-- Error Alert -->
          @if (error()) {
            <div class="error-alert" role="alert">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
              </svg>
              <span>{{ error() }}</span>
              <button type="button" class="alert-close" aria-label="Dismiss error" (click)="error.set(null)">&times;</button>
            </div>
          }

          <form [formGroup]="registerForm" (ngSubmit)="register()" class="auth-form" novalidate>
            <div class="form-group">
              <label for="name">Full Name</label>
              <div class="input-wrapper">
                <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
                </svg>
                <input id="name" type="text" formControlName="name" placeholder="Enter your full name" autocomplete="name"/>
              </div>
              @if (registerForm.get('name')?.invalid && registerForm.get('name')?.touched) {
                <span class="error-text">{{ getNameError() }}</span>
              }
            </div>

            <div class="form-group">
              <label for="phone">Phone Number</label>
              <div class="input-wrapper">
                <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/>
                </svg>
                <input id="phone" type="tel" formControlName="phone" placeholder="Enter 10-digit phone number" autocomplete="tel" inputmode="numeric"/>
              </div>
              @if (registerForm.get('phone')?.invalid && registerForm.get('phone')?.touched) {
                <span class="error-text">Please enter a valid 10-digit phone number</span>
              }
            </div>

            <div class="form-group">
              <label for="email">Email Address</label>
              <div class="input-wrapper">
                <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 7l-10 6L2 7"/>
                </svg>
                <input id="email" type="email" formControlName="email" placeholder="Enter your email address" autocomplete="email"/>
              </div>
              @if (registerForm.get('email')?.invalid && registerForm.get('email')?.touched) {
                <span class="error-text">Please enter a valid email address</span>
              }
            </div>

            <div class="form-group">
              <label for="password">Password</label>
              <div class="input-wrapper">
                <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
                </svg>
                <input 
                  id="password"
                  [type]="showPassword() ? 'text' : 'password'" 
                  formControlName="password"
                  placeholder="Create a password (min 8 characters)"
                  autocomplete="new-password"
                  (input)="onPasswordInput($event)"
                />
                <button type="button" class="password-toggle" (click)="showPassword.set(!showPassword())">
                  @if (showPassword()) {
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  } @else {
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                    </svg>
                  }
                </button>
              </div>
              @if (passwordValue()) {
                <div class="password-strength">
                  <div class="strength-bar">
                    <div class="strength-fill" [class]="'strength-' + passwordStrength()"></div>
                  </div>
                  <span class="strength-text">{{ passwordStrengthText() }}</span>
                </div>
              }
              @if (registerForm.get('password')?.invalid && registerForm.get('password')?.touched) {
                <span class="error-text">{{ getPasswordError() }}</span>
              }
            </div>

            <div class="form-group">
              <label for="confirmPassword">Confirm Password</label>
              <div class="input-wrapper">
                <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
                </svg>
                <input 
                  id="confirmPassword"
                  type="password"
                  formControlName="confirmPassword"
                  placeholder="Confirm your password"
                  autocomplete="new-password"
                />
              </div>
              @if (registerForm.get('confirmPassword')?.hasError('mismatch') && registerForm.get('confirmPassword')?.touched) {
                <span class="error-text">Passwords do not match</span>
              }
            </div>

            <div class="form-group terms-group">
              <label class="checkbox-label">
                <input type="checkbox" formControlName="acceptTerms"/>
                <span>I agree to the <a routerLink="/terms" target="_blank">Terms of Service</a> and <a routerLink="/privacy" target="_blank">Privacy Policy</a></span>
              </label>
            </div>

            <button type="submit" class="submit-btn" [disabled]="loading() || registerForm.invalid">
              @if (loading()) {
                <svg class="spinner" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" opacity="0.25"/>
                  <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                <span>Creating account...</span>
              } @else {
                <span>Create Account</span>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8H13M9 4L13 8L9 12" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
              }
            </button>
          </form>

          <!-- Divider -->
          <div class="divider"><span>or</span></div>

          <!-- Login Link -->
          <div class="auth-footer">
            <p>Already have an account? <a routerLink="/auth/login">Sign in</a></p>
          </div>
        </div>
      </main>
    </div>
  `,
  styles: [`
    :host {
      --indigo: #6366F1;
      --indigo-dark: #4F46E5;
      --indigo-lt: #EEF2FF;
      --ink: #0F172A;
      --ink-secondary: #475569;
      --ink-muted: #94A3B8;
      --border: #E2E8F0;
      --border-lt: #F1F5F9;
      display: block;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    }

    .auth-page {
      display: flex;
      min-height: 100vh;
      background: #F8F9FF;
      animation: pageEnter 0.4s ease both;
    }

    @keyframes pageEnter {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    /* Left Brand Panel */
    .auth-brand {
      display: none;
      width: 50%;
      max-width: 720px;
      min-width: 480px;
      background: linear-gradient(145deg, #4F46E5 0%, #6366F1 45%, #7C3AED 100%);
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
      background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.04'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
      pointer-events: none;
    }

    .auth-brand::after {
      content: '';
      position: absolute;
      bottom: -140px;
      right: -140px;
      width: 380px;
      height: 380px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(255,255,255,0.12) 0%, transparent 70%);
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

    .brand-logo:focus-visible {
      outline: 2px solid white;
      outline-offset: 4px;
      border-radius: 8px;
    }

    .logo-icon { width: 56px; height: 56px; color: white; }
    .logo-icon svg { width: 100%; height: 100%; }

    .logo-text { display: flex; flex-direction: column; }
    .logo-name { font-size: 20px; font-weight: 700; letter-spacing: -0.01em; }
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
      letter-spacing: -0.02em;
      margin: 0 0 24px 0;
    }

    .brand-subtitle {
      font-size: 18px;
      line-height: 1.6;
      opacity: 0.88;
      margin: 0 0 40px 0;
      max-width: 480px;
    }

    .brand-features { display: flex; flex-direction: column; gap: 18px; }

    .feature {
      display: flex;
      align-items: center;
      gap: 16px;
      font-size: 16px;
      font-weight: 500;
      transition: transform 0.2s;
    }

    .feature:hover { transform: translateX(4px); }

    .feature-icon {
      width: 48px;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(255, 255, 255, 0.14);
      border: 1px solid rgba(255, 255, 255, 0.16);
      border-radius: 14px;
      font-size: 20px;
      flex-shrink: 0;
    }

    .brand-footer {
      padding-top: 32px;
      font-size: 14px;
      opacity: 0.65;
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
      overflow-y: auto;
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
      box-shadow: 0 20px 45px -12px rgba(67, 56, 202, 0.18), 0 0 0 1px rgba(226, 232, 240, 0.6);
      animation: cardEnter 0.45s cubic-bezier(0, 0, 0.2, 1) both;
    }

    @keyframes cardEnter {
      from { opacity: 0; transform: translateY(16px) scale(0.98); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }

    @media (min-width: 768px) {
      .auth-card { padding: 36px 44px 44px; }
    }

    /* Mobile Logo */
    .mobile-logo {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      margin-bottom: 24px;
    }

    @media (min-width: 1024px) {
      .mobile-logo { display: none; }
    }

    .mobile-logo-icon { width: 44px; height: 44px; color: var(--indigo); }
    .mobile-logo-icon svg { width: 100%; height: 100%; }
    .mobile-logo-text { font-size: 20px; font-weight: 700; color: var(--ink); }

    /* Card Header */
    .card-header { text-align: center; margin-bottom: 24px; }
    .card-title { font-size: 26px; font-weight: 800; color: var(--ink); letter-spacing: -0.02em; margin: 0 0 8px 0; }
    .card-subtitle { font-size: 15px; color: var(--ink-secondary); margin: 0; }

    /* Error Alert */
    .error-alert {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      background: #FEF2F2;
      border: 1px solid #FECACA;
      border-radius: 12px;
      margin-bottom: 20px;
      color: #B91C1C;
      font-size: 14px;
    }

    .error-alert svg { width: 20px; height: 20px; flex-shrink: 0; }
    .error-alert span { flex: 1; }

    .alert-close {
      background: none;
      border: none;
      font-size: 20px;
      color: #B91C1C;
      cursor: pointer;
      padding: 0;
      line-height: 1;
    }

    .alert-close:focus-visible {
      outline: 2px solid #B91C1C;
      outline-offset: 2px;
      border-radius: 4px;
    }

    /* Form */
    .auth-form { display: flex; flex-direction: column; gap: 16px; }

    .form-group { display: flex; flex-direction: column; gap: 6px; }

    .form-group label {
      font-size: 14px;
      font-weight: 600;
      color: var(--ink-secondary);
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
      color: var(--ink-muted);
      pointer-events: none;
    }

    .input-wrapper input {
      width: 100%;
      height: 48px;
      padding: 0 14px 0 44px;
      border: 1.5px solid var(--border);
      border-radius: 10px;
      font-size: 15px;
      font-family: inherit;
      color: var(--ink);
      background: white;
      transition: border-color 0.15s, box-shadow 0.15s;
    }

    .input-wrapper input:focus {
      outline: none;
      border-color: var(--indigo);
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
    }

    .input-wrapper input::placeholder { color: var(--ink-muted); }

    .password-toggle {
      position: absolute;
      right: 12px;
      background: none;
      border: none;
      padding: 4px;
      cursor: pointer;
      color: var(--ink-muted);
      display: flex;
      border-radius: 6px;
      transition: color 0.2s, background 0.2s;
    }

    .password-toggle:hover { color: var(--ink-secondary); background: var(--border-lt); }

    .password-toggle:focus-visible {
      outline: 2px solid var(--indigo);
      outline-offset: 1px;
    }

    .password-toggle svg { width: 20px; height: 20px; }

    .error-text {
      font-size: 12px;
      color: #DC2626;
      font-weight: 500;
    }

    /* Password Strength */
    .password-strength {
      margin-top: 4px;
    }

    .strength-bar {
      height: 4px;
      background: var(--border);
      border-radius: 2px;
      overflow: hidden;
      margin-bottom: 4px;
    }

    .strength-fill {
      height: 100%;
      border-radius: 2px;
      transition: width 0.3s, background 0.3s;
    }

    .strength-weak { width: 25%; background: #EF4444; }
    .strength-fair { width: 50%; background: #F59E0B; }
    .strength-good { width: 75%; background: var(--indigo); }
    .strength-strong { width: 100%; background: #22C55E; }

    .strength-text {
      font-size: 12px;
      color: var(--ink-secondary);
    }

    /* Terms checkbox */
    .terms-group { margin-top: 4px; }

    .checkbox-label {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      cursor: pointer;
    }

    .checkbox-label input {
      width: 18px;
      height: 18px;
      margin-top: 2px;
      accent-color: var(--indigo);
      cursor: pointer;
      flex-shrink: 0;
    }

    .checkbox-label input:focus-visible {
      outline: 2px solid var(--indigo);
      outline-offset: 2px;
    }

    .checkbox-label span {
      font-size: 13px;
      color: var(--ink-secondary);
      line-height: 1.5;
    }

    .checkbox-label a {
      color: var(--indigo);
      text-decoration: none;
      font-weight: 600;
    }

    .checkbox-label a:hover { text-decoration: underline; }

    .submit-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      height: 48px;
      margin-top: 8px;
      background: linear-gradient(135deg, #6366F1 0%, #4F46E5 100%);
      color: white;
      border: none;
      border-radius: 10px;
      font-size: 16px;
      font-weight: 700;
      letter-spacing: -0.01em;
      cursor: pointer;
      transition: transform 0.15s, box-shadow 0.15s;
      box-shadow: 0 4px 14px rgba(99, 102, 241, 0.35);
    }

    .submit-btn:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 6px 20px rgba(99, 102, 241, 0.45);
    }

    .submit-btn:active:not(:disabled) { transform: translateY(0); }

    .submit-btn:focus-visible {
      outline: 2px solid var(--indigo);
      outline-offset: 3px;
    }

    .submit-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      box-shadow: none;
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
      margin: 20px 0;
    }

    .divider::before,
    .divider::after {
      content: '';
      flex: 1;
      height: 1px;
      background: var(--border);
    }

    .divider span { font-size: 13px; color: var(--ink-muted); text-transform: lowercase; }

    /* Footer */
    .auth-footer { text-align: center; }

    .auth-footer p {
      font-size: 14px;
      color: var(--ink-secondary);
      margin: 0;
    }

    .auth-footer a {
      color: #F97316;
      font-weight: 700;
      text-decoration: none;
      margin-left: 4px;
      transition: color 0.15s;
    }

    .auth-footer a:hover { color: #EA580C; text-decoration: underline; }

    .auth-footer a:focus-visible {
      outline: 2px solid #F97316;
      outline-offset: 2px;
      border-radius: 4px;
    }

    /* Reduced motion */
    @media (prefers-reduced-motion: reduce) {
      .auth-page, .auth-card, .feature { animation: none !important; transition: none !important; }
      .submit-btn:hover:not(:disabled) { transform: none; }
    }

    /* Responsive */
    @media (max-width: 480px) {
      .auth-card { padding: 24px; }
      .card-title { font-size: 22px; }
    }
  `]
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private authApi = inject(AuthApiService);
  private authState = inject(AuthStateService);
  
  currentYear = new Date().getFullYear();
  loading = signal(false);
  error = signal<string | null>(null);
  passwordValue = signal('');
  showPassword = signal(false);
  
  registerForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    phone: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8), this.passwordStrengthValidator]],
    confirmPassword: ['', Validators.required],
    acceptTerms: [false, Validators.requiredTrue]
  }, {
    validators: this.passwordMatchValidator
  });
  
  // Computed password strength
  passwordStrength = computed<PasswordStrength>(() => {
    const password = this.passwordValue();
    if (!password) return 'weak';
    
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    
    if (score <= 2) return 'weak';
    if (score <= 3) return 'fair';
    if (score <= 4) return 'good';
    return 'strong';
  });
  
  passwordStrengthText = computed(() => {
    const strength = this.passwordStrength();
    const texts: Record<PasswordStrength, string> = {
      weak: 'Weak - Add more characters',
      fair: 'Fair - Add numbers or symbols',
      good: 'Good - Almost there!',
      strong: 'Strong - Great password!'
    };
    return texts[strength];
  });
  
  passwordStrengthValidator(control: AbstractControl): { [key: string]: boolean } | null {
    const value = control.value;
    if (!value) return null;
    const hasNumber = /\d/.test(value);
    if (!hasNumber) return { noNumber: true };
    return null;
  }
  
  passwordMatchValidator(group: FormGroup): { [key: string]: boolean } | null {
    const password = group.get('password')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;
    if (password && confirmPassword && password !== confirmPassword) {
      group.get('confirmPassword')?.setErrors({ mismatch: true });
      return { mismatch: true };
    }
    return null;
  }
  
  onPasswordInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.passwordValue.set(input.value);
  }
  
  getPasswordError(): string {
    const control = this.registerForm.get('password');
    if (control?.hasError('required')) return 'Password is required';
    if (control?.hasError('minlength')) return 'Password must be at least 8 characters';
    if (control?.hasError('noNumber')) return 'Password must contain at least one number';
    return 'Invalid password';
  }
  
  getNameError(): string {
    const control = this.registerForm.get('name');
    if (control?.hasError('required')) return 'Full name is required';
    if (control?.hasError('minlength')) return 'Name must be at least 2 characters';
    return 'Invalid name';
  }
  
  register(): void {
    if (this.registerForm.invalid) return;
    
    this.loading.set(true);
    this.error.set(null);
    
    const { name, phone, email, password } = this.registerForm.value;
    
    this.authApi.register(name!, phone!, email!, password!).subscribe({
      next: (tokens) => {
        this.authState.setTokens(tokens.access_token, tokens.refresh_token);
        this.loading.set(false);
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.loading.set(false);
        // Handle different error response formats
        let errorMessage = 'Registration failed. Please try again.';
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
        // Handle 409 Conflict specifically
        if (err.status === 409) {
          errorMessage = 'This phone number or email is already registered. Please use a different one or sign in.';
        }
        this.error.set(errorMessage);
      }
    });
  }
}
