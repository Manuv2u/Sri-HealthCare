import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthStateService } from '../../core/auth/auth-state.service';

interface NavItem {
  label: string;
  icon: string;
  path: string;
}
interface NavSection {
  heading?: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    items: [
      { label: 'Dashboard', icon: 'dashboard', path: '/admin/dashboard' },
    ],
  },
  {
    heading: 'Operations',
    items: [
      { label: 'Bookings',      icon: 'calendar_month',  path: '/admin/bookings' },
      { label: 'Tests',         icon: 'biotech',         path: '/admin/tests' },
      { label: 'Packages',      icon: 'inventory_2',     path: '/admin/packages' },
      { label: 'Users',         icon: 'people',          path: '/admin/users' },
      { label: 'Technicians',   icon: 'engineering',     path: '/admin/technicians' },
      { label: 'Lab Branches',  icon: 'location_city',   path: '/admin/lab-branches' },
      { label: 'Service Areas', icon: 'map',             path: '/admin/service-areas' },
    ],
  },
  {
    heading: 'Insights',
    items: [
      { label: 'Analytics', icon: 'bar_chart', path: '/admin/analytics' },
    ],
  },
  {
    heading: 'Settings',
    items: [
      { label: 'Cancellation',  icon: 'cancel',     path: '/admin/cancellation-config' },
      { label: 'Payment',       icon: 'payments',   path: '/admin/payment-config' },
      { label: 'Feature Flags', icon: 'toggle_on',  path: '/admin/feature-flags' },
    ],
  },
];

// Flat list for pageTitle lookup
const NAV_ITEMS = NAV_SECTIONS.flatMap(s => s.items);

