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
  color: string;
  bg: string;
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="profile-page">
      <!-- Header -->
      <div class="profile-header">
        <div class="avatar">
          <mat-icon>person</mat-icon>
        </div>
        <div class="user-info">
          <h2>{{ userName() }}</h2>
          <p>{{ userPhone() }}</p>
        </div>
      </div>

      <!-- Tile Grid -->
      <div class="tile-grid">
        @for (tile of tiles; track tile.label) {
          <button class="tile" (click)="handleTile(tile)">
            <div class="tile-icon" [style.background]="tile.bg" [style.color]="tile.color">
              <mat-icon>{{ tile.icon }}</mat-icon>
            </div>
            <span class="tile-label">{{ tile.label }}</span>
          </button>
        }
      </div>

      <!-- Logout -->
      <div class="logout-wrap">
        <button class="btn-logout" (click)="logout()">
          <mat-icon>logout</mat-icon>
          Log Out
        </button>
      </div>
    </div>
  `,
  styles: [`
    .profile-page {
      min-height: 100vh;
      background: #f7fafc;
      padding-bottom: 2rem;
    }
    .profile-header {
      background: linear-gradient(135deg, #00796b, #004d40);
      color: #fff;
      padding: 2rem 1.5rem 2.5rem;
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    .avatar {
      width: 64px; height: 64px;
      border-radius: 50%;
      background: rgba(255,255,255,.2);
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
      mat-icon { font-size: 2rem; width: 2rem; height: 2rem; color: #fff; }
    }
    .user-info {
      h2 { font-size: 1.25rem; font-weight: 700; margin: 0 0 .25rem; }
      p { font-size: .875rem; opacity: .8; margin: 0; }
    }
    .tile-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1rem;
      padding: 1.5rem;
      margin-top: -1rem;
      background: #fff;
      border-radius: 20px 20px 0 0;
    }
    .tile {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: .6rem;
      padding: 1.25rem .5rem;
      background: #fff;
      border: 1.5px solid #e2e8f0;
      border-radius: 16px;
      cursor: pointer;
      transition: box-shadow .15s, transform .1s;
      &:hover { box-shadow: 0 4px 16px rgba(0,0,0,.08); transform: translateY(-2px); }
      &:active { transform: translateY(0); }
    }
    .tile-icon {
      width: 52px; height: 52px;
      border-radius: 14px;
      display: flex; align-items: center; justify-content: center;
      mat-icon { font-size: 1.5rem; width: 1.5rem; height: 1.5rem; }
    }
    .tile-label {
      font-size: .75rem;
      font-weight: 600;
      color: #4a5568;
      text-align: center;
      line-height: 1.3;
    }
    .logout-wrap {
      padding: 0 1.5rem;
      margin-top: 1rem;
    }
    .btn-logout {
      width: 100%;
      display: flex; align-items: center; justify-content: center; gap: .5rem;
      padding: .9rem;
      background: #fff;
      border: 1.5px solid #fed7d7;
      border-radius: 14px;
      color: #e53e3e;
      font-size: 1rem;
      font-weight: 700;
      cursor: pointer;
      transition: background .15s;
      mat-icon { font-size: 1.2rem; width: 1.2rem; height: 1.2rem; }
      &:hover { background: #fff5f5; }
    }
  `],
})
export class ProfileComponent implements OnInit {
  userName = signal('');
  userPhone = signal('');

  tiles: Tile[] = [
    { icon: 'person', label: 'My Profile', route: '/profile/edit', color: '#00796b', bg: '#e0f2f1' },
    { icon: 'group', label: 'Manage Members', route: '/profile/family', color: '#5c6bc0', bg: '#e8eaf6' },
    { icon: 'location_on', label: 'Address Book', route: '/profile/addresses', color: '#ef6c00', bg: '#fff3e0' },
    { icon: 'download', label: 'Download Reports', route: '/reports', color: '#2e7d32', bg: '#e8f5e9' },
    { icon: 'receipt_long', label: 'My Orders', route: '/dashboard', color: '#1565c0', bg: '#e3f2fd' },
    { icon: 'help_outline', label: 'Help', route: '/contact', color: '#7b1fa2', bg: '#f3e5f5' },
    { icon: 'support_agent', label: 'Contact Us', route: '/contact', color: '#0277bd', bg: '#e1f5fe' },
  ];

  constructor(
    private router: Router,
    private authState: AuthStateService,
  ) {}

  ngOnInit(): void {
    const user = this.authState.currentUser();
    this.userName.set(user?.name ?? 'User');
    this.userPhone.set(user?.phone ?? '');
  }

  handleTile(tile: Tile): void {
    if (tile.action) { tile.action(); return; }
    if (tile.route) this.router.navigate([tile.route]);
  }

  logout(): void {
    this.authState.clearSession();
    this.router.navigate(['/auth/login']);
  }
}
