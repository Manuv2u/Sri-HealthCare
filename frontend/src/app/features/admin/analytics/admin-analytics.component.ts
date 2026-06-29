import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminApiService } from '../../../core/api/services/admin-api.service';
import { SpinnerComponent } from '../../../shared/components/spinner/spinner.component';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { AlertComponent } from '../../../shared/components/alert/alert.component';
import { BadgeComponent } from '../../../shared/components/badge/badge.component';

@Component({
  selector: 'app-admin-analytics',
  standalone: true,
  imports: [CommonModule, FormsModule, SpinnerComponent, ButtonComponent, AlertComponent, BadgeComponent],
  template: `
<div class="page">
  <div class="page-header">
    <div><h1 class="page-title">Analytics & Reports</h1><p class="page-sub">Revenue, bookings, and operational insights</p></div>
    <div class="header-actions">
      <div class="date-range">
        <input type="date" [(ngModel)]="dateFrom" class="date-inp" />
        <span class="date-sep">to</span>
        <input type="date" [(ngModel)]="dateTo" class="date-inp" />
      </div>
      <button class="apply-btn" (click)="load()" [disabled]="loading()">Apply</button>
      <button class="export-btn" (click)="exportCsv()" [disabled]="exporting()">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:5px"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        {{ exporting() ? 'Exporting…' : 'Export CSV' }}
      </button>
    </div>
  </div>

  @if (error()) { <app-alert type="error" [dismissible]="true" (dismissed)="error.set('')">{{ error() }}</app-alert> }

  @if (loading()) { <div class="load-wrap"><app-spinner size="md" /></div>
  } @else if (data()) {

    <!-- KPI Row -->
    <div class="kpi-row">
      @for (k of kpiCards(); track k.label) {
        <div class="kpi-card" [style.--accent]="k.color">
          <div class="kpi-label">{{ k.label }}</div>
          <div class="kpi-val">{{ k.prefix || '' }}{{ fmt(k.value) }}</div>
          @if (k.sub) { <div class="kpi-sub">{{ k.sub }}</div> }
        </div>
      }
    </div>

    <!-- Charts section -->
    <div class="charts-row">

      <!-- Bookings by status -->
      @if (data()?.bookings_by_status) {
        <div class="chart-card">
          <h3 class="chart-title">Bookings by Status</h3>
          <div class="bar-chart">
            @for (item of statusItems(); track item.label) {
              <div class="bar-row">
                <span class="bar-label">{{ item.label }}</span>
                <div class="bar-track">
                  <div class="bar-fill" [style.width]="item.pct + '%'" [style.background]="item.color"></div>
                </div>
                <span class="bar-val">{{ item.value }}</span>
              </div>
            }
          </div>
        </div>
      }

      <!-- Revenue by day -->
      @if (data()?.daily_revenue?.length) {
        <div class="chart-card">
          <h3 class="chart-title">Revenue Trend (Last 7 Days)</h3>
          <div class="sparkline">
            @for (d of recentRevenue(); track d.date) {
              <div class="spark-col">
                <div class="spark-bar-wrap">
                  <div class="spark-bar" [style.height]="d.pct + '%'" title="₹{{ d.amount }}"></div>
                </div>
                <span class="spark-lbl">{{ d.label }}</span>
              </div>
            }
          </div>
        </div>
      }
    </div>

    <!-- Top tests -->
    @if (data()?.top_tests?.length) {
      <div class="section-card">
        <h3 class="section-title">Top Requested Tests</h3>
        <div class="rank-list">
          @for (t of data()!.top_tests.slice(0,10); track t.test_name; let i = $index) {
            <div class="rank-row">
              <span class="rank-num">{{ i + 1 }}</span>
              <span class="rank-name">{{ t.test_name }}</span>
              <div class="rank-bar-wrap">
                <div class="rank-bar" [style.width]="(t.count / data()!.top_tests[0].count * 100) + '%'"></div>
              </div>
              <span class="rank-count">{{ t.count }}</span>
            </div>
          }
        </div>
      </div>
    }

    <!-- Collection type split -->
    @if (data()?.collection_type_split) {
      <div class="split-row">
        @for (item of collectionItems(); track item.label) {
          <div class="split-card" [style.--c]="item.color">
            <div class="split-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path [attr.d]="item.icon"/></svg></div>
            <span class="split-label">{{ item.label }}</span>
            <span class="split-val">{{ item.value }}</span>
            <span class="split-pct">{{ item.pct }}%</span>
          </div>
        }
      </div>
    }

  } @else {
    <div class="empty-analytics">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
      <p>Select a date range and click Apply to load analytics.</p>
    </div>
  }
</div>`,
  styles: [`
    .page { display:flex; flex-direction:column; gap:1.5rem; }
    .page-header { display:flex; justify-content:space-between; align-items:flex-start; gap:1rem; flex-wrap:wrap; }
    .page-title { font-size:1.5rem; font-weight:700; color:#0F172A; margin:0 0 0.25rem 0; }
    .page-sub { font-size:0.875rem; color:#475569; margin:0; }
    .header-actions { display:flex; align-items:center; gap:0.75rem; flex-wrap:wrap; }
    .date-range { display:flex; align-items:center; gap:0.5rem; }
    .date-inp { height:40px; padding:0 0.75rem; font-size:0.875rem; color:#0F172A; background:#FFFFFF; border:1px solid #E2E8F0; border-radius:0.75rem; &:focus { outline:none; border-color:#319795; } }
    .date-sep { font-size:0.875rem; color:#94A3B8; }
    .apply-btn { height:40px; padding:0 1.25rem; background:#2C7A7B; color:#FFFFFF; border:none; border-radius:0.75rem; font-size:0.875rem; font-weight:600; cursor:pointer; transition:background 150ms; &:hover:not(:disabled) { background:#285E61; } &:disabled { opacity:.6; cursor:not-allowed; } }
    .export-btn { height:40px; padding:0 1rem; display:inline-flex; align-items:center; background:#FFFFFF; border:1px solid #E2E8F0; border-radius:0.75rem; font-size:0.875rem; color:#475569; cursor:pointer; transition:all 150ms; &:hover:not(:disabled) { border-color:#38B2AC; color:#2C7A7B; } &:disabled { opacity:.6; cursor:not-allowed; } }
    .load-wrap { display:flex; justify-content:center; padding:3rem; }
    .kpi-row { display:grid; grid-template-columns:repeat(auto-fill,minmax(180px,1fr)); gap:1rem; }
    .kpi-card { background:#FFFFFF; border:1px solid #F1F5F9; border-radius:1rem; padding:1.25rem; border-left:4px solid var(--accent,#{#319795}); }
    .kpi-label { font-size:0.75rem; font-weight:600; color:#94A3B8; text-transform:uppercase; letter-spacing:0.025em; margin-bottom:0.5rem; }
    .kpi-val { font-size:1.875rem; font-weight:700; color:#0F172A; line-height:1; }
    .kpi-sub { font-size:0.75rem; color:#94A3B8; margin-top:0.25rem; }
    .charts-row { display:grid; grid-template-columns:repeat(2,1fr); gap:1.25rem; }
    .chart-card, .section-card { background:#FFFFFF; border:1px solid #F1F5F9; border-radius:1rem; padding:1.5rem; }
    .chart-title, .section-title { font-size:1rem; font-weight:600; color:#0F172A; margin:0 0 1.25rem 0; }
    .bar-chart { display:flex; flex-direction:column; gap:0.75rem; }
    .bar-row { display:grid; grid-template-columns:100px 1fr 40px; align-items:center; gap:0.75rem; }
    .bar-label { font-size:0.875rem; color:#475569; text-transform:capitalize; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .bar-track { height:8px; background:#F8FAFC; border-radius:9999px; overflow:hidden; }
    .bar-fill { height:100%; border-radius:9999px; transition:width .5s ease; }
    .bar-val { font-size:0.875rem; font-weight:600; color:#0F172A; text-align:right; }
    .sparkline { display:flex; align-items:flex-end; gap:0.5rem; height:120px; }
    .spark-col { flex:1; display:flex; flex-direction:column; align-items:center; gap:0.25rem; height:100%; }
    .spark-bar-wrap { flex:1; width:100%; display:flex; align-items:flex-end; }
    .spark-bar { width:100%; background:#38B2AC; border-radius:0.25rem 0.25rem 0 0; min-height:4px; transition:height .4s ease; }
    .spark-lbl { font-size:0.625rem; color:#94A3B8; white-space:nowrap; }
    .rank-list { display:flex; flex-direction:column; gap:0.75rem; }
    .rank-row { display:grid; grid-template-columns:28px 1fr 120px 40px; align-items:center; gap:0.75rem; }
    .rank-num { font-size:0.875rem; font-weight:700; color:#94A3B8; text-align:center; }
    .rank-name { font-size:0.875rem; font-weight:500; color:#0F172A; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .rank-bar-wrap { height:6px; background:#F8FAFC; border-radius:9999px; overflow:hidden; }
    .rank-bar { height:100%; background:#38B2AC; border-radius:9999px; }
    .rank-count { font-size:0.875rem; font-weight:600; color:#0F172A; text-align:right; }
    .split-row { display:grid; grid-template-columns:repeat(auto-fill,minmax(200px,1fr)); gap:1rem; }
    .split-card { background:#FFFFFF; border:1px solid #F1F5F9; border-radius:1rem; padding:1.5rem; display:flex; flex-direction:column; align-items:center; gap:0.75rem; text-align:center; border-top:4px solid var(--c); }
    .split-icon { width:48px; height:48px; border-radius:0.75rem; background:rgba(var(--c,0),0.1); display:flex; align-items:center; justify-content:center; svg { width:24px; height:24px; color:var(--c); } }
    .split-label { font-size:0.875rem; color:#475569; }
    .split-val { font-size:1.875rem; font-weight:700; color:#0F172A; }
    .split-pct { font-size:0.875rem; color:#94A3B8; }
    .empty-analytics { display:flex; flex-direction:column; align-items:center; justify-content:center; padding:4rem; gap:1rem; color:#94A3B8; svg { width:48px; height:48px; color:#CBD5E1; } p { font-size:0.875rem; margin:0; } }
    @media(max-width:768px) { .charts-row { grid-template-columns:1fr; } .page-header { flex-direction:column; } .rank-row { grid-template-columns:24px 1fr 40px; } .rank-bar-wrap { display:none; } }
  `]
})
export class AdminAnalyticsComponent implements OnInit {
  loading = signal(false); exporting = signal(false); error = signal('');
  data = signal<any>(null);
  dateFrom = ''; dateTo = '';

