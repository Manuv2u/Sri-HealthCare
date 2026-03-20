import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCardModule } from '@angular/material/card';
import { UserApiService } from '../../../core/api/services/user-api.service';
import { FamilyMember } from '../../../core/api/api.types';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner.component';
import { ErrorBannerComponent } from '../../../shared/components/error-banner.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state.component';

const MAX_MEMBERS = 10;

@Component({
  selector: 'app-family-members',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatButtonModule, MatFormFieldModule, MatInputModule, MatCardModule,
    LoadingSpinnerComponent, ErrorBannerComponent, EmptyStateComponent,
  ],
  template: `
    <div class="container">
      <h2>Family Members</h2>
      <app-loading-spinner *ngIf="loading()" />
      <app-error-banner *ngIf="error()" [message]="error()!" [retryLabel]="'Retry'" (retry)="load()" />

      <div *ngIf="!loading()">
        <app-empty-state *ngIf="members().length === 0" message="No family members added yet." />

        <mat-card *ngFor="let m of members()" class="member-card">
          <mat-card-content>
            <strong>{{ m.name }}</strong> — {{ m.relationship }}
            <span *ngIf="m.date_of_birth"> | DOB: {{ m.date_of_birth }}</span>
          </mat-card-content>
          <mat-card-actions>
            <button mat-button color="warn" (click)="remove(m.id)">Remove</button>
          </mat-card-actions>
        </mat-card>

        <div *ngIf="members().length >= MAX_MEMBERS" class="limit-msg">
          Maximum of {{ MAX_MEMBERS }} family members reached.
        </div>

        <form [formGroup]="form" (ngSubmit)="add()" *ngIf="members().length < MAX_MEMBERS" class="add-form">
          <h3>Add Member</h3>
          <mat-form-field appearance="outline">
            <mat-label>Name</mat-label>
            <input matInput formControlName="name" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Relationship</mat-label>
            <input matInput formControlName="relationship" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Date of Birth</mat-label>
            <input matInput formControlName="date_of_birth" type="date" />
          </mat-form-field>
          <button mat-raised-button color="primary" type="submit" [disabled]="form.invalid">Add</button>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .container { max-width: 600px; margin: 2rem auto; padding: 1rem; display: flex; flex-direction: column; gap: 1rem; }
    .member-card { margin-bottom: 0.5rem; }
    .add-form { display: flex; flex-direction: column; gap: 1rem; margin-top: 1rem; }
    mat-form-field { width: 100%; }
    .limit-msg { color: #f44336; font-size: 0.9rem; }
  `],
})
export class FamilyMembersComponent implements OnInit {
  members = signal<FamilyMember[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  MAX_MEMBERS = MAX_MEMBERS;

  form = this.fb.group({
    name: ['', Validators.required],
    relationship: ['', Validators.required],
    date_of_birth: [''],
    gender: [''],
  });

  constructor(private fb: FormBuilder, private userApi: UserApiService) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.userApi.getFamilyMembers().subscribe({
      next: (m) => { this.members.set(m); this.loading.set(false); },
      error: () => { this.error.set('Failed to load family members.'); this.loading.set(false); },
    });
  }

  add(): void {
    if (this.form.invalid) return;
    this.userApi.addFamilyMember(this.form.value as Partial<FamilyMember>).subscribe({
      next: (m) => { this.members.update((list) => [...list, m]); this.form.reset(); },
      error: () => { this.error.set('Failed to add family member.'); },
    });
  }

  remove(id: string): void {
    this.userApi.deleteFamilyMember(id).subscribe({
      next: () => { this.members.update((list) => list.filter((m) => m.id !== id)); },
      error: () => { this.error.set('Failed to remove family member.'); },
    });
  }
}
