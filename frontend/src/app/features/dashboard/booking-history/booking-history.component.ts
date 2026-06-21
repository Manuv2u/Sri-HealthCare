import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { Booking, BookingItem, FamilyMember, Report } from '../../../core/api/api.types';
import { BookingApiService } from '../../../core/api/services/booking-api.service';
import { UserApiService } from '../../../core/api/services/user-api.service';
import { ReportApiService } from '../../../core/api/services/report-api.service';
import { AuthStateService } from '../../../core/auth/auth-state.service';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner.component';
import { ErrorBannerComponent } from '../../../shared/components/error-banner.component';

@Component({
  selector: 'app-booking-history',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, MatIconModule, LoadingSpinnerComponent, ErrorBannerComponent],
  template: `
    <div class="dashboard-layout">
      <!-- Sidebar -->
      <aside class="dash-sidebar">
        <div class="dash-brand">
          <strong>SRI Diagnostics</strong>
          <span>CLINICAL PRECISION</span>
        </div>
        <nav class="dash-nav">
          <a routerLink="/dashboard" routerLinkActive="active" [routerLinkActiveOptions]="{exact:true}" class="dash-nav-item">
            <mat-icon>dashboard</mat-icon> Dashboard
          </a>
          <a routerLink="/dashboard" routerLinkActive="active" [routerLinkActiveOptions]="{exact:true}" class="dash-nav-item">
            <mat-icon>calendar_today</mat-icon> My Bookings
          </a>
          <a routerLink="/profile/family" routerLinkActive="active" class="dash-nav-item">
            <mat-icon>people</mat-icon> Family Members
          </a>
          <a routerLink="/lab-locations" routerLinkActive="active" class="dash-nav-item">
            <mat-icon>location_on</mat-icon> Lab Locations
          </a>
          <a routerLink="/profile" routerLinkActive="active" [routerLinkActiveOptions]="{exact:true}" class="dash-nav-item">
            <mat-icon>settings</mat-icon> Settings
          </a>
        </nav>
        <div class="dash-user-card">
          <div class="dash-avatar">{{ initials() }}</div>
          <div>
            <div class="dash-user-name">{{ userName() }}</div>
            <div class="dash-user-id">Patient ID: #{{ shortId() }}</div>
          </div>
        </div>
      </aside>

      <!-- Main -->
      <main class="dash-main">
        <div class="dash-header">
          <div>
            <h1>{{ greeting() }}, {{ firstName() }}</h1>
            <p>Welcome back to your health dashboard. All your clinical data is up to date.</p>
          </div>
          <a routerLink="/booking" class="btn-book-new">
            <mat-icon>add</mat-icon> Book New Test
          </a>
        </div>

        <!-- KPI cards -->
        <div class="kpi-row">
          <div class="kpi-card">
            <div class="kpi-icon blue"><mat-icon>calendar_today</mat-icon></div>
            <div class="kpi-info">
              <div class="kpi-badge blue">Next: Today</div>
              <div class="kpi-label">Active Bookings</div>
              <div class="kpi-value">{{ activeBookings() }}</div>
            </div>
          </div>
          <div class="kpi-card">
            <div class="kpi-icon teal"><mat-icon>description</mat-icon></div>
            <div class="kpi-info">
              <div class="kpi-badge teal">New</div>
              <div class="kpi-label">Reports Ready</div>
              <div class="kpi-value">{{ total() }}</div>
            </div>
          </div>
          <div class="kpi-card">
            <div class="kpi-icon gray"><mat-icon>people</mat-icon></div>
            <div class="kpi-info">
              <div class="kpi-badge gray">&nbsp;</div>
              <div class="kpi-label">Family Members</div>
              <div class="kpi-value">{{ familyMemberCount() }}</div>
            </div>
          </div>
        </div>

        <div class="dash-content-grid">
          <!-- Recent Bookings -->
          <div class="bookings-section">
            <div class="section-header">
              <h2>Recent Bookings</h2>
              <a routerLink="/dashboard" class="view-all">View All →</a>
            </div>

            <app-loading-spinner *ngIf="loading()" />
            <app-error-banner *ngIf="error()" [message]="error()!" [retryLabel]="'Retry'" (retry)="load()" />

            @if (!loading() && !error()) {
              <div class="table-wrap">
              <table class="bookings-table">
                <thead>
                  <tr>
                    <th>BOOKING ID</th>
                    <th>TEST NAME</th>
                    <th>DATE</th>
                    <th>STATUS</th>
                    <th>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  @if (bookings().length === 0) {
                    <tr><td colspan="5" class="empty-row">No bookings yet. <a routerLink="/tests">Book your first test</a></td></tr>
                  }
                  @for (b of bookings(); track b.id) {
                    <tr [class.row-expanded]="expandedId() === b.id">
                      <td class="ref-cell">{{ b.reference_number }}</td>
                      <td>
                        <div class="test-name-cell">{{ bookingLabel(b) }}</div>
                        <div class="test-sub">{{ b.collection_type === 'home' ? 'Home Collection' : 'Lab Visit' }}</div>
                      </td>
                      <td>{{ b.booking_date | date:'MMM d, y' }}</td>
                      <td><span class="status-badge" [class]="statusClass(b.status)">{{ b.status | titlecase }}</span></td>
                      <td>
                        <button class="action-link" (click)="toggleExpand(b.id)">
                          {{ expandedId() === b.id ? 'Close' : 'View' }}
                        </button>
                      </td>
                    </tr>
                    @if (expandedId() === b.id) {
                      <tr class="detail-row">
                        <td colspan="5">
                          <div class="detail-panel">
                            <div class="detail-items">
                              @for (item of (b.items ?? []); track item.id) {
                                <div class="detail-item">
                                  <span class="item-type-badge">{{ item.item_type }}</span>
                                  <span class="item-name">{{ item.item_name || '—' }}</span>
                                  <span class="item-price">₹{{ item.unit_price | number:'1.0-0' }}</span>
                                </div>
                              }
                              @if (!(b.items?.length)) {
                                <span class="no-items">No item details available.</span>
                              }
                            </div>
                            <div class="detail-meta">
                              <span>Payment: <strong>{{ b.payment_status | titlecase }}</strong></span>
                            </div>
                          </div>
                        </td>
                      </tr>
                    }
                  }
                </tbody>
              </table>
              </div>
            }
          </div>

          <!-- Right panel -->
          <div class="right-panel">
            <!-- Latest Reports -->
            <div class="reports-section">
              <div class="section-header">
                <h2>Latest Reports</h2>
                <a routerLink="/reports" class="view-all">View All →</a>
              </div>
              @if (reportsLoading()) {
                <div class="reports-loading">Loading…</div>
              } @else if (reports().length === 0) {
                <div class="reports-empty">
                  <mat-icon>description</mat-icon>
                  <span>No reports available yet.</span>
                </div>
              } @else {
                <div class="report-list">
                  @for (r of reports(); track r.id; let i = $index) {
                    <div class="report-item">
                      <div class="report-icon" [class]="reportIconClass(i)"><mat-icon>picture_as_pdf</mat-icon></div>
                      <div class="report-info">
                        <div class="report-name">{{ r.file_name }}</div>
                        <div class="report-date">{{ r.uploaded_at | date:'MMM d, y' }}</div>
                      </div>
                      <button class="report-dl" (click)="downloadReport(r)" title="Download">
                        <mat-icon>download</mat-icon>
                      </button>
                    </div>
                  }
                </div>
              }
            </div>

            <!-- Promo card -->
            <div class="promo-card">
              <div class="promo-tag">SEASONAL HEALTH</div>
              <h3>Full Body Wellness Checkup</h3>
              <p>Early detection saves lives. Get a comprehensive screening for 80+ parameters.</p>
              <div class="promo-price">
                <span class="promo-eff">₹149</span>
                <span class="promo-orig">₹299</span>
              </div>
              <a routerLink="/packages" class="btn-promo">Book Special Offer</a>
            </div>
          </div>
        </div>
      </main>
    </div>
  `,
  styles: [`
    .dashboard-layout { display:grid; grid-template-columns:220px 1fr; min-height:calc(100vh - 64px); }

    /* Sidebar */
    .dash-sidebar { background:#fff; border-right:1px solid #e2e8f0; padding:1.5rem 1rem; display:flex; flex-direction:column; gap:1.5rem; }
    .dash-brand { padding:.5rem .5rem 1rem; border-bottom:1px solid #f0f4f8;
      strong { display:block; font-size:1rem; font-weight:800; color:#1a202c; }
      span { font-size:.65rem; font-weight:600; color:#718096; letter-spacing:.1em; }
    }
    .dash-nav { display:flex; flex-direction:column; gap:.25rem; flex:1; }
    .dash-nav-item { display:flex; align-items:center; gap:.75rem; padding:.6rem .75rem; border-radius:10px; font-size:.875rem; font-weight:500; color:#718096; text-decoration:none; transition:all .15s;
      mat-icon { font-size:1.1rem; width:1.1rem; height:1.1rem; }
      &:hover { background:#f7fafc; color:#2d3748; }
      &.active { background:#e0f2f1; color:#00796b; font-weight:600; }
    }
    .dash-user-card { display:flex; align-items:center; gap:.75rem; padding:.75rem; background:#f7fafc; border-radius:10px; }
    .dash-avatar { width:36px; height:36px; border-radius:50%; background:#00796b; color:#fff; display:flex; align-items:center; justify-content:center; font-size:.85rem; font-weight:700; flex-shrink:0; }
    .dash-user-name { font-size:.85rem; font-weight:600; color:#1a202c; }
    .dash-user-id { font-size:.75rem; color:#718096; }

    /* Main */
    .dash-main { padding:2rem; background:#f7fafc; display:flex; flex-direction:column; gap:1.5rem; }
    .dash-header { display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:1rem;
      h1 { font-size:1.75rem; font-weight:800; color:#1a202c; }
      p { font-size:.875rem; color:#718096; margin-top:.25rem; }
    }
    .btn-book-new { display:inline-flex; align-items:center; gap:.4rem; background:#1a56db; color:#fff; border:none; border-radius:10px; padding:.6rem 1.25rem; font-size:.875rem; font-weight:600; text-decoration:none; cursor:pointer; transition:background .15s;
      mat-icon { font-size:1rem; width:1rem; height:1rem; }
      &:hover { background:#1e429f; }
    }

    /* KPI */
    .kpi-row { display:grid; grid-template-columns:repeat(3,1fr); gap:1rem; }
    .kpi-card { background:#fff; border-radius:14px; border:1px solid #e2e8f0; padding:1.25rem; display:flex; align-items:center; gap:1rem; box-shadow:0 1px 3px rgba(0,0,0,.05); }
    .kpi-icon { width:52px; height:52px; border-radius:14px; display:flex; align-items:center; justify-content:center; flex-shrink:0;
      mat-icon { font-size:1.4rem; width:1.4rem; height:1.4rem; }
      &.blue { background:#ebf8ff; mat-icon{color:#3182ce;} }
      &.teal { background:#e0f2f1; mat-icon{color:#00796b;} }
      &.gray { background:#f7fafc; mat-icon{color:#718096;} }
    }
    .kpi-info { display:flex; flex-direction:column; gap:.2rem; }
    .kpi-badge { font-size:.65rem; font-weight:700; padding:.1rem .5rem; border-radius:999px; width:fit-content;
      &.blue { background:#ebf8ff; color:#3182ce; }
      &.teal { background:#c6f6d5; color:#276749; }
      &.gray { background:transparent; color:transparent; }
    }
    .kpi-label { font-size:.8rem; color:#718096; }
    .kpi-value { font-size:1.75rem; font-weight:800; color:#1a202c; line-height:1; }

    /* Content grid */
    .dash-content-grid { display:grid; grid-template-columns:1fr 320px; gap:1.5rem; align-items:start; }

    /* Bookings */
    .bookings-section { background:#fff; border-radius:14px; border:1px solid #e2e8f0; padding:1.5rem; }
    .section-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:1.25rem;
      h2 { font-size:1.1rem; font-weight:700; color:#1a202c; }
    }
    .view-all { font-size:.875rem; color:#1a56db; font-weight:600; text-decoration:none; &:hover{text-decoration:underline;} }
    .bookings-table { width:100%; border-collapse:collapse;
      th { font-size:.7rem; font-weight:700; color:#718096; text-transform:uppercase; letter-spacing:.06em; padding:.6rem .75rem; text-align:left; border-bottom:1px solid #f0f4f8; }
      td { padding:.75rem; border-bottom:1px solid #f7fafc; font-size:.875rem; color:#2d3748; }
      tr:last-child td { border-bottom:none; }
    }
    .ref-cell { font-weight:700; color:#1a56db; font-size:.85rem; }
    .test-name-cell { font-weight:600; }
    .test-sub { font-size:.75rem; color:#718096; }
    .status-badge { display:inline-flex; padding:.2rem .65rem; border-radius:999px; font-size:.75rem; font-weight:600;
      &.confirmed { background:#c6f6d5; color:#276749; }
      &.pending { background:#fefcbf; color:#744210; }
      &.processing { background:#bee3f8; color:#2a4365; }
      &.completed { background:#c6f6d5; color:#276749; }
      &.cancelled { background:#fed7d7; color:#9b2c2c; }
    }
    .action-link { background:none; border:none; color:#1a56db; font-size:.8rem; font-weight:600; cursor:pointer; &:hover{text-decoration:underline;} }
    .empty-row { text-align:center; color:#a0aec0; padding:2rem !important; a{color:#00796b;} }
    .row-expanded td { background:#f0fdf9; }
    .detail-row td { padding:0 !important; border-bottom:1px solid #b2dfdb; }
    .detail-panel { padding:.75rem 1rem; display:flex; flex-direction:column; gap:.5rem; }
    .detail-items { display:flex; flex-direction:column; gap:.35rem; }
    .detail-item { display:flex; align-items:center; gap:.6rem; font-size:.825rem; }
    .item-type-badge { font-size:.65rem; font-weight:700; text-transform:uppercase; background:#e0f2f1; color:#00796b; padding:.15rem .45rem; border-radius:6px; }
    .item-name { flex:1; color:#2d3748; font-weight:500; }
    .item-price { font-weight:700; color:#1a202c; }
    .detail-meta { font-size:.8rem; color:#718096; border-top:1px solid #e2e8f0; padding-top:.4rem; margin-top:.2rem; strong{color:#2d3748;} }
    .no-items { font-size:.8rem; color:#a0aec0; }

    /* Right panel */
    .right-panel { display:flex; flex-direction:column; gap:1.25rem; }
    .reports-section { background:#fff; border-radius:14px; border:1px solid #e2e8f0; padding:1.25rem;
      h2 { font-size:1rem; font-weight:700; color:#1a202c; }
    }
    .reports-loading { font-size:.85rem; color:#a0aec0; padding:.5rem 0; }
    .reports-empty { display:flex; align-items:center; gap:.5rem; color:#a0aec0; font-size:.85rem; padding:.5rem 0;
      mat-icon { font-size:1.1rem; width:1.1rem; height:1.1rem; }
    }
    .report-list { display:flex; flex-direction:column; gap:.75rem; }
    .report-item { display:flex; align-items:center; gap:.75rem; }
    .report-icon { width:36px; height:36px; border-radius:8px; display:flex; align-items:center; justify-content:center; flex-shrink:0;
      mat-icon { font-size:1.1rem; width:1.1rem; height:1.1rem; }
      &.red { background:#fed7d7; mat-icon{color:#e53e3e;} }
      &.green { background:#c6f6d5; mat-icon{color:#276749;} }
      &.blue { background:#bee3f8; mat-icon{color:#2a4365;} }
    }
    .report-info { flex:1; }
    .report-name { font-size:.875rem; font-weight:600; color:#1a202c; }
    .report-date { font-size:.75rem; color:#718096; }
    .report-dl { background:#f7fafc; border:1px solid #e2e8f0; border-radius:8px; width:32px; height:32px; display:flex; align-items:center; justify-content:center; cursor:pointer; color:#718096;
      mat-icon { font-size:1rem; width:1rem; height:1rem; }
      &:hover { background:#e2e8f0; color:#2d3748; }
    }

    /* Promo */
    .promo-card { background:linear-gradient(135deg,#1a56db,#1e429f); border-radius:14px; padding:1.5rem; color:#fff;
      .promo-tag { font-size:.65rem; font-weight:700; letter-spacing:.1em; opacity:.8; margin-bottom:.5rem; }
      h3 { font-size:1.1rem; font-weight:800; margin-bottom:.5rem; }
      p { font-size:.85rem; opacity:.85; line-height:1.6; margin-bottom:1rem; }
    }
    .promo-price { display:flex; align-items:baseline; gap:.5rem; margin-bottom:1rem; }
    .promo-eff { font-size:1.5rem; font-weight:800; }
    .promo-orig { font-size:.9rem; opacity:.6; text-decoration:line-through; }
    .btn-promo { display:block; background:#fff; color:#1a56db; border:none; border-radius:8px; padding:.6rem 1rem; font-size:.875rem; font-weight:700; text-align:center; text-decoration:none; cursor:pointer; &:hover{background:#ebf8ff;} }

    .table-wrap { overflow-x:auto; -webkit-overflow-scrolling:touch; width:100%; }
    @media(max-width:900px){
      .dashboard-layout{grid-template-columns:1fr;}
      .dash-sidebar{display:none;}
      .dash-content-grid{grid-template-columns:1fr;}
      .kpi-row{grid-template-columns:1fr 1fr;}
      .dash-main{padding:1.25rem;}
    }
    @media(max-width:480px){
      .kpi-row{grid-template-columns:1fr;}
      .dash-header{flex-direction:column;}
      .btn-book-new{width:100%;justify-content:center;}
    }
  `],
})
export class BookingHistoryComponent implements OnInit {
  private auth = inject(AuthStateService);
  bookings = signal<Booking[]>([]);
  reports = signal<Report[]>([]);
  loading = signal(true);
  reportsLoading = signal(true);
  error = signal<string | null>(null);
  total = signal(0);
  familyMemberCount = signal(0);
  expandedId = signal<string | null>(null);
  pageSize = 5;

