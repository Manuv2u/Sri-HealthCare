import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { AdminApiService } from '../../../core/api/services/admin-api.service';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner.component';
import { ErrorBannerComponent } from '../../../shared/components/error-banner.component';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, MatCardModule, LoadingSpinnerComponent, ErrorBannerComponent],
  template: `
    <div class="dashboard-container">
      <h1>Admin Dashboard</h1>

      @if (loading()) {
        <app-loading-spinner />
      } @else if (error()) {
        <app-error-banner [message]="error()!" retryLabel="Retry" (retry)="loadDashboard()" />
      } @else {
        <div class="cards-grid">
          <mat-card>
            <mat-card-header>
              <mat-card-title>Total Users</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <div class="metric">{{ data()?.total_users || 0 }}</div>
            </mat-card-content>
          </mat-card>

          <mat-card>
            <mat-card-header>
              <mat-card-title>Bookings Today</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <div class="metric">{{ data()?.bookings_today || 0 }}</div>
            </mat-card-content>
          </mat-card>

          <mat-card>
            <mat-card-header>
              <mat-card-title>Bookings This Month</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <div class="metric">{{ data()?.bookings_month || 0 }}</div>
            </mat-card-content>
          </mat-card>

          <mat-card>
            <mat-card-header>
              <mat-card-title>Revenue Today</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <div class="metric">₹{{ data()?.revenue_today || 0 }}</div>
            </mat-card-content>
          </mat-card>

          <mat-card>
            <mat-card-header>
              <mat-card-title>Revenue This Month</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <div class="metric">₹{{ data()?.revenue_month || 0 }}</div>
            </mat-card-content>
          </mat-card>

          <mat-card>
            <mat-card-header>
              <mat-card-title>Pending Bookings</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <div class="metric">{{ data()?.pending_bookings || 0 }}</div>
            </mat-card-content>
          </mat-card>
        </div>
      }
    </div>
  `,
  styles: [`
    .dashboard-container {
      padding: 1.5rem;
    }
    h1 {
      margin-bottom: 1.5rem;
    }
    .cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 1rem;
    }
    .metric {
      font-size: 2rem;
      font-weight: bold;
      color: #1976d2;
      margin-top: 0.5rem;
    }
  `],
})
export class AdminDashboardComponent implements OnInit, OnDestroy {
  private intervalId?: number;

  loading = signal(false);
  error = signal<string | null>(null);
  data = signal<any>(null);

  constructor(private adminApiService: AdminApiService) {}

  ngOnInit() {
    this.loadDashboard();
    this.intervalId = window.setInterval(() => this.loadDashboard(), 60000);
  }

  ngOnDestroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  loadDashboard() {
    this.loading.set(true);
    this.error.set(null);
    this.adminApiService.getDashboard().subscribe({
      next: (res: any) => {
        this.data.set(res);
        this.loading.set(false);
      },
      error: (err: any) => {
        this.error.set(err.message || 'Failed to load dashboard');
        this.loading.set(false);
      },
    });
  }
}
