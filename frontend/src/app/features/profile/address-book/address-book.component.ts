import { Component, OnInit, signal } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { UserApiService } from '../../../core/api/services/user-api.service';
import { UserAddress } from '../../../core/api/api.types';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner.component';
import { ErrorBannerComponent } from '../../../shared/components/error-banner.component';

@Component({
  selector: 'app-address-book',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatButtonModule, MatFormFieldModule, MatInputModule,
    MatCheckboxModule, MatSnackBarModule, MatIconModule,
    LoadingSpinnerComponent, ErrorBannerComponent,
  ],
  template: `
    <div class="page">
      <!-- Header -->
      <div class="page-header">
        <button class="back-btn" (click)="goBack()" aria-label="Go back">
          <mat-icon>arrow_back</mat-icon>
        </button>
        <div>
          <h1 class="page-title">Address Book</h1>
          <p class="page-sub">Your saved collection addresses</p>
        </div>
      </div>

      <!-- Body -->
      <div class="page-body">
        @if (loading()) {
          <app-loading-spinner />
        } @else if (error()) {
          <app-error-banner [message]="error()!" retryLabel="Retry" (retry)="load()" />
        } @else {

          @if (addresses().length === 0 && !showForm) {
            <div class="empty-state">
              <div class="empty-icon"><mat-icon>location_off</mat-icon></div>
              <h3>No saved addresses</h3>
              <p>Add an address to speed up home-collection bookings.</p>
              <button mat-flat-button color="primary" (click)="toggleForm()">
                <mat-icon>add</mat-icon> Add Address
              </button>
            </div>
          } @else {
            <div class="address-list">
              @for (a of addresses(); track a.id) {
                <div class="address-card" [class.default-card]="a.is_default">
                  <div class="card-top">
                    <div class="card-label-row">
                      <span class="addr-label">{{ a.label }}</span>
                      @if (a.is_default) {
                        <span class="default-badge">Default</span>
                      }
                    </div>
                    <button mat-icon-button class="delete-btn" (click)="confirmRemove(a)" aria-label="Remove address">
                      <mat-icon>delete_outline</mat-icon>
                    </button>
                  </div>
                  <div class="addr-line">{{ a.address_line1 }}</div>
                  @if (a.address_line2) { <div class="addr-line">{{ a.address_line2 }}</div> }
                  <div class="addr-line">{{ a.city }}, {{ a.state }} — {{ a.pincode }}</div>
                </div>
              }

              @if (!showForm) {
                <button mat-stroked-button color="primary" class="add-trigger" (click)="toggleForm()">
                  <mat-icon>add</mat-icon> Add New Address
                </button>
              }
            </div>
          }

          @if (showForm) {
            <div class="form-card">
              <div class="form-card-header">
                <mat-icon>add_location_alt</mat-icon>
                <span>New Address</span>
                <button mat-icon-button (click)="toggleForm()" aria-label="Cancel"><mat-icon>close</mat-icon></button>
              </div>
              <form [formGroup]="form" (ngSubmit)="add()" class="addr-form">
                <mat-form-field appearance="outline">
                  <mat-label>Label <span class="req">*</span></mat-label>
                  <input matInput formControlName="label" placeholder="e.g. Home, Office" />
                  <mat-error>Label is required</mat-error>
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Address Line 1 <span class="req">*</span></mat-label>
                  <input matInput formControlName="address_line1" placeholder="Street / Flat no." />
                  <mat-error>Address is required</mat-error>
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Address Line 2</mat-label>
                  <input matInput formControlName="address_line2" placeholder="Landmark (optional)" />
                </mat-form-field>
                <div class="form-row-2">
                  <mat-form-field appearance="outline">
                    <mat-label>City <span class="req">*</span></mat-label>
                    <input matInput formControlName="city" placeholder="e.g. Chennai" />
                    <mat-error>City is required</mat-error>
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>State <span class="req">*</span></mat-label>
                    <input matInput formControlName="state" placeholder="e.g. Tamil Nadu" />
                    <mat-error>State is required</mat-error>
                  </mat-form-field>
                </div>
                <mat-form-field appearance="outline">
                  <mat-label>Pincode <span class="req">*</span></mat-label>
                  <input matInput formControlName="pincode" maxlength="6" placeholder="6-digit pincode" />
                  <mat-error>Pincode is required</mat-error>
                </mat-form-field>
                <mat-checkbox formControlName="is_default" color="primary">Set as default address</mat-checkbox>
                <div class="form-actions">
                  <button mat-stroked-button type="button" (click)="toggleForm()">Cancel</button>
                  <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid || saving()">
                    {{ saving() ? 'Saving…' : 'Save Address' }}
                  </button>
                </div>
              </form>
            </div>
          }
        }
      </div>
    </div>
  `,
  styles: [`
    .page { min-height: 100vh; background: #f7fafc; padding-bottom: 3rem; }

    /* Header */
    .page-header {
      background: linear-gradient(135deg, #00796b, #004d40);
      color: #fff; padding: 1.25rem 1.5rem;
      display: flex; align-items: center; gap: 1rem;
    }
    .back-btn {
      background: rgba(255,255,255,.15); border: none; border-radius: 8px;
      width: 38px; height: 38px; display: flex; align-items: center; justify-content: center;
      cursor: pointer; color: #fff; flex-shrink: 0;
      mat-icon { font-size: 1.2rem; width: 1.2rem; height: 1.2rem; }
      &:hover { background: rgba(255,255,255,.25); }
    }
    .page-title { margin: 0 0 .15rem; font-size: 1.2rem; font-weight: 700; }
    .page-sub { margin: 0; font-size: .8rem; opacity: .8; }

    /* Body */
    .page-body { padding: 1.25rem 1.5rem; max-width: 640px; display: flex; flex-direction: column; gap: 1rem; }

    /* Empty */
    .empty-state {
      display: flex; flex-direction: column; align-items: center; gap: 1rem;
      padding: 3rem 1.5rem; text-align: center;
      h3 { margin: 0; font-size: 1.1rem; font-weight: 700; color: #2d3748; }
      p { margin: 0; color: #718096; font-size: .875rem; }
    }
    .empty-icon {
      width: 72px; height: 72px; border-radius: 50%; background: #e0f2f1;
      display: flex; align-items: center; justify-content: center;
      mat-icon { font-size: 2rem; width: 2rem; height: 2rem; color: #00796b; }
    }

    /* Address cards */
    .address-list { display: flex; flex-direction: column; gap: .75rem; }
    .address-card {
      background: #fff; border-radius: 12px; border: 1.5px solid #e2e8f0;
      padding: 1rem 1.25rem;
      &.default-card { border-color: #00796b; }
    }
    .card-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: .4rem; }
    .card-label-row { display: flex; align-items: center; gap: .5rem; }
    .addr-label { font-weight: 700; font-size: .95rem; color: #1a202c; }
    .default-badge {
      font-size: .65rem; font-weight: 700; text-transform: uppercase; letter-spacing: .05em;
      background: #e0f2f1; color: #00796b; padding: .15rem .5rem; border-radius: 10px;
    }
    .delete-btn { color: #a0aec0; &:hover { color: #e53e3e !important; } }
    .addr-line { font-size: .875rem; color: #4a5568; line-height: 1.6; }

    .add-trigger { align-self: flex-start; }

    /* Form card */
    .form-card {
      background: #fff; border-radius: 12px; border: 2px solid #00796b; overflow: hidden;
    }
    .form-card-header {
      display: flex; align-items: center; gap: .6rem; padding: .875rem 1.25rem;
      background: #e0f2f1; border-bottom: 1px solid #b2dfdb;
      mat-icon { color: #00796b; font-size: 1.2rem; width: 1.2rem; height: 1.2rem; }
      span { flex: 1; font-size: .9rem; font-weight: 700; color: #00796b; }
    }
    .addr-form { padding: 1.25rem; display: flex; flex-direction: column; gap: .9rem; }
    mat-form-field { width: 100%; }
    .req { color: #e53e3e; font-weight: 700; }
    .form-row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .form-actions { display: flex; justify-content: flex-end; gap: .75rem; padding-top: .25rem; }

    @media (max-width: 600px) {
      .page-body { padding: .75rem 1rem; }
      .form-row-2 { grid-template-columns: 1fr; }
    }
  `],
})
export class AddressBookComponent implements OnInit {
  addresses = signal<UserAddress[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  saving = signal(false);
  showForm = false;

  form = this.fb.group({
    label:         ['', Validators.required],
    address_line1: ['', Validators.required],
    address_line2: [''],
    city:          ['', Validators.required],
    state:         ['', Validators.required],
    pincode:       ['', Validators.required],
    is_default:    [false],
  });

  constructor(
    private fb: FormBuilder,
    private userApi: UserApiService,
    private snackBar: MatSnackBar,
    private location: Location,
  ) {}

  ngOnInit(): void { this.load(); }

  goBack(): void { this.location.back(); }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.userApi.getAddresses().subscribe({
      next: (res: { items: UserAddress[] }) => { this.addresses.set(res.items); this.loading.set(false); },
      error: () => { this.error.set('Failed to load addresses.'); this.loading.set(false); },
    });
  }

  toggleForm(): void {
    this.showForm = !this.showForm;
    if (!this.showForm) this.form.reset({ is_default: false });
  }

  add(): void {
    if (this.form.invalid) return;
    this.saving.set(true);
    this.userApi.addAddress(this.form.value as Partial<UserAddress>).subscribe({
      next: (addr: UserAddress) => {
        this.addresses.update((list: UserAddress[]) => [...list, addr]);
        this.form.reset({ is_default: false });
        this.showForm = false;
        this.saving.set(false);
        this.snackBar.open('Address saved.', 'OK', { duration: 3000 });
      },
      error: () => { this.snackBar.open('Failed to save address.', 'OK', { duration: 3000 }); this.saving.set(false); },
    });
  }

  confirmRemove(address: UserAddress): void {
    if (!confirm(`Remove "${address.label}"?`)) return;
    this.userApi.deleteAddress(address.id).subscribe({
      next: () => {
        this.addresses.update((list: UserAddress[]) => list.filter((a: UserAddress) => a.id !== address.id));
        this.snackBar.open('Address removed.', 'OK', { duration: 3000 });
      },
      error: () => this.snackBar.open('Failed to remove address.', 'OK', { duration: 3000 }),
    });
  }
}
