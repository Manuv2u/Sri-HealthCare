import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { ButtonComponent, InputComponent, AlertComponent } from '../../../shared/components';
import { AuthApiService } from '../../../core/api/services/auth-api.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, ButtonComponent, InputComponent, AlertComponent],
  template: `
    <div class="forgot-password">
      <!-- Mobile Logo -->
      <div class="forgot-password__mobile-logo lg:hidden">
        <div class="forgot-password__logo-icon">
          <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="32" height="32" rx="8" fill="currentColor"/>
            <path d="M16 6L16 26M6 16L26 16" stroke="white" stroke-width="3" stroke-linecap="round"/>
            <circle cx="16" cy="16" r="4" fill="white"/>
          </svg>
        </div>
        <span class="forgot-password__logo-text">Sri Health</span>
      </div>

      @if (!emailSent()) {
        <!-- Icon -->
        <div class="forgot-password__icon-wrapper">
          <div class="forgot-password__icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0110 0v4"/>
              <circle cx="12" cy="16" r="1"/>
            </svg>
          </div>
        </div>

        <div class="forgot-password__header">
          <h1 class="forgot-password__title">Forgot password?</h1>
          <p class="forgot-password__subtitle">
            Enter your email or phone number and we'll send you a link to reset your password.
          </p>
        </div>

        <!-- Error Alert -->
        @if (error()) {
          <app-alert variant="error" [dismissible]="true" (dismiss)="error.set(null)">
            {{ error() }}
          </app-alert>
        }

        <form [formGroup]="forgotForm" (ngSubmit)="submit()" class="forgot-password__form">
          <app-input
            label="Email or Phone"
            type="text"
            formControlName="identifier"
            placeholder="Enter your email or phone number"
            [error]="forgotForm.get('identifier')?.invalid && forgotForm.get('identifier')?.touched"
            errorMessage="Please enter a valid email or phone number"
            [iconLeft]="emailIcon"
          />
          
          <app-button 
            type="submit" 
            [fullWidth]="true" 
            [loading]="loading()"
            [disabled]="forgotForm.invalid"
            size="lg"
          >
            Send Reset Link
          </app-button>
        </form>
      } @else {
        <!-- Success State -->
        <div class="forgot-password__success">
          <div class="forgot-password__success-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          </div>
          <h2 class="forgot-password__success-title">Check your inbox</h2>
          <p class="forgot-password__success-text">
            We've sent a password reset link to<br/>
            <strong>{{ sentTo() }}</strong>
          </p>
          <app-button variant="outline" [fullWidth]="true" (clicked)="resetForm()">
            Try different email
          </app-button>
        </div>
      }

      <!-- Back Link -->
      <a routerLink="/auth/login" class="forgot-password__back">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="19" y1="12" x2="5" y2="12"/>
          <polyline points="12 19 5 12 12 5"/>
        </svg>
        Back to login
      </a>
    </div>
  `,
  styles: [`
    .forgot-password {
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
    
    .forgot-password__mobile-logo {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--space-3);
      margin-bottom: var(--space-6);
    }
    
    .forgot-password__logo-icon {
      width: 40px;
      height: 40px;
      color: var(--color-primary-600);
    }
    
    .forgot-password__logo-text {
      font-family: var(--font-display);
      font-size: var(--text-xl);
      font-weight: var(--font-bold);
      color: var(--text-primary);
    }
    
    .forgot-password__icon-wrapper {
      display: flex;
      justify-content: center;
      margin-bottom: var(--space-6);
    }
    
    .forgot-password__icon {
      width: 72px;
      height: 72px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--color-warning-50);
      color: var(--color-warning-600);
      border-radius: var(--radius-2xl);
      
      svg { width: 36px; height: 36px; }
    }
    
    .forgot-password__header {
      margin-bottom: var(--space-6);
    }
    
    .forgot-password__title {
      font-family: var(--font-display);
      font-size: var(--text-2xl);
      font-weight: var(--font-bold);
      color: var(--text-primary);
      margin: 0 0 var(--space-3) 0;
    }
    
    .forgot-password__subtitle {
      font-size: var(--text-sm);
      color: var(--text-secondary);
      line-height: var(--leading-relaxed);
      margin: 0;
    }
    
    .forgot-password__form {
      display: flex;
      flex-direction: column;
      gap: var(--space-4);
      text-align: left;
    }
    
    .forgot-password__success {
      margin-bottom: var(--space-6);
    }
    
    .forgot-password__success-icon {
      width: 72px;
      height: 72px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--color-success-50);
      color: var(--color-success-600);
      border-radius: var(--radius-full);
      margin: 0 auto var(--space-6);
      
      svg { width: 36px; height: 36px; }
    }
    
    .forgot-password__success-title {
      font-size: var(--text-xl);
      font-weight: var(--font-bold);
      color: var(--text-primary);
      margin: 0 0 var(--space-2) 0;
    }
    
    .forgot-password__success-text {
      font-size: var(--text-sm);
      color: var(--text-secondary);
      line-height: var(--leading-relaxed);
      margin: 0 0 var(--space-6) 0;
      
      strong { color: var(--text-primary); }
    }
    
    .forgot-password__back {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2);
      margin-top: var(--space-6);
      font-size: var(--text-sm);
      font-weight: var(--font-medium);
      color: var(--text-secondary);
      text-decoration: none;
      
      svg { width: 18px; height: 18px; }
      
      &:hover { color: var(--color-primary-600); }
    }
    
    .lg\\:hidden {
      @media (min-width: 1024px) { display: none; }
    }
  `]
})
export class ForgotPasswordComponent {
  private fb = inject(FormBuilder);
  private authApi = inject(AuthApiService);
  
  loading = signal(false);
  error = signal<string | null>(null);
  emailSent = signal(false);
  sentTo = signal('');
  
  forgotForm = this.fb.group({
    identifier: ['', Validators.required]
  });
  
  emailIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>`;
  
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
        this.error.set(err.error?.detail || 'Failed to send reset link. Please try again.');
      }
    });
  }
  
  resetForm(): void {
    this.emailSent.set(false);
    this.forgotForm.reset();
  }
}
