import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { UserApiService } from '../../../core/api/services/user-api.service';
import { FamilyMember } from '../../../core/api/api.types';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner.component';
import { ErrorBannerComponent } from '../../../shared/components/error-banner.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state.component';

const MAX_MEMBERS = 10;

const RELATIONSHIP_OPTIONS = ['Father', 'Mother', 'Child', 'Spouse', 'Sibling', 'Grandparent', 'Grandchild', 'Other'];

@Component({
  selector: 'app-family-members',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatButtonModule, MatFormFieldModule, MatInputModule, MatCardModule,
    MatSelectModule, MatSnackBarModule, MatIconModule,
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
          <!-- Read-only view -->
          <ng-container *ngIf="editingId() !== m.id">
            <mat-card-content>
              <strong>{{ m.name }}</strong> — {{ m.relationship }}
              <span *ngIf="m.date_of_birth"> | DOB: {{ m.date_of_birth }}</span>
            </mat-card-content>
            <mat-card-actions>
              <button mat-button color="primary" (click)="startEdit(m)">
                <mat-icon>edit</mat-icon> Edit
              </button>
              <button mat-button color="warn" (click)="remove(m.id)">
                <mat-icon>delete</mat-icon> Remove
              </button>
            </mat-card-actions>
          </ng-container>

          <!-- Inline edit form -->
          <ng-container *ngIf="editingId() === m.id">
            <mat-card-content>
              <form [formGroup]="editForm" class="edit-form">
                <mat-form-field appearance="outline">
                  <mat-label>Name</mat-label>
                  <input matInput formControlName="name" />
                  <mat-error *ngIf="editForm.get('name')?.hasError('required')">Name is required</mat-error>
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Relationship</mat-label>
                  <mat-select formControlName="relationship">
                    <mat-option *ngFor="let r of relationshipOptions" [value]="r">{{ r }}</mat-option>
                  </mat-select>
                  <mat-error *ngIf="editForm.get('relationship')?.hasError('required')">Relationship is required</mat-error>
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Date of Birth</mat-label>
                  <input matInput formControlName="date_of_birth" type="date" />
                </mat-form-field>
              </form>
            </mat-card-content>
            <mat-card-actions>
              <button mat-raised-button color="primary" (click)="saveEdit(m.id)" [disabled]="editForm.invalid">Save</button>
              <button mat-button (click)="cancelEdit()">Cancel</button>
            </mat-card-actions>
          </ng-container>
        </mat-card>

        <div *ngIf="members().length >= MAX_MEMBERS" class="limit-msg">
          Maximum of {{ MAX_MEMBERS }} family members reached.
        </div>

        <form [formGroup]="form" (ngSubmit)="add()" *ngIf="members().length < MAX_MEMBERS" class="add-form">
          <h3>Add Member</h3>
          <mat-form-field appearance="outline">
            <mat-label>Name</mat-label>
            <input matInput formControlName="name" />
            <mat-error *ngIf="form.get('name')?.hasError('required')">Name is required</mat-error>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Relationship</mat-label>
            <mat-select formControlName="relationship">
              <mat-option *ngFor="let r of relationshipOptions" [value]="r">{{ r }}</mat-option>
            </mat-select>
            <mat-error *ngIf="form.get('relationship')?.hasError('required')">Relationship is required</mat-error>
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
    .add-form, .edit-form { display: flex; flex-direction: column; gap: 1rem; margin-top: 1rem; }
    mat-form-field { width: 100%; }
    .limit-msg { color: #f44336; font-size: 0.9rem; }
  `],
})
export class FamilyMembersComponent implements OnInit {
  members = signal<FamilyMember[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  editingId = signal<string | null>(null);
  MAX_MEMBERS = MAX_MEMBERS;
  relationshipOptions = RELATIONSHIP_OPTIONS;

  form = this.fb.group({
    name: ['', Validators.required],
    relationship: ['', Validators.required],
    date_of_birth: [''],
    gender: [''],
  });

  editForm = this.fb.group({
    name: ['', Validators.required],
    relationship: ['', Validators.required],
    date_of_birth: [''],
    gender: [''],
  });

  constructor(private fb: FormBuilder, private userApi: UserApiService, private snackBar: MatSnackBar) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.userApi.getFamilyMembers().subscribe({
      next: (m: FamilyMember[]) => { this.members.set(m); this.loading.set(false); },
      error: () => { this.error.set('Failed to load family members.'); this.loading.set(false); },
    });
  }

  add(): void {
    if (this.form.invalid) return;
    this.userApi.addFamilyMember(this.form.value as Partial<FamilyMember>).subscribe({
      next: (m: FamilyMember) => {
        this.members.update((list: FamilyMember[]) => [...list, m]);
        this.form.reset();
        this.snackBar.open('Member added.', 'OK', { duration: 3000 });
      },
      error: () => { this.snackBar.open('Failed to add member.', 'OK', { duration: 3000 }); },
    });
  }

  remove(id: string): void {
    const confirmed = window.confirm('Remove this family member?');
    if (!confirmed) return;
    this.userApi.deleteFamilyMember(id).subscribe({
      next: () => {
        this.members.update((list: FamilyMember[]) => list.filter((m: FamilyMember) => m.id !== id));
        this.snackBar.open('Member removed.', 'OK', { duration: 3000 });
      },
      error: () => { this.snackBar.open('Failed to remove member.', 'OK', { duration: 3000 }); },
    });
  }

  startEdit(member: FamilyMember): void {
    this.editingId.set(member.id);
    this.editForm.setValue({
      name: member.name,
      relationship: member.relationship,
      date_of_birth: member.date_of_birth ?? '',
      gender: member.gender ?? '',
    });
  }

  cancelEdit(): void {
    this.editingId.set(null);
    this.editForm.reset();
  }

  saveEdit(id: string): void {
    if (this.editForm.invalid) return;
    this.userApi.updateFamilyMember(id, this.editForm.value as Partial<FamilyMember>).subscribe({
      next: (updated: FamilyMember) => {
        this.members.update((list: FamilyMember[]) => list.map((m: FamilyMember) => m.id === id ? updated : m));
        this.editingId.set(null);
        this.snackBar.open('Member updated.', 'OK', { duration: 3000 });
      },
      error: () => { this.snackBar.open('Failed to update member.', 'OK', { duration: 3000 }); },
    });
  }
}
