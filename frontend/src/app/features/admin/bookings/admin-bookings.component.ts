import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BookingApiService } from '../../../core/api/services/booking-api.service';
import { AdminApiService } from '../../../core/api/services/admin-api.service';
import { ReportApiService } from '../../../core/api/services/report-api.service';
import { PaymentApiService } from '../../../core/api/services/payment-api.service';
import { Booking, Technician } from '../../../core/api/api.types';
import { BadgeComponent } from '../../../shared/components/badge/badge.component';
import { SpinnerComponent } from '../../../shared/components/spinner/spinner.component';
import { AlertComponent } from '../../../shared/components/alert/alert.component';

const STATUS_OPTIONS = [
  'booked',
  'technician_assigned',
  'accepted',
  'on_the_way',
  'sample_collected',
  'reached_lab',
  'sample_delivered',
  'processing',
  'report_ready',
  'completed',
  'cancelled',
];

@Component({
  selector: 'app-admin-bookings',
  standalone: true,
  imports: [CommonModule, FormsModule, BadgeComponent, SpinnerComponent, AlertComponent],
  template: `
<div class="page">
  @if (!selected()) {
    <div class="page-header">
      <div><h1 class="page-title">All Bookings</h1><p class="page-sub">View and manage all patient appointment bookings</p></div>
    </div>

    @if (toast()) { <app-alert type="success" [dismissible]="true" (dismissed)="toast.set('')">{{ toast() }}</app-alert> }
    @if (error()) { <app-alert type="error" [dismissible]="true" (dismissed)="error.set('')">{{ error() }}</app-alert> }

    <!-- Filters -->
    <div class="filter-bar">
      <div class="search-field">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        <input placeholder="Search reference number…" [(ngModel)]="searchQ" (input)="applyFilter()" />
      </div>
      <select class="filter-sel" [(ngModel)]="statusFilter" (change)="applyFilter()">
        <option value="">All Status</option>
        @for (s of statusOptions; track s) { <option [value]="s">{{ fmtStatus(s) }}</option> }
      </select>
      <select class="filter-sel" [(ngModel)]="typeFilter" (change)="applyFilter()">
        <option value="">All Types</option>
        <option value="home">Home Collection</option>
        <option value="lab">Lab Visit</option>
      </select>
      <span class="count-badge">{{ filtered().length }} bookings</span>
    </div>

    @if (loading()) {
      <div class="load-wrap"><app-spinner size="md" /></div>
    } @else {
      <div class="table-wrap">
        <table class="tbl">
          <thead>
            <tr><th>Reference</th><th>Date</th><th>Type</th><th>Amount</th><th>Status</th><th>Payment</th><th>Created</th><th>Actions</th></tr>
          </thead>
          <tbody>
            @if (filtered().length === 0) { <tr><td colspan="8" class="empty-td">No bookings found.</td></tr> }
            @for (b of paged(); track b.id) {
              <tr>
                <td class="mono ref-cell">{{ b.reference_number }}</td>
                <td class="text-sm">{{ b.booking_date | date:'dd MMM yyyy' }}</td>
                <td>
                  <span class="type-chip" [class.home]="b.collection_type === 'home'">
                    {{ b.collection_type === 'home' ? '🏠 Home' : '🏥 Lab' }}
                  </span>
                </td>
                <td class="fw-med">₹{{ (b.total_amount || 0).toLocaleString('en-IN') }}</td>
                <td><app-badge [color]="statusColor(b.status)" size="sm">{{ fmtStatus(b.status) }}</app-badge></td>
                <td><app-badge [color]="payColor(b.payment_status)" size="sm">{{ fmtStatus(b.payment_status) }}</app-badge></td>
                <td class="text-sm text-muted">{{ b.created_at | date:'dd MMM' }}</td>
                <td><button class="manage-btn" (click)="openManage(b)">Manage</button></td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      @if (totalPages() > 1) {
        <div class="pagination">
          <button class="pg-btn" [disabled]="page() === 1" (click)="page.set(page()-1)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <span class="pg-info">Page {{ page() }} of {{ totalPages() }}</span>
          <button class="pg-btn" [disabled]="page() >= totalPages()" (click)="page.set(page()+1)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>
      }
    }
  }

  <!-- ═══ BOOKING DETAIL CARD (replaces the drawer) ═══ -->
  @if (selected(); as b) {
    <div class="back-nav">
      <a class="back-link" (click)="closeManage()">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
        Back to Bookings
      </a>
    </div>

    @if (toast()) { <app-alert type="success" [dismissible]="true" (dismissed)="toast.set('')">{{ toast() }}</app-alert> }
    @if (formErr()) { <app-alert type="error" [dismissible]="true" (dismissed)="formErr.set('')">{{ formErr() }}</app-alert> }

    <div class="detail-layout">
      <!-- Header -->
      <div class="header-card">
        <div class="header-left">
          <span class="ref-chip">{{ b.reference_number }}</span>
          <h1 class="booking-title">{{ b.reference_number }}</h1>
          <p class="created-on">{{ b.booking_date | date:'dd MMM yyyy' }} · {{ b.collection_type === 'home' ? 'Home Collection' : 'Lab Visit' }}</p>
        </div>
        <div class="header-right">
          <app-badge [color]="statusColor(b.status)" size="lg">{{ fmtStatus(b.status) }}</app-badge>
        </div>
      </div>

      @if (detailLoading()) {
        <div class="detail-loading"><app-spinner size="sm" /> <span>Loading details…</span></div>
      }

      @if (detail(); as d) {
        <div class="info-grid">
          <!-- Patient & Contact -->
          <div class="info-card">
            <h2 class="card-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              Patient &amp; Contact
            </h2>
            <div class="info-rows">
              <div class="info-row"><span class="info-label">Patient</span><span class="info-val">{{ d.patient_name || '—' }}<span class="rel" *ngIf="d.patient_relationship"> ({{ d.patient_relationship }})</span></span></div>
              <div class="info-row"><span class="info-label">Booked by</span><span class="info-val">{{ d.contact_name || '—' }}</span></div>
              <div class="info-row"><span class="info-label">Phone</span><span class="info-val">{{ d.contact_phone || '—' }}</span></div>
              <div class="info-row"><span class="info-label">Email</span><span class="info-val">{{ d.contact_email || '—' }}</span></div>
            </div>
          </div>

          <!-- Schedule -->
          <div class="info-card">
            <h2 class="card-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              Schedule
            </h2>
            <div class="info-rows">
              <div class="info-row"><span class="info-label">Date</span><span class="info-val">{{ b.booking_date | date:'dd MMM yyyy' }}</span></div>
              @if (d.time_slot) { <div class="info-row"><span class="info-label">Time Slot</span><span class="info-val">{{ d.time_slot.start_time }} – {{ d.time_slot.end_time }}</span></div> }
              <div class="info-row"><span class="info-label">Type</span><span class="info-val">{{ b.collection_type === 'home' ? 'Home Collection' : 'Lab Visit' }}</span></div>
              @if (d.lab_branch) { <div class="info-row"><span class="info-label">Lab Branch</span><span class="info-val">{{ d.lab_branch.name }}</span></div> }
            </div>
            @if (d.lab_branch) { <p class="addr-text muted-text">{{ d.lab_branch.address }}, {{ d.lab_branch.city }} - {{ d.lab_branch.pincode }} · ☎ {{ d.lab_branch.phone }}</p> }
          </div>

          <!-- Collection Address (home only) -->
          @if (d.address) {
            <div class="info-card">
              <h2 class="card-title">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                Collection Address
              </h2>
              <p class="addr-text">
                <strong>{{ d.address.label }}</strong><br/>
                {{ d.address.address_line1 }}<span *ngIf="d.address.address_line2">, {{ d.address.address_line2 }}</span><br/>
                {{ d.address.city }}, {{ d.address.state }} - {{ d.address.pincode }}
              </p>
              <a class="maps-link" [href]="mapsUrl(d.address)" target="_blank" rel="noopener">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="10" r="3"/><path d="M12 21s-7-6.5-7-11a7 7 0 0114 0c0 4.5-7 11-7 11z"/></svg>
                View on Google Maps
              </a>
            </div>
          }

          <!-- Payment -->
          @if (d.payment; as pay) {
            <div class="info-card">
              <h2 class="card-title">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
                Payment
              </h2>
              <div class="info-rows">
                <div class="info-row"><span class="info-label">Method</span><span class="info-val">{{ fmtStatus(pay.method) }}</span></div>
                <div class="info-row"><span class="info-label">Status</span><app-badge [color]="payColor(pay.status)" size="sm">{{ fmtStatus(pay.status) }}</app-badge></div>
                <div class="info-row"><span class="info-label">Amount</span><span class="info-val">₹{{ (pay.amount || 0).toLocaleString('en-IN') }}</span></div>
                <div class="info-row"><span class="info-label">GST</span><span class="info-val">₹{{ (pay.gst_amount || 0).toLocaleString('en-IN') }}</span></div>
                @if (pay.invoice_number) { <div class="info-row"><span class="info-label">Invoice</span><span class="info-val">{{ pay.invoice_number }}</span></div> }
                @if (pay.notes) { <div class="info-row"><span class="info-label">Notes</span><span class="info-val">{{ pay.notes }}</span></div> }
              </div>

              @if (pay.status !== 'paid') {
                <div class="inline-action">
                  @if (!showCashForm()) {
                    <button class="btn-ghost" (click)="openCashForm(pay)">💵 Mark Payment as Received</button>
                  } @else {
                    <div class="cash-form">
                      <select class="field" [(ngModel)]="cashMethod">
                        <option value="cash">Cash</option>
                        <option value="upi">UPI</option>
                        <option value="card">Card</option>
                      </select>
                      <input class="field" type="number" min="0" step="0.01" [(ngModel)]="cashAmount" placeholder="Amount received" />
                      <input class="field" type="datetime-local" [(ngModel)]="cashReceivedAt" />
                      <textarea class="field textarea" rows="2" [(ngModel)]="cashNotes" placeholder="Notes (optional)…"></textarea>
                      <div class="row-actions">
                        <button class="btn-ghost" (click)="showCashForm.set(false)">Cancel</button>
                        <button class="btn-primary" [disabled]="busy() || !cashAmount || !cashReceivedAt" (click)="saveCashReceived(b)">
                          {{ busy() ? 'Saving…' : 'Confirm Payment' }}
                        </button>
                      </div>
                    </div>
                  }
                </div>
              }
            </div>
          }

          <!-- Assigned Technician (home collection only) -->
          @if (b.collection_type === 'home' && d.assigned_technician) {
            <div class="info-card">
              <h2 class="card-title">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.24 12.24a6 6 0 00-8.49-8.49L5 10.5V19h8.5z"/><line x1="16" y1="8" x2="2" y2="22"/><line x1="17.5" y1="15" x2="9" y2="15"/></svg>
                Assigned Technician
              </h2>
              <div class="info-rows">
                <div class="info-row"><span class="info-label">Name</span><span class="info-val">{{ d.assigned_technician.name || '—' }}</span></div>
                <div class="info-row"><span class="info-label">Phone</span><span class="info-val">{{ d.assigned_technician.phone || '—' }}</span></div>
                <div class="info-row"><span class="info-label">Response</span><span class="info-val">{{ fmtStatus(d.assigned_technician.assignment_status) }}</span></div>
              </div>
            </div>
          }

          <!-- Refund -->
          @if (d.refund; as rf) {
            <div class="info-card">
              <h2 class="card-title">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></svg>
                Refund
              </h2>
              <div class="info-rows">
                <div class="info-row"><span class="info-label">Amount</span><span class="info-val">₹{{ (rf.amount || 0).toLocaleString('en-IN') }}</span></div>
                <div class="info-row"><span class="info-label">Status</span><app-badge [color]="refundColor(rf.status)" size="sm">{{ fmtStatus(rf.status) }}</app-badge></div>
                @if (rf.transaction_reference) { <div class="info-row"><span class="info-label">Reference</span><span class="info-val">{{ rf.transaction_reference }}</span></div> }
                @if (rf.remarks) { <div class="info-row"><span class="info-label">Remarks</span><span class="info-val">{{ rf.remarks }}</span></div> }
              </div>

              @if (refundNextOptions(rf.status).length) {
                <div class="inline-action">
                  @if (!showRefundForm()) {
                    <button class="btn-ghost" (click)="showRefundForm.set(true)">Process Refund</button>
                  } @else {
                    <div class="cash-form">
                      <select class="field" [(ngModel)]="refundStatus">
                        @for (opt of refundNextOptions(rf.status); track opt) { <option [value]="opt">{{ fmtStatus(opt) }}</option> }
                      </select>
                      <input class="field" type="text" [(ngModel)]="refundTxnRef" placeholder="Transaction reference (optional)" />
                      <textarea class="field textarea" rows="2" [(ngModel)]="refundRemarks" placeholder="Remarks (optional)…"></textarea>
                      <div class="row-actions">
                        <button class="btn-ghost" (click)="showRefundForm.set(false)">Cancel</button>
                        <button class="btn-primary" [disabled]="busy()" (click)="saveRefundStatus(rf)">
                          {{ busy() ? 'Saving…' : 'Update Refund' }}
                        </button>
                      </div>
                    </div>
                  }
                </div>
              }
            </div>
          }
        </div>

        <!-- Tests / Packages -->
        @if (b.items && b.items.length) {
          <div class="tests-card">
            <h2 class="card-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              Tests &amp; Packages ({{ b.items.length }})
            </h2>
            <div class="tests-table">
              <div class="tests-header"><span>Item</span><span class="text-right">Price</span></div>
              @for (it of b.items; track it.id) {
                <div class="tests-row">
                  <span class="item-name">{{ it.item_name || it.item_type }}</span>
                  <span class="item-price">₹{{ (it.unit_price || 0).toLocaleString('en-IN') }}</span>
                </div>
              }
              <div class="tests-total"><span>Total</span><span class="total-val">₹{{ (b.total_amount || 0).toLocaleString('en-IN') }}</span></div>
            </div>
          </div>
        }

        <!-- Uploaded Reports -->
        <div class="tests-card">
          <h2 class="card-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg>
            Uploaded Reports ({{ (d.reports || []).length }})
          </h2>
          @if ((d.reports || []).length) {
            <ul class="item-list">
              @for (r of d.reports!; track r.id) {
                <li>
                  <span>{{ r.file_name }} <span class="muted-text">({{ (r.file_size_bytes / 1024 / 1024).toFixed(2) }} MB)</span></span>
                  <button class="btn-link" (click)="downloadReport(r.id)">Download</button>
                </li>
              }
            </ul>
          }
          <div class="upload-row">
            <input #reportFile type="file" accept="application/pdf" class="file-input" (change)="onReportFileChosen($event)" />
            <button class="btn-primary" [disabled]="!pendingReportFile() || uploadingReport()" (click)="uploadReport(b)">
              {{ uploadingReport() ? 'Uploading…' : ((d.reports || []).length ? 'Replace Report' : 'Upload Report') }}
            </button>
          </div>
          <p class="hint">PDF only, up to 20 MB. Uploading a new report replaces the previous one.</p>
        </div>

        <!-- Notes -->
        @if (b.technician_notes) {
          <div class="notes-card">
            <h3>Notes</h3>
            <p>{{ b.technician_notes }}</p>
          </div>
        }
        @if (b.cancellation_reason) {
          <div class="notes-card error">
            <h3>Cancellation Reason</h3>
            <p>{{ b.cancellation_reason }}</p>
          </div>
        }
      }

      <!-- Admin Actions -->
      <div class="tests-card">
        <h2 class="card-title">Admin Actions</h2>

        <div class="action-block">
          <h3 class="action-title">Update Status</h3>
          <div class="row-actions">
            <select class="field" [(ngModel)]="newStatus">
              @for (s of statusOptions; track s) {
                <option [value]="s" [disabled]="s === 'completed' && !canComplete()">
                  {{ fmtStatus(s) }}{{ s === 'completed' && !canComplete() ? ' (report required)' : '' }}
                </option>
              }
            </select>
            <button class="btn-primary" [disabled]="busy() || newStatus === b.status" (click)="saveStatus(b)">
              {{ busy() ? 'Saving…' : 'Update' }}
            </button>
          </div>
        </div>

        @if (b.collection_type === 'home') {
          <div class="action-block">
            <h3 class="action-title">Assign Technician</h3>
            @if (!isPaid()) {
              <p class="hint warning">Payment must be recorded before a technician can be assigned — use "Mark Payment as Received" in the Payment section above.</p>
            }
            <div class="row-actions">
              <select class="field" [(ngModel)]="selectedTechId" [disabled]="!isPaid()">
                <option value="">Select technician…</option>
                @for (t of technicians(); track t.id) { <option [value]="t.id">{{ t.name }} ({{ t.phone }})</option> }
              </select>
              <button class="btn-primary" [disabled]="busy() || !selectedTechId || !isPaid()" (click)="assignTech(b)">
                {{ busy() ? 'Assigning…' : 'Assign' }}
              </button>
            </div>
            <button class="btn-ghost" [disabled]="busy() || !isPaid()" (click)="autoAssign(b)">⚡ Auto-assign nearest technician</button>
            @if (technicians().length === 0) { <p class="hint">No technicians available. Add one under Technicians.</p> }
          </div>
        }

        @if (b.status !== 'cancelled' && b.status !== 'completed') {
          <div class="action-block cancel-block">
            <h3 class="action-title danger-title">Cancel Booking</h3>
            @if (!showCancel()) {
              <button class="btn-danger-ghost" (click)="showCancel.set(true)">Cancel this booking</button>
            } @else {
              <textarea class="field textarea" [(ngModel)]="cancelReason" rows="3" placeholder="Reason for cancellation (required)…"></textarea>
              <div class="row-actions">
                <button class="btn-ghost" (click)="showCancel.set(false)">Keep booking</button>
                <button class="btn-danger" [disabled]="busy() || !cancelReason.trim()" (click)="cancelBooking(b)">
                  {{ busy() ? 'Cancelling…' : 'Confirm Cancellation' }}
                </button>
              </div>
            }
          </div>
        }
      </div>

      <!-- Lifecycle Timeline -->
      @if (detail()?.status_history?.length) {
        <div class="tests-card">
          <h2 class="card-title">Booking Timeline</h2>
          <ul class="timeline">
            @for (h of detail()!.status_history!; track $index) {
              <li class="tl-item">
                <span class="tl-dot"></span>
                <div class="tl-body">
                  <span class="tl-status">{{ fmtStatus(h.to_status) }}</span>
                  @if (h.changed_at) { <span class="tl-time">{{ h.changed_at | date:'dd MMM yyyy, HH:mm' }}</span> }
                  @if (h.reason) { <span class="tl-reason">{{ h.reason }}</span> }
                </div>
              </li>
            }
          </ul>
        </div>
      }
    </div>
  }
</div>`,
  styles: [`
    :host {
      --color-primary-50: #EEF2FF;
      --color-primary-100: #E0E7FF;
      --color-primary-500: #6366F1;
      --color-primary-600: #4F46E5;
      --color-primary-700: #4338CA;
      --color-primary-800: #3730A3;
      --color-accent-100: #FFEDD5;
      --color-accent-700: #C2410C;
      --shadow-primary: 0 4px 14px 0 rgba(79, 70, 229, 0.28);
      display: block;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    }

    .page { display:flex; flex-direction:column; gap:1.25rem; }
    .page-header { display:flex; justify-content:space-between; align-items:flex-start; }
    .page-title { font-size:1.5rem; font-weight:800; letter-spacing:-0.01em; color:#0F172A; margin:0 0 0.25rem 0; }
    .page-sub { font-size:0.875rem; color:#475569; margin:0; }
    .filter-bar { display:flex; gap:0.75rem; align-items:center; flex-wrap:wrap; }
    .search-field { display:flex; align-items:center; gap:0.5rem; background:#FFFFFF; border:1px solid #E2E8F0; border-radius:0.75rem; padding:0.625rem 1rem; flex:1; min-width:200px; svg { width:18px; height:18px; color:#94A3B8; flex-shrink:0; } input { border:none; outline:none; font-size:0.875rem; color:#0F172A; background:transparent; width:100%; } &:focus-within { border-color:#6366F1; box-shadow:0 0 0 3px rgba(99,102,241,.12); } }
    .filter-sel { height:40px; padding:0 1rem; font-size:0.875rem; color:#0F172A; background:#FFFFFF; border:1px solid #E2E8F0; border-radius:0.75rem; cursor:pointer; &:focus { outline:none; border-color:#6366F1; } }
    .count-badge { font-size:0.875rem; color:#94A3B8; white-space:nowrap; font-weight:500; }
    .load-wrap { display:flex; justify-content:center; padding:3rem; }
    .table-wrap { background:#FFFFFF; border:1px solid #F1F5F9; border-radius:1rem; overflow:hidden; overflow-x:auto; }
    .tbl { width:100%; border-collapse:collapse; min-width:780px; thead tr { background:#F8FAFC; } th { padding:0.75rem 1rem; text-align:left; font-size:0.75rem; font-weight:600; color:#94A3B8; text-transform:uppercase; letter-spacing:0.025em; border-bottom:1px solid #F1F5F9; } td { padding:0.875rem 1rem; border-bottom:1px solid #F1F5F9; font-size:0.875rem; color:#0F172A; } tbody tr:last-child td { border-bottom:none; } tbody tr:hover td { background:#F8FAFC; } }
    .ref-cell { font-family:'JetBrains Mono','SF Mono','Fira Code',monospace; font-size:0.75rem; font-weight:600; color:#4338CA; }
    .mono { font-family:'JetBrains Mono','SF Mono','Fira Code',monospace; }
    .fw-med { font-weight:600; }
    .text-sm { font-size:0.875rem; }
    .text-right { text-align:right; }
    .text-muted { color:#94A3B8; }
    .empty-td { text-align:center; color:#94A3B8; padding:3rem !important; }
    .type-chip { font-size:0.75rem; font-weight:500; padding:0.25rem 0.5rem; border-radius:0.5rem; background:#F8FAFC; &.home { background:#EEF2FF; color:#4338CA; } }
    .manage-btn { font-size:0.8125rem; font-weight:600; color:#4338CA; background:#EEF2FF; border:1px solid #C7D2FE; border-radius:0.5rem; padding:0.375rem 0.875rem; cursor:pointer; transition:all 150ms; &:hover { background:#C7D2FE; } }
    .pagination { display:flex; align-items:center; justify-content:center; gap:1rem; }
    .pg-btn { display:flex; align-items:center; justify-content:center; width:36px; height:36px; border:1px solid #E2E8F0; border-radius:0.5rem; background:#FFFFFF; cursor:pointer; transition:all 150ms; &:hover:not(:disabled) { border-color:#818CF8; color:#4F46E5; } &:disabled { opacity:.4; cursor:not-allowed; } }
    .pg-info { font-size:0.875rem; color:#475569; }

    /* Detail card (replaces the old fixed drawer) */
    .back-nav { margin-bottom: -0.5rem; }
    .back-link { display:inline-flex; align-items:center; gap:0.5rem; font-size:0.875rem; font-weight:600; color:#475569; text-decoration:none; cursor:pointer; transition:color 150ms; &:hover { color:#4F46E5; } }
    .detail-layout { display:flex; flex-direction:column; gap:1.25rem; animation: fadeIn .3s ease both; }
    @keyframes fadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
    .header-card { display:flex; justify-content:space-between; align-items:flex-start; gap:1rem; background:linear-gradient(145deg,#4F46E5,#6366F1 45%,#7C3AED); border-radius:1.25rem; padding:2rem; color:#FFFFFF; box-shadow:0 12px 30px -8px rgba(67,56,202,.35); }
    .ref-chip { display:inline-block; background:rgba(255,255,255,0.18); border:1px solid rgba(255,255,255,0.2); border-radius:9999px; padding:0.25rem 0.75rem; font-size:0.75rem; font-family:'JetBrains Mono','SF Mono','Fira Code',monospace; font-weight:600; margin-bottom:0.5rem; }
    .booking-title { font-size:1.5rem; font-weight:800; letter-spacing:-0.01em; margin:0 0 0.25rem 0; }
    .created-on { font-size:0.875rem; opacity:0.85; margin:0; }
    .detail-loading { display:flex; align-items:center; gap:0.5rem; font-size:0.8125rem; color:#64748B; padding:0.5rem 0; }
    .info-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:1.25rem; }
    .info-card, .tests-card, .notes-card { background:#FFFFFF; border:1px solid #F1F5F9; border-radius:1rem; padding:1.5rem; }
    .card-title { display:flex; align-items:center; gap:0.5rem; font-size:1rem; font-weight:700; color:#0F172A; margin:0 0 1rem 0; svg { color:#4F46E5; } }
    .info-rows { display:flex; flex-direction:column; gap:0.75rem; }
    .info-row { display:flex; justify-content:space-between; align-items:center; gap:0.75rem; }
    .info-label { font-size:0.875rem; color:#475569; }
    .info-val { font-size:0.875rem; font-weight:600; color:#0F172A; text-align:right; }
    .info-val .rel { color:#64748B; font-weight:400; }
    .addr-text { font-size:0.8125rem; color:#475569; line-height:1.5; margin:0; }
    .maps-link { display:inline-flex; align-items:center; gap:0.375rem; margin-top:0.75rem; font-size:0.8125rem; font-weight:600; color:#4F46E5; text-decoration:none; &:hover { text-decoration:underline; } }
    .muted-text { color:#94A3B8; }
    .inline-action { margin-top:1rem; padding-top:1rem; border-top:1px solid #F1F5F9; }

    .tests-table { border:1px solid #F1F5F9; border-radius:0.75rem; overflow:hidden; }
    .tests-header { display:grid; grid-template-columns:1fr auto; gap:1rem; padding:0.75rem 1rem; background:#F8FAFC; font-size:0.75rem; font-weight:700; color:#94A3B8; text-transform:uppercase; letter-spacing:0.025em; }
    .tests-row { display:grid; grid-template-columns:1fr auto; gap:1rem; padding:0.75rem 1rem; align-items:center; border-top:1px solid #F1F5F9; }
    .item-name { font-size:0.875rem; font-weight:600; color:#0F172A; }
    .item-price { font-size:0.875rem; font-weight:600; color:#0F172A; text-align:right; }
    .tests-total { display:grid; grid-template-columns:1fr auto; gap:1rem; padding:1rem; background:#EEF2FF; border-top:2px solid #C7D2FE; font-weight:700; color:#0F172A; }
    .total-val { font-size:1.125rem; color:#4338CA; text-align:right; }

    .item-list { list-style:none; margin:0 0 1rem 0; padding:0; display:flex; flex-direction:column; gap:0.375rem; }
    .item-list li { display:flex; justify-content:space-between; align-items:center; gap:0.75rem; font-size:0.8125rem; color:#475569; padding:0.5rem 0.75rem; background:#F8FAFC; border-radius:0.5rem; }
    .btn-link { background:none; border:none; font-size:0.8125rem; font-weight:600; color:#4F46E5; cursor:pointer; padding:0; &:hover { text-decoration:underline; } }
    .upload-row { display:flex; gap:0.75rem; align-items:center; flex-wrap:wrap; }
    .file-input { flex:1; min-width:200px; font-size:0.8125rem; }
    .hint { font-size:0.75rem; color:#94A3B8; margin:0.5rem 0 0 0; }
    .hint.warning { color:#9A3412; background:#FFF7ED; border:1px solid #FED7AA; border-radius:0.5rem; padding:0.625rem 0.75rem; margin:0 0 0.75rem 0; }

    .notes-card { padding:1.25rem; h3 { font-size:0.875rem; font-weight:700; margin:0 0 0.5rem 0; } p { font-size:0.875rem; margin:0; line-height:1.625; color:#475569; } &.error { background:#FEF2F2; border-color:#FECACA; h3 { color:#B91C1C; } p { color:#991B1B; } } }

    .action-block { display:flex; flex-direction:column; gap:0.625rem; padding-bottom:1.25rem; margin-bottom:1.25rem; border-bottom:1px solid #F1F5F9; &:last-child { padding-bottom:0; margin-bottom:0; border-bottom:none; } }
    .action-title { font-size:0.875rem; font-weight:600; color:#0F172A; margin:0; }
    .row-actions { display:flex; gap:0.5rem; flex-wrap:wrap; }
    .field { flex:1; min-width:140px; height:40px; padding:0 0.75rem; font-size:0.875rem; color:#0F172A; background:#fff; border:1px solid #E2E8F0; border-radius:0.5rem; font-family:inherit; &:focus { outline:none; border-color:#6366F1; } }
    .textarea { height:auto; padding:0.625rem 0.75rem; width:100%; resize:vertical; }
    .cash-form { display:flex; flex-direction:column; gap:0.625rem; margin-top:0.5rem; }
    .btn-primary { height:40px; padding:0 1.25rem; font-size:0.875rem; font-weight:600; color:#fff; background:linear-gradient(135deg,#6366F1,#4F46E5); border:none; border-radius:0.5rem; cursor:pointer; white-space:nowrap; &:disabled { opacity:.5; cursor:not-allowed; } }
    .btn-ghost { align-self:flex-start; font-size:0.8125rem; font-weight:600; color:#4F46E5; background:#EEF2FF; border:1px solid #C7D2FE; border-radius:0.5rem; padding:0.5rem 0.875rem; cursor:pointer; &:disabled { opacity:.5; cursor:not-allowed; } }

    .timeline { list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:0.875rem; }
    .tl-item { display:flex; gap:0.625rem; }
    .tl-dot { width:10px; height:10px; border-radius:50%; background:#6366F1; flex-shrink:0; margin-top:0.25rem; box-shadow:0 0 0 3px rgba(99,102,241,.15); }
    .tl-body { display:flex; flex-direction:column; gap:0.125rem; }
    .tl-status { font-size:0.8125rem; font-weight:600; color:#0F172A; }
    .tl-time { font-size:0.6875rem; color:#94A3B8; }
    .tl-reason { font-size:0.75rem; color:#64748B; font-style:italic; }

    .cancel-block { border-top:1px solid #FEE2E2; padding-top:1rem; }
    .danger-title { color:#B91C1C; }
    .btn-danger { height:40px; padding:0 1.25rem; font-size:0.875rem; font-weight:600; color:#fff; background:#DC2626; border:none; border-radius:0.5rem; cursor:pointer; white-space:nowrap; &:disabled { opacity:.5; cursor:not-allowed; } }
    .btn-danger-ghost { align-self:flex-start; font-size:0.8125rem; font-weight:600; color:#DC2626; background:#FEF2F2; border:1px solid #FECACA; border-radius:0.5rem; padding:0.5rem 0.875rem; cursor:pointer; }

    @media (prefers-reduced-motion: reduce) {
      .detail-layout { animation:none; }
    }

    @media (max-width:900px) {
      .info-grid { grid-template-columns:1fr; }
    }
    @media (max-width:640px) {
      .page-header { flex-direction:column; }
      .header-card { flex-direction:column; gap:1rem; }
      .row-actions { flex-direction:column; align-items:stretch; }
      .row-actions .field, .row-actions button { width:100%; }
    }
  `]
})
export class AdminBookingsComponent implements OnInit {
  readonly statusOptions = STATUS_OPTIONS;
  loading = signal(false);
  error = signal('');
  toast = signal('');
  formErr = signal('');
  busy = signal(false);
  all = signal<Booking[]>([]);
  filtered = signal<Booking[]>([]);
  technicians = signal<Technician[]>([]);
  selected = signal<Booking | null>(null);
  detail = signal<Booking | null>(null);
  detailLoading = signal(false);
  page = signal(1);
  readonly PS = 25;
  searchQ = ''; statusFilter = ''; typeFilter = '';
  newStatus = ''; selectedTechId = '';
  cancelReason = ''; showCancel = signal(false);

