import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { BookingApiService } from '../../../core/api/services/booking-api.service';
import { Booking } from '../../../core/api/api.types';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { BadgeComponent } from '../../../shared/components/badge/badge.component';
import { SpinnerComponent } from '../../../shared/components/spinner/spinner.component';
import { AlertComponent } from '../../../shared/components/alert/alert.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { InputComponent } from '../../../shared/components/input/input.component';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';

@Component({
  selector: 'app-booking-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule,
    ButtonComponent, BadgeComponent, SpinnerComponent, AlertComponent, ModalComponent, InputComponent],
  template: `
<div class="detail-page">
  <div class="back-nav">
    <a routerLink="/bookings" class="back-link">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
      Back to Bookings
    </a>
  </div>

  @if (loading()) {
    <div class="loading-wrap"><app-spinner size="lg" /><p>Loading booking details…</p></div>
  } @else if (error()) {
    <app-alert type="error">{{ error() }}</app-alert>
  } @else if (booking()) {
    <div class="detail-layout">

      <!-- Header Card -->
      <div class="header-card">
        <div class="header-left">
          <span class="ref-chip">{{ booking()!.reference_number }}</span>
          <h1 class="booking-title">Booking Details</h1>
          <p class="created-on">Placed on {{ formatDate(booking()!.created_at) }}</p>
        </div>
        <div class="header-right">
          <app-badge [color]="statusColor(booking()!.status)" size="lg">
            {{ formatStatus(booking()!.status) }}
          </app-badge>
        </div>
      </div>

      <!-- Main Info Grid -->
      <div class="info-grid">

        <!-- Booking Info -->
        <div class="info-card">
          <h2 class="card-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            Appointment
          </h2>
          <div class="info-rows">
            <div class="info-row"><span class="info-label">Date</span><span class="info-val">{{ formatDate(booking()!.booking_date) }}</span></div>
            <div class="info-row">
              <span class="info-label">Collection</span>
              <span class="info-val">{{ booking()!.collection_type === 'home' ? '🏠 Home Collection' : '🏥 Lab Visit' }}</span>
            </div>
            <div class="info-row"><span class="info-label">Status</span>
              <app-badge [color]="statusColor(booking()!.status)">{{ formatStatus(booking()!.status) }}</app-badge>
            </div>
          </div>
        </div>

        <!-- Payment Info -->
        <div class="info-card">
          <h2 class="card-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
            Payment
          </h2>
          <div class="info-rows">
            <div class="info-row"><span class="info-label">Total Amount</span><span class="info-val amount">₹{{ booking()!.total_amount.toLocaleString('en-IN') }}</span></div>
            <div class="info-row"><span class="info-label">Payment Status</span>
              <app-badge [color]="paymentColor(booking()!.payment_status)">{{ formatStatus(booking()!.payment_status) }}</app-badge>
            </div>
            @if (booking()!.cancellation_fee) {
              <div class="info-row"><span class="info-label">Cancellation Fee</span><span class="info-val error">₹{{ booking()!.cancellation_fee }}</span></div>
            }
          </div>
        </div>
      </div>

      <!-- Tests Table -->
      @if (booking()!.items?.length) {
        <div class="tests-card">
          <h2 class="card-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            Tests & Packages
          </h2>
          <div class="tests-table">
            <div class="tests-header">
              <span>Item</span><span>Type</span><span class="text-right">Price</span>
            </div>
            @for (item of booking()!.items!; track item.id) {
              <div class="tests-row">
                <span class="item-name">{{ item.item_name }}</span>
                <app-badge [color]="item.item_type === 'package' ? 'accent' : 'info'" size="sm">
                  {{ item.item_type === 'package' ? 'Package' : 'Test' }}
                </app-badge>
                <span class="item-price">₹{{ item.unit_price.toLocaleString('en-IN') }}</span>
              </div>
            }
            <div class="tests-total">
              <span>Total</span>
              <span></span>
              <span class="total-val">₹{{ booking()!.total_amount.toLocaleString('en-IN') }}</span>
            </div>
          </div>
        </div>
      }

      <!-- Notes / Cancellation Reason -->
      @if (booking()!.technician_notes) {
        <div class="notes-card info">
          <h3>Technician Notes</h3>
          <p>{{ booking()!.technician_notes }}</p>
        </div>
      }
      @if (booking()!.cancellation_reason) {
        <div class="notes-card error">
          <h3>Cancellation Reason</h3>
          <p>{{ booking()!.cancellation_reason }}</p>
        </div>
      }

      <!-- Actions -->
      @if (canCancel()) {
        <div class="actions-row">
          <app-button variant="danger" (click)="showCancelModal.set(true)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:6px"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
            Cancel Booking
          </app-button>
        </div>
      }
    </div>
  }

  <!-- Cancel Modal -->
  <app-modal [isOpen]="showCancelModal()" title="Cancel Booking" size="sm" (close)="showCancelModal.set(false)">
    <div class="cancel-form">
      <p class="cancel-hint">Please provide a reason for cancellation.</p>
      <app-input label="Reason" [formControl]="cancelReason" placeholder="Why are you cancelling?" [error]="cancelReason.touched && cancelReason.invalid" [errorMessage]="'Reason is required'" />
    </div>
    <div modal-footer>
      <app-button variant="outline" (click)="showCancelModal.set(false)">Keep Booking</app-button>
      <app-button variant="danger" [loading]="cancelling()" (click)="cancelBooking()">Yes, Cancel</app-button>
    </div>
  </app-modal>
</div>`,
  styles: [`
    .detail-page { max-width:860px; margin:0 auto; padding:1.5rem; }
    .back-link { display:inline-flex; align-items:center; gap:0.5rem; font-size:0.875rem; color:#475569; text-decoration:none; margin-bottom:1.25rem; transition:color 150ms; &:hover { color:#2C7A7B; } }
    .loading-wrap { display:flex; flex-direction:column; align-items:center; justify-content:center; padding:4rem; gap:1rem; color:#475569; }
    .detail-layout { display:flex; flex-direction:column; gap:1.25rem; }
    .header-card { display:flex; justify-content:space-between; align-items:flex-start; background:linear-gradient(135deg,#2C7A7B,#285E61); border-radius:1.25rem; padding:2rem; color:#FFFFFF; }
    .ref-chip { display:inline-block; background:rgba(255,255,255,0.2); border-radius:9999px; padding:0.25rem 0.75rem; font-size:0.75rem; font-family:'JetBrains Mono','SF Mono','Fira Code',monospace; font-weight:600; margin-bottom:0.5rem; }
    .booking-title { font-size:1.5rem; font-weight:700; margin:0 0 0.25rem 0; }
    .created-on { font-size:0.875rem; opacity:0.8; margin:0; }
    .info-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:1.25rem; }
    .info-card, .tests-card, .notes-card {
      background:#FFFFFF; border:1px solid #F1F5F9; border-radius:1rem; padding:1.5rem;
    }
    .card-title { display:flex; align-items:center; gap:0.5rem; font-size:1rem; font-weight:600; color:#0F172A; margin:0 0 1rem 0; svg { color:#2C7A7B; } }
    .info-rows { display:flex; flex-direction:column; gap:0.75rem; }
    .info-row { display:flex; justify-content:space-between; align-items:center; }
    .info-label { font-size:0.875rem; color:#475569; }
    .info-val { font-size:0.875rem; font-weight:500; color:#0F172A; &.amount { font-size:1.25rem; font-weight:700; color:#285E61; } &.error { color:#DC2626; } }
    .tests-table { border:1px solid #F1F5F9; border-radius:0.75rem; overflow:hidden; }
    .tests-header { display:grid; grid-template-columns:1fr auto auto; gap:1rem; padding:0.75rem 1rem; background:#F8FAFC; font-size:0.75rem; font-weight:600; color:#94A3B8; text-transform:uppercase; letter-spacing:0.025em; }
    .tests-row { display:grid; grid-template-columns:1fr auto auto; gap:1rem; padding:0.75rem 1rem; align-items:center; border-top:1px solid #F1F5F9; }
    .item-name { font-size:0.875rem; font-weight:500; color:#0F172A; }
    .item-price { font-size:0.875rem; font-weight:600; color:#0F172A; text-align:right; }
    .tests-total { display:grid; grid-template-columns:1fr auto auto; gap:1rem; padding:1rem; background:#E6FFFA; border-top:2px solid #81E6D9; font-weight:700; color:#0F172A; }
    .total-val { font-size:1.125rem; color:#285E61; text-align:right; }
    .text-right { text-align:right; }
    .notes-card {
      padding:1.25rem; h3 { font-size:0.875rem; font-weight:600; margin:0 0 0.5rem 0; } p { font-size:0.875rem; margin:0; line-height:1.625; }
      &.info { background:#F0F9FF; border-color:#BAE6FD; h3 { color:#0369A1; } p { color:$color-info-800; } }
      &.error { background:#FEF2F2; border-color:#FECACA; h3 { color:#B91C1C; } p { color:$color-error-800; } }
    }
    .actions-row { display:flex; justify-content:flex-end; padding-top:0.5rem; }
    .cancel-form { display:flex; flex-direction:column; gap:1rem; }
    .cancel-hint { font-size:0.875rem; color:#475569; margin:0; }
    @media(max-width:768px) {
      .detail-page { padding:1rem; }
      .info-grid { grid-template-columns:1fr; }
      .header-card { flex-direction:column; gap:1rem; }
    }
  `]
})
export class BookingDetailComponent implements OnInit {
  booking = signal<Booking | null>(null);
  loading = signal(true);
  error = signal('');
  cancelling = signal(false);
  showCancelModal = signal(false);
  cancelReason = new FormControl('', Validators.required);

