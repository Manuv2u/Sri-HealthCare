import { Component, inject, OnInit, output, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { BookingWizardStore } from '../../../core/store/booking-wizard.store';
import { BookingApiService } from '../../../core/api/services/booking-api.service';
import { PaymentApiService } from '../../../core/api/services/payment-api.service';
import { ButtonComponent, SpinnerComponent, BadgeComponent, AlertComponent } from '../../../shared/components';

@Component({
  selector: 'app-payment-step-new',
  standalone: true,
  imports: [CommonModule, ButtonComponent, SpinnerComponent, BadgeComponent, AlertComponent],
  template: `
    <div class="payment-step">
      <!-- Order Summary -->
      <div class="order-summary">
        <h3 class="summary-title">Order Summary</h3>
        
        <!-- Patient -->
        <div class="summary-row">
          <span class="summary-label">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
            Patient
          </span>
          <span class="summary-value">{{ store.patientName() || 'Myself' }}</span>
        </div>

        <!-- Tests -->
        <div class="summary-section">
          <span class="section-label">Selected Tests/Packages</span>
          <div class="items-list">
            @for (test of store.selectedTests(); track test.id) {
              <div class="item-row">
                <span class="item-name">{{ test.name }}</span>
                <span class="item-price">₹{{ test.price }}</span>
              </div>
            }
            @for (pkg of store.selectedPackages(); track pkg.id) {
              <div class="item-row item-row--package">
                <span class="item-name">{{ pkg.name }}</span>
                <span class="item-price">₹{{ pkg.price }}</span>
              </div>
            }
          </div>
        </div>

        <!-- Collection Details -->
        <div class="summary-row">
          <span class="summary-label">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              @if (store.collectionType() === 'home') {
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              } @else {
                <rect x="4" y="2" width="16" height="20" rx="2" ry="2"/>
                <path d="M9 22v-4h6v4"/>
              }
            </svg>
            Collection Type
          </span>
          <span class="summary-value">{{ store.collectionType() === 'home' ? 'Home Collection' : 'Lab Visit' }}</span>
        </div>

        <!-- Schedule -->
        <div class="summary-row">
          <span class="summary-label">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            Scheduled For
          </span>
          <span class="summary-value">{{ formatDate(store.slotDate()) }}</span>
        </div>
      </div>

      <!-- Price Breakdown -->
      <div class="price-breakdown">
        <div class="price-row">
          <span>Subtotal</span>
          <span>₹{{ subtotal() }}</span>
        </div>
        <div class="price-row">
          <span>GST (18%)</span>
          <span>₹{{ gstAmount() }}</span>
        </div>
        @if (store.collectionType() === 'home') {
          <div class="price-row price-row--discount">
            <span>Home Collection Fee</span>
            <span>FREE</span>
          </div>
        }
        <div class="price-row price-row--total">
          <span>Total Amount</span>
          <span>₹{{ totalAmount() }}</span>
        </div>
      </div>

      <!-- Payment Methods -->
      <div class="payment-methods">
        <h4 class="methods-title">Payment Method</h4>
        
        <button 
          type="button"
          class="method-card"
          [class.method-card--selected]="selectedMethod() === 'online'"
          (click)="selectMethod('online')"
        >
          <div class="method-card__icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
              <line x1="1" y1="10" x2="23" y2="10"/>
            </svg>
          </div>
          <div class="method-card__content">
            <span class="method-card__name">Pay Online</span>
            <span class="method-card__desc">Credit/Debit Card, UPI, Net Banking</span>
          </div>
          <div class="method-card__check" [class.method-card__check--visible]="selectedMethod() === 'online'">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
        </button>

        <button 
          type="button"
          class="method-card"
          [class.method-card--selected]="selectedMethod() === 'cod'"
          (click)="selectMethod('cod')"
        >
          <div class="method-card__icon method-card__icon--cod">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
            </svg>
          </div>
          <div class="method-card__content">
            <span class="method-card__name">Pay on Collection</span>
            <span class="method-card__desc">Cash or UPI at the time of sample collection</span>
          </div>
          <div class="method-card__check" [class.method-card__check--visible]="selectedMethod() === 'cod'">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
        </button>
      </div>

      <!-- Error Alert -->
      @if (error()) {
        <app-alert type="error" [dismissible]="true" (dismiss)="error.set(null)">
          {{ error() }}
        </app-alert>
      }

      <!-- Actions -->
      <div class="step-actions">
        <app-button variant="outline" size="lg" [disabled]="processing()" (click)="back.emit()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="btn-icon btn-icon--left">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Back
        </app-button>
        <app-button 
          variant="primary" 
          size="lg" 
          [disabled]="!canProceed() || processing()"
          [loading]="processing()"
          (click)="placeOrder()"
        >
          {{ selectedMethod() === 'online' ? 'Pay ₹' + totalAmount() : 'Place Order' }}
        </app-button>
      </div>
    </div>
  `,
  styles: [`
    .payment-step {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    /* Order Summary */
    .order-summary {
      padding: 1.25rem;
      background: #F8FAFC;
      border-radius: 1rem;
      border: 1px solid #F1F5F9;
    }

    .summary-title {
      font-size: 1.125rem;
      font-weight: 600;
      color: #0F172A;
      margin: 0 0 1rem 0;
      padding-bottom: 1rem;
      border-bottom: 1px solid #E2E8F0;
    }

    .summary-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem 0;
    }

    .summary-label {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.875rem;
      color: #475569;

      svg {
        width: 18px;
        height: 18px;
        opacity: 0.6;
      }
    }

    .summary-value {
      font-size: 0.875rem;
      font-weight: 500;
      color: #0F172A;
    }

    .summary-section {
      padding: 0.75rem 0;
    }

    .section-label {
      display: block;
      font-size: 0.875rem;
      color: #475569;
      margin-bottom: 0.5rem;
    }

    .items-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .item-row {
      display: flex;
      justify-content: space-between;
      padding: 0.5rem 0.75rem;
      background: #FFFFFF;
      border-radius: 0.5rem;
    }

    .item-row--package {
      border-left: 3px solid #DD6B20;
    }

    .item-name {
      font-size: 0.875rem;
      color: #0F172A;
    }

    .item-price {
      font-size: 0.875rem;
      font-weight: 600;
      color: #0F172A;
    }

    /* Price Breakdown */
    .price-breakdown {
      padding: 1rem;
      background: #FFFFFF;
      border-radius: 1rem;
      border: 1px solid #F1F5F9;
    }

    .price-row {
      display: flex;
      justify-content: space-between;
      padding: 0.5rem 0;
      font-size: 0.875rem;
      color: #475569;

      & + & {
        border-top: 1px solid #F1F5F9;
      }
    }

    .price-row--discount {
      color: #2F855A;
    }

    .price-row--total {
      padding-top: 0.75rem;
      margin-top: 0.5rem;
      border-top: 2px solid #E2E8F0;
      font-size: 1.125rem;
      font-weight: 700;
      color: #0F172A;
    }

    /* Payment Methods */
    .payment-methods {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .methods-title {
      font-size: 1rem;
      font-weight: 600;
      color: #0F172A;
      margin: 0;
    }

    .method-card {
      position: relative;
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem;
      background: #FFFFFF;
      border: 2px solid #E2E8F0;
      border-radius: 1rem;
      cursor: pointer;
      transition: all 150ms;
      text-align: left;

      &:hover {
        border-color: #4FD1C5;
      }
    }

    .method-card--selected {
      border-color: #319795;
      background: #E6FFFA;
    }

    .method-card__icon {
      width: 48px;
      height: 48px;
      border-radius: 0.75rem;
      background: #B2F5EA;
      color: #2C7A7B;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;

      svg {
        width: 24px;
        height: 24px;
      }
    }

    .method-card__icon--cod {
      background: #C6F6D5;
      color: #2F855A;
    }

    .method-card__content {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0.125rem;
    }

    .method-card__name {
      font-size: 1rem;
      font-weight: 600;
      color: #0F172A;
    }

    .method-card__desc {
      font-size: 0.875rem;
      color: #475569;
    }

    .method-card__check {
      width: 24px;
      height: 24px;
      border-radius: 9999px;
      background: #319795;
      color: #FFFFFF;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transform: scale(0.7);
      transition: all 150ms;

      svg {
        width: 14px;
        height: 14px;
      }
    }

    .method-card__check--visible {
      opacity: 1;
      transform: scale(1);
    }

    /* Step Actions */
    .step-actions {
      display: flex;
      justify-content: space-between;
      padding-top: 1rem;
      border-top: 1px solid #F1F5F9;
    }

    .btn-icon {
      width: 18px;
      height: 18px;
      margin-left: 0.5rem;
    }

    .btn-icon--left {
      margin-left: 0;
      margin-right: 0.5rem;
    }

    @media (prefers-reduced-motion: reduce) {
      .method-card,
      .method-card__check {
        transition: none;
      }
    }
  `]
})
export class PaymentStepNewComponent implements OnInit {
  back = output<void>();

  readonly store = inject(BookingWizardStore);
  private bookingApi = inject(BookingApiService);
  private paymentApi = inject(PaymentApiService);
  private router = inject(Router);

  /* State */
  selectedMethod = signal<'online' | 'cod'>('online');
  processing = signal(false);
  error = signal<string | null>(null);

  subtotal = computed(() => {
    const testsTotal = this.store.selectedTests().reduce((sum, t) => sum + t.price, 0);
    const packagesTotal = this.store.selectedPackages().reduce((sum, p) => sum + p.price, 0);
    return testsTotal + packagesTotal;
  });

  gstAmount = computed(() => Math.round(this.subtotal() * 0.18));

  totalAmount = computed(() => this.subtotal() + this.gstAmount());

  ngOnInit(): void {}

  selectMethod(method: 'online' | 'cod'): void {
    this.selectedMethod.set(method);
  }

  formatDate(dateStr: string | null): string {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }

  canProceed(): boolean {
    return !!this.selectedMethod();
  }

  placeOrder(): void {
    if (!this.canProceed()) return;

    this.processing.set(true);
    this.error.set(null);

    const test_ids: string[] = [];
    const package_ids: string[] = [];

    for (const test of this.store.selectedTests()) {
      test_ids.push(test.id);
    }

    for (const pkg of this.store.selectedPackages()) {
      package_ids.push(pkg.id);
    }

    const bookingData = {
      patient_id: this.store.patientId() || undefined,
      collection_type: this.store.collectionType(),
      time_slot_id: this.store.slotId(),
      booking_date: this.store.slotDate(),
      lab_branch_id: this.store.labBranchId() || undefined,
      pincode: this.store.pincode() || undefined,
      test_ids,
      package_ids
    };

    this.bookingApi.create(bookingData).subscribe({
      next: (booking) => {
        if (this.selectedMethod() === 'online') {
          this.initiatePayment(booking.id);
        } else {
          this.processing.set(false);
          this.store.reset();
          this.router.navigate(['/dashboard/bookings', booking.id], {
            queryParams: { success: true }
          });
        }
      },
      error: (err) => {
        console.error('Booking failed:', err);
        let errorMessage = 'Failed to create booking. Please try again.';
        if (err.error) {
          if (typeof err.error === 'string') {
            errorMessage = err.error;
          } else if (typeof err.error.detail === 'string') {
            errorMessage = err.error.detail;
          } else if (err.error.detail && typeof err.error.detail === 'object') {
            // Handle detail as an object (e.g., validation errors)
            if (Array.isArray(err.error.detail)) {
              errorMessage = err.error.detail.map((d: any) => d.msg || d.message || JSON.stringify(d)).join(', ');
            } else {
              errorMessage = err.error.detail.message || JSON.stringify(err.error.detail);
            }
          } else if (err.error.message) {
            errorMessage = err.error.message;
          }
        }
        this.error.set(errorMessage);
        this.processing.set(false);
      }
    });
  }

  private initiatePayment(bookingId: string): void {
    this.paymentApi.initiate(bookingId, 'online').subscribe({
      next: (payment) => {
        if (payment.payment_url) {
          window.location.href = payment.payment_url;
        } else {
          this.error.set('Payment initiation failed. Please try again.');
          this.processing.set(false);
        }
      },
      error: (err) => {
        console.error('Payment failed:', err);
        this.error.set('Payment initiation failed. Please try again.');
        this.processing.set(false);
      }
    });
  }
}