  // Mark cash received
  showCashForm = signal(false);
  cashMethod = 'cash';
  cashAmount: number | null = null;
  cashReceivedAt = '';
  cashNotes = '';

  // Refund status update
  showRefundForm = signal(false);
  refundStatus = '';
  refundTxnRef = '';
  refundRemarks = '';

  // Report upload
  pendingReportFile = signal<File | null>(null);
  uploadingReport = signal(false);

  totalPages = () => Math.ceil(this.filtered().length / this.PS);
  paged = () => { const s = (this.page() - 1) * this.PS; return this.filtered().slice(s, s + this.PS); };
  canComplete = computed(() => (this.detail()?.reports || []).length > 0);
  isPaid = computed(() => this.detail()?.payment?.status === 'paid');

  constructor(
    private bookingApi: BookingApiService,
    private adminApi: AdminApiService,
    private reportApi: ReportApiService,
    private paymentApi: PaymentApiService,
  ) {}

  ngOnInit() {
    this.load();
    this.adminApi.getTechnicians().subscribe({
      next: (r: any) => this.technicians.set(r.items ?? r ?? []),
      error: () => this.technicians.set([]),
    });
  }

  load() {
    this.loading.set(true);
    this.bookingApi.list({ page_size: 500 }).subscribe({
      next: r => { this.all.set(r.items); this.applyFilter(); this.loading.set(false); },
      error: () => { this.error.set('Failed to load bookings.'); this.loading.set(false); }
    });
  }

