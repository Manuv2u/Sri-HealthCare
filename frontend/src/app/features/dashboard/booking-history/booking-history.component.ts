import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatChipsModule } from '@angular/material/chips';
import { MatCardModule } from '@angular/material/card';
import { Booking } from '../../../core/api/api.types';
import { BookingApiService } from '../../../core/api/services/booking-api.service';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner.component';
import { ErrorBannerComponent } from '../../../shared/components/error-banner.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state.component';
import { PaginationComponent } from '../../../shared/components/pagination.component';

const STATUS_COLORS: Record<string, string> = {
  pending: 'accent',
  confirmed: 'primary',
  completed: '',
  cancelled: 'warn',
};

@Component({
  selector: 'app-booking-history',
  standalone: true,
  imports: [
    CommonModule, MatChipsModule, MatCardModule,
    LoadingSpinnerComponent, ErrorBannerComponent, EmptyStateComponent, PaginationComponent,
  ],
  template: `
    <div class="container">
      <h2>My Bookings</h2>
      <app-loading-spinner *ngIf="loading()" />
      <app-error-banner *ngIf="error()" [message]="error()!" [retryLabel]="'Retry'" (retry)="load()" />
      <app-empty-state *ngIf="!loading() && bookings().length === 0" message="No bookings yet." />

      <mat-card *ngFor="let b of bookings()" class="booking-card">
        <mat-card-header>
          <mat-card-title>{{ b.reference_number }}</mat-card-title>
          <mat-card-subtitle>{{ b.booking_date }} — {{ b.collection_type }}</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <mat-chip [color]="statusColor(b.status)" highlighted>{{ b.status }}</mat-chip>
          <span class="amount">₹{{ b.total_amount }}</span>
        </mat-card-content>
      </mat-card>

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
    .container { max-width: 700px; margin: 2rem auto; padding: 1rem; display: flex; flex-direction: column; gap: 1rem; }
    .booking-card { margin-bottom: 0.5rem; }
    .amount { margin-left: 1rem; font-weight: bold; }
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
      next: (res) => {
        this.bookings.set(res.items);
        this.total.set(res.total);
        this.loading.set(false);
      },
      error: () => { this.error.set('Failed to load bookings.'); this.loading.set(false); },
    });
  }

  onPageChange(p: number): void { this.page.set(p); this.load(); }

  statusColor(status: string): string {
    return STATUS_COLORS[status] ?? '';
  }
}
