import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { BookingApiService } from '../../../core/api/services/booking-api.service';
import { Booking } from '../../../core/api/api.types';

// Human labels for the real backend status machine
const STATUS_LABELS: Record<string, string> = {
  booked: 'Booked',
  technician_assigned: 'Assigned',
  accepted: 'Accepted',
  on_the_way: 'On the Way',
  sample_collected: 'Sample Collected',
  reached_lab: 'Reached Lab',
  sample_delivered: 'Sample Delivered',
  processing: 'Processing',
  report_ready: 'Report Ready',
  completed: 'Completed',
  unable_to_collect: 'Unable to Collect',
  cancelled: 'Cancelled',
};

const STATUS_CONFIG: Record<string, { chip: string; chipText: string; dot: string; border: string }> = {
  technician_assigned: { chip: '#EEF2FF', chipText: '#4338CA', dot: '#6366F1', border: '#6366F1' },
  accepted:            { chip: '#EFF6FF', chipText: '#1D4ED8', dot: '#3B82F6', border: '#3B82F6' },
  on_the_way:          { chip: '#FFF7ED', chipText: '#C2410C', dot: '#F97316', border: '#F97316' },
  sample_collected:    { chip: '#F5F3FF', chipText: '#6D28D9', dot: '#8B5CF6', border: '#8B5CF6' },
  completed:           { chip: '#F0FDF4', chipText: '#15803D', dot: '#22C55E', border: '#22C55E' },
  unable_to_collect:   { chip: '#FEF2F2', chipText: '#B91C1C', dot: '#EF4444', border: '#EF4444' },
  cancelled:           { chip: '#FEF2F2', chipText: '#B91C1C', dot: '#EF4444', border: '#EF4444' },
};

// Technician-facing next actions per current status
// Note: "sample_collected" used to jump straight to "completed", but a booking
// can no longer be completed without an uploaded report — the lab-processing
// steps from here (reached_lab -> sample_delivered -> processing ->
// report_ready -> completed) are now driven by the admin, not the field
// technician, so the only action offered here is the handoff to the lab.
const TECH_ACTIONS: Record<string, { status: string; label: string; danger?: boolean }[]> = {
  technician_assigned: [{ status: 'on_the_way', label: 'Start — On the Way' }],
  accepted:            [{ status: 'on_the_way', label: 'On the Way' }],
  on_the_way:          [{ status: 'sample_collected', label: 'Sample Collected' }, { status: 'unable_to_collect', label: 'Unable to Collect', danger: true }],
  sample_collected:    [{ status: 'reached_lab', label: 'Mark Reached Lab' }],
};

const FILTER_CHIPS = ['technician_assigned', 'on_the_way', 'sample_collected', 'completed', 'unable_to_collect'];