  constructor(private route: ActivatedRoute, private router: Router, private bookingApi: BookingApiService) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.bookingApi.get(id).subscribe({
      next: b => { this.booking.set(b); this.loading.set(false); },
      error: () => { this.error.set('Failed to load booking.'); this.loading.set(false); }
    });
  }

  canCancel() {
    const s = this.booking()?.status;
    return s === 'pending' || s === 'confirmed';
  }

  cancelBooking() {
    if (this.cancelReason.invalid) { this.cancelReason.markAsTouched(); return; }
    this.cancelling.set(true);
    this.bookingApi.cancel(this.booking()!.id, this.cancelReason.value!).subscribe({
      next: b => { this.booking.set(b); this.cancelling.set(false); this.showCancelModal.set(false); },
      error: () => { this.cancelling.set(false); this.error.set('Failed to cancel booking.'); }
    });
  }

  formatDate(d: string) { return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }); }
  formatStatus(s: string) { return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()); }
  statusColor(s: string) { const m: Record<string,string> = { pending:'warning', confirmed:'info', in_progress:'primary', completed:'success', cancelled:'error' }; return m[s] ?? 'default'; }
  paymentColor(s: string) { const m: Record<string,string> = { paid:'success', pending:'warning', failed:'error', refunded:'info' }; return m[s] ?? 'default'; }
}
