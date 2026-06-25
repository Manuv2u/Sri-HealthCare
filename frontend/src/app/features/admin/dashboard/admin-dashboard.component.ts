import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AdminApiService } from '../../../core/api/services/admin-api.service';
import { ErrorBannerComponent } from '../../../shared/components/error-banner.component';

const QUICK_LINKS = [
  { label: 'Manage Tests',       icon: 'biotech',          path: '/admin/tests',               accent: '#6366F1' },
  { label: 'Manage Packages',    icon: 'inventory_2',      path: '/admin/packages',            accent: '#F97316' },
  { label: 'Manage Technicians', icon: 'engineering',      path: '/admin/technicians',         accent: '#22C55E' },
  { label: 'View Bookings',      icon: 'calendar_month',   path: '/admin/bookings',            accent: '#F59E0B' },
  { label: 'User Management',    icon: 'people',           path: '/admin/users',               accent: '#EF4444' },
  { label: 'Analytics',          icon: 'bar_chart',        path: '/admin/analytics',           accent: '#0EA5E9' },
];

interface KpiConfig {
  key: keyof DashboardData;
  label: string;
  icon: string;
  prefix?: string;
  gradientA: string;
  gradientB: string;
  trendKey?: keyof DashboardData;
}

interface DashboardData {
  total_users?: number;
  bookings_today?: number;
  bookings_month?: number;
  pending_bookings?: number;
  revenue_today?: number;
  revenue_month?: number;
  [key: string]: number | undefined;
}

