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

const LABEL_ICONS: Record<string, string> = {
  home: 'home',
  office: 'business',
  work: 'business',
};

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
        <div class="header-text">
          <h1>Address Book</h1>
          <p>Saved addresses for home collection</p>
        </div>
      </div>

      <!-- Body -->
      <div class="page-body">

        @if (loading()) {
          <app-loading-spinner />
        } @else if (error()) {
          <app-error-banner [message]="error()!" retryLabel="Retry" (retry)="load()" />
        } @else {

          <!-- Empty state -->
          @if (addresses().length === 0 && !showForm) {
            <div class="empty-state">
              <div class="empty-icon-wrap">
                <mat-icon>location_on</mat-icon>
              </div>
              <h3>No saved addresses</h3>
              <p>Add a home or office address to speed up your home-collection bookings.</p>
              <button class="btn-add-primary" (click)="toggleForm()">
                <mat-icon>add_location_alt</mat-icon>
                Add Address
              </button>
            </div>

          } @else {

            <!-- Address list -->
            <div class="address-list">
              @for (a of addresses(); track a.id) {
                <div class="address-card" [class.card-default]="a.is_default">
                  <!-- Left accent -->
                  <div class="card-accent" [class.accent-default]="a.is_default"></div>

                  <div class="card-inner">
                    <!-- Label row -->
                    <div class="card-top">
                      <div class="label-row">
                        <div class="label-icon-wrap" [class.label-icon-default]="a.is_default">
                          <mat-icon>{{ labelIcon(a.label) }}</mat-icon>
                        </div>
                        <span class="addr-label">{{ a.label }}</span>
                        @if (a.is_default) {
                          <span class="default-badge">Default</span>
                        }
                      </div>
                      <button class="icon-btn icon-btn-danger" (click)="confirmRemove(a)" aria-label="Remove address">
                        <mat-icon>delete_outline</mat-icon>
                      </button>
                    </div>

                    <!-- Address lines -->
                    <div class="addr-body">
                      <p class="addr-line">{{ a.address_line1 }}</p>
                      @if (a.address_line2) {
                        <p class="addr-line addr-line-secondary">{{ a.address_line2 }}</p>
                      }
                      <p class="addr-line addr-line-city">
                        {{ a.city }}, {{ a.state }}
                        <span class="pincode">{{ a.pincode }}</span>
                      </p>
                    </div>
                  </div>
                </div>
              }

              <!-- Add trigger inline -->
              @if (!showForm) {
                <button class="btn-add-outline" (click)="toggleForm()">
                  <mat-icon>add</mat-icon>
                  Add New Address
                </button>
              }
            </div>
          }

          <!-- Add form -->
          @if (showForm) {
            <div class="form-card">
              <div class="form-card-header">
                <div class="form-card-title">
                  <div class="form-icon-wrap">
                    <mat-icon>add_location_alt</mat-icon>
                  </div>
                  <span>New Address</span>
                </div>
                <button class="icon-btn" (click)="toggleForm()" aria-label="Cancel">
                  <mat-icon>close</mat-icon>
                </button>
              </div>

              <form [formGroup]="form" (ngSubmit)="add()" class="addr-form">

                <div class="field-group">
                  <label class="field-label">Label <span class="req">*</span></label>
                  <mat-form-field appearance="outline" class="field">
                    <input matInput formControlName="label" placeholder="e.g. Home, Office" />
                    <mat-error>Label is required</mat-error>
                  </mat-form-field>
                </div>

                <div class="field-group">
                  <label class="field-label">Address Line 1 <span class="req">*</span></label>
                  <mat-form-field appearance="outline" class="field">
                    <input matInput formControlName="address_line1" placeholder="Flat / Door no., Street name" />
                    <mat-error>Address is required</mat-error>
                  </mat-form-field>
                </div>

                <div class="field-group">
                  <label class="field-label">Address Line 2 <span class="optional">(optional)</span></label>
                  <mat-form-field appearance="outline" class="field">
                    <input matInput formControlName="address_line2" placeholder="Landmark, area" />
                  </mat-form-field>
                </div>

                <div class="form-row-2">
                  <div class="field-group">
                    <label class="field-label">City <span class="req">*</span></label>
                    <mat-form-field appearance="outline" class="field">
                      <input matInput formControlName="city" placeholder="e.g. Chennai" />
                      <mat-error>City is required</mat-error>
                    </mat-form-field>
                  </div>
                  <div class="field-group">
                    <label class="field-label">State <span class="req">*</span></label>
                    <mat-form-field appearance="outline" class="field">
                      <input matInput formControlName="state" placeholder="e.g. Tamil Nadu" />
                      <mat-error>State is required</mat-error>
                    </mat-form-field>
                  </div>
                </div>

                <div class="field-group">
                  <label class="field-label">Pincode <span class="req">*</span></label>
                  <mat-form-field appearance="outline" class="field">
                    <input matInput formControlName="pincode" maxlength="6" placeholder="6-digit pincode" />
                    <mat-error>Pincode is required</mat-error>
                  </mat-form-field>
                </div>

                <label class="default-toggle">
                  <mat-checkbox formControlName="is_default" color="primary"></mat-checkbox>
                  <span class="default-toggle-text">Set as default address</span>
                </label>

                <div class="form-actions">
                  <button type="button" class="btn-ghost" (click)="toggleForm()">Cancel</button>
                  <button type="submit" class="btn-save" [disabled]="form.invalid || saving()">
                    @if (saving()) {
                      <span class="btn-spinner"></span> Saving…
                    } @else {
                      <mat-icon>check</mat-icon> Save Address
                    }
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
    :host { display: block; }

    .page {
      min-height: 100vh;
      background: #F8F9FF;
      font-family: 'Inter', -apple-system, sans-serif;
      padding-bottom: 4rem;
    }

    /* ── Header ── */
    .page-header {
      background: linear-gradient(135deg, #6366F1 0%, #4F46E5 100%);
      color: #fff;
      padding: 1.25rem 1.5rem 1.5rem;
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    .back-btn {
      background: rgba(255,255,255,.15);
      border: none;
      color: #fff;
      border-radius: 10px;
      width: 38px;
      height: 38px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      flex-shrink: 0;
      transition: background .15s;
      mat-icon { font-size: 1.2rem; width: 1.2rem; height: 1.2rem; }
      &:hover { background: rgba(255,255,255,.25); }
    }
    .header-text {
      h1 { margin: 0 0 .15rem; font-size: 1.2rem; font-weight: 700; letter-spacing: -.01em; }
      p { margin: 0; font-size: .8rem; opacity: .75; }
    }

    /* ── Page body ── */
    .page-body {
      padding: 1.5rem;
      max-width: 640px;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    /* ── Empty state ── */
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
      padding: 4rem 2rem;
      text-align: center;
      max-width: 360px;
      margin: 0 auto;
      h3 { margin: 0; font-size: 1.1rem; font-weight: 700; color: #0F172A; }
      p { margin: 0; color: #64748B; font-size: .875rem; line-height: 1.65; }
    }
    .empty-icon-wrap {
      width: 72px;
      height: 72px;
      border-radius: 20px;
      background: #EEF2FF;
      display: flex;
      align-items: center;
      justify-content: center;
      mat-icon { font-size: 2rem; width: 2rem; height: 2rem; color: #6366F1; }
    }
    .btn-add-primary {
      display: flex;
      align-items: center;
      gap: .5rem;
      padding: .7rem 1.5rem;
      border-radius: 999px;
      border: none;
      background: linear-gradient(135deg, #6366F1, #4F46E5);
      color: #fff;
      font-size: .9rem;
      font-weight: 700;
      font-family: inherit;
      cursor: pointer;
      box-shadow: 0 4px 14px rgba(99,102,241,.35);
      transition: opacity .15s, transform .1s;
      mat-icon { font-size: 1rem; width: 1rem; height: 1rem; }
      &:hover { opacity: .9; transform: translateY(-1px); }
    }

    /* ── Address list ── */
    .address-list {
      display: flex;
      flex-direction: column;
      gap: .85rem;
    }
    .address-card {
      background: #fff;
      border-radius: 16px;
      border: 1.5px solid #E2E8F0;
      overflow: hidden;
      display: flex;
      transition: box-shadow .2s;
      &:hover { box-shadow: 0 4px 16px rgba(99,102,241,.1); }
      &.card-default {
        border-color: #C7D2FE;
        box-shadow: 0 2px 10px rgba(99,102,241,.12);
      }
    }

    /* Left accent stripe */
    .card-accent {
      width: 4px;
      background: #E2E8F0;
      flex-shrink: 0;
      border-radius: 0;
    }
    .accent-default {
      background: linear-gradient(180deg, #6366F1, #4F46E5);
    }

    .card-inner {
      flex: 1;
      padding: 1rem 1.25rem;
      min-width: 0;
    }

    /* Card top row */
    .card-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: .6rem;
    }
    .label-row {
      display: flex;
      align-items: center;
      gap: .55rem;
    }
    .label-icon-wrap {
      width: 28px;
      height: 28px;
      border-radius: 8px;
      background: #F1F5F9;
      display: flex;
      align-items: center;
      justify-content: center;
      mat-icon { font-size: .95rem; width: .95rem; height: .95rem; color: #64748B; }
    }
    .label-icon-default {
      background: #EEF2FF;
      mat-icon { color: #6366F1; }
    }
    .addr-label {
      font-size: .95rem;
      font-weight: 700;
      color: #0F172A;
    }
    .default-badge {
      font-size: .65rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: .06em;
      background: #EEF2FF;
      color: #6366F1;
      padding: .2rem .55rem;
      border-radius: 999px;
      border: 1px solid #C7D2FE;
    }

    /* Icon button */
    .icon-btn {
      width: 34px;
      height: 34px;
      border-radius: 9px;
      border: none;
      background: transparent;
      color: #94A3B8;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: background .15s, color .15s;
      mat-icon { font-size: 1.1rem; width: 1.1rem; height: 1.1rem; }
      &:hover { background: #F1F5F9; color: #475569; }
    }
    .icon-btn-danger {
      &:hover { background: #FEF2F2; color: #EF4444; }
    }

    /* Address body */
    .addr-body { display: flex; flex-direction: column; gap: .15rem; }
    .addr-line {
      margin: 0;
      font-size: .875rem;
      color: #475569;
      line-height: 1.6;
    }
    .addr-line-secondary { color: #64748B; }
    .addr-line-city { color: #0F172A; font-weight: 500; }
    .pincode {
      display: inline-block;
      margin-left: .35rem;
      font-size: .8rem;
      font-weight: 600;
      color: #6366F1;
      background: #EEF2FF;
      padding: .05rem .45rem;
      border-radius: 6px;
      font-variant-numeric: tabular-nums;
    }

    /* Add outline button */
    .btn-add-outline {
      display: flex;
      align-items: center;
      gap: .45rem;
      padding: .85rem 1.1rem;
      border-radius: 16px;
      border: 2px dashed #C7D2FE;
      background: transparent;
      color: #6366F1;
      font-size: .9rem;
      font-weight: 600;
      font-family: inherit;
      cursor: pointer;
      width: 100%;
      justify-content: center;
      transition: background .15s, border-color .15s;
      mat-icon { font-size: 1.1rem; width: 1.1rem; height: 1.1rem; }
      &:hover { background: #EEF2FF; border-color: #6366F1; }
    }

    /* ── Form card ── */
    .form-card {
      background: #fff;
      border-radius: 16px;
      border: 2px solid #6366F1;
      overflow: hidden;
      box-shadow: 0 4px 20px rgba(99,102,241,.15);
    }
    .form-card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1rem 1.25rem;
      background: #EEF2FF;
      border-bottom: 1px solid #C7D2FE;
    }
    .form-card-title {
      display: flex;
      align-items: center;
      gap: .65rem;
      font-size: .9rem;
      font-weight: 700;
      color: #4F46E5;
    }
    .form-icon-wrap {
      width: 28px;
      height: 28px;
      border-radius: 8px;
      background: #6366F1;
      display: flex;
      align-items: center;
      justify-content: center;
      mat-icon { font-size: .9rem; width: .9rem; height: .9rem; color: #fff; }
    }

    .addr-form {
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: .75rem;
    }
    .field-group {
      display: flex;
      flex-direction: column;
      gap: .3rem;
    }
    .field-label {
      font-size: .75rem;
      font-weight: 600;
      color: #475569;
      letter-spacing: .04em;
      text-transform: uppercase;
    }
    .req { color: #EF4444; }
    .optional { color: #94A3B8; font-weight: 400; text-transform: none; letter-spacing: 0; font-size: .72rem; }
    .field { width: 100%; }
    .form-row-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }

    /* Default toggle */
    .default-toggle {
      display: flex;
      align-items: center;
      gap: .6rem;
      cursor: pointer;
      padding: .5rem .75rem;
      border-radius: 10px;
      border: 1.5px solid #E2E8F0;
      background: #F8FAFC;
      transition: border-color .15s, background .15s;
      &:hover { border-color: #6366F1; background: #EEF2FF; }
    }
    .default-toggle-text {
      font-size: .875rem;
      font-weight: 500;
      color: #475569;
    }

    .form-actions {
      display: flex;
      justify-content: flex-end;
      gap: .65rem;
      padding-top: .25rem;
    }
    .btn-ghost {
      height: 40px;
      padding: 0 1.1rem;
      border-radius: 999px;
      border: 1.5px solid #E2E8F0;
      background: #fff;
      color: #475569;
      font-size: .875rem;
      font-weight: 600;
      font-family: inherit;
      cursor: pointer;
      transition: border-color .15s, color .15s;
      &:hover { border-color: #6366F1; color: #6366F1; }
    }
    .btn-save {
      height: 40px;
      padding: 0 1.25rem;
      border-radius: 999px;
      border: none;
      background: linear-gradient(135deg, #6366F1, #4F46E5);
      color: #fff;
      font-size: .875rem;
      font-weight: 700;
      font-family: inherit;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: .4rem;
      box-shadow: 0 2px 8px rgba(99,102,241,.3);
      transition: opacity .15s, transform .1s;
      mat-icon { font-size: 1rem; width: 1rem; height: 1rem; }
      &:hover:not(:disabled) { opacity: .9; transform: translateY(-1px); }
      &:disabled { opacity: .55; cursor: not-allowed; transform: none; box-shadow: none; }
    }
    .btn-spinner {
      width: 14px;
      height: 14px;
      border: 2px solid rgba(255,255,255,.4);
      border-top-color: #fff;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    @media (max-width: 600px) {
      .page-body { padding: 1rem; }
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

  labelIcon(label: string): string {
    const key = label?.toLowerCase();
    return LABEL_ICONS[key] ?? 'place';
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
