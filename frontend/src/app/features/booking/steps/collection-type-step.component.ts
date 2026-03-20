import { Component, inject, OnInit, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ServiceAreaApiService } from '../../../core/api/services/service-area-api.service';
import { BookingWizardStore } from '../../../core/store/booking-wizard.store';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner.component';
import { ErrorBannerComponent } from '../../../shared/components/error-banner.component';
import { FeatureFlag, LabBranch, ServiceArea } from '../../../core/api/api.types';

@Component({
  selector: 'app-collection-type-step',
  standalone: true,
  imports: [
    CommonModule, MatButtonModule, MatButtonToggleModule, MatFormFieldModule,
    MatInputModule, MatSelectModule, FormsModule, LoadingSpinnerComponent, ErrorBannerComponent,
  ],
  template: `
    <div class="step-container">
      <h2>Collection Details</h2>

      @if (loading()) {
        <app-loading-spinner />
      } @else {
        <mat-button-toggle-group [(ngModel)]="collectionType" class="toggle-group">
          <mat-button-toggle value="home" [disabled]="!homeCollectionEnabled()">
            Home Collection
            @if (!homeCollectionEnabled()) { <span class="disabled-note"> (Unavailable)</span> }
          </mat-button-toggle>
          <mat-button-toggle value="lab">Lab Visit</mat-button-toggle>
        </mat-button-toggle-group>

        @if (collectionType === 'home') {
          <mat-form-field appearance="outline" class="field">
            <mat-label>Pincode</mat-label>
            <input matInput [(ngModel)]="pincode" maxlength="6" placeholder="Enter your pincode" />
          </mat-form-field>
          @if (pincodeError()) {
            <app-error-banner [message]="pincodeError()!" />
          }
          @if (pincodeValid()) {
            <p class="success-msg">✓ Home collection available in your area.</p>
          }
          <button mat-stroked-button (click)="validatePincode()" [disabled]="pincode.length !== 6">
            Check Availability
          </button>
        }

        @if (collectionType === 'lab') {
          <mat-form-field appearance="outline" class="field">
            <mat-label>Select Branch</mat-label>
            <mat-select [(ngModel)]="selectedBranchId">
              @for (branch of branches(); track branch.id) {
                <mat-option [value]="branch.id">{{ branch.name }} — {{ branch.address }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
        }
      }

      <div class="actions">
        <button mat-stroked-button (click)="back.emit()">Back</button>
        <button mat-flat-button color="primary" [disabled]="!canProceed()" (click)="onNext()">
          Next
        </button>
      </div>
    </div>
  `,
  styles: [`
    .step-container { padding: 1rem; }
    .toggle-group { margin-bottom: 1rem; }
    .field { width: 100%; margin-top: 0.75rem; }
    .disabled-note { font-size: 0.75rem; color: #999; }
    .success-msg { color: #2e7d32; margin: 0.5rem 0; }
    .actions { display: flex; gap: 1rem; margin-top: 1.5rem; }
  `],
})
export class CollectionTypeStepComponent implements OnInit {
  next = output<void>();
  back = output<void>();

  private http = inject(HttpClient);
  private serviceAreaApi = inject(ServiceAreaApiService);
  readonly store = inject(BookingWizardStore);

  loading = signal(true);
  homeCollectionEnabled = signal(true);
  branches = signal<LabBranch[]>([]);
  pincodeError = signal<string | null>(null);
  pincodeValid = signal(false);

  collectionType = this.store.collectionType() ?? 'lab';
  pincode = this.store.pincode() ?? '';
  selectedBranchId = this.store.labBranchId() ?? '';

  ngOnInit(): void {
    this.http.get<FeatureFlag[]>('/feature-flags').subscribe({
      next: (flags: FeatureFlag[]) => {
        const flag = flags.find((f: FeatureFlag) => f.key === 'home_collection');
        this.homeCollectionEnabled.set(flag?.is_enabled ?? true);
        if (!this.homeCollectionEnabled() && this.collectionType === 'home') {
          this.collectionType = 'lab';
        }
      },
      error: () => {},
    });

    this.http.get<LabBranch[]>('/lab-branches').subscribe({
      next: (b: LabBranch[]) => {
        this.branches.set(b.filter((br: LabBranch) => br.is_active));
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  validatePincode(): void {
    this.pincodeError.set(null);
    this.pincodeValid.set(false);
    this.serviceAreaApi.list().subscribe({
      next: (areas: ServiceArea[]) => {
        const match = areas.find((a) => a.pincode === this.pincode && a.is_active);
        if (match) {
          this.pincodeValid.set(true);
        } else {
          this.pincodeError.set('Home collection is not available at this pincode.');
        }
      },
      error: () => this.pincodeError.set('Could not verify pincode. Please try again.'),
    });
  }

  canProceed(): boolean {
    if (this.collectionType === 'home') return this.pincodeValid();
    return !!this.selectedBranchId;
  }

  onNext(): void {
    (this.store as any).patchState({
      collectionType: this.collectionType as 'home' | 'lab',
      pincode: this.collectionType === 'home' ? this.pincode : null,
      labBranchId: this.collectionType === 'lab' ? this.selectedBranchId : null,
    });
    this.next.emit();
  }
}
