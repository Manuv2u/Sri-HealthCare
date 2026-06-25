import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatInputModule } from '@angular/material/input';
import { BookingApiService } from '../../../core/api/services/booking-api.service';
import { Booking } from '../../../core/api/api.types';

const STATUS_TRANSITIONS: Record<string, string | null> = {
  booked: 'collected',
  collected: 'processing',
  processing: 'completed',
  completed: null,
  cancelled: null,
};

const STATUS_LABELS: Record<string, string> = {
  booked: 'Booked',
  collected: 'Collected',
  processing: 'Processing',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

// Left-border stripe colors and chip colors per status
const STATUS_CONFIG: Record<string, { border: string; chip: string; chipText: string; dot: string }> = {
  booked:     { border: '#F97316', chip: '#FFF7ED', chipText: '#C2410C', dot: '#F97316' },
  collected:  { border: '#6366F1', chip: '#EEF2FF', chipText: '#4338CA', dot: '#6366F1' },
  processing: { border: '#8B5CF6', chip: '#F5F3FF', chipText: '#6D28D9', dot: '#8B5CF6' },
  completed:  { border: '#22C55E', chip: '#F0FDF4', chipText: '#15803D', dot: '#22C55E' },
  cancelled:  { border: '#EF4444', chip: '#FEF2F2', chipText: '#B91C1C', dot: '#EF4444' },
};

@Component({
  selector: 'app-technician-bookings',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatButtonModule, MatIconModule, MatSelectModule, MatFormFieldModule,
    MatChipsModule, MatSnackBarModule, MatDialogModule, MatInputModule,
  ],
  template: `
    <div class="page">

      <!-- Page Header -->
      <div class="page-header">
        <div class="header-left">
          <div class="header-eyebrow">
            <mat-icon class="eyebrow-icon">today</mat-icon>
            <span>{{ todayLabel }}</span>
          </div>
          <h1 class="page-title">Today's Assignments</h1>
        </div>
        <div class="header-right">
          @if (!loading()) {
            <div class="total-badge">
              <span class="total-num">{{ total() }}</span>
              <span class="total-label">{{ total() === 1 ? 'booking' : 'bookings' }}</span>
            </div>
          }
          <button class="refresh-btn" (click)="load()" [disabled]="loading()" aria-label="Refresh">
            <mat-icon [class.spin]="loading()">refresh</mat-icon>
          </button>
        </div>
      </div>

      <!-- Filter chips -->
      <div class="filters-row">
        <div class="filter-chips">
          <button class="filter-chip" [class.active]="statusFilter() === ''" (click)="setFilter('')">
            <span class="chip-dot chip-dot-all"></span>All
          </button>
          @for (s of statuses; track s) {
            <button class="filter-chip" [class.active]="statusFilter() === s" (click)="setFilter(s)"
              [style.--chip-dot-color]="statusConfig(s).dot">
              <span class="chip-dot" [style.background]="statusConfig(s).dot"></span>
              {{ STATUS_LABELS[s] }}
            </button>
          }
        </div>
      </div>

      @if (loading()) {
        <div class="loading-state">
          <div class="spinner"></div>
          <span>Loading assignments…</span>
        </div>
      } @else if (error()) {
        <div class="error-state">
          <div class="error-icon-wrap">
            <mat-icon>error_outline</mat-icon>
          </div>
          <p class="error-msg">{{ error() }}</p>
          <button class="retry-btn" (click)="load()">Try again</button>
        </div>
      } @else if (bookings().length === 0) {
        <div class="empty-state">
          <div class="empty-icon-wrap">
            <mat-icon>event_available</mat-icon>
          </div>
          <p class="empty-title">No assignments found</p>
          <p class="empty-sub">
            {{ statusFilter() ? 'No bookings match the selected filter.' : 'You have no bookings assigned yet.' }}
          </p>
        </div>
      } @else {
        <div class="bookings-list">
          @for (booking of bookings(); track booking.id) {
            <div class="booking-card" [style.--status-border]="statusConfig(booking.status).border">
              <!-- Status stripe -->
              <div class="card-stripe"></div>

              <div class="card-inner">
                <!-- Card top row -->
                <div class="card-top">
                  <div class="card-top-left">
                    <span class="ref-number">{{ booking.reference_number }}</span>
                    <span class="status-chip"
                      [style.background]="statusConfig(booking.status).chip"
                      [style.color]="statusConfig(booking.status).chipText">
                      <span class="chip-dot-sm" [style.background]="statusConfig(booking.status).dot"></span>
                      {{ statusLabel(booking.status) }}
                    </span>
                  </div>
                  <div class="collection-badge" [class.home-badge]="booking.collection_type === 'home'">
                    <mat-icon>{{ collectionIcon(booking.collection_type) }}</mat-icon>
                    <span>{{ booking.collection_type | titlecase }}</span>
                  </div>
                </div>

                <!-- Meta row -->
                <div class="card-meta">
                  <div class="meta-item">
                    <mat-icon>calendar_today</mat-icon>
                    <span>{{ booking.booking_date | date:'d MMM yyyy' }}</span>
                  </div>
                  <div class="meta-separator"></div>
                  <div class="meta-item amount-item">
                    <span class="amount-value">₹{{ booking.total_amount | number:'1.2-2' }}</span>
                    <span class="payment-chip" [class.paid-chip]="booking.payment_status === 'paid'"
                      [class.pending-chip]="booking.payment_status !== 'paid'">
                      {{ booking.payment_status | titlecase }}
                    </span>
                  </div>
                </div>

                <!-- Notes block -->
                @if (booking.technician_notes) {
                  <div class="notes-block" [class.expanded]="expandedNotes().has(booking.id)">
                    <mat-icon class="notes-icon">sticky_note_2</mat-icon>
                    <div class="notes-content">
                      <p class="notes-text" [class.notes-clamped]="!expandedNotes().has(booking.id)">
                        {{ booking.technician_notes }}
                      </p>
                      <button class="notes-toggle" (click)="toggleNotes(booking.id)">
                        {{ expandedNotes().has(booking.id) ? 'Show less' : 'Show more' }}
                      </button>
                    </div>
                  </div>
                }

                <!-- Action row -->
                <div class="card-actions">
                  <button class="btn-notes" (click)="openRemarks(booking)">
                    <mat-icon>{{ booking.technician_notes ? 'edit_note' : 'note_add' }}</mat-icon>
                    <span>{{ booking.technician_notes ? 'Edit Notes' : 'Add Notes' }}</span>
                  </button>

                  @if (nextStatus(booking.status)) {
                    <button class="btn-advance"
                      [disabled]="updatingId() === booking.id"
                      (click)="advanceStatus(booking)">
                      @if (updatingId() === booking.id) {
                        <mat-icon class="spin">hourglass_empty</mat-icon>
                        <span>Updating…</span>
                      } @else {
                        <mat-icon>arrow_forward</mat-icon>
                        <span>Mark as {{ statusLabel(nextStatus(booking.status)!) }}</span>
                      }
                    </button>
                  } @else {
                    <div class="final-state" [class.final-completed]="booking.status === 'completed'"
                      [class.final-cancelled]="booking.status === 'cancelled'">
                      <mat-icon>{{ booking.status === 'completed' ? 'check_circle' : 'cancel' }}</mat-icon>
                      <span>{{ booking.status === 'completed' ? 'Completed' : 'Cancelled' }}</span>
                    </div>
                  }
                </div>
              </div>
            </div>
          }
        </div>

        <!-- Pagination -->
        @if (totalPages() > 1) {
          <div class="pagination">
            <button class="page-btn" [disabled]="page() === 1" (click)="goPage(page() - 1)" aria-label="Previous page">
              <mat-icon>chevron_left</mat-icon>
            </button>
            <div class="page-info">
              <span class="page-current">{{ page() }}</span>
              <span class="page-of">of</span>
              <span class="page-total">{{ totalPages() }}</span>
            </div>
            <button class="page-btn" [disabled]="page() === totalPages()" (click)="goPage(page() + 1)" aria-label="Next page">
              <mat-icon>chevron_right</mat-icon>
            </button>
          </div>
        }
      }

      <!-- Remarks Dialog overlay -->
      @if (remarksOpen()) {
        <div class="dialog-backdrop" (click)="closeRemarks()">
          <div class="dialog-box" (click)="$event.stopPropagation()">
            <div class="dialog-header">
              <div class="dialog-icon-wrap">
                <mat-icon>edit_note</mat-icon>
              </div>
              <div>
                <h3 class="dialog-title">{{ remarksBooking()?.technician_notes ? 'Edit Notes' : 'Add Notes' }}</h3>
                <p class="dialog-ref">{{ remarksBooking()?.reference_number }}</p>
              </div>
              <button class="dialog-close" (click)="closeRemarks()" aria-label="Close">
                <mat-icon>close</mat-icon>
              </button>
            </div>
            <div class="dialog-body">
              <label class="textarea-label">Technician Notes</label>
              <textarea [(ngModel)]="remarksText" rows="5" class="remarks-textarea"
                placeholder="Enter notes about sample collection, patient condition, any observations…"></textarea>
            </div>
            <div class="dialog-actions">
              <button class="btn-cancel" (click)="closeRemarks()">Cancel</button>
              <button class="btn-save" [disabled]="!remarksText.trim() || savingRemarks()"
                (click)="saveRemarks()">
                @if (savingRemarks()) {
                  <mat-icon class="spin">hourglass_empty</mat-icon> Saving…
                } @else {
                  <mat-icon>save</mat-icon> Save Notes
                }
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      --emerald-900: #064E3B;
      --emerald-800: #065F46;
      --emerald-700: #047857;
      --emerald-600: #059669;
      --emerald-400: #34D399;
      --emerald-100: #D1FAE5;
      --emerald-50: #ECFDF5;
      --saffron: #F97316;
      --saffron-dark: #EA580C;
      --indigo: #6366F1;
      --text: #0F172A;
      --text-secondary: #475569;
      --muted: #94A3B8;
      --border: #E2E8F0;
      --surface: #FFFFFF;
      --bg: #F0FDF9;
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
    }

    .page {
      max-width: 900px;
      margin: 0 auto;
    }

    /* ── Page Header ── */
    .page-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 1rem;
      margin-bottom: 1.5rem;
      flex-wrap: wrap;
    }

    .header-left { display: flex; flex-direction: column; gap: .4rem; }

    .header-eyebrow {
      display: flex;
      align-items: center;
      gap: .35rem;
      font-size: .75rem;
      font-weight: 600;
      color: var(--emerald-700);
      text-transform: uppercase;
      letter-spacing: .08em;
    }
    .eyebrow-icon { font-size: .9rem; width: .9rem; height: .9rem; }

    .page-title {
      margin: 0;
      font-size: 1.6rem;
      font-weight: 800;
      color: var(--text);
      letter-spacing: -.025em;
      line-height: 1.15;
    }

    .header-right {
      display: flex;
      align-items: center;
      gap: .75rem;
      padding-top: .25rem;
    }

    .total-badge {
      display: flex;
      align-items: baseline;
      gap: .3rem;
      background: var(--emerald-50);
      border: 1px solid var(--emerald-100);
      border-radius: 999px;
      padding: .35rem .9rem;
    }
    .total-num {
      font-size: 1.1rem;
      font-weight: 800;
      color: var(--emerald-700);
      font-variant-numeric: tabular-nums;
    }
    .total-label {
      font-size: .75rem;
      color: var(--emerald-700);
      font-weight: 500;
    }

    .refresh-btn {
      width: 38px;
      height: 38px;
      border-radius: 10px;
      border: 1.5px solid var(--border);
      background: var(--surface);
      color: var(--emerald-700);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all .15s;
    }
    .refresh-btn mat-icon { font-size: 1.15rem; width: 1.15rem; height: 1.15rem; }
    .refresh-btn:hover:not(:disabled) { border-color: var(--emerald-400); background: var(--emerald-50); }
    .refresh-btn:disabled { opacity: .5; cursor: not-allowed; }

    /* ── Filters ── */
    .filters-row {
      margin-bottom: 1.25rem;
      overflow-x: auto;
      padding-bottom: .25rem;
    }

    .filter-chips {
      display: flex;
      gap: .5rem;
      flex-wrap: nowrap;
    }

    .filter-chip {
      display: flex;
      align-items: center;
      gap: .4rem;
      padding: .45rem 1rem;
      border-radius: 999px;
      border: 1.5px solid var(--border);
      background: var(--surface);
      font-size: .8rem;
      font-weight: 500;
      color: var(--text-secondary);
      cursor: pointer;
      white-space: nowrap;
      transition: all .15s;
      font-family: inherit;
    }
    .filter-chip:hover { border-color: var(--emerald-400); color: var(--emerald-700); }
    .filter-chip.active {
      background: var(--emerald-900);
      border-color: var(--emerald-900);
      color: #fff;
    }
    .filter-chip.active .chip-dot { background: rgba(255,255,255,.8) !important; }

    .chip-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      flex-shrink: 0;
    }
    .chip-dot-all { background: var(--muted); }

    /* ── States ── */
    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
      padding: 4rem 1rem;
      color: var(--text-secondary);
      font-size: .9rem;
    }

    .spinner {
      width: 40px;
      height: 40px;
      border: 3px solid var(--emerald-100);
      border-top-color: var(--emerald-600);
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    .error-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: .75rem;
      padding: 3.5rem 1rem;
      text-align: center;
    }
    .error-icon-wrap {
      width: 52px;
      height: 52px;
      border-radius: 14px;
      background: #FEF2F2;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .error-icon-wrap mat-icon { font-size: 1.5rem; width: 1.5rem; height: 1.5rem; color: #EF4444; }
    .error-msg { margin: 0; font-size: .9rem; color: var(--text-secondary); }
    .retry-btn {
      padding: .55rem 1.25rem;
      border-radius: 8px;
      border: 1.5px solid var(--border);
      background: var(--surface);
      font-size: .875rem;
      font-weight: 600;
      color: var(--text);
      cursor: pointer;
      font-family: inherit;
      transition: all .15s;
    }
    .retry-btn:hover { border-color: var(--emerald-400); color: var(--emerald-700); }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: .75rem;
      padding: 4rem 1rem;
      text-align: center;
    }
    .empty-icon-wrap {
      width: 64px;
      height: 64px;
      border-radius: 18px;
      background: var(--emerald-50);
      border: 1.5px solid var(--emerald-100);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .empty-icon-wrap mat-icon { font-size: 2rem; width: 2rem; height: 2rem; color: var(--emerald-600); }
    .empty-title { margin: 0; font-size: 1rem; font-weight: 700; color: var(--text); }
    .empty-sub { margin: 0; font-size: .875rem; color: var(--muted); max-width: 280px; }

    /* ── Booking cards ── */
    .bookings-list {
      display: flex;
      flex-direction: column;
      gap: .875rem;
    }

    .booking-card {
      background: var(--surface);
      border-radius: 14px;
      border: 1px solid var(--border);
      overflow: hidden;
      display: flex;
      box-shadow: 0 1px 3px rgba(6,78,59,.05);
      transition: box-shadow .2s ease, transform .2s ease;
    }
    .booking-card:hover {
      box-shadow: 0 4px 16px rgba(6,78,59,.1);
      transform: translateY(-1px);
    }

    .card-stripe {
      width: 4px;
      flex-shrink: 0;
      background: var(--status-border, #94A3B8);
    }

    .card-inner {
      flex: 1;
      padding: 1rem 1.25rem;
      display: flex;
      flex-direction: column;
      gap: .75rem;
      min-width: 0;
    }

    /* Card top */
    .card-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: .75rem;
      flex-wrap: wrap;
    }

    .card-top-left {
      display: flex;
      align-items: center;
      gap: .625rem;
      flex-wrap: wrap;
    }

    .ref-number {
      font-size: .85rem;
      font-weight: 700;
      color: var(--text);
      font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', monospace;
      letter-spacing: .02em;
    }

    .status-chip {
      display: inline-flex;
      align-items: center;
      gap: .35rem;
      font-size: .72rem;
      font-weight: 700;
      padding: .25rem .65rem;
      border-radius: 999px;
      text-transform: uppercase;
      letter-spacing: .06em;
    }
    .chip-dot-sm {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .collection-badge {
      display: flex;
      align-items: center;
      gap: .35rem;
      font-size: .75rem;
      font-weight: 600;
      color: var(--indigo);
      background: #EEF2FF;
      border-radius: 999px;
      padding: .3rem .75rem;
    }
    .collection-badge mat-icon { font-size: .9rem; width: .9rem; height: .9rem; }
    .home-badge { color: var(--saffron-dark); background: #FFF7ED; }

    /* Card meta */
    .card-meta {
      display: flex;
      align-items: center;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .meta-item {
      display: flex;
      align-items: center;
      gap: .35rem;
      font-size: .8rem;
      color: var(--text-secondary);
    }
    .meta-item mat-icon { font-size: .9rem; width: .9rem; height: .9rem; color: var(--muted); }

    .meta-separator {
      flex: 1;
    }

    .amount-item {
      display: flex;
      align-items: center;
      gap: .5rem;
    }
    .amount-value {
      font-size: .95rem;
      font-weight: 700;
      color: var(--text);
      font-variant-numeric: tabular-nums;
    }

    .payment-chip {
      font-size: .7rem;
      font-weight: 700;
      padding: .2rem .55rem;
      border-radius: 999px;
      text-transform: uppercase;
      letter-spacing: .05em;
    }
    .paid-chip { background: #F0FDF4; color: #15803D; }
    .pending-chip { background: #FFFBEB; color: #B45309; }

    /* Notes */
    .notes-block {
      display: flex;
      gap: .625rem;
      padding: .65rem .875rem;
      background: var(--emerald-50);
      border-radius: 10px;
      border: 1px solid var(--emerald-100);
    }
    .notes-icon {
      font-size: 1rem;
      width: 1rem;
      height: 1rem;
      color: var(--emerald-600);
      flex-shrink: 0;
      margin-top: .1rem;
    }
    .notes-content { flex: 1; min-width: 0; }
    .notes-text {
      margin: 0 0 .3rem;
      font-size: .8rem;
      color: var(--text-secondary);
      line-height: 1.6;
    }
    .notes-clamped {
      overflow: hidden;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
    }
    .notes-toggle {
      background: none;
      border: none;
      font-size: .75rem;
      font-weight: 600;
      color: var(--emerald-700);
      cursor: pointer;
      padding: 0;
      font-family: inherit;
    }
    .notes-toggle:hover { color: var(--emerald-900); text-decoration: underline; }

    /* Card actions */
    .card-actions {
      display: flex;
      gap: .625rem;
      align-items: center;
      flex-wrap: wrap;
      padding-top: .125rem;
      border-top: 1px solid #F8FAFC;
    }

    .btn-notes {
      display: flex;
      align-items: center;
      gap: .4rem;
      padding: .55rem 1rem;
      border-radius: 8px;
      border: 1.5px solid var(--border);
      background: var(--surface);
      font-size: .8rem;
      font-weight: 600;
      color: var(--text-secondary);
      cursor: pointer;
      font-family: inherit;
      transition: all .15s;
      white-space: nowrap;
    }
    .btn-notes mat-icon { font-size: .95rem; width: .95rem; height: .95rem; }
    .btn-notes:hover { border-color: var(--emerald-400); color: var(--emerald-700); background: var(--emerald-50); }

    .btn-advance {
      display: flex;
      align-items: center;
      gap: .4rem;
      padding: .55rem 1.125rem;
      border-radius: 8px;
      border: none;
      background: var(--saffron);
      font-size: .8rem;
      font-weight: 700;
      color: #fff;
      cursor: pointer;
      font-family: inherit;
      transition: all .15s;
      white-space: nowrap;
      flex: 1;
      justify-content: center;
      max-width: 260px;
    }
    .btn-advance mat-icon { font-size: .95rem; width: .95rem; height: .95rem; }
    .btn-advance:hover:not(:disabled) { background: var(--saffron-dark); transform: translateY(-1px); box-shadow: 0 4px 12px rgba(249,115,22,.3); }
    .btn-advance:disabled { opacity: .6; cursor: not-allowed; transform: none; box-shadow: none; }

    .final-state {
      display: flex;
      align-items: center;
      gap: .4rem;
      font-size: .8rem;
      font-weight: 600;
      padding: .4rem .75rem;
      border-radius: 8px;
    }
    .final-state mat-icon { font-size: 1rem; width: 1rem; height: 1rem; }
    .final-completed { color: #15803D; background: #F0FDF4; }
    .final-cancelled { color: #B91C1C; background: #FEF2F2; }

    /* ── Pagination ── */
    .pagination {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: .875rem;
      margin-top: 1.75rem;
      padding-bottom: .5rem;
    }

    .page-btn {
      width: 38px;
      height: 38px;
      border-radius: 10px;
      border: 1.5px solid var(--border);
      background: var(--surface);
      color: var(--text-secondary);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all .15s;
    }
    .page-btn mat-icon { font-size: 1.25rem; width: 1.25rem; height: 1.25rem; }
    .page-btn:hover:not(:disabled) { border-color: var(--emerald-400); color: var(--emerald-700); background: var(--emerald-50); }
    .page-btn:disabled { opacity: .4; cursor: not-allowed; }

    .page-info {
      display: flex;
      align-items: baseline;
      gap: .35rem;
      font-size: .875rem;
    }
    .page-current { font-weight: 800; font-size: 1rem; color: var(--text); font-variant-numeric: tabular-nums; }
    .page-of { color: var(--muted); }
    .page-total { font-weight: 600; color: var(--text-secondary); font-variant-numeric: tabular-nums; }

    /* ── Dialog ── */
    .dialog-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(6,78,59,.4);
      backdrop-filter: blur(4px);
      z-index: 200;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.25rem;
      animation: fadeIn .18s ease;
    }

    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes slideUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }

    .dialog-box {
      background: var(--surface);
      border-radius: 20px;
      width: 100%;
      max-width: 500px;
      box-shadow: 0 24px 64px rgba(6,78,59,.2);
      overflow: hidden;
      animation: slideUp .22s ease;
    }

    .dialog-header {
      display: flex;
      align-items: center;
      gap: .875rem;
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid var(--border);
    }

    .dialog-icon-wrap {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      background: var(--emerald-50);
      border: 1px solid var(--emerald-100);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .dialog-icon-wrap mat-icon { font-size: 1.2rem; width: 1.2rem; height: 1.2rem; color: var(--emerald-700); }

    .dialog-title { margin: 0; font-size: 1rem; font-weight: 700; color: var(--text); }
    .dialog-ref { margin: .1rem 0 0; font-size: .75rem; color: var(--muted); font-family: monospace; }

    .dialog-close {
      margin-left: auto;
      width: 34px;
      height: 34px;
      border-radius: 8px;
      border: none;
      background: none;
      cursor: pointer;
      color: var(--muted);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all .15s;
      flex-shrink: 0;
    }
    .dialog-close mat-icon { font-size: 1.1rem; width: 1.1rem; height: 1.1rem; }
    .dialog-close:hover { background: #F1F5F9; color: var(--text); }

    .dialog-body { padding: 1.25rem 1.5rem; }

    .textarea-label {
      display: block;
      font-size: .75rem;
      font-weight: 600;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: .07em;
      margin-bottom: .5rem;
    }

    .remarks-textarea {
      width: 100%;
      border: 1.5px solid var(--border);
      border-radius: 10px;
      padding: .75rem 1rem;
      font-size: .875rem;
      font-family: inherit;
      resize: vertical;
      outline: none;
      box-sizing: border-box;
      color: var(--text);
      background: var(--bg);
      transition: border-color .15s;
      line-height: 1.6;
    }
    .remarks-textarea:focus { border-color: var(--emerald-400); background: var(--surface); }
    .remarks-textarea::placeholder { color: var(--muted); }

    .dialog-actions {
      display: flex;
      justify-content: flex-end;
      gap: .625rem;
      padding: 1rem 1.5rem 1.25rem;
      border-top: 1px solid var(--border);
    }

    .btn-cancel {
      padding: .6rem 1.25rem;
      border-radius: 8px;
      border: 1.5px solid var(--border);
      background: none;
      font-size: .875rem;
      font-weight: 600;
      color: var(--text-secondary);
      cursor: pointer;
      font-family: inherit;
      transition: all .15s;
    }
    .btn-cancel:hover { border-color: #94A3B8; color: var(--text); background: #F8FAFC; }

    .btn-save {
      display: flex;
      align-items: center;
      gap: .4rem;
      padding: .6rem 1.375rem;
      border-radius: 8px;
      border: none;
      background: var(--emerald-800);
      font-size: .875rem;
      font-weight: 700;
      color: #fff;
      cursor: pointer;
      font-family: inherit;
      transition: all .15s;
    }
    .btn-save mat-icon { font-size: 1rem; width: 1rem; height: 1rem; }
    .btn-save:hover:not(:disabled) { background: var(--emerald-900); box-shadow: 0 4px 12px rgba(6,78,59,.3); }
    .btn-save:disabled { opacity: .5; cursor: not-allowed; box-shadow: none; }

    @keyframes spin { to { transform: rotate(360deg); } }
    .spin { animation: spin .9s linear infinite; }

    @media (max-width: 600px) {
      .page-title { font-size: 1.35rem; }
      .card-actions { gap: .5rem; }
      .btn-advance { max-width: none; }
      .meta-separator { display: none; }
      .card-meta { gap: .625rem; }
    }
  `],
})
export class TechnicianBookingsComponent implements OnInit {
  STATUS_LABELS = STATUS_LABELS;

