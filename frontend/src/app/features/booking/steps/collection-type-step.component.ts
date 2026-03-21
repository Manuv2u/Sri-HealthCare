import { Component, inject, OnInit, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { LabBranchApiService } from '../../../core/api/services/lab-branch-api.service';
import { ServiceAreaApiService } from '../../../core/api/services/service-area-api.service';
import { UserApiService } from '../../../core/api/services/user-api.service';
import { BookingWizardStore } from '../../../core/store/booking-wizard.store';
import { LabBranch, ServiceArea, UserAddress, UserAddressListResponse } from '../../../core/api/api.types';

@Component({
  selector: 'app-collection-type-step',
  standalone: true,
  imports: [CommonModule, MatIconModule, FormsModule],
  template: `
    <div class="step-wrap">
      <div class="step-header">
        <h2>Collection Details</h2>
        <p>Choose how you'd like your sample collected</p>
      </div>

      <div class="collection-cards">
        <label class="collection-card" [class.selected]="collectionType === 'home'">
          <input type="radio" name="collection" value="home" [(ngModel)]="collectionType"
            (ngModelChange)="onCollectionTypeChange($event)" />
          <div class="cc-icon teal"><mat-icon>home</mat-icon></div>
          <div class="cc-body">
            <div class="cc-title">Home Collection</div>
            <div class="cc-desc">We come to you — sample collected at your doorstep</div>
          </div>
          <div class="cc-check" [class.visible]="collectionType === 'home'"><mat-icon>check_circle</mat-icon></div>
        </label>

        <label class="collection-card" [class.selected]="collectionType === 'lab'">
          <input type="radio" name="collection" value="lab" [(ngModel)]="collectionType"
            (ngModelChange)="onCollectionTypeChange($event)" />
          <div class="cc-icon blue"><mat-icon>local_hospital</mat-icon></div>
          <div class="cc-body">
            <div class="cc-title">Visit Lab</div>
            <div class="cc-desc">Visit one of our collection centres</div>
          </div>
          <div class="cc-check" [class.visible]="collectionType === 'lab'"><mat-icon>check_circle</mat-icon></div>
        </label>
      </div>

      @if (collectionType === 'home') {
        <div class="address-section">
          @if (loadingAddresses()) {
            <div class="skeleton-row"></div>
          } @else if (savedAddresses().length > 0 && !useManualEntry()) {
            <div class="saved-addresses">
              <label class="field-label">Select a delivery address</label>
              <div class="address-list">
                @for (addr of savedAddresses(); track addr.id) {
                  <label class="address-option" [class.selected]="selectedAddressId === addr.id">
                    <input type="radio" name="savedAddress" [value]="addr.id" [(ngModel)]="selectedAddressId"
                      (ngModelChange)="onAddressSelect($event)" />
                    <div class="addr-icon"><mat-icon>location_on</mat-icon></div>
                    <div class="addr-info">
                      <div class="addr-label">
                        {{ addr.label }}
                        @if (addr.is_default) { <span class="default-badge">Default</span> }
                      </div>
                      <div class="addr-line">{{ addr.address_line1 }}{{ addr.address_line2 ? ', ' + addr.address_line2 : '' }}</div>
                      <div class="addr-line">{{ addr.city }}, {{ addr.state }} – {{ addr.pincode }}</div>
                    </div>
                    <div class="addr-check" [class.visible]="selectedAddressId === addr.id">
                      <mat-icon>check_circle</mat-icon>
                    </div>
                  </label>
                }
                <button class="btn-manual" (click)="useManualEntry.set(true)">
                  <mat-icon>edit_location</mat-icon> Enter a different address
                </button>
              </div>
            </div>
          } @else {
            <div class="pincode-section">
              @if (savedAddresses().length > 0) {
                <button class="btn-back-saved" (click)="switchToSaved()">
                  <mat-icon>arrow_back</mat-icon> Use a saved address
                </button>
              }
              <label class="field-label">Enter your pincode to check availability</label>
              <div class="pincode-row">
                <div class="pincode-input" [class.valid]="pincodeValid()" [class.invalid]="!!pincodeError()">
                  <mat-icon>location_on</mat-icon>
                  <input [(ngModel)]="pincode" maxlength="6" placeholder="e.g. 600001" inputmode="numeric" />
                </div>
                <button class="btn-check" [disabled]="pincode.length !== 6 || checking()" (click)="validatePincode()">
                  @if (checking()) { <span class="spinner"></span> } @else { Check }
                </button>
              </div>
              @if (pincodeError()) {
                <div class="field-msg error"><mat-icon>cancel</mat-icon> {{ pincodeError() }}</div>
              }
              @if (pincodeValid()) {
                <div class="field-msg success"><mat-icon>check_circle</mat-icon> Home collection available at this pincode</div>
              }
            </div>
          }
        </div>
      }

      @if (collectionType === 'lab') {
        <div class="branch-section">
          <label class="field-label">Select a branch</label>
          @if (loadingBranches()) {
            <div class="branch-list">
              @for (i of [1,2,3]; track i) { <div class="skeleton-row"></div> }
            </div>
          } @else if (branches().length === 0) {
            <div class="empty-branches">No active branches found. Please contact us.</div>
          } @else {
            <div class="branch-list">
              @for (branch of branches(); track branch.id) {
                <label class="branch-option" [class.selected]="selectedBranchId === branch.id">
                  <input type="radio" name="branch" [value]="branch.id" [(ngModel)]="selectedBranchId" />
                  <div class="branch-icon"><mat-icon>location_on</mat-icon></div>
                  <div class="branch-info">
                    <div class="branch-name">{{ branch.name }}</div>
                    <div class="branch-addr">{{ branch.address }}</div>
                  </div>
                  <div class="branch-check" [class.visible]="selectedBranchId === branch.id">
                    <mat-icon>check_circle</mat-icon>
                  </div>
                </label>
              }
            </div>
          }
        </div>
      }

      <div class="step-actions">
        <button class="btn-back" (click)="back.emit()">
          <mat-icon>arrow_back</mat-icon> Back
        </button>
        <button class="btn-next" [disabled]="!canProceed()" (click)="onNext()">
          Continue <mat-icon>arrow_forward</mat-icon>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .step-wrap { display: flex; flex-direction: column; gap: 1.5rem; }
    .step-header h2 { font-size: 1.25rem; font-weight: 800; color: #1a202c; margin-bottom: .25rem; }
    .step-header p { font-size: .875rem; color: #718096; }
    .collection-cards { display: grid; grid-template-columns: 1fr 1fr; gap: .75rem; }
    .collection-card {
      display: flex; align-items: center; gap: 1rem;
      padding: 1rem 1.25rem; border-radius: 12px; border: 2px solid #e2e8f0;
      cursor: pointer; transition: all .15s; background: #fff;
      input[type=radio] { display: none; }
      &:hover { border-color: #00796b; background: #f0fdf9; }
      &.selected { border-color: #00796b; background: #f0fdf9; }
    }
    .cc-icon {
      width: 44px; height: 44px; border-radius: 12px; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      mat-icon { font-size: 1.3rem; width: 1.3rem; height: 1.3rem; }
      &.teal { background: #e0f2f1; mat-icon { color: #00796b; } }
      &.blue { background: #ebf8ff; mat-icon { color: #3182ce; } }
    }
    .cc-body { flex: 1; }
    .cc-title { font-size: .95rem; font-weight: 700; color: #1a202c; }
    .cc-desc { font-size: .8rem; color: #718096; margin-top: .15rem; }
    .cc-check { color: #00796b; opacity: 0; transition: opacity .15s;
      mat-icon { font-size: 1.2rem; width: 1.2rem; height: 1.2rem; }
      &.visible { opacity: 1; }
    }
    .address-section { display: flex; flex-direction: column; gap: .5rem; }
    .saved-addresses { display: flex; flex-direction: column; gap: .5rem; }
    .address-list { display: flex; flex-direction: column; gap: .5rem; }
    .address-option {
      display: flex; align-items: flex-start; gap: .75rem;
      padding: .85rem 1rem; border-radius: 10px; border: 2px solid #e2e8f0;
      cursor: pointer; transition: all .15s; background: #fff;
      input[type=radio] { display: none; }
      &:hover { border-color: #00796b; background: #f0fdf9; }
      &.selected { border-color: #00796b; background: #f0fdf9; }
    }
    .addr-icon { color: #718096; padding-top: .1rem; mat-icon { font-size: 1.1rem; width: 1.1rem; height: 1.1rem; } }
    .addr-info { flex: 1; }
    .addr-label { font-size: .875rem; font-weight: 700; color: #1a202c; display: flex; align-items: center; gap: .4rem; }
    .addr-line { font-size: .78rem; color: #718096; margin-top: .1rem; }
    .default-badge {
      font-size: .65rem; font-weight: 700; background: #00796b; color: #fff;
      padding: .1rem .4rem; border-radius: 4px; text-transform: uppercase; letter-spacing: .04em;
    }
    .addr-check { color: #00796b; opacity: 0; transition: opacity .15s; padding-top: .1rem;
      mat-icon { font-size: 1.1rem; width: 1.1rem; height: 1.1rem; }
      &.visible { opacity: 1; }
    }
    .btn-manual {
      display: flex; align-items: center; gap: .4rem;
      background: none; border: 1.5px dashed #cbd5e0; border-radius: 10px;
      padding: .7rem 1rem; font-size: .85rem; font-weight: 600; color: #4a5568; cursor: pointer; transition: all .15s;
      mat-icon { font-size: 1rem; width: 1rem; height: 1rem; }
      &:hover { border-color: #00796b; color: #00796b; }
    }
    .btn-back-saved {
      display: inline-flex; align-items: center; gap: .3rem;
      background: none; border: none; color: #00796b; font-size: .85rem; font-weight: 600; cursor: pointer; padding: 0; margin-bottom: .25rem;
      mat-icon { font-size: .95rem; width: .95rem; height: .95rem; }
      &:hover { text-decoration: underline; }
    }
    .pincode-section { display: flex; flex-direction: column; gap: .5rem; }
    .field-label { font-size: .85rem; font-weight: 600; color: #4a5568; }
    .pincode-row { display: flex; gap: .75rem; }
    .pincode-input {
      display: flex; align-items: center; gap: .5rem; flex: 1;
      background: #fff; border: 1.5px solid #e2e8f0; border-radius: 10px; padding: .6rem .9rem;
      mat-icon { color: #a0aec0; font-size: 1.1rem; width: 1.1rem; height: 1.1rem; }
      input { flex: 1; border: none; outline: none; font-size: .95rem; color: #2d3748; background: transparent; }
      &.valid { border-color: #38a169; }
      &.invalid { border-color: #e53e3e; }
    }
    .btn-check {
      background: #00796b; color: #fff; border: none; border-radius: 10px;
      padding: .6rem 1.25rem; font-size: .875rem; font-weight: 600; cursor: pointer; white-space: nowrap;
      &:hover:not(:disabled) { background: #00695c; }
      &:disabled { opacity: .5; cursor: not-allowed; }
    }
    .spinner { width: 16px; height: 16px; border: 2px solid rgba(255,255,255,.4); border-top-color: #fff; border-radius: 50%; animation: spin .7s linear infinite; display: inline-block; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .field-msg { display: flex; align-items: center; gap: .4rem; font-size: .8rem; font-weight: 600;
      mat-icon { font-size: .95rem; width: .95rem; height: .95rem; }
      &.success { color: #276749; }
      &.error { color: #c53030; }
    }
    .branch-section { display: flex; flex-direction: column; gap: .5rem; }
    .branch-list { display: flex; flex-direction: column; gap: .5rem; max-height: 240px; overflow-y: auto; }
    .branch-option {
      display: flex; align-items: center; gap: .75rem;
      padding: .75rem 1rem; border-radius: 10px; border: 2px solid #e2e8f0;
      cursor: pointer; transition: all .15s; background: #fff;
      input[type=radio] { display: none; }
      &:hover { border-color: #00796b; background: #f0fdf9; }
      &.selected { border-color: #00796b; background: #f0fdf9; }
    }
    .branch-icon { color: #718096; mat-icon { font-size: 1.1rem; width: 1.1rem; height: 1.1rem; } }
    .branch-info { flex: 1; }
    .branch-name { font-size: .875rem; font-weight: 600; color: #1a202c; }
    .branch-addr { font-size: .78rem; color: #718096; margin-top: .1rem; }
    .branch-check { color: #00796b; opacity: 0; transition: opacity .15s;
      mat-icon { font-size: 1.1rem; width: 1.1rem; height: 1.1rem; }
      &.visible { opacity: 1; }
    }
    .empty-branches { text-align: center; color: #a0aec0; font-size: .875rem; padding: 1rem; }
    .skeleton-row { height: 60px; border-radius: 10px; background: linear-gradient(90deg,#f0f4f8 25%,#e2e8f0 50%,#f0f4f8 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; }
    @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
    .step-actions { display: flex; justify-content: space-between; align-items: center; padding-top: .5rem; }
    .btn-back {
      display: inline-flex; align-items: center; gap: .4rem;
      background: none; border: 1.5px solid #e2e8f0; border-radius: 10px;
      padding: .6rem 1.25rem; font-size: .875rem; font-weight: 600; color: #4a5568; cursor: pointer; transition: all .15s;
      mat-icon { font-size: 1rem; width: 1rem; height: 1rem; }
      &:hover { border-color: #00796b; color: #00796b; }
    }
    .btn-next {
      display: inline-flex; align-items: center; gap: .4rem;
      background: #00796b; color: #fff; border: none; border-radius: 10px;
      padding: .65rem 1.5rem; font-size: .9rem; font-weight: 700; cursor: pointer; transition: background .15s;
      mat-icon { font-size: 1rem; width: 1rem; height: 1rem; }
      &:hover:not(:disabled) { background: #00695c; }
      &:disabled { opacity: .5; cursor: not-allowed; }
    }
    @media (max-width: 480px) { .collection-cards { grid-template-columns: 1fr; } }
  `],
})
export class CollectionTypeStepComponent implements OnInit {
  next = output<void>();
  back = output<void>();

