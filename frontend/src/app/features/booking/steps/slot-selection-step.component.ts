import { Component, inject, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { TimeSlotApiService } from '../../../core/api/services/time-slot-api.service';
import { BookingWizardStore } from '../../../core/store/booking-wizard.store';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state.component';
import { TimeSlot } from '../../../core/api/api.types';

@Component({
  selector: 'app-slot-selection-step',
  standalone: true,
  imports: [
    CommonModule, MatButtonModule, MatButtonToggleModule, MatDatepickerModule,
    MatNativeDateModule, MatFormFieldModule, MatInputModule, FormsModule,
    LoadingSpinnerComponent, EmptyStateComponent,
  ],
  template: `
    <div class="step-container">
      <h2>Choose a Slot</h2>

      <mat-button-toggle-group [(ngModel)]="collectionType" (ngModelChange)="onFilterChange()">
        <mat-button-toggle value="home">Home Collection</mat-button-toggle>
        <mat-button-toggle value="lab">Lab Visit</mat-button-toggle>
      </mat-button-toggle-group>

      <mat-form-field appearance="outline" class="date-field">
        <mat-label>Date</mat-label>
        <input matInput [matDatepicker]="picker" [(ngModel)]="selectedDate" (ngModelChange)="onFilterChange()" [min]="minDate" />
        <mat-datepicker-toggle matIconSuffix [for]="picker" />
        <mat-datepicker #picker />
      </mat-form-field>

      @if (loading()) {
        <app-loading-spinner />
      } @else if (slots().length === 0 && selectedDate) {
        <app-empty-state
          message="Not available in your area for this date."
          ctaLabel="Notify Me"
          (ctaClick)="notifyMe()" />
      } @else {
        <div class="slot-grid">
          @for (slot of slots(); track slot.id) {
            <button mat-stroked-button
              [color]="selectedSlotId() === slot.id ? 'primary' : ''"
              [disabled]="slot.remaining_capacity === 0"
              (click)="selectSlot(slot)">
              {{ slot.label }}
              @if (slot.remaining_capacity === 0) {
                <span class="full-badge"> (Full)</span>
              }
            </button>
          }
        </div>
      }

      <div class="actions">
        <button mat-stroked-button (click)="back.emit()">Back</button>
        <button mat-flat-button color="primary" [disabled]="!selectedSlotId()" (click)="onNext()">
          Next
        </button>
      </div>
    </div>
  `,
  styles: [`
    .step-container { padding: 1rem; }
    .date-field { width: 100%; margin-top: 1rem; }
    .slot-grid { display: flex; flex-wrap: wrap; gap: 0.5rem; margin: 1rem 0; }
    .full-badge { font-size: 0.75rem; color: #999; }
    .actions { display: flex; gap: 1rem; margin-top: 1.5rem; }
  `],
})
export class SlotSelectionStepComponent {
  next = output<void>();
  back = output<void>();

  private slotApi = inject(TimeSlotApiService);
  readonly store = inject(BookingWizardStore);

  minDate = new Date();
  selectedDate: Date | null = null;
  collectionType = 'lab';
  loading = signal(false);
  slots = signal<TimeSlot[]>([]);
  selectedSlotId = signal<string | null>(null);

  onFilterChange(): void {
    if (!this.selectedDate) return;
    const dateStr = this.selectedDate.toISOString().split('T')[0];
    this.loading.set(true);
    this.slotApi.getAvailable(dateStr, this.collectionType).subscribe({
      next: (s: TimeSlot[]) => {
        this.slots.set(s);
        this.selectedSlotId.set(null);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  selectSlot(slot: TimeSlot): void {
    this.selectedSlotId.set(slot.id);
    const dateStr = this.selectedDate!.toISOString().split('T')[0];
    (this.store as any).patchState({
      slotId: slot.id,
      slotDate: dateStr,
      collectionType: this.collectionType as 'home' | 'lab',
    });
  }

  notifyMe(): void {
    // Notify Me CTA — handled in collection step with pincode
    alert('We will notify you when slots become available.');
  }

  onNext(): void {
    this.next.emit();
  }
}
