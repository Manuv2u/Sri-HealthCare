import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AuthApiService } from '../../../core/api/services/auth-api.service';
import { AuthStateService } from '../../../core/auth/auth-state.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule],
  template: `
    <div class="auth-page">
      <div class="auth-card">
        <!-- Logo -->
        <div class="auth-logo">
          <div class="logo-icon">🧪</div>
          <h2>SRI Diagnostics</h2>
          <p>{{ step() === 'phone' ? 'Sign in with your phone number' : 'Enter the OTP sent to your phone' }}</p>
        </div>

        <!-- Session / info message -->
        @if (sessionMessage()) {
          <div class="alert info">
            <mat-icon>info</mat-icon> {{ sessionMessage() }}
          </div>
        }

        <!-- Error -->
        @if (error()) {
          <div class="alert error">
            <mat-icon>error_outline</mat-icon> {{ error() }}
          </div>
        }

        <!-- Step 1: Phone -->
        @if (step() === 'phone') {
          <form [formGroup]="phoneForm" (ngSubmit)="sendOtp()">
            <div class="field-wrap">
              <label>Phone Number</label>
              <div class="input-row" [class.focused]="phoneFocused" [class.invalid]="phoneForm.get('phone')?.invalid && phoneForm.get('phone')?.touched">
                <mat-icon>phone</mat-icon>
                <input formControlName="phone" type="tel" placeholder="+91XXXXXXXXXX"
                  (focus)="phoneFocused=true" (blur)="phoneFocused=false" inputmode="tel" />
              </div>
              @if (phoneForm.get('phone')?.invalid && phoneForm.get('phone')?.touched) {
                <span class="field-err">Enter a valid phone number (10–15 digits)</span>
              }
            </div>
            <button class="btn-primary" type="submit" [disabled]="phoneForm.invalid || loading()">
              @if (loading()) { <span class="spinner"></span> Sending OTP… }
              @else { <mat-icon>send</mat-icon> Send OTP }
            </button>
          </form>
          <div class="auth-footer">
            New user? <a (click)="goRegister()">Create account</a>
          </div>
        }

        <!-- Step 2: OTP -->
        @if (step() === 'otp') {
          <div class="phone-display">
            <mat-icon>phone</mat-icon>
            <span>{{ phoneForm.value.phone }}</span>
            <button class="btn-change" (click)="step.set('phone')">Change</button>
          </div>

          <div class="timer-row" [class.expired]="timeLeft() === 0">
            <mat-icon>{{ timeLeft() > 0 ? 'timer' : 'timer_off' }}</mat-icon>
            <span>{{ timeLeft() > 0 ? 'Expires in ' + timeLeft() + 's' : 'OTP expired' }}</span>
            @if (timeLeft() === 0) {
              <button class="btn-resend" (click)="sendOtp()">Resend</button>
            }
          </div>

          <form [formGroup]="otpForm" (ngSubmit)="verifyOtp()">
            <div class="field-wrap">
              <label>6-digit OTP</label>
              <div class="input-row otp-input" [class.focused]="otpFocused">
                <mat-icon>pin</mat-icon>
                <input formControlName="otp" maxlength="6" inputmode="numeric" placeholder="000000"
                  (focus)="otpFocused=true" (blur)="otpFocused=false" autocomplete="one-time-code" />
              </div>
            </div>
            <button class="btn-primary" type="submit" [disabled]="otpForm.invalid || timeLeft() === 0 || loading()">
              @if (loading()) { <span class="spinner"></span> Verifying… }
              @else { <mat-icon>check_circle</mat-icon> Verify & Sign In }
            </button>
          </form>
        }
      </div>
    </div>
  `,
  styles: [`
    .auth-page {
      min-height: 100vh; display: flex; align-items: center; justify-content: center;
      background: linear-gradient(135deg, #f0fdf9 0%, #e0f2f1 100%); padding: 1.5rem;
    }
    .auth-card {
      background: #fff; border-radius: 20px; padding: 2.5rem 2rem;
      width: 100%; max-width: 420px; box-shadow: 0 8px 32px rgba(0,0,0,.1);
      display: flex; flex-direction: column; gap: 1.25rem;
    }
    .auth-logo { text-align: center;
      .logo-icon { font-size: 2.5rem; margin-bottom: .5rem; }
      h2 { font-size: 1.4rem; font-weight: 800; color: #1a202c; margin-bottom: .25rem; }
      p { font-size: .875rem; color: #718096; }
    }
    .alert { display: flex; align-items: center; gap: .5rem; padding: .75rem 1rem; border-radius: 10px; font-size: .875rem;
      mat-icon { font-size: 1.1rem; width: 1.1rem; height: 1.1rem; flex-shrink: 0; }
      &.error { background: #fed7d7; color: #9b2c2c; }
      &.info { background: #bee3f8; color: #2a4365; }
    }
    .field-wrap { display: flex; flex-direction: column; gap: .4rem;
      label { font-size: .85rem; font-weight: 600; color: #4a5568; }
    }
    .input-row {
      display: flex; align-items: center; gap: .6rem;
      background: #f7fafc; border: 1.5px solid #e2e8f0; border-radius: 12px; padding: .7rem 1rem;
      transition: border-color .15s;
      mat-icon { color: #a0aec0; font-size: 1.2rem; width: 1.2rem; height: 1.2rem; flex-shrink: 0; }
      input { flex: 1; border: none; outline: none; font-size: 1rem; color: #2d3748; background: transparent; }
      &.focused { border-color: #00796b; background: #fff; }
      &.invalid { border-color: #e53e3e; }
      &.otp-input input { font-size: 1.4rem; letter-spacing: .3em; font-weight: 700; }
    }
    .field-err { font-size: .78rem; color: #e53e3e; }
    .btn-primary {
      width: 100%; display: flex; align-items: center; justify-content: center; gap: .5rem;
      background: #00796b; color: #fff; border: none; border-radius: 12px;
      padding: .85rem; font-size: 1rem; font-weight: 700; cursor: pointer; transition: background .15s;
      mat-icon { font-size: 1.1rem; width: 1.1rem; height: 1.1rem; }
      &:hover:not(:disabled) { background: #00695c; }
      &:disabled { opacity: .55; cursor: not-allowed; }
    }
    .spinner { width: 18px; height: 18px; border: 2px solid rgba(255,255,255,.4); border-top-color: #fff; border-radius: 50%; animation: spin .7s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .phone-display {
      display: flex; align-items: center; gap: .5rem;
      background: #f0fdf9; border: 1px solid #b2f5ea; border-radius: 10px; padding: .6rem 1rem;
      font-size: .9rem; font-weight: 600; color: #00796b;
      mat-icon { font-size: 1.1rem; width: 1.1rem; height: 1.1rem; }
      span { flex: 1; }
    }
    .btn-change { background: none; border: none; color: #718096; font-size: .8rem; cursor: pointer; text-decoration: underline; &:hover{color:#00796b;} }
    .timer-row { display: flex; align-items: center; gap: .4rem; font-size: .85rem; color: #718096;
      mat-icon { font-size: 1rem; width: 1rem; height: 1rem; }
      &.expired { color: #e53e3e; }
    }
    .btn-resend { margin-left: auto; background: none; border: 1px solid #00796b; border-radius: 6px; padding: .2rem .65rem; font-size: .78rem; color: #00796b; cursor: pointer; font-weight: 600; &:hover{background:#e0f2f1;} }
    .auth-footer { text-align: center; font-size: .875rem; color: #718096;
      a { color: #00796b; font-weight: 600; cursor: pointer; text-decoration: none; &:hover{text-decoration:underline;} }
    }
  `],
})
export class LoginComponent implements OnInit, OnDestroy {
  step = signal<'phone' | 'otp'>('phone');
  loading = signal(false);
  error = signal<string | null>(null);
  sessionMessage = signal<string | null>(null);
  timeLeft = signal(600);
  phoneFocused = false;
  otpFocused = false;
  private timer?: ReturnType<typeof setInterval>;

