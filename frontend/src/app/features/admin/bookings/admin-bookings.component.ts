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
            <div class="dialog-title-group">
              <div class="dialog-icon-wrap">
                <mat-icon>cancel</mat-icon>
              </div>
              <div>
                <h3 class="dialog-title">Cancel Booking</h3>
                @if (cancelTarget()) {
                  <p class="dialog-subtitle">{{ cancelTarget()!.reference_number }}</p>
                }
              </div>
            </div>
            <button class="dialog-close-btn" (click)="closeCancelDialog()" aria-label="Close">
              <mat-icon>close</mat-icon>
            </button>
          </div>

          @if (cancellationFee() !== null) {
            <div class="fee-notice">
              <mat-icon class="fee-icon">info</mat-icon>
              <div>
                <span class="fee-label">Cancellation fee applies</span>
                <span class="fee-amount">₹{{ cancellationFee() | number:'1.0-2' }} will be deducted from the refund.</span>
              </div>
            </div>
          }

          <div class="dialog-body">
            <div class="field-group">
              <label class="field-label">Cancellation Reason <span class="required">*</span></label>
              <div class="select-wrapper">
                <select class="styled-select" [(ngModel)]="cancelReasonSelect" (ngModelChange)="onReasonSelect($event)">
                  <option value="">Select a reason</option>
                  @for (r of cancelReasons; track r) {
                    <option [value]="r">{{ r }}</option>
                  }
                </select>
                <mat-icon class="select-chevron">expand_more</mat-icon>
              </div>
            </div>

            @if (cancelReasonSelect === 'Other') {
              <div class="field-group">
                <label class="field-label">Specify reason <span class="required">*</span></label>
                <textarea
                  class="styled-textarea"
                  [(ngModel)]="cancelReasonCustom"
                  rows="3"
                  placeholder="Please describe the reason for cancellation…"
                ></textarea>
              </div>
            }
          </div>

          @if (cancelError()) {
            <div class="alert-error">
              <mat-icon>error_outline</mat-icon>
              <span>{{ cancelError() }}</span>
            </div>
          }

          <div class="dialog-actions">
            <button class="btn-ghost" (click)="closeCancelDialog()" [disabled]="cancelling()">Keep Booking</button>
            <button class="btn-danger" (click)="confirmCancel()" [disabled]="cancelling() || !cancelReasonFinal()">
              @if (cancelling()) {
                <span class="btn-spinner"></span>
                Cancelling…
              } @else {
                Cancel Booking
              }
            </button>
          </div>
        </div>
      </div>
    }

    <div class="bookings-page">
      <!-- Page header -->
      <div class="page-header">
        <div class="page-title-row">
          <h1 class="page-title">All Bookings</h1>
          @if (total() > 0) {
            <span class="count-badge">{{ total() }}</span>
          }
        </div>
        <p class="page-subtitle">Manage and track diagnostic bookings across all patients</p>
      </div>

      <!-- Filter bar -->
      <div class="filter-bar">
        <div class="filter-left">
          <div class="filter-field">
            <mat-icon class="filter-icon">filter_list</mat-icon>
            <div class="select-wrapper filter-select-wrapper">
              <select class="styled-select filter-select" [(ngModel)]="statusFilter" (ngModelChange)="loadBookings()">
                <option value="">All Statuses</option>
                @for (s of statuses; track s) {
                  <option [value]="s">{{ formatStatus(s) }}</option>
                }
              </select>
              <mat-icon class="select-chevron">expand_more</mat-icon>
            </div>
          </div>
        </div>
        <div class="filter-right">
          <span class="results-label">
            @if (loading()) { Loading… } @else { {{ bookings().length }} of {{ total() }} results }
          </span>
        </div>
      </div>

      <!-- Content -->
      @if (loading()) {
        <div class="state-container">
          <app-loading-spinner />
        </div>
      } @else if (error()) {
        <div class="state-container">
          <app-error-banner [message]="error()!" retryLabel="Retry" (retry)="loadBookings()" />
        </div>
      } @else if (bookings().length === 0) {
        <div class="state-container">
          <app-empty-state message="No bookings found" />
        </div>
      } @else {
        <div class="table-surface">
          <div class="table-scroll">
            <table class="bookings-table">
              <thead>
                <tr>
                  <th class="th-reference">Reference</th>
                  <th class="th-date">Date</th>
                  <th class="th-collection">Collection</th>
                  <th class="th-status">Status</th>
                  <th class="th-cancellation">Cancellation</th>
                  <th class="th-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                @for (b of bookings(); track b.id; let odd = $odd) {
                  <tr class="booking-row" [class.row-odd]="odd">
                    <td class="td-reference">
                      <span class="ref-link">{{ b.reference_number }}</span>
                    </td>
                    <td class="td-date">
                      <span class="date-value">{{ b.booking_date | date:'d MMM y' }}</span>
                      <span class="time-value">{{ b.booking_date | date:'h:mm a' }}</span>
                    </td>
                    <td class="td-collection">
                      <span class="collection-badge" [class]="'collection-' + b.collection_type">
                        <mat-icon class="badge-icon">{{ b.collection_type === 'home' ? 'home' : 'science' }}</mat-icon>
                        {{ b.collection_type | titlecase }}
                      </span>
                    </td>
                    <td class="td-status">
                      <span class="status-chip" [class]="'status-' + b.status">
                        {{ formatStatus(b.status) }}
                      </span>
                    </td>
                    <td class="td-cancellation">
                      @if (b.status === 'cancelled' && b.cancellation_reason) {
                        <div class="cancel-info">
                          <span class="cancel-reason" [title]="b.cancellation_reason">
                            {{ b.cancellation_reason | slice:0:32 }}{{ b.cancellation_reason.length > 32 ? '…' : '' }}
                          </span>
                          @if (b.cancellation_fee) {
                            <span class="cancel-fee">₹{{ b.cancellation_fee }}</span>
                          }
                        </div>
                      } @else {
                        <span class="cell-empty">—</span>
                      }
                    </td>
                    <td class="td-actions">
                      <div class="row-actions">
                        <!-- Assign Technician -->
                        <div class="action-select-wrap" title="Assign technician">
                          <mat-icon class="action-icon">person_add</mat-icon>
                          <div class="select-wrapper action-select-wrapper">
                            <select class="styled-select action-select" (change)="assignTechnician(b, $any($event.target).value)" [ngModel]="null">
                              <option value="" disabled selected>Assign Tech</option>
                              @for (t of technicians(); track t.id) {
                                <option [value]="t.id">{{ t.name }}</option>
                              }
                            </select>
                            <mat-icon class="select-chevron">expand_more</mat-icon>
                          </div>
                        </div>

                        <!-- Update Status -->
                        <div class="action-select-wrap" title="Update status">
                          <mat-icon class="action-icon">sync</mat-icon>
                          <div class="select-wrapper action-select-wrapper">
                            <select class="styled-select action-select" [ngModel]="b.status" (ngModelChange)="updateStatus(b, $event)">
                              @for (s of statuses; track s) {
                                <option [value]="s">{{ formatStatus(s) }}</option>
                              }
                            </select>
                            <mat-icon class="select-chevron">expand_more</mat-icon>
                          </div>
                        </div>

                        <!-- Cancel -->
                        @if (isCancellable(b)) {
                          <button class="btn-cancel-row" (click)="openCancelDialog(b)" title="Cancel booking">
                            <mat-icon>cancel</mat-icon>
                          </button>
                        }
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <div class="pagination-wrap">
            <app-pagination
              [page]="page()"
              [total]="total()"
              [pageSize]="pageSize"
              (pageChange)="onPageChange($event)"
            />
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    /* ── Tokens ─────────────────────────────────────────────── */
    :host {
      --primary:        #6366F1;
      --primary-dark:   #4F46E5;
      --primary-light:  #EEF2FF;
      --accent:         #F97316;
      --accent-dark:    #EA580C;
      --success:        #22C55E;
      --success-bg:     #F0FDF4;
      --warning:        #F59E0B;
      --warning-bg:     #FFFBEB;
      --error:          #EF4444;
      --error-bg:       #FEF2F2;
      --bg:             #F8F9FF;
      --surface:        #FFFFFF;
      --text:           #0F172A;
      --text-secondary: #475569;
      --muted:          #94A3B8;
      --border:         #E2E8F0;
      --radius:         12px;
      --radius-lg:      16px;
      --radius-pill:    999px;
      --shadow-sm:      0 1px 3px rgba(15,23,42,.06), 0 1px 2px rgba(15,23,42,.04);
      --shadow-md:      0 4px 12px rgba(15,23,42,.08), 0 2px 4px rgba(15,23,42,.04);
      --shadow-lg:      0 10px 30px rgba(15,23,42,.10), 0 4px 10px rgba(15,23,42,.05);
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      display: block;
    }

    /* ── Layout ─────────────────────────────────────────────── */
    .bookings-page {
      padding: 2rem 2rem 3rem;
      background: var(--bg);
      min-height: 100vh;
    }

    /* ── Page header ─────────────────────────────────────────── */
    .page-header {
      margin-bottom: 1.75rem;
    }
    .page-title-row {
      display: flex;
      align-items: center;
      gap: .75rem;
      margin-bottom: .35rem;
    }
    .page-title {
      margin: 0;
      font-size: 1.5rem;
      font-weight: 700;
      letter-spacing: -.02em;
      color: var(--text);
    }
    .count-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 28px;
      height: 24px;
      padding: 0 8px;
      background: var(--primary-light);
      color: var(--primary-dark);
      font-size: .75rem;
      font-weight: 700;
      letter-spacing: .01em;
      border-radius: var(--radius-pill);
      font-variant-numeric: tabular-nums;
    }
    .page-subtitle {
      margin: 0;
      font-size: .875rem;
      color: var(--text-secondary);
    }

    /* ── Filter bar ──────────────────────────────────────────── */
    .filter-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      margin-bottom: 1.25rem;
      flex-wrap: wrap;
    }
    .filter-left {
      display: flex;
      align-items: center;
      gap: .75rem;
    }
    .filter-field {
      display: flex;
      align-items: center;
      gap: .5rem;
    }
    .filter-icon {
      color: var(--muted);
      font-size: 1.1rem;
      width: 1.1rem;
      height: 1.1rem;
      flex-shrink: 0;
    }
    .filter-select-wrapper {
      min-width: 200px;
    }
    .filter-select {
      font-size: .875rem;
    }
    .results-label {
      font-size: .8125rem;
      color: var(--muted);
      font-variant-numeric: tabular-nums;
    }

    /* ── Select wrapper (shared) ─────────────────────────────── */
    .select-wrapper {
      position: relative;
      display: inline-flex;
      align-items: center;
    }
    .styled-select {
      appearance: none;
      -webkit-appearance: none;
      border: 1.5px solid var(--border);
      border-radius: var(--radius);
      padding: .5rem 2.25rem .5rem .75rem;
      font-size: .8125rem;
      color: var(--text);
      background: var(--surface);
      cursor: pointer;
      width: 100%;
      transition: border-color .15s ease, box-shadow .15s ease;
      font-family: inherit;
    }
    .styled-select:focus {
      outline: none;
      border-color: var(--primary);
      box-shadow: 0 0 0 3px rgba(99,102,241,.12);
    }
    .styled-select:hover:not(:focus) {
      border-color: var(--primary);
    }
    .select-chevron {
      position: absolute;
      right: .5rem;
      pointer-events: none;
      font-size: 1rem;
      width: 1rem;
      height: 1rem;
      color: var(--muted);
    }

    /* ── State containers ────────────────────────────────────── */
    .state-container {
      padding: 3rem 0;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    /* ── Table surface ───────────────────────────────────────── */
    .table-surface {
      background: var(--surface);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-md);
      border: 1px solid var(--border);
      overflow: hidden;
    }
    .table-scroll {
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
    }

    /* ── Table ───────────────────────────────────────────────── */
    .bookings-table {
      width: 100%;
      border-collapse: collapse;
      font-size: .8125rem;
      white-space: nowrap;
    }

    /* Headers */
    .bookings-table thead tr {
      background: #F1F5F9;
      border-bottom: 1.5px solid var(--border);
    }
    .bookings-table th {
      padding: .75rem 1rem;
      text-align: left;
      font-size: .6875rem;
      font-weight: 700;
      letter-spacing: .07em;
      text-transform: uppercase;
      color: var(--text-secondary);
      white-space: nowrap;
    }
    .th-actions { text-align: right; }

    /* Rows */
    .booking-row {
      border-bottom: 1px solid var(--border);
      transition: background .1s ease;
    }
    .booking-row:last-child {
      border-bottom: none;
    }
    .booking-row:hover {
      background: var(--primary-light) !important;
    }
    .booking-row.row-odd {
      background: #FAFBFF;
    }

    /* Cells */
    .bookings-table td {
      padding: .875rem 1rem;
      vertical-align: middle;
    }

    /* Reference */
    .td-reference { min-width: 140px; }
    .ref-link {
      font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
      font-size: .8rem;
      font-weight: 600;
      color: var(--primary-dark);
      letter-spacing: .01em;
    }

    /* Date */
    .td-date { min-width: 110px; }
    .date-value {
      display: block;
      font-weight: 500;
      color: var(--text);
      font-variant-numeric: tabular-nums;
    }
    .time-value {
      display: block;
      font-size: .74rem;
      color: var(--muted);
      font-variant-numeric: tabular-nums;
      margin-top: .1rem;
    }

    /* Collection badge */
    .td-collection { min-width: 110px; }
    .collection-badge {
      display: inline-flex;
      align-items: center;
      gap: .3rem;
      padding: .25rem .6rem;
      border-radius: var(--radius-pill);
      font-size: .72rem;
      font-weight: 600;
      letter-spacing: .01em;
    }
    .badge-icon {
      font-size: .85rem;
      width: .85rem;
      height: .85rem;
    }
    .collection-home {
      background: var(--primary-light);
      color: var(--primary-dark);
    }
    .collection-lab {
      background: #ECFDF5;
      color: #065F46;
    }

    /* Status chip */
    .td-status { min-width: 140px; }
    .status-chip {
      display: inline-flex;
      align-items: center;
      padding: .25rem .65rem;
      border-radius: var(--radius-pill);
      font-size: .72rem;
      font-weight: 600;
      letter-spacing: .01em;
      white-space: nowrap;
    }
    .status-booked             { background: #EFF6FF; color: #1D4ED8; }
    .status-technician_assigned { background: #EDE9FE; color: #5B21B6; }
    .status-accepted           { background: #F0FDFA; color: #0F766E; }
    .status-on_the_way         { background: #FFF7ED; color: var(--accent-dark); }
    .status-sample_collected   { background: #FEF9C3; color: #854D0E; }
    .status-reached_lab        { background: #ECFDF5; color: #065F46; }
    .status-sample_delivered   { background: #F0FDF4; color: #15803D; }
    .status-processing         { background: #EDE9FE; color: #6D28D9; }
    .status-report_ready       { background: #EFF6FF; color: #1E40AF; }
    .status-completed          { background: #F0FDF4; color: #166534; }
    .status-cancelled          { background: #FEF2F2; color: #B91C1C; }

    /* Cancellation */
    .td-cancellation { min-width: 160px; max-width: 200px; }
    .cancel-info { display: flex; flex-direction: column; gap: .2rem; }
    .cancel-reason {
      font-size: .78rem;
      color: var(--text-secondary);
      white-space: normal;
      line-height: 1.35;
    }
    .cancel-fee {
      font-size: .72rem;
      font-weight: 700;
      color: var(--error);
      font-variant-numeric: tabular-nums;
    }
    .cell-empty { color: var(--muted); }

    /* Actions */
    .td-actions { min-width: 280px; }
    .row-actions {
      display: flex;
      align-items: center;
      gap: .5rem;
      justify-content: flex-end;
    }
    .action-select-wrap {
      display: flex;
      align-items: center;
      gap: .3rem;
    }
    .action-icon {
      color: var(--muted);
      font-size: .95rem;
      width: .95rem;
      height: .95rem;
      flex-shrink: 0;
    }
    .action-select-wrapper {
      width: 130px;
    }
    .action-select {
      font-size: .75rem;
      padding: .4rem 2rem .4rem .6rem;
    }

    .btn-cancel-row {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border: 1.5px solid #FECACA;
      border-radius: var(--radius);
      background: #FEF2F2;
      color: var(--error);
      cursor: pointer;
      transition: background .15s ease, border-color .15s ease, transform .1s ease;
      flex-shrink: 0;
    }
    .btn-cancel-row mat-icon {
      font-size: 1rem;
      width: 1rem;
      height: 1rem;
    }
    .btn-cancel-row:hover {
      background: var(--error);
      border-color: var(--error);
      color: #fff;
      transform: scale(1.05);
    }

    /* Pagination */
    .pagination-wrap {
      padding: .75rem 1rem;
      border-top: 1px solid var(--border);
      background: #FAFBFF;
    }

    /* ── Dialog ──────────────────────────────────────────────── */
    .dialog-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, .5);
      backdrop-filter: blur(4px);
      -webkit-backdrop-filter: blur(4px);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
      animation: backdrop-in .15s ease;
    }
    @keyframes backdrop-in {
      from { opacity: 0; }
      to   { opacity: 1; }
    }

    .dialog-panel {
      background: var(--surface);
      border-radius: var(--radius-lg);
      width: 100%;
      max-width: 460px;
      box-shadow: var(--shadow-lg), 0 0 0 1px rgba(15,23,42,.06);
      animation: panel-in .18s ease;
      overflow: hidden;
    }
    @keyframes panel-in {
      from { opacity: 0; transform: translateY(8px) scale(.98); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }

    .dialog-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      padding: 1.25rem 1.25rem 1rem;
      border-bottom: 1px solid var(--border);
    }
    .dialog-title-group {
      display: flex;
      align-items: flex-start;
      gap: .75rem;
    }
    .dialog-icon-wrap {
      width: 40px;
      height: 40px;
      border-radius: var(--radius);
      background: var(--error-bg);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .dialog-icon-wrap mat-icon {
      color: var(--error);
      font-size: 1.15rem;
      width: 1.15rem;
      height: 1.15rem;
    }
    .dialog-title {
      margin: 0 0 .15rem;
      font-size: 1rem;
      font-weight: 700;
      color: var(--text);
      letter-spacing: -.01em;
    }
    .dialog-subtitle {
      margin: 0;
      font-size: .78rem;
      color: var(--muted);
      font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
    }
    .dialog-close-btn {
      background: none;
      border: 1px solid var(--border);
      border-radius: 8px;
      cursor: pointer;
      padding: .25rem;
      display: flex;
      align-items: center;
      color: var(--muted);
      transition: color .15s ease, background .15s ease;
      flex-shrink: 0;
    }
    .dialog-close-btn mat-icon { font-size: 1.1rem; width: 1.1rem; height: 1.1rem; }
    .dialog-close-btn:hover { color: var(--text); background: var(--bg); }

    .fee-notice {
      display: flex;
      align-items: flex-start;
      gap: .6rem;
      padding: .8rem 1.25rem;
      background: var(--warning-bg);
      border-bottom: 1px solid #FDE68A;
    }
    .fee-icon {
      color: var(--warning);
      font-size: 1rem;
      width: 1rem;
      height: 1rem;
      flex-shrink: 0;
      margin-top: .1rem;
    }
    .fee-label {
      display: block;
      font-size: .8rem;
      font-weight: 700;
      color: #78350F;
    }
    .fee-amount {
      display: block;
      font-size: .78rem;
      color: #92400E;
      margin-top: .1rem;
      font-variant-numeric: tabular-nums;
    }

    .dialog-body {
      display: flex;
      flex-direction: column;
      gap: .9rem;
      padding: 1.25rem;
    }

    .field-group {
      display: flex;
      flex-direction: column;
      gap: .4rem;
    }
    .field-label {
      font-size: .78rem;
      font-weight: 600;
      color: var(--text-secondary);
      letter-spacing: .01em;
    }
    .required { color: var(--error); }
    .field-group .select-wrapper {
      width: 100%;
      display: flex;
    }
    .field-group .styled-select {
      width: 100%;
    }
    .styled-textarea {
      border: 1.5px solid var(--border);
      border-radius: var(--radius);
      padding: .6rem .75rem;
      font-size: .875rem;
      color: var(--text);
      background: var(--surface);
      resize: vertical;
      font-family: inherit;
      line-height: 1.5;
      transition: border-color .15s ease, box-shadow .15s ease;
      width: 100%;
      box-sizing: border-box;
    }
    .styled-textarea:focus {
      outline: none;
      border-color: var(--primary);
      box-shadow: 0 0 0 3px rgba(99,102,241,.12);
    }

    .alert-error {
      display: flex;
      align-items: center;
      gap: .5rem;
      padding: .7rem 1.25rem;
      background: var(--error-bg);
      border-top: 1px solid #FECACA;
      color: #991B1B;
      font-size: .8125rem;
    }
    .alert-error mat-icon { font-size: 1rem; width: 1rem; height: 1rem; flex-shrink: 0; }

    .dialog-actions {
      display: flex;
      justify-content: flex-end;
      gap: .625rem;
      padding: 1rem 1.25rem;
      border-top: 1px solid var(--border);
      background: #FAFBFF;
    }

    .btn-ghost {
      background: var(--surface);
      border: 1.5px solid var(--border);
      border-radius: 10px;
      padding: .5rem 1.1rem;
      font-size: .875rem;
      font-weight: 500;
      cursor: pointer;
      color: var(--text-secondary);
      font-family: inherit;
      transition: border-color .15s ease, color .15s ease;
    }
    .btn-ghost:hover:not(:disabled) {
      border-color: var(--primary);
      color: var(--primary-dark);
    }
    .btn-ghost:disabled { opacity: .5; cursor: not-allowed; }

    .btn-danger {
      display: inline-flex;
      align-items: center;
      gap: .4rem;
      background: var(--error);
      color: #fff;
      border: none;
      border-radius: 10px;
      padding: .5rem 1.25rem;
      font-size: .875rem;
      font-weight: 600;
      cursor: pointer;
      font-family: inherit;
      transition: background .15s ease, transform .1s ease;
    }
    .btn-danger:hover:not(:disabled) {
      background: #DC2626;
      transform: translateY(-1px);
    }
    .btn-danger:disabled { opacity: .5; cursor: not-allowed; transform: none; }

    .btn-spinner {
      display: inline-block;
      width: 14px;
      height: 14px;
      border: 2px solid rgba(255,255,255,.35);
      border-top-color: #fff;
      border-radius: 50%;
      animation: spin .7s linear infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    @media (prefers-reduced-motion: reduce) {
      .dialog-backdrop, .dialog-panel, .btn-cancel-row, .btn-danger, .booking-row { animation: none; transition: none; }
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
