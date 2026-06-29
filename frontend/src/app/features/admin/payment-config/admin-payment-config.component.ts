import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminApiService } from '../../../core/api/services/admin-api.service';
import { SpinnerComponent } from '../../../shared/components/spinner/spinner.component';
import { AlertComponent } from '../../../shared/components/alert/alert.component';
import { ButtonComponent } from '../../../shared/components/button/button.component';

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
  imports: [CommonModule, FormsModule, SpinnerComponent, AlertComponent, ButtonComponent],
  template: `
<div class="page">
  <div class="page-header">
    <div>
      <h1 class="page-title">Advance Payment Configuration</h1>
      <p class="page-sub">Control how much patients pay upfront when placing a booking.</p>
    </div>
  </div>

  @if (error()) { <app-alert type="error" [dismissible]="true" (dismissed)="error.set('')">{{ error() }}</app-alert> }
  @if (success()) { <app-alert type="success" [dismissible]="true" (dismissed)="success.set('')">{{ success() }}</app-alert> }

  @if (loading()) { <div class="load-wrap"><app-spinner size="md" /></div>
  } @else if (config()) {

    <!-- Toggle Card -->
    <div class="setting-card">
      <div class="setting-row">
        <div class="setting-text">
          <h3 class="setting-title">Require Advance Payment</h3>
          <p class="setting-desc">When enabled, patients must pay the configured advance amount at the time of booking.</p>
        </div>
        <button class="toggle-btn" [class.on]="config()!.enabled" (click)="toggleEnabled(!config()!.enabled)" [attr.aria-label]="config()!.enabled ? 'Disable advance payment' : 'Enable advance payment'">
          <span class="toggle-knob"></span>
        </button>
      </div>
    </div>

    @if (config()!.enabled) {
      <div class="setting-card">
        <h3 class="card-section-title">Payment Amount Settings</h3>
        <div class="form-grid">
          <div class="field">
            <label>Advance Payment Percentage (%)</label>
            <input type="number" [(ngModel)]="percentage" min="1" max="100" class="inp" />
            <span class="field-hint">Percentage of total booking amount collected upfront</span>
          </div>
          <div class="field">
            <label>Minimum Advance Amount (₹)</label>
            <input type="number" [(ngModel)]="minimumAmount" min="0" class="inp" />
            <span class="field-hint">Minimum rupees collected regardless of percentage (0 to disable)</span>
          </div>
        </div>

        <div class="preview-box">
          <p class="preview-title">Preview</p>
          @for (amt of [500, 1200, 3000]; track amt) {
            <div class="preview-row">
              <span>₹{{ amt }} booking</span>
              <span class="advance-val">₹{{ calcAdvance(amt) | number:'1.0-0' }} advance required</span>
            </div>
          }
        </div>

        <div class="save-row">
          <app-button variant="primary" [loading]="saving()" (click)="saveAmounts()">Save Settings</app-button>
        </div>
      </div>
    }
  }
</div>`,
  styles: [`
    .page { display:flex; flex-direction:column; gap:1.25rem; max-width:680px; }
    .page-header { display:flex; justify-content:space-between; align-items:flex-start; }
    .page-title { font-size:1.5rem; font-weight:700; color:#0F172A; margin:0 0 0.25rem 0; }
    .page-sub { font-size:0.875rem; color:#475569; margin:0; }
    .load-wrap { display:flex; justify-content:center; padding:3rem; }
    .setting-card { background:#FFFFFF; border:1px solid #F1F5F9; border-radius:1rem; padding:1.5rem; }
    .setting-row { display:flex; justify-content:space-between; align-items:flex-start; gap:1.5rem; }
    .setting-title { font-size:1rem; font-weight:600; color:#0F172A; margin:0 0 0.25rem 0; }
    .setting-desc { font-size:0.875rem; color:#475569; margin:0; line-height:1.625; }
    .card-section-title { font-size:1rem; font-weight:600; color:#0F172A; margin:0 0 1.25rem 0; }
    .toggle-btn { position:relative; width:52px; height:28px; border-radius:9999px; border:none; cursor:pointer; background:#CBD5E1; transition:background 200ms; flex-shrink:0; &.on { background:#38A169; } }
    .toggle-knob { position:absolute; top:3px; left:3px; width:22px; height:22px; border-radius:9999px; background:#FFFFFF; transition:transform 200ms; box-shadow:0 1px 3px 0 rgba(0,0,0,.1),0 1px 2px -1px rgba(0,0,0,.1); }
    .toggle-btn.on .toggle-knob { transform:translateX(24px); }
    .form-grid { display:flex; flex-direction:column; gap:1.25rem; margin-bottom:1.25rem; }
    .field { display:flex; flex-direction:column; gap:0.5rem; label { font-size:0.875rem; font-weight:500; color:#0F172A; } }
    .inp { height:40px; padding:0 0.875rem; border:1px solid #E2E8F0; border-radius:0.75rem; font-size:0.875rem; color:#0F172A; background:#FFFFFF; max-width:240px; &:focus { outline:none; border-color:#319795; box-shadow:0 0 0 3px rgba(49,151,149,.1); } }
    .field-hint { font-size:0.75rem; color:#94A3B8; }
    .preview-box { background:#F8FAFC; border:1px solid #F1F5F9; border-radius:0.75rem; padding:1.25rem; margin-bottom:1.25rem; }
    .preview-title { font-size:0.75rem; font-weight:700; text-transform:uppercase; letter-spacing:0.05em; color:#94A3B8; margin:0 0 0.75rem 0; }
    .preview-row { display:flex; justify-content:space-between; align-items:center; padding:0.5rem 0; border-bottom:1px solid #F1F5F9; font-size:0.875rem; color:#475569; &:last-child { border-bottom:none; } }
    .advance-val { font-weight:600; color:#285E61; }
    .save-row { display:flex; justify-content:flex-end; }
  `]
})
export class AdminPaymentConfigComponent implements OnInit {
  loading = signal(false); saving = signal(false);
  error = signal(''); success = signal('');
  config = signal<PaymentConfig | null>(null);
  percentage = 20; minimumAmount = 100;

