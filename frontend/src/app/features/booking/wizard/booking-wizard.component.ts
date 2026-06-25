import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute } from '@angular/router';
import { BookingWizardStore } from '../../../core/store/booking-wizard.store';
import { PatientStepComponent } from '../steps/patient-step.component';
import { TestSelectionStepComponent } from '../steps/test-selection-step.component';
import { SlotSelectionStepComponent } from '../steps/slot-selection-step.component';
import { CollectionTypeStepComponent } from '../steps/collection-type-step.component';
import { PaymentStepComponent } from '../steps/payment-step.component';

const STEPS = [
  { label: 'Patient',    icon: 'person_outline',   subtitle: 'Who is this booking for?' },
  { label: 'Tests',      icon: 'biotech',           subtitle: 'Select tests or health packages' },
  { label: 'Collection', icon: 'home_work',         subtitle: 'Choose home visit or walk-in' },
  { label: 'Slot',       icon: 'schedule',          subtitle: 'Pick a convenient date & time' },
  { label: 'Payment',    icon: 'payments',          subtitle: 'Review order and complete payment' },
];

@Component({
  selector: 'app-booking-wizard',
  standalone: true,
  imports: [
    CommonModule, MatIconModule,
    PatientStepComponent, TestSelectionStepComponent,
    SlotSelectionStepComponent, CollectionTypeStepComponent, PaymentStepComponent,
  ],
  template: `
    <div class="wizard-page">

      <!-- Thin animated percentage bar -->
      <div class="pct-track">
        <div class="pct-fill" [style.width.%]="progressPct()"></div>
      </div>

      <!-- Sticky step progress header -->
      <div class="wizard-header">
        <div class="header-inner">
          <div class="steps-row">
            @for (step of steps; track step.label; let i = $index) {
              <div class="step-node"
                   [class.is-active]="currentStep() === i"
                   [class.is-done]="currentStep() > i">
                <div class="node-circle">
                  @if (currentStep() > i) {
                    <svg class="check-icon" viewBox="0 0 16 16" fill="none">
                      <path d="M3 8.5l3.5 3.5 6.5-7" stroke="currentColor" stroke-width="2"
                            stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                  } @else {
                    <span class="node-num">{{ i + 1 }}</span>
                  }
                </div>
                <span class="node-label">{{ step.label }}</span>
              </div>
              @if (i < steps.length - 1) {
                <div class="step-line" [class.is-done]="currentStep() > i"></div>
              }
            }
          </div>
        </div>
      </div>

      <!-- Main card -->
      <div class="wizard-body">
        <div class="wizard-card">

          <!-- Step heading -->
          <div class="step-heading">
            <div class="step-badge">Step {{ currentStep() + 1 }} of {{ steps.length }}</div>
            <h1 class="step-title">{{ steps[currentStep()].label }}</h1>
            <p class="step-sub">{{ steps[currentStep()].subtitle }}</p>
          </div>

          <div class="step-divider"></div>

          <!-- Step content -->
          <div class="step-content">
            @switch (currentStep()) {
              @case (0) {
                <app-patient-step (next)="next()" />
              }
              @case (1) {
                <app-test-selection-step
                  [preselectedPackageId]="preselectedPackageId()"
                  [preselectedTestId]="preselectedTestId()"
                  (next)="next()" (back)="prev()" />
              }
              @case (2) {
                <app-collection-type-step (next)="next()" (back)="prev()" />
              }
              @case (3) {
                <app-slot-selection-step (next)="next()" (back)="prev()" />
              }
              @case (4) {
                <app-payment-step (back)="prev()" />
              }
            }
          </div>

        </div>

        <!-- Trust strip -->
        <div class="trust-strip">
          <div class="trust-item">
            <svg viewBox="0 0 20 20" fill="none"><path d="M10 2L3 5v5c0 4.4 3 8.2 7 9 4-0.8 7-4.6 7-9V5l-7-3z" stroke="#6366F1" stroke-width="1.5" stroke-linejoin="round"/></svg>
            <span>NABL Accredited</span>
          </div>
          <div class="trust-sep"></div>
          <div class="trust-item">
            <svg viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="7.5" stroke="#6366F1" stroke-width="1.5"/><path d="M7 10l2 2 4-4" stroke="#6366F1" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
            <span>Reports in 24 hrs</span>
          </div>
          <div class="trust-sep"></div>
          <div class="trust-item">
            <svg viewBox="0 0 20 20" fill="none"><path d="M3 10h14M10 3l7 7-7 7" stroke="#6366F1" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
            <span>Free home collection</span>
          </div>
        </div>
      </div>

    </div>
  `,
  styles: [`
    :host {
      --c-primary:       #6366F1;
      --c-primary-dark:  #4F46E5;
      --c-primary-light: #EEF2FF;
      --c-accent:        #F97316;
      --c-accent-dark:   #EA580C;
      --c-success:       #22C55E;
      --c-bg:            #F8F9FF;
      --c-surface:       #FFFFFF;
      --c-text:          #0F172A;
      --c-text-2:        #475569;
      --c-muted:         #94A3B8;
      --c-border:        #E2E8F0;
      --r-default:       12px;
      --r-lg:            16px;
      --r-xl:            20px;
      --shadow-sm:       0 1px 3px rgba(15,23,42,.08), 0 1px 2px rgba(15,23,42,.04);
      --shadow-md:       0 4px 12px rgba(15,23,42,.08), 0 2px 4px rgba(15,23,42,.04);
      --shadow-lg:       0 10px 32px rgba(15,23,42,.10), 0 4px 8px rgba(15,23,42,.06);
      --shadow-indigo:   0 4px 24px rgba(99,102,241,.20);
    }

    /* ─── Page ──────────────────────────────────────────── */
    .wizard-page {
      min-height: calc(100vh - 68px);
      background: linear-gradient(155deg, #F0F1FF 0%, #F8F9FF 45%, #FFF7F2 100%);
      font-family: Inter, system-ui, -apple-system, sans-serif;
      color: var(--c-text);
    }

    /* ─── Percentage bar ─────────────────────────────────── */
    .pct-track {
      position: sticky;
      top: 0;
      z-index: 50;
      height: 3px;
      background: var(--c-border);
    }
    .pct-fill {
      height: 100%;
      background: linear-gradient(90deg, var(--c-primary), var(--c-accent));
      transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
      border-radius: 0 999px 999px 0;
    }

    /* ─── Header ─────────────────────────────────────────── */
    .wizard-header {
      background: var(--c-surface);
      border-bottom: 1px solid var(--c-border);
      box-shadow: var(--shadow-sm);
      padding: 1.25rem 1.5rem 1rem;
      position: sticky;
      top: 3px;
      z-index: 40;
    }
    .header-inner {
      max-width: 720px;
      margin: 0 auto;
    }

    /* ─── Step nodes row ─────────────────────────────────── */
    .steps-row {
      display: flex;
      align-items: center;
    }

    .step-node {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.35rem;
      flex-shrink: 0;
    }

    .node-circle {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      border: 2px solid var(--c-border);
      background: var(--c-surface);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: border-color 0.25s ease, background 0.25s ease, box-shadow 0.25s ease;
    }

    .node-num {
      font-size: 0.82rem;
      font-weight: 700;
      color: var(--c-muted);
      transition: color 0.25s ease;
      line-height: 1;
    }

    .check-icon {
      width: 14px;
      height: 14px;
      color: var(--c-success);
    }

    .node-label {
      font-size: 0.68rem;
      font-weight: 600;
      color: var(--c-muted);
      white-space: nowrap;
      letter-spacing: 0.02em;
      text-transform: uppercase;
      transition: color 0.25s ease;
    }

    /* Active state */
    .step-node.is-active .node-circle {
      border-color: var(--c-primary);
      background: var(--c-primary);
      box-shadow: 0 0 0 4px var(--c-primary-light), var(--shadow-indigo);
    }
    .step-node.is-active .node-num {
      color: #fff;
    }
    .step-node.is-active .node-label {
      color: var(--c-primary);
    }

    /* Done state */
    .step-node.is-done .node-circle {
      border-color: var(--c-success);
      background: #F0FDF4;
    }
    .step-node.is-done .node-label {
      color: #16A34A;
    }

    /* Connector line */
    .step-line {
      flex: 1;
      height: 2px;
      background: var(--c-border);
      margin: 0 0.5rem;
      margin-bottom: 1.5rem;
      border-radius: 999px;
      transition: background 0.4s ease;
      overflow: hidden;
      position: relative;
    }
    .step-line.is-done {
      background: linear-gradient(90deg, var(--c-success), #86EFAC);
    }

    /* ─── Body ───────────────────────────────────────────── */
    .wizard-body {
      max-width: 720px;
      margin: 2rem auto 4rem;
      padding: 0 1.25rem;
    }

    /* ─── Card ───────────────────────────────────────────── */
    .wizard-card {
      background: var(--c-surface);
      border-radius: var(--r-xl);
      border: 1px solid var(--c-border);
      box-shadow: var(--shadow-lg);
      overflow: hidden;
      animation: cardEnter 0.35s cubic-bezier(0.4, 0, 0.2, 1) both;
    }

    @keyframes cardEnter {
      from { opacity: 0; transform: translateY(12px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    /* ─── Step heading ───────────────────────────────────── */
    .step-heading {
      padding: 2rem 2rem 1.5rem;
      background: linear-gradient(135deg, var(--c-primary-light) 0%, #fff 60%);
      border-bottom: none;
    }

    .step-badge {
      display: inline-flex;
      align-items: center;
      padding: 0.25rem 0.75rem;
      border-radius: 999px;
      background: var(--c-primary-light);
      color: var(--c-primary);
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      margin-bottom: 0.75rem;
    }

    .step-title {
      font-size: 1.5rem;
      font-weight: 800;
      color: var(--c-text);
      line-height: 1.2;
      margin: 0 0 0.35rem;
      text-wrap: balance;
      letter-spacing: -0.02em;
    }

    .step-sub {
      font-size: 0.9rem;
      color: var(--c-text-2);
      margin: 0;
      line-height: 1.5;
    }

    /* ─── Divider ────────────────────────────────────────── */
    .step-divider {
      height: 1px;
      background: linear-gradient(90deg, var(--c-primary-light), var(--c-border) 50%, transparent);
      margin: 0;
    }

    /* ─── Step content ───────────────────────────────────── */
    .step-content {
      padding: 2rem;
    }

    /* ─── Trust strip ────────────────────────────────────── */
    .trust-strip {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0;
      margin-top: 1.5rem;
      padding: 0.9rem 1.25rem;
      background: rgba(255,255,255,0.7);
      backdrop-filter: blur(8px);
      border-radius: var(--r-lg);
      border: 1px solid rgba(99,102,241,0.1);
    }

    .trust-item {
      display: flex;
      align-items: center;
      gap: 0.45rem;
      flex: 1;
      justify-content: center;
    }
    .trust-item svg {
      width: 16px;
      height: 16px;
      flex-shrink: 0;
    }
    .trust-item span {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--c-text-2);
      white-space: nowrap;
    }
    .trust-sep {
      width: 1px;
      height: 24px;
      background: var(--c-border);
      flex-shrink: 0;
    }

    /* ─── Responsive ─────────────────────────────────────── */
    @media (max-width: 600px) {
      .node-label { display: none; }
      .wizard-body { padding: 0 0.75rem; margin-top: 1.25rem; }
      .step-heading { padding: 1.5rem 1.25rem 1.25rem; }
      .step-content { padding: 1.25rem; }
      .step-title { font-size: 1.25rem; }
      .trust-item span { display: none; }
      .trust-item svg { width: 20px; height: 20px; }
      .trust-strip { gap: 0; padding: 0.75rem; }
      .node-circle { width: 30px; height: 30px; }
    }

    @media (prefers-reduced-motion: reduce) {
      .pct-fill { transition: none; }
      .wizard-card { animation: none; }
      .node-circle, .node-label, .step-line { transition: none; }
    }
  `],
})
export class BookingWizardComponent implements OnInit {
  readonly store = inject(BookingWizardStore);
  private route = inject(ActivatedRoute);

  readonly steps = STEPS;
  currentStep = signal(0);
  preselectedPackageId = signal<string | null>(null);
  preselectedTestId = signal<string | null>(null);

  readonly progressPct = computed(() =>
    (this.currentStep() / (STEPS.length - 1)) * 100
  );

  ngOnInit(): void {
    // Reset wizard state on fresh load
    this.store.reset();

    // Read package_id / test_id from query params
    const pkgId = this.route.snapshot.queryParamMap.get('package_id');
    if (pkgId) this.preselectedPackageId.set(pkgId);
    const testId = this.route.snapshot.queryParamMap.get('test_id');
    if (testId) this.preselectedTestId.set(testId);
  }

  next(): void { if (this.currentStep() < STEPS.length - 1) this.currentStep.update(s => s + 1); }
  prev(): void { if (this.currentStep() > 0) this.currentStep.update(s => s - 1); }
}
