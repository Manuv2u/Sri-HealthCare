import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { TestApiService } from '../../../core/api/services/test-api.service';
import { Test } from '../../../core/api/api.types';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner.component';
import { ErrorBannerComponent } from '../../../shared/components/error-banner.component';

// Per-category theming — mirrors the test catalog so the detail page feels cohesive.
const CATEGORY_META: Record<string, { icon: string; color: string; light: string; border: string }> = {
  'Diabetes':       { icon: 'water_drop',       color: '#0EA5E9', light: '#E0F2FE', border: '#BAE6FD' },
  'Heart':          { icon: 'favorite',         color: '#EF4444', light: '#FEE2E2', border: '#FECACA' },
  'Kidney':         { icon: 'opacity',          color: '#8B5CF6', light: '#EDE9FE', border: '#DDD6FE' },
  'Liver':          { icon: 'eco',              color: '#22C55E', light: '#DCFCE7', border: '#BBF7D0' },
  'Thyroid':        { icon: 'psychology',       color: '#F97316', light: '#FFEDD5', border: '#FED7AA' },
  'Full Body':      { icon: 'accessibility_new',color: '#6366F1', light: '#EEF2FF', border: '#C7D2FE' },
  "Women's Health": { icon: 'spa',              color: '#EC4899', light: '#FCE7F3', border: '#FBCFE8' },
  'Vitamin':        { icon: 'wb_sunny',         color: '#F59E0B', light: '#FEF3C7', border: '#FDE68A' },
};

const DEFAULT_META = { icon: 'science', color: '#6366F1', light: '#EEF2FF', border: '#C7D2FE' };