@Component({
  selector: 'app-technician-bookings',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatIconModule, MatSnackBarModule],
  template: `
    <div class="page">
      <div class="page-header">
        <div class="header-left">
          <div class="header-eyebrow"><mat-icon class="eyebrow-icon">today</mat-icon><span>{{ todayLabel }}</span></div>
          <h1 class="page-title">My Assignments</h1>
        </div>
        <div class="header-right">
          @if (!loading()) {
            <div class="total-badge"><span class="total-num">{{ total() }}</span><span class="total-label">{{ total() === 1 ? 'booking' : 'bookings' }}</span></div>
          }
          <button class="refresh-btn" (click)="load()" [disabled]="loading()" aria-label="Refresh"><mat-icon [class.spin]="loading()">refresh</mat-icon></button>
        </div>
      </div>

      <!-- Filter chips -->
      <div class="filters-row">
        <div class="filter-chips">
          <button class="filter-chip" [class.active]="statusFilter() === ''" (click)="setFilter('')">All</button>
          @for (s of filterChips; track s) {
            <button class="filter-chip" [class.active]="statusFilter() === s" (click)="setFilter(s)">
              <span class="chip-dot" [style.background]="statusConfig(s).dot"></span>{{ label(s) }}
            </button>
          }
        </div>
      </div>

      @if (loading()) {
        <div class="loading-state"><div class="spinner"></div><span>Loading assignments…</span></div>
      } @else if (error()) {
        <div class="error-state"><div class="error-icon-wrap"><mat-icon>error_outline</mat-icon></div><p class="error-msg">{{ error() }}</p><button class="retry-btn" (click)="load()">Try again</button></div>
      } @else if (bookings().length === 0) {
        <div class="empty-state"><div class="empty-icon-wrap"><mat-icon>event_available</mat-icon></div><p class="empty-title">No assignments found</p><p class="empty-sub">{{ statusFilter() ? 'No bookings match this filter.' : 'You have no bookings assigned yet.' }}</p></div>
      } @else {
        <div class="bookings-list">
          @for (b of bookings(); track b.id) {
            <div class="booking-card" [style.--status-border]="statusConfig(b.status).border">
              <div class="card-stripe"></div>
              <div class="card-inner">
                <div class="card-top">
                  <div class="card-top-left">
                    <span class="ref-number">{{ b.reference_number }}</span>
                    <span class="status-chip" [style.background]="statusConfig(b.status).chip" [style.color]="statusConfig(b.status).chipText">
                      <span class="chip-dot-sm" [style.background]="statusConfig(b.status).dot"></span>{{ label(b.status) }}
                    </span>
                  </div>
                  <div class="collection-badge" [class.home-badge]="b.collection_type === 'home'">
                    <mat-icon>{{ b.collection_type === 'home' ? 'home' : 'business' }}</mat-icon>
                    <span>{{ b.collection_type | titlecase }}</span>
                  </div>
                </div>

                <div class="card-meta">
                  <div class="meta-item"><mat-icon>calendar_today</mat-icon><span>{{ b.booking_date | date:'d MMM yyyy' }}</span></div>
                  <div class="meta-separator"></div>
                  <div class="amount-item">
                    <span class="amount-value">₹{{ (b.total_amount || 0) | number:'1.2-2' }}</span>
                    <span class="payment-chip" [class.paid-chip]="b.payment_status === 'paid'" [class.pending-chip]="b.payment_status !== 'paid'">{{ b.payment_status | titlecase }}</span>
                  </div>
                </div>

                <!-- Detail (lazy loaded on expand) -->
                <button class="detail-toggle" (click)="toggleDetail(b)">
                  <mat-icon>{{ expanded().has(b.id) ? 'expand_less' : 'expand_more' }}</mat-icon>
                  {{ expanded().has(b.id) ? 'Hide details' : 'View patient & booking details' }}
                </button>

                @if (expanded().has(b.id)) {
                  @if (detailLoadingId() === b.id) {
                    <div class="detail-loading"><div class="spinner sm"></div> Loading details…</div>
                  } @else {
                    @if (detailMap()[b.id]; as d) {
                    <div class="detail-panel">
                      <div class="dp-section">
                        <span class="dp-title">Booking</span>
                        <div class="dp-row"><span class="dp-k">Booking ID</span><span class="dp-v mono">{{ d.reference_number }}</span></div>
                        <div class="dp-row"><span class="dp-k">Date &amp; Time</span><span class="dp-v">{{ d.booking_date | date:'d MMM yyyy' }}<span *ngIf="d.time_slot"> · {{ d.time_slot.start_time }} – {{ d.time_slot.end_time }}</span></span></div>
                        <div class="dp-row"><span class="dp-k">Collection Type</span><span class="dp-v">{{ d.collection_type | titlecase }}</span></div>
                        <div class="dp-row"><span class="dp-k">Payment Status</span><span class="dp-v">{{ d.payment_status | titlecase }}</span></div>
                        <div class="dp-row"><span class="dp-k">Booking Status</span><span class="dp-v">{{ label(d.status) }}</span></div>
                      </div>
                      <div class="dp-section">
                        <span class="dp-title">Patient</span>
                        <div class="dp-row"><span class="dp-k">Name</span><span class="dp-v">{{ d.patient_name || '—' }}<span class="dp-rel" *ngIf="d.patient_relationship"> ({{ d.patient_relationship }})</span></span></div>
                        @if (d.patient_gender) { <div class="dp-row"><span class="dp-k">Gender</span><span class="dp-v">{{ d.patient_gender | titlecase }}</span></div> }
                      </div>
                      <div class="dp-section">
                        <span class="dp-title">Contact</span>
                        <div class="dp-row"><span class="dp-k">Booked by</span><span class="dp-v">{{ d.contact_name || '—' }}</span></div>
                        <div class="dp-row"><span class="dp-k">Phone</span><span class="dp-v"><a [href]="'tel:' + d.contact_phone">{{ d.contact_phone || '—' }}</a></span></div>
                        <div class="dp-row"><span class="dp-k">Email</span><span class="dp-v">{{ d.contact_email || '—' }}</span></div>
                      </div>
                      @if (d.address) {
                        <div class="dp-section">
                          <span class="dp-title">Collection Address</span>
                          <p class="dp-addr">{{ d.address.address_line1 }}<span *ngIf="d.address.address_line2">, {{ d.address.address_line2 }}</span>, {{ d.address.city }}, {{ d.address.state }} - {{ d.address.pincode }}</p>
                          <a class="dp-maps-link" [href]="mapsUrl(d.address)" target="_blank" rel="noopener">
                            <mat-icon>location_on</mat-icon> View on Google Maps
                          </a>
                        </div>
                      }
                      @if (d.lab_branch) {
                        <div class="dp-section">
                          <span class="dp-title">Lab Branch</span>
                          <div class="dp-row"><span class="dp-k">Name</span><span class="dp-v">{{ d.lab_branch.name }}</span></div>
                          <p class="dp-addr">{{ d.lab_branch.address }}, {{ d.lab_branch.city }} - {{ d.lab_branch.pincode }}</p>
                        </div>
                      }
                      @if (d.items && d.items.length) {
                        <div class="dp-section">
                          <span class="dp-title">Assigned Tests</span>
                          <ul class="dp-items">
                            @for (it of d.items; track it.id) { <li>{{ it.item_name || it.item_type }}</li> }
                          </ul>
                        </div>
                      }
                    </div>
                    }
                  }
                }

                <!-- Notes -->
                @if (b.technician_notes) {
                  <div class="notes-block"><mat-icon class="notes-icon">sticky_note_2</mat-icon><p class="notes-text">{{ b.technician_notes }}</p></div>
                }

                <!-- Actions -->
                <div class="card-actions">
                  <button class="btn-notes" (click)="openRemarks(b)">
                    <mat-icon>{{ b.technician_notes ? 'edit_note' : 'note_add' }}</mat-icon>
                    <span>{{ b.technician_notes ? 'Edit Notes' : 'Add Notes' }}</span>
                  </button>

                  @for (act of actionsFor(b.status); track act.status) {
                    <button class="btn-advance" [class.btn-danger]="act.danger" [disabled]="updatingId() === b.id" (click)="openStatusUpdate(b, act.status, act.label)">
                      @if (updatingId() === b.id) { <mat-icon class="spin">hourglass_empty</mat-icon><span>Updating…</span> }
                      @else { <mat-icon>{{ act.danger ? 'block' : 'arrow_forward' }}</mat-icon><span>{{ act.label }}</span> }
                    </button>
                  }

                  @if (actionsFor(b.status).length === 0) {
                    <div class="final-state" [class.final-completed]="b.status === 'completed'" [class.final-cancelled]="b.status === 'cancelled' || b.status === 'unable_to_collect'">
                      <mat-icon>{{ b.status === 'completed' ? 'check_circle' : (b.status === 'cancelled' || b.status === 'unable_to_collect' ? 'cancel' : 'hourglass_bottom') }}</mat-icon>
                      <span>{{ label(b.status) }}</span>
                    </div>
                  }
                </div>
              </div>
            </div>
          }
        </div>

        @if (totalPages() > 1) {
          <div class="pagination">
            <button class="page-btn" [disabled]="page() === 1" (click)="goPage(page() - 1)"><mat-icon>chevron_left</mat-icon></button>
            <div class="page-info"><span class="page-current">{{ page() }}</span><span class="page-of">of</span><span class="page-total">{{ totalPages() }}</span></div>
            <button class="page-btn" [disabled]="page() === totalPages()" (click)="goPage(page() + 1)"><mat-icon>chevron_right</mat-icon></button>
          </div>
        }
      }

      <!-- Status update dialog (with remarks) -->
      @if (statusDialog()) {
        <div class="dialog-backdrop" (click)="closeStatusUpdate()">
          <div class="dialog-box" (click)="$event.stopPropagation()">
            <div class="dialog-header">
              <div class="dialog-icon-wrap"><mat-icon>update</mat-icon></div>
              <div><h3 class="dialog-title">Update to “{{ statusDialog()?.label }}”</h3><p class="dialog-ref">{{ statusDialog()?.booking?.reference_number }}</p></div>
              <button class="dialog-close" (click)="closeStatusUpdate()"><mat-icon>close</mat-icon></button>
            </div>
            <div class="dialog-body">
              <label class="textarea-label">Remarks {{ statusDialog()?.status === 'unable_to_collect' ? '(required)' : '(optional)' }}</label>
              <textarea [(ngModel)]="statusRemarks" rows="4" class="remarks-textarea" placeholder="Add a note about this status update…"></textarea>
            </div>
            <div class="dialog-actions">
              <button class="btn-cancel" (click)="closeStatusUpdate()">Cancel</button>
              <button class="btn-save" [disabled]="savingStatus() || (statusDialog()?.status === 'unable_to_collect' && !statusRemarks.trim())" (click)="confirmStatusUpdate()">
                @if (savingStatus()) { <mat-icon class="spin">hourglass_empty</mat-icon> Updating… }
                @else { <mat-icon>check</mat-icon> Confirm }
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Remarks dialog (persistent notes) -->
      @if (remarksOpen()) {
        <div class="dialog-backdrop" (click)="closeRemarks()">
          <div class="dialog-box" (click)="$event.stopPropagation()">
            <div class="dialog-header">
              <div class="dialog-icon-wrap"><mat-icon>edit_note</mat-icon></div>
              <div><h3 class="dialog-title">{{ remarksBooking()?.technician_notes ? 'Edit Notes' : 'Add Notes' }}</h3><p class="dialog-ref">{{ remarksBooking()?.reference_number }}</p></div>
              <button class="dialog-close" (click)="closeRemarks()"><mat-icon>close</mat-icon></button>
            </div>
            <div class="dialog-body">
              <label class="textarea-label">Technician Notes</label>
              <textarea [(ngModel)]="remarksText" rows="5" class="remarks-textarea" placeholder="Observations about the collection, patient condition, etc."></textarea>
            </div>
            <div class="dialog-actions">
              <button class="btn-cancel" (click)="closeRemarks()">Cancel</button>
              <button class="btn-save" [disabled]="!remarksText.trim() || savingRemarks()" (click)="saveRemarks()">
                @if (savingRemarks()) { <mat-icon class="spin">hourglass_empty</mat-icon> Saving… }
                @else { <mat-icon>save</mat-icon> Save Notes }
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    :host { --emerald-900:#064E3B; --emerald-700:#047857; --emerald-600:#059669; --emerald-400:#34D399; --emerald-100:#D1FAE5; --emerald-50:#ECFDF5; --saffron:#F97316; --saffron-dark:#EA580C; --indigo:#6366F1; --text:#0F172A; --text-secondary:#475569; --muted:#94A3B8; --border:#E2E8F0; --surface:#FFFFFF; font-family:'Inter',system-ui,-apple-system,sans-serif; }
    .page { max-width:900px; margin:0 auto; }
    .page-header { display:flex; align-items:flex-start; justify-content:space-between; gap:1rem; margin-bottom:1.5rem; flex-wrap:wrap; }
    .header-left { display:flex; flex-direction:column; gap:.4rem; }
    .header-eyebrow { display:flex; align-items:center; gap:.35rem; font-size:.75rem; font-weight:600; color:var(--emerald-700); text-transform:uppercase; letter-spacing:.08em; }
    .eyebrow-icon { font-size:.9rem; width:.9rem; height:.9rem; }
    .page-title { margin:0; font-size:1.6rem; font-weight:800; color:var(--text); letter-spacing:-.025em; }
    .header-right { display:flex; align-items:center; gap:.75rem; padding-top:.25rem; }
    .total-badge { display:flex; align-items:baseline; gap:.3rem; background:var(--emerald-50); border:1px solid var(--emerald-100); border-radius:999px; padding:.35rem .9rem; }
    .total-num { font-size:1.1rem; font-weight:800; color:var(--emerald-700); }
    .total-label { font-size:.75rem; color:var(--emerald-700); font-weight:500; }
    .refresh-btn { width:38px; height:38px; border-radius:10px; border:1.5px solid var(--border); background:var(--surface); color:var(--emerald-700); cursor:pointer; display:flex; align-items:center; justify-content:center; }
    .refresh-btn mat-icon { font-size:1.15rem; width:1.15rem; height:1.15rem; }
    .refresh-btn:disabled { opacity:.5; cursor:not-allowed; }
    .filters-row { margin-bottom:1.25rem; overflow-x:auto; padding-bottom:.25rem; }
    .filter-chips { display:flex; gap:.5rem; flex-wrap:nowrap; }
    .filter-chip { display:flex; align-items:center; gap:.4rem; padding:.45rem 1rem; border-radius:999px; border:1.5px solid var(--border); background:var(--surface); font-size:.8rem; font-weight:500; color:var(--text-secondary); cursor:pointer; white-space:nowrap; font-family:inherit; }
    .filter-chip.active { background:var(--emerald-900); border-color:var(--emerald-900); color:#fff; }
    .chip-dot { width:7px; height:7px; border-radius:50%; flex-shrink:0; }
    .loading-state, .error-state, .empty-state { display:flex; flex-direction:column; align-items:center; gap:1rem; padding:4rem 1rem; color:var(--text-secondary); text-align:center; }
    .spinner { width:40px; height:40px; border:3px solid var(--emerald-100); border-top-color:var(--emerald-600); border-radius:50%; animation:spin 1s linear infinite; }
    .spinner.sm { width:20px; height:20px; border-width:2px; }
    .error-icon-wrap, .empty-icon-wrap { width:56px; height:56px; border-radius:16px; display:flex; align-items:center; justify-content:center; }
    .error-icon-wrap { background:#FEF2F2; } .error-icon-wrap mat-icon { color:#EF4444; }
    .empty-icon-wrap { background:var(--emerald-50); border:1.5px solid var(--emerald-100); } .empty-icon-wrap mat-icon { color:var(--emerald-600); font-size:1.75rem; width:1.75rem; height:1.75rem; }
    .empty-title { margin:0; font-weight:700; color:var(--text); } .empty-sub { margin:0; font-size:.875rem; color:var(--muted); }
    .retry-btn { padding:.55rem 1.25rem; border-radius:8px; border:1.5px solid var(--border); background:var(--surface); font-weight:600; cursor:pointer; }
    .bookings-list { display:flex; flex-direction:column; gap:.875rem; }
    .booking-card { background:var(--surface); border-radius:14px; border:1px solid var(--border); overflow:hidden; display:flex; box-shadow:0 1px 3px rgba(6,78,59,.05); }
    .card-stripe { width:4px; flex-shrink:0; background:var(--status-border,#94A3B8); }
    .card-inner { flex:1; padding:1rem 1.25rem; display:flex; flex-direction:column; gap:.75rem; min-width:0; }
    .card-top { display:flex; align-items:center; justify-content:space-between; gap:.75rem; flex-wrap:wrap; }
    .card-top-left { display:flex; align-items:center; gap:.625rem; flex-wrap:wrap; }
    .ref-number { font-size:.85rem; font-weight:700; color:var(--text); font-family:'SF Mono',monospace; }
    .status-chip { display:inline-flex; align-items:center; gap:.35rem; font-size:.72rem; font-weight:700; padding:.25rem .65rem; border-radius:999px; text-transform:uppercase; letter-spacing:.06em; }
    .chip-dot-sm { width:6px; height:6px; border-radius:50%; }
    .collection-badge { display:flex; align-items:center; gap:.35rem; font-size:.75rem; font-weight:600; color:var(--indigo); background:#EEF2FF; border-radius:999px; padding:.3rem .75rem; }
    .collection-badge mat-icon { font-size:.9rem; width:.9rem; height:.9rem; }
    .home-badge { color:var(--saffron-dark); background:#FFF7ED; }
    .card-meta { display:flex; align-items:center; gap:1rem; flex-wrap:wrap; }
    .meta-item { display:flex; align-items:center; gap:.35rem; font-size:.8rem; color:var(--text-secondary); }
    .meta-item mat-icon { font-size:.9rem; width:.9rem; height:.9rem; color:var(--muted); }
    .meta-separator { flex:1; }
    .amount-item { display:flex; align-items:center; gap:.5rem; }
    .amount-value { font-size:.95rem; font-weight:700; color:var(--text); }
    .payment-chip { font-size:.7rem; font-weight:700; padding:.2rem .55rem; border-radius:999px; text-transform:uppercase; }
    .paid-chip { background:#F0FDF4; color:#15803D; } .pending-chip { background:#FFFBEB; color:#B45309; }
    .detail-toggle { display:flex; align-items:center; gap:.3rem; align-self:flex-start; background:none; border:none; font-size:.8rem; font-weight:600; color:var(--emerald-700); cursor:pointer; padding:0; font-family:inherit; }
    .detail-toggle mat-icon { font-size:1.1rem; width:1.1rem; height:1.1rem; }
    .detail-loading { display:flex; align-items:center; gap:.5rem; font-size:.8rem; color:var(--muted); }
    .detail-panel { display:flex; flex-direction:column; gap:.875rem; background:#F8FAFC; border:1px solid #EEF2F6; border-radius:10px; padding:.875rem 1rem; }
    .dp-section { display:flex; flex-direction:column; gap:.25rem; }
    .dp-title { font-size:.68rem; font-weight:700; text-transform:uppercase; letter-spacing:.06em; color:var(--muted); margin-bottom:.1rem; }
    .dp-row { display:flex; gap:.5rem; font-size:.8rem; }
    .dp-k { width:110px; flex-shrink:0; color:var(--muted); }
    .dp-v { color:var(--text); font-weight:500; word-break:break-word; }
    .dp-v a { color:var(--emerald-700); text-decoration:none; }
    .dp-v.mono { font-family:'JetBrains Mono','SF Mono','Fira Code',monospace; font-size:.75rem; }
    .dp-rel { color:var(--muted); font-weight:400; }
    .dp-addr { margin:0; font-size:.8rem; color:var(--text-secondary); line-height:1.5; }
    .dp-maps-link { display:inline-flex; align-items:center; gap:.3rem; margin-top:.4rem; font-size:.78rem; font-weight:600; color:var(--emerald-700); text-decoration:none; mat-icon { font-size:1rem; width:1rem; height:1rem; } &:hover { text-decoration:underline; } }
    .dp-items { margin:.1rem 0 0; padding-left:1.1rem; font-size:.8rem; color:var(--text-secondary); }
    .dp-items li { margin-bottom:.15rem; }
    .notes-block { display:flex; gap:.625rem; padding:.65rem .875rem; background:var(--emerald-50); border-radius:10px; border:1px solid var(--emerald-100); }
    .notes-icon { font-size:1rem; width:1rem; height:1rem; color:var(--emerald-600); flex-shrink:0; margin-top:.1rem; }
    .notes-text { margin:0; font-size:.8rem; color:var(--text-secondary); line-height:1.6; }
    .card-actions { display:flex; gap:.625rem; align-items:center; flex-wrap:wrap; padding-top:.25rem; border-top:1px solid #F8FAFC; }
    .btn-notes { display:flex; align-items:center; gap:.4rem; padding:.55rem 1rem; border-radius:8px; border:1.5px solid var(--border); background:var(--surface); font-size:.8rem; font-weight:600; color:var(--text-secondary); cursor:pointer; font-family:inherit; }
    .btn-notes mat-icon { font-size:.95rem; width:.95rem; height:.95rem; }
    .btn-advance { display:flex; align-items:center; gap:.4rem; padding:.55rem 1.125rem; border-radius:8px; border:none; background:var(--saffron); font-size:.8rem; font-weight:700; color:#fff; cursor:pointer; font-family:inherit; }
    .btn-advance mat-icon { font-size:.95rem; width:.95rem; height:.95rem; }
    .btn-advance:disabled { opacity:.6; cursor:not-allowed; }
    .btn-advance.btn-danger { background:#EF4444; }
    .final-state { display:flex; align-items:center; gap:.4rem; font-size:.8rem; font-weight:600; padding:.4rem .75rem; border-radius:8px; }
    .final-state mat-icon { font-size:1rem; width:1rem; height:1rem; }
    .final-completed { color:#15803D; background:#F0FDF4; } .final-cancelled { color:#B91C1C; background:#FEF2F2; }
    .pagination { display:flex; align-items:center; justify-content:center; gap:.875rem; margin-top:1.75rem; }
    .page-btn { width:38px; height:38px; border-radius:10px; border:1.5px solid var(--border); background:var(--surface); color:var(--text-secondary); cursor:pointer; display:flex; align-items:center; justify-content:center; }
    .page-btn:disabled { opacity:.4; cursor:not-allowed; }
    .page-info { display:flex; align-items:baseline; gap:.35rem; font-size:.875rem; }
    .page-current { font-weight:800; font-size:1rem; color:var(--text); }
    .page-of { color:var(--muted); } .page-total { font-weight:600; color:var(--text-secondary); }
    .dialog-backdrop { position:fixed; inset:0; background:rgba(6,78,59,.4); backdrop-filter:blur(4px); z-index:200; display:flex; align-items:center; justify-content:center; padding:1.25rem; }
    .dialog-box { background:var(--surface); border-radius:20px; width:100%; max-width:500px; box-shadow:0 24px 64px rgba(6,78,59,.2); overflow:hidden; }
    .dialog-header { display:flex; align-items:center; gap:.875rem; padding:1.25rem 1.5rem; border-bottom:1px solid var(--border); }
    .dialog-icon-wrap { width:44px; height:44px; border-radius:12px; background:var(--emerald-50); border:1px solid var(--emerald-100); display:flex; align-items:center; justify-content:center; flex-shrink:0; }
    .dialog-icon-wrap mat-icon { color:var(--emerald-700); }
    .dialog-title { margin:0; font-size:1rem; font-weight:700; color:var(--text); }
    .dialog-ref { margin:.1rem 0 0; font-size:.75rem; color:var(--muted); font-family:monospace; }
    .dialog-close { margin-left:auto; width:34px; height:34px; border-radius:8px; border:none; background:none; cursor:pointer; color:var(--muted); display:flex; align-items:center; justify-content:center; flex-shrink:0; }
    .dialog-body { padding:1.25rem 1.5rem; }
    .textarea-label { display:block; font-size:.75rem; font-weight:600; color:var(--text-secondary); text-transform:uppercase; letter-spacing:.07em; margin-bottom:.5rem; }
    .remarks-textarea { width:100%; border:1.5px solid var(--border); border-radius:10px; padding:.75rem 1rem; font-size:.875rem; font-family:inherit; resize:vertical; outline:none; box-sizing:border-box; color:var(--text); line-height:1.6; }
    .remarks-textarea:focus { border-color:var(--emerald-400); }
    .dialog-actions { display:flex; justify-content:flex-end; gap:.625rem; padding:1rem 1.5rem 1.25rem; border-top:1px solid var(--border); }
    .btn-cancel { padding:.6rem 1.25rem; border-radius:8px; border:1.5px solid var(--border); background:none; font-size:.875rem; font-weight:600; color:var(--text-secondary); cursor:pointer; font-family:inherit; }
    .btn-save { display:flex; align-items:center; gap:.4rem; padding:.6rem 1.375rem; border-radius:8px; border:none; background:var(--emerald-800,#065F46); font-size:.875rem; font-weight:700; color:#fff; cursor:pointer; font-family:inherit; }
    .btn-save mat-icon { font-size:1rem; width:1rem; height:1rem; }
    .btn-save:disabled { opacity:.5; cursor:not-allowed; }
    @keyframes spin { to { transform:rotate(360deg); } }
    .spin { animation:spin .9s linear infinite; }
    @media (max-width:600px) { .page-title { font-size:1.35rem; } .meta-separator { display:none; } }
  `],
})
export class TechnicianBookingsComponent implements OnInit {
  filterChips = FILTER_CHIPS;