  applyFilter() {
    let list = this.all();
    if (this.statusFilter) list = list.filter(b => b.status === this.statusFilter);
    if (this.typeFilter) list = list.filter(b => b.collection_type === this.typeFilter);
    const q = this.searchQ.toLowerCase();
    if (q) list = list.filter(b => b.reference_number.toLowerCase().includes(q));
    this.filtered.set(list);
    this.page.set(1);
  }

  openManage(b: Booking) {
    this.selected.set(b);
    this.newStatus = b.status;
    this.selectedTechId = '';
    this.cancelReason = '';
    this.showCancel.set(false);
    this.showCashForm.set(false);
    this.showRefundForm.set(false);
    this.pendingReportFile.set(null);
    this.formErr.set('');
    this.detail.set(null);
    this.detailLoading.set(true);
    this.bookingApi.get(b.id).subscribe({
      next: (d) => { this.detail.set(d); this.detailLoading.set(false); },
      error: () => { this.detailLoading.set(false); },
    });
  }

  closeManage() {
    this.selected.set(null);
    this.detail.set(null);
    this.showCancel.set(false);
    this.load();
  }

  private refreshDetail(id: string) {
    this.bookingApi.get(id).subscribe({ next: (d) => this.detail.set(d) });
  }

  cancelBooking(b: Booking) {
    if (!this.cancelReason.trim()) { this.formErr.set('Cancellation reason is required.'); return; }
    this.busy.set(true);
    this.formErr.set('');
    this.bookingApi.cancel(b.id, this.cancelReason.trim()).subscribe({
      next: (updated) => {
        this.busy.set(false);
        this.selected.set(updated);
        this.toast.set('Booking cancelled.');
        this.showCancel.set(false);
        this.refreshDetail(b.id);
      },
      error: (err) => { this.busy.set(false); this.formErr.set(this.errMsg(err, 'Failed to cancel booking.')); }
    });
  }

