import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AdminApiService } from '../../../core/api/services/admin-api.service';

interface DashboardData {
  total_users: number;
  bookings_today: number;
  bookings_month: number;
  revenue_today: number;
  revenue_month: number;
  pending_bookings: number;
}

const EMPTY_DASHBOARD: DashboardData = {
  total_users: 0,
  bookings_today: 0,
  bookings_month: 0,
  revenue_today: 0,
  revenue_month: 0,
  pending_bookings: 0,
};

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="dashboard">
      <div class="welcome-banner">
        <div class="welcome-content">
          <p class="welcome-label">Sri Health Admin Panel</p>
          <h1 class="welcome-title">{{ greeting }}, Admin</h1>
          <p class="welcome-date">{{ todayLabel }}</p>
        </div>
        <div class="live-indicator">
          <span class="live-dot"></span>
          <span>{{ loading() ? 'Loading...' : 'Live' }}</span>
        </div>
      </div>

      <div class="stats-grid">
        <div class="stat-card stat-primary">
          <div class="stat-value">{{ data().total_users }}</div>
          <div class="stat-label">Total Users</div>
        </div>
        <div class="stat-card stat-orange">
          <div class="stat-value">{{ data().bookings_today }}</div>
          <div class="stat-label">Bookings Today</div>
        </div>
        <div class="stat-card stat-green">
          <div class="stat-value">{{ data().bookings_month }}</div>
          <div class="stat-label">This Month</div>
        </div>
        <div class="stat-card stat-amber">
          <div class="stat-value">{{ data().pending_bookings }}</div>
          <div class="stat-label">Pending</div>
        </div>
      </div>

      <div class="section">
        <h2 class="section-title">Quick Actions</h2>
        <div class="actions-grid">
          <a routerLink="/admin/users" class="action-card">
            <span class="action-icon">👥</span>
            <span class="action-label">Users</span>
          </a>
          <a routerLink="/admin/tests" class="action-card">
            <span class="action-icon">🧪</span>
            <span class="action-label">Tests</span>
          </a>
          <a routerLink="/admin/packages" class="action-card">
            <span class="action-icon">📦</span>
            <span class="action-label">Packages</span>
          </a>
          <a routerLink="/admin/bookings" class="action-card">
            <span class="action-icon">📅</span>
            <span class="action-label">Bookings</span>
          </a>
          <a routerLink="/admin/technicians" class="action-card">
            <span class="action-icon">👨‍🔬</span>
            <span class="action-label">Technicians</span>
          </a>
          <a routerLink="/admin/analytics" class="action-card">
            <span class="action-icon">📊</span>
            <span class="action-label">Analytics</span>
          </a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dashboard {
      padding: 0;
      font-family: 'Inter', system-ui, sans-serif;
    }

    .welcome-banner {
      background: linear-gradient(135deg, #319795 0%, #2C7A7B 50%, #5A67D8 100%);
      border-radius: 16px;
      padding: 32px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-bottom: 24px;
      color: white;
    }

    .welcome-label {
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      opacity: 0.8;
      margin: 0 0 8px 0;
    }

    .welcome-title {
      font-size: 28px;
      font-weight: 700;
      margin: 0 0 8px 0;
    }

    .welcome-date {
      font-size: 14px;
      opacity: 0.8;
      margin: 0;
    }

    .live-indicator {
      display: flex;
      align-items: center;
      gap: 8px;
      background: rgba(255,255,255,0.2);
      padding: 8px 16px;
      border-radius: 999px;
      font-size: 13px;
      font-weight: 500;
    }

    .live-dot {
      width: 8px;
      height: 8px;
      background: #4ADE80;
      border-radius: 50%;
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.5; transform: scale(0.8); }
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 32px;
    }

    .stat-card {
      background: white;
      border-radius: 12px;
      padding: 24px;
      border-left: 4px solid #319795;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }

    .stat-card.stat-primary { border-left-color: #5A67D8; }
    .stat-card.stat-orange { border-left-color: #DD6B20; }
    .stat-card.stat-green { border-left-color: #38A169; }
    .stat-card.stat-amber { border-left-color: #F59E0B; }

    .stat-value {
      font-size: 32px;
      font-weight: 700;
      color: #0F172A;
      line-height: 1;
      margin-bottom: 8px;
    }

    .stat-label {
      font-size: 13px;
      color: #64748B;
      font-weight: 500;
    }

    .section {
      margin-bottom: 32px;
    }

    .section-title {
      font-size: 18px;
      font-weight: 600;
      color: #0F172A;
      margin: 0 0 16px 0;
    }

    .actions-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 12px;
    }

    .action-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      padding: 24px 16px;
      background: white;
      border: 1px solid #E2E8F0;
      border-radius: 12px;
      text-decoration: none;
      color: #0F172A;
      transition: all 0.2s;
    }

    .action-card:hover {
      border-color: #319795;
      box-shadow: 0 4px 12px rgba(49, 151, 149, 0.15);
      transform: translateY(-2px);
    }

    .action-icon {
      font-size: 28px;
    }

    .action-label {
      font-size: 14px;
      font-weight: 600;
    }

    @media (max-width: 768px) {
      .welcome-banner {
        flex-direction: column;
        align-items: flex-start;
        gap: 16px;
      }

      .welcome-title {
        font-size: 22px;
      }

      .stats-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }
  `]
})
export class AdminDashboardComponent implements OnInit, OnDestroy {
  private timer?: number;
  loading = signal(false);
  data = signal<DashboardData>(EMPTY_DASHBOARD);

  get greeting() {
    const h = new Date().getHours();
    return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  }

  get todayLabel() {
    return new Date().toLocaleDateString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  constructor(private adminApi: AdminApiService) {}

  ngOnInit() {
    this.load();
    this.timer = window.setInterval(() => this.load(), 60000);
  }

  ngOnDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  load() {
    this.loading.set(true);
    this.adminApi.getDashboard().subscribe({
      next: (d) => {
        this.data.set({ ...EMPTY_DASHBOARD, ...d });
        this.loading.set(false);
      },
      error: () => {
        this.data.set(EMPTY_DASHBOARD);
        this.loading.set(false);
      },
    });
  }
}
