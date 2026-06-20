import { Component, computed, inject, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { AuthStateService } from './core/auth/auth-state.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule, RouterOutlet, RouterLink, RouterLinkActive,
    MatToolbarModule, MatButtonModule, MatIconModule, MatMenuModule, MatDividerModule,
  ],
  template: `
    <div class="app-shell">
      <!-- ── Top Nav ── -->
      <header class="top-nav">
        <div class="nav-inner">
          <!-- Brand -->
          <a routerLink="/" class="brand">
            <img src="assets/logo.png" alt="SRI Diagnostic Laboratory" class="brand-logo" />
            <span class="brand-name">SRI Diagnostics</span>
          </a>

          <!-- Center links -->
          <nav class="nav-links">
            <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{exact:true}">Home</a>
            <a routerLink="/tests" routerLinkActive="active">Tests</a>
            <a routerLink="/packages" routerLinkActive="active">Packages</a>
            @if (isAuth()) {
              <a routerLink="/booking" routerLinkActive="active">Book Test</a>
              <a routerLink="/dashboard" routerLinkActive="active">My Bookings</a>
              <a routerLink="/reports" routerLinkActive="active">Reports</a>
            }
            <a routerLink="/about" routerLinkActive="active">About Us</a>
            <a routerLink="/contact" routerLinkActive="active">Contact Us</a>
            @if (isAdmin()) {
              <a routerLink="/admin" routerLinkActive="active" class="admin-link">Admin</a>
            }
            @if (isTechnician()) {
              <a routerLink="/technician" routerLinkActive="active" class="tech-link">My Portal</a>
            }
          </nav>

          <!-- Right actions -->
          <div class="nav-actions">
            @if (!isAuth()) {
              <a routerLink="/auth/login" mat-stroked-button class="login-btn">Sign In</a>
              <a routerLink="/auth/register" mat-flat-button color="primary" class="register-btn">Get Started</a>
            } @else {
              <button mat-icon-button [matMenuTriggerFor]="userMenu" class="avatar-btn">
                <span class="avatar">{{ initials() }}</span>
              </button>
              <mat-menu #userMenu="matMenu" xPosition="before">
                <div class="menu-header">
                  <strong>{{ userName() }}</strong>
                  <span class="role-badge">{{ role() }}</span>
                </div>
                <mat-divider />
                <button mat-menu-item routerLink="/profile">
                  <mat-icon>person</mat-icon> Profile
                </button>
                @if (isTechnician()) {
                  <button mat-menu-item routerLink="/technician">
                    <mat-icon>biotech</mat-icon> Technician Portal
                  </button>
                } @else {
                  <button mat-menu-item routerLink="/dashboard">
                    <mat-icon>calendar_today</mat-icon> My Bookings
                  </button>
                  <button mat-menu-item routerLink="/reports">
                    <mat-icon>description</mat-icon> Reports
                  </button>
                }
                <mat-divider />
                <button mat-menu-item (click)="logout()" class="logout-item">
                  <mat-icon>logout</mat-icon> Sign Out
                </button>
              </mat-menu>
            }
            <!-- Hamburger (mobile only) -->
            <button class="hamburger-btn" (click)="mobileOpen.set(!mobileOpen())" aria-label="Toggle menu">
              <mat-icon>{{ mobileOpen() ? 'close' : 'menu' }}</mat-icon>
            </button>
          </div>
        </div>
      </header>

      <!-- ── Mobile nav overlay ── -->
      @if (mobileOpen()) {
        <div class="mobile-backdrop" (click)="mobileOpen.set(false)"></div>
        <nav class="mobile-nav">
          <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{exact:true}" (click)="mobileOpen.set(false)">Home</a>
          <a routerLink="/tests" routerLinkActive="active" (click)="mobileOpen.set(false)">Tests</a>
          <a routerLink="/packages" routerLinkActive="active" (click)="mobileOpen.set(false)">Packages</a>
          @if (isAuth()) {
            <a routerLink="/booking" routerLinkActive="active" (click)="mobileOpen.set(false)">Book Test</a>
            <a routerLink="/dashboard" routerLinkActive="active" (click)="mobileOpen.set(false)">My Bookings</a>
            <a routerLink="/reports" routerLinkActive="active" (click)="mobileOpen.set(false)">Reports</a>
          }
          <a routerLink="/about" routerLinkActive="active" (click)="mobileOpen.set(false)">About Us</a>
          <a routerLink="/contact" routerLinkActive="active" (click)="mobileOpen.set(false)">Contact Us</a>
          @if (isAdmin()) {
            <a routerLink="/admin" routerLinkActive="active" class="admin-link" (click)="mobileOpen.set(false)">Admin</a>
          }
          @if (isTechnician()) {
            <a routerLink="/technician" routerLinkActive="active" class="tech-link" (click)="mobileOpen.set(false)">My Portal</a>
          }
          @if (!isAuth()) {
            <div class="mobile-auth">
              <a routerLink="/auth/login" (click)="mobileOpen.set(false)" class="mobile-auth-btn">Sign In</a>
              <a routerLink="/auth/register" (click)="mobileOpen.set(false)" class="mobile-auth-btn primary">Get Started</a>
            </div>
          }
        </nav>
      }

      <!-- ── Page content ── -->
      <main class="main-content">
        <router-outlet />
      </main>

      <!-- ── Footer ── -->
      @if (!isHome()) {
        <footer class="app-footer">
          <div class="footer-inner">
            <span>© 2026 SRI Diagnostic Laboratory & Health Care</span>
            <span class="footer-links">
              <a routerLink="/tests">Tests</a>
              <a routerLink="/packages">Packages</a>
              <a routerLink="/about">About Us</a>
              <a routerLink="/contact">Contact Us</a>
            </span>
            <span class="footer-social">
              <a href="https://instagram.com" target="_blank" aria-label="Instagram" class="social-icon">
                <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
              </a>
              <a href="https://facebook.com" target="_blank" aria-label="Facebook" class="social-icon">
                <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              </a>
              <a href="https://twitter.com" target="_blank" aria-label="Twitter" class="social-icon">
                <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              </a>
            </span>
          </div>
        </footer>
      }
    </div>
  `,
  styles: [`
    .app-shell { display: flex; flex-direction: column; min-height: 100vh; }

    /* ── Nav ── */
    .top-nav {
      position: sticky; top: 0; z-index: 100;
      background: #fff;
      border-bottom: 1px solid var(--color-border);
      box-shadow: var(--shadow-sm);
    }
    .nav-inner {
      max-width: 1200px; margin: 0 auto;
      padding: 0 1.5rem; height: 64px;
      display: flex; align-items: center; gap: 2rem;
    }
    .brand {
      display: flex; align-items: center; gap: .5rem;
      text-decoration: none; flex-shrink: 0;
      .brand-logo { height: 40px; width: auto; object-fit: contain; }
      .brand-name { font-size: 1.1rem; font-weight: 700; color: var(--color-primary); }
    }
    .nav-links {
      display: flex; align-items: center; gap: .25rem; flex: 1;
      a {
        padding: .4rem .85rem; border-radius: 8px;
        font-size: .9rem; font-weight: 500; color: var(--color-muted);
        text-decoration: none; transition: all .15s;
        &:hover { background: var(--color-primary-lt); color: var(--color-primary); }
        &.active { background: var(--color-primary-lt); color: var(--color-primary); font-weight: 600; }
        &.admin-link { color: var(--color-accent); }
        &.tech-link { color: #1a237e; font-weight: 600; }
      }
    }
    .nav-actions {
      display: flex; align-items: center; gap: .75rem; flex-shrink: 0;
      .login-btn { font-size: .875rem; }
      .register-btn { font-size: .875rem; }
    }
    .avatar-btn { padding: 0; }
    .avatar {
      width: 36px; height: 36px; border-radius: 50%;
      background: var(--color-primary); color: #fff;
      display: flex; align-items: center; justify-content: center;
      font-size: .85rem; font-weight: 700;
    }
    .menu-header {
      padding: .75rem 1rem .5rem;
      display: flex; flex-direction: column; gap: .2rem;
      strong { font-size: .95rem; }
    }
    .role-badge {
      font-size: .7rem; font-weight: 600; text-transform: uppercase;
      background: var(--color-primary-lt); color: var(--color-primary);
      padding: .1rem .4rem; border-radius: 4px; width: fit-content;
    }
    .logout-item { color: var(--color-danger) !important; }

    /* ── Main ── */
    .main-content { flex: 1; }

    /* ── Footer ── */
    .app-footer {
      background: #fff; border-top: 1px solid var(--color-border);
      padding: 1.25rem 1.5rem; margin-top: auto;
    }
    .footer-inner {
      max-width: 1200px; margin: 0 auto;
      display: flex; justify-content: space-between; align-items: center;
      font-size: .85rem; color: var(--color-muted);
      flex-wrap: wrap; gap: .75rem;
    }
    .footer-links { display: flex; gap: 1.5rem;
      a { color: var(--color-muted); text-decoration: none;
        &:hover { color: var(--color-primary); }
      }
    }
    .footer-social { display: flex; gap: .75rem; align-items: center;
      .social-icon {
        color: var(--color-muted); display: flex; align-items: center;
        transition: color .15s;
        &:hover { color: var(--color-primary); }
      }
    }

    /* ── Hamburger ── */
    .hamburger-btn {
      display: none;
      background: none; border: none; cursor: pointer; padding: .3rem;
      border-radius: 8px; color: var(--color-muted);
      align-items: center; justify-content: center;
      &:hover { background: var(--color-primary-lt); color: var(--color-primary); }
      mat-icon { font-size: 1.4rem; width: 1.4rem; height: 1.4rem; }
    }

    /* ── Mobile nav overlay ── */
    .mobile-backdrop {
      position: fixed; inset: 0; background: rgba(0,0,0,.45);
      z-index: 98;
    }
    .mobile-nav {
      position: fixed; top: 64px; left: 0; right: 0;
      background: #fff; z-index: 99;
      display: flex; flex-direction: column; gap: .15rem;
      padding: .75rem;
      box-shadow: 0 8px 24px rgba(0,0,0,.12);
      border-bottom: 1px solid var(--color-border);
      max-height: calc(100vh - 64px); overflow-y: auto;
      a {
        display: block; padding: .8rem 1rem; border-radius: 8px;
        font-size: 1rem; font-weight: 500; color: var(--color-text);
        text-decoration: none; transition: background .15s;
        &:hover { background: var(--color-primary-lt); color: var(--color-primary); }
        &.active { background: var(--color-primary-lt); color: var(--color-primary); font-weight: 600; }
        &.admin-link { color: var(--color-accent); }
      }
    }
    .mobile-auth {
      display: flex; gap: .75rem; padding: .75rem 1rem; margin-top: .25rem;
      border-top: 1px solid var(--color-border); flex-wrap: wrap;
    }
    .mobile-auth-btn {
      flex: 1; text-align: center; padding: .7rem 1rem; border-radius: 8px;
      font-size: .9rem; font-weight: 600; text-decoration: none; min-height: 44px;
      display: flex; align-items: center; justify-content: center;
      color: var(--color-primary); border: 1.5px solid var(--color-primary);
      &.primary { background: var(--color-primary); color: #fff; }
    }

    @media (max-width: 768px) {
      .nav-links { display: none; }
      .hamburger-btn { display: flex; }
      .brand-name { font-size: 1rem; }
      .login-btn, .register-btn { display: none; }
      .nav-inner { gap: 1rem; }
    }
  `],
})
export class AppComponent {
  private auth = inject(AuthStateService);
  private router = inject(Router);

  mobileOpen = signal(false);

  isAuth = this.auth.isAuthenticated;
  role = computed(() => this.auth.currentUser()?.role ?? '');
  isAdmin = computed(() => this.role() === 'admin');
  isTechnician = computed(() => this.role() === 'technician');
  userName = computed(() => this.auth.currentUser()?.name ?? '');
  initials = computed(() => {
    const name = this.userName();
    return name ? name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2) : 'U';
  });
  isHome = computed(() => this.router.url === '/');

  logout(): void {
    this.auth.clearSession();
    this.router.navigate(['/tests']);
  }
}