  saveStatus(b: Booking) {
    if (this.newStatus === b.status) return;
    this.busy.set(true);
    this.formErr.set('');
    this.bookingApi.updateStatus(b.id, this.newStatus).subscribe({
      next: (updated) => {
        this.busy.set(false);
        this.selected.set(updated);
        this.toast.set(`Status updated to "${this.fmtStatus(this.newStatus)}".`);
        this.refreshDetail(b.id);
      },
      error: (err) => { this.busy.set(false); this.formErr.set(this.errMsg(err, 'Failed to update status.')); }
    });
  }

  assignTech(b: Booking) {
    if (!this.selectedTechId) return;
    this.busy.set(true);
    this.formErr.set('');
    this.adminApi.assignTechnician(this.selectedTechId, b.id).subscribe({
      next: () => {
        this.busy.set(false);
        this.toast.set('Technician assigned successfully.');
        this.refreshDetail(b.id);
      },
      error: (err) => { this.busy.set(false); this.formErr.set(this.errMsg(err, 'Failed to assign technician.')); }
    });
  }

  autoAssign(b: Booking) {
    this.busy.set(true);
    this.formErr.set('');
    this.adminApi.autoAssignTechnician(b.id).subscribe({
      next: () => {
        this.busy.set(false);
        this.toast.set('Technician auto-assigned successfully.');
        this.refreshDetail(b.id);
      },
      error: (err) => { this.busy.set(false); this.formErr.set(this.errMsg(err, 'Auto-assign failed. No technician available.')); }
    });
  }

