import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { UserApiService } from '../../../core/api/services/user-api.service';
import { AuthStateService } from '../../../core/auth/auth-state.service';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner.component';
import { ErrorBannerComponent } from '../../../shared/components/error-banner.component';

@Component({
  selector: 'app-profile-edit',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatButtonModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatIconModule, MatSnackBarModule,
    LoadingSpinnerComponent, ErrorBannerComponent,
  ],
  template: `
    <div class="edit-page">
      <div class="edit-header">
        <button class="back-btn" (click)="goBack()">
          <mat-icon>arrow_back</mat-icon>
        </button>
        <h1>Edit Profile</h1>
      </div>

      @if (loading()) { <app-loading-spinner /> }
      @else if (loadError()) { <app-error-banner [message]="loadError()!" retryLabel="Retry" (retry)="load()" /> }
      @else {
        <form [formGroup]="form" (ngSubmit)="save()" class="edit-form">
          <div class="avatar-row">
            <div class="avatar">{{ initials() }}</div>
            <div class="phone-display">
              <mat-icon>phone</mat-icon> {{ phone() }}
              <span class="phone-note">Phone number cannot be changed</span>
            </div>
          </div>

          <mat-form-field appearance="outline">
            <mat-label>Full Name</mat-label>
            <input matInput formControlName="name" />
            <mat-error>Name is required</mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Email Address</mat-label>
            <input matInput formControlName="email" type="email" />
            <mat-error>Enter a valid email</mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Date of Birth</mat-label>
            <input matInput formControlName="date_of_birth" type="date" />
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Gender</mat-label>
            <mat-select formControlName="gender">
              <mat-option value="">Prefer not to say</mat-option>
              <mat-option value="male">Male</mat-option>
              <mat-option value="female">Female</mat-option>
              <mat-option value="other">Other</mat-option>
            </mat-select>
          </mat-form-field>

          <div class="form-actions">
            <button mat-button type="button" (click)="goBack()">Cancel</button>
            <button mat-raised-button color="primary" type="submit" [disabled]="form.invalid || saving()">
              {{ saving() ? 'Saving…' : 'Save Changes' }}
            </button>
          </div>
        </form>
      }
    </div>
  `,
  styles: [`
    .edit-page { min-height: 100vh; background: #f7fafc; }
    .edit-header {
      background: linear-gradient(135deg, #00796b, #004d40); color: #fff;
      padding: 1.25rem 1.5rem; display: flex; align-items: center; gap: 1rem;
      h1 { margin: 0; font-size: 1.2rem; font-weight: 700; }
    }
    .back-btn {
      background: rgba(255,255,255,.15); border: none; color: #fff;
      border-radius: 8px; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;
      cursor: pointer; flex-shrink: 0;
      mat-icon { font-size: 1.2rem; width: 1.2rem; height: 1.2rem; }
      &:hover { background: rgba(255,255,255,.25); }
    }
    .edit-form {
      max-width: 500px; margin: 1.5rem auto; padding: 0 1.25rem 3rem;
      display: flex; flex-direction: column; gap: 1rem;
    }
    .avatar-row {
      display: flex; align-items: center; gap: 1rem; padding: 1rem;
      background: #fff; border-radius: 12px; border: 1px solid #e2e8f0; margin-bottom: .5rem;
    }
    .avatar {
      width: 52px; height: 52px; border-radius: 50%; background: #00796b; color: #fff;
      display: flex; align-items: center; justify-content: center;
      font-size: 1.1rem; font-weight: 700; flex-shrink: 0;
    }
    .phone-display {
      display: flex; align-items: center; gap: .4rem; font-size: .9rem; font-weight: 600; color: #2d3748; flex-wrap: wrap;
      mat-icon { font-size: 1rem; width: 1rem; height: 1rem; color: #00796b; }
    }
    .phone-note { font-size: .72rem; color: #a0aec0; font-weight: 400; width: 100%; margin-top: .1rem; }
    mat-form-field { width: 100%; }
    .form-actions { display: flex; gap: .75rem; justify-content: flex-end; padding-top: .5rem; }
  `],
})
export class ProfileEditComponent implements OnInit {
  loading = signal(true);
  saving = signal(false);
  loadError = signal<string | null>(null);
  phone = signal('');
  initials = signal('U');

  form = this.fb.group({
    name:          ['', Validators.required],
    email:         ['', Validators.email],
    date_of_birth: [''],
    gender:        [''],
  });

  constructor(
    private fb: FormBuilder,
    private userApi: UserApiService,
    private authState: AuthStateService,
    private router: Router,
    private snack: MatSnackBar,
  ) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.userApi.getProfile().subscribe({
      next: (user) => {
        this.phone.set(user.phone ?? '');
        const name = user.name ?? '';
        this.initials.set(name ? name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2) : 'U');
        this.form.patchValue({
          name:          user.name ?? '',
          email:         user.email ?? '',
          date_of_birth: user.date_of_birth ?? '',
          gender:        user.gender ?? '',
        });
        this.loading.set(false);
      },
      error: () => { this.loadError.set('Failed to load profile.'); this.loading.set(false); },
    });
  }

  save(): void {
    if (this.form.invalid) return;
    this.saving.set(true);
    this.userApi.updateProfile(this.form.value as object).subscribe({
      next: (updated) => {
        this.saving.set(false);
        this.authState.setUser({
          id:    this.authState.currentUser()?.id ?? '',
          name:  updated.name,
          role:  (updated.role as 'user' | 'admin' | 'technician'),
          phone: updated.phone,
          email: updated.email,
        });
        this.snack.open('Profile updated successfully.', 'OK', { duration: 3000 });
        this.router.navigate(['/profile']);
      },
      error: () => { this.snack.open('Failed to update profile.', 'OK', { duration: 3000 }); this.saving.set(false); },
    });
  }

  goBack(): void { this.router.navigate(['/profile']); }
}
