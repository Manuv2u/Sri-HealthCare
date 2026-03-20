import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
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
    MatCardModule,
    MatSlideToggleModule,
    LoadingSpinnerComponent,
    ErrorBannerComponent,
    EmptyStateComponent,
  ],
  template: `
    <div class="feature-flags-container">
      <h1>Feature Flags</h1>

      @if (loading()) {
        <app-loading-spinner />
      } @else if (error()) {
        <app-error-banner [message]="error()!" retryLabel="Retry" (retry)="loadFlags()" />
      } @else {
        @if (flags().length === 0) {
          <app-empty-state message="No feature flags found" />
        } @else {
          <div class="flags-list">
            @for (flag of flags(); track flag.id) {
              <mat-card>
                <mat-card-content>
                  <div class="flag-item">
                    <div class="flag-info">
                      <strong>{{ flag.key }}</strong>
                      @if (flag.description) {
                        <p class="description">{{ flag.description }}</p>
                      }
                    </div>
                    <mat-slide-toggle
                      [checked]="flag.is_enabled"
                      (change)="toggleFlag(flag, $event.checked)"
                    />
                  </div>
                </mat-card-content>
              </mat-card>
            }
          </div>
        }
      }
    </div>
  `,
  styles: [`
    .feature-flags-container {
      padding: 1.5rem;
    }
    h1 {
      margin-bottom: 1.5rem;
    }
    .flags-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .flag-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
    }
    .flag-info {
      flex: 1;
    }
    .description {
      margin: 0.25rem 0 0;
      color: #666;
      font-size: 0.875rem;
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
}
