import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { AdminApiService } from '../../../core/api/services/admin-api.service';
import { FeatureFlag } from '../../../core/api/api.types';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner.component';
import { ErrorBannerComponent } from '../../../shared/components/error-banner.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state.component';

@Component({
  selector: 'app-admin-feature-flags',
  standalone: true,
  imports: [
    CommonModule,
    MatSlideToggleModule,
    LoadingSpinnerComponent,
    ErrorBannerComponent,
    EmptyStateComponent,
  ],
  template: `
    <div class="flags-page">

      <!-- Page Header -->
      <div class="page-header">
        <div class="header-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
        </div>
        <div class="header-text">
          <h1>Feature Flags</h1>
          <p>Enable or disable application features without a deployment</p>
        </div>
        <div class="header-meta">
          @if (!loading() && !error()) {
            <div class="flags-count-pill">
              <span class="dot-enabled"></span>
              {{ getEnabledCount() }} of {{ flags().length }} enabled
            </div>
          }
        </div>
      </div>

      @if (loading()) {
        <app-loading-spinner />
      } @else if (error()) {
        <app-error-banner [message]="error()!" retryLabel="Retry" (retry)="loadFlags()" />
      } @else {
        @if (flags().length === 0) {
          <div class="empty-state">
            <div class="empty-illustration">
              <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
            </div>
            <h3>No feature flags found</h3>
            <p>Feature flags will appear here once they are configured in the system.</p>
          </div>
        } @else {
          <div class="flags-list">
            @for (flag of flags(); track flag.id) {
              <div class="flag-card" [class.is-enabled]="flag.is_enabled">

                <!-- Status accent bar -->
                <div class="flag-accent-bar"></div>

                <!-- Flag body -->
                <div class="flag-body">
                  <div class="flag-info">
                    <div class="flag-key-row">
                      <code class="flag-key">{{ flag.key }}</code>
                      <span class="flag-status-badge" [class.badge-enabled]="flag.is_enabled" [class.badge-disabled]="!flag.is_enabled">
                        {{ flag.is_enabled ? 'Enabled' : 'Disabled' }}
                      </span>
                    </div>
                    @if (flag.description) {
                      <p class="flag-desc">{{ flag.description }}</p>
                    } @else {
                      <p class="flag-desc flag-desc-empty">No description provided</p>
                    }
                  </div>

                  <!-- Toggle area -->
                  <div class="flag-toggle-area">
                    <div class="custom-toggle" [class.toggle-on]="flag.is_enabled" (click)="toggleFlag(flag, !flag.is_enabled)" role="switch" [attr.aria-checked]="flag.is_enabled" tabindex="0" (keydown.enter)="toggleFlag(flag, !flag.is_enabled)" (keydown.space)="toggleFlag(flag, !flag.is_enabled)">
                      <div class="toggle-track">
                        <div class="toggle-thumb"></div>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            }
          </div>
        }
      }

    </div>
  `,
  styles: [`
    :host {
      --primary: #6366F1;
      --primary-dark: #4F46E5;
      --primary-light: #EEF2FF;
      --accent: #F97316;
      --accent-dark: #EA580C;
      --success: #22C55E;
      --warning: #F59E0B;
      --error: #EF4444;
      --bg: #F8F9FF;
      --surface: #FFFFFF;
      --text: #0F172A;
      --text-secondary: #475569;
      --muted: #94A3B8;
      --border: #E2E8F0;
      --radius: 12px;
      --radius-lg: 16px;
      --shadow-sm: 0 1px 3px rgba(0,0,0,.06), 0 1px 2px rgba(0,0,0,.04);
      --shadow-md: 0 4px 12px rgba(0,0,0,.08), 0 2px 4px rgba(0,0,0,.04);
      --shadow-indigo: 0 4px 14px rgba(99,102,241,.25);
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    }

    .flags-page {
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      background: var(--bg);
      min-height: 100%;
    }

    /* Page Header */
    .page-header {
      display: flex;
      align-items: center;
      gap: 1rem;
      flex-wrap: wrap;
    }
    .header-icon {
      width: 46px;
      height: 46px;
      border-radius: 14px;
      background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      box-shadow: var(--shadow-indigo);
      flex-shrink: 0;
    }
    .header-text {
      flex: 1;
      min-width: 0;
    }
    .header-text h1 {
      margin: 0 0 .2rem;
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--text);
      letter-spacing: -.02em;
    }
    .header-text p {
      margin: 0;
      font-size: .85rem;
      color: var(--text-secondary);
    }
    .header-meta { margin-left: auto; }
    .flags-count-pill {
      display: flex;
      align-items: center;
      gap: .5rem;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 999px;
      padding: .4rem .9rem;
      font-size: .8rem;
      font-weight: 600;
      color: var(--text-secondary);
      box-shadow: var(--shadow-sm);
    }
    .dot-enabled {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--success);
      flex-shrink: 0;
    }

    /* Flags List */
    .flags-list {
      display: flex;
      flex-direction: column;
      gap: .875rem;
    }

    .flag-card {
      background: var(--surface);
      border-radius: var(--radius-lg);
      border: 1.5px solid var(--border);
      overflow: hidden;
      display: flex;
      align-items: stretch;
      box-shadow: var(--shadow-sm);
      transition: box-shadow .18s, border-color .18s, transform .18s;
    }
    .flag-card:hover {
      box-shadow: var(--shadow-md);
      transform: translateY(-1px);
    }
    .flag-card.is-enabled {
      border-color: rgba(99, 102, 241, .25);
    }
    .flag-card.is-enabled:hover {
      box-shadow: 0 6px 20px rgba(99,102,241,.15);
    }

    /* Accent bar */
    .flag-accent-bar {
      width: 4px;
      flex-shrink: 0;
      background: var(--border);
      transition: background .2s;
    }
    .flag-card.is-enabled .flag-accent-bar {
      background: linear-gradient(180deg, var(--primary) 0%, var(--primary-dark) 100%);
    }

    /* Flag Body */
    .flag-body {
      flex: 1;
      padding: 1.1rem 1.4rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1.25rem;
      flex-wrap: wrap;
    }

    .flag-info { flex: 1; min-width: 0; }

    .flag-key-row {
      display: flex;
      align-items: center;
      gap: .65rem;
      flex-wrap: wrap;
      margin-bottom: .45rem;
    }
    .flag-key {
      font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', 'SF Mono', monospace;
      font-size: .82rem;
      font-weight: 600;
      color: var(--text);
      background: #F1F5F9;
      border: 1px solid var(--border);
      padding: .22rem .6rem;
      border-radius: 7px;
      letter-spacing: .02em;
    }
    .flag-card.is-enabled .flag-key {
      background: var(--primary-light);
      border-color: rgba(99,102,241,.3);
      color: var(--primary-dark);
    }

    .flag-status-badge {
      font-size: .72rem;
      font-weight: 700;
      padding: .18rem .65rem;
      border-radius: 999px;
      letter-spacing: .04em;
      text-transform: uppercase;
    }
    .badge-enabled {
      background: #F0FDF4;
      color: #16A34A;
      border: 1px solid #BBF7D0;
    }
    .badge-disabled {
      background: #F8FAFC;
      color: var(--muted);
      border: 1px solid var(--border);
    }

    .flag-desc {
      margin: 0;
      font-size: .82rem;
      color: var(--text-secondary);
      line-height: 1.55;
    }
    .flag-desc-empty {
      color: var(--muted);
      font-style: italic;
    }

    /* Custom Toggle */
    .flag-toggle-area { flex-shrink: 0; }

    .custom-toggle {
      cursor: pointer;
      outline: none;
      border-radius: 999px;
      padding: 2px;
    }
    .custom-toggle:focus-visible .toggle-track {
      box-shadow: 0 0 0 3px rgba(99,102,241,.25);
    }

    .toggle-track {
      width: 48px;
      height: 26px;
      border-radius: 999px;
      background: #E2E8F0;
      position: relative;
      transition: background .2s;
      border: 1.5px solid transparent;
    }
    .custom-toggle.toggle-on .toggle-track {
      background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
      border-color: transparent;
      box-shadow: 0 2px 8px rgba(99,102,241,.35);
    }

    .toggle-thumb {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: #fff;
      position: absolute;
      top: 50%;
      left: 2px;
      transform: translateY(-50%);
      transition: left .2s cubic-bezier(.34,1.56,.64,1), box-shadow .2s;
      box-shadow: 0 1px 4px rgba(0,0,0,.18);
    }
    .custom-toggle.toggle-on .toggle-thumb {
      left: calc(100% - 22px);
      box-shadow: 0 1px 6px rgba(0,0,0,.2);
    }

    /* Empty State */
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: .75rem;
      padding: 4rem 2rem;
      text-align: center;
    }
    .empty-illustration {
      width: 80px;
      height: 80px;
      border-radius: 24px;
      background: var(--primary-light);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--primary);
      margin-bottom: .5rem;
    }
    .empty-state h3 {
      margin: 0;
      font-size: 1.1rem;
      font-weight: 700;
      color: var(--text);
    }
    .empty-state p {
      margin: 0;
      font-size: .875rem;
      color: var(--text-secondary);
      max-width: 320px;
      line-height: 1.6;
    }
  `],
})
export class AdminFeatureFlagsComponent implements OnInit {
  loading = signal(false);
  error = signal<string | null>(null);
  flags = signal<FeatureFlag[]>([]);

  constructor(private adminApi: AdminApiService) {}

  ngOnInit() {
    this.loadFlags();
  }

  loadFlags() {
    this.loading.set(true);
    this.error.set(null);
    this.adminApi.getFeatureFlags().subscribe({
      next: (res: FeatureFlag[]) => {
        this.flags.set(res);
        this.loading.set(false);
      },
      error: (err: any) => {
        this.error.set(err.message || 'Failed to load feature flags');
        this.loading.set(false);
      },
    });
  }

  toggleFlag(flag: FeatureFlag, enabled: boolean) {
    this.adminApi.updateFeatureFlag(flag.id, { key: flag.key, is_enabled: enabled, description: flag.description }).subscribe({
      next: () => {
        this.flags.update((flags: FeatureFlag[]) =>
          flags.map((f: FeatureFlag) => (f.id === flag.id ? { ...f, is_enabled: enabled } : f))
        );
      },
      error: (err: any) => {
        this.error.set(err.message || 'Failed to update feature flag');
      },
    });
  }

  getEnabledCount(): number {
    return this.flags().filter((f) => f.is_enabled).length;
  }
}
