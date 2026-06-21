// TODO(TEMP_PASSWORD_AUTH): Remove this component when replacing password-based auth.
import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Location } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { AuthApiService } from '../../../core/api/services/auth-api.service';

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
          <button class="btn-back" (click)="goBack()" type="button">
            <mat-icon>arrow_back</mat-icon>
          </button>
          <div class="title-block">
            <h2>Change Password</h2>
            <p>Update your account password</p>
          </div>
        </div>

        @if (success()) {
          <div class="alert success">
            <mat-icon>check_circle</mat-icon> Password changed successfully!
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
    .auth-page { min-height:100vh; display:flex; align-items:center; justify-content:center; background:linear-gradient(135deg,#f0fdf9 0%,#e0f2f1 100%); padding:1.5rem; }
    .auth-card { background:#fff; border-radius:20px; padding:2rem; width:100%; max-width:420px; box-shadow:0 8px 32px rgba(0,0,0,.1); display:flex; flex-direction:column; gap:1.25rem; }
    .card-header { display:flex; align-items:flex-start; gap:1rem; }
    .btn-back { background:#f7fafc; border:1.5px solid #e2e8f0; border-radius:10px; width:2.5rem; height:2.5rem; display:flex; align-items:center; justify-content:center; cursor:pointer; color:#4a5568; flex-shrink:0;
      mat-icon { font-size:1.3rem; width:1.3rem; height:1.3rem; }
      &:hover { background:#edf2f7; }
    }
    .title-block { h2 { font-size:1.3rem; font-weight:800; color:#1a202c; margin:0 0 .2rem; } p { font-size:.875rem; color:#718096; margin:0; } }
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
    .btn-eye { background:none; border:none; cursor:pointer; padding:0; color:#a0aec0; display:flex; align-items:center; mat-icon { font-size:1.2rem; width:1.2rem; height:1.2rem; } &:hover { color:#4a5568; } }
    .field-err { font-size:.78rem; color:#e53e3e; }
    .btn-primary { width:100%; display:flex; align-items:center; justify-content:center; gap:.5rem; background:#00796b; color:#fff; border:none; border-radius:12px; padding:.85rem; font-size:1rem; font-weight:700; cursor:pointer; transition:background .15s;
      mat-icon { font-size:1.1rem; width:1.1rem; height:1.1rem; }
      &:hover:not(:disabled) { background:#00695c; }
      &:disabled { opacity:.55; cursor:not-allowed; }
    }
    .spinner { width:18px; height:18px; border:2px solid rgba(255,255,255,.4); border-top-color:#fff; border-radius:50%; animation:spin .7s linear infinite; }
    @keyframes spin { to { transform:rotate(360deg); } }
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

  constructor(private fb: FormBuilder, private authApi: AuthApiService, private location: Location) {}

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
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.error?.message ?? 'Failed to change password. Check your current password.');
      },
    });
  }
}
