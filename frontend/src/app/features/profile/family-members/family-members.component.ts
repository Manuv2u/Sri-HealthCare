import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Location } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { UserApiService } from '../../../core/api/services/user-api.service';
import { FamilyMember } from '../../../core/api/api.types';

const MAX_MEMBERS = 10;
const RELATIONSHIPS = ['Father', 'Mother', 'Child', 'Spouse', 'Sibling', 'Grandparent', 'Grandchild', 'Other'];
const GENDERS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
];

const AVATAR_COLORS = [
  '#1a237e', '#00796b', '#e65100', '#6a1b9a', '#1565c0', '#2e7d32',
];

@Component({
  selector: 'app-family-members',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatButtonModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatSnackBarModule, MatIconModule,
  ],
  template: `
    <div class="page">
      <!-- Header -->
      <div class="page-header">
        <button class="back-btn" (click)="goBack()" aria-label="Go back">
          <mat-icon>arrow_back</mat-icon>
        </button>
        <div>
          <h1 class="page-title">Family Members</h1>
          <p class="page-sub">Manage who you can book tests for</p>
        </div>
      </div>

      <!-- Loading -->
      @if (loading()) {
        <div class="center-state">
          <div class="spinner"></div>
          <span>Loading members…</span>
        </div>
      } @else if (loadError()) {
        <div class="center-state error">
          <mat-icon>error_outline</mat-icon>
          <p>{{ loadError() }}</p>
          <button mat-stroked-button (click)="load()">Retry</button>
        </div>
      } @else {

        <!-- Member count / limit -->
        <div class="count-bar">
          <span class="count-text">
            <mat-icon>people</mat-icon>
            {{ activeMembers().length }} member{{ activeMembers().length !== 1 ? 's' : '' }}
            <span class="count-limit">/ {{ MAX_MEMBERS }} max</span>
          </span>
          @if (activeMembers().length < MAX_MEMBERS && !showAddForm()) {
            <button mat-flat-button color="primary" class="add-btn" (click)="showAddForm.set(true)">
              <mat-icon>person_add</mat-icon> Add Member
            </button>
          }
        </div>

        <!-- Members list -->
        @if (activeMembers().length === 0 && !showAddForm()) {
          <div class="empty-state">
            <div class="empty-icon-wrap"><mat-icon>group_add</mat-icon></div>
            <h3>No family members yet</h3>
            <p>Add family members to book tests on their behalf</p>
            <button mat-flat-button color="primary" (click)="showAddForm.set(true)">
              <mat-icon>person_add</mat-icon> Add First Member
            </button>
          </div>
        } @else {
          <div class="members-list">
            @for (m of activeMembers(); track m.id; let i = $index) {
              <div class="member-card" [class.editing]="editingId() === m.id">
                @if (editingId() !== m.id) {
                  <!-- View mode -->
                  <div class="member-view">
                    <div class="member-avatar" [style.background]="avatarColor(i)">
                      {{ initials(m.name) }}
                    </div>
                    <div class="member-info">
                      <div class="member-name">{{ m.name }}</div>
                      <div class="member-meta">
                        <span class="rel-badge">{{ m.relationship }}</span>
                        @if (m.gender) { <span class="meta-chip">{{ m.gender | titlecase }}</span> }
                        @if (m.date_of_birth) { <span class="meta-chip">{{ age(m.date_of_birth) }} yrs</span> }
                      </div>
                    </div>
                    <div class="member-actions">
                      <button mat-icon-button (click)="startEdit(m)" aria-label="Edit">
                        <mat-icon>edit</mat-icon>
                      </button>
                      <button mat-icon-button class="delete-btn" (click)="remove(m.id)" aria-label="Remove">
                        <mat-icon>delete_outline</mat-icon>
                      </button>
                    </div>
                  </div>
                } @else {
                  <!-- Edit mode inline -->
                  <div class="edit-header">
                    <span class="edit-label">Editing — {{ m.name }}</span>
                    <button mat-icon-button (click)="cancelEdit()" aria-label="Cancel"><mat-icon>close</mat-icon></button>
                  </div>
                  <form [formGroup]="editForm" (ngSubmit)="saveEdit(m.id)" class="member-form">
                    <div class="form-row-2">
                      <mat-form-field appearance="outline">
                        <mat-label>Full Name</mat-label>
                        <input matInput formControlName="name" required />
                        <mat-error>Name is required</mat-error>
                      </mat-form-field>
                      <mat-form-field appearance="outline">
                        <mat-label>Relationship</mat-label>
                        <mat-select formControlName="relationship" required>
                          @for (r of relationships; track r) {
                            <mat-option [value]="r">{{ r }}</mat-option>
                          }
                        </mat-select>
                        <mat-error>Relationship is required</mat-error>
                      </mat-form-field>
                    </div>
                    <div class="form-row-2">
                      <mat-form-field appearance="outline">
                        <mat-label>Date of Birth</mat-label>
                        <input matInput formControlName="date_of_birth" type="date" />
                      </mat-form-field>
                      <mat-form-field appearance="outline">
                        <mat-label>Gender</mat-label>
                        <mat-select formControlName="gender">
                          <mat-option value="">Prefer not to say</mat-option>
                          @for (g of genders; track g.value) {
                            <mat-option [value]="g.value">{{ g.label }}</mat-option>
                          }
                        </mat-select>
                      </mat-form-field>
                    </div>
                    <div class="form-actions">
                      <button mat-stroked-button type="button" (click)="cancelEdit()">Cancel</button>
                      <button mat-flat-button color="primary" type="submit" [disabled]="editForm.invalid || saving()">
                        {{ saving() ? 'Saving…' : 'Save Changes' }}
                      </button>
                    </div>
                  </form>
                }
              </div>
            }
          </div>
        }

        <!-- Add new member form -->
        @if (showAddForm()) {
          <div class="add-card">
            <div class="add-card-header">
              <mat-icon class="add-card-icon">person_add</mat-icon>
              <span>Add New Member</span>
              <button mat-icon-button (click)="cancelAdd()" class="close-add-btn" aria-label="Cancel">
                <mat-icon>close</mat-icon>
              </button>
            </div>
            <form [formGroup]="addForm" (ngSubmit)="add()" class="member-form">
              <div class="form-row-2">
                <mat-form-field appearance="outline">
                  <mat-label>Full Name</mat-label>
                  <input matInput formControlName="name" required placeholder="e.g. Ravi Kumar" />
                  <mat-error>Name is required</mat-error>
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Relationship</mat-label>
                  <mat-select formControlName="relationship" required>
                    @for (r of relationships; track r) {
                      <mat-option [value]="r">{{ r }}</mat-option>
                    }
                  </mat-select>
                  <mat-error>Please select a relationship</mat-error>
                </mat-form-field>
              </div>
              <div class="form-row-2">
                <mat-form-field appearance="outline">
                  <mat-label>Date of Birth</mat-label>
                  <input matInput formControlName="date_of_birth" type="date" />
                  <mat-hint>Optional</mat-hint>
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Gender</mat-label>
                  <mat-select formControlName="gender">
                    <mat-option value="">Prefer not to say</mat-option>
                    @for (g of genders; track g.value) {
                      <mat-option [value]="g.value">{{ g.label }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>
              </div>
              <div class="form-actions">
                <button mat-stroked-button type="button" (click)="cancelAdd()">Cancel</button>
                <button mat-flat-button color="primary" type="submit" [disabled]="addForm.invalid || saving()">
                  <mat-icon>person_add</mat-icon>
                  {{ saving() ? 'Adding…' : 'Add Member' }}
                </button>
              </div>
            </form>
          </div>
        }

        @if (activeMembers().length >= MAX_MEMBERS) {
          <div class="limit-notice">
            <mat-icon>info</mat-icon>
            Maximum of {{ MAX_MEMBERS }} family members reached.
          </div>
        }
      }
    </div>
  `,
  styles: [`
    .page {
      min-height: 100vh; background: #f7fafc;
      padding-bottom: 3rem;
    }

    /* ── Header ── */
    .page-header {
      background: linear-gradient(135deg, #00796b, #004d40);
      color: #fff; padding: 1.25rem 1.5rem;
      display: flex; align-items: center; gap: 1rem;
    }
    .back-btn {
      background: rgba(255,255,255,.15); border: none; border-radius: 8px;
      width: 38px; height: 38px; display: flex; align-items: center; justify-content: center;
      cursor: pointer; color: #fff; text-decoration: none; flex-shrink: 0;
      mat-icon { font-size: 1.2rem; width: 1.2rem; height: 1.2rem; }
      &:hover { background: rgba(255,255,255,.25); }
    }
    .page-title { margin: 0 0 .15rem; font-size: 1.2rem; font-weight: 700; }
    .page-sub { margin: 0; font-size: .8rem; opacity: .8; }

    /* ── States ── */
    .center-state {
      display: flex; flex-direction: column; align-items: center; gap: .75rem;
      padding: 3rem 1.5rem; text-align: center; color: #718096;
      mat-icon { font-size: 2.5rem; width: 2.5rem; height: 2.5rem; color: #cbd5e0; }
      &.error mat-icon { color: #fc8181; }
    }
    .spinner {
      width: 36px; height: 36px; border: 3px solid #e2e8f0;
      border-top-color: #00796b; border-radius: 50%; animation: spin 1s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* ── Count bar ── */
    .count-bar {
      display: flex; align-items: center; justify-content: space-between;
      padding: 1rem 1.5rem; background: #fff;
      border-bottom: 1px solid #e2e8f0;
    }
    .count-text {
      display: flex; align-items: center; gap: .4rem;
      font-size: .9rem; font-weight: 600; color: #2d3748;
      mat-icon { font-size: 1.1rem; width: 1.1rem; height: 1.1rem; color: #00796b; }
    }
    .count-limit { color: #a0aec0; font-weight: 400; font-size: .8rem; }
    .add-btn { display: flex; align-items: center; gap: .35rem; font-size: .85rem; }

    /* ── Empty state ── */
    .empty-state {
      display: flex; flex-direction: column; align-items: center; gap: 1rem;
      padding: 3.5rem 1.5rem; text-align: center;
      h3 { margin: 0; font-size: 1.1rem; font-weight: 700; color: #2d3748; }
      p { margin: 0; color: #718096; font-size: .875rem; }
    }
    .empty-icon-wrap {
      width: 72px; height: 72px; border-radius: 50%; background: #e0f2f1;
      display: flex; align-items: center; justify-content: center;
      mat-icon { font-size: 2rem; width: 2rem; height: 2rem; color: #00796b; }
    }

    /* ── Members list ── */
    .members-list {
      padding: 1rem 1.5rem; display: flex; flex-direction: column; gap: .75rem;
      max-width: 680px;
    }
    .member-card {
      background: #fff; border-radius: 12px; border: 1.5px solid #e2e8f0;
      overflow: hidden; transition: box-shadow .15s;
      &:hover { box-shadow: 0 2px 12px rgba(0,0,0,.08); }
      &.editing { border-color: #00796b; }
    }

    /* View mode */
    .member-view {
      display: flex; align-items: center; gap: 1rem; padding: 1rem 1.25rem;
    }
    .member-avatar {
      width: 46px; height: 46px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      color: #fff; font-weight: 700; font-size: 1rem; flex-shrink: 0;
    }
    .member-info { flex: 1; min-width: 0; }
    .member-name { font-size: .95rem; font-weight: 700; color: #1a202c; }
    .member-meta { display: flex; gap: .4rem; flex-wrap: wrap; margin-top: .3rem; }
    .rel-badge {
      font-size: .72rem; font-weight: 700; padding: .2rem .55rem; border-radius: 10px;
      background: #e0f2f1; color: #00796b; text-transform: uppercase; letter-spacing: .04em;
    }
    .meta-chip {
      font-size: .72rem; padding: .2rem .55rem; border-radius: 10px;
      background: #f7fafc; color: #718096; border: 1px solid #e2e8f0;
    }
    .member-actions {
      display: flex; gap: .25rem; flex-shrink: 0;
      button { color: #718096; }
    }
    .delete-btn { &:hover { color: #e53e3e !important; } }

    /* Edit mode */
    .edit-header {
      display: flex; align-items: center; padding: .75rem 1.25rem;
      background: #f0fdf9; border-bottom: 1px solid #b2dfdb;
      .edit-label { flex: 1; font-size: .875rem; font-weight: 600; color: #00796b; }
    }

    /* Add card */
    .add-card {
      margin: .75rem 1.5rem 0; max-width: 640px;
      background: #fff; border-radius: 12px; border: 2px solid #00796b;
      overflow: hidden;
    }
    .add-card-header {
      display: flex; align-items: center; gap: .6rem; padding: .875rem 1.25rem;
      background: #e0f2f1; border-bottom: 1px solid #b2dfdb;
      mat-icon { color: #00796b; font-size: 1.2rem; width: 1.2rem; height: 1.2rem; }
      span { flex: 1; font-size: .9rem; font-weight: 700; color: #00796b; }
    }
    .close-add-btn { color: #00796b; }

    /* Shared form styles */
    .member-form { padding: 1.25rem; display: flex; flex-direction: column; gap: .85rem; }
    .form-row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    mat-form-field { width: 100%; }
    .form-actions {
      display: flex; justify-content: flex-end; gap: .75rem; padding-top: .25rem;
    }

    /* Limit notice */
    .limit-notice {
      display: flex; align-items: center; gap: .5rem; margin: 1rem 1.5rem;
      padding: .75rem 1rem; background: #fff8e1; border-radius: 8px;
      font-size: .85rem; color: #78350f; border-left: 3px solid #f59e0b;
      mat-icon { font-size: 1rem; width: 1rem; height: 1rem; color: #f59e0b; flex-shrink: 0; }
    }

    @media (max-width: 600px) {
      .members-list { padding: .75rem 1rem; }
      .add-card { margin: .75rem 1rem 0; }
      .form-row-2 { grid-template-columns: 1fr; }
      .count-bar { padding: .75rem 1rem; }
    }
  `],
})
export class FamilyMembersComponent implements OnInit {
  members = signal<FamilyMember[]>([]);
  loading = signal(true);
  loadError = signal<string | null>(null);
  saving = signal(false);
  editingId = signal<string | null>(null);
  showAddForm = signal(false);