  bookings = signal<Booking[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  total = signal(0);
  page = signal(1);
  pageSize = signal(20);
  statusFilter = signal('');
  updatingId = signal<string | null>(null);
  expandedNotesSet = new Set<string>();
  expandedNotes = signal<Set<string>>(new Set());

  remarksOpen = signal(false);
  remarksBooking = signal<Booking | null>(null);
  remarksText = '';
  savingRemarks = signal(false);

  statuses = ['booked', 'collected', 'processing', 'completed', 'cancelled'];

  todayLabel = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.pageSize())));

  constructor(private bookingApi: BookingApiService, private snack: MatSnackBar) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    const params: Record<string, string | number> = {
      page: this.page(),
      page_size: this.pageSize(),
    };
    if (this.statusFilter()) params['status'] = this.statusFilter();

    this.bookingApi.getMyAssigned({
      page: this.page(),
      page_size: this.pageSize(),
      status: this.statusFilter() || undefined,
    }).subscribe({
      next: (res) => {
        this.bookings.set(res.items);
        this.total.set(res.total);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load bookings. Please try again.');
        this.loading.set(false);
      },
    });
  }

  setFilter(status: string): void {
    this.statusFilter.set(status);
    this.page.set(1);
    this.load();
  }

  goPage(p: number): void {
    this.page.set(p);
    this.load();
  }

  nextStatus(current: string): string | null {
    return STATUS_TRANSITIONS[current] ?? null;
  }

  statusLabel(s: string): string {
    return STATUS_LABELS[s] ?? s;
  }

  statusConfig(s: string): { border: string; chip: string; chipText: string; dot: string } {
    return STATUS_CONFIG[s] ?? { border: '#94A3B8', chip: '#F1F5F9', chipText: '#475569', dot: '#94A3B8' };
  }

  collectionIcon(type: string): string {
    return type === 'home' ? 'home' : 'business';
  }

  toggleNotes(id: string): void {
    const s = new Set(this.expandedNotesSet);
    if (s.has(id)) { s.delete(id); } else { s.add(id); }
    this.expandedNotesSet = s;
    this.expandedNotes.set(new Set(s));
  }

  advanceStatus(booking: Booking): void {
    const next = this.nextStatus(booking.status);
    if (!next || this.updatingId()) return;
    this.updatingId.set(booking.id);
    this.bookingApi.updateStatus(booking.id, next).subscribe({
      next: (updated) => {
        this.bookings.update((list) =>
          list.map((b) => (b.id === updated.id ? { ...b, status: updated.status } : b))
        );
        this.updatingId.set(null);
        this.snack.open(`Booking marked as ${this.statusLabel(next)}.`, 'OK', { duration: 3000 });
      },
      error: (err) => {
        this.updatingId.set(null);
        const msg = err?.error?.detail?.message ?? 'Failed to update status.';
        this.snack.open(msg, 'OK', { duration: 4000 });
      },
    });
  }

  openRemarks(booking: Booking): void {
    this.remarksBooking.set(booking);
    this.remarksText = booking.technician_notes ?? '';
    this.remarksOpen.set(true);
  }

  closeRemarks(): void {
    this.remarksOpen.set(false);
    this.remarksBooking.set(null);
    this.remarksText = '';
  }

  saveRemarks(): void {
    const booking = this.remarksBooking();
    if (!booking || !this.remarksText.trim()) return;
    this.savingRemarks.set(true);
    this.bookingApi.addRemarks(booking.id, this.remarksText.trim()).subscribe({
      next: (updated) => {
        this.bookings.update((list) =>
          list.map((b) => (b.id === updated.id ? { ...b, technician_notes: updated.technician_notes } : b))
        );
        this.savingRemarks.set(false);
        this.closeRemarks();
        this.snack.open('Notes saved.', 'OK', { duration: 3000 });
      },
      error: () => {
        this.savingRemarks.set(false);
        this.snack.open('Failed to save notes.', 'OK', { duration: 3000 });
      },
    });
  }
}