  bookings = signal<Booking[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  total = signal(0);
  page = signal(1);
  pageSize = signal(20);
  statusFilter = signal('');
  updatingId = signal<string | null>(null);

  expanded = signal<Set<string>>(new Set());
  detailMap = signal<Record<string, Booking>>({});
  detailLoadingId = signal<string | null>(null);

  // status update dialog
  statusDialog = signal<{ booking: Booking; status: string; label: string } | null>(null);
  statusRemarks = '';
  savingStatus = signal(false);

  // persistent notes dialog
  remarksOpen = signal(false);
  remarksBooking = signal<Booking | null>(null);
  remarksText = '';
  savingRemarks = signal(false);

  todayLabel = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.pageSize())));

  constructor(private bookingApi: BookingApiService, private snack: MatSnackBar) {}

  ngOnInit(): void { this.load(); }

  label(s: string): string { return STATUS_LABELS[s] ?? s; }
  statusConfig(s: string) { return STATUS_CONFIG[s] ?? { chip: '#F1F5F9', chipText: '#475569', dot: '#94A3B8', border: '#94A3B8' }; }
  actionsFor(status: string) { return TECH_ACTIONS[status] ?? []; }

  /** No lat/long is stored for addresses — build a Google Maps search link
   * from the structured address text instead of requiring geocoding. */
  mapsUrl(address: { address_line1: string; address_line2?: string; city: string; state: string; pincode: string }): string {
    const parts = [address.address_line1, address.address_line2, address.city, address.state, address.pincode].filter(Boolean);
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(parts.join(', '))}`;
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.bookingApi.getMyAssigned({
      page: this.page(),
      page_size: this.pageSize(),
      status: this.statusFilter() || undefined,
    }).subscribe({
      next: (res) => { this.bookings.set(res.items); this.total.set(res.total); this.loading.set(false); },
      error: () => { this.error.set('Failed to load bookings. Please try again.'); this.loading.set(false); },
    });
  }

  setFilter(status: string): void { this.statusFilter.set(status); this.page.set(1); this.load(); }
  goPage(p: number): void { this.page.set(p); this.load(); }

  toggleDetail(b: Booking): void {
    const s = new Set(this.expanded());
    if (s.has(b.id)) { s.delete(b.id); this.expanded.set(s); return; }
    s.add(b.id);
    this.expanded.set(s);
    if (!this.detailMap()[b.id]) {
      this.detailLoadingId.set(b.id);
      this.bookingApi.get(b.id).subscribe({
        next: (d) => { this.detailMap.set({ ...this.detailMap(), [b.id]: d }); this.detailLoadingId.set(null); },
        error: () => { this.detailLoadingId.set(null); },
      });
    }
  }

  // ── Status update (with remarks) ──
  openStatusUpdate(b: Booking, status: string, label: string): void {
    this.statusDialog.set({ booking: b, status, label });
    this.statusRemarks = '';
  }
  closeStatusUpdate(): void { this.statusDialog.set(null); this.statusRemarks = ''; }

  confirmStatusUpdate(): void {
    const dlg = this.statusDialog();
    if (!dlg) return;
    if (dlg.status === 'unable_to_collect' && !this.statusRemarks.trim()) return;
    this.savingStatus.set(true);
    this.updatingId.set(dlg.booking.id);
    const remarks = this.statusRemarks.trim();
    this.bookingApi.updateStatus(dlg.booking.id, dlg.status, remarks || undefined).subscribe({
      next: (updated) => {
        // Persist remarks as technician notes too (so they show on the card)
        const finalize = () => {
          this.bookings.update((list) => list.map((x) => x.id === updated.id ? { ...x, ...updated } : x));
          this.savingStatus.set(false);
          this.updatingId.set(null);
          this.closeStatusUpdate();
          this.snack.open(`Booking marked as ${this.label(dlg.status)}.`, 'OK', { duration: 3000 });
          // If the active filter no longer matches, reload
          if (this.statusFilter() && this.statusFilter() !== updated.status) this.load();
        };
        if (remarks) {
          this.bookingApi.addRemarks(dlg.booking.id, remarks).subscribe({ next: finalize, error: finalize });
        } else {
          finalize();
        }
      },
      error: (err) => {
        this.savingStatus.set(false);
        this.updatingId.set(null);
        const msg = err?.error?.detail?.message ?? 'Failed to update status.';
        this.snack.open(msg, 'OK', { duration: 4000 });
      },
    });
  }

  // ── Persistent notes ──
  openRemarks(b: Booking): void { this.remarksBooking.set(b); this.remarksText = b.technician_notes ?? ''; this.remarksOpen.set(true); }
  closeRemarks(): void { this.remarksOpen.set(false); this.remarksBooking.set(null); this.remarksText = ''; }

  saveRemarks(): void {
    const b = this.remarksBooking();
    if (!b || !this.remarksText.trim()) return;
    this.savingRemarks.set(true);
    this.bookingApi.addRemarks(b.id, this.remarksText.trim()).subscribe({
      next: (updated) => {
        this.bookings.update((list) => list.map((x) => x.id === updated.id ? { ...x, technician_notes: updated.technician_notes } : x));
        this.savingRemarks.set(false);
        this.closeRemarks();
        this.snack.open('Notes saved.', 'OK', { duration: 3000 });
      },
      error: () => { this.savingRemarks.set(false); this.snack.open('Failed to save notes.', 'OK', { duration: 3000 }); },
    });
  }
}