  constructor(private adminApi: AdminApiService) {}
  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.adminApi.getFeatureFlags().subscribe({
      next: flags => {
        const ef = flags.find(f => f.key === 'advance_payment_enabled');
        const pf = flags.find(f => f.key === 'advance_payment_percentage');
        const mf = flags.find(f => f.key === 'advance_payment_minimum_amount');
        this.percentage = parseInt(pf?.description ?? '20', 10) || 20;
        this.minimumAmount = parseInt(mf?.description ?? '100', 10) || 100;
        this.config.set({ enabled: ef?.is_enabled ?? true, percentage: this.percentage, minimumAmount: this.minimumAmount, enabledFlagId: ef?.id ?? '', percentageFlagId: pf?.id ?? '', minimumFlagId: mf?.id ?? '' });
        this.loading.set(false);
      },
      error: () => { this.error.set('Failed to load payment configuration.'); this.loading.set(false); }
    });
  }

  calcAdvance(total: number): number { return Math.max(Math.ceil(total * this.percentage / 100), this.minimumAmount); }

  toggleEnabled(enabled: boolean) {
    const c = this.config();
    if (!c) return;
    this.adminApi.updateFeatureFlag(c.enabledFlagId, { key: 'advance_payment_enabled', is_enabled: enabled }).subscribe({
      next: () => { this.config.update(cfg => cfg ? { ...cfg, enabled } : cfg); this.success.set(`Advance payment ${enabled ? 'enabled' : 'disabled'}.`); setTimeout(() => this.success.set(''), 3000); },
      error: () => this.error.set('Failed to update.')
    });
  }

  saveAmounts() {
    const c = this.config();
    if (!c) return;
    this.saving.set(true);
    let done = 0;
    const check = () => { done++; if (done === 2) { this.saving.set(false); this.success.set('Settings saved.'); setTimeout(() => this.success.set(''), 3000); this.load(); } };
    const err = () => { this.saving.set(false); this.error.set('Failed to save.'); };
    this.adminApi.updateFeatureFlag(c.percentageFlagId, { key: 'advance_payment_percentage', is_enabled: true, description: String(this.percentage) }).subscribe({ next: check, error: err });
    this.adminApi.updateFeatureFlag(c.minimumFlagId, { key: 'advance_payment_minimum_amount', is_enabled: true, description: String(this.minimumAmount) }).subscribe({ next: check, error: err });
  }
}