  phoneForm = this.fb.group({
    phone: ['', [Validators.required, Validators.pattern(/^\+?[0-9]{10,15}$/)]],
  });
  otpForm = this.fb.group({
    otp: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
  });

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private authApi: AuthApiService,
    private authState: AuthStateService,
  ) {}

  ngOnInit(): void {
    const msg = this.route.snapshot.queryParamMap.get('message');
    if (msg) this.sessionMessage.set(msg);
    // Pre-fill phone if coming from register redirect
    const phone = this.route.snapshot.queryParamMap.get('phone');
    if (phone) this.phoneForm.patchValue({ phone });
  }

  ngOnDestroy(): void { clearInterval(this.timer); }

  sendOtp(): void {
    if (this.phoneForm.invalid) return;
    this.error.set(null);
    this.loading.set(true);
    const phone = this.phoneForm.value.phone!;

    // Try login-otp first (existing user). If 404/error, fall back to register flow.
    this.authApi.loginOtp(phone).subscribe({
      next: () => {
        this.loading.set(false);
        this.step.set('otp');
        this.startTimer();
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Could not send OTP. Please check your phone number.');
      },
    });
  }

  verifyOtp(): void {
    if (this.otpForm.invalid) return;
    this.error.set(null);
    this.loading.set(true);
    const phone = this.phoneForm.value.phone!;
    const otp = this.otpForm.value.otp!;

    this.authApi.verifyOtp(phone, otp).subscribe({
      next: (tokens) => {
        this.authState.setTokens(tokens.access_token, tokens.refresh_token);
        try {
          const payload = JSON.parse(atob(tokens.access_token.split('.')[1]));
          this.authState.setUser({ id: payload.sub, name: payload.name ?? 'User', role: payload.role });
        } catch { /* ignore */ }
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
        const role = this.authState.role();
        const defaultUrl = role === 'admin' ? '/admin' : role === 'technician' ? '/dashboard' : '/profile';
        this.router.navigateByUrl(returnUrl ?? defaultUrl);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.error?.message ?? 'Invalid or expired OTP.');
      },
    });
  }

  goRegister(): void {
    this.router.navigate(['/auth/register']);
  }

  private startTimer(): void {
    clearInterval(this.timer);
    this.timeLeft.set(600);
    this.timer = setInterval(() => {
      this.timeLeft.update(t => Math.max(0, t - 1));
    }, 1000);
  }
}
