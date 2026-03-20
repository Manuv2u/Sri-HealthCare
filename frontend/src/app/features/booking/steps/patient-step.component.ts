import { Component, inject, OnInit, output, signal } from '@angular/core';
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
    <div class="step-wrap">
      <div class="step-header">
        <h2>Who is this booking for?</h2>
        <p>Select the patient for this diagnostic test</p>
      </div>

      @if (loading()) {
        <div class="skeleton-list">
          @for (i of [1,2]; track i) { <div class="skeleton-row"></div> }
        </div>
      } @else if (error()) {
        <div class="error-box">
          <mat-icon>error_outline</mat-icon>
          <span>{{ error() }}</span>
          <button (click)="load()">Retry</button>
        </div>
      } @else {
        <div class="patient-list">
          <!-- Self -->
          <label class="patient-option" [class.selected]="selectedId === 'self'">
            <input type="radio" name="patient" value="self" [(ngModel)]="selectedId" />
            <div class="patient-avatar self">{{ selfInitials() }}</div>
            <div class="patient-info">
              <div class="patient-name">{{ profile()?.name ?? 'Myself' }}</div>
              <div class="patient-sub">Primary account holder</div>
            </div>
            <div class="patient-check" [class.visible]="selectedId === 'self'">
              <mat-icon>check_circle</mat-icon>
            </div>
          </label>

          @for (member of familyMembers(); track member.id) {
            <label class="patient-option" [class.selected]="selectedId === member.id">
              <input type="radio" name="patient" [value]="member.id" [(ngModel)]="selectedId" />
              <div class="patient-avatar member">{{ memberInitials(member.name) }}</div>
              <div class="patient-info">
                <div class="patient-name">{{ member.name }}</div>
                <div class="patient-sub">{{ member.relationship | titlecase }}</div>
              </div>
              <div class="patient-check" [class.visible]="selectedId === member.id">
                <mat-icon>check_circle</mat-icon>
              </div>
            </label>
          }
        </div>
      }

      <div class="step-actions">
        <button class="btn-next" [disabled]="!selectedId || loading()" (click)="onNext()">
          Continue <mat-icon>arrow_forward</mat-icon>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .step-wrap { display: flex; flex-direction: column; gap: 1.5rem; }
    .step-header h2 { font-size: 1.25rem; font-weight: 800; color: #1a202c; margin-bottom: .25rem; }
    .step-header p { font-size: .875rem; color: #718096; }

    .patient-list { display: flex; flex-direction: column; gap: .75rem; }
    .patient-option {
      display: flex; align-items: center; gap: 1rem;
      padding: 1rem 1.25rem; border-radius: 12px; border: 2px solid #e2e8f0;
      cursor: pointer; transition: all .15s; background: #fff;
      input[type=radio] { display: none; }
      &:hover { border-color: #00796b; background: #f0fdf9; }
      &.selected { border-color: #00796b; background: #f0fdf9; }
    }
    .patient-avatar {
      width: 44px; height: 44px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: .9rem; font-weight: 700; flex-shrink: 0;
      &.self { background: #00796b; color: #fff; }
      &.member { background: #ebf8ff; color: #2b6cb0; }
    }
    .patient-info { flex: 1; }
    .patient-name { font-size: .95rem; font-weight: 600; color: #1a202c; }
    .patient-sub { font-size: .8rem; color: #718096; margin-top: .1rem; }
    .patient-check { color: #00796b; opacity: 0; transition: opacity .15s;
      mat-icon { font-size: 1.3rem; width: 1.3rem; height: 1.3rem; }
      &.visible { opacity: 1; }
    }

    .skeleton-list { display: flex; flex-direction: column; gap: .75rem; }
    .skeleton-row { height: 72px; border-radius: 12px; background: linear-gradient(90deg,#f0f4f8 25%,#e2e8f0 50%,#f0f4f8 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; }
    @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }

    .error-box { display: flex; align-items: center; gap: .75rem; padding: 1rem; background: #fff5f5; border-radius: 10px; color: #c53030; font-size: .875rem;
      mat-icon { font-size: 1.1rem; width: 1.1rem; height: 1.1rem; }
      button { margin-left: auto; background: none; border: 1px solid #c53030; border-radius: 6px; padding: .25rem .75rem; color: #c53030; cursor: pointer; font-size: .8rem; }
    }

    .step-actions { display: flex; justify-content: flex-end; padding-top: .5rem; }
    .btn-next {
      display: inline-flex; align-items: center; gap: .4rem;
      background: #00796b; color: #fff; border: none; border-radius: 10px;
      padding: .65rem 1.5rem; font-size: .9rem; font-weight: 700; cursor: pointer; transition: background .15s;
      mat-icon { font-size: 1rem; width: 1rem; height: 1rem; }
      &:hover:not(:disabled) { background: #00695c; }
      &:disabled { opacity: .5; cursor: not-allowed; }
    }
  `],
})
export class PatientStepComponent implements OnInit {
  next = output<void>();

  private userApi = inject(UserApiService);
  readonly store = inject(BookingWizardStore);

  loading = signal(false);
  error = signal<string | null>(null);
  profile = signal<User | null>(null);
  familyMembers = signal<FamilyMember[]>([]);
  selectedId = 'self';

  selfInitials = () => {
    const n = this.profile()?.name ?? '';
    return n ? n.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2) : 'ME';
  };
  memberInitials = (name: string) => name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.userApi.getProfile().subscribe({
      next: (user: User) => {
        this.profile.set(user);
        this.userApi.getFamilyMembers().subscribe({
          next: (members: FamilyMember[]) => { this.familyMembers.set(members); this.loading.set(false); },
          error: () => this.loading.set(false),
        });
      },
      error: () => { this.error.set('Failed to load profile.'); this.loading.set(false); },
    });
  }

  onNext(): void {
    const isSelf = this.selectedId === 'self';
    const patientId = isSelf ? (this.profile()?.id ?? null) : this.selectedId;
    const patientName = isSelf
      ? (this.profile()?.name ?? null)
      : (this.familyMembers().find((m: FamilyMember) => m.id === this.selectedId)?.name ?? null);
    (this.store as any).patchState({ patientId, patientName });
    this.next.emit();
  }
}
