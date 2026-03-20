import { Component, inject, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatRadioModule } from '@angular/material/radio';
import { FormsModule } from '@angular/forms';
import { BookingApiService } from '../../../core/api/services/booking-api.service';
import { PaymentApiService } from '../../../core/api/services/payment-api.service';
import { BookingWizardStore } from '../../../core/store/booking-wizard.store';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner.component';
import { ErrorBannerComponent } from '../../../shared/components/error-banner.component';
import { Booking, Payment } from '../../../core/api/api.types';

@Component({
  selector: 'app-payment-step',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatRadioModule, FormsModule, LoadingSpinnerComponent, ErrorBannerComponent],
  template: `
    <div class="step-container">
      <h2>Payment</h2>

      @if (invoiceUrl()) {
        <div class="success-section">
          <p class="success-msg">✓ Booking confirmed!</p>
          <a [href]="invoiceUrl()!" target="_blank" mat-stroked-button>Download Invoice</a>
        </div>
      } @else {
        <mat-radio-group [(ngModel)]="paymentMethod" class="radio-group">
          <mat-radio-button value="upi">UPI</mat-radio-button>
          <mat-radio-button value="card">Card</mat-radio-button>
          <mat-radio-button value="cash">Cash on Visit</mat-radio-button>
        </mat-radio-group>

        @if (error()) {
          <app-error-banner [message]="error()!" />
        }

        @if (loading()) {
          <app-loading-spinner />
        }

        <div class="actions">
          <button mat-stroked-button (click)="back.emit()" [disabled]="loading()">Back</button>
          <button mat-flat-button color="primary"
            [disabled]="!paymentMethod || loading()"
            (click)="confirmAndPay()">
            Confirm & Pay
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    .step-container { padding: 1rem; }
    .radio-group { display: flex; flex-direction: column; gap: 0.75rem; margin: 1rem 0; }
    .actions { display: flex; gap: 1rem; margin-top: 1.5rem; }
    .success-section { display: flex; flex-direction: column; gap: 1rem; align-items: flex-start; }
    .success-msg { color: #2e7d32; font-size: 1.1rem; font-weight: 500; }
  `],
})
export class PaymentStepComponent {
  back = output<void>();

  private bookingApi = inject(BookingApiService);
  private paymentApi = inject(PaymentApiService);
  readonly store = inject(BookingWizardStore);

  paymentMethod = '';
  loading = signal(false);
  error = signal<string | null>(null);
  invoiceUrl = signal<string | null>(null);

  confirmAndPay(): void {
    this.loading.set(true);
    this.error.set(null);

    const s = this.store;
    const payload = {
      patient_id: s.patientId(),
      test_ids: s.selectedTests().map((t: { id: string; name: string; price: number }) => t.id),
      slot_id: s.slotId(),
      booking_date: s.slotDate(),
      collection_type: s.collectionType(),
      pincode: s.pincode(),
      lab_branch_id: s.labBranchId(),
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
              this.invoiceUrl.set(`/payments/${payment.payment_id}/invoice`);
            }
          },
          error: () => {
            this.error.set('Payment initiation failed. Please try again.');
            this.loading.set(false);
          },
        });
      },
      error: () => {
        this.error.set('Booking creation failed. Please try again.');
        this.loading.set(false);
      },
    });
  }
}
