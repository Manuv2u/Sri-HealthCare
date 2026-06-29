import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BookingApiService } from '../../../core/api/services/booking-api.service';
import { AdminApiService } from '../../../core/api/services/admin-api.service';
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
  <div class="page-header">
    <div><h1 class="page-title">All Bookings</h1><p class="page-sub">View and manage all patient appointment bookings</p></div>
  </div>

  @if (error()) { <app-alert type="error" [dismissible]="true" (dismissed)="error.set('')">{{ error() }}</app-alert> }
  @if (toast()) { <app-alert type="success" [dismissible]="true" (dismissed)="toast.set('')">{{ toast() }}</app-alert> }

  <!-- Filters -->
  <div class="filter-bar">
    <div class="search-field">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
      <input placeholder="Search reference number…" [(ngModel)]="searchQ" (input)="applyFilter()" />
    </div>
    <select class="filter-sel" [(ngModel)]="statusFilter" (change)="applyFilter()">
      <option value="">All Status</option>
      <option value="booked">Booked</option>
      <option value="technician_assigned">Technician Assigned</option>
      <option value="accepted">Accepted</option>
      <option value="on_the_way">On The Way</option>
      <option value="sample_collected">Sample Collected</option>
      <option value="reached_lab">Reached Lab</option>
      <option value="sample_delivered">Sample Delivered</option>
      <option value="processing">Processing</option>
      <option value="report_ready">Report Ready</option>
      <option value="completed">Completed</option>
      <option value="cancelled">Cancelled</option>
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
</div>

