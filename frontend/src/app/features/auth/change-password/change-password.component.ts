// TODO(TEMP_PASSWORD_AUTH): Remove this component when replacing password-based auth.
import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AuthApiService } from '../../../core/api/services/auth-api.service';
import { AuthStateService } from '../../../core/auth/auth-state.service';

function passwordsMatch(control: AbstractControl): ValidationErrors | null {
  const pw = control.get('newPassword')?.value;
  const confirm = control.get('confirmPassword')?.value;
  return pw && confirm && pw !== confirm ? { mismatch: true } : null;
}

@Component({
  selector: 'app-change-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule],
  template: `
    <div class="auth-page">
      <div class="auth-card">
        <div class="card-header">
          @if (!firstLogin) {
            <button class="btn-back" (click)="goBack()" type="button">
              <mat-icon>arrow_back</mat-icon>
            </button>
          }
          <div class="title-block">
            <h2>{{ firstLogin ? 'Set Your Password' : 'Change Password' }}</h2>
            <p>{{ firstLogin ? 'You are using a temporary password. Please set a new password to continue.' : 'Update your account password' }}</p>
          </div>
        </div>

        @if (firstLogin && !success()) {
          <div class="alert info">
            <mat-icon>info</mat-icon> Enter the temporary password you were given as your current password.
          </div>
        }

        @if (success()) {
          <div class="alert success">
            <mat-icon>check_circle</mat-icon>
            {{ firstLogin ? 'Password set successfully! Redirecting…' : 'Password changed successfully!' }}
          </div>
        } @else {
          @if (error()) {
            <div class="alert error">
              <mat-icon>error_outline</mat-icon> {{ error() }}
            </div>
          }
          <form [formGroup]="form" (ngSubmit)="submit()">
            <div class="field-wrap">
              <label>Current Password</label>
              <div class="input-row" [class.focused]="currentFocused"
                   [class.invalid]="form.get('currentPassword')?.invalid && form.get('currentPassword')?.touched">
                <mat-icon>lock_outline</mat-icon>
                <input formControlName="currentPassword" [type]="showCurrent ? 'text' : 'password'"
                  placeholder="Your current password" (focus)="currentFocused=true" (blur)="currentFocused=false"
                  autocomplete="current-password" />
                <button type="button" class="btn-eye" (click)="showCurrent=!showCurrent" tabindex="-1">
                  <mat-icon>{{ showCurrent ? 'visibility_off' : 'visibility' }}</mat-icon>
                </button>
              </div>
              @if (form.get('currentPassword')?.invalid && form.get('currentPassword')?.touched) {
                <span class="field-err">Enter your current password</span>
              }
            </div>
            <div class="field-wrap">
              <label>New Password</label>
              <div class="input-row" [class.focused]="newFocused"
                   [class.invalid]="form.get('newPassword')?.invalid && form.get('newPassword')?.touched">
                <mat-icon>lock</mat-icon>
                <input formControlName="newPassword" [type]="showNew ? 'text' : 'password'"
                  placeholder="At least 8 characters" (focus)="newFocused=true" (blur)="newFocused=false"
                  autocomplete="new-password" />
                <button type="button" class="btn-eye" (click)="showNew=!showNew" tabindex="-1">
                  <mat-icon>{{ showNew ? 'visibility_off' : 'visibility' }}</mat-icon>
                </button>
              </div>
              @if (form.get('newPassword')?.errors?.['minlength'] && form.get('newPassword')?.touched) {
                <span class="field-err">Password must be at least 8 characters</span>
              }
            </div>
            <div class="field-wrap">
              <label>Confirm New Password</label>
              <div class="input-row" [class.focused]="confirmFocused"
                   [class.invalid]="form.errors?.['mismatch'] && form.get('confirmPassword')?.touched">
                <mat-icon>lock</mat-icon>
                <input formControlName="confirmPassword" [type]="showNew ? 'text' : 'password'"
                  placeholder="Re-enter new password" (focus)="confirmFocused=true" (blur)="confirmFocused=false"
                  autocomplete="new-password" />
              </div>
              @if (form.errors?.['mismatch'] && form.get('confirmPassword')?.touched) {
                <span class="field-err">Passwords do not match</span>
              }
            </div>
            <button class="btn-primary" type="submit" [disabled]="form.invalid || loading()">
              @if (loading()) { <span class="spinner"></span> Updating… }
              @else { <mat-icon>check_circle</mat-icon> Change Password }
            </button>
          </form>
        }
      </div>
    </div>
  `,
  styles: [`
    :host {
      --color-primary-50: #EEF2FF;
      --color-primary-100: #E0E7FF;
      --color-primary-500: #6366F1;
      --color-primary-600: #4F46E5;
      --color-primary-700: #4338CA;
      --color-primary-800: #3730A3;
      --shadow-primary: 0 4px 14px 0 rgba(79, 70, 229, 0.28);
      display: block;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    }
    .auth-page { min-height:100vh; display:flex; align-items:center; justify-content:center; background:#F8F9FF; padding:1.5rem; animation: fadeIn .4s ease both; }
    @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
    .auth-card { background:#fff; border-radius:20px; padding:2rem; width:100%; max-width:420px; box-shadow:0 20px 45px -12px rgba(67,56,202,.18), 0 0 0 1px rgba(226,232,240,.6); display:flex; flex-direction:column; gap:1.25rem; animation: cardEnter .45s cubic-bezier(0,0,0.2,1) both; }
    @keyframes cardEnter { from { opacity:0; transform:translateY(16px) scale(0.98); } to { opacity:1; transform:translateY(0) scale(1); } }
    .card-header { display:flex; align-items:flex-start; gap:1rem; }
    .btn-back { background:#F8FAFC; border:1.5px solid #E2E8F0; border-radius:10px; width:2.5rem; height:2.5rem; display:flex; align-items:center; justify-content:center; cursor:pointer; color:#475569; flex-shrink:0;
      mat-icon { font-size:1.3rem; width:1.3rem; height:1.3rem; }
      &:hover { background:#EEF2FF; border-color:#C7D2FE; color:#4F46E5; }
    }
    .title-block { h2 { font-size:1.3rem; font-weight:800; letter-spacing:-0.01em; color:#0F172A; margin:0 0 .2rem; } p { font-size:.875rem; color:#475569; margin:0; } }
    .alert { display:flex; align-items:flex-start; gap:.5rem; padding:.75rem 1rem; border-radius:10px; font-size:.875rem;
      mat-icon { font-size:1.1rem; width:1.1rem; height:1.1rem; flex-shrink:0; margin-top:1px; }
      &.error { background:#FEF2F2; color:#B91C1C; }
      &.success { background:#F0FFF4; color:#22543D; }
      &.info { background:#EEF2FF; color:#4338CA; }
    }
    .field-wrap { display:flex; flex-direction:column; gap:.4rem; label { font-size:.85rem; font-weight:600; color:#475569; } }
    .input-row { display:flex; align-items:center; gap:.6rem; background:#F8FAFC; border:1.5px solid #E2E8F0; border-radius:12px; padding:.7rem 1rem; transition:border-color .15s, box-shadow .15s;
      mat-icon { color:#94A3B8; font-size:1.2rem; width:1.2rem; height:1.2rem; flex-shrink:0; }
      input { flex:1; border:none; outline:none; font-size:1rem; color:#0F172A; background:transparent; }
      &.focused { border-color:#6366F1; background:#fff; box-shadow:0 0 0 3px rgba(99,102,241,.12); }
      &.invalid { border-color:#EF4444; }
    }
    .btn-eye { background:none; border:none; cursor:pointer; padding:0; color:#94A3B8; display:flex; align-items:center; mat-icon { font-size:1.2rem; width:1.2rem; height:1.2rem; } &:hover { color:#475569; } }
    .field-err { font-size:.78rem; color:#DC2626; font-weight:500; }
    .btn-primary { width:100%; display:flex; align-items:center; justify-content:center; gap:.5rem; background:linear-gradient(135deg,#6366F1 0%,#4F46E5 100%); color:#fff; border:none; border-radius:12px; padding:.85rem; font-size:1rem; font-weight:700; letter-spacing:-0.01em; cursor:pointer; transition:transform .15s, box-shadow .15s; box-shadow:0 4px 14px rgba(99,102,241,.35);
      mat-icon { font-size:1.1rem; width:1.1rem; height:1.1rem; }
      &:hover:not(:disabled) { transform:translateY(-1px); box-shadow:0 6px 20px rgba(99,102,241,.45); }
      &:active:not(:disabled) { transform:translateY(0); }
      &:disabled { opacity:.55; cursor:not-allowed; box-shadow:none; }
    }
    .spinner { width:18px; height:18px; border:2px solid rgba(255,255,255,.4); border-top-color:#fff; border-radius:50%; animation:spin .7s linear infinite; }
    @keyframes spin { to { transform:rotate(360deg); } }
    @media (prefers-reduced-motion: reduce) {
      .auth-page, .auth-card { animation:none; }
      .btn-primary:hover:not(:disabled) { transform:none; }
    }
  `],
})
export class ChangePasswordComponent {
  loading = signal(false);
  error = signal<string | null>(null);
  success = signal(false);
  currentFocused = false;
  newFocused = false;
  confirmFocused = false;
  showCurrent = false;
  showNew = false;

