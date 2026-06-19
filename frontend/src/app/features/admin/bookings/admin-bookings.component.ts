import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpParams } from '@angular/common/http';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { Booking, Technician } from '../../../core/api/api.types';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner.component';
import { ErrorBannerComponent } from '../../../shared/components/error-banner.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state.component';
import { PaginationComponent } from '../../../shared/components/pagination.component';
import { AdminApiService } from '../../../core/api/services/admin-api.service';

const BOOKING_STATUSES = ['pending', 'confirmed', 'sample_collected', 'processing', 'completed', 'cancelled'];

@Component({
  selector: 'app-admin-bookings',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCardModule,
    LoadingSpinnerComponent,
    ErrorBannerComponent,
    EmptyStateComponent,
    PaginationComponent,
  ],
  template: `
    <div class="bookings-container">
      <h1>Bookings</h1>

      <mat-card>
        <mat-card-content>
          <div class="filters">
            <mat-form-field>
              <mat-label>Filter by Status</mat-label>
              <mat-select [(ngModel)]="statusFilter" (ngModelChange)="loadBookings()">
                <mat-option value="">All</mat-option>
                @for (s of statuses; track s) {
                  <mat-option [value]="s">{{ s }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
          </div>
        </mat-card-content>
      </mat-card>

      @if (loading()) {
        <app-loading-spinner />
      } @else if (error()) {
        <app-error-banner [message]="error()!" retryLabel="Retry" (retry)="loadBookings()" />
      } @else {
        @if (bookings().length === 0) {
          <app-empty-state message="No bookings found" />
        } @else {
          <div class="table-scroll">
          <table mat-table [dataSource]="bookings()">
            <ng-container matColumnDef="reference_number">
              <th mat-header-cell *matHeaderCellDef>Reference</th>
              <td mat-cell *matCellDef="let b">{{ b.reference_number }}</td>
            </ng-container>

            <ng-container matColumnDef="booking_date">
              <th mat-header-cell *matHeaderCellDef>Date</th>
              <td mat-cell *matCellDef="let b">{{ b.booking_date | date }}</td>
            </ng-container>

            <ng-container matColumnDef="collection_type">
              <th mat-header-cell *matHeaderCellDef>Collection</th>
              <td mat-cell *matCellDef="let b">{{ b.collection_type }}</td>
            </ng-container>

            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef>Status</th>
              <td mat-cell *matCellDef="let b">{{ b.status }}</td>
            </ng-container>

            <ng-container matColumnDef="total_amount">
              <th mat-header-cell *matHeaderCellDef>Amount</th>
              <td mat-cell *matCellDef="let b">₹{{ b.total_amount }}</td>
            </ng-container>

            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef>Actions</th>
              <td mat-cell *matCellDef="let b">
                <div class="row-actions">
                  <mat-form-field class="inline-select">
                    <mat-label>Assign Tech</mat-label>
                    <mat-select (ngModelChange)="assignTechnician(b, $event)" [ngModel]="null">
                      @for (t of technicians(); track t.id) {
                        <mat-option [value]="t.id">{{ t.name }}</mat-option>
                      }
                    </mat-select>
                  </mat-form-field>

                  <mat-form-field class="inline-select">
                    <mat-label>Update Status</mat-label>
                    <mat-select [ngModel]="b.status" (ngModelChange)="updateStatus(b, $event)">
                      @for (s of statuses; track s) {
                        <mat-option [value]="s">{{ s }}</mat-option>
                      }
                    </mat-select>
                  </mat-form-field>
                </div>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
          </table>
          </div>

          <app-pagination
            [page]="page()"
            [total]="total()"
            [pageSize]="pageSize"
            (pageChange)="onPageChange($event)"
          />
        }
      }
    </div>
  `,
  styles: [`
    .bookings-container {
      padding: 1.5rem;
    }
    h1 {
      margin-bottom: 1.5rem;
    }
    mat-card {
      margin-bottom: 1rem;
    }
    .filters {
      display: flex;
      gap: 1rem;
    }
    table {
      width: 100%;
    }
    .row-actions {
      display: flex;
      gap: 0.5rem;
      align-items: center;
    }
    .inline-select {
      width: 140px;
    }
  `],
})
export class AdminBookingsComponent implements OnInit {
  displayedColumns = ['reference_number', 'booking_date', 'collection_type', 'status', 'total_amount', 'actions'];
  statuses = BOOKING_STATUSES;
  pageSize = 20;

  loading = signal(false);
  error = signal<string | null>(null);
  bookings = signal<Booking[]>([]);
  total = signal(0);
  page = signal(1);
  technicians = signal<Technician[]>([]);
  statusFilter = '';

  constructor(private http: HttpClient, private adminApi: AdminApiService) {}

  ngOnInit() {
    this.loadBookings();
    this.adminApi.getTechnicians().subscribe({
      next: (res: any) => this.technicians.set(res.items ?? res),
      error: () => {},
    });
  }

  loadBookings() {
    this.loading.set(true);
    this.error.set(null);

    let params = new HttpParams()
      .set('page', this.page())
      .set('page_size', this.pageSize);

    if (this.statusFilter) {
      params = params.set('status', this.statusFilter);
    }

    // Admin role sees all bookings via the shared /bookings endpoint
    this.http.get<any>('/bookings', { params }).subscribe({
      next: (res: any) => {
        this.bookings.set(res.items ?? res);
        this.total.set(res.total ?? res.length);
        this.loading.set(false);
      },
      error: (err: any) => {
        this.error.set(err.message || 'Failed to load bookings');
        this.loading.set(false);
      },
    });
  }

  onPageChange(p: number) {
    this.page.set(p);
    this.loadBookings();
  }

  assignTechnician(booking: Booking, technicianId: string) {
    this.http.post(`/technicians/${technicianId}/assign`, { booking_id: booking.id }).subscribe({
      next: (_res: any) => this.loadBookings(),
      error: (err: any) => {
        this.error.set(err.message || 'Failed to assign technician');
      },
    });
  }

  updateStatus(booking: Booking, status: string) {
    this.http.put(`/bookings/${booking.id}/status`, { status }).subscribe({
      next: (_res: any) => this.loadBookings(),
      error: (err: any) => {
        this.error.set(err.message || 'Failed to update booking status');
      },
    });
  }
}
