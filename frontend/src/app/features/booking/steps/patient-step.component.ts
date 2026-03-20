import { Component, inject, OnInit, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatRadioModule } from '@angular/material/radio';
import { MatButtonModule } from '@angular/material/button';
import { FormsModule } from '@angular/forms';
import { UserApiService } from '../../../core/api/services/user-api.service';
import { BookingWizardStore } from '../../../core/store/booking-wizard.store';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner.component';
import { ErrorBannerComponent } from '../../../shared/components/error-banner.component';
import { FamilyMember, User } from '../../../core/api/api.types';

@Component({
  selector: 'app-patient-step',
  standalone: true,
  imports: [CommonModule, MatRadioModule, MatButtonModule, FormsModule, LoadingSpinnerComponent, ErrorBannerComponent],
  template: `
    <div class="step-container">
      <h2>Who is this booking for?</h2>

      @if (loading()) {
        <app-loading-spinner />
      } @else if (error()) {
        <app-error-banner [message]="error()!" retryLabel="Retry" (retry)="load()" />
      } @else {
        <mat-radio-group [(ngModel)]="selectedId" class="radio-group">
          <mat-radio-button [value]="'self'">
            Myself ({{ profile()?.name }})
          </mat-radio-button>
          @for (member of familyMembers(); track member.id) {
            <mat-radio-button [value]="member.id">
              {{ member.name }} ({{ member.relationship }})
            </mat-radio-button>
          }
        </mat-radio-group>
      }

      <div class="actions">
        <button mat-flat-button color="primary" [disabled]="!selectedId" (click)="onNext()">
          Next
        </button>
      </div>
    </div>
  `,
  styles: [`
    .step-container { padding: 1rem; }
    .radio-group { display: flex; flex-direction: column; gap: 0.75rem; margin: 1rem 0; }
    .actions { margin-top: 1.5rem; }
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

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.userApi.getProfile().subscribe({
      next: (user: User) => {
        this.profile.set(user);
        this.userApi.getFamilyMembers().subscribe({
          next: (members: FamilyMember[]) => {
            this.familyMembers.set(members);
            this.loading.set(false);
          },
          error: () => {
            this.loading.set(false);
          },
        });
      },
      error: () => {
        this.error.set('Failed to load profile.');
        this.loading.set(false);
      },
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
