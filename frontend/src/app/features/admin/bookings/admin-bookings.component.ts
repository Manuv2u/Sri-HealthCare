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
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Booking, Technician } from '../../../core/api/api.types';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner.component';
import { ErrorBannerComponent } from '../../../shared/components/error-banner.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state.component';
import { PaginationComponent } from '../../../shared/components/pagination.component';
import { AdminApiService } from '../../../core/api/services/admin-api.service';

const BOOKING_STATUSES = [
  'booked', 'technician_assigned', 'accepted', 'on_the_way',
  'sample_collected', 'reached_lab', 'sample_delivered',
  'processing', 'report_ready', 'completed', 'cancelled',
];

const CANCELLATION_REASONS = [
  'Schedule changed',
  'Booked by mistake',
  'Test no longer required',
  'Found another diagnostic center',
  'Unable to visit',
  'Other',
];

const CANCELLABLE_STATUSES = new Set(['booked', 'technician_assigned', 'accepted']);

@Component({
  selector: 'app-admin-bookings',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatTableModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatCardModule, MatDialogModule, MatSnackBarModule,
    LoadingSpinnerComponent, ErrorBannerComponent, EmptyStateComponent, PaginationComponent,
  ],
  template: `
    <!-- Cancellation dialog -->
    @if (cancelDialog()) {
      <div class="dialog-backdrop" (click)="closeCancelDialog()">
        <div class="dialog-panel" (click)="$event.stopPropagation()">
          <div class="dialog-header">
            <h3>Cancel Booking</h3>
            <button class="dialog-close" (click)="closeCancelDialog()"><mat-icon>close</mat-icon></button>
          </div>

          @if (cancellationFee() !== null) {
            <div class="fee-notice">
              <mat-icon>warning</mat-icon>
              <div>
                <strong>Cancellation fee applies:</strong>
                ₹{{ cancellationFee() | number:'1.0-2' }} will be deducted from the refund.
              </div>
            </div>
          }

          <div class="dialog-body">
            <div class="field">
              <label>Cancellation Reason *</label>
              <select [(ngModel)]="cancelReasonSelect" (ngModelChange)="onReasonSelect($event)">
                <option value="">Select a reason</option>
                @for (r of cancelReasons; track r) {
                  <option [value]="r">{{ r }}</option>
                }
              </select>
            </div>

            @if (cancelReasonSelect === 'Other') {
              <div class="field" style="margin-top:.75rem">
                <label>Specify reason *</label>
                <textarea [(ngModel)]="cancelReasonCustom" rows="3" placeholder="Please describe the reason..."></textarea>
              </div>
            }
          </div>

          @if (cancelError()) {
            <div class="alert-error"><mat-icon>error_outline</mat-icon> {{ cancelError() }}</div>
          }

          <div class="dialog-actions">
            <button class="btn-ghost" (click)="closeCancelDialog()" [disabled]="cancelling()">Keep Booking</button>
            <button class="btn-danger" (click)="confirmCancel()" [disabled]="cancelling() || !cancelReasonFinal()">
              {{ cancelling() ? 'Cancelling…' : 'Cancel Booking' }}
            </button>
          </div>
        </div>
      </div>
    }

    <div class="bookings-container">
      <div class="page-header">
        <h1>Bookings</h1>
      </div>

      <mat-card>
        <mat-card-content>
          <div class="filters">
            <mat-form-field>
              <mat-label>Filter by Status</mat-label>
              <mat-select [(ngModel)]="statusFilter" (ngModelChange)="loadBookings()">
                <mat-option value="">All</mat-option>
                @for (s of statuses; track s) {
                  <mat-option [value]="s">{{ formatStatus(s) }}</mat-option>
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
                <td mat-cell *matCellDef="let b">
                  <span class="status-chip" [class]="'status-' + b.status">{{ formatStatus(b.status) }}</span>
                </td>
              </ng-container>

              <ng-container matColumnDef="cancellation_info">
                <th mat-header-cell *matHeaderCellDef>Cancellation</th>
                <td mat-cell *matCellDef="let b">
                  @if (b.status === 'cancelled' && b.cancellation_reason) {
                    <span class="cancel-reason" [title]="b.cancellation_reason">
                      {{ b.cancellation_reason | slice:0:30 }}{{ b.cancellation_reason.length > 30 ? '…' : '' }}
                    </span>
                    @if (b.cancellation_fee) {
                      <span class="cancel-fee">Fee: ₹{{ b.cancellation_fee }}</span>
                    }
                  } @else {
                    <span class="text-muted">—</span>
                  }
                </td>
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
                          <mat-option [value]="s">{{ formatStatus(s) }}</mat-option>
                        }
                      </mat-select>
                    </mat-form-field>

                    @if (isCancellable(b)) {
                      <button class="btn-cancel" (click)="openCancelDialog(b)" title="Cancel booking">
                        <mat-icon>cancel</mat-icon>
                      </button>
                    }
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
    .bookings-container { padding: 1.5rem; }
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;
      h1 { margin: 0; font-size: 1.25rem; font-weight: 700; }
    }
    mat-card { margin-bottom: 1rem; }
    .filters { display: flex; gap: 1rem; }
    table { width: 100%; }
    .row-actions { display: flex; gap: .5rem; align-items: center; flex-wrap: wrap; }
    .inline-select { width: 140px; }
    .table-scroll { overflow-x: auto; }

    .status-chip {
      display: inline-flex; padding: .2rem .6rem; border-radius: 999px; font-size: .75rem; font-weight: 600;
      &.status-booked { background: #bee3f8; color: #2b6cb0; }
      &.status-cancelled { background: #fed7d7; color: #9b2c2c; }
      &.status-completed { background: #c6f6d5; color: #276749; }
      &.status-processing, &.status-report_ready { background: #e9d8fd; color: #553c9a; }
    }
    .cancel-reason { display: block; font-size: .78rem; color: #4a5568; max-width: 160px; }
    .cancel-fee { display: block; font-size: .75rem; color: #e53e3e; font-weight: 600; }
    .text-muted { color: #a0aec0; font-size: .875rem; }

    .btn-cancel {
      background: none; border: 1.5px solid #fed7d7; border-radius: 6px; cursor: pointer;
      padding: .25rem; display: inline-flex; align-items: center; color: #e53e3e;
      mat-icon { font-size: 1.1rem; width: 1.1rem; height: 1.1rem; }
      &:hover { background: #fff5f5; }
    }

    /* Dialog */
    .dialog-backdrop {
      position: fixed; inset: 0; background: rgba(0,0,0,.45); z-index: 1000;
      display: flex; align-items: center; justify-content: center; padding: 1rem;
    }
    .dialog-panel {
      background: #fff; border-radius: 16px; padding: 1.5rem; width: 100%; max-width: 480px;
      box-shadow: 0 20px 60px rgba(0,0,0,.25);
    }
    .dialog-header {
      display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;
      h3 { font-size: 1.1rem; font-weight: 700; margin: 0; }
      .dialog-close { background: none; border: none; cursor: pointer; padding: .25rem; color: #718096; display: flex;
        mat-icon { font-size: 1.2rem; }
        &:hover { color: #1a202c; }
      }
    }
    .fee-notice {
      display: flex; align-items: flex-start; gap: .6rem; padding: .75rem .9rem;
      background: #fffbeb; border-radius: 8px; border-left: 3px solid #f59e0b;
      font-size: .875rem; color: #78350f; margin-bottom: 1rem;
      mat-icon { color: #f59e0b; flex-shrink: 0; font-size: 1.1rem; }
      strong { font-weight: 700; }
    }
    .dialog-body { display: flex; flex-direction: column; gap: .75rem; }
    .field {
      display: flex; flex-direction: column; gap: .4rem;
      label { font-size: .8rem; font-weight: 600; color: #4a5568; }
      select, textarea {
        border: 1px solid #e2e8f0; border-radius: 8px; padding: .55rem .75rem;
        font-size: .875rem; color: #2d3748; background: #fff;
        &:focus { outline: none; border-color: #00796b; box-shadow: 0 0 0 3px rgba(0,121,107,.1); }
      }
      textarea { resize: vertical; font-family: inherit; }
    }
    .alert-error {
      display: flex; align-items: center; gap: .5rem; padding: .65rem .9rem;
      background: #fed7d7; border-radius: 8px; color: #9b2c2c; font-size: .875rem; margin-top: .75rem;
      mat-icon { font-size: 1.1rem; width: 1.1rem; height: 1.1rem; }
    }
    .dialog-actions { display: flex; justify-content: flex-end; gap: .75rem; margin-top: 1.25rem; }
    .btn-ghost {
      background: none; border: 1px solid #e2e8f0; border-radius: 8px;
      padding: .55rem 1.1rem; font-size: .875rem; cursor: pointer; color: #4a5568;
      &:hover { background: #f7fafc; }
      &:disabled { opacity: .5; cursor: not-allowed; }
    }
    .btn-danger {
      background: #e53e3e; color: #fff; border: none; border-radius: 8px;
      padding: .55rem 1.25rem; font-size: .875rem; font-weight: 600; cursor: pointer;
      &:hover:not(:disabled) { background: #c53030; }
      &:disabled { opacity: .5; cursor: not-allowed; }
    }
  `],
})
export class AdminBookingsComponent implements OnInit {
  displayedColumns = ['reference_number', 'booking_date', 'collection_type', 'status', 'cancellation_info', 'actions'];
  statuses = BOOKING_STATUSES;
  cancelReasons = CANCELLATION_REASONS;
  pageSize = 20;