  openCashForm(pay: { amount: number }) {
    this.cashMethod = 'cash';
    this.cashAmount = pay.amount;
    this.cashReceivedAt = new Date().toISOString().slice(0, 16);
    this.cashNotes = '';
    this.showCashForm.set(true);
  }

  saveCashReceived(b: Booking) {
    const paymentId = this.detail()?.payment?.id;
    if (!paymentId || !this.cashAmount || !this.cashReceivedAt) return;
    this.busy.set(true);
    this.formErr.set('');
    this.paymentApi.markCashReceived(paymentId, {
      method: this.cashMethod,
      amount: this.cashAmount,
      received_at: new Date(this.cashReceivedAt).toISOString(),
      notes: this.cashNotes || undefined,
    }).subscribe({
      next: () => {
        this.busy.set(false);
        this.showCashForm.set(false);
        this.toast.set('Payment recorded successfully.');
        this.refreshDetail(b.id);
      },
      error: (err) => { this.busy.set(false); this.formErr.set(this.errMsg(err, 'Failed to record payment.')); }
    });
  }

  refundNextOptions(status: string): string[] {
    const m: Record<string, string[]> = { initiated: ['approved', 'failed'], approved: ['completed', 'failed'] };
    return m[status] ?? [];
  }

  saveRefundStatus(rf: { id: string }) {
    if (!this.refundStatus) return;
    this.busy.set(true);
    this.formErr.set('');
    this.paymentApi.updateRefundStatus(rf.id, {
      status: this.refundStatus as 'approved' | 'completed' | 'failed',
      remarks: this.refundRemarks || undefined,
      transaction_reference: this.refundTxnRef || undefined,
    }).subscribe({
      next: () => {
        this.busy.set(false);
        this.showRefundForm.set(false);
        this.toast.set('Refund status updated.');
        if (this.selected()) this.refreshDetail(this.selected()!.id);
      },
      error: (err) => { this.busy.set(false); this.formErr.set(this.errMsg(err, 'Failed to update refund status.')); }
    });
  }

