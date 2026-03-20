import { Component, computed, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, RouterLinkWithHref, Router } from '@angular/router';
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
          <a routerLink="/tests" class="brand">
            <span class="brand-icon">🧪</span>
            <span class="brand-name">SRI Diagnostics</span>
          </a>

          <!-- Center links -->
          <nav class="nav-links">
            <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{exact:true}">Home</a>
            <a routerLink="/tests" routerLinkActive="active">Tests</a>
            <a routerLink="/packages" routerLinkActive="active">Packages</a>
            @if (isAuth()) {
              <a routerLink="/dashboard" routerLinkActive="active">My Bookings</a>
              <a routerLink="/reports" routerLinkActive="active">Reports</a>
            }
            @if (isAdmin()) {
              <a routerLink="/admin" routerLinkActive="active" class="admin-link">Admin</a>
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
                <button mat-menu-item routerLink="/dashboard">
                  <mat-icon>calendar_today</mat-icon> My Bookings
                </button>
                <button mat-menu-item routerLink="/reports">
                  <mat-icon>description</mat-icon> Reports
                </button>
                <mat-divider />
                <button mat-menu-item (click)="logout()" class="logout-item">
                  <mat-icon>logout</mat-icon> Sign Out
                </button>
              </mat-menu>
            }
          </div>
        </div>
      </header>

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
      .brand-icon { font-size: 1.5rem; }
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
    }
    .footer-links { display: flex; gap: 1.5rem;
      a { color: var(--color-muted); text-decoration: none;
        &:hover { color: var(--color-primary); }
      }
    }

    @media (max-width: 640px) {
      .nav-links { display: none; }
      .brand-name { font-size: 1rem; }
    }
  `],
})
export class AppComponent {
  private auth = inject(AuthStateService);
  private router = inject(Router);

  isAuth = this.auth.isAuthenticated;
  role = computed(() => this.auth.currentUser()?.role ?? '');
  isAdmin = computed(() => this.role() === 'admin');
  userName = computed(() => this.auth.currentUser()?.name ?? '');
  initials = computed(() => {
    const name = this.userName();
    return name ? name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : 'U';
  });
  isHome = computed(() => this.router.url === '/');

  logout(): void {
    this.auth.clearSession();
    this.router.navigate(['/tests']);
  }
}
