import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { AuthApiService } from '../../../core/api/services/auth-api.service';
import { ErrorBannerComponent } from '../../../shared/components/error-banner.component';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner.component';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatFormFieldModule, MatInputModule, MatButtonModule,
    ErrorBannerComponent, LoadingSpinnerComponent,
  ],
  template: `
    <div class="auth-container">
      <h2>Create Account</h2>
      <app-error-banner *ngIf="error()" [message]="error()!" (retry)="error.set(null)" />
      <app-loading-spinner *ngIf="loading()" />

      <form [formGroup]="form" (ngSubmit)="submit()" *ngIf="!loading()">
        <mat-form-field appearance="outline">
          <mat-label>Full Name</mat-label>
          <input matInput formControlName="name" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Phone Number</mat-label>
          <input matInput formControlName="phone" type="tel" />
        </mat-form-field>
        <button mat-raised-button color="primary" type="submit" [disabled]="form.invalid">
          Send OTP
        </button>
      </form>
    </div>
  `,
  styles: [`
    .auth-container { max-width: 400px; margin: 4rem auto; padding: 2rem; display: flex; flex-direction: column; gap: 1rem; }
    form { display: flex; flex-direction: column; gap: 1rem; }
    mat-form-field { width: 100%; }
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
