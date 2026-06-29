import { Component, inject, signal, OnInit, ViewChildren, QueryList, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ButtonComponent, AlertComponent } from '../../../shared/components';
import { AuthApiService } from '../../../core/api/services/auth-api.service';
import { AuthStateService } from '../../../core/auth/auth-state.service';

@Component({
  selector: 'app-otp-verify',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ButtonComponent, AlertComponent],
  template: `
    <div class="otp-verify">
      <!-- Mobile Logo -->
      <div class="otp-verify__mobile-logo lg:hidden">
        <div class="otp-verify__logo-icon">
          <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="32" height="32" rx="8" fill="currentColor"/>
            <path d="M16 6L16 26M6 16L26 16" stroke="white" stroke-width="3" stroke-linecap="round"/>
            <circle cx="16" cy="16" r="4" fill="white"/>
          </svg>
        </div>
        <span class="otp-verify__logo-text">Sri Health</span>
      </div>

      <!-- Icon -->
      <div class="otp-verify__icon-wrapper">
        <div class="otp-verify__icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
            <path d="M12 18h.01"/>
            <path d="M9 9h6M9 13h6"/>
          </svg>
        </div>
      </div>

      <div class="otp-verify__header">
        <h1 class="otp-verify__title">Verify your phone</h1>
        <p class="otp-verify__subtitle">
          We've sent a 6-digit code to<br/>
          <strong>+91 {{ maskedPhone() }}</strong>
        </p>
      </div>

      <!-- Error Alert -->
      @if (error()) {
        <app-alert variant="error" [dismissible]="true" (dismiss)="error.set(null)">
          {{ error() }}
        </app-alert>
      }

      <!-- Success Alert -->
      @if (resendSuccess()) {
        <app-alert variant="success" [dismissible]="true" (dismiss)="resendSuccess.set(false)">
          OTP sent successfully!
        </app-alert>
      }

      <!-- OTP Input -->
      <form (ngSubmit)="verifyOtp()" class="otp-verify__form">
        <div class="otp-verify__inputs">
          @for (i of [0,1,2,3,4,5]; track i) {
            <input
              #otpInput
              type="text"
              inputmode="numeric"
              maxlength="1"
              class="otp-verify__input"
              [class.otp-verify__input--filled]="otpDigits[i]"
              [class.otp-verify__input--error]="error()"
              [(ngModel)]="otpDigits[i]"
              [name]="'otp' + i"
              (input)="onInput($event, i)"
              (keydown)="onKeyDown($event, i)"
              (paste)="onPaste($event)"
              autocomplete="one-time-code"
            />
          }
        </div>
        
        <app-button 
          type="submit" 
          [fullWidth]="true" 
          [loading]="loading()"
          [disabled]="!isOtpComplete()"
          size="lg"
        >
          Verify OTP
        </app-button>
      </form>

      <!-- Resend -->
      <div class="otp-verify__resend">
        @if (resendTimer() > 0) {
          <p class="otp-verify__timer">
            Resend code in <strong>{{ formatTime(resendTimer()) }}</strong>
          </p>
        } @else {
          <p class="otp-verify__resend-text">
            Didn't receive the code?
            <button 
              type="button" 
              class="otp-verify__resend-btn"
              [disabled]="resendLoading()"
              (click)="resendOtp()"
            >
              {{ resendLoading() ? 'Sending...' : 'Resend OTP' }}
            </button>
          </p>
        }
      </div>

      <!-- Back Link -->
      <a routerLink="/auth/login" class="otp-verify__back">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="19" y1="12" x2="5" y2="12"/>
          <polyline points="12 19 5 12 12 5"/>
        </svg>
        Back to login
      </a>
    </div>
  `,
  styles: [`
    .otp-verify {
      background: var(--bg-primary);
      border-radius: var(--radius-2xl);
      padding: var(--space-8);
      box-shadow: var(--shadow-xl);
      text-align: center;
      
      @media (max-width: 1024px) {
        padding: var(--space-6);
        box-shadow: none;
        background: transparent;
      }
    }
    
    .otp-verify__mobile-logo {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--space-3);
      margin-bottom: var(--space-6);
    }
    
    .otp-verify__logo-icon {
      width: 40px;
      height: 40px;
      color: var(--color-primary-600);
    }
    
    .otp-verify__logo-text {
      font-family: var(--font-display);
      font-size: var(--text-xl);
      font-weight: var(--font-bold);
      color: var(--text-primary);
    }
    
    .otp-verify__icon-wrapper {
      display: flex;
      justify-content: center;
      margin-bottom: var(--space-6);
    }
    
    .otp-verify__icon {
      width: 72px;
      height: 72px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--color-primary-50);
      color: var(--color-primary-600);
      border-radius: var(--radius-2xl);
      
      svg { width: 36px; height: 36px; }
    }
    
    .otp-verify__header {
      margin-bottom: var(--space-6);
    }
    
    .otp-verify__title {
      font-family: var(--font-display);
      font-size: var(--text-2xl);
      font-weight: var(--font-bold);
      color: var(--text-primary);
      margin: 0 0 var(--space-3) 0;
    }
    
    .otp-verify__subtitle {
      font-size: var(--text-sm);
      color: var(--text-secondary);
      line-height: var(--leading-relaxed);
      margin: 0;
      
      strong { color: var(--text-primary); }
    }
    
    .otp-verify__form {
      display: flex;
      flex-direction: column;
      gap: var(--space-6);
    }
    
    .otp-verify__inputs {
      display: flex;
      justify-content: center;
      gap: var(--space-2);
      
      @media (min-width: 640px) {
        gap: var(--space-3);
      }
    }
    
    .otp-verify__input {
      width: 48px;
      height: 56px;
      padding: 0;
      border: 2px solid var(--border-default);
      border-radius: var(--radius-lg);
      background: var(--bg-primary);
      font-family: var(--font-mono);
      font-size: var(--text-2xl);
      font-weight: var(--font-semibold);
      text-align: center;
      color: var(--text-primary);
      transition: all var(--duration-fast) var(--ease-default);
      
      @media (min-width: 640px) {
        width: 52px;
        height: 60px;
      }
      
      &:focus {
        outline: none;
        border-color: var(--color-primary-500);
        box-shadow: 0 0 0 3px var(--color-primary-100);
      }
      
      &--filled {
        border-color: var(--color-primary-400);
        background: var(--color-primary-50);
      }
      
      &--error {
        border-color: var(--color-error-500);
        animation: shake 0.3s ease-in-out;
      }
    }
    
    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      25% { transform: translateX(-4px); }
      75% { transform: translateX(4px); }
    }
    
    .otp-verify__resend {
      margin-top: var(--space-4);
    }
    
    .otp-verify__timer {
      font-size: var(--text-sm);
      color: var(--text-secondary);
      margin: 0;
      
      strong { color: var(--color-primary-600); }
    }
    
    .otp-verify__resend-text {
      font-size: var(--text-sm);
      color: var(--text-secondary);
      margin: 0;
    }
    
    .otp-verify__resend-btn {
      background: none;
      border: none;
      padding: 0;
      margin-left: var(--space-1);
      color: var(--color-primary-600);
      font-weight: var(--font-semibold);
      cursor: pointer;
      
      &:hover:not(:disabled) { text-decoration: underline; }
      &:disabled { opacity: 0.5; cursor: not-allowed; }
    }
    
    .otp-verify__back {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2);
      margin-top: var(--space-6);
      font-size: var(--text-sm);
      font-weight: var(--font-medium);
      color: var(--text-secondary);
      text-decoration: none;
      transition: color var(--duration-fast);
      
      svg { width: 18px; height: 18px; }
      
      &:hover { color: var(--color-primary-600); }
    }
    
    .lg\\:hidden {
      @media (min-width: 1024px) { display: none; }
    }
  `]
})
export class OtpVerifyComponent implements OnInit, AfterViewInit {
  @ViewChildren('otpInput') otpInputs!: QueryList<ElementRef<HTMLInputElement>>;
  
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private authApi = inject(AuthApiService);
  private authState = inject(AuthStateService);
  
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
        this.error.set(err.error?.detail || 'Invalid OTP. Please try again.');
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
        this.error.set(err.error?.detail || 'Failed to resend OTP.');
      }
    });
  }
  
  ngOnDestroy(): void {
    clearInterval(this.timerInterval);
  }
}
