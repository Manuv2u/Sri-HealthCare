import { Component, inject, OnInit, output, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TimeSlotApiService } from '../../../core/api/services/time-slot-api.service';
import { BookingWizardStore } from '../../../core/store/booking-wizard.store';
import { TimeSlot } from '../../../core/api/api.types';
import { ButtonComponent, SpinnerComponent, BadgeComponent } from '../../../shared/components';

interface DateOption {
  date: Date;
  dateStr: string;
  dayName: string;
  dayNum: number;
  monthName: string;
  isToday: boolean;
  isTomorrow: boolean;
}

@Component({
  selector: 'app-slot-selection-step-new',
  standalone: true,
  imports: [CommonModule, ButtonComponent, SpinnerComponent, BadgeComponent],
  template: `
    <div class="slot-step">
      <!-- Date Selection -->
      <div class="date-section">
        <h4 class="section-title">Select Date</h4>
        <div class="date-carousel">
          @for (d of dateOptions(); track d.dateStr) {
            <button 
              type="button"
              class="date-card"
              [class.date-card--selected]="selectedDate() === d.dateStr"
              [class.date-card--today]="d.isToday"
              (click)="selectDate(d)"
            >
              <span class="date-card__day">{{ d.dayName }}</span>
              <span class="date-card__num">{{ d.dayNum }}</span>
              <span class="date-card__month">{{ d.monthName }}</span>
              @if (d.isToday) {
                <span class="date-card__badge">Today</span>
              } @else if (d.isTomorrow) {
                <span class="date-card__badge">Tomorrow</span>
              }
            </button>
          }
        </div>
      </div>

      <!-- Time Slots -->
      <div class="slots-section">
        <h4 class="section-title">Select Time Slot</h4>
        
        @if (loadingSlots()) {
          <div class="loading-state">
            <app-spinner size="md" />
            <span>Loading available slots...</span>
          </div>
        } @else if (!selectedDate()) {
          <div class="empty-state">
            <div class="empty-state__icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
            </div>
            <p>Please select a date to see available slots</p>
          </div>
        } @else if (availableSlots().length === 0) {
          <div class="empty-state">
            <div class="empty-state__icon empty-state__icon--warning">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>
            <p>No slots available for this date. Please try another date.</p>
          </div>
        } @else {
          <div class="slots-grid">
            @for (slot of availableSlots(); track slot.id) {
              <button 
                type="button"
                class="slot-card"
                [class.slot-card--selected]="selectedSlotId() === slot.id"
                [class.slot-card--full]="slot.remaining_capacity <= 0"
                [disabled]="slot.remaining_capacity <= 0"
                (click)="selectSlot(slot)"
              >
                <div class="slot-card__time">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                  </svg>
                  {{ formatTime(slot.start_time) }} - {{ formatTime(slot.end_time) }}
                </div>
                <div class="slot-card__info">
                  @if (slot.remaining_capacity <= 0) {
                    <app-badge variant="error" size="sm">Full</app-badge>
                  } @else if (slot.remaining_capacity <= 3) {
                    <app-badge variant="warning" size="sm">{{ slot.remaining_capacity }} left</app-badge>
                  } @else {
                    <app-badge variant="success" size="sm">Available</app-badge>
                  }
                </div>
                <div class="slot-card__check" [class.slot-card__check--visible]="selectedSlotId() === slot.id">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
              </button>
            }
          </div>
        }
      </div>

      <!-- Selection Summary -->
      @if (selectedDate() && selectedSlotId()) {
        <div class="selection-summary">
          <div class="summary-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          </div>
          <div class="summary-content">
            <span class="summary-label">Your appointment</span>
            <span class="summary-value">{{ getSelectedDateDisplay() }} at {{ getSelectedSlotDisplay() }}</span>
          </div>
        </div>
      }

      <!-- Actions -->
      <div class="step-actions">
        <app-button variant="outline" size="lg" (click)="back.emit()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="btn-icon btn-icon--left">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Back
        </app-button>
        <app-button variant="primary" size="lg" [disabled]="!canProceed()" (click)="onNext()">
          Continue
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="btn-icon">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </app-button>
      </div>
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

    .slot-step {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .section-title {
      font-size: 1rem;
      font-weight: 600;
      color: #0F172A;
      margin: 0 0 1rem 0;
    }

    /* Date Carousel */
    .date-section {
      margin-bottom: 0.5rem;
    }

    .date-carousel {
      display: flex;
      gap: 0.75rem;
      overflow-x: auto;
      padding-bottom: 0.5rem;

      &::-webkit-scrollbar {
        height: 4px;
      }

      &::-webkit-scrollbar-thumb {
        background: #CBD5E1;
        border-radius: 9999px;
      }
    }

    .date-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 1rem 1.25rem;
      background: #FFFFFF;
      border: 2px solid #E2E8F0;
      border-radius: 1rem;
      cursor: pointer;
      min-width: 90px;
      transition: all 150ms;
      position: relative;

      &:hover:not(:disabled) {
        border-color: #A5B4FC;
        background: #EEF2FF;
      }

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }

    .date-card--selected {
      border-color: #6366F1;
      background: #EEF2FF;
      box-shadow: 0 4px 14px 0 rgba(99,102,241,.25);
    }

    .date-card--today {
      border-color: #FB923C;
    }

    .date-card__day {
      font-size: 0.75rem;
      font-weight: 600;
      color: #475569;
      text-transform: uppercase;
      letter-spacing: 0.025em;
    }

    .date-card__num {
      font-size: 1.5rem;
      font-weight: 700;
      color: #0F172A;
      line-height: 1.25;
      margin: 0.25rem 0;
    }

    .date-card__month {
      font-size: 0.75rem;
      color: #475569;
    }

    .date-card__badge {
      position: absolute;
      top: -8px;
      left: 50%;
      transform: translateX(-50%);
      padding: 0.125rem 0.5rem;
      background: #F97316;
      color: #FFFFFF;
      font-size: 0.625rem;
      font-weight: 700;
      border-radius: 9999px;
      text-transform: uppercase;
      letter-spacing: 0.025em;
    }

    /* Slots Grid */
    .loading-state {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
      padding: 2rem;
      color: #475569;
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 2rem;
      text-align: center;
      gap: 0.75rem;
    }

    .empty-state__icon {
      width: 56px;
      height: 56px;
      border-radius: 9999px;
      background: #F8FAFC;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #94A3B8;

      svg {
        width: 28px;
        height: 28px;
      }
    }

    .empty-state__icon--warning {
      background: #FFFBEB;
      color: #D97706;
    }

    .empty-state p {
      color: #475569;
      margin: 0;
    }

    .slots-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: 0.75rem;
    }

    .slot-card {
      position: relative;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      padding: 1rem;
      background: #FFFFFF;
      border: 2px solid #E2E8F0;
      border-radius: 0.75rem;
      cursor: pointer;
      transition: all 150ms;

      &:hover:not(:disabled) {
        border-color: #A5B4FC;
      }

      &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
        background: #F8FAFC;
      }
    }

    .slot-card--selected {
      border-color: #6366F1;
      background: #EEF2FF;
    }

    .slot-card--full {
      border-style: dashed;
    }

    .slot-card__time {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 1rem;
      font-weight: 600;
      color: #0F172A;

      svg {
        width: 18px;
        height: 18px;
        color: #94A3B8;
      }
    }

    .slot-card__info {
      display: flex;
      align-items: center;
    }

    .slot-card__check {
      position: absolute;
      top: 0.5rem;
      right: 0.5rem;
      width: 22px;
      height: 22px;
      border-radius: 9999px;
      background: #6366F1;
      color: #FFFFFF;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transform: scale(0.7);
      transition: all 150ms;

      svg {
        width: 12px;
        height: 12px;
      }
    }

    .slot-card__check--visible {
      opacity: 1;
      transform: scale(1);
    }

    /* Selection Summary */
    .selection-summary {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem;
      background: #F0FFF4;
      border-radius: 1rem;
      border: 1px solid #9AE6B4;
    }

    .summary-icon {
      width: 44px;
      height: 44px;
      border-radius: 0.75rem;
      background: #C6F6D5;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #2F855A;
      flex-shrink: 0;

      svg {
        width: 22px;
        height: 22px;
      }
    }

    .summary-content {
      display: flex;
      flex-direction: column;
      gap: 0.125rem;
    }

    .summary-label {
      font-size: 0.875rem;
      color: #276749;
    }

    .summary-value {
      font-size: 1rem;
      font-weight: 600;
      color: #22543D;
    }

    /* Step Actions */
    .step-actions {
      display: flex;
      justify-content: space-between;
      padding-top: 1rem;
      border-top: 1px solid #F1F5F9;
    }

    .btn-icon {
      width: 18px;
      height: 18px;
      margin-left: 0.5rem;
    }

    .btn-icon--left {
      margin-left: 0;
      margin-right: 0.5rem;
    }

    @media (prefers-reduced-motion: reduce) {
      .date-card,
      .slot-card,
      .slot-card__check {
        transition: none;
      }
    }
  `]
})
export class SlotSelectionStepNewComponent implements OnInit {
  next = output<void>();
  back = output<void>();

