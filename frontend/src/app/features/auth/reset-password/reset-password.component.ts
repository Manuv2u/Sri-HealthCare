// TODO(TEMP_PASSWORD_AUTH): Remove this component when replacing password-based auth.
import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AuthApiService } from '../../../core/api/services/auth-api.service';

function passwordsMatch(control: AbstractControl): ValidationErrors | null {
  const pw = control.get('newPassword')?.value;
  const confirm = control.get('confirmPassword')?.value;
  return pw && confirm && pw !== confirm ? { mismatch: true } : null;
}

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule, RouterModule],
  template: `
    <div class="auth-page">
      <div class="auth-card">
        <div class="auth-logo">
          <div class="logo-icon">🔐</div>
          <h2>Reset Password</h2>
          <p>Enter your new password below</p>
        </div>

        @if (!token()) {
          <div class="alert error">
            <mat-icon>error_outline</mat-icon> Invalid or missing reset token. <a routerLink="/auth/forgot-password">Request a new one.</a>
          </div>
        } @else if (success()) {
          <div class="alert success">
            <mat-icon>check_circle</mat-icon> Password updated successfully!
          </div>
          <a routerLink="/auth/login" class="btn-secondary">Sign In</a>
        } @else {
          @if (error()) {
            <div class="alert error">
              <mat-icon>error_outline</mat-icon> {{ error() }}
            </div>
          }
          <form [formGroup]="form" (ngSubmit)="submit()">
            <div class="field-wrap">
              <label>New Password</label>
              <div class="input-row" [class.focused]="pwFocused"
                   [class.invalid]="form.get('newPassword')?.invalid && form.get('newPassword')?.touched">
                <mat-icon>lock_outline</mat-icon>
                <input formControlName="newPassword" [type]="showPw ? 'text' : 'password'"
                  placeholder="At least 8 characters" (focus)="pwFocused=true" (blur)="pwFocused=false"
                  autocomplete="new-password" />
                <button type="button" class="btn-eye" (click)="showPw=!showPw" tabindex="-1">
                  <mat-icon>{{ showPw ? 'visibility_off' : 'visibility' }}</mat-icon>
                </button>
              </div>
              @if (form.get('newPassword')?.errors?.['minlength'] && form.get('newPassword')?.touched) {
                <span class="field-err">Password must be at least 8 characters</span>
              }
            </div>
            <div class="field-wrap">
              <label>Confirm Password</label>
              <div class="input-row" [class.focused]="confirmFocused"
                   [class.invalid]="form.errors?.['mismatch'] && form.get('confirmPassword')?.touched">
                <mat-icon>lock</mat-icon>
                <input formControlName="confirmPassword" [type]="showPw ? 'text' : 'password'"
                  placeholder="Re-enter password" (focus)="confirmFocused=true" (blur)="confirmFocused=false"
                  autocomplete="new-password" />
              </div>
              @if (form.errors?.['mismatch'] && form.get('confirmPassword')?.touched) {
                <span class="field-err">Passwords do not match</span>
              }
            </div>
            <button class="btn-primary" type="submit" [disabled]="form.invalid || loading()">
              @if (loading()) { <span class="spinner"></span> Updating… }
              @else { <mat-icon>check_circle</mat-icon> Set New Password }
            </button>
          </form>
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
      a { color:inherit; font-weight:600; }
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
    .btn-eye { background:none; border:none; cursor:pointer; padding:0; color:#a0aec0; display:flex; align-items:center; mat-icon { font-size:1.2rem; width:1.2rem; height:1.2rem; } &:hover { color:#4a5568; } }
    .field-err { font-size:.78rem; color:#e53e3e; }
    .btn-primary { width:100%; display:flex; align-items:center; justify-content:center; gap:.5rem; background:#00796b; color:#fff; border:none; border-radius:12px; padding:.85rem; font-size:1rem; font-weight:700; cursor:pointer; transition:background .15s;
      mat-icon { font-size:1.1rem; width:1.1rem; height:1.1rem; }
      &:hover:not(:disabled) { background:#00695c; }
      &:disabled { opacity:.55; cursor:not-allowed; }
    }
    .btn-secondary { display:flex; align-items:center; justify-content:center; background:#f7fafc; color:#4a5568; border:1.5px solid #e2e8f0; border-radius:12px; padding:.75rem; font-size:.95rem; font-weight:600; cursor:pointer; text-decoration:none; &:hover { background:#edf2f7; } }
    .spinner { width:18px; height:18px; border:2px solid rgba(255,255,255,.4); border-top-color:#fff; border-radius:50%; animation:spin .7s linear infinite; }
    @keyframes spin { to { transform:rotate(360deg); } }
  `],
})
export class ResetPasswordComponent implements OnInit {
  token = signal<string | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);
  success = signal(false);
  pwFocused = false;
  confirmFocused = false;
  showPw = false;

  form = this.fb.group({
    newPassword: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', [Validators.required]],
  }, { validators: passwordsMatch });

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private authApi: AuthApiService,
  ) {}

  ngOnInit(): void {
    const t = this.route.snapshot.queryParamMap.get('token');
    this.token.set(t);
  }

  submit(): void {
    if (this.form.invalid || !this.token()) return;
    this.error.set(null);
    this.loading.set(true);

    this.authApi.resetPassword(this.token()!, this.form.value.newPassword!).subscribe({
      next: () => {
        this.loading.set(false);
        this.success.set(true);
        setTimeout(() => this.router.navigate(['/auth/login']), 2000);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.error?.message ?? 'Reset link is invalid or expired.');
      },
    });
  }
}