  loading = signal(false);
  error = signal<string | null>(null);
  bookings = signal<Booking[]>([]);
  total = signal(0);
  page = signal(1);
  technicians = signal<Technician[]>([]);
  statusFilter = '';

  // Cancel dialog state
  cancelDialog = signal(false);
  cancelTarget = signal<Booking | null>(null);
  cancelReasonSelect = '';
  cancelReasonCustom = '';
  cancellationFee = signal<number | null>(null);
  cancelError = signal<string | null>(null);
  cancelling = signal(false);

  get cancelReasonFinal(): () => string {
    return () => this.cancelReasonSelect === 'Other' ? this.cancelReasonCustom.trim() : this.cancelReasonSelect;
  }

  constructor(private http: HttpClient, private adminApi: AdminApiService, private snack: MatSnackBar) {}

  ngOnInit() {
    this.loadBookings();
    this.adminApi.getTechnicians().subscribe({
      next: (res: any) => this.technicians.set(res.items ?? res),
      error: () => {},
    });
    this.loadCancellationFee();
  }

  loadCancellationFee() {
    this.http.get<any>('/admin/settings/cancellation').subscribe({
      next: (cfg) => this.cancellationFee.set(cfg ? cfg.charge_value : null),
      error: () => {},
    });
  }

  loadBookings() {
    this.loading.set(true);
    this.error.set(null);
    let params = new HttpParams().set('page', this.page()).set('page_size', this.pageSize);
    if (this.statusFilter) params = params.set('status', this.statusFilter);
    this.http.get<any>('/bookings', { params }).subscribe({
      next: (res: any) => { this.bookings.set(res.items ?? res); this.total.set(res.total ?? res.length); this.loading.set(false); },
      error: (err: any) => { this.error.set(err.message || 'Failed to load bookings'); this.loading.set(false); },
    });
  }