  private timeSlotApi = inject(TimeSlotApiService);
  readonly store = inject(BookingWizardStore);

  /* State */
  loadingSlots = signal(false);
  availableSlots = signal<TimeSlot[]>([]);
  selectedDate = signal<string | null>(null);
  selectedSlotId = signal<string | null>(null);

  dateOptions = signal<DateOption[]>([]);

  ngOnInit(): void {
    this.generateDateOptions();
  }

  private generateDateOptions(): void {
    const options: DateOption[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < 14; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);

      // Build the string from local date components rather than
      // toISOString() — toISOString() converts to UTC first, which rolls
      // the date back by one day in timezones ahead of UTC (e.g. IST),
      // silently booking "today" when the user picked a later date.
      const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

      options.push({
        date,
        dateStr,
        dayName: dayNames[date.getDay()],
        dayNum: date.getDate(),
        monthName: monthNames[date.getMonth()],
        isToday: i === 0,
        isTomorrow: i === 1
      });
    }

    this.dateOptions.set(options);
  }

  selectDate(option: DateOption): void {
    this.selectedDate.set(option.dateStr);
    this.selectedSlotId.set(null);
    this.loadSlots(option.dateStr);
  }

  private loadSlots(date: string): void {
    const collectionType = this.store.collectionType();
    if (!collectionType) return;

    this.loadingSlots.set(true);
    this.timeSlotApi.getAvailable(date, collectionType).subscribe({
      next: (slots) => {
        this.availableSlots.set(slots.filter(s => s.is_enabled));
        this.loadingSlots.set(false);
      },
      error: () => {
        this.availableSlots.set([]);
        this.loadingSlots.set(false);
      }
    });
  }

  selectSlot(slot: TimeSlot): void {
    if (slot.remaining_capacity <= 0) return;
    this.selectedSlotId.set(slot.id);
  }

  formatTime(time: string): string {
    const [hours, minutes] = time.split(':');
    const h = parseInt(hours, 10);
    const suffix = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12}:${minutes} ${suffix}`;
  }

  getSelectedDateDisplay(): string {
    const opt = this.dateOptions().find(d => d.dateStr === this.selectedDate());
    if (!opt) return '';
    return `${opt.dayName}, ${opt.dayNum} ${opt.monthName}`;
  }

  getSelectedSlotDisplay(): string {
    const slot = this.availableSlots().find(s => s.id === this.selectedSlotId());
    if (!slot) return '';
    return `${this.formatTime(slot.start_time)} - ${this.formatTime(slot.end_time)}`;
  }

  canProceed(): boolean {
    return !!this.selectedDate() && !!this.selectedSlotId();
  }

  onNext(): void {
    if (!this.canProceed()) return;

    this.store.patch({
      slotId: this.selectedSlotId(),
      slotDate: this.selectedDate()
    });

    this.next.emit();
  }
}
