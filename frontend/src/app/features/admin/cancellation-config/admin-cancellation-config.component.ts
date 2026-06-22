import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { HttpClient } from '@angular/common/http';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner.component';
import { ErrorBannerComponent } from '../../../shared/components/error-banner.component';

interface CancellationConfig {
  id: string;
  charge_type: 'percentage' | 'fixed';
  charge_value: number;
  is_active: boolean;
}

@Component({
  selector: 'app-admin-cancellation-config',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatSlideToggleModule,
    MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatSelectModule, MatSnackBarModule,
    LoadingSpinnerComponent, ErrorBannerComponent,
  ],
  template: `
    <div class="container">
      <div class="page-header">
        <h1>Cancellation Fee Configuration</h1>
        <p>Configure cancellation charges applied when a booking is cancelled.</p>
      </div>

      @if (loading()) { <app-loading-spinner /> }
      @else if (loadError()) { <app-error-banner [message]="loadError()!" retryLabel="Retry" (retry)="load()" /> }
      @else {
        <mat-card class="config-card">
          <mat-card-content>
            <div class="setting-row">
              <div class="setting-info">
                <div class="setting-label">Enable Cancellation Fee</div>
                <div class="setting-desc">When enabled, a fee is deducted from the refund amount when a booking is cancelled.</div>
              </div>
              <mat-slide-toggle [checked]="feeEnabled()" (change)="onToggle($event.checked)" />
            </div>
          </mat-card-content>
        </mat-card>

        @if (feeEnabled()) {
          <mat-card class="config-card">
            <mat-card-header><mat-card-title>Fee Settings</mat-card-title></mat-card-header>
            <mat-card-content>
              <form class="settings-form" (ngSubmit)="save()">
                <div class="fee-type-row">
                  <mat-form-field appearance="outline">
                    <mat-label>Fee Type</mat-label>
                    <mat-select [(ngModel)]="chargeType" name="chargeType">
                      <mat-option value="fixed">Fixed Amount (₹)</mat-option>
                      <mat-option value="percentage">Percentage (%)</mat-option>
                    </mat-select>
                    <mat-hint>Fixed deducts a flat amount; Percentage deducts from total paid</mat-hint>
                  </mat-form-field>
                </div>

                <div class="setting-field">
                  <mat-form-field appearance="outline">
                    <mat-label>{{ chargeType === 'fixed' ? 'Fee Amount (₹)' : 'Fee Percentage (%)' }}</mat-label>
                    <input matInput type="number" [(ngModel)]="chargeValue" name="chargeValue"
                           [min]="0" [max]="chargeType === 'percentage' ? 100 : 99999" step="0.01" required />
                    <mat-hint>{{ chargeType === 'fixed' ? 'Rupees deducted from refund' : 'Percentage of total paid deducted' }}</mat-hint>
                  </mat-form-field>
                </div>

                <div class="preview-box">
                  <div class="preview-title">Preview</div>
                  @for (amt of [500, 1200, 3000]; track amt) {
                    <div class="preview-row">
                      <span>For a ₹{{ amt }} paid booking:</span>
                      <span class="preview-val">₹{{ calcFee(amt) | number:'1.0-2' }} fee, ₹{{ amt - calcFee(amt) | number:'1.0-2' }} refunded</span>
                    </div>
                  }
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

        @if (!feeEnabled() && hadConfig()) {
          <div class="info-box">
            <mat-icon>info</mat-icon>
            <span>Cancellation fee is disabled. Bookings cancelled will receive a full refund.</span>
          </div>
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
    .fee-type-row mat-form-field, .setting-field mat-form-field { width: 100%; max-width: 380px; }
    .preview-box { background: #f7fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 1rem; }
    .preview-title { font-size: .75rem; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: #718096; margin-bottom: .75rem; }
    .preview-row { display: flex; justify-content: space-between; font-size: .875rem; padding: .3rem 0; border-bottom: 1px solid #edf2f7;
      &:last-child { border-bottom: none; }
    }
    .preview-val { font-weight: 700; color: #e53e3e; }
    .form-actions { display: flex; justify-content: flex-end; }
    .info-box { display: flex; align-items: center; gap: .75rem; padding: 1rem 1.25rem; background: #ebf8ff; border-radius: 10px; color: #2c5282; font-size: .875rem;
      mat-icon { color: #3182ce; }
    }
  `],
})
export class AdminCancellationConfigComponent implements OnInit {
  loading = signal(false);
  saving = signal(false);
  loadError = signal<string | null>(null);
  feeEnabled = signal(false);
  hadConfig = signal(false);

  chargeType: 'percentage' | 'fixed' = 'fixed';
  chargeValue = 100;

  constructor(private http: HttpClient, private snack: MatSnackBar) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.http.get<CancellationConfig | null>('/admin/settings/cancellation').subscribe({
      next: (cfg) => {
        if (cfg) {
          this.feeEnabled.set(cfg.is_active);
          this.hadConfig.set(true);
          this.chargeType = cfg.charge_type;
          this.chargeValue = cfg.charge_value;
        } else {
          this.feeEnabled.set(false);
          this.hadConfig.set(false);
        }
        this.loading.set(false);
      },
      error: () => { this.loadError.set('Failed to load cancellation configuration.'); this.loading.set(false); },
    });
  }

  calcFee(total: number): number {
    if (!this.feeEnabled()) return 0;
    if (this.chargeType === 'percentage') {
      return Math.min(Math.round(total * this.chargeValue) / 100, total);
    }
    return Math.min(this.chargeValue, total);
  }

  onToggle(enabled: boolean): void {
    if (!enabled) {
      this.http.delete('/admin/settings/cancellation').subscribe({
        next: () => { this.feeEnabled.set(false); this.snack.open('Cancellation fee disabled.', 'OK', { duration: 3000 }); },
        error: () => this.snack.open('Failed to update.', 'OK', { duration: 3000 }),
      });
    } else {
      this.feeEnabled.set(true);
    }
  }

  save(): void {
    this.saving.set(true);
    this.http.put<CancellationConfig>('/admin/settings/cancellation', {
      charge_type: this.chargeType,
      charge_value: this.chargeValue,
    }).subscribe({
      next: (cfg) => {
        this.saving.set(false);
        this.feeEnabled.set(cfg.is_active);
        this.hadConfig.set(true);
        this.snack.open('Cancellation fee settings saved.', 'OK', { duration: 3000 });
      },
      error: (err) => {
        this.saving.set(false);
        this.snack.open(err.error?.message ?? 'Failed to save settings.', 'OK', { duration: 4000 });
      },
    });
  }
}