  onPageChange(p: number) { this.page.set(p); this.loadBookings(); }

  isCancellable(b: Booking): boolean {
    return CANCELLABLE_STATUSES.has(b.status);
  }

  formatStatus(s: string): string {
    return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  openCancelDialog(b: Booking) {
    this.cancelTarget.set(b);
    this.cancelReasonSelect = '';
    this.cancelReasonCustom = '';
    this.cancelError.set(null);
    this.cancelDialog.set(true);
  }

  closeCancelDialog() {
    this.cancelDialog.set(false);
    this.cancelTarget.set(null);
  }

  onReasonSelect(val: string) {
    if (val !== 'Other') this.cancelReasonCustom = '';
  }

  confirmCancel() {
    const reason = this.cancelReasonSelect === 'Other' ? this.cancelReasonCustom.trim() : this.cancelReasonSelect;
    if (!reason) { this.cancelError.set('Please provide a cancellation reason.'); return; }
    const b = this.cancelTarget();
    if (!b) return;

    this.cancelling.set(true);
    this.cancelError.set(null);
    this.http.post(`/bookings/${b.id}/cancel`, { reason }).subscribe({
      next: () => {
        this.cancelling.set(false);
        this.closeCancelDialog();
        this.loadBookings();
        this.snack.open('Booking cancelled successfully.', 'OK', { duration: 3000 });
      },
      error: (err: any) => {
        this.cancelling.set(false);
        this.cancelError.set(err.error?.detail?.message || err.error?.message || 'Failed to cancel booking.');
      },
    });
  }

  assignTechnician(booking: Booking, technicianId: string) {
    this.http.post(`/technicians/${technicianId}/assign`, { booking_id: booking.id }).subscribe({
      next: () => { this.snack.open('Technician assigned successfully.', 'OK', { duration: 3000 }); this.loadBookings(); },
      error: (err: any) => { const msg = err?.error?.detail?.message ?? err?.message ?? 'Failed to assign'; this.error.set(msg); this.snack.open(msg, 'OK', { duration: 4000 }); },
    });
  }

  updateStatus(booking: Booking, status: string) {
    this.http.put(`/bookings/${booking.id}/status`, { status }).subscribe({
      next: () => { this.snack.open('Status updated.', 'OK', { duration: 3000 }); this.loadBookings(); },
      error: (err: any) => { const msg = err?.error?.detail?.message ?? err?.message ?? 'Failed to update status'; this.error.set(msg); this.snack.open(msg, 'OK', { duration: 4000 }); },
    });
  }
}