  readonly REPORT_ICON_CLASSES = ['red', 'green', 'blue'];

  userName = computed(() => this.auth.currentUser()?.name ?? '');
  firstName = computed(() => this.userName().split(' ')[0] || 'there');
  initials = computed(() => {
    const n = this.userName();
    return n ? n.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2) : 'U';
  });
  shortId = computed(() => {
    const id = this.auth.currentUser()?.id ?? '';
    return id.slice(-4).toUpperCase() || '0000';
  });
  activeBookings = computed(() =>
    this.bookings().filter((b: Booking) => b.status === 'confirmed' || b.status === 'booked' || b.status === 'pending').length
  );

  greeting = computed(() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good Morning';
    if (h < 17) return 'Good Afternoon';
    return 'Good Evening';
  });

  constructor(
    private bookingApi: BookingApiService,
    private userApi: UserApiService,
    private reportApi: ReportApiService,
  ) {}

  ngOnInit(): void { this.load(); this.loadFamilyMembers(); this.loadReports(); }

  load(): void {
    this.loading.set(true);
    this.bookingApi.list({ page: 1, page_size: this.pageSize }).subscribe({
      next: (res: { items: Booking[]; total: number }) => {
        this.bookings.set(res.items);
        this.total.set(res.total);
        this.loading.set(false);
      },
      error: () => { this.error.set('Failed to load bookings.'); this.loading.set(false); },
    });
  }

  loadFamilyMembers(): void {
    this.userApi.getFamilyMembers().subscribe({
      next: (members: FamilyMember[]) => this.familyMemberCount.set(members.filter((m: FamilyMember) => m.is_active && !m.deleted_at).length),
      error: () => {},
    });
  }

  loadReports(): void {
    this.reportsLoading.set(true);
    this.reportApi.list({ page: 1, page_size: 3 }).subscribe({
      next: (res: { items: Report[] }) => { this.reports.set(res.items); this.reportsLoading.set(false); },
      error: () => { this.reportsLoading.set(false); },
    });
  }

  toggleExpand(id: string): void {
    this.expandedId.set(this.expandedId() === id ? null : id);
  }

  downloadReport(r: Report): void {
    this.reportApi.getDownloadUrl(r.id).subscribe({
      next: (res: { download_url: string }) => window.open(res.download_url, '_blank'),
      error: () => {},
    });
  }

  reportIconClass(index: number): string {
    return this.REPORT_ICON_CLASSES[index % this.REPORT_ICON_CLASSES.length];
  }

  statusClass(status: string): string { return status.toLowerCase(); }

  bookingLabel(b: Booking): string {
    const items = b.items ?? [];
    if (!items.length) return b.collection_type === 'home' ? 'Home Collection' : 'Lab Visit';
    const names = items.map((i: BookingItem) => i.item_name).filter(Boolean);
    if (!names.length) return b.collection_type === 'home' ? 'Home Collection' : 'Lab Visit';
    return names.slice(0, 2).join(', ') + (names.length > 2 ? ` +${names.length - 2} more` : '');
  }
}
