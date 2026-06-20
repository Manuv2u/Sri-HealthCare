import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AdminApiService } from '../../../core/api/services/admin-api.service';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner.component';
import { ErrorBannerComponent } from '../../../shared/components/error-banner.component';

interface PaymentConfig {
  enabled: boolean;
  percentage: number;
  minimumAmount: number;
  enabledFlagId: string;
  percentageFlagId: string;
  minimumFlagId: string;
}

@Component({
  selector: 'app-admin-payment-config',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatSlideToggleModule,
    MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatSnackBarModule,
    LoadingSpinnerComponent, ErrorBannerComponent,
  ],
  template: `
    <div class="container">
      <div class="page-header">
        <h1>Advance Payment Configuration</h1>
        <p>Control how much patients pay upfront when placing a booking.</p>
      </div>

      @if (loading()) { <app-loading-spinner /> }
      @else if (error()) { <app-error-banner [message]="error()!" retryLabel="Retry" (retry)="load()" /> }
      @else if (config()) {
        <mat-card class="config-card">
          <mat-card-content>
            <div class="setting-row">
              <div class="setting-info">
                <div class="setting-label">Require Advance Payment</div>
                <div class="setting-desc">When enabled, patients must pay the configured advance amount while booking.</div>
              </div>
              <mat-slide-toggle [checked]="config()!.enabled" (change)="toggleEnabled($event.checked)" />
            </div>
          </mat-card-content>
        </mat-card>

        @if (config()!.enabled) {
          <mat-card class="config-card">
            <mat-card-header><mat-card-title>Payment Amount Settings</mat-card-title></mat-card-header>
            <mat-card-content>
              <form class="settings-form" (ngSubmit)="saveAmounts()">
                <div class="setting-field">
                  <mat-form-field appearance="outline">
                    <mat-label>Advance Payment Percentage (%)</mat-label>
                    <input matInput type="number" [(ngModel)]="percentage" name="percentage"
                           min="1" max="100" required />
                    <mat-hint>Percentage of total booking amount collected upfront</mat-hint>
                  </mat-form-field>
                </div>
                <div class="setting-field">
                  <mat-form-field appearance="outline">
                    <mat-label>Minimum Advance Amount (₹)</mat-label>
                    <input matInput type="number" [(ngModel)]="minimumAmount" name="minimumAmount"
                           min="0" required />
                    <mat-hint>Minimum rupees collected regardless of percentage (set 0 to disable)</mat-hint>
                  </mat-form-field>
                </div>

                <div class="preview-box">
                  <div class="preview-title">Preview</div>
                  <div class="preview-row">
                    <span>For a ₹500 booking:</span>
                    <span class="preview-val">₹{{ calcAdvance(500) | number:'1.0-0' }} advance</span>
                  </div>
                  <div class="preview-row">
                    <span>For a ₹1,200 booking:</span>
                    <span class="preview-val">₹{{ calcAdvance(1200) | number:'1.0-0' }} advance</span>
                  </div>
                  <div class="preview-row">
                    <span>For a ₹3,000 booking:</span>
                    <span class="preview-val">₹{{ calcAdvance(3000) | number:'1.0-0' }} advance</span>
                  </div>
                </div>

                <div class="form-actions">
                  <button mat-raised-button color="primary" type="submit" [disabled]="saving()">
                    <mat-icon>save</mat-icon> {{ saving() ? 'Saving…' : 'Save Settings' }}
                  </button>
                </div>
              </form>
            </mat-card-content>
          </mat-card>
        }
      }
    </div>
  `,
  styles: [`
    .container { padding: 1.5rem; }
    .page-header { margin-bottom: 1.5rem;
      h1 { font-size: 1.5rem; font-weight: 700; margin: 0 0 .35rem; }
      p { color: #718096; font-size: .875rem; margin: 0; }
    }
    .config-card { margin-bottom: 1rem; }
    .setting-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 2rem; flex-wrap: wrap; }
    .setting-info { flex: 1; }
    .setting-label { font-size: 1rem; font-weight: 600; color: #1a202c; margin-bottom: .25rem; }
    .setting-desc { font-size: .875rem; color: #718096; line-height: 1.5; }
    .settings-form { display: flex; flex-direction: column; gap: 1.25rem; padding-top: .5rem; }
    .setting-field mat-form-field { width: 100%; max-width: 380px; }
    .preview-box { background: #f7fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 1rem; }
    .preview-title { font-size: .75rem; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: #718096; margin-bottom: .75rem; }
    .preview-row { display: flex; justify-content: space-between; font-size: .875rem; padding: .3rem 0; border-bottom: 1px solid #edf2f7;
      &:last-child { border-bottom: none; }
    }
    .preview-val { font-weight: 700; color: #00796b; }
    .form-actions { display: flex; justify-content: flex-end; }
  `],
})
export class AdminPaymentConfigComponent implements OnInit {
  loading = signal(false);
  saving = signal(false);
  error = signal<string | null>(null);
  config = signal<PaymentConfig | null>(null);

  percentage = 20;
  minimumAmount = 100;

  constructor(private adminApi: AdminApiService, private snack: MatSnackBar) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.adminApi.getFeatureFlags().subscribe({
      next: (flags) => {
        const enabledFlag      = flags.find(f => f.key === 'advance_payment_enabled');
        const percentageFlag   = flags.find(f => f.key === 'advance_payment_percentage');
        const minimumFlag      = flags.find(f => f.key === 'advance_payment_minimum_amount');

        const pct  = parseInt(percentageFlag?.description ?? '20', 10) || 20;
        const min  = parseInt(minimumFlag?.description ?? '100', 10) || 100;

        this.percentage    = pct;
        this.minimumAmount = min;

        this.config.set({
          enabled:          enabledFlag?.is_enabled ?? true,
          percentage:       pct,
          minimumAmount:    min,
          enabledFlagId:    enabledFlag?.id ?? '',
          percentageFlagId: percentageFlag?.id ?? '',
          minimumFlagId:    minimumFlag?.id ?? '',
        });
        this.loading.set(false);
      },
      error: () => { this.error.set('Failed to load payment configuration.'); this.loading.set(false); },
    });
  }

  calcAdvance(total: number): number {
    const pct = Math.ceil(total * this.percentage / 100);
    return Math.max(pct, this.minimumAmount);
  }

  toggleEnabled(enabled: boolean): void {
    const c = this.config();
    if (!c) return;
    this.adminApi.updateFeatureFlag(c.enabledFlagId, { key: 'advance_payment_enabled', is_enabled: enabled }).subscribe({
      next: () => { this.config.update(cfg => cfg ? { ...cfg, enabled } : cfg); },
      error: () => this.snack.open('Failed to update.', 'OK', { duration: 3000 }),
    });
  }

  saveAmounts(): void {
    const c = this.config();
    if (!c) return;
    this.saving.set(true);
    let done = 0;
    const check = () => { done++; if (done === 2) { this.saving.set(false); this.snack.open('Settings saved.', 'OK', { duration: 3000 }); this.load(); } };
    const err = () => { this.saving.set(false); this.snack.open('Failed to save.', 'OK', { duration: 3000 }); };

    this.adminApi.updateFeatureFlag(c.percentageFlagId, {
      key: 'advance_payment_percentage',
      is_enabled: true,
      description: String(this.percentage),
    }).subscribe({ next: check, error: err });

    this.adminApi.updateFeatureFlag(c.minimumFlagId, {
      key: 'advance_payment_minimum_amount',
      is_enabled: true,
      description: String(this.minimumAmount),
    }).subscribe({ next: check, error: err });
  }
}
