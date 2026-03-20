import { Component, signal } from '@angular/core';
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
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatFormFieldModule, MatInputModule, MatButtonModule,
    ErrorBannerComponent,
  ],
  template: `
    <div class="auth-container">
      <h2>Sign In</h2>
      <app-error-banner *ngIf="error()" [message]="error()!" (retry)="error.set(null)" />
      <app-error-banner *ngIf="sessionMessage()" [message]="sessionMessage()!" />

      <form [formGroup]="form" (ngSubmit)="submit()">
        <mat-form-field appearance="outline">
          <mat-label>Phone or Email</mat-label>
          <input matInput formControlName="phone_or_email" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Password</mat-label>
          <input matInput formControlName="password" type="password" />
        </mat-form-field>
        <button mat-raised-button color="primary" type="submit" [disabled]="form.invalid">
          Sign In
        </button>
        <a mat-button routerLink="/auth/register">Create account</a>
      </form>
    </div>
  `,
  styles: [`
    .auth-container { max-width: 400px; margin: 4rem auto; padding: 2rem; display: flex; flex-direction: column; gap: 1rem; }
    form { display: flex; flex-direction: column; gap: 1rem; }
    mat-form-field { width: 100%; }
  `],
})
export class LoginComponent {
  form = this.fb.group({
    phone_or_email: ['', Validators.required],
    password: ['', Validators.required],
  });
  error = signal<string | null>(null);
  sessionMessage = signal<string | null>(null);

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
    const { phone_or_email, password } = this.form.value;
    this.authApi.login(phone_or_email!, password!).subscribe({
      next: (tokens) => {
        this.authState.setTokens(tokens.access_token, tokens.refresh_token);
        this.router.navigate(['/dashboard']);
      },
      error: () => {
        // Identical error for wrong password vs unknown user
        this.error.set('Invalid credentials. Please check your phone/email and password.');
      },
    });
  }
}