  private labBranchApi = inject(LabBranchApiService);
  private serviceAreaApi = inject(ServiceAreaApiService);
  private userApi = inject(UserApiService);
  readonly store = inject(BookingWizardStore);

  loadingBranches = signal(true);
  loadingAddresses = signal(false);
  checking = signal(false);
  branches = signal<LabBranch[]>([]);
  savedAddresses = signal<UserAddress[]>([]);
  pincodeError = signal<string | null>(null);
  pincodeValid = signal(false);
  useManualEntry = signal(false);

  collectionType: 'home' | 'lab' = (this.store.collectionType() as 'home' | 'lab') ?? 'lab';
  pincode = this.store.pincode() ?? '';
  selectedBranchId = this.store.labBranchId() ?? '';
  selectedAddressId = this.store.selectedAddressId() ?? '';

  ngOnInit(): void {
    this.labBranchApi.list().subscribe({
      next: (branches: LabBranch[]) => {
        this.branches.set(branches.filter((b: LabBranch) => b.is_active));
        this.loadingBranches.set(false);
        // Auto-select first branch if none selected
        if (!this.selectedBranchId && this.branches().length > 0) {
          this.selectedBranchId = this.branches()[0].id;
        }
      },
      error: () => this.loadingBranches.set(false),
    });

    if (this.collectionType === 'home') {
      this.loadSavedAddresses();
    }
  }