  kpiCards = computed(() => {
    const d = this.data();
    if (!d) return [];
    return [
      { label:'Total Bookings', value:d.total_bookings||0, color:'#319795', sub:undefined, prefix:undefined },
      { label:'Completed', value:d.completed_bookings||0, color:'#38A169', sub:undefined, prefix:undefined },
      { label:'Cancelled', value:d.cancelled_bookings||0, color:'#EF4444', sub:undefined, prefix:undefined },
      { label:'Revenue', value:d.total_revenue||0, color:'#5A67D8', prefix:'₹', sub:undefined },
      { label:'Avg Order Value', value:d.avg_order_value||0, color:'#DD6B20', prefix:'₹', sub:undefined },
      { label:'New Users', value:d.new_users||0, color:'#0EA5E9', sub:undefined, prefix:undefined },
    ];
  });

  statusItems = computed(() => {
    const d = this.data()?.bookings_by_status;
    if (!d) return [];
    const total = Object.values(d).reduce((a: number, b: any) => a + b, 0) as number;
    const colors: Record<string,string> = { pending:'#F59E0B', confirmed:'#0EA5E9', in_progress:'#319795', completed:'#38A169', cancelled:'#EF4444' };
    return Object.entries(d).map(([k, v]: any) => ({ label:k.replace(/_/g,' '), value:v, pct:total ? Math.round(v/total*100) : 0, color:colors[k]||'#94A3B8' }));
  });

