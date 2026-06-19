import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthStateService } from '../../core/auth/auth-state.service';

const NAV_ITEMS = [
  { label: 'Dashboard',    icon: 'dashboard',        path: '/admin/dashboard' },
  { label: 'Users',        icon: 'people',           path: '/admin/users' },
  { label: 'Tests',        icon: 'biotech',          path: '/admin/tests' },
  { label: 'Packages',     icon: 'inventory_2',      path: '/admin/packages' },
  { label: 'Technicians',  icon: 'engineering',      path: '/admin/technicians' },
  { label: 'Bookings',     icon: 'calendar_month',   path: '/admin/bookings' },
  { label: 'Service Areas',icon: 'location_on',      path: '/admin/service-areas' },
  { label: 'Analytics',    icon: 'bar_chart',        path: '/admin/analytics' },
  { label: 'Feature Flags',icon: 'toggle_on',        path: '/admin/feature-flags' },
];

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

      <!-- Sidebar -->
      <aside class="sidebar" [class.collapsed]="collapsed()" [class.mobile-open]="mobileOpen()">
        <div class="sidebar-header">
          <span class="sidebar-logo">🧪</span>
          @if (showLabels()) {
            <span class="sidebar-title">Admin Panel</span>
          }
          <button class="collapse-btn" (click)="collapsed.set(!collapsed())" [matTooltip]="collapsed() ? 'Expand' : 'Collapse'">
            <mat-icon>{{ collapsed() ? 'chevron_right' : 'chevron_left' }}</mat-icon>
          </button>
        </div>

        <nav class="sidebar-nav">
          @for (item of navItems; track item.path) {
            <a [routerLink]="item.path" routerLinkActive="active" class="nav-item"
               [matTooltip]="collapsed() && !mobileOpen() ? item.label : ''" matTooltipPosition="right"
               (click)="mobileOpen.set(false)">
              <mat-icon>{{ item.icon }}</mat-icon>
              @if (showLabels()) {
                <span>{{ item.label }}</span>
              }
            </a>
          }
        </nav>

        <div class="sidebar-footer">
          <a routerLink="/tests" class="nav-item back-link"
             [matTooltip]="collapsed() && !mobileOpen() ? 'Back to App' : ''" matTooltipPosition="right"
             (click)="mobileOpen.set(false)">
            <mat-icon>arrow_back</mat-icon>
            @if (showLabels()) { <span>Back to App</span> }
          </a>
          <button class="nav-item logout-btn" (click)="logout()"
                  [matTooltip]="collapsed() && !mobileOpen() ? 'Sign Out' : ''" matTooltipPosition="right">
            <mat-icon>logout</mat-icon>
            @if (showLabels()) { <span>Sign Out</span> }
          </button>
        </div>
      </aside>

      <!-- Main content -->
      <div class="admin-main">
        <div class="admin-topbar">
          <div class="topbar-left">
            <button class="mobile-menu-btn" (click)="mobileOpen.set(!mobileOpen())" aria-label="Menu">
              <mat-icon>menu</mat-icon>
            </button>
            <h2 class="page-title">{{ pageTitle() }}</h2>
          </div>
          <div class="topbar-right">
            <span class="admin-badge">
              <mat-icon>admin_panel_settings</mat-icon>
              <span class="admin-name">{{ userName() }}</span>
            </span>
          </div>
        </div>
        <div class="admin-content">
          <router-outlet />
        </div>
      </div>
    </div>
  `,
  styles: [`
    .admin-shell {
      display: flex;
      min-height: 100vh;
      background: #f0f4f8;
    }

    /* ── Sidebar ── */
    .sidebar {
      width: 240px;
      min-height: 100vh;
      background: #1a2332;
      color: #fff;
      display: flex;
      flex-direction: column;
      transition: width .2s ease;
      flex-shrink: 0;
      position: sticky;
      top: 0;
      height: 100vh;
      overflow-y: auto;
    }
    .sidebar.collapsed { width: 64px; }

    .sidebar-header {
      display: flex;
      align-items: center;
      gap: .75rem;
      padding: 1.25rem 1rem;
      border-bottom: 1px solid rgba(255,255,255,.08);
      min-height: 64px;
    }
    .sidebar-logo { font-size: 1.5rem; flex-shrink: 0; }
    .sidebar-title { font-size: 1rem; font-weight: 700; flex: 1; white-space: nowrap; overflow: hidden; }
    .collapse-btn {
      background: none; border: none; color: rgba(255,255,255,.5);
      cursor: pointer; padding: .25rem; border-radius: 6px; display: flex;
      margin-left: auto; flex-shrink: 0;
      &:hover { background: rgba(255,255,255,.1); color: #fff; }
      mat-icon { font-size: 1.1rem; width: 1.1rem; height: 1.1rem; }
    }

    .sidebar-nav {
      flex: 1;
      padding: .75rem .5rem;
      display: flex;
      flex-direction: column;
      gap: .15rem;
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: .75rem;
      padding: .6rem .75rem;
      border-radius: 8px;
      color: rgba(255,255,255,.65);
      text-decoration: none;
      font-size: .875rem;
      font-weight: 500;
      cursor: pointer;
      border: none;
      background: none;
      width: 100%;
      text-align: left;
      transition: all .15s;
      white-space: nowrap;
      overflow: hidden;
      mat-icon { font-size: 1.2rem; width: 1.2rem; height: 1.2rem; flex-shrink: 0; }
      &:hover { background: rgba(255,255,255,.08); color: #fff; }
      &.active { background: rgba(99,179,237,.15); color: #63b3ed; }
    }

    .sidebar-footer {
      padding: .75rem .5rem;
      border-top: 1px solid rgba(255,255,255,.08);
      display: flex;
      flex-direction: column;
      gap: .15rem;
    }
    .back-link { color: rgba(255,255,255,.5); }
    .logout-btn { color: #fc8181; &:hover { background: rgba(252,129,129,.1); } }

    /* ── Main ── */
    .admin-main {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-width: 0;
    }

    .admin-topbar {
      background: #fff;
      border-bottom: 1px solid #e2e8f0;
      padding: 0 1.5rem;
      height: 64px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      position: sticky;
      top: 0;
      z-index: 10;
      box-shadow: 0 1px 3px rgba(0,0,0,.06);
    }
    .page-title { font-size: 1.1rem; font-weight: 600; color: #1a202c; margin: 0; }
    .admin-badge {
      display: flex;
      align-items: center;
      gap: .4rem;
      font-size: .85rem;
      font-weight: 600;
      color: #2d3748;
      background: #edf2f7;
      padding: .35rem .75rem;
      border-radius: 999px;
      mat-icon { font-size: 1rem; width: 1rem; height: 1rem; color: #00796b; }
    }

    .admin-content {
      flex: 1;
      padding: 1.5rem;
      overflow-y: auto;
    }

    /* ── Mobile menu button (hidden on desktop) ── */
    .mobile-menu-btn {
      display: none;
      background: none; border: none; cursor: pointer; padding: .3rem;
      border-radius: 8px; color: #4a5568; align-items: center; justify-content: center;
      margin-right: .5rem;
      &:hover { background: #edf2f7; }
      mat-icon { font-size: 1.4rem; width: 1.4rem; height: 1.4rem; }
    }

    /* ── Mobile backdrop ── */
    .mobile-backdrop {
      display: none;
      position: fixed; inset: 0; background: rgba(0,0,0,.45); z-index: 150;
    }

    /* ── Tablet: auto-collapse sidebar ── */
    @media (max-width: 1024px) and (min-width: 769px) {
      .sidebar { width: 64px; }
    }

    /* ── Mobile: overlay sidebar ── */
    @media (max-width: 768px) {
      .mobile-backdrop { display: block; }
      .mobile-menu-btn { display: flex; }
      .admin-name { display: none; }

      .sidebar {
        position: fixed;
        left: 0; top: 0; bottom: 0;
        z-index: 200;
        width: 240px !important;
        transform: translateX(-100%);
        transition: transform .25s ease;
        height: 100vh;
        box-shadow: none;
      }
      .sidebar.mobile-open {
        transform: translateX(0);
        box-shadow: 4px 0 24px rgba(0,0,0,.25);
      }
      .admin-content { padding: 1rem; }
      .admin-topbar { padding: 0 1rem; }
    }

    @media (max-width: 480px) {
      .admin-content { padding: .75rem; }
      .page-title { font-size: 1rem; }
    }
  `],
})
export class AdminShellComponent implements OnInit {
  private auth = inject(AuthStateService);
  private router = inject(Router);

  navItems = NAV_ITEMS;
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
    return item?.label ?? 'Admin';
  });

  logout() {
    this.auth.clearSession();
    this.router.navigate(['/tests']);
  }
}
