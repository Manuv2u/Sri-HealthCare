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
  collected: 'Sample Collected',
  processing: 'Processing',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const STATUS_COLORS: Record<string, string> = {
  booked: '#ed8936',
  collected: '#4299e1',
  processing: '#9f7aea',
  completed: '#48bb78',
  cancelled: '#fc8181',
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
      <div class="page-header">
        <div>
          <h1 class="page-title">My Assigned Bookings</h1>
          <p class="page-sub">Manage and update bookings assigned to you</p>
        </div>
        <button mat-stroked-button (click)="load()" class="refresh-btn">
          <mat-icon>refresh</mat-icon> Refresh
        </button>
      </div>

      <!-- Filters -->
      <div class="filters-row">
        <div class="filter-chips">
          <button class="filter-chip" [class.active]="statusFilter() === ''" (click)="setFilter('')">All</button>
          @for (s of statuses; track s) {
            <button class="filter-chip" [class.active]="statusFilter() === s" (click)="setFilter(s)">
              {{ STATUS_LABELS[s] }}
            </button>
          }
        </div>
        <div class="count-badge">{{ total() }} bookings</div>
      </div>

      @if (loading()) {
        <div class="loading-state">
          <div class="spinner"></div>
          <span>Loading bookings…</span>
        </div>
      } @else if (error()) {
        <div class="error-state">
          <mat-icon>error_outline</mat-icon>
          <p>{{ error() }}</p>
          <button mat-stroked-button (click)="load()">Retry</button>
        </div>
      } @else if (bookings().length === 0) {
        <div class="empty-state">
          <mat-icon>assignment_turned_in</mat-icon>
          <p>No bookings assigned yet.</p>
        </div>
      } @else {
        <div class="bookings-grid">
          @for (booking of bookings(); track booking.id) {
            <div class="booking-card">
              <div class="card-header">
                <div class="ref-row">
                  <span class="ref">{{ booking.reference_number }}</span>
                  <span class="status-pill" [style.background]="statusBg(booking.status)" [style.color]="statusColor(booking.status)">
                    {{ statusLabel(booking.status) }}
                  </span>
                </div>
                <div class="meta-row">
                  <span><mat-icon class="meta-icon">calendar_today</mat-icon> {{ booking.booking_date | date:'mediumDate' }}</span>
                  <span><mat-icon class="meta-icon">{{ collectionIcon(booking.collection_type) }}</mat-icon> {{ booking.collection_type | titlecase }}</span>
                </div>
              </div>

              <div class="card-body">
                <div class="info-row">
                  <mat-icon class="info-icon">payments</mat-icon>
                  <span>₹{{ booking.total_amount | number:'1.2-2' }}</span>
                  <span class="payment-status" [class.paid]="booking.payment_status === 'paid'">
                    {{ booking.payment_status | titlecase }}
                  </span>
                </div>

                @if (booking.technician_notes) {
                  <div class="notes-block">
                    <mat-icon class="notes-icon">note</mat-icon>
                    <p class="notes-text">{{ booking.technician_notes }}</p>
                  </div>
                }
              </div>

              <div class="card-actions">
                <!-- Remarks button -->
                <button mat-stroked-button class="remarks-btn" (click)="openRemarks(booking)">
                  <mat-icon>edit_note</mat-icon>
                  {{ booking.technician_notes ? 'Edit Remarks' : 'Add Remarks' }}
                </button>

                <!-- Status advance button -->
                @if (nextStatus(booking.status)) {
                  <button mat-flat-button color="primary" class="advance-btn"
                    [disabled]="updatingId() === booking.id"
                    (click)="advanceStatus(booking)">
                    @if (updatingId() === booking.id) {
                      <mat-icon class="spin">hourglass_empty</mat-icon>
                    } @else {
                      <mat-icon>arrow_forward</mat-icon>
                    }
                    Mark as {{ statusLabel(nextStatus(booking.status)!) }}
                  </button>
                } @else {
                  <span class="final-status">
                    <mat-icon>check_circle</mat-icon>
                    {{ booking.status === 'completed' ? 'Completed' : 'Closed' }}
                  </span>
                }
              </div>
            </div>
          }
        </div>

        <!-- Pagination -->
        @if (totalPages() > 1) {
          <div class="pagination">
            <button mat-stroked-button [disabled]="page() === 1" (click)="goPage(page() - 1)">
              <mat-icon>chevron_left</mat-icon>
            </button>
            <span>Page {{ page() }} of {{ totalPages() }}</span>
            <button mat-stroked-button [disabled]="page() === totalPages()" (click)="goPage(page() + 1)">
              <mat-icon>chevron_right</mat-icon>
            </button>
          </div>
        }
      }

      <!-- Remarks Dialog (inline overlay) -->
      @if (remarksOpen()) {
        <div class="dialog-backdrop" (click)="closeRemarks()">
          <div class="dialog-box" (click)="$event.stopPropagation()">
            <h3>{{ remarksBooking()?.technician_notes ? 'Edit Remarks' : 'Add Remarks' }}</h3>
            <p class="dialog-ref">Booking {{ remarksBooking()?.reference_number }}</p>
            <textarea [(ngModel)]="remarksText" rows="4" class="remarks-textarea"
              placeholder="Enter notes about sample collection, patient condition, etc."></textarea>
            <div class="dialog-actions">
              <button mat-stroked-button (click)="closeRemarks()">Cancel</button>
              <button mat-flat-button color="primary" [disabled]="!remarksText.trim() || savingRemarks()"
                (click)="saveRemarks()">
                {{ savingRemarks() ? 'Saving…' : 'Save Remarks' }}
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .page { max-width: 960px; margin: 0 auto; }

    .page-header {
      display: flex; align-items: flex-start; justify-content: space-between;
      margin-bottom: 1.5rem; gap: 1rem; flex-wrap: wrap;
    }
    .page-title { margin: 0; font-size: 1.4rem; font-weight: 700; color: #1a237e; }
    .page-sub { margin: .25rem 0 0; color: #718096; font-size: .875rem; }
    .refresh-btn { display: flex; align-items: center; gap: .4rem; }

    /* Filters */
    .filters-row {
      display: flex; align-items: center; justify-content: space-between;
      gap: 1rem; flex-wrap: wrap; margin-bottom: 1.25rem;
    }
    .filter-chips { display: flex; gap: .5rem; flex-wrap: wrap; }
    .filter-chip {
      padding: .4rem .9rem; border-radius: 20px; border: 1.5px solid #e2e8f0;
      background: #fff; font-size: .8rem; font-weight: 500; color: #718096;
      cursor: pointer; transition: all .15s;
      &:hover { border-color: #1a237e; color: #1a237e; }
      &.active { background: #1a237e; border-color: #1a237e; color: #fff; }
    }
    .count-badge {
      font-size: .8rem; color: #718096; background: #f7fafc;
      padding: .3rem .75rem; border-radius: 20px; border: 1px solid #e2e8f0;
    }

    /* States */
    .loading-state, .error-state, .empty-state {
      text-align: center; padding: 3rem 1rem; color: #718096;
      display: flex; flex-direction: column; align-items: center; gap: .75rem;
      mat-icon { font-size: 2.5rem; width: 2.5rem; height: 2.5rem; color: #cbd5e0; }
    }
    .spinner {
      width: 36px; height: 36px; border: 3px solid #e2e8f0;
      border-top-color: #1a237e; border-radius: 50%; animation: spin 1s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .error-state mat-icon { color: #fc8181; }

    /* Grid */
    .bookings-grid { display: grid; gap: 1rem; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); }

    .booking-card {
      background: #fff; border-radius: 12px; border: 1px solid #e2e8f0;
      overflow: hidden; display: flex; flex-direction: column;
      box-shadow: 0 1px 4px rgba(0,0,0,.05);
      transition: box-shadow .15s;
      &:hover { box-shadow: 0 4px 16px rgba(0,0,0,.1); }
    }
    .card-header { padding: 1rem 1rem .75rem; border-bottom: 1px solid #f7fafc; }
    .ref-row { display: flex; align-items: center; justify-content: space-between; gap: .5rem; margin-bottom: .5rem; }
    .ref { font-weight: 700; font-size: .9rem; color: #2d3748; font-family: monospace; }
    .status-pill {
      font-size: .7rem; font-weight: 700; padding: .2rem .6rem; border-radius: 12px;
      text-transform: uppercase; letter-spacing: .05em;
    }
    .meta-row {
      display: flex; gap: 1rem; flex-wrap: wrap; font-size: .78rem; color: #718096;
      span { display: flex; align-items: center; gap: .25rem; }
    }
    .meta-icon { font-size: .85rem; width: .85rem; height: .85rem; }

    .card-body { padding: .75rem 1rem; flex: 1; }
    .info-row { display: flex; align-items: center; gap: .5rem; font-size: .85rem; color: #2d3748; }
    .info-icon { font-size: 1rem; width: 1rem; height: 1rem; color: #718096; }
    .payment-status {
      font-size: .72rem; font-weight: 600; padding: .15rem .5rem; border-radius: 8px;
      background: #fff3cd; color: #856404;
      &.paid { background: #d4edda; color: #155724; }
    }
    .notes-block {
      display: flex; gap: .5rem; margin-top: .75rem; padding: .6rem .75rem;
      background: #f7fafc; border-radius: 8px; border-left: 3px solid #1a237e;
      mat-icon { font-size: 1rem; width: 1rem; height: 1rem; color: #1a237e; flex-shrink: 0; margin-top: .1rem; }
    }
    .notes-text { margin: 0; font-size: .8rem; color: #4a5568; line-height: 1.5; }

    .card-actions {
      padding: .75rem 1rem; border-top: 1px solid #f7fafc;
      display: flex; gap: .5rem; flex-wrap: wrap; align-items: center;
    }
    .remarks-btn { font-size: .8rem; display: flex; align-items: center; gap: .3rem; }
    .advance-btn { font-size: .8rem; display: flex; align-items: center; gap: .3rem; flex: 1; }
    .final-status {
      display: flex; align-items: center; gap: .35rem;
      font-size: .8rem; color: #48bb78; font-weight: 600;
      mat-icon { font-size: 1rem; width: 1rem; height: 1rem; }
    }
    .spin { animation: spin 1s linear infinite; }

    /* Pagination */
    .pagination {
      display: flex; align-items: center; justify-content: center; gap: 1rem; margin-top: 1.5rem;
      span { font-size: .875rem; color: #718096; }
    }

    /* Remarks dialog */
    .dialog-backdrop {
      position: fixed; inset: 0; background: rgba(0,0,0,.5); z-index: 200;
      display: flex; align-items: center; justify-content: center; padding: 1rem;
    }
    .dialog-box {
      background: #fff; border-radius: 16px; padding: 1.5rem; width: 100%; max-width: 480px;
      box-shadow: 0 8px 40px rgba(0,0,0,.18);
      h3 { margin: 0 0 .25rem; font-size: 1.1rem; font-weight: 700; color: #1a237e; }
    }
    .dialog-ref { margin: 0 0 1rem; font-size: .8rem; color: #718096; font-family: monospace; }
    .remarks-textarea {
      width: 100%; border: 1.5px solid #e2e8f0; border-radius: 8px; padding: .75rem;
      font-size: .875rem; font-family: inherit; resize: vertical; outline: none;
      box-sizing: border-box;
      &:focus { border-color: #1a237e; }
    }
    .dialog-actions { display: flex; justify-content: flex-end; gap: .75rem; margin-top: 1rem; }

    @media (max-width: 600px) {
      .bookings-grid { grid-template-columns: 1fr; }
      .page-header { flex-direction: column; }
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

  remarksOpen = signal(false);
  remarksBooking = signal<Booking | null>(null);
  remarksText = '';
  savingRemarks = signal(false);

  statuses = ['booked', 'collected', 'processing', 'completed', 'cancelled'];

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

  statusColor(s: string): string {
    return STATUS_COLORS[s] ?? '#718096';
  }

  statusBg(s: string): string {
    const c = STATUS_COLORS[s] ?? '#718096';
    return c + '22';
  }

  collectionIcon(type: string): string {
    return type === 'home' ? 'home' : 'business';
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
        this.snack.open('Remarks saved.', 'OK', { duration: 3000 });
      },
      error: () => {
        this.savingRemarks.set(false);
        this.snack.open('Failed to save remarks.', 'OK', { duration: 3000 });
      },
    });
  }
}