  recentRevenue = computed(() => {
    const list = this.data()?.daily_revenue || [];
    const recent = list.slice(-7);
    const max = Math.max(...recent.map((d: any) => d.amount), 1);
    return recent.map((d: any) => ({ date:d.date, amount:d.amount, pct:Math.max(Math.round(d.amount/max*100), 4), label:new Date(d.date).toLocaleDateString('en',{weekday:'short'}) }));
  });

  collectionItems = computed(() => {
    const d = this.data()?.collection_type_split;
    if (!d) return [];
    const total = Object.values(d).reduce((a: number, b: any) => a + b, 0) as number;
    return [
      { label:'Home Collection', value:d.home||0, pct:total?Math.round((d.home||0)/total*100):0, color:'#319795', icon:'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z' },
      { label:'Lab Visit', value:d.lab||0, pct:total?Math.round((d.lab||0)/total*100):0, color:'#5A67D8', icon:'M19 21V5a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v16M1 21h22' },
    ];
  });

  constructor(private adminApi: AdminApiService) {}

  ngOnInit() {
    const now = new Date();
    const first = new Date(now.getFullYear(), now.getMonth(), 1);
    this.dateFrom = first.toISOString().split('T')[0];
    this.dateTo = now.toISOString().split('T')[0];
    this.load();
  }

  load() {
    this.loading.set(true);
    this.adminApi.getAnalytics({ date_from: this.dateFrom, date_to: this.dateTo }).subscribe({
      next: d => { this.data.set(d); this.loading.set(false); },
      error: () => { this.error.set('Failed to load analytics.'); this.loading.set(false); }
    });
  }

  exportCsv() {
    this.exporting.set(true);
    this.adminApi.exportCsv({ date_from: this.dateFrom, date_to: this.dateTo }).subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `analytics-${this.dateFrom}-to-${this.dateTo}.csv`;
        a.click(); URL.revokeObjectURL(url);
        this.exporting.set(false);
      },
      error: () => { this.error.set('Export failed.'); this.exporting.set(false); }
    });
  }

  fmt(n: number): string { if (n >= 100000) return (n/100000).toFixed(1)+'L'; if (n >= 1000) return (n/1000).toFixed(1)+'K'; return n.toLocaleString('en-IN'); }
}
