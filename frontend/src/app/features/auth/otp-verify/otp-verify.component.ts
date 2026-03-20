import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { AuthApiService } from '../../../core/api/services/auth-api.service';
import { AuthStateService } from '../../../core/auth/auth-state.service';
import { ErrorBannerComponent } from '../../../shared/components/error-banner.component';

@Component({
  selector: 'app-otp-verify',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatFormFieldModule, MatInputModule, MatButtonModule,
    ErrorBannerComponent,
  ],
  template: `
    <div class="auth-container">
      <h2>Verify OTP</h2>
      <p>Enter the 6-digit code sent to {{ phone }}</p>
      <p class="timer" [class.expired]="timeLeft() === 0">
        {{ timeLeft() > 0 ? 'Expires in ' + timeLeft() + 's' : 'OTP expired' }}
      </p>
      <app-error-banner *ngIf="error()" [message]="error()!" (retry)="error.set(null)" />

      <form [formGroup]="form" (ngSubmit)="submit()">
        <mat-form-field appearance="outline">
          <mat-label>OTP Code</mat-label>
          <input matInput formControlName="otp" maxlength="6" />
        </mat-form-field>
        <button mat-raised-button color="primary" type="submit"
          [disabled]="form.invalid || timeLeft() === 0">
          Verify
        </button>
      </form>
    </div>
  `,
  styles: [`
    .auth-container { max-width: 400px; margin: 4rem auto; padding: 2rem; display: flex; flex-direction: column; gap: 1rem; }
    form { display: flex; flex-direction: column; gap: 1rem; }
    mat-form-field { width: 100%; }
    .timer { color: #666; }
    .timer.expired { color: #f44336; }
  `],
})
export class OtpVerifyComponent implements OnInit, OnDestroy {
  form = this.fb.group({
    otp: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
  });
  error = signal<string | null>(null);
  timeLeft = signal(600); // 10 minutes
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

  ngOnDestroy(): void {
    clearInterval(this.timer);
  }

  submit(): void {
    if (this.form.invalid) return;
    this.error.set(null);
    this.authApi.verifyOtp(this.phone, this.form.value.otp!, this.name).subscribe({
      next: (tokens) => {
        this.authState.setTokens(tokens.access_token, tokens.refresh_token);
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.error.set(err.error?.message ?? 'Invalid or expired OTP.');
      },
    });
  }
}
