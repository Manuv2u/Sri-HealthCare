import { Component, computed, inject, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { AuthStateService } from '../../core/auth/auth-state.service';

interface NavItem { label: string; icon: string; path: string; }

const NAV_ITEMS: NavItem[] = [
  { label: 'My Bookings', icon: 'assignment', path: '/technician/bookings' },
];

@Component({
  selector: 'app-technician-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, MatIconModule, MatButtonModule],
  template: `
    <div class="tech-shell">
      <!-- Sidebar -->
      <aside class="sidebar" [class.open]="sidebarOpen()">
        <div class="sidebar-header">
          <div class="portal-brand">
            <mat-icon class="brand-icon">biotech</mat-icon>
            <div>
              <span class="brand-title">Technician Portal</span>
              <span class="brand-sub">SRI Diagnostics</span>
            </div>
          </div>
          <button class="close-btn" (click)="sidebarOpen.set(false)" aria-label="Close menu">
            <mat-icon>close</mat-icon>
          </button>
        </div>

        <div class="tech-info">
          <div class="tech-avatar">{{ initials() }}</div>
          <div>
            <div class="tech-name">{{ name() }}</div>
            <div class="tech-role">Technician</div>
          </div>
        </div>

        <nav class="nav-items">
          @for (item of navItems; track item.path) {
            <a [routerLink]="item.path" routerLinkActive="active" class="nav-item" (click)="sidebarOpen.set(false)">
              <mat-icon>{{ item.icon }}</mat-icon>
              <span>{{ item.label }}</span>
            </a>
          }
        </nav>

        <div class="sidebar-footer">
          <button class="logout-btn" (click)="logout()">
            <mat-icon>logout</mat-icon>
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      @if (sidebarOpen()) {
        <div class="backdrop" (click)="sidebarOpen.set(false)"></div>
      }

      <!-- Main content -->
      <div class="main">
        <header class="topbar">
          <button class="menu-btn" (click)="sidebarOpen.set(true)" aria-label="Open menu">
            <mat-icon>menu</mat-icon>
          </button>
          <span class="topbar-title">Technician Portal</span>
        </header>
        <div class="content">
          <router-outlet />
        </div>
      </div>
    </div>
  `,
  styles: [`
    .tech-shell {
      display: flex; min-height: 100vh; background: #f0f4f8;
    }

    /* ── Sidebar ── */
    .sidebar {
      width: 260px; background: linear-gradient(180deg, #1a237e 0%, #283593 100%);
      color: #fff; display: flex; flex-direction: column;
      flex-shrink: 0; position: relative; z-index: 50;
    }
    .sidebar-header {
      padding: 1.25rem 1rem 1rem; display: flex; align-items: center; gap: .75rem;
      border-bottom: 1px solid rgba(255,255,255,.12);
    }
    .portal-brand { display: flex; align-items: center; gap: .65rem; flex: 1; }
    .brand-icon { font-size: 1.6rem; width: 1.6rem; height: 1.6rem; color: #90caf9; }
    .brand-title { display: block; font-size: .85rem; font-weight: 700; color: #fff; }
    .brand-sub { display: block; font-size: .7rem; color: rgba(255,255,255,.55); }
    .close-btn {
      display: none; background: none; border: none; color: rgba(255,255,255,.7); cursor: pointer;
      border-radius: 6px; padding: .2rem;
      mat-icon { font-size: 1.2rem; width: 1.2rem; height: 1.2rem; }
      &:hover { color: #fff; background: rgba(255,255,255,.1); }
    }
    .tech-info {
      display: flex; align-items: center; gap: .75rem;
      padding: 1rem 1.25rem; border-bottom: 1px solid rgba(255,255,255,.1);
    }
    .tech-avatar {
      width: 40px; height: 40px; border-radius: 50%; background: #42a5f5;
      display: flex; align-items: center; justify-content: center;
      font-weight: 700; font-size: .9rem; flex-shrink: 0;
    }
    .tech-name { font-size: .85rem; font-weight: 600; color: #fff; }
    .tech-role { font-size: .72rem; color: rgba(255,255,255,.55); text-transform: uppercase; letter-spacing: .05em; }

    .nav-items { flex: 1; padding: .75rem .75rem 0; display: flex; flex-direction: column; gap: .2rem; }
    .nav-item {
      display: flex; align-items: center; gap: .75rem;
      padding: .7rem 1rem; border-radius: 8px; text-decoration: none;
      color: rgba(255,255,255,.75); font-size: .875rem; font-weight: 500;
      transition: all .15s;
      mat-icon { font-size: 1.2rem; width: 1.2rem; height: 1.2rem; flex-shrink: 0; }
      &:hover { background: rgba(255,255,255,.1); color: #fff; }
      &.active { background: rgba(255,255,255,.15); color: #fff; font-weight: 600; }
    }

    .sidebar-footer { padding: .75rem; border-top: 1px solid rgba(255,255,255,.1); margin-top: auto; }
    .logout-btn {
      width: 100%; display: flex; align-items: center; gap: .75rem;
      padding: .7rem 1rem; border: none; background: none; cursor: pointer;
      color: rgba(255,255,255,.65); font-size: .875rem; border-radius: 8px;
      mat-icon { font-size: 1.2rem; width: 1.2rem; height: 1.2rem; }
      &:hover { background: rgba(255,255,255,.1); color: #fff; }
    }

    .backdrop {
      display: none; position: fixed; inset: 0; background: rgba(0,0,0,.5); z-index: 49;
    }

    /* ── Main ── */
    .main { flex: 1; display: flex; flex-direction: column; min-width: 0; }
    .topbar {
      background: #fff; padding: .875rem 1.5rem; display: flex; align-items: center; gap: 1rem;
      border-bottom: 1px solid #e2e8f0; position: sticky; top: 0; z-index: 10;
      box-shadow: 0 1px 4px rgba(0,0,0,.06);
    }
    .menu-btn {
      display: none; background: none; border: none; cursor: pointer; padding: .25rem;
      border-radius: 6px; color: #4a5568;
      mat-icon { font-size: 1.4rem; width: 1.4rem; height: 1.4rem; }
      &:hover { background: #f7fafc; }
    }
    .topbar-title { font-weight: 700; font-size: 1rem; color: #1a237e; }
    .content { flex: 1; padding: 1.5rem; overflow-x: hidden; }

    @media (max-width: 768px) {
      .sidebar {
        position: fixed; top: 0; left: 0; bottom: 0; transform: translateX(-100%);
        transition: transform .25s ease; z-index: 100;
        &.open { transform: translateX(0); }
      }
      .close-btn { display: flex; align-items: center; }
      .backdrop { display: block; }
      .menu-btn { display: flex; align-items: center; }
    }
  `],
})
export class TechnicianShellComponent {
  private auth = inject(AuthStateService);
  private router = inject(Router);

  sidebarOpen = signal(false);
  navItems = NAV_ITEMS;

  name = computed(() => this.auth.currentUser()?.name ?? 'Technician');
  initials = computed(() => {
    const n = this.name();
    return n ? n.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2) : 'T';
  });

  logout(): void {
    this.auth.clearSession();
    this.router.navigate(['/auth/login']);
  }
}