const KPI_CONFIGS: KpiConfig[] = [
  { key: 'total_users',       label: 'Total Users',           icon: 'people',           gradientA: '#6366F1', gradientB: '#818CF8' },
  { key: 'bookings_today',    label: 'Bookings Today',        icon: 'today',            gradientA: '#F97316', gradientB: '#FB923C' },
  { key: 'bookings_month',    label: 'Bookings This Month',   icon: 'calendar_month',   gradientA: '#22C55E', gradientB: '#4ADE80' },
  { key: 'pending_bookings',  label: 'Pending',               icon: 'pending_actions',  gradientA: '#F59E0B', gradientB: '#FCD34D' },
  { key: 'revenue_today',     label: 'Revenue Today',         icon: 'currency_rupee',   gradientA: '#0EA5E9', gradientB: '#38BDF8', prefix: '₹' },
  { key: 'revenue_month',     label: 'Revenue This Month',    icon: 'trending_up',      gradientA: '#EC4899', gradientB: '#F472B6', prefix: '₹' },
];

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule, ErrorBannerComponent],
  template: `
    <div class="dashboard">

      <!-- Welcome banner -->
      <div class="welcome-banner">
        <div class="welcome-left">
          <p class="welcome-eyebrow">Sri Health Admin</p>
          <h1 class="welcome-heading">{{ greeting }}, Admin</h1>
          <p class="welcome-date">{{ todayLabel }}</p>
        </div>
        <div class="welcome-right">
          <div class="refresh-badge" [class.loading]="loading()">
            <span class="refresh-dot"></span>
            <span class="refresh-text">{{ loading() ? 'Refreshing…' : 'Live · auto-refreshes every 60s' }}</span>
          </div>
        </div>
      </div>

      <!-- Error state -->
      @if (error()) {
        <app-error-banner [message]="error()!" retryLabel="Retry" (retry)="loadDashboard()" />
      }

      <!-- KPI grid -->
      <div class="kpi-grid">
        @if (loading() && !data()) {
          @for (s of skeletons; track s) {
            <div class="kpi-skeleton">
              <div class="skel skel-circle"></div>
              <div class="skel-body">
                <div class="skel skel-val"></div>
                <div class="skel skel-label"></div>
              </div>
            </div>
          }
        } @else {
          @for (cfg of kpiConfigs; track cfg.key) {
            <div class="kpi-card">
              <div class="kpi-icon-wrap"
                   [style.background]="'linear-gradient(135deg, ' + cfg.gradientA + ', ' + cfg.gradientB + ')'">
                <mat-icon>{{ cfg.icon }}</mat-icon>
              </div>
              <div class="kpi-body">
                <span class="kpi-value">{{ cfg.prefix ?? '' }}{{ formatNumber(data()?.[cfg.key] ?? 0) }}</span>
                <span class="kpi-label">{{ cfg.label }}</span>
              </div>
              <div class="kpi-glow" [style.background]="cfg.gradientA + '18'"></div>
            </div>
          }
        }
      </div>

      <!-- Quick actions -->
      <div class="section-header">
        <h2 class="section-title">Quick Actions</h2>
        <span class="section-subtitle">Navigate to key management areas</span>
      </div>

      <div class="quick-grid">
        @for (link of quickLinks; track link.path) {
          <a [routerLink]="link.path" class="quick-card"
             [style.--accent]="link.accent">
            <div class="quick-accent-bar"></div>
            <div class="quick-icon-wrap"
                 [style.background]="link.accent + '15'"
                 [style.color]="link.accent">
              <mat-icon>{{ link.icon }}</mat-icon>
            </div>
            <div class="quick-content">
              <span class="quick-label">{{ link.label }}</span>
              <span class="quick-hint">Manage &amp; configure</span>
            </div>
            <mat-icon class="quick-arrow">arrow_forward_ios</mat-icon>
          </a>
        }
      </div>

    </div>
  `,
  styles: [`
    /* ── Layout ── */
    .dashboard {
      display: flex;
      flex-direction: column;
      gap: 1.75rem;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }

    /* ── Welcome banner ── */
    .welcome-banner {
      background: linear-gradient(120deg, #4F46E5 0%, #6366F1 45%, #7C3AED 100%);
      border-radius: 16px;
      padding: 1.75rem 2rem;
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      gap: 1rem;
      position: relative;
      overflow: hidden;
      box-shadow: 0 8px 32px rgba(99, 102, 241, 0.32);
    }
    .welcome-banner::before {
      content: '';
      position: absolute;
      inset: 0;
      background:
        radial-gradient(ellipse 60% 80% at 90% 20%, rgba(249,115,22,0.18) 0%, transparent 60%),
        radial-gradient(ellipse 40% 50% at 10% 90%, rgba(255,255,255,0.06) 0%, transparent 60%);
      pointer-events: none;
    }
    .welcome-left { position: relative; }
    .welcome-eyebrow {
      margin: 0 0 .25rem;
      font-size: .7rem;
      font-weight: 600;
      letter-spacing: .1em;
      text-transform: uppercase;
      color: rgba(255,255,255,.65);
    }
    .welcome-heading {
      margin: 0 0 .4rem;
      font-size: 1.6rem;
      font-weight: 700;
      color: #fff;
      text-wrap: balance;
      line-height: 1.2;
    }
    .welcome-date {
      margin: 0;
      font-size: .8rem;
      color: rgba(255,255,255,.7);
    }
    .welcome-right { position: relative; flex-shrink: 0; }

    .refresh-badge {
      display: flex;
      align-items: center;
      gap: .5rem;
      background: rgba(255,255,255,.12);
      border: 1px solid rgba(255,255,255,.2);
      border-radius: 999px;
      padding: .35rem .85rem .35rem .6rem;
      backdrop-filter: blur(4px);
    }
    .refresh-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #4ADE80;
      flex-shrink: 0;
      animation: pulse-dot 2s ease-in-out infinite;
    }
    .refresh-badge.loading .refresh-dot {
      background: #FCD34D;
      animation: pulse-dot .8s ease-in-out infinite;
    }
    .refresh-text {
      font-size: .72rem;
      font-weight: 500;
      color: rgba(255,255,255,.9);
      white-space: nowrap;
    }

    @keyframes pulse-dot {
      0%, 100% { opacity: 1; transform: scale(1); }
      50%       { opacity: .5; transform: scale(.75); }
    }

    /* ── KPI grid ── */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
      gap: 1rem;
    }

    .kpi-card {
      background: #fff;
      border-radius: 14px;
      padding: 1.25rem;
      border: 1px solid #E2E8F0;
      display: flex;
      align-items: center;
      gap: 1rem;
      box-shadow: 0 1px 4px rgba(15, 23, 42, .05);
      position: relative;
      overflow: hidden;
      transition: transform .18s ease, box-shadow .18s ease;
    }
    .kpi-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(99, 102, 241, .12);
    }

    .kpi-glow {
      position: absolute;
      bottom: -16px;
      right: -16px;
      width: 72px;
      height: 72px;
      border-radius: 50%;
      pointer-events: none;
    }

    .kpi-icon-wrap {
      width: 46px;
      height: 46px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      box-shadow: 0 2px 8px rgba(0,0,0,.12);
    }
    .kpi-icon-wrap mat-icon {
      font-size: 1.3rem;
      width: 1.3rem;
      height: 1.3rem;
      color: #fff;
    }

    .kpi-body {
      display: flex;
      flex-direction: column;
      gap: .2rem;
      min-width: 0;
    }
    .kpi-value {
      font-size: 1.55rem;
      font-weight: 700;
      color: #0F172A;
      line-height: 1;
      font-variant-numeric: tabular-nums;
      letter-spacing: -.02em;
    }
    .kpi-label {
      font-size: .72rem;
      font-weight: 500;
      color: #94A3B8;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      letter-spacing: .01em;
    }

    /* ── Skeleton ── */
    .kpi-skeleton {
      background: #fff;
      border-radius: 14px;
      padding: 1.25rem;
      border: 1px solid #E2E8F0;
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    .skel {
      border-radius: 6px;
      background: linear-gradient(90deg, #EEF2FF 25%, #E0E7FF 50%, #EEF2FF 75%);
      background-size: 200% 100%;
      animation: shimmer 1.4s ease infinite;
    }
    .skel-circle { width: 46px; height: 46px; border-radius: 12px; flex-shrink: 0; }
    .skel-body { flex: 1; display: flex; flex-direction: column; gap: .4rem; }
    .skel-val { height: 1.6rem; width: 60%; }
    .skel-label { height: .7rem; width: 80%; }

    @keyframes shimmer {
      0%   { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }

    /* ── Section header ── */
    .section-header {
      display: flex;
      align-items: baseline;
      gap: .75rem;
    }
    .section-title {
      margin: 0;
      font-size: .9rem;
      font-weight: 700;
      color: #0F172A;
      letter-spacing: -.01em;
    }
    .section-subtitle {
      font-size: .75rem;
      color: #94A3B8;
      font-weight: 400;
    }

    /* ── Quick actions grid ── */
    .quick-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: .75rem;
    }

    .quick-card {
      background: #fff;
      border-radius: 12px;
      padding: 1rem 1rem 1rem 0;
      border: 1px solid #E2E8F0;
      display: flex;
      align-items: center;
      gap: .875rem;
      text-decoration: none;
      color: #0F172A;
      box-shadow: 0 1px 3px rgba(15, 23, 42, .04);
      position: relative;
      overflow: hidden;
      transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease;
    }
    .quick-card:hover {
      transform: translateY(-2px);
      border-color: var(--accent);
      box-shadow: 0 6px 18px rgba(99, 102, 241, .15);
    }
    .quick-card:focus-visible {
      outline: 2px solid var(--accent);
      outline-offset: 2px;
    }

    .quick-accent-bar {
      width: 4px;
      align-self: stretch;
      background: var(--accent);
      border-radius: 0 2px 2px 0;
      flex-shrink: 0;
    }

    .quick-icon-wrap {
      width: 38px;
      height: 38px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: background .18s;
    }
    .quick-icon-wrap mat-icon {
      font-size: 1.15rem;
      width: 1.15rem;
      height: 1.15rem;
    }
    .quick-card:hover .quick-icon-wrap {
      filter: brightness(1.08);
    }

    .quick-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: .1rem;
      min-width: 0;
    }
    .quick-label {
      font-size: .85rem;
      font-weight: 600;
      color: #0F172A;
    }
    .quick-hint {
      font-size: .7rem;
      color: #94A3B8;
    }

    .quick-arrow {
      font-size: .85rem !important;
      width: .85rem !important;
      height: .85rem !important;
      color: #CBD5E1;
      flex-shrink: 0;
      margin-right: .5rem;
      transition: color .18s, transform .18s;
    }
    .quick-card:hover .quick-arrow {
      color: var(--accent);
      transform: translateX(2px);
    }

    /* ── Responsive ── */
    @media (max-width: 640px) {
      .welcome-banner { padding: 1.25rem; flex-direction: column; align-items: flex-start; gap: .875rem; }
      .welcome-heading { font-size: 1.3rem; }
      .kpi-grid { grid-template-columns: repeat(2, 1fr); gap: .75rem; }
      .kpi-value { font-size: 1.3rem; }
      .quick-grid { grid-template-columns: 1fr; }
    }

    @media (prefers-reduced-motion: reduce) {
      .refresh-dot, .skel { animation: none; }
      .kpi-card, .quick-card { transition: none; }
    }
  `],
})
export class AdminDashboardComponent implements OnInit, OnDestroy {
  private intervalId?: number;

  quickLinks = QUICK_LINKS;
  kpiConfigs = KPI_CONFIGS;
  skeletons = Array(6).fill(0);

  loading = signal(false);
  error   = signal<string | null>(null);
  data    = signal<DashboardData | null>(null);

  get greeting(): string {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  }

  get todayLabel(): string {
    return new Date().toLocaleDateString('en-IN', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });
  }

  formatNumber(n: number): string {
    if (n >= 1_00_000) return (n / 1_00_000).toFixed(1).replace(/\.0$/, '') + 'L';
    if (n >= 1_000)    return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
    return n.toLocaleString('en-IN');
  }

  constructor(private adminApi: AdminApiService) {}

  ngOnInit() {
    this.loadDashboard();
    this.intervalId = window.setInterval(() => this.loadDashboard(), 60_000);
  }

  ngOnDestroy() {
    if (this.intervalId) clearInterval(this.intervalId);
  }

  loadDashboard() {
    this.loading.set(true);
    this.error.set(null);
    this.adminApi.getDashboard().subscribe({
      next:  (res) => { this.data.set(res); this.loading.set(false); },
      error: (err) => {
        this.error.set(err.error?.message || 'Failed to load dashboard');
        this.loading.set(false);
      },
    });
  }
}
