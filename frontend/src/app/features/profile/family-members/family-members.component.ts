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
  ['#6366F1', '#4F46E5'],
  ['#F97316', '#EA580C'],
  ['#22C55E', '#16A34A'],
  ['#0EA5E9', '#0284C7'],
  ['#A855F7', '#9333EA'],
  ['#F59E0B', '#D97706'],
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
        <div class="header-text">
          <h1>Family Members</h1>
          <p>Book tests on behalf of your loved ones</p>
        </div>
      </div>

      <!-- Loading -->
      @if (loading()) {
        <div class="state-center">
          <div class="spinner"></div>
          <span>Loading members…</span>
        </div>
      } @else if (loadError()) {
        <div class="state-center state-error">
          <div class="state-icon-wrap error-icon-wrap">
            <mat-icon>error_outline</mat-icon>
          </div>
          <p>{{ loadError() }}</p>
          <button class="btn-retry" (click)="load()">Try Again</button>
        </div>
      } @else {

        <!-- Count bar -->
        <div class="count-bar">
          <div class="count-info">
            <span class="count-num">{{ activeMembers().length }}</span>
            <span class="count-label">
              {{ activeMembers().length === 1 ? 'member' : 'members' }}
              <span class="count-max">of {{ MAX_MEMBERS }}</span>
            </span>
          </div>
          @if (activeMembers().length < MAX_MEMBERS && !showAddForm()) {
            <button class="btn-add" (click)="showAddForm.set(true)">
              <mat-icon>person_add</mat-icon>
              Add Member
            </button>
          }
        </div>

        <!-- Empty state -->
        @if (activeMembers().length === 0 && !showAddForm()) {
          <div class="empty-state">
            <div class="empty-icon-wrap">
              <mat-icon>group_add</mat-icon>
            </div>
            <h3>No family members yet</h3>
            <p>Add your family to book tests on their behalf — parents, spouse, children, and more.</p>
            <button class="btn-add-primary" (click)="showAddForm.set(true)">
              <mat-icon>person_add</mat-icon>
              Add First Member
            </button>
          </div>
        } @else {
          <div class="members-list">
            @for (m of activeMembers(); track m.id; let i = $index) {
              <div class="member-card" [class.is-editing]="editingId() === m.id">

                @if (editingId() !== m.id) {
                  <!-- View mode -->
                  <div class="member-view">
                    <div class="member-avatar" [style.background]="'linear-gradient(135deg, ' + avatarGradient(i)[0] + ', ' + avatarGradient(i)[1] + ')'">
                      {{ initials(m.name) }}
                    </div>
                    <div class="member-info">
                      <div class="member-name">{{ m.name }}</div>
                      <div class="member-chips">
                        <span class="chip chip-rel">{{ m.relationship }}</span>
                        @if (m.gender) {
                          <span class="chip chip-meta">{{ m.gender | titlecase }}</span>
                        }
                        @if (m.date_of_birth) {
                          <span class="chip chip-meta">{{ age(m.date_of_birth) }} yrs</span>
                        }
                      </div>
                    </div>
                    <div class="member-actions">
                      <button class="icon-btn" (click)="startEdit(m)" aria-label="Edit member">
                        <mat-icon>edit</mat-icon>
                      </button>
                      <button class="icon-btn icon-btn-danger" (click)="remove(m.id)" aria-label="Remove member">
                        <mat-icon>delete_outline</mat-icon>
                      </button>
                    </div>
                  </div>

                } @else {
                  <!-- Edit mode -->
                  <div class="inline-form-header">
                    <div class="inline-form-title">
                      <mat-icon>edit</mat-icon>
                      <span>Editing — {{ m.name }}</span>
                    </div>
                    <button class="icon-btn" (click)="cancelEdit()" aria-label="Cancel edit">
                      <mat-icon>close</mat-icon>
                    </button>
                  </div>
                  <form [formGroup]="editForm" (ngSubmit)="saveEdit(m.id)" class="member-form">
                    <div class="form-row-2">
                      <div class="field-group">
                        <label class="field-label">Full Name <span class="req">*</span></label>
                        <mat-form-field appearance="outline" class="field">
                          <input matInput formControlName="name" />
                          <mat-error>Name is required</mat-error>
                        </mat-form-field>
                      </div>
                      <div class="field-group">
                        <label class="field-label">Relationship <span class="req">*</span></label>
                        <mat-form-field appearance="outline" class="field">
                          <mat-select formControlName="relationship">
                            @for (r of relationships; track r) {
                              <mat-option [value]="r">{{ r }}</mat-option>
                            }
                          </mat-select>
                          <mat-error>Required</mat-error>
                        </mat-form-field>
                      </div>
                    </div>
                    <div class="form-row-2">
                      <div class="field-group">
                        <label class="field-label">Date of Birth</label>
                        <mat-form-field appearance="outline" class="field">
                          <input matInput formControlName="date_of_birth" type="date" />
                        </mat-form-field>
                      </div>
                      <div class="field-group">
                        <label class="field-label">Gender</label>
                        <mat-form-field appearance="outline" class="field">
                          <mat-select formControlName="gender">
                            <mat-option value="">Prefer not to say</mat-option>
                            @for (g of genders; track g.value) {
                              <mat-option [value]="g.value">{{ g.label }}</mat-option>
                            }
                          </mat-select>
                        </mat-form-field>
                      </div>
                    </div>
                    <div class="form-actions">
                      <button type="button" class="btn-ghost" (click)="cancelEdit()">Cancel</button>
                      <button type="submit" class="btn-save" [disabled]="editForm.invalid || saving()">
                        @if (saving()) { <span class="btn-spinner"></span> Saving… }
                        @else { <mat-icon>check</mat-icon> Save Changes }
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
              <div class="add-card-title">
                <div class="add-icon-wrap">
                  <mat-icon>person_add</mat-icon>
                </div>
                <span>Add New Member</span>
              </div>
              <button class="icon-btn" (click)="cancelAdd()" aria-label="Close form">
                <mat-icon>close</mat-icon>
              </button>
            </div>
            <form [formGroup]="addForm" (ngSubmit)="add()" class="member-form">
              <div class="form-row-2">
                <div class="field-group">
                  <label class="field-label">Full Name <span class="req">*</span></label>
                  <mat-form-field appearance="outline" class="field">
                    <input matInput formControlName="name" placeholder="e.g. Ravi Kumar" />
                    <mat-error>Name is required</mat-error>
                  </mat-form-field>
                </div>
                <div class="field-group">
                  <label class="field-label">Relationship <span class="req">*</span></label>
                  <mat-form-field appearance="outline" class="field">
                    <mat-select formControlName="relationship">
                      @for (r of relationships; track r) {
                        <mat-option [value]="r">{{ r }}</mat-option>
                      }
                    </mat-select>
                    <mat-error>Please select a relationship</mat-error>
                  </mat-form-field>
                </div>
              </div>
              <div class="form-row-2">
                <div class="field-group">
                  <label class="field-label">Date of Birth <span class="optional">(optional)</span></label>
                  <mat-form-field appearance="outline" class="field">
                    <input matInput formControlName="date_of_birth" type="date" />
                  </mat-form-field>
                </div>
                <div class="field-group">
                  <label class="field-label">Gender</label>
                  <mat-form-field appearance="outline" class="field">
                    <mat-select formControlName="gender">
                      <mat-option value="">Prefer not to say</mat-option>
                      @for (g of genders; track g.value) {
                        <mat-option [value]="g.value">{{ g.label }}</mat-option>
                      }
                    </mat-select>
                  </mat-form-field>
                </div>
              </div>
              <div class="form-actions">
                <button type="button" class="btn-ghost" (click)="cancelAdd()">Cancel</button>
                <button type="submit" class="btn-save" [disabled]="addForm.invalid || saving()">
                  @if (saving()) { <span class="btn-spinner"></span> Adding… }
                  @else { <mat-icon>person_add</mat-icon> Add Member }
                </button>
              </div>
            </form>
          </div>
        }

        <!-- Limit notice -->
        @if (activeMembers().length >= MAX_MEMBERS) {
          <div class="limit-notice">
            <mat-icon>info_outline</mat-icon>
            Maximum of {{ MAX_MEMBERS }} family members reached.
          </div>
        }

      }
    </div>
  `,
  styles: [`
    :host { display: block; }

    .page {
      min-height: 100vh;
      background: #F8F9FF;
      font-family: 'Inter', -apple-system, sans-serif;
      padding-bottom: 4rem;
    }

    /* ── Header ── */
    .page-header {
      background: linear-gradient(135deg, #6366F1 0%, #4F46E5 100%);
      color: #fff;
      padding: 1.25rem 1.5rem 1.5rem;
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    .back-btn {
      background: rgba(255,255,255,.15);
      border: none;
      color: #fff;
      border-radius: 10px;
      width: 38px;
      height: 38px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      flex-shrink: 0;
      transition: background .15s;
      mat-icon { font-size: 1.2rem; width: 1.2rem; height: 1.2rem; }
      &:hover { background: rgba(255,255,255,.25); }
    }
    .header-text {
      h1 { margin: 0 0 .15rem; font-size: 1.2rem; font-weight: 700; letter-spacing: -.01em; }
      p { margin: 0; font-size: .8rem; opacity: .75; }
    }

    /* ── States ── */
    .state-center {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: .85rem;
      padding: 4rem 1.5rem;
      text-align: center;
      color: #94A3B8;
      font-size: .9rem;
    }
    .state-error { color: #475569; }
    .state-icon-wrap {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      mat-icon { font-size: 1.8rem; width: 1.8rem; height: 1.8rem; }
    }
    .error-icon-wrap {
      background: #FEE2E2;
      mat-icon { color: #EF4444; }
    }
    .spinner {
      width: 36px;
      height: 36px;
      border: 3px solid #E2E8F0;
      border-top-color: #6366F1;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
    .btn-retry {
      padding: .5rem 1.25rem;
      border-radius: 999px;
      border: 1.5px solid #6366F1;
      background: #fff;
      color: #6366F1;
      font-size: .88rem;
      font-weight: 600;
      font-family: inherit;
      cursor: pointer;
      &:hover { background: #EEF2FF; }
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* ── Count bar ── */
    .count-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1rem 1.5rem;
      background: #fff;
      border-bottom: 1px solid #E2E8F0;
    }
    .count-info {
      display: flex;
      align-items: baseline;
      gap: .4rem;
    }
    .count-num {
      font-size: 1.35rem;
      font-weight: 800;
      color: #6366F1;
      font-variant-numeric: tabular-nums;
    }
    .count-label {
      font-size: .85rem;
      font-weight: 600;
      color: #0F172A;
    }
    .count-max {
      font-size: .8rem;
      font-weight: 400;
      color: #94A3B8;
    }
    .btn-add {
      display: flex;
      align-items: center;
      gap: .4rem;
      padding: .5rem 1rem;
      border-radius: 999px;
      border: none;
      background: linear-gradient(135deg, #6366F1, #4F46E5);
      color: #fff;
      font-size: .85rem;
      font-weight: 600;
      font-family: inherit;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(99,102,241,.3);
      transition: opacity .15s, transform .1s;
      mat-icon { font-size: 1rem; width: 1rem; height: 1rem; }
      &:hover { opacity: .9; transform: translateY(-1px); }
    }

    /* ── Empty state ── */
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
      padding: 4rem 2rem;
      text-align: center;
      max-width: 360px;
      margin: 0 auto;
      h3 { margin: 0; font-size: 1.1rem; font-weight: 700; color: #0F172A; }
      p { margin: 0; color: #64748B; font-size: .875rem; line-height: 1.65; }
    }
    .empty-icon-wrap {
      width: 72px;
      height: 72px;
      border-radius: 20px;
      background: #EEF2FF;
      display: flex;
      align-items: center;
      justify-content: center;
      mat-icon { font-size: 2rem; width: 2rem; height: 2rem; color: #6366F1; }
    }
    .btn-add-primary {
      display: flex;
      align-items: center;
      gap: .5rem;
      padding: .7rem 1.5rem;
      border-radius: 999px;
      border: none;
      background: linear-gradient(135deg, #6366F1, #4F46E5);
      color: #fff;
      font-size: .9rem;
      font-weight: 700;
      font-family: inherit;
      cursor: pointer;
      box-shadow: 0 4px 14px rgba(99,102,241,.35);
      transition: opacity .15s, transform .1s;
      mat-icon { font-size: 1rem; width: 1rem; height: 1rem; }
      &:hover { opacity: .9; transform: translateY(-1px); }
    }

    /* ── Members list ── */
    .members-list {
      padding: 1.25rem 1.5rem;
      display: flex;
      flex-direction: column;
      gap: .85rem;
      max-width: 680px;
    }
    .member-card {
      background: #fff;
      border-radius: 16px;
      border: 1.5px solid #E2E8F0;
      overflow: hidden;
      transition: box-shadow .2s, border-color .2s;
      &:hover { box-shadow: 0 4px 16px rgba(99,102,241,.1); }
      &.is-editing {
        border-color: #6366F1;
        box-shadow: 0 0 0 3px rgba(99,102,241,.1);
      }
    }

    /* View mode */
    .member-view {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem 1.25rem;
    }
    .member-avatar {
      width: 48px;
      height: 48px;
      border-radius: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      font-weight: 800;
      font-size: 1rem;
      letter-spacing: -.01em;
      flex-shrink: 0;
    }
    .member-info { flex: 1; min-width: 0; }
    .member-name {
      font-size: .95rem;
      font-weight: 700;
      color: #0F172A;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .member-chips {
      display: flex;
      gap: .35rem;
      flex-wrap: wrap;
      margin-top: .35rem;
    }
    .chip {
      font-size: .7rem;
      font-weight: 700;
      padding: .2rem .6rem;
      border-radius: 999px;
      letter-spacing: .04em;
    }
    .chip-rel {
      background: #EEF2FF;
      color: #6366F1;
      text-transform: uppercase;
    }
    .chip-meta {
      background: #F8F9FF;
      color: #64748B;
      border: 1px solid #E2E8F0;
      text-transform: capitalize;
    }
    .member-actions {
      display: flex;
      gap: .2rem;
      flex-shrink: 0;
    }

    /* Icon buttons */
    .icon-btn {
      width: 34px;
      height: 34px;
      border-radius: 9px;
      border: none;
      background: transparent;
      color: #94A3B8;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: background .15s, color .15s;
      mat-icon { font-size: 1.1rem; width: 1.1rem; height: 1.1rem; }
      &:hover { background: #F1F5F9; color: #475569; }
    }
    .icon-btn-danger {
      &:hover { background: #FEF2F2; color: #EF4444; }
    }

    /* Edit inline header */
    .inline-form-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: .75rem 1.25rem;
      background: #EEF2FF;
      border-bottom: 1px solid #C7D2FE;
    }
    .inline-form-title {
      display: flex;
      align-items: center;
      gap: .5rem;
      font-size: .85rem;
      font-weight: 700;
      color: #4F46E5;
      mat-icon { font-size: 1rem; width: 1rem; height: 1rem; }
    }

    /* Add card */
    .add-card {
      margin: 0 1.5rem;
      max-width: 640px;
      background: #fff;
      border-radius: 16px;
      border: 2px solid #6366F1;
      overflow: hidden;
      box-shadow: 0 4px 20px rgba(99,102,241,.15);
    }
    .add-card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1rem 1.25rem;
      background: #EEF2FF;
      border-bottom: 1px solid #C7D2FE;
    }
    .add-card-title {
      display: flex;
      align-items: center;
      gap: .65rem;
      font-size: .9rem;
      font-weight: 700;
      color: #4F46E5;
    }
    .add-icon-wrap {
      width: 28px;
      height: 28px;
      border-radius: 8px;
      background: #6366F1;
      display: flex;
      align-items: center;
      justify-content: center;
      mat-icon { font-size: .9rem; width: .9rem; height: .9rem; color: #fff; }
    }

    /* Shared form styles */
    .member-form {
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: .85rem;
    }
    .form-row-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }
    .field-group {
      display: flex;
      flex-direction: column;
      gap: .3rem;
    }
    .field-label {
      font-size: .75rem;
      font-weight: 600;
      color: #475569;
      letter-spacing: .04em;
      text-transform: uppercase;
    }
    .req { color: #EF4444; }
    .optional { color: #94A3B8; font-weight: 400; text-transform: none; letter-spacing: 0; font-size: .72rem; }
    .field { width: 100%; }
    .form-actions {
      display: flex;
      justify-content: flex-end;
      gap: .65rem;
      padding-top: .25rem;
    }
    .btn-ghost {
      height: 40px;
      padding: 0 1.1rem;
      border-radius: 999px;
      border: 1.5px solid #E2E8F0;
      background: #fff;
      color: #475569;
      font-size: .875rem;
      font-weight: 600;
      font-family: inherit;
      cursor: pointer;
      transition: border-color .15s, color .15s;
      &:hover { border-color: #6366F1; color: #6366F1; }
    }
    .btn-save {
      height: 40px;
      padding: 0 1.25rem;
      border-radius: 999px;
      border: none;
      background: linear-gradient(135deg, #6366F1, #4F46E5);
      color: #fff;
      font-size: .875rem;
      font-weight: 700;
      font-family: inherit;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: .4rem;
      box-shadow: 0 2px 8px rgba(99,102,241,.3);
      transition: opacity .15s, transform .1s;
      mat-icon { font-size: 1rem; width: 1rem; height: 1rem; }
      &:hover:not(:disabled) { opacity: .9; transform: translateY(-1px); }
      &:disabled { opacity: .55; cursor: not-allowed; transform: none; box-shadow: none; }
    }
    .btn-spinner {
      width: 14px;
      height: 14px;
      border: 2px solid rgba(255,255,255,.4);
      border-top-color: #fff;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    /* Limit notice */
    .limit-notice {
      display: flex;
      align-items: center;
      gap: .5rem;
      margin: 1rem 1.5rem;
      padding: .75rem 1rem;
      background: #FFFBEB;
      border-radius: 10px;
      border-left: 3px solid #F59E0B;
      font-size: .85rem;
      color: #78350F;
      mat-icon { font-size: 1rem; width: 1rem; height: 1rem; color: #F59E0B; flex-shrink: 0; }
    }

    @media (max-width: 600px) {
      .members-list { padding: 1rem; }
      .add-card { margin: 0 1rem; }
      .form-row-2 { grid-template-columns: 1fr; }
      .count-bar { padding: .75rem 1rem; }
      .limit-notice { margin: 1rem; }
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

  avatarGradient(index: number): string[] {
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
