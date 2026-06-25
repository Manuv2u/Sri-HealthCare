import { Component, inject, OnInit, output, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { BookingApiService } from '../../../core/api/services/booking-api.service';
import { PaymentApiService } from '../../../core/api/services/payment-api.service';
import { BookingWizardStore } from '../../../core/store/booking-wizard.store';
import { Booking, Payment } from '../../../core/api/api.types';

@Component({
  selector: 'app-payment-step',
  standalone: true,
  imports: [CommonModule, MatIconModule, FormsModule, RouterLink],
  template: `
    <!-- SUCCESS STATE -->
    @if (confirmed()) {
      <div class="success-screen">
        <!-- Decorative orbs -->
        <div class="orb orb-1"></div>
        <div class="orb orb-2"></div>
        <div class="orb orb-3"></div>

        <!-- Confetti dots -->
        @for (d of confettiDots; track d.id) {
          <div class="confetti-dot" [style]="d.style"></div>
        }

        <div class="success-content">
          <!-- Animated checkmark -->
          <div class="check-wrapper">
            <div class="check-ring check-ring-outer"></div>
            <div class="check-ring check-ring-inner"></div>
            <div class="check-circle">
              <svg class="check-svg" viewBox="0 0 52 52" fill="none">
                <circle cx="26" cy="26" r="25" stroke="#22C55E" stroke-width="2" opacity="0.2"/>
                <path class="check-path" d="M14 27l8 8 16-16" stroke="#22C55E" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
          </div>

          <div class="success-heading">Booking Confirmed!</div>
          <div class="success-subtext">
            Your appointment has been scheduled successfully.<br>
            A confirmation SMS will be sent shortly.
          </div>

          @if (bookingRef()) {
            <div class="booking-ref-chip">
              <span class="ref-label">Booking ID</span>
              <span class="ref-value">{{ bookingRef() }}</span>
            </div>
          }

          <div class="success-actions">
            @if (invoiceUrl()) {
              <a class="suc-btn suc-btn--primary" [href]="invoiceUrl()!" target="_blank">
                <mat-icon>download</mat-icon>
                Download Invoice
              </a>
            }
            <a class="suc-btn suc-btn--outline" routerLink="/dashboard">
              <mat-icon>receipt_long</mat-icon>
              View Bookings
            </a>
            <a class="suc-btn suc-btn--ghost" routerLink="/booking">
              <mat-icon>add_circle_outline</mat-icon>
              Book Another Test
            </a>
          </div>
        </div>
      </div>
    } @else {
      <!-- PAYMENT FORM STATE -->
      <div class="step-wrap">

        <!-- Header -->
        <div class="step-header">
          <div class="header-eyebrow">
            <span class="eyebrow-dot"></span>
            Final Step
          </div>
          <h2 class="step-title">Review &amp; Pay</h2>
          <p class="step-sub">Confirm your details before we lock in your appointment</p>
        </div>

        <!-- Cancellation notice -->
        @if (cancellationFee()) {
          <div class="cancel-notice">
            <div class="cancel-icon-wrap">
              <mat-icon>info</mat-icon>
            </div>
            <div class="cancel-text">
              <strong>Cancellation Policy</strong>
              @if (cancellationFee()!.charge_type === 'fixed') {
                &nbsp;— A fee of <strong>₹{{ cancellationFee()!.charge_value }}</strong> applies if you cancel this booking.
              } @else {
                &nbsp;— A fee of <strong>{{ cancellationFee()!.charge_value }}%</strong> of the total applies on cancellation.
              }
            </div>
          </div>
        }

        <!-- Two-column layout -->
        <div class="payment-layout">

          <!-- LEFT: Order Summary -->
          <div class="order-summary-card">
            <div class="card-header">
              <mat-icon class="card-header-icon">receipt_long</mat-icon>
              <span>Order Summary</span>
            </div>

            <div class="receipt-body">
              <!-- Tests -->
              @if (store.selectedTests().length > 0) {
                <div class="receipt-section-label">Diagnostic Tests</div>
                @for (t of store.selectedTests(); track t.id) {
                  <div class="receipt-row">
                    <div class="receipt-item-name">
                      <div class="item-dot"></div>
                      {{ t.name }}
                    </div>
                    <div class="receipt-item-price">₹{{ t.price }}</div>
                  </div>
                }
              }

              <!-- Packages -->
              @if (store.selectedPackages().length > 0) {
                <div class="receipt-section-label" [style.margin-top]="store.selectedTests().length > 0 ? '0.75rem' : '0'">Health Packages</div>
                @for (p of store.selectedPackages(); track p.id) {
                  <div class="receipt-row">
                    <div class="receipt-item-name">
                      <div class="item-dot item-dot--pkg"></div>
                      {{ p.name }}
                    </div>
                    <div class="receipt-item-price">₹{{ p.price }}</div>
                  </div>
                }
              }

              <!-- Subtotal divider -->
              <div class="receipt-divider"></div>

              <!-- Appointment details strip -->
              <div class="appointment-strip">
                @if (store.patientName()) {
                  <div class="appt-detail">
                    <mat-icon>person_outline</mat-icon>
                    <span>{{ store.patientName() }}</span>
                  </div>
                }
                <div class="appt-detail">
                  <mat-icon>local_hospital</mat-icon>
                  <span>Visit Lab</span>
                </div>
                @if (store.slotDate()) {
                  <div class="appt-detail">
                    <mat-icon>calendar_today</mat-icon>
                    <span>{{ store.slotDate() }}</span>
                  </div>
                }
              </div>

              <div class="receipt-divider"></div>

              <!-- Total -->
              <div class="receipt-total-row">
                <span class="total-label">Total Amount</span>
                <span class="total-amount">₹{{ grandTotal() }}</span>
              </div>
            </div>
          </div>

          <!-- RIGHT: Payment Method -->
          <div class="payment-card">
            <div class="card-header">
              <mat-icon class="card-header-icon">lock_outline</mat-icon>
              <span>Payment Method</span>
            </div>

            <div class="payment-options">
              @for (opt of paymentOptions; track opt.value) {
                <label
                  class="pay-option"
                  [class.pay-option--selected]="paymentMethod === opt.value"
                  (click)="paymentMethod = opt.value"
                >
                  <input type="radio" name="payment" [value]="opt.value" [(ngModel)]="paymentMethod" />
                  <div class="pay-option-icon" [class.pay-option-icon--selected]="paymentMethod === opt.value">
                    <mat-icon>{{ opt.icon }}</mat-icon>
                  </div>
                  <div class="pay-option-text">
                    <div class="pay-option-name">{{ opt.label }}</div>
                    <div class="pay-option-desc">{{ opt.desc }}</div>
                  </div>
                  <div class="pay-option-check" [class.pay-option-check--visible]="paymentMethod === opt.value">
                    <mat-icon>check_circle</mat-icon>
                  </div>
                </label>
              }
            </div>

            <!-- Secure payment badge -->
            <div class="secure-badge">
              <mat-icon>shield</mat-icon>
              <span>256-bit SSL encrypted · 100% secure</span>
            </div>

            <!-- Error -->
            @if (error()) {
              <div class="error-box">
                <mat-icon>error_outline</mat-icon>
                <span>{{ error() }}</span>
              </div>
            }

            <!-- Actions -->
            <div class="action-row">
              <button class="btn-back" (click)="back.emit()" [disabled]="loading()">
                <mat-icon>arrow_back</mat-icon>
                Back
              </button>
              <button
                class="btn-pay"
                [class.btn-pay--loading]="loading()"
                [disabled]="!paymentMethod || loading()"
                (click)="confirmAndPay()"
              >
                @if (loading()) {
                  <span class="btn-spinner"></span>
                  Processing...
                } @else {
                  <mat-icon>lock</mat-icon>
                  Confirm &amp; Pay ₹{{ grandTotal() }}
                }
              </button>
            </div>
          </div>

        </div>
      </div>
    }
  `,
  styles: [`
    /* ─── TOKENS ─────────────────────────────────────────────── */
    :host {
      --indigo:       #6366F1;
      --indigo-dk:    #4F46E5;
      --indigo-lt:    #EEF2FF;
      --indigo-mid:   #C7D2FE;
      --orange:       #F97316;
      --orange-dk:    #EA580C;
      --orange-lt:    #FFF7ED;
      --success:      #22C55E;
      --success-lt:   #DCFCE7;
      --warning:      #F59E0B;
      --warning-lt:   #FFFBEB;
      --error:        #EF4444;
      --error-lt:     #FEF2F2;
      --bg:           #F8F9FF;
      --surface:      #FFFFFF;
      --text:         #0F172A;
      --text-sec:     #475569;
      --muted:        #94A3B8;
      --border:       #E2E8F0;
      --radius:       12px;
      --radius-lg:    16px;
      --radius-xl:    20px;
      --radius-pill:  999px;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }

    /* ─── STEP WRAPPER ────────────────────────────────────────── */
    .step-wrap {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    /* ─── HEADER ──────────────────────────────────────────────── */
    .step-header {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }

    .header-eyebrow {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      font-size: 0.7rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--indigo);
    }

    .eyebrow-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--orange);
    }

    .step-title {
      font-size: 1.35rem;
      font-weight: 800;
      color: var(--text);
      margin: 0;
      line-height: 1.2;
    }

    .step-sub {
      font-size: 0.8rem;
      color: var(--text-sec);
      margin: 0;
    }

    /* ─── CANCELLATION NOTICE ─────────────────────────────────── */
    .cancel-notice {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      padding: 0.75rem 1rem;
      background: var(--warning-lt);
      border: 1px solid #FDE68A;
      border-radius: var(--radius);
    }

    .cancel-icon-wrap {
      flex-shrink: 0;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: #FEF3C7;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--warning);

      mat-icon {
        font-size: 1rem;
        width: 1rem;
        height: 1rem;
      }
    }

    .cancel-text {
      font-size: 0.8rem;
      color: #92400E;
      line-height: 1.5;
      padding-top: 0.3rem;
    }

    /* ─── TWO-COLUMN LAYOUT ───────────────────────────────────── */
    .payment-layout {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
      align-items: start;
    }

    @media (max-width: 640px) {
      .payment-layout {
        grid-template-columns: 1fr;
      }
    }

    /* ─── SHARED CARD STYLES ──────────────────────────────────── */
    .order-summary-card,
    .payment-card {
      background: var(--surface);
      border: 1.5px solid var(--border);
      border-radius: var(--radius-lg);
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(15, 23, 42, 0.06), 0 1px 2px rgba(15, 23, 42, 0.04);
    }

    .card-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.85rem 1.1rem;
      background: var(--indigo-lt);
      border-bottom: 1.5px solid var(--indigo-mid);
      font-size: 0.8rem;
      font-weight: 700;
      color: var(--indigo-dk);
      letter-spacing: 0.02em;
    }

    .card-header-icon {
      font-size: 1rem;
      width: 1rem;
      height: 1rem;
      color: var(--indigo);
    }

    /* ─── RECEIPT BODY ────────────────────────────────────────── */
    .receipt-body {
      padding: 1rem 1.1rem;
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }

    .receipt-section-label {
      font-size: 0.65rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--muted);
      margin-bottom: 0.1rem;
    }

    .receipt-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
    }

    .receipt-item-name {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.825rem;
      color: var(--text-sec);
      flex: 1;
      min-width: 0;
    }

    .item-dot {
      flex-shrink: 0;
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--indigo-mid);
    }

    .item-dot--pkg {
      background: #FBD38D;
    }

    .receipt-item-price {
      font-size: 0.825rem;
      font-weight: 600;
      color: var(--text);
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
    }

    .receipt-divider {
      border: none;
      border-top: 1px dashed var(--border);
      margin: 0.4rem 0;
    }

    /* ─── APPOINTMENT STRIP ───────────────────────────────────── */
    .appointment-strip {
      display: flex;
      flex-direction: column;
      gap: 0.3rem;
    }

    .appt-detail {
      display: flex;
      align-items: center;
      gap: 0.45rem;
      font-size: 0.775rem;
      color: var(--text-sec);

      mat-icon {
        font-size: 0.9rem;
        width: 0.9rem;
        height: 0.9rem;
        color: var(--muted);
        flex-shrink: 0;
      }
    }

    /* ─── RECEIPT TOTAL ───────────────────────────────────────── */
    .receipt-total-row {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      margin-top: 0.1rem;
    }

    .total-label {
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--text-sec);
    }

    .total-amount {
      font-size: 1.45rem;
      font-weight: 800;
      color: var(--orange);
      font-variant-numeric: tabular-nums;
      line-height: 1;
    }

    /* ─── PAYMENT OPTIONS ─────────────────────────────────────── */
    .payment-card {
      display: flex;
      flex-direction: column;
    }

    .payment-options {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      padding: 0.9rem 1rem 0.5rem;
    }

    .pay-option {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.8rem 0.9rem;
      border-radius: var(--radius);
      border: 1.5px solid var(--border);
      cursor: pointer;
      transition: border-color 0.18s ease, background 0.18s ease, box-shadow 0.18s ease;
      background: var(--surface);
      user-select: none;

      input[type=radio] {
        display: none;
      }

      &:hover {
        border-color: var(--indigo-mid);
        background: var(--indigo-lt);
      }
    }

    .pay-option--selected {
      border-color: var(--indigo) !important;
      background: var(--indigo-lt) !important;
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
    }

    .pay-option-icon {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #F1F5F9;
      color: var(--text-sec);
      flex-shrink: 0;
      transition: background 0.18s ease, color 0.18s ease;

      mat-icon {
        font-size: 1.1rem;
        width: 1.1rem;
        height: 1.1rem;
      }
    }

    .pay-option-icon--selected {
      background: var(--indigo);
      color: #fff;
    }

    .pay-option-text {
      flex: 1;
      min-width: 0;
    }

    .pay-option-name {
      font-size: 0.85rem;
      font-weight: 700;
      color: var(--text);
      line-height: 1.2;
    }

    .pay-option-desc {
      font-size: 0.725rem;
      color: var(--muted);
      margin-top: 0.05rem;
    }

    .pay-option-check {
      color: var(--indigo);
      opacity: 0;
      transition: opacity 0.18s ease, transform 0.18s ease;
      transform: scale(0.7);

      mat-icon {
        font-size: 1.2rem;
        width: 1.2rem;
        height: 1.2rem;
      }
    }

    .pay-option-check--visible {
      opacity: 1;
      transform: scale(1);
    }

    /* ─── SECURE BADGE ────────────────────────────────────────── */
    .secure-badge {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.35rem;
      font-size: 0.7rem;
      color: var(--muted);
      padding: 0.4rem 1rem 0.6rem;

      mat-icon {
        font-size: 0.85rem;
        width: 0.85rem;
        height: 0.85rem;
        color: var(--success);
      }
    }

    /* ─── ERROR BOX ───────────────────────────────────────────── */
    .error-box {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      margin: 0 1rem;
      padding: 0.7rem 0.9rem;
      background: var(--error-lt);
      border: 1px solid #FECACA;
      border-radius: var(--radius);
      font-size: 0.8rem;
      color: #B91C1C;

      mat-icon {
        font-size: 1rem;
        width: 1rem;
        height: 1rem;
        flex-shrink: 0;
      }
    }

    /* ─── ACTION ROW ──────────────────────────────────────────── */
    .action-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      padding: 0.75rem 1rem 1rem;
    }

    .btn-back {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      background: none;
      border: 1.5px solid var(--border);
      border-radius: var(--radius);
      padding: 0.55rem 1rem;
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--text-sec);
      cursor: pointer;
      transition: border-color 0.18s ease, color 0.18s ease;
      font-family: inherit;

      mat-icon {
        font-size: 1rem;
        width: 1rem;
        height: 1rem;
      }

      &:hover:not(:disabled) {
        border-color: var(--indigo);
        color: var(--indigo);
      }

      &:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }
    }

    .btn-pay {
      flex: 1;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.4rem;
      background: linear-gradient(135deg, var(--orange) 0%, var(--orange-dk) 100%);
      color: #fff;
      border: none;
      border-radius: var(--radius);
      padding: 0.7rem 1.25rem;
      font-size: 0.875rem;
      font-weight: 700;
      cursor: pointer;
      transition: opacity 0.18s ease, transform 0.18s ease, box-shadow 0.18s ease;
      font-family: inherit;
      white-space: nowrap;
      box-shadow: 0 4px 14px rgba(249, 115, 22, 0.35);

      mat-icon {
        font-size: 1rem;
        width: 1rem;
        height: 1rem;
      }

      &:hover:not(:disabled) {
        opacity: 0.92;
        transform: translateY(-1px);
        box-shadow: 0 6px 20px rgba(249, 115, 22, 0.4);
      }

      &:active:not(:disabled) {
        transform: translateY(0);
      }

      &:disabled {
        opacity: 0.45;
        cursor: not-allowed;
        box-shadow: none;
        transform: none;
      }
    }

    .btn-pay--loading {
      background: linear-gradient(135deg, #94A3B8 0%, #64748B 100%);
      box-shadow: none;
    }

    .btn-spinner {
      width: 15px;
      height: 15px;
      border: 2px solid rgba(255, 255, 255, 0.35);
      border-top-color: #fff;
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
      display: inline-block;
      flex-shrink: 0;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* ─── SUCCESS SCREEN ──────────────────────────────────────── */
    .success-screen {
      position: relative;
      min-height: 480px;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      border-radius: var(--radius-xl);
      background: linear-gradient(145deg, #F8F9FF 0%, #EEF2FF 50%, #F0FFF4 100%);
      padding: 2.5rem 1.5rem;
    }

    /* Decorative orbs */
    .orb {
      position: absolute;
      border-radius: 50%;
      pointer-events: none;
    }

    .orb-1 {
      width: 180px;
      height: 180px;
      top: -50px;
      right: -40px;
      background: radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%);
    }

    .orb-2 {
      width: 140px;
      height: 140px;
      bottom: -30px;
      left: -20px;
      background: radial-gradient(circle, rgba(34,197,94,0.12) 0%, transparent 70%);
    }

    .orb-3 {
      width: 100px;
      height: 100px;
      top: 40%;
      left: 5%;
      background: radial-gradient(circle, rgba(249,115,22,0.08) 0%, transparent 70%);
    }

    /* Confetti dots */
    .confetti-dot {
      position: absolute;
      border-radius: 50%;
      pointer-events: none;
      animation: confetti-fall 3s ease-in-out infinite;
    }

    @keyframes confetti-fall {
      0%   { transform: translateY(0) rotate(0deg); opacity: 0.8; }
      50%  { transform: translateY(-8px) rotate(180deg); opacity: 1; }
      100% { transform: translateY(0) rotate(360deg); opacity: 0.8; }
    }

    /* Success content */
    .success-content {
      position: relative;
      z-index: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
      text-align: center;
      max-width: 340px;
      width: 100%;
      animation: fade-up 0.5s ease forwards;
    }

    @keyframes fade-up {
      from { opacity: 0; transform: translateY(16px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    /* Checkmark */
    .check-wrapper {
      position: relative;
      width: 96px;
      height: 96px;
    }

    .check-ring {
      position: absolute;
      border-radius: 50%;
      border: 2px solid var(--success);
    }

    .check-ring-outer {
      inset: 0;
      opacity: 0.2;
      animation: ring-scale 0.6s ease forwards;
    }

    .check-ring-inner {
      inset: 8px;
      opacity: 0.4;
      animation: ring-scale 0.6s 0.1s ease forwards;
    }

    @keyframes ring-scale {
      from { transform: scale(0); opacity: 0; }
      to   { transform: scale(1); opacity: 0.2; }
    }

    .check-ring-inner {
      animation: ring-scale-inner 0.6s 0.1s ease forwards;
    }

    @keyframes ring-scale-inner {
      from { transform: scale(0); opacity: 0; }
      to   { transform: scale(1); opacity: 0.4; }
    }

    .check-circle {
      position: absolute;
      inset: 14px;
      background: var(--success-lt);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      animation: circle-pop 0.5s 0.2s cubic-bezier(0.34, 1.56, 0.64, 1) both;
    }

    @keyframes circle-pop {
      from { transform: scale(0); }
      to   { transform: scale(1); }
    }

    .check-svg {
      width: 44px;
      height: 44px;
    }

    .check-path {
      stroke-dasharray: 36;
      stroke-dashoffset: 36;
      animation: draw-check 0.4s 0.55s ease forwards;
    }

    @keyframes draw-check {
      to { stroke-dashoffset: 0; }
    }

    .success-heading {
      font-size: 1.6rem;
      font-weight: 800;
      color: var(--text);
      line-height: 1.15;
    }

    .success-subtext {
      font-size: 0.85rem;
      color: var(--text-sec);
      line-height: 1.65;
    }

    .booking-ref-chip {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      background: var(--surface);
      border: 1.5px solid var(--indigo-mid);
      border-radius: var(--radius-pill);
      padding: 0.4rem 1rem;
    }

    .ref-label {
      font-size: 0.7rem;
      font-weight: 600;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--muted);
    }

    .ref-value {
      font-size: 0.8rem;
      font-weight: 700;
      color: var(--indigo);
      font-variant-numeric: tabular-nums;
      letter-spacing: 0.04em;
    }

    /* Success action buttons */
    .success-actions {
      display: flex;
      flex-direction: column;
      gap: 0.55rem;
      width: 100%;
      margin-top: 0.25rem;
    }

    .suc-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.45rem;
      border-radius: var(--radius);
      padding: 0.7rem 1.5rem;
      font-size: 0.875rem;
      font-weight: 700;
      text-decoration: none;
      cursor: pointer;
      transition: opacity 0.18s ease, transform 0.18s ease, box-shadow 0.18s ease;
      font-family: inherit;
      border: none;
      width: 100%;

      mat-icon {
        font-size: 1rem;
        width: 1rem;
        height: 1rem;
      }

      &:hover {
        text-decoration: none;
        transform: translateY(-1px);
      }
    }

    .suc-btn--primary {
      background: linear-gradient(135deg, var(--indigo) 0%, var(--indigo-dk) 100%);
      color: #fff;
      box-shadow: 0 4px 14px rgba(99, 102, 241, 0.35);

      &:hover {
        opacity: 0.92;
        box-shadow: 0 6px 20px rgba(99, 102, 241, 0.4);
      }
    }

    .suc-btn--outline {
      background: var(--surface);
      color: var(--indigo);
      border: 1.5px solid var(--indigo-mid) !important;

      &:hover {
        background: var(--indigo-lt);
      }
    }

    .suc-btn--ghost {
      background: transparent;
      color: var(--text-sec);
      border: 1.5px solid var(--border) !important;

      &:hover {
        border-color: var(--indigo-mid) !important;
        color: var(--indigo);
      }
    }
  `],
})
export class PaymentStepComponent implements OnInit {
  back = output<void>();
  private bookingApi = inject(BookingApiService);
  private paymentApi = inject(PaymentApiService);
  private http = inject(HttpClient);
  private router = inject(Router);
  readonly store = inject(BookingWizardStore);

  paymentMethod = '';
  loading = signal(false);
  error = signal<string | null>(null);
  confirmed = signal(false);
  invoiceUrl = signal<string | null>(null);
  bookingRef = signal<string | null>(null);
  cancellationFee = signal<{ charge_type: string; charge_value: number } | null>(null);

  paymentOptions = [
    { value: 'upi',  label: 'UPI',          icon: 'account_balance_wallet', desc: 'GPay, PhonePe, Paytm & more' },
    { value: 'card', label: 'Credit / Debit Card', icon: 'credit_card',    desc: 'Visa, Mastercard, Rupay' },
    { value: 'cash', label: 'Cash on Visit', icon: 'payments',             desc: 'Pay at the lab counter' },
  ];

  // Confetti decoration dots
  confettiDots = Array.from({ length: 12 }, (_, i) => ({
    id: i,
    style: this.makeConfettiStyle(i),
  }));

  private makeConfettiStyle(i: number): string {
    const colors = ['#6366F1', '#F97316', '#22C55E', '#F59E0B', '#C7D2FE', '#FBD38D'];
    const sizes  = [6, 8, 5, 7, 9, 5];
    const color  = colors[i % colors.length];
    const size   = sizes[i % sizes.length];
    const left   = 5 + (i * 8.5) % 90;
    const top    = 5 + (i * 13) % 85;
    const delay  = (i * 0.25) % 3;
    return `width:${size}px;height:${size}px;background:${color};left:${left}%;top:${top}%;animation-delay:${delay}s;opacity:0.5;`;
  }

  ngOnInit(): void {
    this.http.get<{ charge_type: string; charge_value: number } | null>('/api/v1/admin/settings/cancellation').subscribe({
      next: (res) => this.cancellationFee.set(res),
      error: () => {},
    });
  }

  grandTotal = computed(() => {
    const s = this.store;
    const testSum = s.selectedTests().reduce((acc: number, t: { price: number }) => acc + t.price, 0);
    const pkgSum  = s.selectedPackages().reduce((acc: number, p: { price: number }) => acc + p.price, 0);
    return testSum + pkgSum;
  });

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
          next: (payment: any) => {
            this.loading.set(false);
            if (payment.payment_url && this.paymentMethod !== 'cash') {
              window.location.href = payment.payment_url;
            } else {
              this.bookingRef.set(booking.id ?? null);
              this.confirmed.set(true);
              this.invoiceUrl.set('/api/v1/payments/' + payment.payment_id + '/invoice');
            }
          },
          error: () => {
            this.error.set('Payment initiation failed. Please try again.');
            this.loading.set(false);
          },
        });
      },
      error: () => {
        this.error.set('Booking creation failed. Please check all details and try again.');
        this.loading.set(false);
      },
    });
  }
}