  form = this.fb.group({
    currentPassword: ['', [Validators.required]],
    newPassword: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', [Validators.required]],
  }, { validators: passwordsMatch });

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private authState = inject(AuthStateService);
  firstLogin = false;

  constructor(private fb: FormBuilder, private authApi: AuthApiService, private location: Location) {
    this.firstLogin = this.route.snapshot.queryParamMap.get('firstLogin') === '1'
      || this.authState.mustChangePassword();
  }

  goBack(): void { this.location.back(); }

  submit(): void {
    if (this.form.invalid) return;
    this.error.set(null);
    this.loading.set(true);

    const { currentPassword, newPassword } = this.form.value;
    this.authApi.changePassword(currentPassword!, newPassword!).subscribe({
      next: () => {
        this.loading.set(false);
        this.success.set(true);
        this.authState.clearMustChangePassword();
        if (this.firstLogin) {
          const role = this.authState.role();
          const target = role === 'admin' ? '/admin/dashboard'
            : role === 'technician' ? '/technician'
            : '/dashboard';
          setTimeout(() => this.router.navigateByUrl(target, { replaceUrl: true }), 1200);
        }
      },
      error: (err) => {
        this.loading.set(false);
        const detail = err.error?.detail;
        const msg = (typeof detail === 'string' ? detail : detail?.message)
          ?? err.error?.message
          ?? 'Failed to change password. Check your current password.';
        this.error.set(msg);
      },
    });
  }
}
