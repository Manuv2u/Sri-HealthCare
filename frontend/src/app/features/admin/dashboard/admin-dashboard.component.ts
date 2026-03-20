import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AdminApiService } from '../../../core/api/services/admin-api.service';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner.component';
import { ErrorBannerComponent } from '../../../shared/components/error-banner.component';

const QUICK_LINKS = [
  { label: 'Manage Tests',       icon: 'biotech',        path: '/admin/tests',        color: '#3182ce' },
  { label: 'Manage Packages',    icon: 'inventory_2',    path: '/admin/packages',     color: '#805ad5' },
  { label: 'Manage Technicians', icon: 'engineering',    path: '/admin/technicians',  color: '#d69e2e' },
  { label: 'View Bookings',      icon: 'calendar_month', path: '/admin/bookings',     color: '#38a169' },
  { label: 'User Management',    icon: 'people',         path: '/admin/users',        color: '#e53e3e' },
  { label: 'Analytics',          icon: 'bar_chart',      path: '/admin/analytics',    color: '#00796b' },
];

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule, LoadingSpinnerComponent, ErrorBannerComponent],
  template: `
    <div class="dashboard">
      @if (loading()) {
        <app-loading-spinner />
      } @else if (error()) {
        <app-error-banner [message]="error()!" retryLabel="Retry" (retry)="loadDashboard()" />
      } @else {
        <!-- KPI cards -->
        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-icon" style="background:#ebf8ff;color:#3182ce"><mat-icon>people</mat-icon></div>
            <div class="kpi-body">
              <span class="kpi-value">{{ data()?.total_users ?? 0 }}</span>
              <span class="kpi-label">Total Users</span>
            </div>
          </div>
          <div class="kpi-card">
            <div class="kpi-icon" style="background:#c6f6d5;color:#276749"><mat-icon>today</mat-icon></div>
            <div class="kpi-body">
              <span class="kpi-value">{{ data()?.bookings_today ?? 0 }}</span>
              <span class="kpi-label">Bookings Today</span>
            </div>
          </div>
          <div class="kpi-card">
            <div class="kpi-icon" style="background:#faf5ff;color:#6b46c1"><mat-icon>calendar_month</mat-icon></div>
            <div class="kpi-body">
              <span class="kpi-value">{{ data()?.bookings_month ?? 0 }}</span>
              <span class="kpi-label">Bookings This Month</span>
            </div>
          </div>
          <div class="kpi-card">
            <div class="kpi-icon" style="background:#fffaf0;color:#c05621"><mat-icon>pending_actions</mat-icon></div>
            <div class="kpi-body">
              <span class="kpi-value">{{ data()?.pending_bookings ?? 0 }}</span>
              <span class="kpi-label">Pending Bookings</span>
            </div>
          </div>
          <div class="kpi-card">
            <div class="kpi-icon" style="background:#e0f2f1;color:#00796b"><mat-icon>currency_rupee</mat-icon></div>
            <div class="kpi-body">
              <span class="kpi-value">₹{{ data()?.revenue_today ?? 0 }}</span>
              <span class="kpi-label">Revenue Today</span>
            </div>
          </div>
          <div class="kpi-card">
            <div class="kpi-icon" style="background:#e0f2f1;color:#00796b"><mat-icon>trending_up</mat-icon></div>
            <div class="kpi-body">
              <span class="kpi-value">₹{{ data()?.revenue_month ?? 0 }}</span>
              <span class="kpi-label">Revenue This Month</span>
            </div>
          </div>
        </div>

        <!-- Quick links -->
        <h3 class="section-title">Quick Actions</h3>
        <div class="quick-grid">
          @for (link of quickLinks; track link.path) {
            <a [routerLink]="link.path" class="quick-card">
              <div class="quick-icon" [style.background]="link.color + '18'" [style.color]="link.color">
                <mat-icon>{{ link.icon }}</mat-icon>
              </div>
              <span class="quick-label">{{ link.label }}</span>
              <mat-icon class="quick-arrow">arrow_forward</mat-icon>
            </a>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .dashboard { display: flex; flex-direction: column; gap: 1.5rem; }

    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 1rem;
    }
    .kpi-card {
      background: #fff; border-radius: 12px; padding: 1.25rem;
      border: 1px solid #e2e8f0; display: flex; align-items: center; gap: 1rem;
      box-shadow: 0 1px 3px rgba(0,0,0,.05);
    }
    .kpi-icon {
      width: 48px; height: 48px; border-radius: 12px;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
      mat-icon { font-size: 1.4rem; width: 1.4rem; height: 1.4rem; }
    }
    .kpi-body { display: flex; flex-direction: column; gap: .15rem; }
    .kpi-value { font-size: 1.6rem; font-weight: 700; color: #1a202c; line-height: 1; }
    .kpi-label { font-size: .8rem; color: #718096; font-weight: 500; }

    .section-title { font-size: 1rem; font-weight: 600; color: #2d3748; margin: 0; }

    .quick-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: .75rem;
    }
    .quick-card {
      background: #fff; border-radius: 10px; padding: 1rem;
      border: 1px solid #e2e8f0; display: flex; align-items: center; gap: .75rem;
      text-decoration: none; color: #2d3748; transition: all .15s;
      &:hover { border-color: #00796b; box-shadow: 0 2px 8px rgba(0,121,107,.12); transform: translateY(-1px); }
    }
    .quick-icon {
      width: 40px; height: 40px; border-radius: 10px;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
      mat-icon { font-size: 1.2rem; width: 1.2rem; height: 1.2rem; }
    }
    .quick-label { flex: 1; font-size: .875rem; font-weight: 600; }
    .quick-arrow { font-size: 1rem; width: 1rem; height: 1rem; color: #a0aec0; }
  `],
})
export class AdminDashboardComponent implements OnInit, OnDestroy {
  private intervalId?: number;
  quickLinks = QUICK_LINKS;
  loading = signal(false);
  error = signal<string | null>(null);
  data = signal<any>(null);

  constructor(private adminApi: AdminApiService) {}

  ngOnInit() {
    this.loadDashboard();
    this.intervalId = window.setInterval(() => this.loadDashboard(), 60000);
  }

  ngOnDestroy() { if (this.intervalId) clearInterval(this.intervalId); }

  loadDashboard() {
    this.loading.set(true);
    this.error.set(null);
    this.adminApi.getDashboard().subscribe({
      next: (res) => { this.data.set(res); this.loading.set(false); },
      error: (err) => { this.error.set(err.error?.message || 'Failed to load dashboard'); this.loading.set(false); },
    });
  }
}
