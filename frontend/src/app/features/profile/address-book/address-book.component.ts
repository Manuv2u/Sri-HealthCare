import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { UserApiService } from '../../../core/api/services/user-api.service';
import { UserAddress } from '../../../core/api/api.types';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner.component';
import { ErrorBannerComponent } from '../../../shared/components/error-banner.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state.component';

@Component({
  selector: 'app-address-book',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatButtonModule, MatFormFieldModule, MatInputModule, MatCardModule,
    MatCheckboxModule, MatDialogModule, MatSnackBarModule, MatIconModule,
    LoadingSpinnerComponent, ErrorBannerComponent, EmptyStateComponent,
  ],
  template: `
    <div class="container">
      <h2>Address Book</h2>
      <app-loading-spinner *ngIf="loading()" />
      <app-error-banner *ngIf="error()" [message]="error()!" [retryLabel]="'Retry'" (retry)="load()" />

      <div *ngIf="!loading()">
        <app-empty-state *ngIf="addresses().length === 0 && !showForm" message="No saved addresses yet." />

        <mat-card *ngFor="let a of addresses()" class="address-card">
          <mat-card-content>
            <div class="card-header">
              <span class="label">{{ a.label }}</span>
              <span *ngIf="a.is_default" class="default-badge">Default</span>
            </div>
            <div class="address-line">{{ a.address_line1 }}</div>
            <div *ngIf="a.address_line2" class="address-line">{{ a.address_line2 }}</div>
            <div class="address-line">{{ a.city }}, {{ a.state }} — {{ a.pincode }}</div>
          </mat-card-content>
          <mat-card-actions>
            <button mat-button color="warn" (click)="confirmRemove(a)">
              <mat-icon>delete</mat-icon> Remove
            </button>
          </mat-card-actions>
        </mat-card>

        <button mat-stroked-button color="primary" (click)="toggleForm()" class="add-btn">
          <mat-icon>{{ showForm ? 'expand_less' : 'add' }}</mat-icon>
          {{ showForm ? 'Cancel' : 'Add Address' }}
        </button>

        <form [formGroup]="form" (ngSubmit)="add()" *ngIf="showForm" class="add-form">
          <h3>New Address</h3>

          <mat-form-field appearance="outline">
            <mat-label>Label</mat-label>
            <input matInput formControlName="label" />
            <mat-error *ngIf="form.get('label')?.touched && form.get('label')?.hasError('required')">
              Label is required.
            </mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Address Line 1</mat-label>
            <input matInput formControlName="address_line1" />
            <mat-error *ngIf="form.get('address_line1')?.touched && form.get('address_line1')?.hasError('required')">
              Address Line 1 is required.
            </mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Address Line 2 (optional)</mat-label>
            <input matInput formControlName="address_line2" />
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>City</mat-label>
            <input matInput formControlName="city" />
            <mat-error *ngIf="form.get('city')?.touched && form.get('city')?.hasError('required')">
              City is required.
            </mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>State</mat-label>
            <input matInput formControlName="state" />
            <mat-error *ngIf="form.get('state')?.touched && form.get('state')?.hasError('required')">
              State is required.
            </mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Pincode</mat-label>
            <input matInput formControlName="pincode" />
            <mat-error *ngIf="form.get('pincode')?.touched && form.get('pincode')?.hasError('required')">
              Pincode is required.
            </mat-error>
          </mat-form-field>

          <mat-checkbox formControlName="is_default" color="primary">Set as default</mat-checkbox>

          <button mat-raised-button color="primary" type="submit" [disabled]="form.invalid">Save Address</button>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .container { max-width: 600px; margin: 2rem auto; padding: 1rem; display: flex; flex-direction: column; gap: 1rem; }
    .address-card { margin-bottom: 0.5rem; }
    .card-header { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem; }
    .label { font-weight: 600; font-size: 1rem; }
    .default-badge {
      background: #00796b; color: #fff;
      font-size: 0.7rem; font-weight: 600;
      padding: 2px 8px; border-radius: 12px;
      text-transform: uppercase; letter-spacing: 0.05em;
    }
    .address-line { color: #555; font-size: 0.9rem; line-height: 1.5; }
    .add-btn { margin-top: 0.5rem; }
    .add-form { display: flex; flex-direction: column; gap: 1rem; margin-top: 1rem; }
    mat-form-field { width: 100%; }
  `],
})
export class AddressBookComponent implements OnInit {
  addresses = signal<UserAddress[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  showForm = false;

  form = this.fb.group({
    label: ['', Validators.required],
    address_line1: ['', Validators.required],
    address_line2: [''],
    city: ['', Validators.required],
    state: ['', Validators.required],
    pincode: ['', Validators.required],
    is_default: [false],
  });

  constructor(
    private fb: FormBuilder,
    private userApi: UserApiService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void { this.load(); }

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
    if (!this.showForm) { this.form.reset({ is_default: false }); }
  }

  add(): void {
    if (this.form.invalid) return;
    this.userApi.addAddress(this.form.value as Partial<UserAddress>).subscribe({
      next: (addr: UserAddress) => {
        this.addresses.update((list: UserAddress[]) => [...list, addr]);
        this.form.reset({ is_default: false });
        this.showForm = false;
        this.snackBar.open('Address saved.', 'OK', { duration: 3000 });
      },
      error: () => { this.snackBar.open('Failed to save address.', 'OK', { duration: 3000 }); },
    });
  }

  confirmRemove(address: UserAddress): void {
    const confirmed = window.confirm(`Remove "${address.label}"?`);
    if (confirmed) { this.deleteAddress(address); }
  }

  private deleteAddress(address: UserAddress): void {
    this.userApi.deleteAddress(address.id).subscribe({
      next: () => {
        this.addresses.update((list: UserAddress[]) => list.filter((a: UserAddress) => a.id !== address.id));
        this.snackBar.open('Address removed.', 'OK', { duration: 3000 });
      },
      error: () => { this.snackBar.open('Failed to remove address.', 'OK', { duration: 3000 }); },
    });
  }
}
