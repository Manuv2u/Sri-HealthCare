import { Component, inject, OnInit, output, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { TimeSlotApiService } from '../../../core/api/services/time-slot-api.service';
import { BookingWizardStore } from '../../../core/store/booking-wizard.store';
import { TimeSlot } from '../../../core/api/api.types';

interface DayPill {
  dateStr: string;   // YYYY-MM-DD
  dayName: string;   // Mon, Tue …
  dayNum: number;    // 14
  monthShort: string; // Jun
  isToday: boolean;
}

@Component({
  selector: 'app-slot-selection-step',
  standalone: true,
  imports: [CommonModule, MatIconModule, FormsModule],
  template: `
    <div class="step-wrap">

      <!-- Header -->
      <div class="step-header">
        <div class="header-eyebrow">
          <span class="eyebrow-dot"></span>
          <span class="eyebrow-text">Step 3 of 4</span>
        </div>
        <h2>Pick a Time Slot</h2>
        <p class="header-sub">Select a convenient date and appointment slot</p>
      </div>

      <!-- Date section -->
      <div class="date-section">
        <div class="date-section-label">
          <mat-icon class="label-icon">calendar_month</mat-icon>
          <span>Choose Date</span>
        </div>

        <!-- 7-day pill strip -->
        <div class="pill-strip-wrapper">
          <div class="pill-strip">
            @for (day of dayPills; track day.dateStr) {
              <button
                class="day-pill"
                [class.today]="day.isToday"
                [class.selected]="selectedDateStr === day.dateStr"
                (click)="selectDateFromPill(day.dateStr)">
                <span class="pill-day">{{ day.dayName }}</span>
                <span class="pill-num">{{ day.dayNum }}</span>
                <span class="pill-month">{{ day.monthShort }}</span>
                @if (day.isToday) {
                  <span class="today-dot"></span>
                }
              </button>
            }
          </div>
        </div>

        <!-- Custom date input -->
        <div class="custom-date-row">
          <span class="custom-date-label">Other date</span>
          <div class="date-input-wrap">
            <mat-icon class="date-icon">edit_calendar</mat-icon>
            <input
              type="date"
              [(ngModel)]="selectedDateStr"
              [min]="minDateStr"
              (ngModelChange)="onDateChange()"
              class="date-native" />
          </div>
        </div>
      </div>

      <!-- Slot area -->
      @if (selectedDateStr) {
        @if (loading()) {
          <div class="slots-container">
            <div class="section-header skeleton-header">
              <div class="skeleton-title"></div>
            </div>
            <div class="slots-grid">
              @for (i of [1,2,3,4,5,6]; track i) {
                <div class="skeleton-slot">
                  <div class="sk-line sk-time"></div>
                  <div class="sk-dots"></div>
                </div>
              }
            </div>
          </div>
        } @else if (slots().length === 0) {
          <div class="empty-state">
            <div class="empty-icon-wrap">
              <mat-icon>event_busy</mat-icon>
            </div>
            <p class="empty-title">No slots available</p>
            <p class="empty-sub">Try selecting a different date above</p>
          </div>
        } @else {
          <div class="slots-container">
            <!-- Morning -->
            @if (morningSlots().length > 0) {
              <div class="time-section">
                <div class="section-header">
                  <div class="section-icon morning-icon">
                    <mat-icon>wb_sunny</mat-icon>
                  </div>
                  <span class="section-title">Morning</span>
                  <span class="section-count">{{ morningSlots().length }} slots</span>
                </div>
                <div class="slots-grid">
                  @for (slot of morningSlots(); track slot.id) {
                    <button
                      class="slot-card"
                      [class.selected]="selectedSlotId() === slot.id"
                      [class.full]="slot.remaining_capacity === 0"
                      [class.few-left]="slot.remaining_capacity > 0 && slot.remaining_capacity <= 3"
                      [disabled]="slot.remaining_capacity === 0"
                      (click)="selectSlot(slot)">
                      <span class="slot-time">{{ slot.label }}</span>
                      <div class="slot-meta">
                        <div class="capacity-dots">
                          @for (dot of getCapacityDots(slot.remaining_capacity, slot.max_capacity); track $index) {
                            <span class="cap-dot" [class.filled]="dot"></span>
                          }
                        </div>
                        @if (slot.remaining_capacity === 0) {
                          <span class="slot-badge badge-full">Full</span>
                        } @else if (slot.remaining_capacity <= 3) {
                          <span class="slot-badge badge-few">{{ slot.remaining_capacity }} left</span>
                        }
                      </div>
                    </button>
                  }
                </div>
              </div>
            }

            <!-- Afternoon -->
            @if (afternoonSlots().length > 0) {
              <div class="time-section">
                <div class="section-header">
                  <div class="section-icon afternoon-icon">
                    <mat-icon>wb_twilight</mat-icon>
                  </div>
                  <span class="section-title">Afternoon</span>
                  <span class="section-count">{{ afternoonSlots().length }} slots</span>
                </div>
                <div class="slots-grid">
                  @for (slot of afternoonSlots(); track slot.id) {
                    <button
                      class="slot-card"
                      [class.selected]="selectedSlotId() === slot.id"
                      [class.full]="slot.remaining_capacity === 0"
                      [class.few-left]="slot.remaining_capacity > 0 && slot.remaining_capacity <= 3"
                      [disabled]="slot.remaining_capacity === 0"
                      (click)="selectSlot(slot)">
                      <span class="slot-time">{{ slot.label }}</span>
                      <div class="slot-meta">
                        <div class="capacity-dots">
                          @for (dot of getCapacityDots(slot.remaining_capacity, slot.max_capacity); track $index) {
                            <span class="cap-dot" [class.filled]="dot"></span>
                          }
                        </div>
                        @if (slot.remaining_capacity === 0) {
                          <span class="slot-badge badge-full">Full</span>
                        } @else if (slot.remaining_capacity <= 3) {
                          <span class="slot-badge badge-few">{{ slot.remaining_capacity }} left</span>
                        }
                      </div>
                    </button>
                  }
                </div>
              </div>
            }

            <!-- Evening -->
            @if (eveningSlots().length > 0) {
              <div class="time-section">
                <div class="section-header">
                  <div class="section-icon evening-icon">
                    <mat-icon>nights_stay</mat-icon>
                  </div>
                  <span class="section-title">Evening</span>
                  <span class="section-count">{{ eveningSlots().length }} slots</span>
                </div>
                <div class="slots-grid">
                  @for (slot of eveningSlots(); track slot.id) {
                    <button
                      class="slot-card"
                      [class.selected]="selectedSlotId() === slot.id"
                      [class.full]="slot.remaining_capacity === 0"
                      [class.few-left]="slot.remaining_capacity > 0 && slot.remaining_capacity <= 3"
                      [disabled]="slot.remaining_capacity === 0"
                      (click)="selectSlot(slot)">
                      <span class="slot-time">{{ slot.label }}</span>
                      <div class="slot-meta">
                        <div class="capacity-dots">
                          @for (dot of getCapacityDots(slot.remaining_capacity, slot.max_capacity); track $index) {
                            <span class="cap-dot" [class.filled]="dot"></span>
                          }
                        </div>
                        @if (slot.remaining_capacity === 0) {
                          <span class="slot-badge badge-full">Full</span>
                        } @else if (slot.remaining_capacity <= 3) {
                          <span class="slot-badge badge-few">{{ slot.remaining_capacity }} left</span>
                        }
                      </div>
                    </button>
                  }
                </div>
              </div>
            }
          </div>
        }
      } @else {
        <div class="date-prompt">
          <div class="prompt-icon-wrap">
            <mat-icon>touch_app</mat-icon>
          </div>
          <p class="prompt-title">Select a date above</p>
          <p class="prompt-sub">Available slots will appear here</p>
        </div>
      }

      <!-- Actions -->
      <div class="step-actions">
        <button class="btn-back" (click)="back.emit()">
          <mat-icon>arrow_back_ios</mat-icon>
          <span>Back</span>
        </button>
        <button class="btn-next" [disabled]="!selectedSlotId()" (click)="onNext()">
          <span>Continue</span>
          <mat-icon>arrow_forward_ios</mat-icon>
        </button>
      </div>

    </div>
  `,
  styles: [`
    /* ── Tokens ─────────────────────────────────────────────── */
    :host {
      --indigo:       #6366F1;
      --indigo-dark:  #4F46E5;
      --indigo-light: #EEF2FF;
      --indigo-mid:   #C7D2FE;
      --orange:       #F97316;
      --orange-dark:  #EA580C;
      --orange-light: #FFF7ED;
      --orange-mid:   #FDBA74;
      --success:      #22C55E;
      --warning:      #F59E0B;
      --error:        #EF4444;
      --bg:           #F8F9FF;
      --surface:      #FFFFFF;
      --text:         #0F172A;
      --text-2:       #475569;
      --muted:        #94A3B8;
      --border:       #E2E8F0;
      --border-focus: #A5B4FC;
      --radius:       12px;
      --radius-lg:    16px;
      --radius-xl:    20px;
      --radius-pill:  999px;
      --shadow-sm:    0 1px 3px rgba(15,23,42,.06), 0 1px 2px rgba(15,23,42,.04);
      --shadow-md:    0 4px 12px rgba(15,23,42,.08), 0 2px 4px rgba(15,23,42,.04);
      --shadow-indigo: 0 4px 16px rgba(99,102,241,.25);
      --shadow-orange: 0 4px 16px rgba(249,115,22,.22);
      --font: 'Inter', system-ui, -apple-system, sans-serif;
    }

    /* ── Wrap ────────────────────────────────────────────────── */
    .step-wrap {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      font-family: var(--font);
      color: var(--text);
      -webkit-font-smoothing: antialiased;
    }

    /* ── Header ──────────────────────────────────────────────── */
    .step-header { display: flex; flex-direction: column; gap: .3rem; }

    .header-eyebrow {
      display: inline-flex;
      align-items: center;
      gap: .4rem;
      margin-bottom: .15rem;
    }
    .eyebrow-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--indigo);
      flex-shrink: 0;
    }
    .eyebrow-text {
      font-size: .72rem;
      font-weight: 700;
      letter-spacing: .08em;
      text-transform: uppercase;
      color: var(--indigo);
    }

    .step-header h2 {
      font-size: 1.35rem;
      font-weight: 800;
      color: var(--text);
      letter-spacing: -.02em;
      line-height: 1.2;
      text-wrap: balance;
    }
    .header-sub {
      font-size: .875rem;
      color: var(--text-2);
      margin: 0;
    }

    /* ── Date section ────────────────────────────────────────── */
    .date-section {
      display: flex;
      flex-direction: column;
      gap: .85rem;
      background: var(--surface);
      border: 1.5px solid var(--border);
      border-radius: var(--radius-lg);
      padding: 1rem 1rem .9rem;
      box-shadow: var(--shadow-sm);
    }

    .date-section-label {
      display: flex;
      align-items: center;
      gap: .4rem;
      font-size: .8rem;
      font-weight: 700;
      letter-spacing: .05em;
      text-transform: uppercase;
      color: var(--text-2);
    }
    .label-icon {
      font-size: 1rem !important;
      width: 1rem !important;
      height: 1rem !important;
      color: var(--indigo);
    }

    /* Pill strip */
    .pill-strip-wrapper {
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      scrollbar-width: none;
      margin: 0 -1rem;
      padding: 0 1rem;
    }
    .pill-strip-wrapper::-webkit-scrollbar { display: none; }

    .pill-strip {
      display: flex;
      gap: .5rem;
      width: max-content;
      padding-bottom: 2px; /* leave room for focus ring */
    }

    .day-pill {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: .1rem;
      padding: .6rem .75rem .55rem;
      border-radius: var(--radius);
      border: 1.5px solid var(--border);
      background: var(--bg);
      cursor: pointer;
      transition: border-color .15s, background .15s, box-shadow .15s, transform .1s;
      position: relative;
      min-width: 52px;
      outline: none;
    }
    .day-pill:hover:not(.selected) {
      border-color: var(--indigo-mid);
      background: var(--indigo-light);
      transform: translateY(-1px);
    }
    .day-pill:focus-visible {
      box-shadow: 0 0 0 3px var(--border-focus);
    }
    .day-pill.today {
      border-color: var(--orange-mid);
      background: var(--orange-light);
    }
    .day-pill.today:hover:not(.selected) {
      border-color: var(--orange);
    }
    .day-pill.selected {
      border-color: var(--indigo);
      background: var(--indigo);
      box-shadow: var(--shadow-indigo);
      transform: translateY(-1px);
    }
    .day-pill.selected.today {
      border-color: var(--indigo);
      background: var(--indigo);
    }

    .pill-day {
      font-size: .65rem;
      font-weight: 700;
      letter-spacing: .06em;
      text-transform: uppercase;
      color: var(--muted);
    }
    .pill-num {
      font-size: 1.05rem;
      font-weight: 800;
      color: var(--text);
      line-height: 1;
      font-variant-numeric: tabular-nums;
    }
    .pill-month {
      font-size: .6rem;
      font-weight: 600;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: .04em;
    }

    .day-pill.today .pill-day { color: var(--orange); }
    .day-pill.today .pill-num { color: var(--orange-dark); }
    .day-pill.today .pill-month { color: var(--orange); }

    .day-pill.selected .pill-day,
    .day-pill.selected .pill-num,
    .day-pill.selected .pill-month { color: rgba(255,255,255,.92); }

    .today-dot {
      position: absolute;
      bottom: .3rem;
      left: 50%;
      transform: translateX(-50%);
      width: 4px;
      height: 4px;
      border-radius: 50%;
      background: var(--orange);
    }
    .day-pill.selected .today-dot { background: rgba(255,255,255,.7); }

    /* Custom date row */
    .custom-date-row {
      display: flex;
      align-items: center;
      gap: .75rem;
      padding-top: .5rem;
      border-top: 1px solid var(--border);
    }
    .custom-date-label {
      font-size: .75rem;
      font-weight: 600;
      color: var(--muted);
      white-space: nowrap;
    }
    .date-input-wrap {
      display: flex;
      align-items: center;
      gap: .5rem;
      flex: 1;
      background: var(--bg);
      border: 1.5px solid var(--border);
      border-radius: var(--radius);
      padding: .45rem .75rem;
      transition: border-color .15s, background .15s;
    }
    .date-input-wrap:focus-within {
      border-color: var(--indigo);
      background: var(--surface);
      box-shadow: 0 0 0 3px var(--indigo-light);
    }
    .date-icon {
      font-size: 1rem !important;
      width: 1rem !important;
      height: 1rem !important;
      color: var(--muted);
      flex-shrink: 0;
    }
    .date-native {
      flex: 1;
      border: none;
      outline: none;
      font-size: .875rem;
      font-weight: 500;
      color: var(--text);
      background: transparent;
      font-family: var(--font);
      cursor: pointer;
    }
    .date-native::-webkit-calendar-picker-indicator {
      cursor: pointer;
      opacity: .5;
    }

    /* ── Slots container ─────────────────────────────────────── */
    .slots-container {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    /* Time sections */
    .time-section { display: flex; flex-direction: column; gap: .65rem; }

    .section-header {
      display: flex;
      align-items: center;
      gap: .5rem;
    }
    .section-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 26px;
      height: 26px;
      border-radius: 8px;
      flex-shrink: 0;
    }
    .section-icon mat-icon {
      font-size: .95rem !important;
      width: .95rem !important;
      height: .95rem !important;
    }
    .morning-icon   { background: #FEF9C3; color: #CA8A04; }
    .morning-icon mat-icon { color: #CA8A04; }
    .afternoon-icon { background: #FFEDD5; color: var(--orange-dark); }
    .afternoon-icon mat-icon { color: var(--orange-dark); }
    .evening-icon   { background: #EDE9FE; color: #7C3AED; }
    .evening-icon mat-icon { color: #7C3AED; }

    .section-title {
      font-size: .85rem;
      font-weight: 700;
      color: var(--text);
    }
    .section-count {
      font-size: .72rem;
      font-weight: 600;
      color: var(--muted);
      margin-left: auto;
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: var(--radius-pill);
      padding: .1rem .5rem;
    }

    /* Slot grid */
    .slots-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: .6rem;
    }

    /* Slot card */
    .slot-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: .45rem;
      padding: .7rem .4rem .65rem;
      border-radius: var(--radius);
      border: 1.5px solid var(--border);
      background: var(--surface);
      cursor: pointer;
      transition: border-color .15s, background .15s, box-shadow .15s, transform .12s;
      outline: none;
      position: relative;
      overflow: visible;
    }
    .slot-card:hover:not(:disabled):not(.full) {
      border-color: var(--indigo-mid);
      background: var(--indigo-light);
      transform: translateY(-2px);
      box-shadow: var(--shadow-sm);
    }
    .slot-card:focus-visible {
      box-shadow: 0 0 0 3px var(--border-focus);
    }
    .slot-card.selected {
      border-color: var(--indigo);
      background: var(--indigo);
      box-shadow: var(--shadow-indigo);
      transform: translateY(-2px);
    }
    .slot-card.few-left:not(.selected) {
      border-color: var(--orange-mid);
      background: var(--orange-light);
    }
    .slot-card.few-left:hover:not(:disabled):not(.selected) {
      border-color: var(--orange);
    }
    .slot-card.full {
      opacity: .4;
      cursor: not-allowed;
      background: var(--bg);
    }

    .slot-time {
      font-size: .8rem;
      font-weight: 700;
      color: var(--text);
      line-height: 1.2;
      text-align: center;
      font-variant-numeric: tabular-nums;
    }
    .slot-card.selected .slot-time { color: #fff; }
    .slot-card.full .slot-time { text-decoration: line-through; color: var(--muted); }

    .slot-meta {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: .25rem;
      width: 100%;
    }

    /* Capacity dots */
    .capacity-dots {
      display: flex;
      gap: 3px;
      align-items: center;
      justify-content: center;
    }
    .cap-dot {
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background: var(--border);
      transition: background .15s;
    }
    .cap-dot.filled { background: var(--indigo-mid); }
    .slot-card.selected .cap-dot { background: rgba(255,255,255,.35); }
    .slot-card.selected .cap-dot.filled { background: rgba(255,255,255,.8); }
    .slot-card.few-left:not(.selected) .cap-dot.filled { background: var(--orange-mid); }

    /* Badges */
    .slot-badge {
      font-size: .6rem;
      font-weight: 700;
      padding: .1rem .4rem;
      border-radius: var(--radius-pill);
      letter-spacing: .03em;
      text-transform: uppercase;
    }
    .badge-full {
      background: #FEE2E2;
      color: #B91C1C;
    }
    .badge-few {
      background: var(--orange);
      color: #fff;
    }
    .slot-card.selected .slot-badge {
      background: rgba(255,255,255,.22);
      color: rgba(255,255,255,.92);
    }

    /* ── Empty / Prompt states ───────────────────────────────── */
    .date-prompt,
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: .6rem;
      padding: 2.5rem 1rem;
    }
    .prompt-icon-wrap,
    .empty-icon-wrap {
      width: 52px;
      height: 52px;
      border-radius: var(--radius-lg);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .prompt-icon-wrap {
      background: var(--indigo-light);
    }
    .prompt-icon-wrap mat-icon { color: var(--indigo); font-size: 1.4rem !important; width: 1.4rem !important; height: 1.4rem !important; }
    .empty-icon-wrap {
      background: #FEE2E2;
    }
    .empty-icon-wrap mat-icon { color: var(--error); font-size: 1.4rem !important; width: 1.4rem !important; height: 1.4rem !important; }

    .prompt-title,
    .empty-title {
      font-size: .95rem;
      font-weight: 700;
      color: var(--text);
      margin: 0;
    }
    .prompt-sub,
    .empty-sub {
      font-size: .82rem;
      color: var(--muted);
      margin: 0;
      text-align: center;
    }

    /* ── Skeleton ────────────────────────────────────────────── */
    @keyframes shimmer {
      0%   { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
    .skeleton-header { margin-bottom: -.2rem; }
    .skeleton-title {
      height: 14px;
      width: 90px;
      border-radius: 6px;
      background: linear-gradient(90deg, #E8EAFF 25%, #D1D5F8 50%, #E8EAFF 75%);
      background-size: 200% 100%;
      animation: shimmer 1.4s ease-in-out infinite;
    }
    .skeleton-slot {
      height: 72px;
      border-radius: var(--radius);
      background: linear-gradient(90deg, #F1F2FF 25%, #E5E7F8 50%, #F1F2FF 75%);
      background-size: 200% 100%;
      animation: shimmer 1.4s ease-in-out infinite;
      border: 1.5px solid var(--border);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: .4rem;
      padding: .7rem .4rem;
    }
    .sk-line {
      border-radius: 4px;
      background: rgba(99,102,241,.12);
    }
    .sk-time { width: 60%; height: 10px; }
    .sk-dots { width: 40%; height: 8px; border-radius: 4px; background: rgba(99,102,241,.08); }

    /* ── Actions ─────────────────────────────────────────────── */
    .step-actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: .25rem;
      gap: .75rem;
    }

    .btn-back {
      display: inline-flex;
      align-items: center;
      gap: .35rem;
      padding: .65rem 1.1rem;
      border-radius: var(--radius);
      border: 1.5px solid var(--border);
      background: var(--surface);
      font-size: .875rem;
      font-weight: 600;
      color: var(--text-2);
      cursor: pointer;
      transition: border-color .15s, color .15s, background .15s;
      font-family: var(--font);
      outline: none;
    }
    .btn-back mat-icon {
      font-size: .85rem !important;
      width: .85rem !important;
      height: .85rem !important;
    }
    .btn-back:hover {
      border-color: var(--indigo-mid);
      color: var(--indigo);
      background: var(--indigo-light);
    }
    .btn-back:focus-visible {
      box-shadow: 0 0 0 3px var(--border-focus);
    }

    .btn-next {
      display: inline-flex;
      align-items: center;
      gap: .35rem;
      padding: .7rem 1.5rem;
      border-radius: var(--radius);
      border: none;
      background: var(--indigo);
      color: #fff;
      font-size: .9rem;
      font-weight: 700;
      cursor: pointer;
      transition: background .15s, box-shadow .15s, transform .1s;
      font-family: var(--font);
      outline: none;
    }
    .btn-next mat-icon {
      font-size: .85rem !important;
      width: .85rem !important;
      height: .85rem !important;
    }
    .btn-next:hover:not(:disabled) {
      background: var(--indigo-dark);
      box-shadow: var(--shadow-indigo);
      transform: translateY(-1px);
    }
    .btn-next:focus-visible {
      box-shadow: 0 0 0 3px var(--border-focus);
    }
    .btn-next:disabled {
      opacity: .45;
      cursor: not-allowed;
      transform: none;
      box-shadow: none;
    }

    /* ── Responsive ──────────────────────────────────────────── */
    @media (max-width: 480px) {
      .slots-grid { grid-template-columns: repeat(2, 1fr); }
      .slot-time { font-size: .75rem; }
    }
    @media (max-width: 340px) {
      .slots-grid { grid-template-columns: repeat(2, 1fr); }
      .btn-next { padding: .65rem 1rem; font-size: .82rem; }
    }
  `],
})
export class SlotSelectionStepComponent implements OnInit {
  next = output<void>();
  back = output<void>();

  private slotApi = inject(TimeSlotApiService);
  readonly store = inject(BookingWizardStore);

  minDateStr = new Date().toISOString().split('T')[0];
  selectedDateStr = '';
  loading = signal(false);
  slots = signal<TimeSlot[]>([]);
  selectedSlotId = signal<string | null>(null);

  dayPills: DayPill[] = [];

  // Slot groupings
  morningSlots   = computed(() => this.slots().filter(s => this.getHour(s.start_time) < 12));
  afternoonSlots = computed(() => this.slots().filter(s => { const h = this.getHour(s.start_time); return h >= 12 && h < 17; }));
  eveningSlots   = computed(() => this.slots().filter(s => this.getHour(s.start_time) >= 17));

  ngOnInit(): void {
    this.buildDayPills();
    const stored = this.store.slotDate();
    if (stored) {
      this.selectedDateStr = stored;
      this.loadSlots();
    }
  }

  private buildDayPills(): void {
    const DAY_NAMES  = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const MON_NAMES  = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const today = new Date();
    this.dayPills = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      return {
        dateStr,
        dayName:    DAY_NAMES[d.getDay()],
        dayNum:     d.getDate(),
        monthShort: MON_NAMES[d.getMonth()],
        isToday:    i === 0,
      };
    });
  }

  selectDateFromPill(dateStr: string): void {
    this.selectedDateStr = dateStr;
    this.onDateChange();
  }

  onDateChange(): void {
    this.selectedSlotId.set(null);
    this.loadSlots();
  }

  loadSlots(): void {
    if (!this.selectedDateStr) return;
    const collectionType = this.store.collectionType() ?? 'lab';
    this.loading.set(true);
    this.slotApi.getAvailable(this.selectedDateStr, collectionType).subscribe({
      next: (s: TimeSlot[]) => {
        this.slots.set(this.filterPastSlots(s));
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  private isToday(): boolean {
    return this.selectedDateStr === this.minDateStr;
  }

  private filterPastSlots(slots: TimeSlot[]): TimeSlot[] {
    if (!this.isToday()) return slots;
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    return slots.filter((slot: TimeSlot) => {
      const parts = slot.start_time.split(':');
      const slotMinutes = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
      return slotMinutes > nowMinutes;
    });
  }

  private getHour(startTime: string): number {
    return parseInt(startTime.split(':')[0], 10);
  }

  /**
   * Returns an array of booleans (true = filled dot) for capacity visualization.
   * Shows up to 5 dots max.
   */
  getCapacityDots(remaining: number, maxCapacity: number): boolean[] {
    const cap = maxCapacity ?? 5;
    const dotCount = Math.min(cap, 5);
    const filledCount = Math.min(remaining ?? 0, dotCount);
    return Array.from({ length: dotCount }, (_, i) => i < filledCount);
  }

  selectSlot(slot: TimeSlot): void {
    this.selectedSlotId.set(slot.id);
    this.store.patch({ slotId: slot.id, slotDate: this.selectedDateStr });
  }

  onNext(): void { this.next.emit(); }
}
