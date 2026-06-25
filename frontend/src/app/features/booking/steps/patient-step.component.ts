import { Component, inject, OnInit, output, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { UserApiService } from '../../../core/api/services/user-api.service';
import { BookingWizardStore } from '../../../core/store/booking-wizard.store';
import { FamilyMember, User } from '../../../core/api/api.types';

@Component({
  selector: 'app-patient-step',
  standalone: true,
  imports: [CommonModule, MatIconModule, FormsModule],
  template: `
    <div class="ps-wrap">

      <!-- Header -->
      <div class="ps-header">
        <div class="ps-header-icon">
          <mat-icon>people_alt</mat-icon>
        </div>
        <div>
          <h2 class="ps-title">Who is this test for?</h2>
          <p class="ps-subtitle">Select the patient for this diagnostic booking</p>
        </div>
      </div>

      @if (loading()) {
        <div class="ps-grid">
          @for (i of [1,2,3]; track i) {
            <div class="ps-skeleton"></div>
          }
        </div>
      } @else if (error()) {
        <div class="ps-error">
          <mat-icon>error_outline</mat-icon>
          <span>{{ error() }}</span>
          <button class="ps-retry" (click)="load()">Try again</button>
        </div>
      } @else {
        <div class="ps-grid">

          <!-- Myself card -->
          <button
            type="button"
            class="ps-card"
            [class.ps-card--selected]="selectedId === 'self'"
            (click)="selectedId = 'self'"
          >
            <div class="ps-card-inner">
              <div class="ps-avatar ps-avatar--self">
                <span>{{ selfInitials() }}</span>
              </div>
              <div class="ps-card-info">
                <span class="ps-card-name">{{ profile()?.name ?? 'Myself' }}</span>
                <span class="ps-card-meta">
                  <span class="ps-badge ps-badge--self">Primary</span>
                  @if (profile()?.gender) {
                    <span class="ps-dot"></span>
                    <span>{{ profile()!.gender | titlecase }}</span>
                  }
                </span>
              </div>
            </div>
            <div class="ps-card-check" [class.ps-card-check--visible]="selectedId === 'self'">
              <mat-icon>check_circle</mat-icon>
            </div>
          </button>

          <!-- Family member cards -->
          @for (member of familyMembers(); track member.id) {
            <button
              type="button"
              class="ps-card"
              [class.ps-card--selected]="selectedId === member.id"
              (click)="selectedId = member.id"
            >
              <div class="ps-card-inner">
                <div class="ps-avatar ps-avatar--member" [attr.data-rel]="member.relationship">
                  <span>{{ memberInitials(member.name) }}</span>
                </div>
                <div class="ps-card-info">
                  <span class="ps-card-name">{{ member.name }}</span>
                  <span class="ps-card-meta">
                    <span class="ps-badge ps-badge--member">{{ member.relationship | titlecase }}</span>
                    @if (member.date_of_birth) {
                      <span class="ps-dot"></span>
                      <span>{{ memberAge(member.date_of_birth) }} yrs</span>
                    }
                    @if (member.gender) {
                      <span class="ps-dot"></span>
                      <span>{{ member.gender | titlecase }}</span>
                    }
                  </span>
                </div>
              </div>
              <div class="ps-card-check" [class.ps-card-check--visible]="selectedId === member.id">
                <mat-icon>check_circle</mat-icon>
              </div>
            </button>
          }

          <!-- Add family member card -->
          @if (!showAddForm()) {
            <button
              type="button"
              class="ps-card ps-card--add"
              (click)="showAddForm.set(true)"
            >
              <div class="ps-add-inner">
                <div class="ps-add-icon">
                  <mat-icon>person_add</mat-icon>
                </div>
                <span class="ps-add-label">Add family member</span>
              </div>
            </button>
          }

          <!-- Inline add form (expanded) -->
          @if (showAddForm()) {
            <div class="ps-add-form">
              <div class="ps-form-header">
                <mat-icon>person_add</mat-icon>
                <span>New family member</span>
                <button type="button" class="ps-form-close" (click)="cancelAdd()">
                  <mat-icon>close</mat-icon>
                </button>
              </div>

              <div class="ps-form-grid">
                <!-- Full name -->
                <div class="ps-field ps-field--full">
                  <label class="ps-label">Full name <span class="ps-required">*</span></label>
                  <input
                    class="ps-input"
                    type="text"
                    placeholder="e.g. Priya Sharma"
                    [(ngModel)]="newName"
                    autocomplete="off"
                  />
                </div>

                <!-- Relationship -->
                <div class="ps-field">
                  <label class="ps-label">Relationship <span class="ps-required">*</span></label>
                  <div class="ps-select-wrap">
                    <select class="ps-input ps-select" [(ngModel)]="newRelationship">
                      <option value="" disabled>Select</option>
                      <option value="spouse">Spouse</option>
                      <option value="parent">Parent</option>
                      <option value="child">Child</option>
                      <option value="sibling">Sibling</option>
                      <option value="grandparent">Grandparent</option>
                      <option value="other">Other</option>
                    </select>
                    <mat-icon class="ps-select-arrow">expand_more</mat-icon>
                  </div>
                </div>

                <!-- Gender -->
                <div class="ps-field">
                  <label class="ps-label">Gender</label>
                  <div class="ps-select-wrap">
                    <select class="ps-input ps-select" [(ngModel)]="newGender">
                      <option value="">Prefer not to say</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                    <mat-icon class="ps-select-arrow">expand_more</mat-icon>
                  </div>
                </div>

                <!-- Date of birth -->
                <div class="ps-field ps-field--full">
                  <label class="ps-label">Date of birth</label>
                  <input
                    class="ps-input"
                    type="date"
                    [max]="todayStr"
                    [(ngModel)]="newDob"
                  />
                </div>
              </div>

              @if (addError()) {
                <p class="ps-form-error">
                  <mat-icon>info</mat-icon>
                  {{ addError() }}
                </p>
              }

              <div class="ps-form-actions">
                <button type="button" class="ps-btn-ghost" (click)="cancelAdd()" [disabled]="addLoading()">
                  Cancel
                </button>
                <button type="button" class="ps-btn-save" (click)="saveMember()" [disabled]="addLoading() || !newName.trim() || !newRelationship">
                  @if (addLoading()) {
                    <span class="ps-spinner"></span> Saving…
                  } @else {
                    <mat-icon>check</mat-icon> Save member
                  }
                </button>
              </div>
            </div>
          }

        </div>
      }

      <!-- Continue CTA -->
      <div class="ps-actions">
        <button
          class="ps-btn-next"
          [disabled]="!selectedId || loading()"
          (click)="onNext()"
        >
          Continue
          <mat-icon>arrow_forward</mat-icon>
        </button>
      </div>

    </div>
  `,
  styles: [`
    /* ── Tokens ── */
    :host {
      --indigo:        #6366F1;
      --indigo-dark:   #4F46E5;
      --indigo-light:  #EEF2FF;
      --indigo-mid:    #C7D2FE;
      --orange:        #F97316;
      --orange-dark:   #EA580C;
      --orange-light:  #FFF7ED;
      --success:       #22C55E;
      --error:         #EF4444;
      --error-light:   #FEF2F2;
      --bg:            #F8F9FF;
      --surface:       #FFFFFF;
      --text:          #0F172A;
      --text-sec:      #475569;
      --muted:         #94A3B8;
      --border:        #E2E8F0;
      --r-md:          12px;
      --r-lg:          16px;
      --r-xl:          20px;
      --shadow-sm:     0 1px 3px rgba(15,23,42,.07), 0 1px 2px rgba(15,23,42,.05);
      --shadow-md:     0 4px 12px rgba(15,23,42,.08), 0 2px 4px rgba(15,23,42,.05);
      --shadow-indigo: 0 4px 16px rgba(99,102,241,.22);
    }

    /* ── Layout shell ── */
    .ps-wrap {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    /* ── Header ── */
    .ps-header {
      display: flex;
      align-items: center;
      gap: .875rem;
    }
    .ps-header-icon {
      width: 44px;
      height: 44px;
      border-radius: var(--r-md);
      background: var(--indigo-light);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      color: var(--indigo);
    }
    .ps-header-icon mat-icon { font-size: 1.35rem; width: 1.35rem; height: 1.35rem; }
    .ps-title {
      font-size: 1.125rem;
      font-weight: 800;
      color: var(--text);
      margin: 0 0 .15rem;
      letter-spacing: -.02em;
    }
    .ps-subtitle {
      font-size: .8125rem;
      color: var(--muted);
      margin: 0;
    }

    /* ── Grid ── */
    .ps-grid {
      display: flex;
      flex-direction: column;
      gap: .625rem;
    }

    /* ── Patient card ── */
    .ps-card {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: .875rem 1rem;
      border-radius: var(--r-lg);
      border: 2px solid var(--border);
      background: var(--surface);
      cursor: pointer;
      transition: border-color .18s, background .18s, box-shadow .18s, transform .15s;
      text-align: left;
      outline: none;
      box-shadow: var(--shadow-sm);
    }
    .ps-card:hover {
      border-color: var(--indigo-mid);
      background: var(--indigo-light);
      transform: translateY(-1px);
      box-shadow: var(--shadow-md);
    }
    .ps-card:focus-visible {
      border-color: var(--indigo);
      box-shadow: 0 0 0 3px rgba(99,102,241,.25);
    }
    .ps-card--selected {
      border-color: var(--indigo) !important;
      background: var(--indigo-light) !important;
      box-shadow: var(--shadow-indigo) !important;
    }

    /* ── Card inner ── */
    .ps-card-inner {
      display: flex;
      align-items: center;
      gap: .875rem;
      min-width: 0;
    }

    /* ── Avatar ── */
    .ps-avatar {
      width: 46px;
      height: 46px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: .875rem;
      font-weight: 800;
      letter-spacing: .02em;
      flex-shrink: 0;
    }
    .ps-avatar--self {
      background: linear-gradient(135deg, var(--indigo) 0%, var(--indigo-dark) 100%);
      color: #fff;
      box-shadow: 0 2px 8px rgba(99,102,241,.35);
    }
    .ps-avatar--member {
      background: linear-gradient(135deg, #FFF7ED 0%, #FFEDD5 100%);
      color: var(--orange-dark);
      border: 1.5px solid #FDBA74;
    }

    /* ── Card info ── */
    .ps-card-info {
      display: flex;
      flex-direction: column;
      gap: .2rem;
      min-width: 0;
    }
    .ps-card-name {
      font-size: .9375rem;
      font-weight: 700;
      color: var(--text);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .ps-card-meta {
      display: flex;
      align-items: center;
      gap: .35rem;
      font-size: .75rem;
      color: var(--text-sec);
      flex-wrap: wrap;
    }
    .ps-dot {
      width: 3px;
      height: 3px;
      border-radius: 50%;
      background: var(--muted);
      display: inline-block;
    }

    /* ── Badge ── */
    .ps-badge {
      display: inline-flex;
      align-items: center;
      padding: .125rem .5rem;
      border-radius: 999px;
      font-size: .6875rem;
      font-weight: 600;
      letter-spacing: .02em;
      line-height: 1.5;
    }
    .ps-badge--self {
      background: var(--indigo-light);
      color: var(--indigo-dark);
      border: 1px solid var(--indigo-mid);
    }
    .ps-badge--member {
      background: var(--orange-light);
      color: var(--orange-dark);
      border: 1px solid #FED7AA;
    }

    /* ── Check icon ── */
    .ps-card-check {
      color: var(--indigo);
      opacity: 0;
      transform: scale(.6);
      transition: opacity .18s, transform .18s;
      flex-shrink: 0;
    }
    .ps-card-check mat-icon { font-size: 1.375rem; width: 1.375rem; height: 1.375rem; }
    .ps-card-check--visible {
      opacity: 1;
      transform: scale(1);
    }

    /* ── Add card ── */
    .ps-card--add {
      border-style: dashed;
      border-color: var(--indigo-mid);
      background: transparent;
      box-shadow: none;
    }
    .ps-card--add:hover {
      border-color: var(--indigo);
      background: var(--indigo-light);
      box-shadow: none;
    }
    .ps-add-inner {
      display: flex;
      align-items: center;
      gap: .75rem;
    }
    .ps-add-icon {
      width: 46px;
      height: 46px;
      border-radius: 50%;
      background: var(--indigo-light);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--indigo);
      flex-shrink: 0;
      transition: background .18s;
    }
    .ps-card--add:hover .ps-add-icon {
      background: var(--indigo-mid);
    }
    .ps-add-icon mat-icon { font-size: 1.25rem; width: 1.25rem; height: 1.25rem; }
    .ps-add-label {
      font-size: .9rem;
      font-weight: 600;
      color: var(--indigo);
    }

    /* ── Inline add form ── */
    .ps-add-form {
      border-radius: var(--r-xl);
      border: 2px solid var(--indigo-mid);
      background: var(--surface);
      padding: 1.125rem 1rem 1rem;
      box-shadow: var(--shadow-md);
      display: flex;
      flex-direction: column;
      gap: 1rem;
      animation: ps-slide-in .2s ease;
    }
    @keyframes ps-slide-in {
      from { opacity: 0; transform: translateY(-6px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    .ps-form-header {
      display: flex;
      align-items: center;
      gap: .5rem;
      color: var(--indigo-dark);
      font-size: .875rem;
      font-weight: 700;
    }
    .ps-form-header mat-icon { font-size: 1.1rem; width: 1.1rem; height: 1.1rem; }
    .ps-form-header span { flex: 1; }
    .ps-form-close {
      width: 28px;
      height: 28px;
      border: none;
      background: none;
      cursor: pointer;
      color: var(--muted);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      transition: background .15s, color .15s;
    }
    .ps-form-close:hover { background: var(--bg); color: var(--text); }
    .ps-form-close mat-icon { font-size: 1rem; width: 1rem; height: 1rem; }

    /* ── Form grid ── */
    .ps-form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: .75rem;
    }
    .ps-field {
      display: flex;
      flex-direction: column;
      gap: .3rem;
    }
    .ps-field--full { grid-column: 1 / -1; }

    .ps-label {
      font-size: .75rem;
      font-weight: 600;
      color: var(--text-sec);
      letter-spacing: .02em;
      text-transform: uppercase;
    }
    .ps-required { color: var(--orange); }

    .ps-input {
      width: 100%;
      padding: .5625rem .75rem;
      border-radius: var(--r-md);
      border: 1.5px solid var(--border);
      background: var(--bg);
      font-size: .875rem;
      color: var(--text);
      outline: none;
      transition: border-color .15s, box-shadow .15s;
      box-sizing: border-box;
      font-family: inherit;
      -webkit-appearance: none;
    }
    .ps-input:focus {
      border-color: var(--indigo);
      background: var(--surface);
      box-shadow: 0 0 0 3px rgba(99,102,241,.15);
    }

    .ps-select-wrap {
      position: relative;
      display: flex;
      align-items: center;
    }
    .ps-select {
      padding-right: 2rem;
      cursor: pointer;
    }
    .ps-select-arrow {
      position: absolute;
      right: .5rem;
      font-size: 1rem;
      width: 1rem;
      height: 1rem;
      color: var(--muted);
      pointer-events: none;
    }

    .ps-form-error {
      display: flex;
      align-items: center;
      gap: .5rem;
      font-size: .8125rem;
      color: var(--error);
      background: var(--error-light);
      padding: .5rem .75rem;
      border-radius: var(--r-md);
      margin: 0;
    }
    .ps-form-error mat-icon { font-size: .9rem; width: .9rem; height: .9rem; flex-shrink: 0; }

    .ps-form-actions {
      display: flex;
      gap: .625rem;
      justify-content: flex-end;
    }
    .ps-btn-ghost {
      padding: .5rem 1rem;
      border-radius: var(--r-md);
      border: 1.5px solid var(--border);
      background: none;
      font-size: .875rem;
      font-weight: 600;
      color: var(--text-sec);
      cursor: pointer;
      transition: background .15s, color .15s;
    }
    .ps-btn-ghost:hover:not(:disabled) { background: var(--bg); color: var(--text); }
    .ps-btn-ghost:disabled { opacity: .5; cursor: not-allowed; }

    .ps-btn-save {
      display: inline-flex;
      align-items: center;
      gap: .35rem;
      padding: .5rem 1.125rem;
      border-radius: var(--r-md);
      border: none;
      background: linear-gradient(135deg, var(--indigo) 0%, var(--indigo-dark) 100%);
      color: #fff;
      font-size: .875rem;
      font-weight: 700;
      cursor: pointer;
      transition: opacity .15s, transform .15s, box-shadow .15s;
      box-shadow: 0 2px 8px rgba(99,102,241,.3);
    }
    .ps-btn-save mat-icon { font-size: 1rem; width: 1rem; height: 1rem; }
    .ps-btn-save:hover:not(:disabled) {
      opacity: .9;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(99,102,241,.4);
    }
    .ps-btn-save:disabled { opacity: .5; cursor: not-allowed; box-shadow: none; transform: none; }

    /* ── Spinner ── */
    .ps-spinner {
      width: 14px;
      height: 14px;
      border: 2px solid rgba(255,255,255,.35);
      border-top-color: #fff;
      border-radius: 50%;
      animation: ps-spin .7s linear infinite;
      display: inline-block;
    }
    @keyframes ps-spin { to { transform: rotate(360deg); } }

    /* ── Skeleton ── */
    .ps-skeleton {
      height: 74px;
      border-radius: var(--r-lg);
      background: linear-gradient(90deg, #EEF2FF 25%, #E0E7FF 50%, #EEF2FF 75%);
      background-size: 200% 100%;
      animation: ps-shimmer 1.5s infinite;
    }
    @keyframes ps-shimmer {
      0%   { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }

    /* ── Error box ── */
    .ps-error {
      display: flex;
      align-items: center;
      gap: .75rem;
      padding: 1rem 1.125rem;
      background: var(--error-light);
      border-radius: var(--r-lg);
      border: 1.5px solid #FECACA;
      font-size: .875rem;
      color: #B91C1C;
    }
    .ps-error mat-icon { font-size: 1.1rem; width: 1.1rem; height: 1.1rem; flex-shrink: 0; }
    .ps-error span { flex: 1; }
    .ps-retry {
      background: none;
      border: 1.5px solid #B91C1C;
      border-radius: var(--r-md);
      padding: .25rem .75rem;
      color: #B91C1C;
      font-size: .8rem;
      font-weight: 600;
      cursor: pointer;
      transition: background .15s;
      flex-shrink: 0;
    }
    .ps-retry:hover { background: #FEE2E2; }

    /* ── Bottom CTA ── */
    .ps-actions {
      display: flex;
      justify-content: flex-end;
      padding-top: .25rem;
    }
    .ps-btn-next {
      display: inline-flex;
      align-items: center;
      gap: .45rem;
      padding: .7rem 1.625rem;
      border-radius: 999px;
      border: none;
      background: linear-gradient(135deg, var(--indigo) 0%, var(--indigo-dark) 100%);
      color: #fff;
      font-size: .9375rem;
      font-weight: 700;
      cursor: pointer;
      transition: opacity .15s, transform .15s, box-shadow .15s;
      box-shadow: var(--shadow-indigo);
      letter-spacing: -.01em;
    }
    .ps-btn-next mat-icon { font-size: 1.1rem; width: 1.1rem; height: 1.1rem; }
    .ps-btn-next:hover:not(:disabled) {
      opacity: .92;
      transform: translateY(-1px);
      box-shadow: 0 6px 20px rgba(99,102,241,.38);
    }
    .ps-btn-next:disabled { opacity: .45; cursor: not-allowed; box-shadow: none; transform: none; }

    @media (prefers-reduced-motion: reduce) {
      .ps-card,
      .ps-btn-next,
      .ps-btn-save,
      .ps-card-check,
      .ps-add-form { animation: none; transition: none; }
    }
  `],
})
export class PatientStepComponent implements OnInit {
  next = output<void>();

  private userApi = inject(UserApiService);
  readonly store = inject(BookingWizardStore);

  loading   = signal(false);
  error     = signal<string | null>(null);
  profile   = signal<User | null>(null);
  familyMembers = signal<FamilyMember[]>([]);
  selectedId    = 'self';

  // Add-form state
  showAddForm  = signal(false);
  addLoading   = signal(false);
  addError     = signal<string | null>(null);
  newName         = '';
  newRelationship = '';
  newGender       = '';
  newDob          = '';

  readonly todayStr = new Date().toISOString().split('T')[0];

  selfInitials = () => {
    const n = this.profile()?.name ?? '';
    return n
      ? n.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)
      : 'ME';
  };

  memberInitials = (name: string) =>
    name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);

  memberAge = (dob: string): number => {
    const today = new Date();
    const birth = new Date(dob);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  };

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.userApi.getProfile().subscribe({
      next: (user: User) => {
        this.profile.set(user);
        this.userApi.getFamilyMembers().subscribe({
          next: (members: FamilyMember[]) => {
            this.familyMembers.set(members.filter((m: FamilyMember) => m.is_active && !m.deleted_at));
            this.loading.set(false);
          },
          error: () => this.loading.set(false),
        });
      },
      error: () => {
        this.error.set('Failed to load profile. Please check your connection.');
        this.loading.set(false);
      },
    });
  }

  cancelAdd(): void {
    this.showAddForm.set(false);
    this.addError.set(null);
    this.newName = '';
    this.newRelationship = '';
    this.newGender = '';
    this.newDob = '';
  }

  saveMember(): void {
    if (!this.newName.trim() || !this.newRelationship) return;
    this.addLoading.set(true);
    this.addError.set(null);

    const payload: Partial<FamilyMember> = {
      name:         this.newName.trim(),
      relationship: this.newRelationship,
      gender:       this.newGender || undefined,
      date_of_birth: this.newDob || undefined,
    };

    this.userApi.addFamilyMember(payload).subscribe({
      next: (member: FamilyMember) => {
        this.familyMembers.update(list => [...list, member]);
        this.selectedId = member.id;
        this.addLoading.set(false);
        this.cancelAdd();
      },
      error: () => {
        this.addError.set('Could not save family member. Please try again.');
        this.addLoading.set(false);
      },
    });
  }

  onNext(): void {
    const isSelf    = this.selectedId === 'self';
    const patientId = isSelf ? null : this.selectedId;
    const patientName = isSelf
      ? (this.profile()?.name ?? null)
      : (this.familyMembers().find((m: FamilyMember) => m.id === this.selectedId)?.name ?? null);
    this.store.patch({ patientId, patientName });
    this.next.emit();
  }
}
