import { Component, inject, OnInit, output, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserApiService } from '../../../core/api/services/user-api.service';
import { BookingWizardStore } from '../../../core/store/booking-wizard.store';
import { FamilyMember, User } from '../../../core/api/api.types';
import {
  ButtonComponent, CardComponent, BadgeComponent,
  SpinnerComponent, InputComponent, SelectComponent, ModalComponent
} from '../../../shared/components';

@Component({
  selector: 'app-patient-step-new',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonComponent,
    CardComponent,
    BadgeComponent,
    SpinnerComponent,
    InputComponent,
    SelectComponent,
    ModalComponent
  ],
  template: `
    <div class="patient-step">
      @if (loading()) {
        <div class="loading-state">
          <app-spinner size="lg" />
          <p>Loading patient information...</p>
        </div>
      } @else if (error()) {
        <div class="error-state">
          <div class="error-state__icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>
          <h3>Unable to load patients</h3>
          <p>{{ error() }}</p>
          <app-button variant="outline" (click)="load()">Try Again</app-button>
        </div>
      } @else {
        <div class="patient-grid">
          <!-- Self Card -->
          <button
            type="button"
            class="patient-card"
            [class.patient-card--selected]="selectedId() === 'self'"
            (click)="selectPatient('self')"
          >
            <div class="patient-card__avatar patient-card__avatar--self">
              {{ selfInitials() }}
            </div>
            <div class="patient-card__info">
              <span class="patient-card__name">{{ profile()?.name || 'Myself' }}</span>
              <div class="patient-card__meta">
                <app-badge variant="info" size="sm">Primary</app-badge>
                @if (profile()?.gender) {
                  <span class="patient-card__detail">{{ profile()!.gender | titlecase }}</span>
                }
              </div>
            </div>
            <div class="patient-card__check" [class.patient-card__check--visible]="selectedId() === 'self'">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
            </div>
          </button>

          <!-- Family Members -->
          @for (member of familyMembers(); track member.id) {
            <button
              type="button"
              class="patient-card"
              [class.patient-card--selected]="selectedId() === member.id"
              (click)="selectPatient(member.id)"
            >
              <div class="patient-card__avatar patient-card__avatar--member">
                {{ memberInitials(member.name) }}
              </div>
              <div class="patient-card__info">
                <span class="patient-card__name">{{ member.name }}</span>
                <div class="patient-card__meta">
                  <app-badge variant="warning" size="sm">{{ member.relationship | titlecase }}</app-badge>
                  @if (member.date_of_birth) {
                    <span class="patient-card__detail">{{ memberAge(member.date_of_birth) }} yrs</span>
                  }
                  @if (member.gender) {
                    <span class="patient-card__detail">{{ member.gender | titlecase }}</span>
                  }
                </div>
              </div>
              <div class="patient-card__check" [class.patient-card__check--visible]="selectedId() === member.id">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
                  <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
              </div>
            </button>
          }

          <!-- Add Family Member Card -->
          <button type="button" class="patient-card patient-card--add" (click)="openAddModal()">
            <div class="patient-card__add-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                <circle cx="8.5" cy="7" r="4"/>
                <line x1="20" y1="8" x2="20" y2="14"/>
                <line x1="23" y1="11" x2="17" y2="11"/>
              </svg>
            </div>
            <span class="patient-card__add-label">Add Family Member</span>
          </button>
        </div>

        <!-- Actions -->
        <div class="step-actions">
          <app-button variant="primary" size="lg" [disabled]="!selectedId()" (click)="onNext()">
            Continue
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="btn-icon">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </app-button>
        </div>
      }

      <!-- Add Member Modal -->
      <app-modal [isOpen]="showAddModal()" (close)="closeAddModal()" title="Add Family Member" size="md">
        <div class="add-form">
          <div class="add-form__grid">
            <div class="add-form__field add-form__field--full">
              <label class="add-form__label">Full Name <span class="required">*</span></label>
              <input 
                type="text" 
                class="add-form__input"
                placeholder="Enter full name"
                [(ngModel)]="newMember.name"
              />
            </div>
            
            <div class="add-form__field">
              <label class="add-form__label">Relationship <span class="required">*</span></label>
              <select class="add-form__input add-form__select" [(ngModel)]="newMember.relationship">
                <option value="">Select relationship</option>
                <option value="spouse">Spouse</option>
                <option value="parent">Parent</option>
                <option value="child">Child</option>
                <option value="sibling">Sibling</option>
                <option value="grandparent">Grandparent</option>
                <option value="other">Other</option>
              </select>
            </div>
            
            <div class="add-form__field">
              <label class="add-form__label">Gender</label>
              <select class="add-form__input add-form__select" [(ngModel)]="newMember.gender">
                <option value="">Prefer not to say</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            
            <div class="add-form__field add-form__field--full">
              <label class="add-form__label">Date of Birth</label>
              <input 
                type="date" 
                class="add-form__input"
                [max]="todayStr"
                [(ngModel)]="newMember.dob"
              />
            </div>
          </div>

          @if (addError()) {
            <div class="add-form__error">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {{ addError() }}
            </div>
          }
        </div>

        <div modal-footer class="add-form__actions">
          <app-button variant="outline" (click)="closeAddModal()" [disabled]="addLoading()">Cancel</app-button>
          <app-button 
            variant="primary" 
            [loading]="addLoading()"
            [disabled]="!newMember.name.trim() || !newMember.relationship"
            (click)="saveMember()"
          >
            Save Member
          </app-button>
        </div>
      </app-modal>
    </div>
  `,
  styles: [`
    :host {
      --color-primary-50: #EEF2FF;
      --color-primary-100: #E0E7FF;
      --color-primary-500: #6366F1;
      --color-primary-600: #4F46E5;
      --color-primary-700: #4338CA;
      --color-primary-800: #3730A3;
      --shadow-primary: 0 4px 14px 0 rgba(79, 70, 229, 0.28);
      display: block;
    }

    .patient-step {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .loading-state,
    .error-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 3rem;
      text-align: center;
      gap: 1rem;
    }

    .loading-state p,
    .error-state p {
      color: #475569;
      margin: 0;
    }

    .error-state__icon {
      width: 64px;
      height: 64px;
      border-radius: 9999px;
      background: #FEF2F2;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #EF4444;

      svg {
        width: 32px;
        height: 32px;
      }
    }

    .error-state h3 {
      font-size: 1.125rem;
      font-weight: 600;
      color: #0F172A;
      margin: 0;
    }

    /* Patient Grid */
    .patient-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 1rem;
    }

    /* Patient Card */
    .patient-card {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem;
      background: #FFFFFF;
      border: 2px solid #E2E8F0;
      border-radius: 1rem;
      cursor: pointer;
      transition: all 200ms cubic-bezier(0.4,0,0.2,1);
      text-align: left;
      width: 100%;

      &:hover {
        border-color: #A5B4FC;
        background: #EEF2FF;
        transform: translateY(-2px);
        box-shadow: 0 4px 6px -1px rgba(0,0,0,.1),0 2px 4px -2px rgba(0,0,0,.1);
      }

      &:focus-visible {
        outline: none;
        border-color: #6366F1;
        box-shadow: 0 0 0 4px #C7D2FE;
      }
    }

    .patient-card--selected {
      border-color: #6366F1;
      background: #EEF2FF;
      box-shadow: 0 4px 14px 0 rgba(99,102,241,.25);
    }

    .patient-card__avatar {
      width: 52px;
      height: 52px;
      border-radius: 9999px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1rem;
      font-weight: 700;
      flex-shrink: 0;
    }

    .patient-card__avatar--self {
      background: linear-gradient(135deg, #6366F1 0%, #4338CA 100%);
      color: #FFFFFF;
      box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
    }

    .patient-card__avatar--member {
      background: linear-gradient(135deg, #FFEDD5 0%, #FDBA74 100%);
      color: #C2410C;
      border: 2px solid #FB923C;
    }

    .patient-card__info {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .patient-card__name {
      font-size: 1rem;
      font-weight: 600;
      color: #0F172A;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .patient-card__meta {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .patient-card__detail {
      font-size: 0.875rem;
      color: #475569;
    }

    .patient-card__check {
      width: 28px;
      height: 28px;
      color: #6366F1;
      opacity: 0;
      transform: scale(0.7);
      transition: all 150ms;

      svg {
        width: 28px;
        height: 28px;
      }
    }

    .patient-card__check--visible {
      opacity: 1;
      transform: scale(1);
    }

    /* Add Card */
    .patient-card--add {
      border-style: dashed;
      border-color: #A5B4FC;
      background: transparent;
      flex-direction: column;
      justify-content: center;
      min-height: 120px;
      gap: 0.75rem;

      &:hover {
        border-color: #6366F1;
        background: #EEF2FF;
      }
    }

    .patient-card__add-icon {
      width: 48px;
      height: 48px;
      border-radius: 9999px;
      background: #C7D2FE;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #4F46E5;
      transition: all 150ms;

      svg {
        width: 24px;
        height: 24px;
      }

      .patient-card--add:hover & {
        background: #A5B4FC;
      }
    }

    .patient-card__add-label {
      font-size: 0.875rem;
      font-weight: 600;
      color: #4338CA;
    }

    /* Step Actions */
    .step-actions {
      display: flex;
      justify-content: flex-end;
      padding-top: 1rem;
      border-top: 1px solid #F1F5F9;
    }

    .btn-icon {
      width: 18px;
      height: 18px;
      margin-left: 0.5rem;
    }

    /* Add Form */
    .add-form {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .add-form__grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;

      @media (max-width: 640px) {
        grid-template-columns: 1fr;
      }
    }

    .add-form__field {
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
    }

    .add-form__field--full {
      grid-column: 1 / -1;
    }

    .add-form__label {
      font-size: 0.875rem;
      font-weight: 500;
      color: #475569;
    }

    .required {
      color: #EF4444;
    }

    .add-form__input {
      width: 100%;
      padding: 0.75rem;
      border: 1.5px solid #E2E8F0;
      border-radius: 0.75rem;
      background: #F8FAFC;
      font-size: 1rem;
      color: #0F172A;
      transition: all 150ms;

      &:focus {
        outline: none;
        border-color: #6366F1;
        background: #FFFFFF;
        box-shadow: 0 0 0 4px #C7D2FE;
      }

      &::placeholder {
        color: #94A3B8;
      }
    }

    .add-form__select {
      cursor: pointer;
      appearance: none;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 0.75rem center;
      padding-right: 2.5rem;
    }

    .add-form__error {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem;
      background: #FEF2F2;
      color: #B91C1C;
      border-radius: 0.75rem;
      font-size: 0.875rem;

      svg {
        width: 18px;
        height: 18px;
        flex-shrink: 0;
      }
    }

    .add-form__actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
    }

    /* Reduced Motion */
    @media (prefers-reduced-motion: reduce) {
      .patient-card,
      .patient-card__check,
      .patient-card__add-icon {
        transition: none;
      }

      .patient-card:hover {
        transform: none;
      }
    }
  `]
})
export class PatientStepNewComponent implements OnInit {
  next = output<void>();

