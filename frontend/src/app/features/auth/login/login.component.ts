import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthApiService } from '../../../core/api/services/auth-api.service';
import { AuthStateService } from '../../../core/auth/auth-state.service';

@Component({
  selector: 'app-login',
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
          <p>Sign in to your account</p>
        </div>

        @if (error()) {
          <div class="alert-error">
            <mat-icon>error_outline</mat-icon>
            <span>{{ error() }}</span>
          </div>
        }
        @if (sessionMessage()) {
          <div class="alert-info">
            <mat-icon>info</mat-icon>
            <span>{{ sessionMessage() }}</span>
          </div>
        }

        <form [formGroup]="form" (ngSubmit)="submit()">
          <mat-form-field appearance="outline">
            <mat-label>Phone or Email</mat-label>
            <mat-icon matPrefix>person</mat-icon>
            <input matInput formControlName="phone_or_email" autocomplete="username" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Password</mat-label>
            <mat-icon matPrefix>lock</mat-icon>
            <input matInput formControlName="password" [type]="showPwd() ? 'text' : 'password'" autocomplete="current-password" />
            <button mat-icon-button matSuffix type="button" (click)="showPwd.set(!showPwd())">
              <mat-icon>{{ showPwd() ? 'visibility_off' : 'visibility' }}</mat-icon>
            </button>
          </mat-form-field>
          <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid || loading()" class="submit-btn">
            {{ loading() ? 'Signing in…' : 'Sign In' }}
          </button>
        </form>

        <div class="auth-footer">
          Don't have an account? <a routerLink="/auth/register">Create one</a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .alert-error, .alert-info {
      display: flex; align-items: center; gap: .5rem;
      padding: .75rem 1rem; border-radius: 8px; font-size: .875rem; margin-bottom: .5rem;
    }
    .alert-error { background: #fed7d7; color: #9b2c2c; }
    .alert-info  { background: #bee3f8; color: #2a4365; }
    .submit-btn  { width: 100%; height: 44px; font-size: 1rem; font-weight: 600; }
  `],
})
export class LoginComponent {
  form = this.fb.group({
    phone_or_email: ['', Validators.required],
    password: ['', Validators.required],
  });
  error = signal<string | null>(null);
  sessionMessage = signal<string | null>(null);
  loading = signal(false);
  showPwd = signal(false);

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private authApi: AuthApiService,
    private authState: AuthStateService,
  ) {
    const msg = this.route.snapshot.queryParamMap.get('message');
    if (msg) this.sessionMessage.set(msg);
  }

  submit(): void {
    if (this.form.invalid) return;
    this.error.set(null);
    this.loading.set(true);
    const { phone_or_email, password } = this.form.value;
    this.authApi.login(phone_or_email!, password!).subscribe({
      next: (tokens) => {
        this.authState.setTokens(tokens.access_token, tokens.refresh_token);
        // Decode JWT payload to get user info
        try {
          const payload = JSON.parse(atob(tokens.access_token.split('.')[1]));
          this.authState.setUser({ id: payload.sub, name: payload.name ?? 'Admin', role: payload.role });
        } catch { /* ignore */ }
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
        const role = this.authState.role();
        const defaultUrl = role === 'admin' ? '/admin' : '/dashboard';
        this.router.navigateByUrl(returnUrl ?? defaultUrl);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Invalid credentials. Please check your phone/email and password.');
      },
    });
  }
}
