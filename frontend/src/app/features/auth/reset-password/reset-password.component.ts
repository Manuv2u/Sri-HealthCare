import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, Validators, ReactiveFormsModule, AbstractControl, FormGroup } from '@angular/forms';
import { ButtonComponent, InputComponent, AlertComponent } from '../../../shared/components';
import { AuthApiService } from '../../../core/api/services/auth-api.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, ButtonComponent, InputComponent, AlertComponent],
  template: `
    <div class="reset-password">
      <!-- Mobile Logo -->
      <div class="reset-password__mobile-logo lg:hidden">
        <div class="reset-password__logo-icon">
          <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="32" height="32" rx="8" fill="currentColor"/>
            <path d="M16 6L16 26M6 16L26 16" stroke="white" stroke-width="3" stroke-linecap="round"/>
            <circle cx="16" cy="16" r="4" fill="white"/>
          </svg>
        </div>
        <span class="reset-password__logo-text">Sri Health</span>
      </div>

      @if (!success()) {
        <!-- Icon -->
        <div class="reset-password__icon-wrapper">
          <div class="reset-password__icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
            </svg>
          </div>
        </div>

        <div class="reset-password__header">
          <h1 class="reset-password__title">Reset your password</h1>
          <p class="reset-password__subtitle">
            Create a strong password with at least 8 characters.
          </p>
        </div>

        <!-- Error Alert -->
        @if (error()) {
          <app-alert variant="error" [dismissible]="true" (dismiss)="error.set(null)">
            {{ error() }}
          </app-alert>
        }

        <form [formGroup]="resetForm" (ngSubmit)="submit()" class="reset-password__form">
          <app-input
            label="New Password"
            type="password"
            formControlName="password"
            placeholder="Enter new password"
            [error]="resetForm.get('password')?.invalid && resetForm.get('password')?.touched"
            [errorMessage]="getPasswordError()"
            hint="At least 8 characters with a number"
          />
          
          <app-input
            label="Confirm Password"
            type="password"
            formControlName="confirmPassword"
            placeholder="Confirm new password"
            [error]="resetForm.get('confirmPassword')?.invalid && resetForm.get('confirmPassword')?.touched"
            errorMessage="Passwords do not match"
          />
          
          <app-button 
            type="submit" 
            [fullWidth]="true" 
            [loading]="loading()"
            [disabled]="resetForm.invalid"
            size="lg"
          >
            Reset Password
          </app-button>
        </form>
      } @else {
        <!-- Success State -->
        <div class="reset-password__success">
          <div class="reset-password__success-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          </div>
          <h2 class="reset-password__success-title">Password reset successful</h2>
          <p class="reset-password__success-text">
            Your password has been reset successfully. You can now sign in with your new password.
          </p>
          <app-button [fullWidth]="true" (clicked)="goToLogin()">
            Sign In
          </app-button>
        </div>
      }
    </div>
  `,
  styles: [`
    .reset-password {
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
    
    .reset-password__mobile-logo {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--space-3);
      margin-bottom: var(--space-6);
    }
    
    .reset-password__logo-icon {
      width: 40px;
      height: 40px;
      color: var(--color-primary-600);
    }
    
    .reset-password__logo-text {
      font-family: var(--font-display);
      font-size: var(--text-xl);
      font-weight: var(--font-bold);
      color: var(--text-primary);
    }
    
    .reset-password__icon-wrapper {
      display: flex;
      justify-content: center;
      margin-bottom: var(--space-6);
    }
    
    .reset-password__icon {
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
    
    .reset-password__header {
      margin-bottom: var(--space-6);
    }
    
    .reset-password__title {
      font-family: var(--font-display);
      font-size: var(--text-2xl);
      font-weight: var(--font-bold);
      color: var(--text-primary);
      margin: 0 0 var(--space-3) 0;
    }
    
    .reset-password__subtitle {
      font-size: var(--text-sm);
      color: var(--text-secondary);
      margin: 0;
    }
    
    .reset-password__form {
      display: flex;
      flex-direction: column;
      gap: var(--space-4);
      text-align: left;
    }
    
    .reset-password__success {
      margin-bottom: var(--space-6);
    }
    
    .reset-password__success-icon {
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
    
    .reset-password__success-title {
      font-size: var(--text-xl);
      font-weight: var(--font-bold);
      color: var(--text-primary);
      margin: 0 0 var(--space-2) 0;
    }
    
    .reset-password__success-text {
      font-size: var(--text-sm);
      color: var(--text-secondary);
      line-height: var(--leading-relaxed);
      margin: 0 0 var(--space-6) 0;
    }
    
    .lg\\:hidden {
      @media (min-width: 1024px) { display: none; }
    }
  `]
})
export class ResetPasswordComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private authApi = inject(AuthApiService);
  
  token = '';
  
  loading = signal(false);
  error = signal<string | null>(null);
  success = signal(false);
  
  resetForm = this.fb.group({
    password: ['', [Validators.required, Validators.minLength(8), this.passwordStrength]],
    confirmPassword: ['', Validators.required]
  }, {
    validators: this.passwordMatchValidator
  });
  
  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.token = params['token'] || '';
      if (!this.token) {
        this.router.navigate(['/auth/forgot-password']);
      }
    });
  }
  
  passwordStrength(control: AbstractControl): { [key: string]: boolean } | null {
    const value = control.value;
    if (!value) return null;
    if (!/\d/.test(value)) return { noNumber: true };
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
  
  getPasswordError(): string {
    const control = this.resetForm.get('password');
    if (control?.hasError('required')) return 'Password is required';
    if (control?.hasError('minlength')) return 'Password must be at least 8 characters';
    if (control?.hasError('noNumber')) return 'Password must contain at least one number';
    return 'Invalid password';
  }
  
  submit(): void {
    if (this.resetForm.invalid) return;
    
    this.loading.set(true);
    this.error.set(null);
    
    const password = this.resetForm.value.password!;
    
    this.authApi.resetPassword(this.token, password).subscribe({
      next: () => {
        this.loading.set(false);
        this.success.set(true);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.error?.detail || 'Failed to reset password. The link may have expired.');
      }
    });
  }
  
  goToLogin(): void {
    this.router.navigate(['/auth/login']);
  }
}
