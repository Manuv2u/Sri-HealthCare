import { Component, inject, signal, OnInit, ViewChildren, QueryList, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthApiService } from '../../../core/api/services/auth-api.service';
import { AuthStateService } from '../../../core/auth/auth-state.service';

@Component({
  selector: 'app-otp-verify',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
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
          <h1 class="brand-title">Verify Your<br/>Phone Number</h1>
          <p class="brand-subtitle">
            We've sent a verification code to your phone number. Please enter it to continue.
          </p>

          <div class="brand-features">
            <div class="feature">
              <span class="feature-icon">📱</span>
              <span>SMS Verification</span>
            </div>
            <div class="feature">
              <span class="feature-icon">⚡</span>
              <span>Instant Access</span>
            </div>
            <div class="feature">
              <span class="feature-icon">🔒</span>
              <span>Secure Login</span>
            </div>
            <div class="feature">
              <span class="feature-icon">✓</span>
              <span>One-Time Code</span>
            </div>
          </div>
        </div>

        <div class="brand-footer">
          <p>&copy; {{ currentYear }} Sri Diagnostic Laboratory. All rights reserved.</p>
        </div>
      </aside>

      <!-- Right Panel - OTP Form -->
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

          <!-- Icon -->
          <div class="icon-wrapper">
            <div class="icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
                <line x1="12" y1="18" x2="12.01" y2="18"/>
              </svg>
            </div>
          </div>

          <!-- Header -->
          <div class="card-header">
            <h2 class="card-title">Verify Your Phone</h2>
            <p class="card-subtitle">
              We've sent a 6-digit code to<br/>
              <strong>+91 {{ maskedPhone() }}</strong>
            </p>
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

          <!-- Success Alert -->
          @if (resendSuccess()) {
            <div class="success-alert">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
              <span>OTP sent successfully!</span>
              <button type="button" class="alert-close" (click)="resendSuccess.set(false)">&times;</button>
            </div>
          }

          <!-- OTP Input -->
          <form (ngSubmit)="verifyOtp()" class="auth-form">
            <div class="otp-inputs">
              @for (i of [0,1,2,3,4,5]; track i) {
                <input
                  #otpInput
                  type="text"
                  inputmode="numeric"
                  maxlength="1"
                  class="otp-input"
                  [class.otp-input--filled]="otpDigits[i]"
                  [class.otp-input--error]="error()"
                  [(ngModel)]="otpDigits[i]"
                  [name]="'otp' + i"
                  (input)="onInput($event, i)"
                  (keydown)="onKeyDown($event, i)"
                  (paste)="onPaste($event)"
                  autocomplete="one-time-code"
                />
              }
            </div>
            
            <button type="submit" class="submit-btn" [disabled]="loading() || !isOtpComplete()">
              @if (loading()) {
                <svg class="spinner" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" opacity="0.25"/>
                  <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
              }
              {{ loading() ? 'Verifying...' : 'Verify OTP' }}
            </button>
          </form>

          <!-- Resend -->
          <div class="resend-section">
            @if (resendTimer() > 0) {
              <p class="timer-text">
                Resend code in <strong>{{ formatTime(resendTimer()) }}</strong>
              </p>
            } @else {
              <p class="resend-text">
                Didn't receive the code?
                <button 
                  type="button" 
                  class="resend-btn"
                  [disabled]="resendLoading()"
                  (click)="resendOtp()"
                >
                  {{ resendLoading() ? 'Sending...' : 'Resend OTP' }}
                </button>
              </p>
            }
          </div>

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
      background: linear-gradient(135deg, #D1FAE5 0%, #A7F3D0 100%);
      color: #059669;
      border-radius: 20px;
    }

    .icon svg { width: 40px; height: 40px; }

    /* Card Header */
    .card-header { text-align: center; margin-bottom: 28px; }
    .card-title { font-size: 28px; font-weight: 700; color: #0F172A; margin: 0 0 8px 0; }
    .card-subtitle { font-size: 15px; color: #64748B; margin: 0; line-height: 1.6; }
    .card-subtitle strong { color: #0F172A; }

    /* Alerts */
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

    .success-alert {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      background: #F0FDF4;
      border: 1px solid #BBF7D0;
      border-radius: 10px;
      margin-bottom: 20px;
      color: #15803D;
      font-size: 14px;
    }

    .success-alert svg { width: 20px; height: 20px; flex-shrink: 0; }
    .success-alert span { flex: 1; }

    .alert-close {
      background: none;
      border: none;
      font-size: 20px;
      cursor: pointer;
      padding: 0;
      line-height: 1;
      color: inherit;
    }

    /* Form */
    .auth-form { display: flex; flex-direction: column; gap: 24px; }

    .otp-inputs {
      display: flex;
      justify-content: center;
      gap: 8px;
    }

    @media (min-width: 640px) {
      .otp-inputs { gap: 12px; }
    }

    .otp-input {
      width: 52px;
      height: 60px;
      padding: 0;
      border: 2px solid #E2E8F0;
      border-radius: 12px;
      background: white;
      font-size: 24px;
      font-weight: 600;
      text-align: center;
      color: #0F172A;
      transition: all 0.2s;
    }

    @media (min-width: 640px) {
      .otp-input {
        width: 56px;
        height: 64px;
      }
    }

    .otp-input:focus {
      outline: none;
      border-color: #319795;
      box-shadow: 0 0 0 3px rgba(49, 151, 149, 0.15);
    }

    .otp-input--filled {
      border-color: #319795;
      background: #F0FDFA;
    }

    .otp-input--error {
      border-color: #DC2626;
      animation: shake 0.3s ease-in-out;
    }

    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      25% { transform: translateX(-4px); }
      75% { transform: translateX(4px); }
    }

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

    /* Resend Section */
    .resend-section { margin-top: 20px; text-align: center; }

    .timer-text {
      font-size: 14px;
      color: #64748B;
      margin: 0;
    }

    .timer-text strong { color: #319795; }

    .resend-text {
      font-size: 14px;
      color: #64748B;
      margin: 0;
    }

    .resend-btn {
      background: none;
      border: none;
      padding: 0;
      margin-left: 4px;
      color: #319795;
      font-weight: 600;
      cursor: pointer;
    }

    .resend-btn:hover:not(:disabled) { text-decoration: underline; }
    .resend-btn:disabled { opacity: 0.5; cursor: not-allowed; }

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
      .otp-input { width: 44px; height: 52px; font-size: 20px; }
    }
  `]
})
export class OtpVerifyComponent implements OnInit, AfterViewInit {
  @ViewChildren('otpInput') otpInputs!: QueryList<ElementRef<HTMLInputElement>>;
  
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private authApi = inject(AuthApiService);
  private authState = inject(AuthStateService);
  
  currentYear = new Date().getFullYear();
  phone = '';
  type = 'login';
  name?: string;
  
  otpDigits: string[] = ['', '', '', '', '', ''];
  
  loading = signal(false);
  resendLoading = signal(false);
  error = signal<string | null>(null);
  resendSuccess = signal(false);
  resendTimer = signal(30);
  
  private timerInterval?: any;
  
  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.phone = params['phone'] || '';
      this.type = params['type'] || 'login';
      this.name = params['name'];
      
      if (!this.phone) {
        this.router.navigate(['/auth/login']);
      }
    });
    
    this.startTimer();
  }
  
  ngAfterViewInit(): void {
    setTimeout(() => {
      this.otpInputs.first?.nativeElement.focus();
    }, 100);
  }
  
  maskedPhone(): string {
    if (!this.phone) return '';
    return this.phone.substring(0, 2) + '****' + this.phone.substring(6);
  }
  
  isOtpComplete(): boolean {
    return this.otpDigits.every(d => d !== '');
  }
  
  getOtp(): string {
    return this.otpDigits.join('');
  }
  
  onInput(event: Event, index: number): void {
    const input = event.target as HTMLInputElement;
    const value = input.value.replace(/\D/g, '');
    
    if (value.length > 0) {
      this.otpDigits[index] = value[0];
      input.value = value[0];
      
      if (index < 5) {
        const inputs = this.otpInputs.toArray();
        inputs[index + 1]?.nativeElement.focus();
      }
    }
  }
  
  onKeyDown(event: KeyboardEvent, index: number): void {
    const inputs = this.otpInputs.toArray();
    
    if (event.key === 'Backspace') {
      if (!this.otpDigits[index] && index > 0) {
        inputs[index - 1]?.nativeElement.focus();
      }
      this.otpDigits[index] = '';
    } else if (event.key === 'ArrowLeft' && index > 0) {
      inputs[index - 1]?.nativeElement.focus();
    } else if (event.key === 'ArrowRight' && index < 5) {
      inputs[index + 1]?.nativeElement.focus();
    }
  }
  
  onPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const pastedData = event.clipboardData?.getData('text').replace(/\D/g, '').substring(0, 6);
    
    if (pastedData) {
      for (let i = 0; i < pastedData.length && i < 6; i++) {
        this.otpDigits[i] = pastedData[i];
      }
      
      const inputs = this.otpInputs.toArray();
      const focusIndex = Math.min(pastedData.length, 5);
      inputs[focusIndex]?.nativeElement.focus();
    }
  }
  
  startTimer(): void {
    this.resendTimer.set(30);
    clearInterval(this.timerInterval);
    
    this.timerInterval = setInterval(() => {
      const current = this.resendTimer();
      if (current > 0) {
        this.resendTimer.set(current - 1);
      } else {
        clearInterval(this.timerInterval);
      }
    }, 1000);
  }
  
  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `0:${secs.toString().padStart(2, '0')}`;
  }
  
  verifyOtp(): void {
    if (!this.isOtpComplete()) return;
    
    this.loading.set(true);
    this.error.set(null);
    
    this.authApi.verifyOtp(this.phone, this.getOtp(), this.name).subscribe({
      next: (tokens) => {
        this.authState.setTokens(tokens.access_token, tokens.refresh_token);
        this.loading.set(false);
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.loading.set(false);
        let errorMessage = 'Invalid OTP. Please try again.';
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
        this.otpDigits = ['', '', '', '', '', ''];
        this.otpInputs.first?.nativeElement.focus();
      }
    });
  }
  
  resendOtp(): void {
    this.resendLoading.set(true);
    this.error.set(null);
    
    this.authApi.loginOtp(this.phone).subscribe({
      next: () => {
        this.resendLoading.set(false);
        this.resendSuccess.set(true);
        this.startTimer();
        setTimeout(() => this.resendSuccess.set(false), 3000);
      },
      error: (err) => {
        this.resendLoading.set(false);
        let errorMessage = 'Failed to resend OTP.';
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
  
  ngOnDestroy(): void {
    clearInterval(this.timerInterval);
  }
}