  onCollectionTypeChange(type: string): void {
    if (type === 'home') {
      this.loadSavedAddresses();
    }
  }

  loadSavedAddresses(): void {
    this.loadingAddresses.set(true);
    this.userApi.getAddresses().subscribe({
      next: (res: UserAddressListResponse) => {
        const addresses = res.items;
        this.savedAddresses.set(addresses);
        this.loadingAddresses.set(false);
        if (addresses.length === 0) {
          this.useManualEntry.set(true);
        } else {
          const defaultAddr = addresses.find((a: UserAddress) => a.is_default) ?? addresses[0];
          this.selectedAddressId = defaultAddr.id;
          this.pincode = defaultAddr.pincode;
          this.pincodeValid.set(true);
        }
      },
      error: () => {
        this.loadingAddresses.set(false);
        this.useManualEntry.set(true);
      },
    });
  }

  onAddressSelect(addressId: string): void {
    const addr = this.savedAddresses().find((a: UserAddress) => a.id === addressId);
    if (addr) {
      this.pincode = addr.pincode;
      this.pincodeValid.set(true);
      this.pincodeError.set(null);
    }
  }

  switchToSaved(): void {
    this.useManualEntry.set(false);
    this.pincodeValid.set(false);
    this.pincodeError.set(null);
    this.pincode = '';
    const defaultAddr = this.savedAddresses().find((a: UserAddress) => a.is_default) ?? this.savedAddresses()[0];
    if (defaultAddr) {
      this.selectedAddressId = defaultAddr.id;
      this.pincode = defaultAddr.pincode;
      this.pincodeValid.set(true);
    }
  }

