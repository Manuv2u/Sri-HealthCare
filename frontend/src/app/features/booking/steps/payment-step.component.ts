import { Component, inject, output, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { BookingApiService } from '../../../core/api/services/booking-api.service';
import { PaymentApiService } from '../../../core/api/services/payment-api.service';
import { AdminApiService } from '../../../core/api/services/admin-api.service';
import { BookingWizardStore } from '../../../core/store/booking-wizard.store';
import { Booking, Payment, FeatureFlag } from '../../../core/api/api.types';

@Component({
  selector: 'app-payment-step',
  standalone: true,
  imports: [CommonModule, MatIconModule, FormsModule],
  template: `
    <div class="step-wrap">
      <div class="step-header">
        <h2>Review and Pay</h2>
        <p>Confirm your booking details before payment</p>
      </div>
      @if (confirmed()) {
        <div class="success-card">
          <div class="success-icon"><mat-icon>check_circle</mat-icon></div>
          <div class="success-title">Booking Confirmed!</div>
          <div class="success-sub">Your booking has been placed successfully.</div>
          @if (invoiceUrl()) {
            <a class="btn-invoice" [href]="invoiceUrl()!" target="_blank">
              <mat-icon>download</mat-icon> Download Invoice
            </a>
          }
        </div>
      } @else {
        <div class="summary-card">
          <div class="summary-title"><mat-icon>receipt_long</mat-icon> Order Summary</div>
          @for (t of store.selectedTests(); track t.id) {
            <div class="summary-row"><span>{{ t.name }}</span><span>Rs.{{ t.price }}</span></div>
          }
          @for (p of store.selectedPackages(); track p.id) {
            <div class="summary-row"><span>{{ p.name }}</span><span>Rs.{{ p.price }}</span></div>
          }
          <div class="summary-total"><span>Total</span><span>Rs.{{ grandTotal() }}</span></div>
          @if (advanceEnabled() && advanceAmount() > 0) {
            <div class="advance-notice">
              <mat-icon>info</mat-icon>
              <div>
                <strong>Advance payment required:</strong>
                Rs.{{ advanceAmount() }} ({{ advancePct() }}% of total).
                The remaining Rs.{{ grandTotal() - advanceAmount() }} is due on visit / sample collection.
              </div>
            </div>
          }
        </div>
        <div class="details-card">
          <div class="detail-row"><mat-icon>person</mat-icon><span>{{ store.patientName() ?? 'Self' }}</span></div>
          <div class="detail-row"><mat-icon>local_hospital</mat-icon><span>Visit Lab</span></div>
          @if (store.slotDate()) {
            <div class="detail-row"><mat-icon>calendar_today</mat-icon><span>{{ store.slotDate() }}</span></div>
          }
        </div>
        <div class="payment-section">
          <label class="field-label">Payment Method</label>
          <div class="payment-options">
            @for (opt of paymentOptions; track opt.value) {
              <label class="payment-option" [class.selected]="paymentMethod === opt.value">
                <input type="radio" name="payment" [value]="opt.value" [(ngModel)]="paymentMethod" />
                <mat-icon>{{ opt.icon }}</mat-icon>
                <span>{{ opt.label }}</span>
                <div class="pay-check" [class.visible]="paymentMethod === opt.value"><mat-icon>check_circle</mat-icon></div>
              </label>
            }
          </div>
        </div>
        @if (error()) {
          <div class="error-box"><mat-icon>error_outline</mat-icon> {{ error() }}</div>
        }
        <div class="step-actions">
          <button class="btn-back" (click)="back.emit()" [disabled]="loading()">
            <mat-icon>arrow_back</mat-icon> Back
          </button>
          <button class="btn-pay" [disabled]="!paymentMethod || loading()" (click)="confirmAndPay()">
            @if (loading()) { <span class="spinner"></span> Processing... }
            @else if (advanceEnabled() && advanceAmount() > 0) {
              <mat-icon>lock</mat-icon> Pay Advance Rs.{{ advanceAmount() }}
            } @else {
              <mat-icon>lock</mat-icon> Confirm and Pay Rs.{{ grandTotal() }}
            }
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    .step-wrap { display: flex; flex-direction: column; gap: 1.25rem; }
    .step-header h2 { font-size: 1.25rem; font-weight: 800; color: #1a202c; margin-bottom: .25rem; }
    .step-header p { font-size: .875rem; color: #718096; }
    .summary-card, .details-card { background: #f7fafc; border: 1.5px solid #e2e8f0; border-radius: 12px; padding: 1rem 1.1rem; display: flex; flex-direction: column; gap: .5rem; }
    .summary-title { display: flex; align-items: center; gap: .4rem; font-size: .875rem; font-weight: 700; color: #2d3748; }
    .summary-row { display: flex; justify-content: space-between; font-size: .85rem; color: #4a5568; }
    .summary-total { display: flex; justify-content: space-between; font-size: .95rem; font-weight: 800; color: #1a202c; border-top: 1px solid #e2e8f0; padding-top: .5rem; margin-top: .25rem; }
    .detail-row { display: flex; align-items: center; gap: .6rem; font-size: .875rem; color: #4a5568; }
    .payment-section { display: flex; flex-direction: column; gap: .5rem; }
    .field-label { font-size: .85rem; font-weight: 600; color: #4a5568; }
    .payment-options { display: flex; flex-direction: column; gap: .5rem; }
    .payment-option { display: flex; align-items: center; gap: .75rem; padding: .85rem 1rem; border-radius: 10px; border: 1.5px solid #e2e8f0; cursor: pointer; transition: all .15s; background: #fff; }
    .payment-option input[type=radio] { display: none; }
    .payment-option:hover { border-color: #00796b; background: #f0fdf9; }
    .payment-option.selected { border-color: #00796b; background: #f0fdf9; }
    .pay-check { color: #00796b; opacity: 0; transition: opacity .15s; }
    .pay-check.visible { opacity: 1; }
    .error-box { display: flex; align-items: center; gap: .75rem; padding: 1rem; background: #fff5f5; border-radius: 10px; color: #c53030; font-size: .875rem; }
    .step-actions { display: flex; justify-content: space-between; align-items: center; }
    .btn-back { display: inline-flex; align-items: center; gap: .4rem; background: none; border: 1.5px solid #e2e8f0; border-radius: 10px; padding: .6rem 1.25rem; font-size: .875rem; font-weight: 600; color: #4a5568; cursor: pointer; }
    .btn-back:hover:not(:disabled) { border-color: #00796b; color: #00796b; }
    .btn-back:disabled { opacity: .5; cursor: not-allowed; }
    .btn-pay { display: inline-flex; align-items: center; gap: .4rem; background: #00796b; color: #fff; border: none; border-radius: 10px; padding: .7rem 1.5rem; font-size: .9rem; font-weight: 700; cursor: pointer; }
    .btn-pay:hover:not(:disabled) { background: #00695c; }
    .btn-pay:disabled { opacity: .5; cursor: not-allowed; }
    .spinner { width: 16px; height: 16px; border: 2px solid rgba(255,255,255,.4); border-top-color: #fff; border-radius: 50%; animation: spin .7s linear infinite; display: inline-block; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .success-card { display: flex; flex-direction: column; align-items: center; gap: 1rem; padding: 2.5rem 1.5rem; text-align: center; }
    .success-title { font-size: 1.25rem; font-weight: 800; color: #1a202c; }
    .success-sub { font-size: .875rem; color: #718096; }
    .btn-invoice { display: inline-flex; align-items: center; gap: .4rem; background: #00796b; color: #fff; border: none; border-radius: 10px; padding: .65rem 1.5rem; font-size: .9rem; font-weight: 700; text-decoration: none; margin-top: .5rem; }
    .advance-notice { display: flex; align-items: flex-start; gap: .6rem; padding: .75rem .9rem; background: #fff8e1; border-radius: 8px; border-left: 3px solid #f59e0b; font-size: .82rem; color: #78350f; mat-icon { font-size: 1rem; width: 1rem; height: 1rem; flex-shrink: 0; margin-top: .15rem; color: #f59e0b; } strong { font-weight: 700; } }
  `],
})
export class PaymentStepComponent implements OnInit {
  back = output<void>();
  private bookingApi = inject(BookingApiService);
  private paymentApi = inject(PaymentApiService);
  private adminApi = inject(AdminApiService);
  readonly store = inject(BookingWizardStore);
  paymentMethod = '';
  loading = signal(false);
  error = signal<string | null>(null);
  confirmed = signal(false);
  invoiceUrl = signal<string | null>(null);
  advanceEnabled = signal(false);
  advancePct = signal(20);
  advanceMin = signal(100);
  paymentOptions = [
    { value: 'upi',  label: 'UPI',          icon: 'account_balance_wallet' },
    { value: 'card', label: 'Card',          icon: 'credit_card' },
    { value: 'cash', label: 'Cash on Visit', icon: 'payments' },
  ];
  grandTotal = computed(() => {
    const s = this.store;
    const testSum = s.selectedTests().reduce((acc: number, t: { price: number }) => acc + t.price, 0);
    const pkgSum  = s.selectedPackages().reduce((acc: number, p: { price: number }) => acc + p.price, 0);
    return testSum + pkgSum;
  });
  advanceAmount = computed(() => {
    if (!this.advanceEnabled()) return 0;
    const pct = Math.round(this.grandTotal() * this.advancePct() / 100);
    return Math.max(pct, this.advanceMin());
  });

