import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { UserApiService } from '../../../core/api/services/user-api.service';
import { User } from '../../../core/api/api.types';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner.component';
import { ErrorBannerComponent } from '../../../shared/components/error-banner.component';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatFormFieldModule, MatInputModule, MatButtonModule, MatSelectModule, MatIconModule,
    LoadingSpinnerComponent, ErrorBannerComponent,
  ],
  template: `
    <div class="page-container" style="max-width:600px">
      <div class="page-header">
        <h1>My Profile</h1>
        <p>Manage your personal information</p>
      </div>

      <app-loading-spinner *ngIf="loading()" />
      <app-error-banner *ngIf="error()" [message]="error()!" [retryLabel]="'Retry'" (retry)="load()" />

      @if (!loading() && !error()) {
        <div class="form-container">
          <form [formGroup]="form" (ngSubmit)="save()">
            <mat-form-field appearance="outline">
              <mat-label>Full Name</mat-label>
              <mat-icon matPrefix>person</mat-icon>
              <input matInput formControlName="name" />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Email</mat-label>
              <mat-icon matPrefix>email</mat-icon>
              <input matInput formControlName="email" type="email" />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Date of Birth</mat-label>
              <mat-icon matPrefix>cake</mat-icon>
              <input matInput formControlName="date_of_birth" type="date" />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Gender</mat-label>
              <mat-icon matPrefix>wc</mat-icon>
              <mat-select formControlName="gender">
                <mat-option value="male">Male</mat-option>
                <mat-option value="female">Female</mat-option>
                <mat-option value="other">Other</mat-option>
              </mat-select>
            </mat-form-field>

            @if (saved()) {
              <div class="alert-success">
                <mat-icon>check_circle</mat-icon>
                Profile updated successfully.
              </div>
            }

            <button mat-flat-button color="primary" type="submit" [disabled]="saving()" class="save-btn">
              {{ saving() ? 'Saving…' : 'Save Changes' }}
            </button>
          </form>
        </div>
      }
    </div>
  `,
  styles: [`
    .alert-success {
      display: flex; align-items: center; gap: .5rem;
      padding: .75rem 1rem; border-radius: 8px; font-size: .875rem;
      background: #c6f6d5; color: #276749;
    }
    .save-btn { height: 44px; font-size: 1rem; font-weight: 600; }
  `],
})
export class ProfileComponent implements OnInit {
  form = this.fb.group({
    name: [''],
    email: [''],
    date_of_birth: [''],
    gender: [''],
  });
  loading = signal(true);
  error = signal<string | null>(null);
  saving = signal(false);
  saved = signal(false);

  constructor(private fb: FormBuilder, private userApi: UserApiService) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.userApi.getProfile().subscribe({
      next: (user) => { this.form.patchValue(user); this.loading.set(false); },
      error: () => { this.error.set('Failed to load profile.'); this.loading.set(false); },
    });
  }

  save(): void {
    this.saving.set(true);
    this.saved.set(false);
    this.userApi.updateProfile(this.form.value as Partial<User>).subscribe({
      next: () => { this.saving.set(false); this.saved.set(true); },
      error: () => { this.saving.set(false); },
    });
  }
}
