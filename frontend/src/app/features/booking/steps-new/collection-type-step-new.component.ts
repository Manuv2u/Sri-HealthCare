import { Component, inject, OnInit, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BookingWizardStore } from '../../../core/store/booking-wizard.store';
import { ServiceAreaApiService } from '../../../core/api/services/service-area-api.service';
import { LabBranchApiService } from '../../../core/api/services/lab-branch-api.service';
import { UserApiService } from '../../../core/api/services/user-api.service';
import { ServiceArea, LabBranch, UserAddress } from '../../../core/api/api.types';
import { ButtonComponent, SpinnerComponent, BadgeComponent } from '../../../shared/components';

type CollectionType = 'home' | 'lab';

@Component({
  selector: 'app-collection-type-step-new',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonComponent, SpinnerComponent, BadgeComponent],
  template: `
    <div class="collection-step">
      <!-- Collection Type Selection -->
      <div class="type-cards">
        <button 
          type="button"
          class="type-card"
          [class.type-card--selected]="collectionType() === 'home'"
          (click)="selectType('home')"
        >
          <div class="type-card__icon type-card__icon--home">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
          </div>
          <div class="type-card__content">
            <h3 class="type-card__title">Home Collection</h3>
            <p class="type-card__desc">Our trained phlebotomist will visit your home to collect samples</p>
            <ul class="type-card__features">
              <li>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                Convenient doorstep service
              </li>
              <li>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                Free of charge
              </li>
              <li>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                Same day reports
              </li>
            </ul>
          </div>
          <div class="type-card__badge">
            <app-badge variant="success" size="sm">Recommended</app-badge>
          </div>
          <div class="type-card__check" [class.type-card__check--visible]="collectionType() === 'home'">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
        </button>

        <button 
          type="button"
          class="type-card"
          [class.type-card--selected]="collectionType() === 'lab'"
          (click)="selectType('lab')"
        >
          <div class="type-card__icon type-card__icon--lab">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="4" y="2" width="16" height="20" rx="2" ry="2"/>
              <path d="M9 22v-4h6v4"/>
              <path d="M8 6h.01"/><path d="M16 6h.01"/>
              <path d="M12 6h.01"/>
              <path d="M12 10h.01"/>
              <path d="M12 14h.01"/>
              <path d="M16 10h.01"/>
              <path d="M16 14h.01"/>
              <path d="M8 10h.01"/>
              <path d="M8 14h.01"/>
            </svg>
          </div>
          <div class="type-card__content">
            <h3 class="type-card__title">Visit Lab</h3>
            <p class="type-card__desc">Visit one of our partner laboratories for sample collection</p>
            <ul class="type-card__features">
              <li>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                Walk-in anytime
              </li>
              <li>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                Multiple locations
              </li>
              <li>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                Priority processing
              </li>
            </ul>
          </div>
          <div class="type-card__check" [class.type-card__check--visible]="collectionType() === 'lab'">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
        </button>
      </div>

      <!-- Home Collection Details -->
      @if (collectionType() === 'home') {
        <div class="details-section">
          <h4 class="details-section__title">Select Delivery Address</h4>
          
          @if (loadingAddresses()) {
            <div class="loading-inline">
              <app-spinner size="sm" />
              <span>Loading addresses...</span>
            </div>
          } @else if (addresses().length === 0) {
            <div class="no-address">
              <p>No saved addresses found</p>
              <app-button variant="outline" size="sm" (click)="showAddAddress = true">Add Address</app-button>
            </div>
          } @else {
            <div class="address-list">
              @for (addr of addresses(); track addr.id) {
                <button 
                  type="button"
                  class="address-card"
                  [class.address-card--selected]="selectedAddressId() === addr.id"
                  (click)="selectAddress(addr)"
                >
                  <div class="address-card__header">
                    <span class="address-card__label">{{ addr.label }}</span>
                    @if (addr.is_default) {
                      <app-badge variant="info" size="sm">Default</app-badge>
                    }
                  </div>
                  <p class="address-card__text">
                    {{ addr.address_line1 }}
                    @if (addr.address_line2) {
                      , {{ addr.address_line2 }}
                    }
                  </p>
                  <p class="address-card__city">{{ addr.city }}, {{ addr.state }} - {{ addr.pincode }}</p>
                  <div class="address-card__check" [class.address-card__check--visible]="selectedAddressId() === addr.id">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  </div>
                </button>
              }
            </div>
          }
          
          @if (pincodeError()) {
            <div class="pincode-error">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {{ pincodeError() }}
            </div>
          }
        </div>
      }

      <!-- Lab Visit Details -->
      @if (collectionType() === 'lab') {
        <div class="details-section">
          <h4 class="details-section__title">Select Laboratory</h4>
          
          @if (loadingBranches()) {
            <div class="loading-inline">
              <app-spinner size="sm" />
              <span>Loading laboratories...</span>
            </div>
          } @else if (labBranches().length === 0) {
            <div class="no-labs">
              <p>No laboratories available in your area</p>
            </div>
          } @else {
            <div class="lab-list">
              @for (lab of labBranches(); track lab.id) {
                <button 
                  type="button"
                  class="lab-card"
                  [class.lab-card--selected]="selectedLabId() === lab.id"
                  (click)="selectLab(lab)"
                >
                  <div class="lab-card__icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect x="4" y="2" width="16" height="20" rx="2" ry="2"/>
                      <path d="M9 22v-4h6v4"/>
                    </svg>
                  </div>
                  <div class="lab-card__content">
                    <h5 class="lab-card__name">{{ lab.name }}</h5>
                    <p class="lab-card__address">{{ lab.address }}, {{ lab.city }} - {{ lab.pincode }}</p>
                    @if (lab.operating_hours) {
                      <span class="lab-card__hours">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                        </svg>
                        {{ lab.operating_hours }}
                      </span>
                    }
                  </div>
                  <div class="lab-card__check" [class.lab-card__check--visible]="selectedLabId() === lab.id">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  </div>
                </button>
              }
            </div>
          }
        </div>
      }

      <!-- Actions -->
      <div class="step-actions">
        <app-button variant="outline" size="lg" (click)="back.emit()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="btn-icon btn-icon--left">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Back
        </app-button>
        <app-button variant="primary" size="lg" [disabled]="!canProceed()" (click)="onNext()">
          Continue
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="btn-icon">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </app-button>
      </div>
    </div>
  `,
  styles: [`
    .collection-step {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    /* Type Cards */
    .type-cards {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 1rem;

      @media (max-width: 768px) {
        grid-template-columns: 1fr;
      }
    }

    .type-card {
      position: relative;
      display: flex;
      flex-direction: column;
      padding: 1.5rem;
      background: #FFFFFF;
      border: 2px solid #E2E8F0;
      border-radius: 1rem;
      text-align: left;
      cursor: pointer;
      transition: all 200ms cubic-bezier(0.4,0,0.2,1);

      &:hover {
        border-color: #4FD1C5;
        transform: translateY(-2px);
        box-shadow: 0 4px 6px -1px rgba(0,0,0,.1),0 2px 4px -2px rgba(0,0,0,.1);
      }
    }

    .type-card--selected {
      border-color: #319795;
      background: #E6FFFA;
      box-shadow: 0 4px 14px 0 rgba(49,151,149,.25);
    }

    .type-card__icon {
      width: 56px;
      height: 56px;
      border-radius: 1rem;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 1rem;

      svg {
        width: 28px;
        height: 28px;
      }
    }

    .type-card__icon--home {
      background: linear-gradient(135deg, #B2F5EA 0%, #81E6D9 100%);
      color: #285E61;
    }

    .type-card__icon--lab {
      background: linear-gradient(135deg, #C3DAFE 0%, #A3BFFA 100%);
      color: #434190;
    }

    .type-card__content {
      flex: 1;
    }

    .type-card__title {
      font-size: 1.125rem;
      font-weight: 700;
      color: #0F172A;
      margin: 0 0 0.5rem 0;
    }

    .type-card__desc {
      font-size: 0.875rem;
      color: #475569;
      margin: 0 0 1rem 0;
      line-height: 1.625;
    }

    .type-card__features {
      list-style: none;
      padding: 0;
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;

      li {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.875rem;
        color: #475569;

        svg {
          width: 16px;
          height: 16px;
          color: #38A169;
          flex-shrink: 0;
        }
      }
    }

    .type-card__badge {
      position: absolute;
      top: 1rem;
      right: 1rem;
    }

    .type-card__check {
      position: absolute;
      bottom: 1rem;
      right: 1rem;
      width: 32px;
      height: 32px;
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
        width: 18px;
        height: 18px;
      }
    }

    .type-card__check--visible {
      opacity: 1;
      transform: scale(1);
    }

    /* Details Section */
    .details-section {
      padding: 1.25rem;
      background: #F8FAFC;
      border-radius: 1rem;
      border: 1px solid #F1F5F9;
    }

    .details-section__title {
      font-size: 1rem;
      font-weight: 600;
      color: #0F172A;
      margin: 0 0 1rem 0;
    }

    .loading-inline {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 1rem;
      color: #475569;
    }

    .no-address,
    .no-labs {
      padding: 1.5rem;
      text-align: center;
      color: #475569;

      p {
        margin: 0 0 0.75rem 0;
      }
    }

    /* Address Cards */
    .address-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .address-card {
      position: relative;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      padding: 1rem;
      background: #FFFFFF;
      border: 2px solid #E2E8F0;
      border-radius: 0.75rem;
      text-align: left;
      cursor: pointer;
      transition: all 150ms;

      &:hover {
        border-color: #4FD1C5;
      }
    }

    .address-card--selected {
      border-color: #319795;
      background: #E6FFFA;
    }

    .address-card__header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .address-card__label {
      font-weight: 600;
      color: #0F172A;
    }

    .address-card__text {
      font-size: 0.875rem;
      color: #475569;
      margin: 0;
    }

    .address-card__city {
      font-size: 0.875rem;
      color: #94A3B8;
      margin: 0;
    }

    .address-card__check {
      position: absolute;
      top: 50%;
      right: 1rem;
      transform: translateY(-50%) scale(0.7);
      width: 24px;
      height: 24px;
      border-radius: 9999px;
      background: #319795;
      color: #FFFFFF;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: all 150ms;

      svg {
        width: 14px;
        height: 14px;
      }
    }

    .address-card__check--visible {
      opacity: 1;
      transform: translateY(-50%) scale(1);
    }

    .pincode-error {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem;
      margin-top: 1rem;
      background: #FEF2F2;
      color: #B91C1C;
      border-radius: 0.75rem;
      font-size: 0.875rem;

      svg {
        width: 18px;
        height: 18px;
        flex-shrink: 0;
      }
    }

    /* Lab Cards */
    .lab-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .lab-card {
      position: relative;
      display: flex;
      align-items: flex-start;
      gap: 1rem;
      padding: 1rem;
      background: #FFFFFF;
      border: 2px solid #E2E8F0;
      border-radius: 0.75rem;
      text-align: left;
      cursor: pointer;
      transition: all 150ms;

      &:hover {
        border-color: #4FD1C5;
      }
    }

    .lab-card--selected {
      border-color: #319795;
      background: #E6FFFA;
    }

    .lab-card__icon {
      width: 44px;
      height: 44px;
      border-radius: 0.75rem;
      background: #C3DAFE;
      color: #4C51BF;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;

      svg {
        width: 22px;
        height: 22px;
      }
    }

    .lab-card__content {
      flex: 1;
      min-width: 0;
    }

    .lab-card__name {
      font-size: 1rem;
      font-weight: 600;
      color: #0F172A;
      margin: 0 0 0.25rem 0;
    }

    .lab-card__address {
      font-size: 0.875rem;
      color: #475569;
      margin: 0 0 0.5rem 0;
    }

    .lab-card__hours {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      font-size: 0.75rem;
      color: #94A3B8;

      svg {
        width: 14px;
        height: 14px;
      }
    }

    .lab-card__check {
      position: absolute;
      top: 50%;
      right: 1rem;
      transform: translateY(-50%) scale(0.7);
      width: 24px;
      height: 24px;
      border-radius: 9999px;
      background: #319795;
      color: #FFFFFF;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: all 150ms;

      svg {
        width: 14px;
        height: 14px;
      }
    }

    .lab-card__check--visible {
      opacity: 1;
      transform: translateY(-50%) scale(1);
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
      .type-card,
      .type-card__check,
      .address-card,
      .address-card__check,
      .lab-card,
      .lab-card__check {
        transition: none;
      }

      .type-card:hover {
        transform: none;
      }
    }
  `]
})
export class CollectionTypeStepNewComponent implements OnInit {
  next = output<void>();
  back = output<void>();