<!-- ═══ MANAGE DRAWER ═══ -->
@if (selected(); as b) {
  <div class="drawer-backdrop" (click)="closeManage()"></div>
  <aside class="drawer">
    <div class="drawer-head">
      <div>
        <h2 class="drawer-title">{{ b.reference_number }}</h2>
        <span class="drawer-sub">{{ b.booking_date | date:'dd MMM yyyy' }} · {{ b.collection_type === 'home' ? 'Home Collection' : 'Lab Visit' }}</span>
      </div>
      <button class="drawer-close" (click)="closeManage()">&times;</button>
    </div>

    <div class="drawer-body">
      @if (formErr()) { <app-alert type="error" [dismissible]="true" (dismissed)="formErr.set('')">{{ formErr() }}</app-alert> }

      <!-- Summary -->
      <div class="summary-grid">
        <div class="sum-item"><span class="sum-lbl">Amount</span><span class="sum-val">₹{{ (b.total_amount || 0).toLocaleString('en-IN') }}</span></div>
        <div class="sum-item"><span class="sum-lbl">Payment</span><app-badge [color]="payColor(b.payment_status)" size="sm">{{ fmtStatus(b.payment_status) }}</app-badge></div>
        <div class="sum-item"><span class="sum-lbl">Current Status</span><app-badge [color]="statusColor(b.status)" size="sm">{{ fmtStatus(b.status) }}</app-badge></div>
      </div>

      @if (detailLoading()) {
        <div class="detail-loading"><app-spinner size="sm" /> <span>Loading details…</span></div>
      }

      @if (detail(); as d) {
        <!-- Patient & contact -->
        <div class="block">
          <h3 class="block-title">Patient & Contact</h3>
          <div class="kv-grid">
            <div class="kv"><span class="k">Patient</span><span class="v">{{ d.patient_name || '—' }}<span class="rel" *ngIf="d.patient_relationship"> ({{ d.patient_relationship }})</span></span></div>
            <div class="kv"><span class="k">Booked by</span><span class="v">{{ d.contact_name || '—' }}</span></div>
            <div class="kv"><span class="k">Phone</span><span class="v">{{ d.contact_phone || '—' }}</span></div>
            <div class="kv"><span class="k">Email</span><span class="v">{{ d.contact_email || '—' }}</span></div>
          </div>
        </div>

        <!-- Address (home collection) -->
        @if (d.address) {
          <div class="block">
            <h3 class="block-title">Collection Address</h3>
            <p class="addr-text">
              <strong>{{ d.address.label }}</strong><br/>
              {{ d.address.address_line1 }}<span *ngIf="d.address.address_line2">, {{ d.address.address_line2 }}</span><br/>
              {{ d.address.city }}, {{ d.address.state }} - {{ d.address.pincode }}
            </p>
          </div>
        }

        <!-- Schedule -->
        <div class="block">
          <h3 class="block-title">Schedule</h3>
          <div class="kv-grid">
            <div class="kv"><span class="k">Date</span><span class="v">{{ b.booking_date | date:'dd MMM yyyy' }}</span></div>
            @if (d.time_slot) { <div class="kv"><span class="k">Time Slot</span><span class="v">{{ d.time_slot.start_time }} – {{ d.time_slot.end_time }}</span></div> }
            <div class="kv"><span class="k">Type</span><span class="v">{{ b.collection_type === 'home' ? 'Home Collection' : 'Lab Visit' }}</span></div>
            @if (d.lab_branch) { <div class="kv"><span class="k">Lab Branch</span><span class="v">{{ d.lab_branch.name }}</span></div> }
          </div>
          @if (d.lab_branch) { <p class="addr-text muted-text">{{ d.lab_branch.address }}, {{ d.lab_branch.city }} - {{ d.lab_branch.pincode }} · ☎ {{ d.lab_branch.phone }}</p> }
        </div>

        <!-- Payment -->
        @if (d.payment) {
          <div class="block">
            <h3 class="block-title">Payment</h3>
            <div class="kv-grid">
              <div class="kv"><span class="k">Method</span><span class="v">{{ fmtStatus(d.payment.method) }}</span></div>
              <div class="kv"><span class="k">Status</span><span class="v">{{ fmtStatus(d.payment.status) }}</span></div>
              <div class="kv"><span class="k">Amount</span><span class="v">₹{{ (d.payment.amount || 0).toLocaleString('en-IN') }}</span></div>
              <div class="kv"><span class="k">GST</span><span class="v">₹{{ (d.payment.gst_amount || 0).toLocaleString('en-IN') }}</span></div>
              @if (d.payment.invoice_number) { <div class="kv"><span class="k">Invoice</span><span class="v">{{ d.payment.invoice_number }}</span></div> }
            </div>
          </div>
        }

        <!-- Assigned technician -->
        @if (d.assigned_technician) {
          <div class="block">
            <h3 class="block-title">Assigned Technician</h3>
            <div class="kv-grid">
              <div class="kv"><span class="k">Name</span><span class="v">{{ d.assigned_technician.name || '—' }}</span></div>
              <div class="kv"><span class="k">Phone</span><span class="v">{{ d.assigned_technician.phone || '—' }}</span></div>
              <div class="kv"><span class="k">Response</span><span class="v">{{ fmtStatus(d.assigned_technician.assignment_status) }}</span></div>
            </div>
          </div>
        }
      }

      <!-- Items -->
      @if (b.items && b.items.length) {
        <div class="block">
          <h3 class="block-title">Tests / Packages ({{ b.items.length }})</h3>
          <ul class="item-list">
            @for (it of b.items; track it.id) {
              <li><span>{{ it.item_name || it.item_type }}</span><span class="item-price">₹{{ (it.unit_price || 0).toLocaleString('en-IN') }}</span></li>
            }
          </ul>
        </div>
      }

      <!-- Notes -->
      @if (b.technician_notes) {
        <div class="block">
          <h3 class="block-title">Notes</h3>
          <p class="addr-text">{{ b.technician_notes }}</p>
        </div>
      }

      <!-- Update status -->
      <div class="block">
        <h3 class="block-title">Update Status</h3>
        <div class="row-actions">
          <select class="field" [(ngModel)]="newStatus">
            @for (s of statusOptions; track s) { <option [value]="s">{{ fmtStatus(s) }}</option> }
          </select>
          <button class="btn-primary" [disabled]="busy() || newStatus === b.status" (click)="saveStatus(b)">
            {{ busy() ? 'Saving…' : 'Update' }}
          </button>
        </div>
      </div>

      <!-- Assign technician -->
      <div class="block">
        <h3 class="block-title">Assign Technician</h3>
        <div class="row-actions">
          <select class="field" [(ngModel)]="selectedTechId">
            <option value="">Select technician…</option>
            @for (t of technicians(); track t.id) { <option [value]="t.id">{{ t.name }} ({{ t.phone }})</option> }
          </select>
          <button class="btn-primary" [disabled]="busy() || !selectedTechId" (click)="assignTech(b)">
            {{ busy() ? 'Assigning…' : 'Assign' }}
          </button>
        </div>
        <button class="btn-ghost" [disabled]="busy()" (click)="autoAssign(b)">⚡ Auto-assign nearest technician</button>
        @if (technicians().length === 0) { <p class="hint">No technicians available. Add one under Technicians.</p> }
      </div>

      <!-- Lifecycle timeline -->
      @if (detail()?.status_history?.length) {
        <div class="block">
          <h3 class="block-title">Lifecycle Timeline</h3>
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

      <!-- Cancel booking -->
      @if (b.status !== 'cancelled' && b.status !== 'completed') {
        <div class="block cancel-block">
          <h3 class="block-title danger-title">Cancel Booking</h3>
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
  </aside>
}`,
  styles: [`
    .page { display:flex; flex-direction:column; gap:1.25rem; }
    .page-header { display:flex; justify-content:space-between; align-items:flex-start; }
    .page-title { font-size:1.5rem; font-weight:700; color:#0F172A; margin:0 0 0.25rem 0; }
    .page-sub { font-size:0.875rem; color:#475569; margin:0; }
    .filter-bar { display:flex; gap:0.75rem; align-items:center; flex-wrap:wrap; }
    .search-field { display:flex; align-items:center; gap:0.5rem; background:#FFFFFF; border:1px solid #E2E8F0; border-radius:0.75rem; padding:0.625rem 1rem; flex:1; min-width:200px; svg { width:18px; height:18px; color:#94A3B8; flex-shrink:0; } input { border:none; outline:none; font-size:0.875rem; color:#0F172A; background:transparent; width:100%; } &:focus-within { border-color:#319795; box-shadow:0 0 0 3px rgba(49,151,149,.1); } }
    .filter-sel { height:40px; padding:0 1rem; font-size:0.875rem; color:#0F172A; background:#FFFFFF; border:1px solid #E2E8F0; border-radius:0.75rem; cursor:pointer; &:focus { outline:none; border-color:#319795; } }
    .count-badge { font-size:0.875rem; color:#94A3B8; white-space:nowrap; font-weight:500; }
    .load-wrap { display:flex; justify-content:center; padding:3rem; }
    .table-wrap { background:#FFFFFF; border:1px solid #F1F5F9; border-radius:1rem; overflow:hidden; overflow-x:auto; }
    .tbl { width:100%; border-collapse:collapse; min-width:780px; thead tr { background:#F8FAFC; } th { padding:0.75rem 1rem; text-align:left; font-size:0.75rem; font-weight:600; color:#94A3B8; text-transform:uppercase; letter-spacing:0.025em; border-bottom:1px solid #F1F5F9; } td { padding:0.875rem 1rem; border-bottom:1px solid #F1F5F9; font-size:0.875rem; color:#0F172A; } tbody tr:last-child td { border-bottom:none; } tbody tr:hover td { background:#F8FAFC; } }
    .ref-cell { font-family:'JetBrains Mono','SF Mono','Fira Code',monospace; font-size:0.75rem; font-weight:600; color:#285E61; }
    .mono { font-family:'JetBrains Mono','SF Mono','Fira Code',monospace; }
    .fw-med { font-weight:600; }
    .text-sm { font-size:0.875rem; }
    .text-muted { color:#94A3B8; }
    .empty-td { text-align:center; color:#94A3B8; padding:3rem !important; }
    .type-chip { font-size:0.75rem; font-weight:500; padding:0.25rem 0.5rem; border-radius:0.5rem; background:#F8FAFC; &.home { background:#E6FFFA; color:#285E61; } }
    .manage-btn { font-size:0.8125rem; font-weight:600; color:#285E61; background:#E6FFFA; border:1px solid #B2F5EA; border-radius:0.5rem; padding:0.375rem 0.875rem; cursor:pointer; transition:all 150ms; &:hover { background:#B2F5EA; } }
    .pagination { display:flex; align-items:center; justify-content:center; gap:1rem; }
    .pg-btn { display:flex; align-items:center; justify-content:center; width:36px; height:36px; border:1px solid #E2E8F0; border-radius:0.5rem; background:#FFFFFF; cursor:pointer; transition:all 150ms; &:hover:not(:disabled) { border-color:#38B2AC; color:#2C7A7B; } &:disabled { opacity:.4; cursor:not-allowed; } }
    .pg-info { font-size:0.875rem; color:#475569; }

    /* Drawer */
    .drawer-backdrop { position:fixed; inset:0; background:rgba(15,23,42,.5); z-index:400; backdrop-filter:blur(2px); }
    .drawer { position:fixed; top:0; right:0; bottom:0; width:min(440px,92vw); background:#fff; z-index:401; display:flex; flex-direction:column; box-shadow:-8px 0 32px rgba(15,23,42,.25); animation:slideIn .22s ease; }
    @keyframes slideIn { from { transform:translateX(100%); } to { transform:translateX(0); } }
    .drawer-head { display:flex; align-items:flex-start; justify-content:space-between; padding:1.25rem 1.5rem; border-bottom:1px solid #F1F5F9; }
    .drawer-title { font-size:1.125rem; font-weight:700; color:#0F172A; margin:0; font-family:'JetBrains Mono',monospace; }
    .drawer-sub { font-size:0.8125rem; color:#64748B; }
    .drawer-close { background:none; border:none; font-size:1.75rem; line-height:1; color:#94A3B8; cursor:pointer; padding:0; &:hover { color:#0F172A; } }
    .drawer-body { padding:1.5rem; overflow-y:auto; display:flex; flex-direction:column; gap:1.5rem; }
    .summary-grid { display:flex; gap:1rem; flex-wrap:wrap; }
    .sum-item { display:flex; flex-direction:column; gap:0.25rem; }
    .sum-lbl { font-size:0.6875rem; text-transform:uppercase; letter-spacing:0.05em; color:#94A3B8; font-weight:600; }
    .sum-val { font-size:1rem; font-weight:700; color:#0F172A; }
    .block { display:flex; flex-direction:column; gap:0.625rem; }
    .block-title { font-size:0.875rem; font-weight:600; color:#0F172A; margin:0; }
    .item-list { list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:0.375rem; }
    .item-list li { display:flex; justify-content:space-between; font-size:0.8125rem; color:#475569; padding:0.5rem 0.75rem; background:#F8FAFC; border-radius:0.5rem; }
    .item-price { font-weight:600; color:#0F172A; }
    .row-actions { display:flex; gap:0.5rem; }
    .field { flex:1; height:40px; padding:0 0.75rem; font-size:0.875rem; color:#0F172A; background:#fff; border:1px solid #E2E8F0; border-radius:0.5rem; cursor:pointer; &:focus { outline:none; border-color:#319795; } }
    .btn-primary { height:40px; padding:0 1.25rem; font-size:0.875rem; font-weight:600; color:#fff; background:linear-gradient(135deg,#319795,#2C7A7B); border:none; border-radius:0.5rem; cursor:pointer; white-space:nowrap; &:disabled { opacity:.5; cursor:not-allowed; } }
    .btn-ghost { align-self:flex-start; font-size:0.8125rem; font-weight:600; color:#5A67D8; background:#EEF2FF; border:1px solid #C7D2FE; border-radius:0.5rem; padding:0.5rem 0.875rem; cursor:pointer; &:disabled { opacity:.5; cursor:not-allowed; } }
    .hint { font-size:0.75rem; color:#94A3B8; margin:0; }

    /* Detail sections */
    .detail-loading { display:flex; align-items:center; gap:0.5rem; font-size:0.8125rem; color:#64748B; padding:0.5rem 0; }
    .kv-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:0.625rem 1rem; }
    .kv { display:flex; flex-direction:column; gap:0.125rem; }
    .kv .k { font-size:0.6875rem; text-transform:uppercase; letter-spacing:0.04em; color:#94A3B8; font-weight:600; }
    .kv .v { font-size:0.875rem; color:#0F172A; font-weight:500; word-break:break-word; }
    .kv .rel { color:#64748B; font-weight:400; }
    .addr-text { font-size:0.8125rem; color:#475569; line-height:1.5; margin:0; }
    .muted-text { color:#94A3B8; margin-top:0.375rem; }
    .timeline { list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:0.875rem; }
    .tl-item { display:flex; gap:0.625rem; }
    .tl-dot { width:10px; height:10px; border-radius:50%; background:#319795; flex-shrink:0; margin-top:0.25rem; box-shadow:0 0 0 3px rgba(49,151,149,.15); }
    .tl-body { display:flex; flex-direction:column; gap:0.125rem; }
    .tl-status { font-size:0.8125rem; font-weight:600; color:#0F172A; }
    .tl-time { font-size:0.6875rem; color:#94A3B8; }
    .tl-reason { font-size:0.75rem; color:#64748B; font-style:italic; }
    .cancel-block { border-top:1px solid #FEE2E2; padding-top:1rem; }
    .danger-title { color:#B91C1C; }
    .textarea { width:100%; resize:vertical; padding:0.625rem 0.75rem; font-family:inherit; }
    .btn-danger { height:40px; padding:0 1.25rem; font-size:0.875rem; font-weight:600; color:#fff; background:#DC2626; border:none; border-radius:0.5rem; cursor:pointer; white-space:nowrap; &:disabled { opacity:.5; cursor:not-allowed; } }
    .btn-danger-ghost { font-size:0.8125rem; font-weight:600; color:#DC2626; background:#FEF2F2; border:1px solid #FECACA; border-radius:0.5rem; padding:0.5rem 0.875rem; cursor:pointer; }
  `]
})
export class AdminBookingsComponent implements OnInit {
  readonly PS = 25;
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
  searchQ = ''; statusFilter = ''; typeFilter = '';
  newStatus = ''; selectedTechId = '';
  cancelReason = ''; showCancel = signal(false);

  totalPages = () => Math.ceil(this.filtered().length / this.PS);
  paged = () => { const s = (this.page() - 1) * this.PS; return this.filtered().slice(s, s + this.PS); };

  constructor(private bookingApi: BookingApiService, private adminApi: AdminApiService) {}
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
    this.formErr.set('');
    // Fetch enriched detail (patient, contact, address, slot, lab, payment, timeline)
    this.detail.set(null);
    this.detailLoading.set(true);
    this.bookingApi.get(b.id).subscribe({
      next: (d) => { this.detail.set(d); this.detailLoading.set(false); },
      error: () => { this.detailLoading.set(false); },
    });
  }
  closeManage() { this.selected.set(null); this.detail.set(null); this.showCancel.set(false); }

  cancelBooking(b: Booking) {
    if (!this.cancelReason.trim()) { this.formErr.set('Cancellation reason is required.'); return; }
    this.busy.set(true);
    this.formErr.set('');
    this.bookingApi.cancel(b.id, this.cancelReason.trim()).subscribe({
      next: (updated) => {
        this.busy.set(false);
        this.applyUpdated(updated, b.id);
        this.toast.set('Booking cancelled.');
        this.closeManage();
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
        this.applyUpdated(updated, b.id);
        this.toast.set(`Status updated to "${this.fmtStatus(this.newStatus)}".`);
        this.closeManage();
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
        this.closeManage();
        this.load();
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
        this.closeManage();
        this.load();
      },
      error: (err) => { this.busy.set(false); this.formErr.set(this.errMsg(err, 'Auto-assign failed. No technician available.')); }
    });
  }

  private applyUpdated(updated: Booking, id: string) {
    this.all.set(this.all().map(x => x.id === id ? { ...x, ...updated } : x));
    this.applyFilter();
  }

  private errMsg(err: any, fallback: string): string {
    const d = err?.error?.detail;
    if (typeof d === 'string') return d;
    if (d?.message) return d.message;
    return fallback;
  }

  fmtStatus(s: string) { return (s || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()); }
  statusColor(s: string) { const m: Record<string,string> = { booked:'warning', technician_assigned:'info', accepted:'info', on_the_way:'primary', sample_collected:'primary', reached_lab:'primary', sample_delivered:'primary', processing:'primary', report_ready:'info', completed:'success', cancelled:'error', collected:'primary' }; return m[s] ?? 'default'; }
  payColor(s: string) { const m: Record<string,string> = { paid:'success', pending:'warning', failed:'error', refunded:'info' }; return m[s] ?? 'default'; }
}
