import { Component, inject, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatStepperModule, MatStepper } from '@angular/material/stepper';
import { MatButtonModule } from '@angular/material/button';
import { BookingWizardStore } from '../../../core/store/booking-wizard.store';
import { PatientStepComponent } from '../steps/patient-step.component';
import { TestSelectionStepComponent } from '../steps/test-selection-step.component';
import { SlotSelectionStepComponent } from '../steps/slot-selection-step.component';
import { CollectionTypeStepComponent } from '../steps/collection-type-step.component';
import { PaymentStepComponent } from '../steps/payment-step.component';

@Component({
  selector: 'app-booking-wizard',
  standalone: true,
  imports: [
    CommonModule,
    MatStepperModule,
    MatButtonModule,
    PatientStepComponent,
    TestSelectionStepComponent,
    SlotSelectionStepComponent,
    CollectionTypeStepComponent,
    PaymentStepComponent,
  ],
  template: `
    <div class="wizard-container">
      <mat-stepper #stepper linear orientation="horizontal">

        <mat-step label="Patient" [completed]="!!store.patientId()">
          <app-patient-step (next)="stepper.next()" />
        </mat-step>

        <mat-step label="Tests" [completed]="store.selectedTests().length > 0">
          <app-test-selection-step
            (next)="stepper.next()"
            (back)="stepper.previous()" />
        </mat-step>

        <mat-step label="Slot" [completed]="!!store.slotId()">
          <app-slot-selection-step
            (next)="stepper.next()"
            (back)="stepper.previous()" />
        </mat-step>

        <mat-step label="Collection" [completed]="!!store.collectionType()">
          <app-collection-type-step
            (next)="stepper.next()"
            (back)="stepper.previous()" />
        </mat-step>

        <mat-step label="Payment">
          <app-payment-step (back)="stepper.previous()" />
        </mat-step>

      </mat-stepper>
    </div>
  `,
  styles: [`
    .wizard-container {
      max-width: 720px;
      margin: 2rem auto;
      padding: 0 1rem;
    }
  `],
})
export class BookingWizardComponent {
  @ViewChild('stepper') stepper!: MatStepper;
  readonly store = inject(BookingWizardStore);
}