  private serviceAreaApi = inject(ServiceAreaApiService);
  private labBranchApi = inject(LabBranchApiService);
  private userApi = inject(UserApiService);
  readonly store = inject(BookingWizardStore);

  /* State */
  collectionType = signal<CollectionType | null>(null);
  addresses = signal<UserAddress[]>([]);
  labBranches = signal<LabBranch[]>([]);
  serviceAreas = signal<ServiceArea[]>([]);
  selectedAddressId = signal<string | null>(null);
  selectedLabId = signal<string | null>(null);
  loadingAddresses = signal(false);
  loadingBranches = signal(false);
  pincodeError = signal<string | null>(null);
  showAddAddress = false;

  ngOnInit(): void {
    this.loadServiceAreas();
    this.loadLabBranches();
  }

  private loadServiceAreas(): void {
    this.serviceAreaApi.list().subscribe({
      next: (areas) => this.serviceAreas.set(areas.filter(s => s.is_active)),
      error: () => {}
    });
  }

  private loadLabBranches(): void {
    this.loadingBranches.set(true);
    this.labBranchApi.list().subscribe({
      next: (labs) => {
        this.labBranches.set(labs.filter(l => l.is_active));
        this.loadingBranches.set(false);
      },
      error: () => this.loadingBranches.set(false)
    });
  }

