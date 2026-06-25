import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AuthStateService } from '../../../core/auth/auth-state.service';

interface Tile {
  icon: string;
  label: string;
  route?: string;
  action?: () => void;
  gradientFrom: string;
  gradientTo: string;
  iconColor: string;
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="profile-page">

      <!-- ── Hero Banner ───────────────────────────────────────────── -->
      <div class="hero-banner">
        <!-- Decorative blobs -->
        <div class="blob blob-1" aria-hidden="true"></div>
        <div class="blob blob-2" aria-hidden="true"></div>

        <div class="hero-inner">
          <div class="avatar-ring">
            <div class="avatar-circle">
              <span class="avatar-initials">{{ initials() }}</span>
            </div>
          </div>

          <div class="hero-info">
            <div class="name-row">
              <h1 class="hero-name">{{ userName() }}</h1>
              <span class="verified-badge" title="Verified account">
                <mat-icon>verified</mat-icon>
                Verified
              </span>
            </div>
            <p class="hero-phone">{{ userPhone() }}</p>
          </div>

          <!-- Profile completeness -->
          <div class="completeness-card">
            <div class="completeness-header">
              <span class="completeness-label">Profile Completeness</span>
              <span class="completeness-pct">75%</span>
            </div>
            <div class="progress-track" role="progressbar" aria-valuenow="75" aria-valuemin="0" aria-valuemax="100">
              <div class="progress-fill"></div>
            </div>
            <p class="completeness-hint">Add your date of birth to complete your profile</p>
          </div>
        </div>
      </div>

      <!-- ── Tile sheet ────────────────────────────────────────────── -->
      <div class="sheet">

        <p class="sheet-eyebrow">Quick Access</p>

        <div class="tile-grid">
          @for (tile of tiles; track tile.label; let i = $index) {
            <button
              class="tile fade-in"
              [class]="'tile fade-in stagger-' + (i + 1)"
              (click)="handleTile(tile)"
              [attr.aria-label]="tile.label"
            >
              <div
                class="tile-icon-wrap"
                [style.background]="'linear-gradient(135deg, ' + tile.gradientFrom + ', ' + tile.gradientTo + ')'"
              >
                <mat-icon [style.color]="tile.iconColor">{{ tile.icon }}</mat-icon>
              </div>
              <span class="tile-label">{{ tile.label }}</span>
              <mat-icon class="tile-chevron">chevron_right</mat-icon>
            </button>
          }
        </div>

        <!-- ── Logout ────────────────────────────────────────────── -->
        <div class="logout-section">
          @if (!confirmLogout()) {
            <button class="btn-logout" (click)="confirmLogout.set(true)">
              <mat-icon>logout</mat-icon>
              Log Out
            </button>
          } @else {
            <div class="logout-confirm">
              <p class="logout-confirm-text">Are you sure you want to log out?</p>
              <div class="logout-confirm-actions">
                <button class="btn-cancel" (click)="confirmLogout.set(false)">Cancel</button>
                <button class="btn-confirm-logout" (click)="logout()">
                  <mat-icon>logout</mat-icon>
                  Yes, Log Out
                </button>
              </div>
            </div>
          }
        </div>

        <!-- ── Version ──────────────────────────────────────────── -->
        <p class="app-version">Sri Health &nbsp;·&nbsp; v1.0.0</p>

      </div>
    </div>
  `,
  styles: [`
    /* ── Page shell ───────────────────────────────────────────────── */
    .profile-page {
      min-height: 100vh;
      background: var(--color-bg);
      padding-bottom: calc(var(--bottom-nav-height) + env(safe-area-inset-bottom) + 1rem);
    }

