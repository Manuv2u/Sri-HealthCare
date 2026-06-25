import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminApiService } from '../../../core/api/services/admin-api.service';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner.component';
import { ErrorBannerComponent } from '../../../shared/components/error-banner.component';

@Component({
  selector: 'app-admin-analytics',
  standalone: true,
  imports: [CommonModule, FormsModule, LoadingSpinnerComponent, ErrorBannerComponent],
  template: `
    <div class="analytics-page">

      <!-- Page Header -->
      <div class="page-header">
        <div class="header-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
        </div>
        <div class="header-text">
          <h1>Analytics</h1>
          <p>Review booking trends and revenue performance</p>
        </div>
      </div>

      <!-- Filter Card -->
      <div class="filter-card">
        <div class="filter-label">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          Date Range
        </div>
        <div class="filter-row">
          <div class="date-field">
            <label>From Date</label>
            <div class="date-wrap">
              <svg class="date-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              <input type="date" [(ngModel)]="dateFrom" class="date-input" />
            </div>
          </div>
          <div class="date-separator">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
          </div>
          <div class="date-field">
            <label>To Date</label>
            <div class="date-wrap">
              <svg class="date-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              <input type="date" [(ngModel)]="dateTo" class="date-input" />
            </div>
          </div>
          <div class="filter-actions">
            <button class="btn-load" (click)="loadAnalytics()">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
              Load Analytics
            </button>
            <button class="btn-export" (click)="exportCsv()">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Export CSV
            </button>
          </div>
        </div>
      </div>

      @if (loading()) {
        <app-loading-spinner />
      } @else if (error()) {
        <app-error-banner [message]="error()!" retryLabel="Retry" (retry)="loadAnalytics()" />
      } @else if (data()) {

        <!-- Summary Stats -->
        <div class="stats-grid">
          <div class="stat-card stat-bookings">
            <div class="stat-icon-wrap bookings-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ getTotalBookings() }}</div>
              <div class="stat-label">Total Bookings</div>
            </div>
          </div>
          <div class="stat-card stat-revenue">
            <div class="stat-icon-wrap revenue-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            </div>
            <div class="stat-content">
              <div class="stat-value">₹{{ getTotalRevenue() | number:'1.0-0' }}</div>
              <div class="stat-label">Total Revenue</div>
            </div>
          </div>
          <div class="stat-card stat-methods">
            <div class="stat-icon-wrap methods-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ (data()!.revenue_by_method || []).length }}</div>
              <div class="stat-label">Payment Methods</div>
            </div>
          </div>
        </div>

        <!-- Data Tables -->
        <div class="data-section">

          <!-- Bookings by Status -->
          <div class="section-card">
            <div class="section-header">
              <div class="section-header-left">
                <div class="section-icon bookings-section-icon">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                </div>
                <div>
                  <div class="section-title">Bookings by Status</div>
                  <div class="section-subtitle">Distribution across all booking states</div>
                </div>
              </div>
              <div class="section-badge">{{ (data()!.bookings_by_status || []).length }} statuses</div>
            </div>
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Status</th>
                    <th class="th-right">Count</th>
                    <th class="th-right">Share</th>
                  </tr>
                </thead>
                <tbody>
                  @for (row of (data()!.bookings_by_status || []); track row.status) {
                    <tr>
                      <td>
                        <div class="status-cell">
                          <span class="status-dot" [class]="getStatusClass(row.status)"></span>
                          {{ formatStatus(row.status) }}
                        </div>
                      </td>
                      <td class="count-cell">{{ row.count }}</td>
                      <td class="share-cell">
                        <div class="share-bar-wrap">
                          <div class="share-bar" [style.width]="getSharePercent(row.count) + '%'"></div>
                          <span class="share-pct">{{ getSharePercent(row.count) | number:'1.0-1' }}%</span>
                        </div>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>

          <!-- Revenue by Payment Method -->
          <div class="section-card">
            <div class="section-header">
              <div class="section-header-left">
                <div class="section-icon revenue-section-icon">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                </div>
                <div>
                  <div class="section-title">Revenue by Payment Method</div>
                  <div class="section-subtitle">Breakdown of earnings per channel</div>
                </div>
              </div>
              <div class="section-badge revenue-badge">₹{{ getTotalRevenue() | number:'1.0-0' }}</div>
            </div>
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Method</th>
                    <th class="th-right">Revenue</th>
                    <th class="th-right">Share</th>
                  </tr>
                </thead>
                <tbody>
                  @for (row of (data()!.revenue_by_method || []); track row.method) {
                    <tr>
                      <td>
                        <div class="method-cell">
                          <span class="method-icon">{{ getMethodIcon(row.method) }}</span>
                          {{ row.method | titlecase }}
                        </div>
                      </td>
                      <td class="revenue-cell">₹{{ row.revenue | number:'1.0-2' }}</td>
                      <td class="share-cell">
                        <div class="share-bar-wrap">
                          <div class="share-bar revenue-share-bar" [style.width]="getRevenueSharePercent(row.revenue) + '%'"></div>
                          <span class="share-pct">{{ getRevenueSharePercent(row.revenue) | number:'1.0-1' }}%</span>
                        </div>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>

        </div>
      } @else {
        <!-- Empty Prompt -->
        <div class="empty-prompt">
          <div class="empty-illustration">
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
          </div>
          <h3>No data loaded yet</h3>
          <p>Select a date range above and click <strong>Load Analytics</strong> to view your data</p>
          <button class="btn-load empty-btn" (click)="loadAnalytics()">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
            Load Analytics
          </button>
        </div>
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
      --shadow-orange: 0 4px 14px rgba(249,115,22,.22);
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    }

    .analytics-page {
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

    /* Filter Card */
    .filter-card {
      background: var(--surface);
      border-radius: var(--radius-lg);
      border: 1px solid var(--border);
      padding: 1.25rem 1.5rem;
      box-shadow: var(--shadow-sm);
    }
    .filter-label {
      display: flex;
      align-items: center;
      gap: .4rem;
      font-size: .75rem;
      font-weight: 700;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: .06em;
      margin-bottom: 1rem;
      color: var(--primary);
    }
    .filter-row {
      display: flex;
      align-items: flex-end;
      gap: 1rem;
      flex-wrap: wrap;
    }
    .date-field {
      display: flex;
      flex-direction: column;
      gap: .45rem;
    }
    .date-field label {
      font-size: .78rem;
      font-weight: 600;
      color: var(--text-secondary);
      letter-spacing: .01em;
    }
    .date-wrap {
      display: flex;
      align-items: center;
      gap: .5rem;
      background: var(--bg);
      border: 1.5px solid var(--border);
      border-radius: 10px;
      padding: .6rem .9rem;
      transition: border-color .15s, background .15s, box-shadow .15s;
    }
    .date-wrap:focus-within {
      border-color: var(--primary);
      background: var(--surface);
      box-shadow: 0 0 0 3px rgba(99,102,241,.12);
    }
    .date-icon {
      color: var(--muted);
      flex-shrink: 0;
    }
    .date-input {
      border: none;
      outline: none;
      font-size: .88rem;
      color: var(--text);
      background: transparent;
      font-family: inherit;
      cursor: pointer;
    }
    .date-input::-webkit-calendar-picker-indicator {
      cursor: pointer;
      opacity: .5;
    }
    .date-separator {
      color: var(--muted);
      padding-bottom: .65rem;
      flex-shrink: 0;
    }
    .filter-actions {
      display: flex;
      gap: .75rem;
      margin-left: auto;
    }
    .btn-load {
      display: inline-flex;
      align-items: center;
      gap: .45rem;
      background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
      color: #fff;
      border: none;
      border-radius: 10px;
      padding: .65rem 1.25rem;
      font-size: .875rem;
      font-weight: 600;
      cursor: pointer;
      transition: transform .15s, box-shadow .15s;
      box-shadow: var(--shadow-indigo);
      font-family: inherit;
      letter-spacing: .01em;
    }
    .btn-load:hover {
      transform: translateY(-1px);
      box-shadow: 0 6px 20px rgba(99,102,241,.35);
    }
    .btn-load:active { transform: translateY(0); }
    .btn-export {
      display: inline-flex;
      align-items: center;
      gap: .45rem;
      background: var(--surface);
      color: var(--text-secondary);
      border: 1.5px solid var(--border);
      border-radius: 10px;
      padding: .65rem 1.25rem;
      font-size: .875rem;
      font-weight: 600;
      cursor: pointer;
      transition: all .15s;
      font-family: inherit;
    }
    .btn-export:hover {
      border-color: var(--accent);
      color: var(--accent-dark);
      background: #FFF7ED;
      box-shadow: var(--shadow-orange);
      transform: translateY(-1px);
    }

    /* Summary Stats */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 1rem;
    }
    .stat-card {
      background: var(--surface);
      border-radius: var(--radius-lg);
      border: 1px solid var(--border);
      padding: 1.25rem;
      display: flex;
      align-items: center;
      gap: 1rem;
      box-shadow: var(--shadow-sm);
      transition: transform .15s, box-shadow .15s;
    }
    .stat-card:hover {
      transform: translateY(-2px);
      box-shadow: var(--shadow-md);
    }
    .stat-icon-wrap {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .bookings-icon {
      background: var(--primary-light);
      color: var(--primary);
    }
    .revenue-icon {
      background: #FFF7ED;
      color: var(--accent);
    }
    .methods-icon {
      background: #F0FDF4;
      color: var(--success);
    }
    .stat-content {}
    .stat-value {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--text);
      letter-spacing: -.02em;
      line-height: 1;
    }
    .stat-label {
      font-size: .78rem;
      color: var(--text-secondary);
      margin-top: .3rem;
      font-weight: 500;
    }

    /* Data Section */
    .data-section {
      display: grid;
      gap: 1.25rem;
      grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
    }
    .section-card {
      background: var(--surface);
      border-radius: var(--radius-lg);
      border: 1px solid var(--border);
      overflow: hidden;
      box-shadow: var(--shadow-sm);
    }
    .section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1rem 1.25rem;
      border-bottom: 1px solid var(--border);
      background: #FAFBFF;
    }
    .section-header-left {
      display: flex;
      align-items: center;
      gap: .75rem;
    }
    .section-icon {
      width: 32px;
      height: 32px;
      border-radius: 9px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .bookings-section-icon {
      background: var(--primary-light);
      color: var(--primary);
    }
    .revenue-section-icon {
      background: #FFF7ED;
      color: var(--accent);
    }
    .section-title {
      font-size: .88rem;
      font-weight: 700;
      color: var(--text);
    }
    .section-subtitle {
      font-size: .75rem;
      color: var(--muted);
      margin-top: .1rem;
    }
    .section-badge {
      font-size: .75rem;
      font-weight: 600;
      color: var(--primary);
      background: var(--primary-light);
      padding: .25rem .7rem;
      border-radius: 999px;
      white-space: nowrap;
    }
    .section-badge.revenue-badge {
      color: var(--accent-dark);
      background: #FFF7ED;
    }

    /* Table */
    .table-wrap { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; }
    th {
      padding: .65rem 1.25rem;
      text-align: left;
      font-size: .72rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: .06em;
      color: var(--muted);
      background: #FAFBFF;
      border-bottom: 1px solid var(--border);
    }
    .th-right { text-align: right; }
    td {
      padding: .75rem 1.25rem;
      font-size: .875rem;
      color: var(--text);
      border-bottom: 1px solid #F1F5F9;
    }
    tr:last-child td { border-bottom: none; }
    tr:hover td { background: #FAFBFF; }

    .status-cell {
      display: flex;
      align-items: center;
      gap: .55rem;
    }
    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      flex-shrink: 0;
    }
    .status-dot.status-confirmed { background: var(--success); }
    .status-dot.status-pending { background: var(--warning); }
    .status-dot.status-cancelled { background: var(--error); }
    .status-dot.status-completed { background: var(--primary); }
    .status-dot.status-default { background: var(--muted); }

    .method-cell {
      display: flex;
      align-items: center;
      gap: .5rem;
    }
    .method-icon {
      font-size: .9rem;
    }

    .count-cell {
      text-align: right;
      font-weight: 700;
      color: var(--primary);
      font-variant-numeric: tabular-nums;
    }
    .revenue-cell {
      text-align: right;
      font-weight: 700;
      color: var(--accent-dark);
      font-variant-numeric: tabular-nums;
    }
    .share-cell { text-align: right; min-width: 100px; }
    .share-bar-wrap {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: .5rem;
    }
    .share-bar {
      height: 6px;
      border-radius: 999px;
      background: linear-gradient(90deg, var(--primary-light), var(--primary));
      min-width: 4px;
      max-width: 80px;
      transition: width .3s;
    }
    .revenue-share-bar {
      background: linear-gradient(90deg, #FFF7ED, var(--accent));
    }
    .share-pct {
      font-size: .75rem;
      font-weight: 600;
      color: var(--text-secondary);
      min-width: 36px;
      text-align: right;
      font-variant-numeric: tabular-nums;
    }

    /* Empty State */
    .empty-prompt {
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
    .empty-prompt h3 {
      margin: 0;
      font-size: 1.1rem;
      font-weight: 700;
      color: var(--text);
    }
    .empty-prompt p {
      margin: 0;
      font-size: .875rem;
      color: var(--text-secondary);
      max-width: 340px;
      line-height: 1.6;
    }
    .empty-prompt strong { color: var(--primary); }
    .empty-btn { margin-top: .5rem; }
  `],
})
export class AdminAnalyticsComponent {
  dateFrom = '';
  dateTo = '';

