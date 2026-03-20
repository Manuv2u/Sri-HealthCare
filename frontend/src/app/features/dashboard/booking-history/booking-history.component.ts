import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { Booking } from '../../../core/api/api.types';
import { BookingApiService } from '../../../core/api/services/booking-api.service';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner.component';
import { ErrorBannerComponent } from '../../../shared/components/error-banner.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state.component';
import { PaginationComponent } from '../../../shared/components/pagination.component';

const STATUS_BADGE: Record<string, string> = {
  pending: 'badge-warn',
  confirmed: 'badge-info',
  completed: 'badge-success',
  cancelled: 'badge-danger',
};

@Component({
  selector: 'app-booking-history',
  standalone: true,
  imports: [
    CommonModule, RouterLink, MatIconModule, MatButtonModule,
    LoadingSpinnerComponent, ErrorBannerComponent, EmptyStateComponent, PaginationComponent,
  ],
  template: `
    <div class="page-container">
      <div class="page-header">
        <h1>My Bookings</h1>
        <p>Track your lab test appointments and collection status</p>
      </div>

      <app-loading-spinner *ngIf="loading()" />
      <app-error-banner *ngIf="error()" [message]="error()!" [retryLabel]="'Retry'" (retry)="load()" />
      <app-empty-state *ngIf="!loading() && !error() && bookings().length === 0"
        message="No bookings yet. Browse our tests and book your first one." />

      <div class="booking-list">
        @for (b of bookings(); track b.id) {
          <div class="sri-card booking-card">
            <div class="booking-main">
              <div class="booking-ref">
                <mat-icon class="ref-icon">receipt_long</mat-icon>
                <div>
                  <div class="ref-number">{{ b.reference_number }}</div>
                  <div class="ref-date">{{ b.booking_date | date:'mediumDate' }}</div>
                </div>
              </div>
              <div class="booking-meta">
                <span class="meta-chip">
                  <mat-icon>{{ b.collection_type === 'home' ? 'home' : 'local_hospital' }}</mat-icon>
                  {{ b.collection_type === 'home' ? 'Home Collection' : 'Walk-in' }}
                </span>
              </div>
            </div>
            <div class="booking-footer">
              <div class="booking-status">
                <span class="badge" [ngClass]="statusBadge(b.status)">{{ b.status }}</span>
                <span class="badge" [ngClass]="paymentBadge(b.payment_status)">{{ b.payment_status }}</span>
              </div>
              <div class="booking-amount">₹{{ b.total_amount }}</div>
            </div>
          </div>
        }
      </div>

      <app-pagination
        *ngIf="total() > pageSize"
        [page]="page()"
        [total]="total()"
        [pageSize]="pageSize"
        (pageChange)="onPageChange($event)"
      />
    </div>
  `,
  styles: [`
    .booking-list { display: flex; flex-direction: column; gap: 1rem; }
    .booking-card { padding: 1.25rem; }
    .booking-main {
      display: flex; justify-content: space-between; align-items: flex-start;
      margin-bottom: 1rem; flex-wrap: wrap; gap: .75rem;
    }
    .booking-ref { display: flex; align-items: center; gap: .75rem;
      .ref-icon { color: var(--color-primary); }
      .ref-number { font-weight: 700; font-size: 1rem; }
      .ref-date { font-size: .8rem; color: var(--color-muted); margin-top: .1rem; }
    }
    .meta-chip {
      display: inline-flex; align-items: center; gap: .3rem;
      font-size: .8rem; color: var(--color-muted);
      background: var(--color-bg); padding: .25rem .6rem; border-radius: 6px;
      mat-icon { font-size: .95rem; width: .95rem; height: .95rem; }
    }
    .booking-footer {
      display: flex; justify-content: space-between; align-items: center;
      padding-top: .75rem; border-top: 1px solid var(--color-border);
    }
    .booking-status { display: flex; gap: .5rem; }
    .booking-amount { font-size: 1.1rem; font-weight: 700; color: var(--color-primary); }
  `],
})
export class BookingHistoryComponent implements OnInit {
  bookings = signal<Booking[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  page = signal(1);
  total = signal(0);
  pageSize = 10;

  constructor(private bookingApi: BookingApiService) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.bookingApi.list({ page: this.page(), page_size: this.pageSize }).subscribe({
      next: (res) => { this.bookings.set(res.items); this.total.set(res.total); this.loading.set(false); },
      error: () => { this.error.set('Failed to load bookings.'); this.loading.set(false); },
    });
  }

  onPageChange(p: number): void { this.page.set(p); this.load(); }

  statusBadge(status: string): string { return STATUS_BADGE[status] ?? 'badge-default'; }
  paymentBadge(status: string): string {
    return status === 'paid' ? 'badge-success' : status === 'failed' ? 'badge-danger' : 'badge-warn';
  }
}
