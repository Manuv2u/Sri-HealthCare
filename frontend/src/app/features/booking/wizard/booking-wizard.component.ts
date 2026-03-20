import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { BookingWizardStore } from '../../../core/store/booking-wizard.store';
import { PatientStepComponent } from '../steps/patient-step.component';
import { TestSelectionStepComponent } from '../steps/test-selection-step.component';
import { SlotSelectionStepComponent } from '../steps/slot-selection-step.component';
import { CollectionTypeStepComponent } from '../steps/collection-type-step.component';
import { PaymentStepComponent } from '../steps/payment-step.component';

const STEPS = [
  { label: 'Patient', icon: 'person' },
  { label: 'Tests', icon: 'biotech' },
  { label: 'Slot', icon: 'schedule' },
  { label: 'Collection', icon: 'home' },
  { label: 'Payment', icon: 'payment' },
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
      <!-- Progress bar -->
      <div class="wizard-progress">
        <div class="progress-inner">
          @for (step of steps; track step.label; let i = $index) {
            <div class="progress-step" [class.done]="currentStep() > i" [class.active]="currentStep() === i">
              <div class="step-circle">
                @if (currentStep() > i) { <mat-icon>check</mat-icon> }
                @else { <mat-icon>{{ step.icon }}</mat-icon> }
              </div>
              <span class="step-label">{{ step.label }}</span>
            </div>
            @if (i < steps.length - 1) {
              <div class="step-connector" [class.done]="currentStep() > i"></div>
            }
          }
        </div>
      </div>

      <!-- Step content -->
      <div class="wizard-body">
        <div class="wizard-card">
          @switch (currentStep()) {
            @case (0) { <app-patient-step (next)="next()" /> }
            @case (1) { <app-test-selection-step (next)="next()" (back)="prev()" /> }
            @case (2) { <app-slot-selection-step (next)="next()" (back)="prev()" /> }
            @case (3) { <app-collection-type-step (next)="next()" (back)="prev()" /> }
            @case (4) { <app-payment-step (back)="prev()" /> }
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .wizard-page { min-height: calc(100vh - 64px); background: #f7fafc; }

    /* Progress */
    .wizard-progress { background: #fff; border-bottom: 1px solid #e2e8f0; padding: 1.25rem 1.5rem; }
    .progress-inner {
      max-width: 680px; margin: 0 auto;
      display: flex; align-items: center;
    }
    .progress-step { display: flex; flex-direction: column; align-items: center; gap: .35rem; flex-shrink: 0; }
    .step-circle {
      width: 40px; height: 40px; border-radius: 50%; border: 2px solid #e2e8f0;
      background: #fff; display: flex; align-items: center; justify-content: center;
      color: #a0aec0; transition: all .2s;
      mat-icon { font-size: 1.1rem; width: 1.1rem; height: 1.1rem; }
    }
    .step-label { font-size: .72rem; font-weight: 600; color: #a0aec0; white-space: nowrap; transition: color .2s; }
    .progress-step.active .step-circle { border-color: #00796b; background: #00796b; color: #fff; }
    .progress-step.active .step-label { color: #00796b; }
    .progress-step.done .step-circle { border-color: #00796b; background: #e0f2f1; color: #00796b; }
    .progress-step.done .step-label { color: #00796b; }
    .step-connector { flex: 1; height: 2px; background: #e2e8f0; margin: 0 .5rem; margin-bottom: 1.4rem; transition: background .2s;
      &.done { background: #00796b; }
    }

    /* Body */
    .wizard-body { max-width: 680px; margin: 2rem auto; padding: 0 1.5rem 3rem; }
    .wizard-card { background: #fff; border-radius: 16px; border: 1px solid #e2e8f0; padding: 2rem; box-shadow: 0 2px 8px rgba(0,0,0,.06); }

    @media (max-width: 600px) {
      .step-label { display: none; }
      .wizard-body { padding: 0 1rem 2rem; }
      .wizard-card { padding: 1.25rem; }
    }
  `],
})
export class BookingWizardComponent {
  readonly store = inject(BookingWizardStore);
  readonly steps = STEPS;
  currentStep = signal(0);

  next(): void { if (this.currentStep() < STEPS.length - 1) this.currentStep.update(s => s + 1); }
  prev(): void { if (this.currentStep() > 0) this.currentStep.update(s => s - 1); }
}
