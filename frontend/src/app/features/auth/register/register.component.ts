import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthApiService } from '../../../core/api/services/auth-api.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, RouterLink,
    MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule,
  ],
  template: `
    <div class="auth-page">
      <div class="auth-card">
        <div class="auth-logo">
          <span style="font-size:2rem">🧪</span>
          <h2>SRI Diagnostics</h2>
          <p>Create your account</p>
        </div>

        @if (error()) {
          <div class="alert-error">
            <mat-icon>error_outline</mat-icon>
            <span>{{ error() }}</span>
          </div>
        }

        <form [formGroup]="form" (ngSubmit)="submit()">
          <mat-form-field appearance="outline">
            <mat-label>Full Name</mat-label>
            <mat-icon matPrefix>person</mat-icon>
            <input matInput formControlName="name" autocomplete="name" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Phone Number</mat-label>
            <mat-icon matPrefix>phone</mat-icon>
            <input matInput formControlName="phone" type="tel" autocomplete="tel" placeholder="+91XXXXXXXXXX" />
            @if (form.get('phone')?.invalid && form.get('phone')?.touched) {
              <mat-error>Enter a valid phone number (10–15 digits)</mat-error>
            }
          </mat-form-field>
          <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid || loading()" class="submit-btn">
            {{ loading() ? 'Sending OTP…' : 'Send OTP' }}
          </button>
        </form>

        <div class="auth-footer">
          Already have an account? <a routerLink="/auth/login">Sign in</a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .alert-error {
      display: flex; align-items: center; gap: .5rem;
      padding: .75rem 1rem; border-radius: 8px; font-size: .875rem;
      background: #fed7d7; color: #9b2c2c; margin-bottom: .5rem;
    }
    .submit-btn { width: 100%; height: 44px; font-size: 1rem; font-weight: 600; }
  `],
})
export class RegisterComponent {
  form = this.fb.group({
    name: ['', Validators.required],
    phone: ['', [Validators.required, Validators.pattern(/^\+?[0-9]{10,15}$/)]],
  });
  loading = signal(false);
  error = signal<string | null>(null);

  constructor(
    private fb: FormBuilder,
    private authApi: AuthApiService,
    private router: Router,
  ) {}

  submit(): void {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.error.set(null);
    const { phone, name } = this.form.value;
    this.authApi.register(phone!, name!).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/auth/verify-otp'], { queryParams: { phone, name } });
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.error?.message ?? 'Registration failed. Please try again.');
      },
    });
  }
}
