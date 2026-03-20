import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { UserApiService } from '../../../core/api/services/user-api.service';
import { User } from '../../../core/api/api.types';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner.component';
import { ErrorBannerComponent } from '../../../shared/components/error-banner.component';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatFormFieldModule, MatInputModule, MatButtonModule, MatSelectModule,
    LoadingSpinnerComponent, ErrorBannerComponent,
  ],
  template: `
    <div class="profile-container">
      <h2>My Profile</h2>
      <app-loading-spinner *ngIf="loading()" />
      <app-error-banner *ngIf="error()" [message]="error()!" [retryLabel]="'Retry'" (retry)="load()" />

      <form [formGroup]="form" (ngSubmit)="save()" *ngIf="!loading() && !error()">
        <mat-form-field appearance="outline">
          <mat-label>Full Name</mat-label>
          <input matInput formControlName="name" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Email</mat-label>
          <input matInput formControlName="email" type="email" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Date of Birth</mat-label>
          <input matInput formControlName="date_of_birth" type="date" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Gender</mat-label>
          <mat-select formControlName="gender">
            <mat-option value="male">Male</mat-option>
            <mat-option value="female">Female</mat-option>
            <mat-option value="other">Other</mat-option>
          </mat-select>
        </mat-form-field>
        <button mat-raised-button color="primary" type="submit" [disabled]="saving()">
          {{ saving() ? 'Saving...' : 'Save Changes' }}
        </button>
        <p *ngIf="saved()" class="success">Profile updated successfully.</p>
      </form>
    </div>
  `,
  styles: [`
    .profile-container { max-width: 500px; margin: 2rem auto; padding: 1rem; display: flex; flex-direction: column; gap: 1rem; }
    form { display: flex; flex-direction: column; gap: 1rem; }
    mat-form-field { width: 100%; }
    .success { color: green; }
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
      next: (user) => {
        this.form.patchValue(user);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load profile.');
        this.loading.set(false);
      },
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
