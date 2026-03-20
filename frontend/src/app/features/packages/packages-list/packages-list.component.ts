import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { Router, RouterLink } from '@angular/router';
import { PackageApiService } from '../../../core/api/services/package-api.service';
import { Package } from '../../../core/api/api.types';

@Component({
  selector: 'app-packages-list',
  standalone: true,
  imports: [CommonModule, MatIconModule, RouterLink],
  template: `
    <div class="packages-page">
      <!-- Header -->
      <div class="page-header">
        <div class="page-header-inner">
          <h1>Health Packages</h1>
          <p>Comprehensive diagnostic panels designed for early detection and holistic health monitoring</p>
        </div>
      </div>

      <div class="packages-body">
        @if (loading()) {
          <div class="pkg-grid">
            @for (i of [1,2,3,4,5,6]; track i) { <div class="skeleton-card"></div> }
          </div>
        } @else if (error()) {
          <div class="error-state">
            <mat-icon>error_outline</mat-icon>
            <p>{{ error() }}</p>
            <button (click)="load()">Retry</button>
          </div>
        } @else if (packages().length === 0) {
          <div class="empty-state">
            <mat-icon>inventory_2</mat-icon>
            <h3>No packages available yet</h3>
            <p>Check back soon or browse individual tests</p>
            <a routerLink="/tests" class="btn-browse">Browse Tests</a>
          </div>
        } @else {
          <div class="pkg-grid">
            @for (pkg of packages(); track pkg.id) {
              <div class="pkg-card">
                <div class="pkg-icon"><mat-icon>inventory_2</mat-icon></div>
                <h3>{{ pkg.name }}</h3>
                @if (pkg.description) { <p class="pkg-desc">{{ pkg.description }}</p> }
                <div class="pkg-tests">
                  @for (t of pkg.tests.slice(0, 4); track t.id) {
                    <span class="pkg-test-chip">
                      <mat-icon>check_circle</mat-icon> {{ t.name }}
                    </span>
                  }
                  @if (pkg.tests.length > 4) {
                    <span class="pkg-test-chip more">+{{ pkg.tests.length - 4 }} more tests</span>
                  }
                </div>
                <div class="pkg-footer">
                  <div class="pkg-price">
                    @if (pkg.original_price > pkg.discounted_price) {
                      <span class="pkg-orig">₹{{ pkg.original_price }}</span>
                      <span class="pkg-badge">{{ discountPct(pkg) }}% off</span>
                    }
                    <span class="pkg-eff">₹{{ pkg.discounted_price }}</span>
                  </div>
                  <button class="btn-book" (click)="book(pkg)">Book Now</button>
                </div>
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .packages-page { min-height: calc(100vh - 64px); background: #f7fafc; }

    .page-header { background: linear-gradient(135deg, #f0fdf9, #e0f2f1); padding: 2.5rem 1.5rem; }
    .page-header-inner { max-width: 1100px; margin: 0 auto;
      h1 { font-size: 2rem; font-weight: 800; color: #1a202c; margin-bottom: .5rem; }
      p { color: #718096; font-size: 1rem; max-width: 560px; }
    }

    .packages-body { max-width: 1100px; margin: 0 auto; padding: 2rem 1.5rem; }

    .pkg-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1.25rem; }

    .pkg-card {
      background: #fff; border-radius: 14px; padding: 1.5rem;
      border: 1px solid #e2e8f0; box-shadow: 0 2px 8px rgba(0,0,0,.05);
      display: flex; flex-direction: column; gap: .75rem;
      transition: box-shadow .2s, transform .2s;
      &:hover { box-shadow: 0 6px 20px rgba(0,0,0,.1); transform: translateY(-2px); }
    }
    .pkg-icon {
      width: 44px; height: 44px; background: #e0f2f1; border-radius: 12px;
      display: flex; align-items: center; justify-content: center;
      mat-icon { color: #00796b; }
    }
    .pkg-card h3 { font-size: 1.05rem; font-weight: 700; color: #1a202c; }
    .pkg-desc { font-size: .85rem; color: #718096; line-height: 1.5; }
    .pkg-tests { display: flex; flex-direction: column; gap: .3rem; flex: 1; }
    .pkg-test-chip {
      display: inline-flex; align-items: center; gap: .3rem;
      font-size: .8rem; color: #4a5568;
      mat-icon { font-size: .9rem; width: .9rem; height: .9rem; color: #38a169; }
      &.more { color: #718096; }
    }
    .pkg-footer { display: flex; justify-content: space-between; align-items: center; padding-top: .75rem; border-top: 1px solid #f0f4f8; margin-top: auto; }
    .pkg-price { display: flex; align-items: baseline; gap: .4rem; flex-wrap: wrap; }
    .pkg-orig { font-size: .8rem; color: #a0aec0; text-decoration: line-through; }
    .pkg-badge { font-size: .7rem; font-weight: 700; background: #fed7d7; color: #c53030; padding: .1rem .4rem; border-radius: 999px; }
    .pkg-eff { font-size: 1.1rem; font-weight: 800; color: #00796b; }
    .btn-book {
      background: #00796b; color: #fff; border: none; border-radius: 8px;
      padding: .45rem 1rem; font-size: .85rem; font-weight: 600; cursor: pointer; white-space: nowrap;
      &:hover { background: #00695c; }
    }

    .skeleton-card { height: 240px; border-radius: 14px; background: linear-gradient(90deg,#f0f4f8 25%,#e2e8f0 50%,#f0f4f8 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; }
    @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }

    .error-state, .empty-state { display: flex; flex-direction: column; align-items: center; gap: 1rem; padding: 4rem 2rem; color: #718096;
      mat-icon { font-size: 3rem; width: 3rem; height: 3rem; color: #cbd5e0; }
      h3 { font-size: 1.1rem; font-weight: 700; color: #4a5568; }
      p { font-size: .875rem; }
      button, .btn-browse { background: #00796b; color: #fff; border: none; border-radius: 8px; padding: .5rem 1.25rem; font-size: .875rem; font-weight: 600; cursor: pointer; text-decoration: none; &:hover{background:#00695c;} }
    }
  `],
})
export class PackagesListComponent implements OnInit {
  packages = signal<Package[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  constructor(private packageApi: PackageApiService, private router: Router) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.packageApi.list().subscribe({
      next: (res) => { this.packages.set(res.items); this.loading.set(false); },
      error: () => { this.error.set('Failed to load packages.'); this.loading.set(false); },
    });
  }

  discountPct(p: Package): number {
    if (!p.original_price) return 0;
    return Math.round((1 - p.discounted_price / p.original_price) * 100);
  }

  book(p: Package): void {
    this.router.navigate(['/booking'], { queryParams: { package_id: p.id } });
  }
}
