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

      <!-- Hero Banner -->
      <div class="hero">
        <div class="hero-inner">
          <div class="hero-eyebrow">
            <span class="eyebrow-dot"></span>
            Sri Health Packages
          </div>
          <h1 class="hero-title">Complete health checkups<br>at unbeatable prices</h1>
          <p class="hero-sub">
            Curated diagnostic panels for early detection, annual wellness and<br class="hero-br">
            targeted health monitoring — all under one booking.
          </p>
          <div class="hero-stats">
            <div class="stat"><span class="stat-n">{{ packages().length || '—' }}</span><span class="stat-l">Packages</span></div>
            <div class="stat-divider"></div>
            <div class="stat"><span class="stat-n">NABL</span><span class="stat-l">Accredited Lab</span></div>
            <div class="stat-divider"></div>
            <div class="stat"><span class="stat-n">24h</span><span class="stat-l">Report Delivery</span></div>
          </div>
        </div>
        <div class="hero-bg-orb hero-orb-1"></div>
        <div class="hero-bg-orb hero-orb-2"></div>
      </div>

      <!-- Body -->
      <div class="packages-body">

        @if (loading()) {
          <div class="pkg-grid">
            @for (i of [1,2,3,4,5,6]; track i) {
              <div class="skeleton-card">
                <div class="skel-band"></div>
                <div class="skel-body">
                  <div class="skel-line skel-title"></div>
                  <div class="skel-line skel-sub"></div>
                  <div class="skel-line skel-item"></div>
                  <div class="skel-line skel-item"></div>
                  <div class="skel-line skel-item skel-short"></div>
                  <div class="skel-footer">
                    <div class="skel-line skel-price"></div>
                    <div class="skel-btn"></div>
                  </div>
                </div>
              </div>
            }
          </div>

        } @else if (error()) {
          <div class="feedback-state error-state">
            <div class="feedback-icon-wrap error-icon-wrap">
              <mat-icon>error_outline</mat-icon>
            </div>
            <h3>Something went wrong</h3>
            <p>{{ error() }}</p>
            <button class="btn-retry" (click)="load()">
              <mat-icon>refresh</mat-icon> Try Again
            </button>
          </div>

        } @else if (packages().length === 0) {
          <div class="feedback-state empty-state">
            <div class="feedback-icon-wrap empty-icon-wrap">
              <mat-icon>science</mat-icon>
            </div>
            <h3>No packages available yet</h3>
            <p>Our team is curating health packages. In the meantime, you can browse and book individual tests.</p>
            <a routerLink="/tests" class="btn-browse">Browse Individual Tests</a>
          </div>

        } @else {
          <div class="pkg-grid">
            @for (pkg of packages(); track pkg.id; let idx = $index) {
              <div class="pkg-card" [class.pkg-featured]="idx === 0">
                <!-- Card gradient band -->
                <div class="card-band">
                  @if (idx === 0) {
                    <span class="badge-popular">
                      <mat-icon>star</mat-icon> Most Popular
                    </span>
                  }
                  <div class="band-tests-count">
                    <span class="tests-num">{{ pkg.tests.length }}</span>
                    <span class="tests-label">tests</span>
                  </div>
                </div>

                <!-- Card content -->
                <div class="card-body">
                  <h3 class="card-title">{{ pkg.name }}</h3>
                  @if (pkg.description) {
                    <p class="card-desc">{{ pkg.description }}</p>
                  }

                  <!-- Test list -->
                  <ul class="test-list">
                    @for (t of pkg.tests.slice(0, 5); track t.id) {
                      <li class="test-item">
                        <span class="test-check">
                          <mat-icon>check</mat-icon>
                        </span>
                        <span class="test-name">{{ t.name }}</span>
                      </li>
                    }
                    @if (pkg.tests.length > 5) {
                      <li class="test-item test-more">
                        <span class="test-check test-check-more">
                          <mat-icon>add</mat-icon>
                        </span>
                        <span class="test-name test-name-more">{{ pkg.tests.length - 5 }} more tests included</span>
                      </li>
                    }
                  </ul>

                  <!-- Pricing row -->
                  <div class="card-footer">
                    <div class="price-block">
                      @if (Number(pkg.original_price) > Number(pkg.discounted_price)) {
                        <div class="price-row-top">
                          <span class="price-original">₹{{ Number(pkg.original_price) | number:'1.0-0' }}</span>
                          <span class="save-badge">Save ₹{{ (Number(pkg.original_price) - Number(pkg.discounted_price)) | number:'1.0-0' }}</span>
                        </div>
                      }
                      <div class="price-row-main">
                        <span class="price-final">₹{{ Number(pkg.discounted_price) | number:'1.0-0' }}</span>
                        @if (Number(pkg.original_price) > Number(pkg.discounted_price)) {
                          <span class="discount-pill">{{ discountPct(pkg) }}% off</span>
                        }
                      </div>
                    </div>
                    <button class="btn-book" [class.btn-book-featured]="idx === 0" (click)="book(pkg)">
                      Book Package
                      <mat-icon>arrow_forward</mat-icon>
                    </button>
                  </div>
                </div>
              </div>
            }
          </div>
        }

      </div>
    </div>
  `,
  styles: [`
    /* ── Reset & base ─────────────────────────────────────────── */
    :host { display: block; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }

    .packages-page {
      min-height: calc(100vh - 64px);
      background: #F8F9FF;
    }

    /* ── Hero ────────────────────────────────────────────────── */
    .hero {
      position: relative;
      overflow: hidden;
      background: linear-gradient(135deg, #4338CA 0%, #6366F1 45%, #7C3AED 100%);
      padding: 3.5rem 1.5rem 3rem;
    }

    .hero-inner {
      position: relative;
      z-index: 2;
      max-width: 1100px;
      margin: 0 auto;
    }

    .hero-eyebrow {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      font-size: 0.75rem;
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #C7D2FE;
      margin-bottom: 1rem;
    }
    .eyebrow-dot {
      width: 6px;
      height: 6px;
      border-radius: 999px;
      background: #F97316;
      display: inline-block;
      flex-shrink: 0;
    }

    .hero-title {
      font-size: clamp(1.75rem, 4vw, 2.6rem);
      font-weight: 800;
      line-height: 1.18;
      color: #FFFFFF;
      text-wrap: balance;
      margin: 0 0 1rem;
      letter-spacing: -0.02em;
    }

    .hero-sub {
      font-size: 0.975rem;
      color: #C7D2FE;
      line-height: 1.65;
      max-width: 520px;
      margin: 0 0 2rem;
    }
    .hero-br { display: block; }

    .hero-stats {
      display: flex;
      align-items: center;
      gap: 1.25rem;
    }
    .stat {
      display: flex;
      flex-direction: column;
      gap: 0.1rem;
    }
    .stat-n {
      font-size: 1.2rem;
      font-weight: 800;
      color: #FFFFFF;
      font-variant-numeric: tabular-nums;
      line-height: 1;
    }
    .stat-l {
      font-size: 0.7rem;
      font-weight: 500;
      color: #A5B4FC;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }
    .stat-divider {
      width: 1px;
      height: 2rem;
      background: rgba(255,255,255,0.2);
    }

    /* decorative orbs */
    .hero-bg-orb {
      position: absolute;
      border-radius: 999px;
      pointer-events: none;
    }
    .hero-orb-1 {
      width: 380px; height: 380px;
      background: radial-gradient(circle, rgba(124,58,237,0.5) 0%, transparent 70%);
      top: -120px; right: -80px;
    }
    .hero-orb-2 {
      width: 220px; height: 220px;
      background: radial-gradient(circle, rgba(249,115,22,0.2) 0%, transparent 70%);
      bottom: -60px; left: 30%;
    }

    /* ── Body ────────────────────────────────────────────────── */
    .packages-body {
      max-width: 1100px;
      margin: 0 auto;
      padding: 2.5rem 1.5rem 3rem;
    }

    /* ── Grid ────────────────────────────────────────────────── */
    .pkg-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(308px, 1fr));
      gap: 1.375rem;
    }

    /* ── Package Card ────────────────────────────────────────── */
    .pkg-card {
      background: #FFFFFF;
      border-radius: 16px;
      border: 1px solid #E2E8F0;
      box-shadow: 0 2px 8px rgba(99,102,241,0.06), 0 1px 3px rgba(0,0,0,0.04);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      transition: transform 0.22s ease, box-shadow 0.22s ease;
    }
    .pkg-card:hover {
      transform: translateY(-3px);
      box-shadow: 0 12px 32px rgba(99,102,241,0.14), 0 4px 12px rgba(0,0,0,0.06);
    }

    /* featured card gets indigo border accent */
    .pkg-featured {
      border-color: #6366F1;
      box-shadow: 0 4px 16px rgba(99,102,241,0.16), 0 1px 4px rgba(0,0,0,0.04);
    }
    .pkg-featured:hover {
      box-shadow: 0 16px 40px rgba(99,102,241,0.22), 0 4px 12px rgba(0,0,0,0.06);
    }

    /* ── Card Band ───────────────────────────────────────────── */
    .card-band {
      position: relative;
      background: linear-gradient(115deg, #4338CA 0%, #6366F1 55%, #8B5CF6 100%);
      padding: 1.1rem 1.25rem 1.4rem;
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      /* diagonal clip at bottom for a tilted shelf feel */
      clip-path: polygon(0 0, 100% 0, 100% 70%, 0 100%);
      min-height: 84px;
    }

    .badge-popular {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      background: #F97316;
      color: #FFFFFF;
      font-size: 0.68rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      padding: 0.3rem 0.65rem;
      border-radius: 999px;
      mat-icon {
        font-size: 0.8rem;
        width: 0.8rem;
        height: 0.8rem;
      }
    }

    .band-tests-count {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      line-height: 1;
    }
    .tests-num {
      font-size: 2rem;
      font-weight: 800;
      color: rgba(255,255,255,0.95);
      font-variant-numeric: tabular-nums;
      line-height: 1;
    }
    .tests-label {
      font-size: 0.65rem;
      font-weight: 600;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: rgba(255,255,255,0.65);
      margin-top: 0.1rem;
    }

    /* ── Card Body ───────────────────────────────────────────── */
    .card-body {
      padding: 0.75rem 1.25rem 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
      flex: 1;
    }

    .card-title {
      font-size: 1.05rem;
      font-weight: 750;
      color: #0F172A;
      line-height: 1.3;
      text-wrap: balance;
      margin: 0;
    }

    .card-desc {
      font-size: 0.8rem;
      color: #64748B;
      line-height: 1.55;
      margin: 0;
    }

    /* ── Test List ───────────────────────────────────────────── */
    .test-list {
      list-style: none;
      margin: 0.25rem 0 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      flex: 1;
    }

    .test-item {
      display: flex;
      align-items: center;
      gap: 0.45rem;
    }

    .test-check {
      width: 18px;
      height: 18px;
      border-radius: 999px;
      background: #DCFCE7;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      mat-icon {
        font-size: 0.7rem;
        width: 0.7rem;
        height: 0.7rem;
        color: #16A34A;
      }
    }

    .test-check-more {
      background: #EEF2FF;
      mat-icon { color: #6366F1; }
    }

    .test-name {
      font-size: 0.8rem;
      color: #334155;
      font-weight: 500;
      line-height: 1.3;
    }

    .test-name-more {
      color: #6366F1;
      font-weight: 600;
      font-size: 0.78rem;
    }

    /* ── Card Footer ─────────────────────────────────────────── */
    .card-footer {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      gap: 0.75rem;
      padding-top: 0.9rem;
      margin-top: auto;
      border-top: 1px solid #F1F5F9;
    }

    .price-block {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }

    .price-row-top {
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }

    .price-original {
      font-size: 0.8rem;
      color: #94A3B8;
      text-decoration: line-through;
      font-variant-numeric: tabular-nums;
    }

    .save-badge {
      font-size: 0.68rem;
      font-weight: 700;
      background: #DCFCE7;
      color: #15803D;
      padding: 0.1rem 0.45rem;
      border-radius: 999px;
    }

    .price-row-main {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .price-final {
      font-size: 1.3rem;
      font-weight: 800;
      color: #F97316;
      font-variant-numeric: tabular-nums;
      line-height: 1;
    }

    .discount-pill {
      font-size: 0.68rem;
      font-weight: 700;
      background: #FFF7ED;
      color: #EA580C;
      padding: 0.15rem 0.45rem;
      border-radius: 999px;
    }

    /* ── Book Button ─────────────────────────────────────────── */
    .btn-book {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      background: #EEF2FF;
      color: #4F46E5;
      border: none;
      border-radius: 10px;
      padding: 0.6rem 1rem;
      font-size: 0.8rem;
      font-weight: 700;
      cursor: pointer;
      white-space: nowrap;
      transition: background 0.18s ease, color 0.18s ease, box-shadow 0.18s ease;
      flex-shrink: 0;
      mat-icon {
        font-size: 0.9rem;
        width: 0.9rem;
        height: 0.9rem;
        transition: transform 0.18s ease;
      }
      &:hover {
        background: #6366F1;
        color: #FFFFFF;
        box-shadow: 0 4px 14px rgba(99,102,241,0.35);
        mat-icon { transform: translateX(2px); }
      }
      &:focus-visible {
        outline: 2px solid #6366F1;
        outline-offset: 2px;
      }
    }

    .btn-book-featured {
      background: linear-gradient(135deg, #6366F1, #8B5CF6);
      color: #FFFFFF;
      box-shadow: 0 3px 10px rgba(99,102,241,0.3);
      &:hover {
        background: linear-gradient(135deg, #4F46E5, #7C3AED);
        box-shadow: 0 6px 18px rgba(99,102,241,0.42);
      }
    }

    /* ── Skeletons ───────────────────────────────────────────── */
    @keyframes shimmer {
      0%   { background-position: 200% center; }
      100% { background-position: -200% center; }
    }

    .skeleton-card {
      border-radius: 16px;
      border: 1px solid #E2E8F0;
      overflow: hidden;
      background: #FFFFFF;
    }

    .skel-band {
      height: 84px;
      background: linear-gradient(90deg, #E2E8F0 25%, #EEF2FF 50%, #E2E8F0 75%);
      background-size: 200% 100%;
      animation: shimmer 1.6s infinite;
    }

    .skel-body {
      padding: 1rem 1.25rem 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
    }

    .skel-line {
      border-radius: 6px;
      background: linear-gradient(90deg, #F1F5F9 25%, #E2E8F0 50%, #F1F5F9 75%);
      background-size: 200% 100%;
      animation: shimmer 1.6s infinite;
    }
    .skel-title  { height: 18px; width: 70%; }
    .skel-sub    { height: 12px; width: 90%; }
    .skel-item   { height: 12px; width: 85%; }
    .skel-short  { width: 55%; }

    .skel-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 0.5rem;
      padding-top: 0.75rem;
      border-top: 1px solid #F1F5F9;
    }
    .skel-price {
      height: 22px;
      width: 90px;
      border-radius: 6px;
      background: linear-gradient(90deg, #F1F5F9 25%, #E2E8F0 50%, #F1F5F9 75%);
      background-size: 200% 100%;
      animation: shimmer 1.6s infinite;
    }
    .skel-btn {
      height: 36px;
      width: 110px;
      border-radius: 10px;
      background: linear-gradient(90deg, #EEF2FF 25%, #E0E7FF 50%, #EEF2FF 75%);
      background-size: 200% 100%;
      animation: shimmer 1.6s infinite;
    }

    /* ── Feedback States ─────────────────────────────────────── */
    .feedback-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 0.9rem;
      padding: 5rem 2rem;

      h3 {
        font-size: 1.1rem;
        font-weight: 700;
        color: #0F172A;
        margin: 0;
      }
      p {
        font-size: 0.875rem;
        color: #64748B;
        max-width: 360px;
        line-height: 1.6;
        margin: 0;
      }
    }

    .feedback-icon-wrap {
      width: 72px;
      height: 72px;
      border-radius: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      mat-icon {
        font-size: 2rem;
        width: 2rem;
        height: 2rem;
      }
    }

    .error-icon-wrap {
      background: #FEF2F2;
      mat-icon { color: #EF4444; }
    }

    .empty-icon-wrap {
      background: #EEF2FF;
      mat-icon { color: #6366F1; }
    }

    .btn-retry {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      background: #EF4444;
      color: #FFFFFF;
      border: none;
      border-radius: 10px;
      padding: 0.6rem 1.25rem;
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.18s ease;
      mat-icon { font-size: 1rem; width: 1rem; height: 1rem; }
      &:hover { background: #DC2626; }
      &:focus-visible { outline: 2px solid #EF4444; outline-offset: 2px; }
    }

    .btn-browse {
      display: inline-flex;
      align-items: center;
      background: linear-gradient(135deg, #6366F1, #8B5CF6);
      color: #FFFFFF;
      text-decoration: none;
      border-radius: 10px;
      padding: 0.65rem 1.5rem;
      font-size: 0.875rem;
      font-weight: 700;
      box-shadow: 0 3px 12px rgba(99,102,241,0.3);
      transition: box-shadow 0.18s ease, transform 0.18s ease;
      &:hover {
        box-shadow: 0 6px 20px rgba(99,102,241,0.42);
        transform: translateY(-1px);
      }
      &:focus-visible { outline: 2px solid #6366F1; outline-offset: 2px; }
    }

    /* ── Responsive ──────────────────────────────────────────── */
    @media (max-width: 600px) {
      .hero { padding: 2.5rem 1.25rem 2rem; }
      .hero-sub { font-size: 0.9rem; }
      .hero-br { display: none; }
      .packages-body { padding: 1.75rem 1rem 2rem; }
      .pkg-grid { grid-template-columns: 1fr; gap: 1rem; }
      .card-footer { flex-wrap: wrap; gap: 0.75rem; }
      .btn-book { width: 100%; justify-content: center; }
    }

    @media (prefers-reduced-motion: reduce) {
      .pkg-card, .btn-book, .btn-browse, .btn-retry { transition: none; }
      .skel-band, .skel-line, .skel-price, .skel-btn { animation: none; }
    }
  `],
})
export class PackagesListComponent implements OnInit {
  packages = signal<Package[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  // Make Number available in template
  Number = Number;

  constructor(private packageApi: PackageApiService, private router: Router) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.packageApi.list().subscribe({
      next: (res) => {
        // Ensure prices are numbers (backend sends Decimal as strings in JSON)
        const normalized = res.items.map(pkg => ({
          ...pkg,
          original_price: Number(pkg.original_price),
          discounted_price: Number(pkg.discounted_price)
        }));
        this.packages.set(normalized);
        this.loading.set(false);
      },
      error: () => { this.error.set('Failed to load packages. Please check your connection.'); this.loading.set(false); },
    });
  }

  discountPct(p: Package): number {
    const original = Number(p.original_price);
    const discounted = Number(p.discounted_price);
    if (!original || original <= discounted) return 0;
    return Math.round((1 - discounted / original) * 100);
  }

  book(p: Package): void {
    this.router.navigate(['/booking'], { queryParams: { package_id: p.id } });
  }
}