  selectType(type: CollectionType): void {
    this.collectionType.set(type);
    this.pincodeError.set(null);

    if (type === 'home') {
      this.selectedLabId.set(null);
      this.loadAddresses();
    } else {
      this.selectedAddressId.set(null);
    }
  }

  private loadAddresses(): void {
    this.loadingAddresses.set(true);
    this.userApi.getAddresses().subscribe({
      next: (res) => {
        this.addresses.set(res.items);
        /* Auto-select default address */
        const defaultAddr = res.items.find(a => a.is_default);
        if (defaultAddr) {
          this.selectAddress(defaultAddr);
        }
        this.loadingAddresses.set(false);
      },
      error: () => this.loadingAddresses.set(false)
    });
  }

  selectAddress(addr: UserAddress): void {
    this.selectedAddressId.set(addr.id);
    this.pincodeError.set(null);

    /* Check if pincode is serviceable */
    const isServiceable = this.serviceAreas().some(
      s => s.pincode === addr.pincode
    );

    if (!isServiceable) {
      this.pincodeError.set(
        `Home collection is not available for pincode ${addr.pincode}. Please select a different address or choose lab visit.`
      );
    }
  }

  selectLab(lab: LabBranch): void {
    this.selectedLabId.set(lab.id);
  }

  canProceed(): boolean {
    if (!this.collectionType()) return false;

    if (this.collectionType() === 'home') {
      return !!this.selectedAddressId() && !this.pincodeError();
    }

    return !!this.selectedLabId();
  }

  onNext(): void {
    if (!this.canProceed()) return;

    const selectedAddr = this.addresses().find(a => a.id === this.selectedAddressId());

    this.store.patch({
      collectionType: this.collectionType(),
      selectedAddressId: this.selectedAddressId(),
      pincode: selectedAddr?.pincode ?? null,
      labBranchId: this.selectedLabId()
    });

    this.next.emit();
  }
}