  onReportFileChosen(event: Event) {
    const input = event.target as HTMLInputElement;
    this.pendingReportFile.set(input.files && input.files.length ? input.files[0] : null);
  }

  uploadReport(b: Booking) {
    const file = this.pendingReportFile();
    if (!file) return;
    this.uploadingReport.set(true);
    this.formErr.set('');
    this.reportApi.upload(b.id, file).subscribe({
      next: () => {
        this.uploadingReport.set(false);
        this.pendingReportFile.set(null);
        this.toast.set('Report uploaded successfully.');
        this.refreshDetail(b.id);
      },
      error: (err) => { this.uploadingReport.set(false); this.formErr.set(this.errMsg(err, 'Failed to upload report.')); }
    });
  }

  downloadReport(reportId: string) {
    this.reportApi.getDownloadUrl(reportId).subscribe({
      next: (r) => window.open(r.download_url, '_blank'),
      error: () => this.formErr.set('Failed to generate download link.'),
    });
  }

  private errMsg(err: any, fallback: string): string {
    const d = err?.error?.detail;
    if (typeof d === 'string') return d;
    if (d?.message) return d.message;
    return fallback;
  }

  mapsUrl(address: { address_line1: string; address_line2?: string; city: string; state: string; pincode: string }): string {
    const parts = [address.address_line1, address.address_line2, address.city, address.state, address.pincode].filter(Boolean);
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(parts.join(', '))}`;
  }

  fmtStatus(s: string) { return (s || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()); }
  statusColor(s: string) { const m: Record<string,string> = { booked:'warning', technician_assigned:'info', accepted:'info', on_the_way:'primary', sample_collected:'primary', reached_lab:'primary', sample_delivered:'primary', processing:'primary', report_ready:'info', completed:'success', cancelled:'error', collected:'primary' }; return m[s] ?? 'default'; }
  payColor(s: string) { const m: Record<string,string> = { paid:'success', pending:'warning', failed:'error', refunded:'info' }; return m[s] ?? 'default'; }
  refundColor(s: string) { const m: Record<string,string> = { initiated:'warning', approved:'info', completed:'success', failed:'error' }; return m[s] ?? 'default'; }
}