@Component({
  selector: 'app-admin-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, MatIconModule, MatButtonModule, MatTooltipModule],
  template: `
    <div class="admin-shell">

      <!-- Mobile backdrop -->
      @if (mobileOpen()) {
        <div class="mobile-backdrop" (click)="mobileOpen.set(false)"></div>
      }

      <!-- ═══ SIDEBAR ═══ -->
      <aside class="sidebar" [class.collapsed]="collapsed()" [class.mobile-open]="mobileOpen()">

        <!-- Logo -->
        <div class="sidebar-logo-row">
          <div class="logo-mark">
            <mat-icon class="logo-icon">local_hospital</mat-icon>
          </div>
          @if (showLabels()) {
            <div class="logo-text">
              <span class="logo-name">Sri Health</span>
              <span class="logo-sub">Admin Console</span>
            </div>
          }
          <button class="collapse-btn" (click)="collapsed.set(!collapsed())"
                  [matTooltip]="collapsed() ? 'Expand sidebar' : 'Collapse sidebar'"
                  matTooltipPosition="right">
            <mat-icon>{{ collapsed() ? 'chevron_right' : 'chevron_left' }}</mat-icon>
          </button>
        </div>

        <!-- Nav sections -->
        <nav class="sidebar-nav">
          @for (section of navSections; track $index; let first = $first) {
            @if (!first) {
              <div class="nav-divider"></div>
            }
            @if (section.heading && showLabels()) {
              <span class="nav-section-label">{{ section.heading }}</span>
            }
            @for (item of section.items; track item.path) {
              <a
                [routerLink]="item.path"
                routerLinkActive="active"
                class="nav-item"
                [matTooltip]="collapsed() && !mobileOpen() ? item.label : ''"
                matTooltipPosition="right"
                (click)="mobileOpen.set(false)"
              >
                <span class="nav-icon-wrap">
                  <mat-icon>{{ item.icon }}</mat-icon>
                </span>
                @if (showLabels()) {
                  <span class="nav-label">{{ item.label }}</span>
                }
                @if (showLabels()) {
                  <span class="nav-active-dot"></span>
                }
              </a>
            }
          }
        </nav>

        <!-- Sidebar footer -->
        <div class="sidebar-footer">
          @if (showLabels()) {
            <div class="admin-user-card">
              <div class="user-avatar">
                <mat-icon>admin_panel_settings</mat-icon>
              </div>
              <div class="user-info">
                <span class="user-name">{{ userName() }}</span>
                <span class="user-role">Administrator</span>
              </div>
            </div>
          }
          <div class="footer-actions">
            <a
              routerLink="/tests"
              class="footer-btn"
              [matTooltip]="collapsed() && !mobileOpen() ? 'Back to App' : ''"
              matTooltipPosition="right"
              (click)="mobileOpen.set(false)"
            >
              <mat-icon>arrow_back</mat-icon>
              @if (showLabels()) { <span>Back to App</span> }
            </a>
            <button
              class="footer-btn logout-btn"
              (click)="logout()"
              [matTooltip]="collapsed() && !mobileOpen() ? 'Sign Out' : ''"
              matTooltipPosition="right"
            >
              <mat-icon>logout</mat-icon>
              @if (showLabels()) { <span>Sign Out</span> }
            </button>
          </div>
        </div>

      </aside>

      <!-- ═══ MAIN ═══ -->
      <div class="admin-main">

        <!-- Topbar -->
        <header class="admin-topbar">
          <div class="topbar-left">
            <button class="mobile-menu-btn" (click)="mobileOpen.set(!mobileOpen())" aria-label="Toggle navigation">
              <mat-icon>{{ mobileOpen() ? 'close' : 'menu' }}</mat-icon>
            </button>
            <div class="breadcrumb">
              <span class="breadcrumb-root">Admin</span>
              <mat-icon class="breadcrumb-sep">chevron_right</mat-icon>
              <span class="breadcrumb-current">{{ pageTitle() }}</span>
            </div>
          </div>
          <div class="topbar-right">
            <div class="topbar-admin-chip">
              <div class="chip-dot"></div>
              <span>{{ userName() }}</span>
            </div>
          </div>
        </header>

        <!-- Content -->
        <div class="admin-content">
          <router-outlet></router-outlet>
        </div>

      </div>
    </div>
  `,
  styles: [`
    /* ─── Reset & base ─── */
    * { box-sizing: border-box; }

    .admin-shell {
      display: flex;
      min-height: 100vh;
      background: #F8F9FF;
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
    }

    /* ═══════════════════════════════════════
       SIDEBAR
    ═══════════════════════════════════════ */
    .sidebar {
      width: 260px;
      min-height: 100vh;
      background: #0F172A;
      display: flex;
      flex-direction: column;
      flex-shrink: 0;
      position: sticky;
      top: 0;
      height: 100vh;
      overflow-y: auto;
      overflow-x: hidden;
      transition: width 0.22s cubic-bezier(0.4, 0, 0.2, 1);
      scrollbar-width: none;
      /* Subtle indigo left-edge glow */
      box-shadow: inset -1px 0 0 rgba(99, 102, 241, 0.12);
    }
    .sidebar::-webkit-scrollbar { display: none; }
    .sidebar.collapsed { width: 68px; }

    /* ── Logo row ── */
    .sidebar-logo-row {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 20px 16px 18px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      min-height: 72px;
      flex-shrink: 0;
    }

    .logo-mark {
      width: 36px;
      height: 36px;
      background: linear-gradient(135deg, #6366F1 0%, #818CF8 100%);
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      box-shadow: 0 0 0 1px rgba(99, 102, 241, 0.3), 0 4px 12px rgba(99, 102, 241, 0.35);
    }
    .logo-icon {
      font-size: 18px !important;
      width: 18px !important;
      height: 18px !important;
      color: #fff;
    }

    .logo-text {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-width: 0;
      overflow: hidden;
    }
    .logo-name {
      font-size: 0.9375rem;
      font-weight: 700;
      color: #F8FAFC;
      letter-spacing: -0.01em;
      white-space: nowrap;
    }
    .logo-sub {
      font-size: 0.6875rem;
      font-weight: 500;
      color: #475569;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      white-space: nowrap;
    }

    .collapse-btn {
      background: none;
      border: none;
      color: #475569;
      cursor: pointer;
      padding: 4px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-left: auto;
      flex-shrink: 0;
      transition: background 0.15s, color 0.15s;
      outline: none;
    }
    .collapse-btn:hover { background: rgba(255,255,255,0.07); color: #94A3B8; }
    .collapse-btn:focus-visible { box-shadow: 0 0 0 2px #6366F1; }
    .collapse-btn mat-icon {
      font-size: 17px !important;
      width: 17px !important;
      height: 17px !important;
    }

    /* ── Nav sections ── */
    .sidebar-nav {
      flex: 1;
      padding: 12px 10px;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .nav-divider {
      height: 1px;
      background: rgba(255, 255, 255, 0.055);
      margin: 6px 6px;
    }

    .nav-section-label {
      display: block;
      font-size: 0.6875rem;
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #334155;
      padding: 10px 10px 4px;
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 9px 10px;
      border-radius: 8px;
      color: #94A3B8;
      text-decoration: none;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      border: none;
      background: none;
      width: 100%;
      text-align: left;
      transition: background 0.15s, color 0.15s;
      position: relative;
      overflow: hidden;
      white-space: nowrap;
      outline: none;
    }
    .nav-item:focus-visible {
      box-shadow: inset 0 0 0 2px #6366F1;
    }
    .nav-item:hover {
      background: rgba(255, 255, 255, 0.055);
      color: #CBD5E1;
    }
    .nav-item.active {
      background: rgba(99, 102, 241, 0.14);
      color: #A5B4FC;
    }
    /* Left accent bar on active */
    .nav-item.active::before {
      content: '';
      position: absolute;
      left: 0;
      top: 20%;
      bottom: 20%;
      width: 3px;
      background: #6366F1;
      border-radius: 0 3px 3px 0;
    }

    .nav-icon-wrap {
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      width: 20px;
      height: 20px;
    }
    .nav-icon-wrap mat-icon {
      font-size: 18px !important;
      width: 18px !important;
      height: 18px !important;
    }

    .nav-label {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* Active chevron indicator */
    .nav-active-dot {
      display: none;
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background: #6366F1;
      flex-shrink: 0;
    }
    .nav-item.active .nav-active-dot { display: block; }

    /* ── Sidebar footer ── */
    .sidebar-footer {
      padding: 12px 10px;
      border-top: 1px solid rgba(255, 255, 255, 0.055);
      display: flex;
      flex-direction: column;
      gap: 8px;
      flex-shrink: 0;
    }

    .admin-user-card {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px;
      background: rgba(255, 255, 255, 0.04);
      border-radius: 10px;
      border: 1px solid rgba(255, 255, 255, 0.06);
    }
    .user-avatar {
      width: 32px;
      height: 32px;
      background: linear-gradient(135deg, #F97316, #EA580C);
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .user-avatar mat-icon {
      font-size: 16px !important;
      width: 16px !important;
      height: 16px !important;
      color: #fff;
    }
    .user-info {
      display: flex;
      flex-direction: column;
      min-width: 0;
      overflow: hidden;
    }
    .user-name {
      font-size: 0.8125rem;
      font-weight: 600;
      color: #E2E8F0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .user-role {
      font-size: 0.6875rem;
      font-weight: 500;
      color: #475569;
      letter-spacing: 0.02em;
    }

    .footer-actions {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .footer-btn {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 10px;
      border-radius: 8px;
      color: #475569;
      text-decoration: none;
      font-size: 0.8125rem;
      font-weight: 500;
      cursor: pointer;
      border: none;
      background: none;
      width: 100%;
      text-align: left;
      transition: background 0.15s, color 0.15s;
      white-space: nowrap;
      overflow: hidden;
      outline: none;
    }
    .footer-btn mat-icon {
      font-size: 17px !important;
      width: 17px !important;
      height: 17px !important;
      flex-shrink: 0;
    }
    .footer-btn:hover {
      background: rgba(255, 255, 255, 0.055);
      color: #94A3B8;
    }
    .footer-btn:focus-visible { box-shadow: inset 0 0 0 2px #6366F1; }

    .logout-btn { color: #EF4444 !important; }
    .logout-btn:hover { background: rgba(239, 68, 68, 0.1) !important; color: #FCA5A5 !important; }

    /* ═══════════════════════════════════════
       MAIN AREA
    ═══════════════════════════════════════ */
    .admin-main {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-width: 0;
    }

    /* ── Topbar ── */
    .admin-topbar {
      background: #FFFFFF;
      border-bottom: 1px solid #E2E8F0;
      padding: 0 24px;
      height: 68px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      position: sticky;
      top: 0;
      z-index: 10;
      box-shadow: 0 1px 0 #E2E8F0, 0 2px 8px rgba(15, 23, 42, 0.04);
      flex-shrink: 0;
    }

    .topbar-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .mobile-menu-btn {
      display: none;
      background: none;
      border: none;
      cursor: pointer;
      padding: 6px;
      border-radius: 8px;
      color: #475569;
      align-items: center;
      justify-content: center;
      transition: background 0.15s, color 0.15s;
      outline: none;
    }
    .mobile-menu-btn:hover { background: #F1F5F9; color: #0F172A; }
    .mobile-menu-btn:focus-visible { box-shadow: 0 0 0 2px #6366F1; }
    .mobile-menu-btn mat-icon {
      font-size: 22px !important;
      width: 22px !important;
      height: 22px !important;
    }

    .breadcrumb {
      display: flex;
      align-items: center;
      gap: 2px;
    }
    .breadcrumb-root {
      font-size: 0.8125rem;
      font-weight: 500;
      color: #94A3B8;
    }
    .breadcrumb-sep {
      font-size: 16px !important;
      width: 16px !important;
      height: 16px !important;
      color: #CBD5E1;
    }
    .breadcrumb-current {
      font-size: 0.9375rem;
      font-weight: 600;
      color: #0F172A;
      letter-spacing: -0.01em;
    }

    .topbar-right {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .topbar-admin-chip {
      display: flex;
      align-items: center;
      gap: 7px;
      background: #F1F5F9;
      border: 1px solid #E2E8F0;
      border-radius: 999px;
      padding: 5px 14px 5px 10px;
      font-size: 0.8125rem;
      font-weight: 600;
      color: #334155;
    }
    .chip-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #22C55E;
      box-shadow: 0 0 0 2px rgba(34, 197, 94, 0.2);
      flex-shrink: 0;
    }

    /* ── Content area ── */
    .admin-content {
      flex: 1;
      padding: 24px;
      overflow-y: auto;
    }

    /* ── Mobile backdrop ── */
    .mobile-backdrop {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.55);
      backdrop-filter: blur(2px);
      z-index: 150;
      animation: fadeIn 0.2s ease;
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to   { opacity: 1; }
    }

    /* ═══════════════════════════════════════
       TABLET: auto-collapse
    ═══════════════════════════════════════ */
    @media (max-width: 1024px) and (min-width: 769px) {
      .sidebar { width: 68px; }
    }

    /* ═══════════════════════════════════════
       MOBILE: overlay sidebar
    ═══════════════════════════════════════ */
    @media (max-width: 768px) {
      .mobile-backdrop { display: block; }
      .mobile-menu-btn { display: flex; }

      .topbar-admin-chip span { display: none; }
      .topbar-admin-chip { padding: 7px 10px; }

      .sidebar {
        position: fixed;
        left: 0;
        top: 0;
        bottom: 0;
        z-index: 200;
        width: 260px !important;
        transform: translateX(-100%);
        transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        height: 100vh;
        box-shadow: none;
      }
      .sidebar.mobile-open {
        transform: translateX(0);
        box-shadow: 8px 0 32px rgba(15, 23, 42, 0.35);
      }
      .admin-content { padding: 16px; }
      .admin-topbar { padding: 0 16px; }
    }

    @media (max-width: 480px) {
      .admin-content { padding: 12px; }
      .breadcrumb-root { display: none; }
      .breadcrumb-sep  { display: none; }
    }

    /* Respect reduced motion */
    @media (prefers-reduced-motion: reduce) {
      .sidebar, .mobile-backdrop { transition: none; animation: none; }
    }
  `],
})
export class AdminShellComponent implements OnInit {
  private auth = inject(AuthStateService);
  private router = inject(Router);

  navSections = NAV_SECTIONS;
  collapsed = signal(false);
  mobileOpen = signal(false);

  showLabels = computed(() => !this.collapsed() || this.mobileOpen());

  userName = computed(() => this.auth.currentUser()?.name ?? 'Admin');

  ngOnInit() {
    if (typeof window !== 'undefined' && window.innerWidth <= 1024) {
      this.collapsed.set(true);
    }
  }

  pageTitle = computed(() => {
    const url = this.router.url;
    const item = NAV_ITEMS.find(n => url.startsWith(n.path));
    return item?.label ?? 'Dashboard';
  });

  logout() {
    this.auth.clearSession();
    this.router.navigate(['/tests']);
  }
}