  MAX_MEMBERS = MAX_MEMBERS;
  relationships = RELATIONSHIPS;
  genders = GENDERS;

  activeMembers = computed(() =>
    this.members().filter((m: FamilyMember) => m.is_active && !m.deleted_at)
  );

  addForm = this.fb.group({
    name:          ['', Validators.required],
    relationship:  ['', Validators.required],
    date_of_birth: [''],
    gender:        [''],
  });

  editForm = this.fb.group({
    name:          ['', Validators.required],
    relationship:  ['', Validators.required],
    date_of_birth: [''],
    gender:        [''],
  });

  constructor(
    private fb: FormBuilder,
    private userApi: UserApiService,
    private snack: MatSnackBar,
    private location: Location,
  ) {}

  goBack(): void { this.location.back(); }

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.userApi.getFamilyMembers().subscribe({
      next: (list: FamilyMember[]) => { this.members.set(list); this.loading.set(false); },
      error: () => { this.loadError.set('Failed to load family members. Please try again.'); this.loading.set(false); },
    });
  }

  initials(name: string): string {
    return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
  }

  avatarColor(index: number): string {
    return AVATAR_COLORS[index % AVATAR_COLORS.length];
  }

  age(dob: string): number {
    const diff = Date.now() - new Date(dob).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
  }

  add(): void {
    if (this.addForm.invalid) return;
    this.saving.set(true);
    this.userApi.addFamilyMember(this.addForm.value as Partial<FamilyMember>).subscribe({
      next: (m: FamilyMember) => {
        this.members.update((list: FamilyMember[]) => [...list, m]);
        this.addForm.reset();
        this.showAddForm.set(false);
        this.saving.set(false);
        this.snack.open('Family member added successfully.', 'OK', { duration: 3000 });
      },
      error: () => {
        this.snack.open('Failed to add member. Please try again.', 'OK', { duration: 3000 });
        this.saving.set(false);
      },
    });
  }

  cancelAdd(): void {
    this.addForm.reset();
    this.showAddForm.set(false);
  }

  startEdit(m: FamilyMember): void {
    this.editingId.set(m.id);
    this.editForm.setValue({
      name:          m.name,
      relationship:  m.relationship,
      date_of_birth: m.date_of_birth ?? '',
      gender:        m.gender ?? '',
    });
  }

  cancelEdit(): void {
    this.editingId.set(null);
    this.editForm.reset();
  }

  saveEdit(id: string): void {
    if (this.editForm.invalid) return;
    this.saving.set(true);
    this.userApi.updateFamilyMember(id, this.editForm.value as Partial<FamilyMember>).subscribe({
      next: (updated: FamilyMember) => {
        this.members.update((list: FamilyMember[]) => list.map((m: FamilyMember) => (m.id === id ? updated : m)));
        this.editingId.set(null);
        this.saving.set(false);
        this.snack.open('Member updated successfully.', 'OK', { duration: 3000 });
      },
      error: () => {
        this.snack.open('Failed to update member.', 'OK', { duration: 3000 });
        this.saving.set(false);
      },
    });
  }

  remove(id: string): void {
    if (!confirm('Remove this family member?')) return;
    this.userApi.deleteFamilyMember(id).subscribe({
      next: () => {
        this.members.update((list: FamilyMember[]) => list.filter((m: FamilyMember) => m.id !== id));
        this.snack.open('Member removed.', 'OK', { duration: 3000 });
      },
      error: () => this.snack.open('Failed to remove member.', 'OK', { duration: 3000 }),
    });
  }
}
