import { Component, inject, OnInit, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { TimeSlotApiService } from '../../../core/api/services/time-slot-api.service';
import { BookingWizardStore } from '../../../core/store/booking-wizard.store';
import { TimeSlot } from '../../../core/api/api.types';

@Component({
  selector: 'app-slot-selection-step',
  standalone: true,
  imports: [CommonModule, MatIconModule, FormsModule, MatDatepickerModule, MatNativeDateModule, MatFormFieldModule, MatInputModule],
  template: `
    <div class="step-wrap">
      <div class="step-header">
        <h2>Choose a Time Slot</h2>
        <p>Select a date and available slot for your visit</p>
      </div>

      <!-- Date picker -->
      <div class="date-section">
        <label class="field-label">Select Date</label>
        <mat-form-field appearance="outline" class="date-field">
          <mat-label>Pick a date</mat-label>
          <input matInput [matDatepicker]="picker" [(ngModel)]="selectedDate"
            (ngModelChange)="onDateChange()" [min]="minDate" />
          <mat-datepicker-toggle matIconSuffix [for]="picker" />
          <mat-datepicker #picker />
        </mat-form-field>
      </div>

      <!-- Slots -->
      @if (selectedDate) {
        @if (loading()) {
          <div class="skeleton-list">
            @for (i of [1,2,3,4]; track i) { <div class="skeleton-slot"></div> }
          </div>
        } @else if (slots().length === 0) {
          <div class="empty-state">
            <mat-icon>event_busy</mat-icon>
            <p>No slots available for this date. Please try another date.</p>
          </div>
        } @else {
          <div class="slots-grid">
            @for (slot of slots(); track slot.id) {
              <button class="slot-btn"
                [class.selected]="selectedSlotId() === slot.id"
                [class.full]="slot.remaining_capacity === 0"
                [disabled]="slot.remaining_capacity === 0"
                (click)="selectSlot(slot)">
                <span class="slot-time">{{ slot.label }}</span>
                @if (slot.remaining_capacity === 0) {
                  <span class="slot-badge full-badge">Full</span>
                } @else if (slot.remaining_capacity <= 3) {
                  <span class="slot-badge few-badge">{{ slot.remaining_capacity }} left</span>
                }
              </button>
            }
          </div>
        }
      } @else {
        <div class="date-prompt">
          <mat-icon>calendar_today</mat-icon>
          <p>Please select a date to see available slots</p>
        </div>
      }

      <div class="step-actions">
        <button class="btn-back" (click)="back.emit()">
          <mat-icon>arrow_back</mat-icon> Back
        </button>
        <button class="btn-next" [disabled]="!selectedSlotId()" (click)="onNext()">
          Continue <mat-icon>arrow_forward</mat-icon>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .step-wrap { display: flex; flex-direction: column; gap: 1.25rem; }
    .step-header h2 { font-size: 1.25rem; font-weight: 800; color: #1a202c; margin-bottom: .25rem; }
    .step-header p { font-size: .875rem; color: #718096; }

    .date-section { display: flex; flex-direction: column; gap: .4rem; }
    .field-label { font-size: .85rem; font-weight: 600; color: #4a5568; }
    .date-field { width: 100%; }

    .slots-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: .6rem; }
    .slot-btn {
      display: flex; flex-direction: column; align-items: center; gap: .25rem;
      padding: .75rem .5rem; border-radius: 10px; border: 1.5px solid #e2e8f0;
      background: #fff; cursor: pointer; transition: all .15s;
      &:hover:not(:disabled):not(.full) { border-color: #00796b; background: #f0fdf9; }
      &.selected { border-color: #00796b; background: #00796b; color: #fff; }
      &.full { opacity: .45; cursor: not-allowed; }
    }
    .slot-time { font-size: .82rem; font-weight: 700; }
    .slot-badge { font-size: .65rem; font-weight: 700; padding: .1rem .35rem; border-radius: 4px; }
    .full-badge { background: #fed7d7; color: #c53030; }
    .few-badge { background: #fefcbf; color: #744210; }
    .slot-btn.selected .slot-badge { background: rgba(255,255,255,.25); color: #fff; }

    .date-prompt { display: flex; flex-direction: column; align-items: center; gap: .5rem; padding: 2rem; color: #a0aec0;
      mat-icon { font-size: 2rem; width: 2rem; height: 2rem; }
      p { font-size: .875rem; }
    }
    .empty-state { display: flex; flex-direction: column; align-items: center; gap: .5rem; padding: 2rem; color: #a0aec0;
      mat-icon { font-size: 2rem; width: 2rem; height: 2rem; }
      p { font-size: .875rem; text-align: center; }
    }

    .skeleton-list { display: grid; grid-template-columns: repeat(3, 1fr); gap: .6rem; }
    .skeleton-slot { height: 60px; border-radius: 10px; background: linear-gradient(90deg,#f0f4f8 25%,#e2e8f0 50%,#f0f4f8 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; }
    @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }

    .step-actions { display: flex; justify-content: space-between; align-items: center; padding-top: .25rem; }
    .btn-back {
      display: inline-flex; align-items: center; gap: .4rem;
      background: none; border: 1.5px solid #e2e8f0; border-radius: 10px;
      padding: .6rem 1.25rem; font-size: .875rem; font-weight: 600; color: #4a5568; cursor: pointer; transition: all .15s;
      mat-icon { font-size: 1rem; width: 1rem; height: 1rem; }
      &:hover { border-color: #00796b; color: #00796b; }
    }
    .btn-next {
      display: inline-flex; align-items: center; gap: .4rem;
      background: #00796b; color: #fff; border: none; border-radius: 10px;
      padding: .65rem 1.5rem; font-size: .9rem; font-weight: 700; cursor: pointer; transition: background .15s;
      mat-icon { font-size: 1rem; width: 1rem; height: 1rem; }
      &:hover:not(:disabled) { background: #00695c; }
      &:disabled { opacity: .5; cursor: not-allowed; }
    }

    @media (max-width: 480px) { .slots-grid { grid-template-columns: repeat(2, 1fr); } }
  `],
})
export class SlotSelectionStepComponent implements OnInit {
  next = output<void>();
  back = output<void>();

  private slotApi = inject(TimeSlotApiService);
  readonly store = inject(BookingWizardStore);

  minDate = new Date();
  selectedDate: Date | null = null;
  loading = signal(false);
  slots = signal<TimeSlot[]>([]);
  selectedSlotId = signal<string | null>(null);

  ngOnInit(): void {
    // Restore previously selected slot date if navigating back
    const stored = this.store.slotDate();
    if (stored) {
      this.selectedDate = new Date(stored + 'T00:00:00');
      this.loadSlots();
    }
  }

  onDateChange(): void {
    this.selectedSlotId.set(null);
    this.loadSlots();
  }

  loadSlots(): void {
    if (!this.selectedDate) return;
    const dateStr = this.selectedDate.toISOString().split('T')[0];
    const collectionType = this.store.collectionType() ?? 'lab';
    this.loading.set(true);
    this.slotApi.getAvailable(dateStr, collectionType).subscribe({
      next: (s: TimeSlot[]) => { this.slots.set(s); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  selectSlot(slot: TimeSlot): void {
    this.selectedSlotId.set(slot.id);
    const dateStr = this.selectedDate!.toISOString().split('T')[0];
    this.store.patch({ slotId: slot.id, slotDate: dateStr });
  }

  onNext(): void { this.next.emit(); }
}