  private userApi = inject(UserApiService);
  readonly store = inject(BookingWizardStore);

  /* State */
  loading = signal(false);
  error = signal<string | null>(null);
  profile = signal<User | null>(null);
  familyMembers = signal<FamilyMember[]>([]);
  selectedId = signal<string>('self');

  /* Add modal state */
  showAddModal = signal(false);
  addLoading = signal(false);
  addError = signal<string | null>(null);
  newMember = { name: '', relationship: '', gender: '', dob: '' };

  readonly todayStr = new Date().toISOString().split('T')[0];

  selfInitials = computed(() => {
    const name = this.profile()?.name ?? '';
    return name 
      ? name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
      : 'ME';
  });

  memberInitials(name: string): string {
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  }

  memberAge(dob: string): number {
    const today = new Date();
    const birth = new Date(dob);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);

    this.userApi.getProfile().subscribe({
      next: (user) => {
        this.profile.set(user);
        this.userApi.getFamilyMembers().subscribe({
          next: (members) => {
            this.familyMembers.set(members.filter(m => m.is_active && !m.deleted_at));
            this.loading.set(false);
          },
          error: () => this.loading.set(false)
        });
      },
      error: () => {
        this.error.set('Unable to load your profile. Please try again.');
        this.loading.set(false);
      }
    });
  }

  selectPatient(id: string): void {
    this.selectedId.set(id);
  }

  openAddModal(): void {
    this.showAddModal.set(true);
    this.addError.set(null);
    this.newMember = { name: '', relationship: '', gender: '', dob: '' };
  }

  closeAddModal(): void {
    this.showAddModal.set(false);
  }

  saveMember(): void {
    if (!this.newMember.name.trim() || !this.newMember.relationship) return;

    this.addLoading.set(true);
    this.addError.set(null);

    const payload: Partial<FamilyMember> = {
      name: this.newMember.name.trim(),
      relationship: this.newMember.relationship,
      gender: this.newMember.gender || undefined,
      date_of_birth: this.newMember.dob || undefined
    };

    this.userApi.addFamilyMember(payload).subscribe({
      next: (member) => {
        this.familyMembers.update(list => [...list, member]);
        this.selectedId.set(member.id);
        this.addLoading.set(false);
        this.closeAddModal();
      },
      error: () => {
        this.addError.set('Failed to add family member. Please try again.');
        this.addLoading.set(false);
      }
    });
  }

  onNext(): void {
    const isSelf = this.selectedId() === 'self';
    const patientId = isSelf ? null : this.selectedId();
    const patientName = isSelf
      ? (this.profile()?.name ?? null)
      : (this.familyMembers().find(m => m.id === this.selectedId())?.name ?? null);

    this.store.patch({ patientId, patientName });
    this.next.emit();
  }
}
