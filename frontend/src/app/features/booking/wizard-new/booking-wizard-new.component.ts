import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { BookingWizardStore } from '../../../core/store/booking-wizard.store';
import { StepperComponent } from '../../../shared/components';

/* Step components */
import { PatientStepNewComponent } from '../steps-new/patient-step-new.component';
import { TestSelectionStepNewComponent } from '../steps-new/test-selection-step-new.component';
import { CollectionTypeStepNewComponent } from '../steps-new/collection-type-step-new.component';
import { SlotSelectionStepNewComponent } from '../steps-new/slot-selection-step-new.component';
import { PaymentStepNewComponent } from '../steps-new/payment-step-new.component';

interface WizardStep {
  label: string;
  description: string;
  icon: string;
}

const WIZARD_STEPS: WizardStep[] = [
  { label: 'Patient', description: 'Who is this for?', icon: 'user' },
  { label: 'Tests', description: 'Select tests', icon: 'test' },
  { label: 'Collection', description: 'Home or lab', icon: 'location' },
  { label: 'Schedule', description: 'Pick a time', icon: 'calendar' },
  { label: 'Payment', description: 'Complete order', icon: 'payment' },
];

@Component({
  selector: 'app-booking-wizard-new',
  standalone: true,
  imports: [
    CommonModule,
    StepperComponent,
    PatientStepNewComponent,
    TestSelectionStepNewComponent,
    CollectionTypeStepNewComponent,
    SlotSelectionStepNewComponent,
    PaymentStepNewComponent
  ],
  template: `
    <div class="wizard">
      <!-- Progress Header -->
      <header class="wizard__header">
        <div class="wizard__header-inner">
          <div class="wizard__progress">
            <div class="wizard__progress-bar" [style.width.%]="progressPercent()"></div>
          </div>
          
          <div class="wizard__steps">
            @for (step of steps; track step.label; let i = $index) {
              <button 
                class="wizard__step"
                [class.wizard__step--active]="currentStep() === i"
                [class.wizard__step--completed]="currentStep() > i"
                [class.wizard__step--clickable]="currentStep() > i"
                (click)="goToStep(i)"
                [disabled]="currentStep() <= i"
              >
                <div class="wizard__step-indicator">
                  @if (currentStep() > i) {
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  } @else {
                    <span>{{ i + 1 }}</span>
                  }
                </div>
                <div class="wizard__step-content">
                  <span class="wizard__step-label">{{ step.label }}</span>
                  <span class="wizard__step-desc">{{ step.description }}</span>
                </div>
              </button>
              
              @if (i < steps.length - 1) {
                <div class="wizard__step-connector" [class.wizard__step-connector--completed]="currentStep() > i"></div>
              }
            }
          </div>
        </div>
      </header>

      <!-- Main Content -->
      <main class="wizard__main">
        <div class="wizard__container">
          <!-- Step Header -->
          <div class="wizard__step-header">
            <div class="wizard__step-badge">Step {{ currentStep() + 1 }} of {{ steps.length }}</div>
            <h1 class="wizard__step-title">{{ steps[currentStep()].label }}</h1>
            <p class="wizard__step-subtitle">{{ getStepDescription(currentStep()) }}</p>
          </div>

          <!-- Step Content -->
          <div class="wizard__content">
            @switch (currentStep()) {
              @case (0) {
                <app-patient-step-new (next)="nextStep()" />
              }
              @case (1) {
                <app-test-selection-step-new
                  [preselectedPackageId]="preselectedPackageId()"
                  [preselectedTestId]="preselectedTestId()"
                  (next)="nextStep()"
                  (back)="prevStep()"
                />
              }
              @case (2) {
                <app-collection-type-step-new (next)="nextStep()" (back)="prevStep()" />
              }
              @case (3) {
                <app-slot-selection-step-new (next)="nextStep()" (back)="prevStep()" />
              }
              @case (4) {
                <app-payment-step-new (back)="prevStep()" />
              }
            }
          </div>
        </div>

        <!-- Trust Badges -->
        <aside class="wizard__trust">
          <div class="trust-badge">
            <div class="trust-badge__icon trust-badge__icon--primary">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </div>
            <div class="trust-badge__content">
              <span class="trust-badge__title">NABL Accredited</span>
              <span class="trust-badge__desc">Quality assured testing</span>
            </div>
          </div>
          
          <div class="trust-badge">
            <div class="trust-badge__icon trust-badge__icon--success">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
            </div>
            <div class="trust-badge__content">
              <span class="trust-badge__title">Reports in 24 hrs</span>
              <span class="trust-badge__desc">Quick turnaround</span>
            </div>
          </div>
          
          <div class="trust-badge">
            <div class="trust-badge__icon trust-badge__icon--accent">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
            </div>
            <div class="trust-badge__content">
              <span class="trust-badge__title">Free Home Collection</span>
              <span class="trust-badge__desc">No extra charges</span>
            </div>
          </div>
        </aside>
      </main>
    </div>
  `,
  styles: [`
    .wizard {
      min-height: calc(100vh - 64px);
      background: linear-gradient(135deg, #E6FFFA 0%, #F8FAFC 50%, #FFFAF0 100%);
    }

    /* Header */
    .wizard__header {
      background: #FFFFFF;
      border-bottom: 1px solid #F1F5F9;
      padding: 1rem 1.5rem;
      position: sticky;
      top: 0;
      z-index: $z-index-sticky;
      box-shadow: 0 1px 3px 0 rgba(0,0,0,.1),0 1px 2px -1px rgba(0,0,0,.1);
    }

    .wizard__header-inner {
      max-width: 1000px;
      margin: 0 auto;
    }

    .wizard__progress {
      height: 4px;
      background: #E2E8F0;
      border-radius: 9999px;
      margin-bottom: 1rem;
      overflow: hidden;
    }

    .wizard__progress-bar {
      height: 100%;
      background: linear-gradient(90deg, #319795, #DD6B20);
      border-radius: 9999px;
      transition: width 300ms cubic-bezier(0.4,0,0.2,1);
    }

    .wizard__steps {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .wizard__step {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.5rem 0.75rem;
      background: transparent;
      border: none;
      border-radius: 0.75rem;
      cursor: default;
      transition: all 150ms;
      flex-shrink: 0;
    }

    .wizard__step--clickable {
      cursor: pointer;

      &:hover {
        background: #F8FAFC;
      }
    }

    .wizard__step-indicator {
      width: 36px;
      height: 36px;
      border-radius: 9999px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #F8FAFC;
      border: 2px solid #E2E8F0;
      font-size: 0.875rem;
      font-weight: 600;
      color: #475569;
      transition: all 150ms;
      flex-shrink: 0;

      svg {
        width: 16px;
        height: 16px;
      }
    }

    .wizard__step--active .wizard__step-indicator {
      background: #2C7A7B;
      border-color: #2C7A7B;
      color: #FFFFFF;
      box-shadow: 0 0 0 4px #B2F5EA;
    }

    .wizard__step--completed .wizard__step-indicator {
      background: #F0FFF4;
      border-color: #38A169;
      color: #2F855A;
    }

    .wizard__step-content {
      display: flex;
      flex-direction: column;
      text-align: left;

      @media (max-width: 768px) {
        display: none;
      }
    }

    .wizard__step-label {
      font-size: 0.875rem;
      font-weight: 600;
      color: #475569;
      transition: color 150ms;
    }

    .wizard__step--active .wizard__step-label {
      color: #285E61;
    }

    .wizard__step--completed .wizard__step-label {
      color: #276749;
    }

    .wizard__step-desc {
      font-size: 0.75rem;
      color: #94A3B8;
    }

    .wizard__step-connector {
      flex: 1;
      height: 2px;
      background: #E2E8F0;
      min-width: 20px;
      max-width: 60px;
      border-radius: 9999px;
      transition: background 200ms;

      @media (max-width: 1024px) {
        min-width: 12px;
        max-width: 24px;
      }
    }

    .wizard__step-connector--completed {
      background: #48BB78;
    }

    /* Main Content */
    .wizard__main {
      max-width: 1000px;
      margin: 0 auto;
      padding: 2rem 1.5rem;
      display: grid;
      grid-template-columns: 1fr 280px;
      gap: 2rem;

      @media (max-width: 1024px) {
        grid-template-columns: 1fr;
        padding: 1.5rem 1rem;
      }
    }

    .wizard__container {
      background: #FFFFFF;
      border-radius: 1.25rem;
      box-shadow: 0 10px 15px -3px rgba(0,0,0,.1),0 4px 6px -4px rgba(0,0,0,.1);
      border: 1px solid #F1F5F9;
      overflow: hidden;
    }

    .wizard__step-header {
      padding: 1.5rem;
      background: linear-gradient(135deg, #E6FFFA 0%, #FFFFFF 100%);
      border-bottom: 1px solid #F1F5F9;
    }

    .wizard__step-badge {
      display: inline-flex;
      padding: 0.25rem 0.75rem;
      background: #B2F5EA;
      color: #285E61;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.025em;
      margin-bottom: 0.75rem;
    }

    .wizard__step-title {
      font-family: 'Plus Jakarta Sans','Inter',-apple-system,sans-serif;
      font-size: 1.5rem;
      font-weight: 700;
      color: #0F172A;
      margin: 0 0 0.25rem 0;
    }

    .wizard__step-subtitle {
      font-size: 1rem;
      color: #475569;
      margin: 0;
    }

    .wizard__content {
      padding: 1.5rem;
    }

    /* Trust Badges */
    .wizard__trust {
      display: flex;
      flex-direction: column;
      gap: 1rem;

      @media (max-width: 1024px) {
        flex-direction: row;
        overflow-x: auto;
        padding-bottom: 0.5rem;
      }
    }

    .trust-badge {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      padding: 1rem;
      background: #FFFFFF;
      border-radius: 1rem;
      border: 1px solid #F1F5F9;

      @media (max-width: 1024px) {
        flex-shrink: 0;
        min-width: 200px;
      }
    }

    .trust-badge__icon {
      width: 40px;
      height: 40px;
      border-radius: 0.75rem;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;

      svg {
        width: 20px;
        height: 20px;
      }
    }

    .trust-badge__icon--primary {
      background: #E6FFFA;
      color: #2C7A7B;
    }

    .trust-badge__icon--success {
      background: #F0FFF4;
      color: #2F855A;
    }

    .trust-badge__icon--accent {
      background: #FFFAF0;
      color: #C05621;
    }

    .trust-badge__content {
      display: flex;
      flex-direction: column;
      gap: 0.125rem;
    }

    .trust-badge__title {
      font-size: 0.875rem;
      font-weight: 600;
      color: #0F172A;
    }

    .trust-badge__desc {
      font-size: 0.75rem;
      color: #475569;
    }

    /* Reduced Motion */
    @media (prefers-reduced-motion: reduce) {
      .wizard__progress-bar,
      .wizard__step,
      .wizard__step-indicator,
      .wizard__step-connector {
        transition: none;
      }
    }
  `]
})
export class BookingWizardNewComponent implements OnInit {
  readonly store = inject(BookingWizardStore);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  readonly steps = WIZARD_STEPS;
  currentStep = signal(0);
  preselectedPackageId = signal<string | null>(null);
  preselectedTestId = signal<string | null>(null);

  progressPercent = computed(() => 
    (this.currentStep() / (this.steps.length - 1)) * 100
  );

  ngOnInit(): void {
    this.store.reset();

    const pkgId = this.route.snapshot.queryParamMap.get('package_id');
    if (pkgId) this.preselectedPackageId.set(pkgId);
    
    const testId = this.route.snapshot.queryParamMap.get('test_id');
    if (testId) this.preselectedTestId.set(testId);
  }

  getStepDescription(step: number): string {
    const descriptions = [
      'Select who will be taking this diagnostic test',
      'Choose from our comprehensive range of tests and health packages',
      'Select home sample collection or visit our lab',
      'Pick a convenient date and time slot',
      'Review your order and complete the payment'
    ];
    return descriptions[step] || '';
  }

  nextStep(): void {
    if (this.currentStep() < this.steps.length - 1) {
      this.currentStep.update(s => s + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  prevStep(): void {
    if (this.currentStep() > 0) {
      this.currentStep.update(s => s - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  goToStep(step: number): void {
    if (step < this.currentStep()) {
      this.currentStep.set(step);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }
}