  validatePincode(): void {
    this.pincodeError.set(null);
    this.pincodeValid.set(false);
    this.checking.set(true);
    this.serviceAreaApi.list().subscribe({
      next: (areas: ServiceArea[]) => {
        this.checking.set(false);
        const match = areas.find((a) => a.pincode === this.pincode && a.is_active);
        if (match) {
          this.pincodeValid.set(true);
        } else {
          this.pincodeError.set('Home collection is not available at this pincode.');
        }
      },
      error: () => {
        this.checking.set(false);
        this.pincodeError.set('Could not verify pincode. Please try again.');
      },
    });
  }

  canProceed(): boolean {
    if (this.collectionType === 'home') {
      if (!this.useManualEntry() && this.savedAddresses().length > 0) {
        return !!this.selectedAddressId;
      }
      return this.pincodeValid();
    }
    return !!this.selectedBranchId;
  }

  onNext(): void {
    const usingSaved = this.collectionType === 'home' && !this.useManualEntry() && this.savedAddresses().length > 0;
    this.store.patch({
      collectionType: this.collectionType,
      pincode: this.collectionType === 'home' ? this.pincode : null,
      labBranchId: this.collectionType === 'lab' ? this.selectedBranchId : null,
      selectedAddressId: usingSaved ? this.selectedAddressId : null,
    });
    this.next.emit();
  }
}
