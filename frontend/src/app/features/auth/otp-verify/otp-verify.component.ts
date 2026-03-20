import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthApiService } from '../../../core/api/services/auth-api.service';
import { AuthStateService } from '../../../core/auth/auth-state.service';

@Component({
  selector: 'app-otp-verify',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule,
  ],
  template: `
    <div class="auth-page">
      <div class="auth-card">
        <div class="auth-logo">
          <span style="font-size:2rem">📱</span>
          <h2>Verify OTP</h2>
          <p>Enter the 6-digit code sent to <strong>{{ phone }}</strong></p>
        </div>

        <div class="timer-row" [class.expired]="timeLeft() === 0">
          <mat-icon>{{ timeLeft() > 0 ? 'timer' : 'timer_off' }}</mat-icon>
          <span>{{ timeLeft() > 0 ? 'Expires in ' + timeLeft() + 's' : 'OTP expired — please go back and retry' }}</span>
        </div>

        @if (error()) {
          <div class="alert-error">
            <mat-icon>error_outline</mat-icon>
            <span>{{ error() }}</span>
          </div>
        }

        <form [formGroup]="form" (ngSubmit)="submit()">
          <mat-form-field appearance="outline">
            <mat-label>OTP Code</mat-label>
            <mat-icon matPrefix>pin</mat-icon>
            <input matInput formControlName="otp" maxlength="6" inputmode="numeric" placeholder="000000" />
          </mat-form-field>
          <button mat-flat-button color="primary" type="submit"
            [disabled]="form.invalid || timeLeft() === 0 || loading()" class="submit-btn">
            {{ loading() ? 'Verifying…' : 'Verify & Continue' }}
          </button>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .timer-row {
      display: flex; align-items: center; gap: .4rem;
      font-size: .875rem; color: var(--color-muted); margin-bottom: .75rem;
      mat-icon { font-size: 1.1rem; width: 1.1rem; height: 1.1rem; }
      &.expired { color: var(--color-danger); }
    }
    .alert-error {
      display: flex; align-items: center; gap: .5rem;
      padding: .75rem 1rem; border-radius: 8px; font-size: .875rem;
      background: #fed7d7; color: #9b2c2c; margin-bottom: .5rem;
    }
    .submit-btn { width: 100%; height: 44px; font-size: 1rem; font-weight: 600; }
  `],
})
export class OtpVerifyComponent implements OnInit, OnDestroy {
  form = this.fb.group({
    otp: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
  });
  error = signal<string | null>(null);
  loading = signal(false);
  timeLeft = signal(600);
  phone = '';
  name = '';
  private timer?: ReturnType<typeof setInterval>;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private authApi: AuthApiService,
    private authState: AuthStateService,
  ) {}

  ngOnInit(): void {
    this.phone = this.route.snapshot.queryParamMap.get('phone') ?? '';
    this.name = this.route.snapshot.queryParamMap.get('name') ?? '';
    this.timer = setInterval(() => {
      this.timeLeft.update((t) => Math.max(0, t - 1));
    }, 1000);
  }

  ngOnDestroy(): void { clearInterval(this.timer); }

  submit(): void {
    if (this.form.invalid) return;
    this.error.set(null);
    this.loading.set(true);
    this.authApi.verifyOtp(this.phone, this.form.value.otp!, this.name).subscribe({
      next: (tokens) => {
        this.authState.setTokens(tokens.access_token, tokens.refresh_token);
        try {
          const payload = JSON.parse(atob(tokens.access_token.split('.')[1]));
          this.authState.setUser({ id: payload.sub, name: payload.name ?? this.name ?? 'User', role: payload.role });
        } catch { /* ignore */ }
        const role = this.authState.role();
        const dest = role === 'admin' ? '/admin' : role === 'technician' ? '/dashboard' : '/profile';
        this.router.navigate([dest]);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.error?.message ?? 'Invalid or expired OTP.');
      },
    });
  }
}
