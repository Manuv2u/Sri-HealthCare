// TODO(TEMP_PASSWORD_AUTH): Remove this component when replacing password-based auth.
import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AuthApiService } from '../../../core/api/services/auth-api.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule, RouterModule],
  template: `
    <div class="auth-page">
      <div class="auth-card">
        <div class="auth-logo">
          <div class="logo-icon">🔑</div>
          <h2>Forgot Password</h2>
          <p>Enter your email or phone and we'll send a reset link</p>
        </div>

        @if (success()) {
          <div class="alert success">
            <mat-icon>check_circle</mat-icon>
            If that account exists, a reset link has been sent. Check your email or ask your admin for the reset token.
          </div>
          <a routerLink="/auth/login" class="btn-secondary">Back to Sign In</a>
        } @else {
          @if (error()) {
            <div class="alert error">
              <mat-icon>error_outline</mat-icon> {{ error() }}
            </div>
          }
          <form [formGroup]="form" (ngSubmit)="submit()">
            <div class="field-wrap">
              <label>Email or Phone</label>
              <div class="input-row" [class.focused]="focused" [class.invalid]="form.get('identifier')?.invalid && form.get('identifier')?.touched">
                <mat-icon>person</mat-icon>
                <input formControlName="identifier" type="text" placeholder="email@example.com or phone"
                  (focus)="focused=true" (blur)="focused=false" autocomplete="username" />
              </div>
              @if (form.get('identifier')?.invalid && form.get('identifier')?.touched) {
                <span class="field-err">Enter your email or phone number</span>
              }
            </div>
            <button class="btn-primary" type="submit" [disabled]="form.invalid || loading()">
              @if (loading()) { <span class="spinner"></span> Sending… }
              @else { <mat-icon>send</mat-icon> Send Reset Link }
            </button>
          </form>
          <div class="auth-footer">
            <a routerLink="/auth/login">Back to Sign In</a>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .auth-page { min-height:100vh; display:flex; align-items:center; justify-content:center; background:linear-gradient(135deg,#f0fdf9 0%,#e0f2f1 100%); padding:1.5rem; }
    .auth-card { background:#fff; border-radius:20px; padding:2.5rem 2rem; width:100%; max-width:420px; box-shadow:0 8px 32px rgba(0,0,0,.1); display:flex; flex-direction:column; gap:1.25rem; }
    .auth-logo { text-align:center;
      .logo-icon { font-size:2.5rem; margin-bottom:.5rem; }
      h2 { font-size:1.4rem; font-weight:800; color:#1a202c; margin-bottom:.25rem; }
      p { font-size:.875rem; color:#718096; }
    }
    .alert { display:flex; align-items:flex-start; gap:.5rem; padding:.75rem 1rem; border-radius:10px; font-size:.875rem;
      mat-icon { font-size:1.1rem; width:1.1rem; height:1.1rem; flex-shrink:0; margin-top:1px; }
      &.error { background:#fed7d7; color:#9b2c2c; }
      &.success { background:#c6f6d5; color:#22543d; }
    }
    .field-wrap { display:flex; flex-direction:column; gap:.4rem; label { font-size:.85rem; font-weight:600; color:#4a5568; } }
    .input-row { display:flex; align-items:center; gap:.6rem; background:#f7fafc; border:1.5px solid #e2e8f0; border-radius:12px; padding:.7rem 1rem; transition:border-color .15s;
      mat-icon { color:#a0aec0; font-size:1.2rem; width:1.2rem; height:1.2rem; flex-shrink:0; }
      input { flex:1; border:none; outline:none; font-size:1rem; color:#2d3748; background:transparent; }
      &.focused { border-color:#00796b; background:#fff; }
      &.invalid { border-color:#e53e3e; }
    }
    .field-err { font-size:.78rem; color:#e53e3e; }
    .btn-primary { width:100%; display:flex; align-items:center; justify-content:center; gap:.5rem; background:#00796b; color:#fff; border:none; border-radius:12px; padding:.85rem; font-size:1rem; font-weight:700; cursor:pointer; transition:background .15s;
      mat-icon { font-size:1.1rem; width:1.1rem; height:1.1rem; }
      &:hover:not(:disabled) { background:#00695c; }
      &:disabled { opacity:.55; cursor:not-allowed; }
    }
    .btn-secondary { display:flex; align-items:center; justify-content:center; background:#f7fafc; color:#4a5568; border:1.5px solid #e2e8f0; border-radius:12px; padding:.75rem; font-size:.95rem; font-weight:600; cursor:pointer; text-decoration:none; &:hover { background:#edf2f7; } }
    .spinner { width:18px; height:18px; border:2px solid rgba(255,255,255,.4); border-top-color:#fff; border-radius:50%; animation:spin .7s linear infinite; }
    @keyframes spin { to { transform:rotate(360deg); } }
    .auth-footer { text-align:center; font-size:.875rem; color:#718096; a { color:#00796b; font-weight:600; text-decoration:none; &:hover{text-decoration:underline;} } }
  `],
})
export class ForgotPasswordComponent {
  loading = signal(false);
  error = signal<string | null>(null);
  success = signal(false);
  focused = false;

  form = this.fb.group({
    identifier: ['', [Validators.required]],
  });

  constructor(private fb: FormBuilder, private authApi: AuthApiService) {}

  submit(): void {
    if (this.form.invalid) return;
    this.error.set(null);
    this.loading.set(true);

    this.authApi.forgotPassword(this.form.value.identifier!).subscribe({
      next: () => {
        this.loading.set(false);
        this.success.set(true);
      },
      error: () => {
        this.loading.set(false);
        // Always show success to prevent enumeration
        this.success.set(true);
      },
    });
  }
}