  loading = signal(false);
  error = signal<string | null>(null);
  data = signal<any>(null);

  constructor(private adminApi: AdminApiService) {}

  loadAnalytics(): void {
    this.loading.set(true);
    this.error.set(null);
    const params: any = {};
    if (this.dateFrom) params.date_from = this.dateFrom;
    if (this.dateTo) params.date_to = this.dateTo;

    this.adminApi.getAnalytics(params).subscribe({
      next: (res) => { this.data.set(res); this.loading.set(false); },
      error: (err) => { this.error.set(err.message || 'Failed to load analytics'); this.loading.set(false); },
    });
  }

  exportCsv(): void {
    const params: any = {};
    if (this.dateFrom) params.date_from = this.dateFrom;
    if (this.dateTo) params.date_to = this.dateTo;

    this.adminApi.exportCsv(params).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `analytics-export.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: (err) => { this.error.set(err.message || 'Failed to export CSV'); },
    });
  }

  formatStatus(s: string): string {
    return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }

  getStatusClass(s: string): string {
    const lower = s.toLowerCase();
    if (lower.includes('confirm')) return 'status-confirmed';
    if (lower.includes('pend')) return 'status-pending';
    if (lower.includes('cancel')) return 'status-cancelled';
    if (lower.includes('complet')) return 'status-completed';
    return 'status-default';
  }

  getMethodIcon(method: string): string {
    const m = method.toLowerCase();
    if (m.includes('upi') || m.includes('gpay') || m.includes('phonepe')) return '📱';
    if (m.includes('card') || m.includes('credit') || m.includes('debit')) return '💳';
    if (m.includes('net') || m.includes('bank')) return '🏦';
    if (m.includes('cash')) return '💵';
    if (m.includes('wallet')) return '👛';
    return '💰';
  }

  getTotalBookings(): number {
    return (this.data()?.bookings_by_status || []).reduce((sum: number, r: any) => sum + r.count, 0);
  }

  getTotalRevenue(): number {
    return (this.data()?.revenue_by_method || []).reduce((sum: number, r: any) => sum + r.revenue, 0);
  }

  getSharePercent(count: number): number {
    const total = this.getTotalBookings();
    return total ? (count / total) * 100 : 0;
  }

  getRevenueSharePercent(revenue: number): number {
    const total = this.getTotalRevenue();
    return total ? (revenue / total) * 100 : 0;
  }
}