    /* ── Hero Banner ──────────────────────────────────────────────── */
    .hero-banner {
      position: relative;
      background: linear-gradient(145deg, #4F46E5 0%, #6366F1 45%, #818CF8 100%);
      padding: calc(var(--nav-height) + 1.5rem) 1.5rem 4.5rem;
      overflow: hidden;
    }

    /* Decorative blobs */
    .blob {
      position: absolute;
      border-radius: 50%;
      opacity: .18;
      pointer-events: none;
    }
    .blob-1 {
      width: 220px; height: 220px;
      background: radial-gradient(circle, #F97316, transparent 70%);
      top: -60px; right: -40px;
    }
    .blob-2 {
      width: 160px; height: 160px;
      background: radial-gradient(circle, #C7D2FE, transparent 70%);
      bottom: 20px; left: -30px;
    }

    .hero-inner {
      position: relative;
      z-index: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
      text-align: center;
    }

    /* Avatar */
    .avatar-ring {
      width: 92px; height: 92px;
      border-radius: 50%;
      background: rgba(255, 255, 255, .2);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 0 3px rgba(255,255,255,.35), var(--shadow-xl);
    }
    .avatar-circle {
      width: 76px; height: 76px;
      border-radius: 50%;
      background: linear-gradient(135deg, #F97316, #FB923C);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .avatar-initials {
      font-size: 1.625rem;
      font-weight: 800;
      color: #fff;
      letter-spacing: .04em;
      line-height: 1;
      font-family: 'Inter', sans-serif;
    }

    /* Hero text */
    .hero-info {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: .375rem;
    }
    .name-row {
      display: flex;
      align-items: center;
      gap: .5rem;
      flex-wrap: wrap;
      justify-content: center;
    }
    .hero-name {
      font-size: 1.5rem;
      font-weight: 800;
      color: #fff;
      line-height: 1.2;
      margin: 0;
      text-wrap: balance;
    }
    .verified-badge {
      display: inline-flex;
      align-items: center;
      gap: .2rem;
      background: rgba(255, 255, 255, .18);
      border: 1px solid rgba(255, 255, 255, .3);
      color: #fff;
      border-radius: var(--radius-full);
      padding: .2rem .6rem .2rem .4rem;
      font-size: .68rem;
      font-weight: 700;
      letter-spacing: .04em;
      text-transform: uppercase;
      backdrop-filter: blur(6px);
      mat-icon { font-size: .9rem; width: .9rem; height: .9rem; color: #86EFAC; }
    }
    .hero-phone {
      font-size: .9rem;
      color: rgba(255, 255, 255, .75);
      margin: 0;
      font-variant-numeric: tabular-nums;
      letter-spacing: .02em;
    }

    /* Completeness card */
    .completeness-card {
      width: 100%;
      max-width: 360px;
      background: rgba(255, 255, 255, .15);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, .25);
      border-radius: var(--radius-lg);
      padding: .875rem 1rem;
      margin-top: .25rem;
    }
    .completeness-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: .5rem;
    }
    .completeness-label {
      font-size: .78rem;
      font-weight: 600;
      color: rgba(255, 255, 255, .9);
      letter-spacing: .02em;
    }
    .completeness-pct {
      font-size: .78rem;
      font-weight: 800;
      color: #fff;
      font-variant-numeric: tabular-nums;
    }
    .progress-track {
      width: 100%;
      height: 6px;
      background: rgba(255, 255, 255, .2);
      border-radius: var(--radius-full);
      overflow: hidden;
    }
    .progress-fill {
      height: 100%;
      width: 75%;
      background: linear-gradient(90deg, #F97316, #FB923C);
      border-radius: var(--radius-full);
      box-shadow: 0 0 8px rgba(249, 115, 22, .6);
    }
    .completeness-hint {
      margin: .4rem 0 0;
      font-size: .7rem;
      color: rgba(255, 255, 255, .6);
      line-height: 1.4;
    }

    /* ── Content sheet ────────────────────────────────────────────── */
    .sheet {
      background: var(--color-bg);
      border-radius: var(--radius-xl) var(--radius-xl) 0 0;
      margin-top: -2rem;
      padding: 1.5rem 1.25rem 1rem;
      position: relative;
      z-index: 2;
    }

    .sheet-eyebrow {
      font-size: .7rem;
      font-weight: 700;
      letter-spacing: .1em;
      text-transform: uppercase;
      color: var(--color-muted);
      margin-bottom: 1rem;
      padding: 0 .25rem;
    }

    /* ── Tile grid ────────────────────────────────────────────────── */
    .tile-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: .75rem;
    }

    .tile {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: .55rem;
      padding: 1.1rem .5rem .9rem;
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      cursor: pointer;
      transition: box-shadow var(--transition-md), transform var(--transition-md), border-color var(--transition);
      text-align: center;
      position: relative;
      overflow: hidden;

      &:hover {
        box-shadow: var(--shadow-md);
        transform: translateY(-2px);
        border-color: var(--color-primary-mid);
      }
      &:active { transform: translateY(0); box-shadow: none; }
      &:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }
    }

    .tile-icon-wrap {
      width: 48px; height: 48px;
      border-radius: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      box-shadow: 0 2px 8px rgba(0, 0, 0, .1);

      mat-icon {
        font-size: 1.375rem;
        width: 1.375rem;
        height: 1.375rem;
      }
    }

    .tile-label {
      font-size: .7rem;
      font-weight: 700;
      color: var(--color-text);
      line-height: 1.3;
      text-align: center;
    }

    /* Hide chevron on the column tiles — it's decorative on row layouts */
    .tile-chevron {
      display: none;
      font-size: .875rem;
      width: .875rem;
      height: .875rem;
      color: var(--color-muted);
    }

    /* ── Logout section ───────────────────────────────────────────── */
    .logout-section {
      margin-top: 1.5rem;
      padding: 0 .25rem;
    }

    .btn-logout {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: .5rem;
      padding: .875rem;
      background: var(--color-surface);
      border: 1.5px solid #FECACA;
      border-radius: var(--radius-lg);
      color: var(--color-error);
      font-size: .95rem;
      font-weight: 700;
      font-family: inherit;
      cursor: pointer;
      transition: background var(--transition), border-color var(--transition), box-shadow var(--transition);

      mat-icon {
        font-size: 1.125rem;
        width: 1.125rem;
        height: 1.125rem;
      }

      &:hover {
        background: #FEF2F2;
        border-color: var(--color-error);
        box-shadow: 0 2px 12px rgba(239, 68, 68, .15);
      }
      &:active { transform: scale(.98); }
      &:focus-visible { outline: 2px solid var(--color-error); outline-offset: 2px; }
    }

    .logout-confirm {
      background: #FEF2F2;
      border: 1.5px solid #FECACA;
      border-radius: var(--radius-lg);
      padding: 1.125rem 1rem;
      animation: scaleIn .18s ease both;
    }
    .logout-confirm-text {
      font-size: .875rem;
      font-weight: 600;
      color: var(--color-error);
      text-align: center;
      margin-bottom: .875rem;
    }
    .logout-confirm-actions {
      display: flex;
      gap: .625rem;
    }
    .btn-cancel {
      flex: 1;
      padding: .7rem;
      background: var(--color-surface);
      border: 1.5px solid var(--color-border);
      border-radius: var(--radius);
      font-size: .875rem;
      font-weight: 600;
      color: var(--color-text-secondary);
      font-family: inherit;
      cursor: pointer;
      transition: all var(--transition);
      &:hover { background: var(--color-border-lt); }
    }
    .btn-confirm-logout {
      flex: 2;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: .375rem;
      padding: .7rem;
      background: var(--color-error);
      border: none;
      border-radius: var(--radius);
      font-size: .875rem;
      font-weight: 700;
      color: #fff;
      font-family: inherit;
      cursor: pointer;
      transition: background var(--transition), box-shadow var(--transition);

      mat-icon {
        font-size: 1rem;
        width: 1rem;
        height: 1rem;
      }

      &:hover { background: #DC2626; box-shadow: 0 2px 12px rgba(239,68,68,.3); }
    }

    /* ── Version ──────────────────────────────────────────────────── */
    .app-version {
      text-align: center;
      font-size: .7rem;
      color: var(--color-muted);
      margin-top: 1.75rem;
      letter-spacing: .04em;
    }
  `],
})
export class ProfileComponent implements OnInit {
  userName  = signal('');
  userPhone = signal('');
  initials  = signal('');
  confirmLogout = signal(false);

  tiles: Tile[] = [
    {
      icon: 'person',
      label: 'My Profile',
      route: '/profile/edit',
      gradientFrom: '#EEF2FF', gradientTo: '#C7D2FE', iconColor: '#4F46E5',
    },
    {
      icon: 'group',
      label: 'Family Members',
      route: '/profile/family',
      gradientFrom: '#FFF7ED', gradientTo: '#FED7AA', iconColor: '#EA580C',
    },
    {
      icon: 'location_on',
      label: 'Address Book',
      route: '/profile/addresses',
      gradientFrom: '#ECFDF5', gradientTo: '#A7F3D0', iconColor: '#059669',
    },
    {
      icon: 'description',
      label: 'My Reports',
      route: '/reports',
      gradientFrom: '#EFF6FF', gradientTo: '#BFDBFE', iconColor: '#2563EB',
    },
    {
      icon: 'receipt_long',
      label: 'My Bookings',
      route: '/dashboard',
      gradientFrom: '#F5F3FF', gradientTo: '#DDD6FE', iconColor: '#7C3AED',
    },
    {
      icon: 'lock',
      label: 'Change Password',
      route: '/auth/change-password',
      gradientFrom: '#FFF1F2', gradientTo: '#FECDD3', iconColor: '#E11D48',
    },
    {
      icon: 'help_outline',
      label: 'Help & Support',
      route: '/contact',
      gradientFrom: '#FFFBEB', gradientTo: '#FDE68A', iconColor: '#D97706',
    },
    {
      icon: 'support_agent',
      label: 'Contact Us',
      route: '/contact',
      gradientFrom: '#F0FDFA', gradientTo: '#99F6E4', iconColor: '#0D9488',
    },
  ];

  constructor(
    private router: Router,
    private authState: AuthStateService,
  ) {}

  ngOnInit(): void {
    const user = this.authState.currentUser();
    const name = user?.name ?? 'User';
    this.userName.set(name);
    this.userPhone.set(user?.phone ?? '');
    this.initials.set(
      name
        .trim()
        .split(/\s+/)
        .map((w: string) => w[0]?.toUpperCase() ?? '')
        .slice(0, 2)
        .join(''),
    );
  }

  handleTile(tile: Tile): void {
    if (tile.action) { tile.action(); return; }
    if (tile.route)  this.router.navigate([tile.route]);
  }

  logout(): void {
    this.authState.clearSession();
    this.router.navigate(['/auth/login']);
  }
}