@Component({
  selector: 'app-test-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule, LoadingSpinnerComponent, ErrorBannerComponent],
  template: `
    <div class="detail-page">
      <app-loading-spinner *ngIf="loading()" />
      <app-error-banner *ngIf="error()" [message]="error()!" />

      @if (test(); as t) {
        <a routerLink="/tests" class="back-link">
          <mat-icon>arrow_back</mat-icon> Back to Tests
        </a>

        <article
          class="detail-card"
          [style.--cat-color]="meta().color"
          [style.--cat-light]="meta().light"
          [style.--cat-border]="meta().border"
        >
          <div class="card-accent"></div>

          <div class="card-inner">
            <div class="head">
              <div class="head-left">
                <span class="cat-badge">
                  <mat-icon>{{ meta().icon }}</mat-icon>
                  {{ t.category }}
                </span>
                <h1 class="title">{{ t.name }}</h1>
              </div>
              @if (t.discount_percentage > 0) {
                <span class="discount-pill">{{ t.discount_percentage }}% off</span>
              }
            </div>

            @if (t.description) {
              <p class="desc">{{ t.description }}</p>
            }

            <div class="trust-row">
              <span class="trust-tag">
                <mat-icon>schedule</mat-icon> {{ t.turnaround_hours }}h results
              </span>
              <span class="trust-tag home">
                <mat-icon>home</mat-icon> Free home collection
              </span>
              <span class="trust-tag">
                <mat-icon>verified</mat-icon> NABL certified
              </span>
            </div>

            <div class="stats">
              <div class="stat">
                <span class="stat-ic"><mat-icon>schedule</mat-icon></span>
                <div>
                  <div class="stat-value">{{ t.turnaround_hours }}h</div>
                  <div class="stat-label">Turnaround time</div>
                </div>
              </div>
              <div class="stat">
                <span class="stat-ic"><mat-icon>{{ meta().icon }}</mat-icon></span>
                <div>
                  <div class="stat-value">{{ t.category }}</div>
                  <div class="stat-label">Category</div>
                </div>
              </div>
            </div>

            <div class="footer">
              <div class="price">
                @if (t.discount_percentage > 0) {
                  <span class="price-orig">₹{{ t.price }}</span>
                }
                <span class="price-eff">₹{{ t.effective_price }}</span>
              </div>
              <button type="button" class="book-btn" (click)="addToBooking()">
                <mat-icon>calendar_today</mat-icon> Book Now
              </button>
            </div>
          </div>
        </article>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
      background: #F8F9FF;
      min-height: 100%;
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
    }
    *, *::before, *::after { box-sizing: border-box; }

    .detail-page { max-width: 760px; margin: 0 auto; padding: 1.75rem 1.5rem 4rem; }

    .back-link {
      display: inline-flex; align-items: center; gap: .35rem;
      color: #64748B; font-size: .85rem; font-weight: 600;
      text-decoration: none; margin-bottom: 1.25rem;
      transition: color .15s;
    }
    .back-link:hover { color: #6366F1; }
    .back-link mat-icon { font-size: 1.05rem; width: 1.05rem; height: 1.05rem; }

    .detail-card {
      background: #fff; border-radius: 20px; border: 1px solid #E2E8F0;
      box-shadow: 0 4px 20px rgba(99,102,241,.08), 0 1px 4px rgba(0,0,0,.05);
      overflow: hidden;
    }
    .card-accent { height: 5px; background: var(--cat-color, #6366F1); }
    .card-inner { padding: 2rem; display: flex; flex-direction: column; gap: 1.5rem; }

    .head { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; }
    .head-left { display: flex; flex-direction: column; gap: .6rem; min-width: 0; }
    .cat-badge {
      display: inline-flex; align-items: center; gap: .3rem; align-self: flex-start;
      font-size: .72rem; font-weight: 700; text-transform: uppercase; letter-spacing: .04em;
      color: var(--cat-color, #6366F1); background: var(--cat-light, #EEF2FF);
      border: 1px solid var(--cat-border, #C7D2FE);
      padding: .25rem .6rem; border-radius: 999px;
    }
    .cat-badge mat-icon { font-size: .85rem; width: .85rem; height: .85rem; }
    .title {
      font-size: 1.75rem; font-weight: 800; color: #0F172A;
      line-height: 1.2; letter-spacing: -.01em; margin: 0;
    }
    .discount-pill {
      flex-shrink: 0; font-size: .78rem; font-weight: 700;
      background: #DCFCE7; color: #15803D;
      padding: .3rem .7rem; border-radius: 999px; white-space: nowrap;
    }

    .desc { font-size: .95rem; color: #475569; line-height: 1.7; margin: 0; }

    .trust-row { display: flex; gap: .6rem; flex-wrap: wrap; }
    .trust-tag {
      display: inline-flex; align-items: center; gap: .3rem;
      font-size: .78rem; font-weight: 500; color: #64748B;
      background: #F8FAFC; border: 1px solid #F1F5F9;
      padding: .3rem .65rem; border-radius: 8px;
    }
    .trust-tag mat-icon { font-size: .85rem; width: .85rem; height: .85rem; color: #94A3B8; }
    .trust-tag.home mat-icon { color: #22C55E; }

    .stats {
      display: flex; gap: 2.5rem; flex-wrap: wrap;
      padding: 1.25rem 0;
      border-top: 1px solid #F1F5F9; border-bottom: 1px solid #F1F5F9;
    }
    .stat { display: flex; align-items: center; gap: .75rem; }
    .stat-ic {
      width: 40px; height: 40px; border-radius: 10px; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      background: var(--cat-light, #EEF2FF); color: var(--cat-color, #6366F1);
    }
    .stat-ic mat-icon { font-size: 1.25rem; width: 1.25rem; height: 1.25rem; }
    .stat-value { font-weight: 700; font-size: 1rem; color: #0F172A; }
    .stat-label { font-size: .75rem; color: #94A3B8; }

    .footer {
      display: flex; justify-content: space-between; align-items: center;
      flex-wrap: wrap; gap: 1rem;
    }
    .price { display: flex; align-items: baseline; gap: .6rem; font-variant-numeric: tabular-nums; }
    .price-orig { font-size: 1rem; color: #94A3B8; text-decoration: line-through; }
    .price-eff {
      font-size: 2rem; font-weight: 800; color: #F97316;
      line-height: 1; letter-spacing: -.02em;
    }
    .book-btn {
      display: inline-flex; align-items: center; gap: .45rem;
      background: #6366F1; color: #fff; border: none; border-radius: 12px;
      padding: .75rem 1.6rem; font-size: .95rem; font-weight: 700; cursor: pointer;
      box-shadow: 0 4px 12px rgba(99,102,241,.35);
      transition: background .18s, transform .15s, box-shadow .18s;
    }
    .book-btn:hover { background: #4F46E5; box-shadow: 0 6px 18px rgba(99,102,241,.45); transform: translateY(-1px); }
    .book-btn:active { transform: translateY(0); }
    .book-btn mat-icon { font-size: 1.05rem; width: 1.05rem; height: 1.05rem; }

    @media (max-width: 560px) {
      .card-inner { padding: 1.5rem 1.25rem; }
      .title { font-size: 1.45rem; }
      .stats { gap: 1.5rem; }
      .footer { flex-direction: column; align-items: stretch; }
      .book-btn { justify-content: center; }
    }
  `],
})
export class TestDetailComponent implements OnInit {
  test = signal<Test | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);

  constructor(
    private route: ActivatedRoute,
    public router: Router,
    private testApi: TestApiService,
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.testApi.get(id).subscribe({
      next: (t) => { this.test.set(t); this.loading.set(false); },
      error: () => { this.error.set('Test not found.'); this.loading.set(false); },
    });
  }

  /** Category-based theming (icon + colors) for the current test. */
  meta(): { icon: string; color: string; light: string; border: string } {
    return CATEGORY_META[this.test()?.category ?? ''] ?? DEFAULT_META;
  }

  addToBooking(): void {
    this.router.navigate(['/booking'], { queryParams: { test_id: this.test()?.id } });
  }
}
