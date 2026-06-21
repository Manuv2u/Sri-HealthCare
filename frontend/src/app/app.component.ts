import { Component, computed, inject, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { AuthStateService } from './core/auth/auth-state.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule, RouterOutlet, RouterLink, RouterLinkActive,
    MatIconModule, MatMenuModule, MatDividerModule,
  ],
  template: `
    <div class="app-shell">

      <!-- ── Top Nav ── -->
      <header class="top-nav">
        <div class="nav-inner">
          <a routerLink="/" class="brand">
            <img src="assets/logo.png" alt="SRI Diagnostics" class="brand-logo" onerror="this.style.display='none'" />
            <span class="brand-name">SRI Diagnostics</span>
          </a>

          <nav class="nav-links">
            <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{exact:true}">Home</a>
            <a routerLink="/tests" routerLinkActive="active">Tests</a>
            <a routerLink="/packages" routerLinkActive="active">Packages</a>
            @if (isAuth()) {
              <a routerLink="/booking" routerLinkActive="active">Book Test</a>
              <a routerLink="/dashboard" routerLinkActive="active">My Bookings</a>
              <a routerLink="/reports" routerLinkActive="active">Reports</a>
            }
            <a routerLink="/about" routerLinkActive="active">About</a>
            <a routerLink="/contact" routerLinkActive="active">Contact</a>
            @if (isAdmin()) {
              <a routerLink="/admin" routerLinkActive="active" class="admin-link">Admin</a>
            }
            @if (isTechnician()) {
              <a routerLink="/technician" routerLinkActive="active" class="tech-link">My Portal</a>
            }
          </nav>

          <div class="nav-actions">
            @if (!isAuth()) {
              <a routerLink="/auth/login" class="nav-btn outline">Sign In</a>
              <a routerLink="/auth/register" class="nav-btn solid">Get Started</a>
            } @else {
              <button class="avatar-btn" [matMenuTriggerFor]="userMenu" aria-label="User menu">
                <span class="avatar">{{ initials() }}</span>
              </button>
              <mat-menu #userMenu="matMenu" xPosition="before" class="user-dropdown">
                <div class="menu-header">
                  <div class="menu-avatar">{{ initials() }}</div>
                  <div>
                    <strong>{{ userName() }}</strong>
                    <span class="role-tag">{{ role() }}</span>
                  </div>
                </div>
                <mat-divider />
                <button mat-menu-item routerLink="/profile">
                  <mat-icon>person_outline</mat-icon> My Profile
                </button>
                @if (isTechnician()) {
                  <button mat-menu-item routerLink="/technician">
                    <mat-icon>biotech</mat-icon> Technician Portal
                  </button>
                } @else {
                  <button mat-menu-item routerLink="/dashboard">
                    <mat-icon>receipt_long</mat-icon> My Bookings
                  </button>
                  <button mat-menu-item routerLink="/reports">
                    <mat-icon>description</mat-icon> Reports
                  </button>
                }
                <button mat-menu-item routerLink="/auth/change-password">
                  <mat-icon>lock_outline</mat-icon> Change Password
                </button>
                <mat-divider />
                <button mat-menu-item (click)="logout()" class="logout-item">
                  <mat-icon>logout</mat-icon> Sign Out
                </button>
              </mat-menu>
            }
            <button class="hamburger" (click)="mobileOpen.set(!mobileOpen())" aria-label="Toggle menu">
              <mat-icon>{{ mobileOpen() ? 'close' : 'menu' }}</mat-icon>
            </button>
          </div>
        </div>
      </header>

      <!-- ── Mobile drawer overlay ── -->
      @if (mobileOpen()) {
        <div class="drawer-backdrop" (click)="mobileOpen.set(false)"></div>
        <nav class="mobile-drawer">
          <div class="drawer-header">
            @if (isAuth()) {
              <div class="drawer-user">
                <div class="drawer-avatar">{{ initials() }}</div>
                <div>
                  <div class="drawer-name">{{ userName() }}</div>
                  <div class="drawer-role">{{ role() }}</div>
                </div>
              </div>
            } @else {
              <div class="drawer-brand">SRI Diagnostics</div>
            }
          </div>

          <div class="drawer-links">
            <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{exact:true}" (click)="mobileOpen.set(false)">
              <mat-icon>home</mat-icon> Home
            </a>
            <a routerLink="/tests" routerLinkActive="active" (click)="mobileOpen.set(false)">
              <mat-icon>biotech</mat-icon> Tests
            </a>
            <a routerLink="/packages" routerLinkActive="active" (click)="mobileOpen.set(false)">
              <mat-icon>inventory_2</mat-icon> Packages
            </a>
            @if (isAuth()) {
              <a routerLink="/booking" routerLinkActive="active" (click)="mobileOpen.set(false)">
                <mat-icon>calendar_today</mat-icon> Book Test
              </a>
              <a routerLink="/dashboard" routerLinkActive="active" (click)="mobileOpen.set(false)">
                <mat-icon>receipt_long</mat-icon> My Bookings
              </a>
              <a routerLink="/reports" routerLinkActive="active" (click)="mobileOpen.set(false)">
                <mat-icon>description</mat-icon> Reports
              </a>
              <a routerLink="/profile" routerLinkActive="active" (click)="mobileOpen.set(false)">
                <mat-icon>settings</mat-icon> Profile & Settings
              </a>
            }
            <a routerLink="/about" routerLinkActive="active" (click)="mobileOpen.set(false)">
              <mat-icon>info_outline</mat-icon> About Us
            </a>
            <a routerLink="/contact" routerLinkActive="active" (click)="mobileOpen.set(false)">
              <mat-icon>mail_outline</mat-icon> Contact
            </a>
            @if (isAdmin()) {
              <a routerLink="/admin" class="admin-link" (click)="mobileOpen.set(false)">
                <mat-icon>admin_panel_settings</mat-icon> Admin Panel
              </a>
            }
            @if (isTechnician()) {
              <a routerLink="/technician" class="tech-link" (click)="mobileOpen.set(false)">
                <mat-icon>biotech</mat-icon> Technician Portal
              </a>
            }
          </div>

          <div class="drawer-footer">
            @if (!isAuth()) {
              <div class="drawer-auth">
                <a routerLink="/auth/login" (click)="mobileOpen.set(false)" class="da-btn outline">Sign In</a>
                <a routerLink="/auth/register" (click)="mobileOpen.set(false)" class="da-btn solid">Get Started</a>
              </div>
            } @else {
              <button class="drawer-logout" (click)="logout()">
                <mat-icon>logout</mat-icon> Sign Out
              </button>
            }
          </div>
        </nav>
      }

      <!-- ── Page content ── -->
      <main class="main-content">
        <router-outlet />
      </main>

      <!-- ── Footer (non-home pages) ── -->
      @if (!isHome()) {
        <footer class="app-footer">
          <div class="footer-inner">
            <div class="footer-brand">
              <strong>SRI Diagnostics</strong>
              <p>Clinical precision, expert care.</p>
            </div>
            <div class="footer-links">
              <a routerLink="/tests">Tests</a>
              <a routerLink="/packages">Packages</a>
              <a routerLink="/about">About</a>
              <a routerLink="/contact">Contact</a>
            </div>
            <div class="footer-social">
              <a href="https://instagram.com" target="_blank" aria-label="Instagram" class="social-btn">
                <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
              </a>
              <a href="https://facebook.com" target="_blank" aria-label="Facebook" class="social-btn">
                <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              </a>
            </div>
          </div>
          <div class="footer-copy">© 2026 SRI Diagnostic Laboratory & Health Care</div>
        </footer>
      }

      <!-- ── Bottom navigation (mobile only, not on admin/tech pages) ── -->
      @if (showBottomNav()) {
        <nav class="bottom-nav">
          <a routerLink="/" routerLinkActive="bnav-active" [routerLinkActiveOptions]="{exact:true}" class="bnav-item">
            <mat-icon>home</mat-icon><span>Home</span>
          </a>
          <a routerLink="/tests" routerLinkActive="bnav-active" class="bnav-item">
            <mat-icon>biotech</mat-icon><span>Tests</span>
          </a>
          <a routerLink="/booking" routerLinkActive="bnav-active" class="bnav-item bnav-center">
            <div class="bnav-fab"><mat-icon>add</mat-icon></div>
            <span>Book</span>
          </a>
          @if (isAuth()) {
            <a routerLink="/dashboard" routerLinkActive="bnav-active" class="bnav-item">
              <mat-icon>receipt_long</mat-icon><span>Orders</span>
            </a>
            <a routerLink="/profile" routerLinkActive="bnav-active" class="bnav-item">
              <mat-icon>person</mat-icon><span>Profile</span>
            </a>
          } @else {
            <a routerLink="/packages" routerLinkActive="bnav-active" class="bnav-item">
              <mat-icon>inventory_2</mat-icon><span>Packages</span>
            </a>
            <a routerLink="/auth/login" routerLinkActive="bnav-active" class="bnav-item">
              <mat-icon>login</mat-icon><span>Sign In</span>
            </a>
          }
        </nav>
      }

    </div>
  `,
  styles: [`
    .app-shell { display: flex; flex-direction: column; min-height: 100vh; }

    /* ── Top Nav ── */
    .top-nav {
      position: sticky; top: 0; z-index: 200;
      background: #fff;
      border-bottom: 1px solid var(--color-border);
      box-shadow: 0 1px 8px rgba(0,0,0,.06);
    }
    .nav-inner {
      max-width: 1200px; margin: 0 auto;
      padding: 0 1.5rem; height: var(--nav-height);
      display: flex; align-items: center; gap: 2rem;
    }
    .brand {
      display: flex; align-items: center; gap: .6rem;
      text-decoration: none; flex-shrink: 0;
      .brand-logo { height: 38px; width: auto; object-fit: contain; }
      .brand-name { font-size: 1.1rem; font-weight: 800; color: var(--color-primary); letter-spacing: -.01em; }
    }
    .nav-links {
      display: flex; align-items: center; gap: .1rem; flex: 1;
      a {
        padding: .45rem .85rem; border-radius: 8px;
        font-size: .875rem; font-weight: 500; color: var(--color-muted);
        text-decoration: none; transition: all var(--transition); white-space: nowrap;
        &:hover { background: var(--color-primary-lt); color: var(--color-primary); text-decoration: none; }
        &.active { background: var(--color-primary-lt); color: var(--color-primary); font-weight: 600; }
        &.admin-link { color: var(--color-accent); font-weight: 600; }
        &.tech-link  { color: #3f51b5; font-weight: 600; }
      }
    }
    .nav-actions {
      display: flex; align-items: center; gap: .75rem; flex-shrink: 0;
    }
    .nav-btn {
      padding: .45rem 1rem; border-radius: 8px; font-size: .875rem; font-weight: 600;
      cursor: pointer; text-decoration: none; display: inline-flex; align-items: center;
      min-height: 36px; transition: all var(--transition);
      &.outline { border: 1.5px solid var(--color-border); color: var(--color-text-secondary); background: none; &:hover{border-color:var(--color-primary);color:var(--color-primary);} }
      &.solid   { background: var(--color-primary); color: #fff; border: none; &:hover{background:var(--color-primary-dark);text-decoration:none;} }
    }
    .avatar-btn {
      background: none; border: none; cursor: pointer; padding: 2px; border-radius: 50%;
      transition: box-shadow var(--transition);
      &:hover { box-shadow: 0 0 0 3px var(--color-primary-lt); }
    }
    .avatar {
      width: 36px; height: 36px; border-radius: 50%;
      background: var(--color-primary); color: #fff;
      display: flex; align-items: center; justify-content: center;
      font-size: .82rem; font-weight: 700; letter-spacing: .03em;
    }
    .menu-header {
      display: flex; align-items: center; gap: .75rem;
      padding: .9rem 1rem .6rem; pointer-events: none;
      .menu-avatar {
        width: 40px; height: 40px; border-radius: 50%;
        background: var(--color-primary); color: #fff;
        display: flex; align-items: center; justify-content: center;
        font-size: .85rem; font-weight: 700; flex-shrink: 0;
      }
      strong { display: block; font-size: .9rem; color: var(--color-text); }
    }
    .role-tag {
      font-size: .65rem; font-weight: 700; text-transform: uppercase;
      background: var(--color-primary-lt); color: var(--color-primary);
      padding: .1rem .4rem; border-radius: 4px; display: inline-block; margin-top: 2px;
    }
    .logout-item { color: var(--color-danger) !important; }
    .hamburger {
      display: none; background: none; border: none; cursor: pointer;
      padding: .35rem; border-radius: 8px; color: var(--color-text-secondary);
      &:hover { background: var(--color-primary-lt); color: var(--color-primary); }
      mat-icon { font-size: 1.4rem; width: 1.4rem; height: 1.4rem; display: flex; }
    }

    /* ── Mobile drawer ── */
    .drawer-backdrop {
      position: fixed; inset: 0; background: rgba(0,0,0,.5);
      z-index: 300; backdrop-filter: blur(2px);
    }
    .mobile-drawer {
      position: fixed; top: var(--nav-height); left: 0; right: 0;
      background: #fff; z-index: 301;
      display: flex; flex-direction: column;
      max-height: calc(100dvh - var(--nav-height));
      overflow-y: auto; overscroll-behavior: contain;
      box-shadow: 0 12px 32px rgba(0,0,0,.15);
      border-bottom-left-radius: 20px;
      border-bottom-right-radius: 20px;
    }
    .drawer-header {
      padding: 1rem 1.25rem;
      border-bottom: 1px solid var(--color-border);
    }
    .drawer-user {
      display: flex; align-items: center; gap: .75rem;
      .drawer-avatar { width: 44px; height: 44px; border-radius: 50%; background: var(--color-primary); color: #fff; display: flex; align-items: center; justify-content: center; font-size: .9rem; font-weight: 700; flex-shrink: 0; }
      .drawer-name   { font-size: .95rem; font-weight: 700; color: var(--color-text); }
      .drawer-role   { font-size: .72rem; font-weight: 600; color: var(--color-primary); text-transform: uppercase; letter-spacing: .06em; }
    }
    .drawer-brand { font-size: 1.1rem; font-weight: 800; color: var(--color-primary); }
    .drawer-links {
      display: flex; flex-direction: column; gap: .1rem; padding: .5rem .75rem; flex: 1;
      a {
        display: flex; align-items: center; gap: .85rem;
        padding: .85rem 1rem; border-radius: 10px;
        font-size: .95rem; font-weight: 500; color: var(--color-text-secondary);
        text-decoration: none; transition: all var(--transition);
        mat-icon { font-size: 1.25rem; width: 1.25rem; height: 1.25rem; color: var(--color-muted); flex-shrink: 0; }
        &:hover { background: var(--color-primary-lt); color: var(--color-primary); mat-icon { color: var(--color-primary); } }
        &.active { background: var(--color-primary-lt); color: var(--color-primary); font-weight: 600; mat-icon { color: var(--color-primary); } }
        &.admin-link { color: var(--color-accent); mat-icon { color: var(--color-accent); } }
        &.tech-link  { color: #3f51b5; mat-icon { color: #3f51b5; } }
      }
    }
    .drawer-footer {
      padding: 1rem 1.25rem;
      border-top: 1px solid var(--color-border-lt);
      padding-bottom: calc(1rem + env(safe-area-inset-bottom));
    }
    .drawer-auth {
      display: flex; gap: .75rem;
      .da-btn {
        flex: 1; text-align: center; padding: .8rem; border-radius: 10px;
        font-size: .95rem; font-weight: 700; text-decoration: none; min-height: 44px;
        display: flex; align-items: center; justify-content: center;
        transition: all var(--transition);
        &.outline { border: 1.5px solid var(--color-border); color: var(--color-text-secondary); &:hover{border-color:var(--color-primary);color:var(--color-primary);} }
        &.solid   { background: var(--color-primary); color: #fff; border: none; &:hover{background:var(--color-primary-dark);} }
      }
    }
    .drawer-logout {
      width: 100%; display: flex; align-items: center; justify-content: center; gap: .5rem;
      background: #fff5f5; border: 1.5px solid #fed7d7; border-radius: 10px;
      padding: .8rem; font-size: .95rem; font-weight: 700; color: var(--color-danger); cursor: pointer;
      min-height: 44px; transition: all var(--transition);
      mat-icon { font-size: 1.1rem; width: 1.1rem; height: 1.1rem; }
      &:hover { background: #fed7d7; }
    }

    /* ── Main content ── */
    .main-content { flex: 1; }

    /* ── Footer ── */
    .app-footer {
      background: #fff;
      border-top: 1px solid var(--color-border);
      margin-top: auto;
    }
    .footer-inner {
      max-width: 1200px; margin: 0 auto;
      padding: 1.5rem;
      display: flex; align-items: center; flex-wrap: wrap; gap: 1.5rem;
    }
    .footer-brand {
      flex: 1; min-width: 160px;
      strong { font-size: .95rem; font-weight: 800; color: var(--color-text); display: block; margin-bottom: .15rem; }
      p  { font-size: .8rem; color: var(--color-muted); }
    }
    .footer-links {
      display: flex; gap: 1.5rem; flex-wrap: wrap;
      a { font-size: .85rem; color: var(--color-muted); text-decoration: none; font-weight: 500; transition: color var(--transition);
        &:hover { color: var(--color-primary); }
      }
    }
    .footer-social { display: flex; gap: .6rem; }
    .social-btn {
      width: 32px; height: 32px; border-radius: 8px;
      background: var(--color-bg); border: 1px solid var(--color-border);
      display: flex; align-items: center; justify-content: center;
      color: var(--color-muted); transition: all var(--transition);
      &:hover { background: var(--color-primary-lt); color: var(--color-primary); border-color: var(--color-primary-mid); }
    }
    .footer-copy {
      max-width: 1200px; margin: 0 auto;
      padding: .75rem 1.5rem;
      border-top: 1px solid var(--color-border-lt);
      font-size: .78rem; color: var(--color-muted);
    }

    /* ── Bottom navigation ── */
    .bottom-nav {
      display: none;
      position: fixed; bottom: 0; left: 0; right: 0; z-index: 199;
      background: rgba(255,255,255,.95);
      backdrop-filter: saturate(180%) blur(12px);
      -webkit-backdrop-filter: saturate(180%) blur(12px);
      border-top: 1px solid var(--color-border);
      box-shadow: 0 -4px 20px rgba(0,0,0,.08);
      padding-bottom: env(safe-area-inset-bottom);
    }
    .bnav-item {
      flex: 1; display: flex; flex-direction: column; align-items: center;
      gap: 3px; padding: 8px 4px 6px;
      color: var(--color-muted); text-decoration: none;
      font-size: 10px; font-weight: 600; line-height: 1; min-height: 52px;
      transition: color var(--transition);
      mat-icon { font-size: 22px; width: 22px; height: 22px; }
      &.bnav-active { color: var(--color-primary); }
      &:hover { color: var(--color-primary); text-decoration: none; }
    }
    .bnav-center {
      flex: 1; display: flex; flex-direction: column; align-items: center; gap: 3px;
      padding: 4px 4px 6px; min-height: 52px; color: var(--color-muted);
      text-decoration: none; font-size: 10px; font-weight: 600;
      &.bnav-active { color: var(--color-primary); .bnav-fab { background: var(--color-primary-dark); } }
      &:hover { color: var(--color-primary); text-decoration: none; }
    }
    .bnav-fab {
      width: 44px; height: 44px; border-radius: 50%;
      background: var(--color-primary);
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 4px 12px rgba(0,121,107,.4);
      transition: background var(--transition), box-shadow var(--transition);
      margin-top: -12px;
      mat-icon { font-size: 22px; width: 22px; height: 22px; color: #fff; }
    }

    @media (max-width: 768px) {
      .nav-links       { display: none; }
      .hamburger       { display: flex; }
      .nav-btn.outline,
      .nav-btn.solid   { display: none; }
      .bottom-nav      { display: flex; }
      .main-content    {
        padding-bottom: calc(var(--bottom-nav-height) + env(safe-area-inset-bottom));
      }
    }

    @media (max-width: 480px) {
      .nav-inner { padding: 0 1rem; }
      .brand-name { font-size: 1rem; }
    }
  `],
})
export class AppComponent {
  private auth   = inject(AuthStateService);
  private router = inject(Router);

  mobileOpen = signal(false);

  isAuth      = this.auth.isAuthenticated;
  role        = computed(() => this.auth.currentUser()?.role ?? '');
  isAdmin     = computed(() => this.role() === 'admin');
  isTechnician= computed(() => this.role() === 'technician');
  userName    = computed(() => this.auth.currentUser()?.name ?? '');
  initials    = computed(() => {
    const name = this.userName();
    return name ? name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2) : 'U';
  });
  isHome = computed(() => {
    const url = this.router.url;
    return url === '/' || url === '';
  });
  showBottomNav = computed(() => {
    const url = this.router.url;
    return !url.startsWith('/admin') && !url.startsWith('/technician');
  });

  logout(): void {
    this.mobileOpen.set(false);
    this.auth.clearSession();
    this.router.navigate(['/tests']);
  }
}
