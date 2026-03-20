import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TestApiService } from '../../../core/api/services/test-api.service';
import { Test } from '../../../core/api/api.types';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner.component';
import { ErrorBannerComponent } from '../../../shared/components/error-banner.component';

@Component({
  selector: 'app-test-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, MatButtonModule, MatIconModule, LoadingSpinnerComponent, ErrorBannerComponent],
  template: `
    <div class="page-container" style="max-width:700px">
      <app-loading-spinner *ngIf="loading()" />
      <app-error-banner *ngIf="error()" [message]="error()!" />

      @if (test()) {
        <a routerLink="/tests" class="back-link">
          <mat-icon>arrow_back</mat-icon> Back to Tests
        </a>

        <div class="sri-card detail-card">
          <div class="detail-header">
            <div>
              <span class="category-tag">{{ test()!.category }}</span>
              <h1 class="detail-title">{{ test()!.name }}</h1>
            </div>
            @if (test()!.discount_percentage > 0) {
              <span class="badge badge-success discount-badge">{{ test()!.discount_percentage }}% off</span>
            }
          </div>

          @if (test()!.description) {
            <p class="detail-desc">{{ test()!.description }}</p>
          }

          <div class="detail-stats">
            <div class="stat">
              <mat-icon>schedule</mat-icon>
              <div>
                <div class="stat-value">{{ test()!.turnaround_hours }}h</div>
                <div class="stat-label">Turnaround</div>
              </div>
            </div>
            <div class="stat">
              <mat-icon>science</mat-icon>
              <div>
                <div class="stat-value">{{ test()!.category }}</div>
                <div class="stat-label">Category</div>
              </div>
            </div>
          </div>

          <div class="detail-footer">
            <div class="price-row">
              @if (test()!.discount_percentage > 0) {
                <span class="price-original">₹{{ test()!.price }}</span>
              }
              <span class="price-effective">₹{{ test()!.effective_price }}</span>
            </div>
            <button mat-flat-button color="primary" (click)="addToBooking()" class="book-btn">
              <mat-icon>calendar_today</mat-icon> Book Now
            </button>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .back-link {
      display: inline-flex; align-items: center; gap: .3rem;
      color: var(--color-muted); font-size: .875rem; margin-bottom: 1.25rem;
      text-decoration: none;
      &:hover { color: var(--color-primary); }
      mat-icon { font-size: 1.1rem; width: 1.1rem; height: 1.1rem; }
    }
    .detail-card { padding: 2rem; }
    .detail-header {
      display: flex; justify-content: space-between; align-items: flex-start;
      margin-bottom: 1rem; gap: 1rem;
    }
    .category-tag {
      font-size: .75rem; font-weight: 600; text-transform: uppercase; letter-spacing: .05em;
      color: var(--color-primary); background: var(--color-primary-lt);
      padding: .15rem .5rem; border-radius: 4px; display: inline-block; margin-bottom: .5rem;
    }
    .detail-title { font-size: 1.6rem; font-weight: 800; }
    .discount-badge { font-size: .85rem; padding: .3rem .8rem; }
    .detail-desc { color: var(--color-muted); line-height: 1.7; margin-bottom: 1.5rem; }
    .detail-stats {
      display: flex; gap: 2rem; padding: 1.25rem 0;
      border-top: 1px solid var(--color-border); border-bottom: 1px solid var(--color-border);
      margin-bottom: 1.5rem;
    }
    .stat {
      display: flex; align-items: center; gap: .75rem;
      mat-icon { color: var(--color-primary); font-size: 1.5rem; width: 1.5rem; height: 1.5rem; }
      .stat-value { font-weight: 700; font-size: 1rem; }
      .stat-label { font-size: .75rem; color: var(--color-muted); }
    }
    .detail-footer {
      display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;
    }
    .book-btn { height: 44px; font-size: 1rem; font-weight: 600; }
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

  addToBooking(): void {
    this.router.navigate(['/booking'], { queryParams: { test_id: this.test()?.id } });
  }
}
