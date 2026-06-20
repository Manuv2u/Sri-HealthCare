import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { LabBranchApiService } from '../../core/api/services/lab-branch-api.service';
import { LabBranch } from '../../core/api/api.types';

@Component({
  selector: 'app-lab-locations',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule, RouterLink],
  template: `
    <div class="page">
      <div class="hero">
        <h1>Our Lab Locations</h1>
        <p>Visit us at any of our branches — walk-in or book a home collection</p>
        <a routerLink="/booking" mat-flat-button color="primary" class="book-btn">
          <mat-icon>calendar_today</mat-icon> Book a Test
        </a>
      </div>

      <div class="content">
        @if (loading()) {
          <div class="loading-state">
            <div class="spinner"></div>
            <span>Loading locations…</span>
          </div>
        } @else if (error()) {
          <div class="error-state">
            <mat-icon>error_outline</mat-icon>
            <p>{{ error() }}</p>
            <button mat-stroked-button (click)="load()">Retry</button>
          </div>
        } @else if (branches().length === 0) {
          <div class="empty-state">
            <mat-icon>location_off</mat-icon>
            <p>No lab locations available at the moment.</p>
          </div>
        } @else {
          <div class="branches-grid">
            @for (branch of branches(); track branch.id) {
              <div class="branch-card">
                <div class="branch-icon-wrap">
                  <mat-icon class="branch-icon">local_hospital</mat-icon>
                </div>
                <div class="branch-info">
                  <h3 class="branch-name">{{ branch.name }}</h3>
                  <div class="branch-detail">
                    <mat-icon>location_on</mat-icon>
                    <span>{{ branch.address }}, {{ branch.pincode }}</span>
                  </div>
                  @if (branch.phone) {
                    <div class="branch-detail">
                      <mat-icon>phone</mat-icon>
                      <a [href]="'tel:' + branch.phone" class="phone-link">{{ branch.phone }}</a>
                    </div>
                  }
                </div>
                <a routerLink="/booking" mat-stroked-button class="visit-btn">
                  Book Here
                </a>
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .page { min-height: 100vh; background: #f7fafc; }

    .hero {
      background: linear-gradient(135deg, #00796b, #004d40);
      color: #fff; text-align: center; padding: 3rem 1.5rem 2.5rem;
      h1 { margin: 0 0 .5rem; font-size: clamp(1.5rem, 4vw, 2.2rem); font-weight: 800; }
      p { margin: 0 0 1.5rem; opacity: .85; font-size: 1rem; }
    }
    .book-btn {
      display: inline-flex; align-items: center; gap: .5rem;
      background: #fff !important; color: #00796b !important;
      font-weight: 700;
    }

    .content { max-width: 1100px; margin: 0 auto; padding: 2rem 1.25rem 3rem; }

    .loading-state, .error-state, .empty-state {
      text-align: center; padding: 3rem 1rem; color: #718096;
      display: flex; flex-direction: column; align-items: center; gap: .75rem;
      mat-icon { font-size: 2.5rem; width: 2.5rem; height: 2.5rem; color: #cbd5e0; }
    }
    .spinner {
      width: 36px; height: 36px; border: 3px solid #e2e8f0;
      border-top-color: #00796b; border-radius: 50%; animation: spin 1s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    .branches-grid {
      display: grid; gap: 1.25rem;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    }

    .branch-card {
      background: #fff; border-radius: 16px; border: 1px solid #e2e8f0;
      padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem;
      box-shadow: 0 2px 8px rgba(0,0,0,.05);
      transition: box-shadow .2s, transform .2s;
      &:hover { box-shadow: 0 6px 24px rgba(0,121,107,.12); transform: translateY(-2px); }
    }
    .branch-icon-wrap {
      width: 48px; height: 48px; border-radius: 12px;
      background: #e0f2f1; display: flex; align-items: center; justify-content: center;
    }
    .branch-icon { font-size: 1.6rem; width: 1.6rem; height: 1.6rem; color: #00796b; }
    .branch-info { flex: 1; display: flex; flex-direction: column; gap: .4rem; }
    .branch-name { margin: 0; font-size: 1rem; font-weight: 700; color: #1a202c; }
    .branch-detail {
      display: flex; align-items: flex-start; gap: .4rem;
      font-size: .85rem; color: #718096;
      mat-icon { font-size: .95rem; width: .95rem; height: .95rem; flex-shrink: 0; margin-top: .1rem; color: #00796b; }
    }
    .phone-link { color: #718096; text-decoration: none; &:hover { color: #00796b; } }
    .visit-btn { align-self: flex-start; font-size: .85rem; }

    @media (max-width: 480px) {
      .branches-grid { grid-template-columns: 1fr; }
    }
  `],
})
export class LabLocationsComponent implements OnInit {
  branches = signal<LabBranch[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  constructor(private labBranchApi: LabBranchApiService) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.labBranchApi.list().subscribe({
      next: (items) => { this.branches.set(items.filter((b) => b.is_active)); this.loading.set(false); },
      error: () => { this.error.set('Failed to load lab locations.'); this.loading.set(false); },
    });
  }
}
