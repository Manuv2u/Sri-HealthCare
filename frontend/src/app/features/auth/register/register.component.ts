import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthApiService } from '../../../core/api/services/auth-api.service';
import { AuthStateService } from '../../../core/auth/auth-state.service';

function passwordStrength(control: AbstractControl): ValidationErrors | null {
  const v: string = control.value ?? '';
  if (!v) return null;
  if (v.length < 8) return { weak: 'at least 8 characters' };
  if (!/[A-Z]/.test(v)) return { weak: 'one uppercase letter' };
  if (!/[a-z]/.test(v)) return { weak: 'one lowercase letter' };
  if (!/[0-9]/.test(v)) return { weak: 'one digit' };
  if (!/[^A-Za-z0-9]/.test(v)) return { weak: 'one special character' };
  return null;
}

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
            @if (form.get('name')?.invalid && form.get('name')?.touched) {
              <mat-error>Full name is required</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Phone Number</mat-label>
            <mat-icon matPrefix>phone</mat-icon>
            <input matInput formControlName="phone" type="tel" autocomplete="tel" placeholder="10-digit mobile number" />
            @if (form.get('phone')?.invalid && form.get('phone')?.touched) {
              <mat-error>Enter a valid 10-digit phone number</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Email Address</mat-label>
            <mat-icon matPrefix>email</mat-icon>
            <input matInput formControlName="email" type="email" autocomplete="email" />
            @if (form.get('email')?.invalid && form.get('email')?.touched) {
              <mat-error>Enter a valid email address</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Password</mat-label>
            <mat-icon matPrefix>lock</mat-icon>
            <input matInput formControlName="password" [type]="showPassword() ? 'text' : 'password'" autocomplete="new-password" />
            <button mat-icon-button matSuffix type="button" (click)="showPassword.set(!showPassword())">
              <mat-icon>{{ showPassword() ? 'visibility_off' : 'visibility' }}</mat-icon>
            </button>
            @if (form.get('password')?.errors?.['weak'] && form.get('password')?.touched) {
              <mat-error>Password needs {{ form.get('password')?.errors?.['weak'] }}</mat-error>
            }
          </mat-form-field>

          <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid || loading()" class="submit-btn">
            {{ loading() ? 'Creating account…' : 'Create Account' }}
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
    mat-form-field { width: 100%; }
  `],
})
export class RegisterComponent {
  form = this.fb.group({
    name: ['', Validators.required],
    phone: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, passwordStrength]],
  });
  loading = signal(false);
  error = signal<string | null>(null);
  showPassword = signal(false);

  constructor(
    private fb: FormBuilder,
    private authApi: AuthApiService,
    private authState: AuthStateService,
    private router: Router,
  ) {}

  submit(): void {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.error.set(null);
    const { name, phone, email, password } = this.form.value;
    this.authApi.register(name!, phone!, email!, password!).subscribe({
      next: (tokens) => {
        this.loading.set(false);
        this.authState.setTokens(tokens.access_token, tokens.refresh_token);
        try {
          const payload = JSON.parse(atob(tokens.access_token.split('.')[1]));
          this.authState.setUser({ id: payload.sub, name: payload.name ?? name!, role: payload.role });
        } catch {}
        const role = this.authState.role();
        const defaultUrl = role === 'admin' ? '/admin' : role === 'technician' ? '/dashboard' : '/profile';
        this.router.navigateByUrl(defaultUrl);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.error?.message ?? 'Registration failed. Please try again.');
      },
    });
  }
}