  ngOnInit(): void {
    this.adminApi.getFeatureFlags().subscribe({
      next: (flags: FeatureFlag[]) => {
        const enabled = flags.find((f) => f.key === 'advance_payment_enabled');
        const pct = flags.find((f) => f.key === 'advance_payment_percentage');
        const min = flags.find((f) => f.key === 'advance_payment_minimum_amount');
        if (enabled) this.advanceEnabled.set(enabled.is_enabled);
        if (pct?.description) this.advancePct.set(parseInt(pct.description, 10) || 20);
        if (min?.description) this.advanceMin.set(parseInt(min.description, 10) || 100);
      },
      error: () => {},
    });
  }

  confirmAndPay(): void {
    this.loading.set(true);
    this.error.set(null);
    const s = this.store;
    const payload = {
      patient_id:      s.patientId(),
      test_ids:        s.selectedTests().map((t: { id: string }) => t.id),
      package_ids:     s.selectedPackages().map((p: { id: string }) => p.id),
      time_slot_id:    s.slotId(),
      booking_date:    s.slotDate(),
      collection_type: s.collectionType(),
      pincode:         s.pincode(),
      lab_branch_id:   s.labBranchId(),
    };
    this.bookingApi.create(payload).subscribe({
      next: (booking: Booking) => {
        (this.store as any).patchState({ paymentMethod: this.paymentMethod });
        this.paymentApi.initiate(booking.id, this.paymentMethod).subscribe({
          next: (payment: Payment) => {
            this.loading.set(false);
            if (this.paymentMethod !== 'cash' && payment.payment_url) {
              window.location.href = payment.payment_url;
            } else {
              this.confirmed.set(true);
              this.invoiceUrl.set('/payments/' + payment.payment_id + '/invoice');
            }
          },
          error: () => { this.error.set('Payment initiation failed. Please try again.'); this.loading.set(false); },
        });
      },
      error: () => { this.error.set('Booking creation failed. Please check all details and try again.'); this.loading.set(false); },
    });
  }
}
