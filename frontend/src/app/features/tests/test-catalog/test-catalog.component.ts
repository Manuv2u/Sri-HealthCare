import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { TestApiService } from '../../../core/api/services/test-api.service';
import { Test } from '../../../core/api/api.types';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner.component';
import { ErrorBannerComponent } from '../../../shared/components/error-banner.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state.component';
import { PaginationComponent } from '../../../shared/components/pagination.component';

const CATEGORIES = ['Blood', 'Urine', 'Thyroid', 'Diabetes', 'Lipid', 'Liver', 'Kidney', 'Hormone', 'Vitamin', 'Other'];

@Component({
  selector: 'app-test-catalog',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, RouterLink,
    MatIconModule, MatButtonModule,
    LoadingSpinnerComponent, ErrorBannerComponent, EmptyStateComponent, PaginationComponent,
  ],
  template: `
    <!-- Hero -->
    <section class="hero">
      <div class="hero-inner">
        <h1>Book Lab Tests Online</h1>
        <p>Accurate diagnostics, home collection, fast results — trusted by thousands in Shivamogga, Davanagere & Chikkamagaluru.</p>
        <div class="search-bar">
          <mat-icon class="search-icon">search</mat-icon>
          <input [formControl]="searchCtrl" placeholder="Search tests — CBC, HbA1c, Thyroid..." class="search-input" />
          @if (searchCtrl.value) {
            <button mat-icon-button (click)="searchCtrl.setValue('')" class="clear-btn">
              <mat-icon>close</mat-icon>
            </button>
          }
        </div>
      </div>
    </section>

    <div class="page-container">
      <!-- Category chips -->
      <div class="category-row">
        <button class="cat-chip" [class.active]="!selectedCategory()" (click)="selectCategory(null)">All</button>
        @for (cat of categories; track cat) {
          <button class="cat-chip" [class.active]="selectedCategory() === cat" (click)="selectCategory(cat)">
            {{ cat }}
          </button>
        }
      </div>

      <!-- Results header -->
      @if (!loading()) {
        <div class="results-meta">
          <span>{{ total() }} test{{ total() !== 1 ? 's' : '' }} found</span>
        </div>
      }

      <app-loading-spinner *ngIf="loading()" />
      <app-error-banner *ngIf="error()" [message]="error()!" [retryLabel]="'Retry'" (retry)="load()" />
      <app-empty-state *ngIf="!loading() && !error() && tests().length === 0"
        message="No tests match your search." />

      <!-- Test grid -->
      <div class="card-grid">
        @for (t of tests(); track t.id) {
          <div class="sri-card test-card">
            <div class="card-body">
              <div class="card-top">
                <span class="category-tag">{{ t.category }}</span>
                @if (t.discount_percent > 0) {
                  <span class="badge badge-success">{{ t.discount_percent }}% off</span>
                }
              </div>
              <h3 class="test-name">{{ t.name }}</h3>
              @if (t.description) {
                <p class="test-desc">{{ t.description }}</p>
              }
              <div class="test-meta">
                <span class="meta-item"><mat-icon>schedule</mat-icon> {{ t.turnaround_hours }}h results</span>
              </div>
            </div>
            <div class="card-footer">
              <div class="price-row">
                @if (t.discount_percent > 0) {
                  <span class="price-original">₹{{ t.price }}</span>
                }
                <span class="price-effective">₹{{ t.effective_price }}</span>
              </div>
              <button class="book-btn" (click)="book(t)">Book Now</button>
            </div>
          </div>
        }
      </div>

      <app-pagination
        *ngIf="total() > pageSize"
        [page]="page()"
        [total]="total()"
        [pageSize]="pageSize"
        (pageChange)="onPageChange($event)"
      />
    </div>
  `,
  styles: [`
    /* Hero */
    .hero {
      background: linear-gradient(135deg, #004d40 0%, #00796b 60%, #26a69a 100%);
      color: #fff; padding: 4rem 1.5rem 3rem;
    }
    .hero-inner { max-width: 700px; margin: 0 auto; text-align: center;
      h1 { font-size: 2.25rem; font-weight: 800; margin-bottom: .75rem; }
      p  { font-size: 1.05rem; opacity: .9; margin-bottom: 2rem; }
    }
    .search-bar {
      background: #fff; border-radius: 50px; padding: .5rem 1rem;
      display: flex; align-items: center; gap: .5rem;
      box-shadow: 0 4px 20px rgba(0,0,0,.2);
    }
    .search-icon { color: #9e9e9e; }
    .search-input {
      flex: 1; border: none; outline: none; font-size: 1rem;
      color: var(--color-text); background: transparent;
      &::placeholder { color: #9e9e9e; }
    }
    .clear-btn { color: #9e9e9e; }

    /* Categories */
    .category-row {
      display: flex; flex-wrap: wrap; gap: .5rem; margin-bottom: 1.5rem;
    }
    .cat-chip {
      padding: .35rem .9rem; border-radius: 999px; border: 1.5px solid var(--color-border);
      background: #fff; color: var(--color-muted); font-size: .85rem; font-weight: 500;
      cursor: pointer; transition: all .15s;
      &:hover { border-color: var(--color-primary); color: var(--color-primary); }
      &.active { background: var(--color-primary); border-color: var(--color-primary); color: #fff; }
    }

    .results-meta { color: var(--color-muted); font-size: .875rem; margin-bottom: 1rem; }

    /* Test card */
    .test-card { display: flex; flex-direction: column; cursor: pointer; }
    .card-body { padding: 1.25rem; flex: 1; display: flex; flex-direction: column; gap: .5rem; }
    .card-top { display: flex; justify-content: space-between; align-items: center; }
    .category-tag {
      font-size: .75rem; font-weight: 600; text-transform: uppercase; letter-spacing: .05em;
      color: var(--color-primary); background: var(--color-primary-lt);
      padding: .15rem .5rem; border-radius: 4px;
    }
    .test-name { font-size: 1rem; font-weight: 700; color: var(--color-text); }
    .test-desc { font-size: .85rem; color: var(--color-muted); display: -webkit-box;
      -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .test-meta { display: flex; gap: 1rem; margin-top: auto; padding-top: .5rem;
      .meta-item { display: flex; align-items: center; gap: .25rem;
        font-size: .8rem; color: var(--color-muted);
        mat-icon { font-size: 1rem; width: 1rem; height: 1rem; }
      }
    }
    .card-footer {
      padding: 1rem 1.25rem; border-top: 1px solid var(--color-border);
      display: flex; justify-content: space-between; align-items: center;
      background: #fafafa;
    }
    .book-btn {
      background: var(--color-primary); color: #fff;
      border: none; border-radius: 8px; padding: .45rem 1rem;
      font-size: .875rem; font-weight: 600; cursor: pointer; transition: background .15s;
      &:hover { background: #00695c; }
    }
  `],
})
export class TestCatalogComponent implements OnInit {
  searchCtrl = new FormControl('');
  selectedCategory = signal<string | null>(null);
  tests = signal<Test[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  page = signal(1);
  total = signal(0);
  pageSize = 12;
  categories = CATEGORIES;

  constructor(private testApi: TestApiService, private router: Router) {}

  ngOnInit(): void {
    this.load();
    this.searchCtrl.valueChanges.pipe(debounceTime(300), distinctUntilChanged()).subscribe(() => {
      this.page.set(1); this.load();
    });
  }

  selectCategory(cat: string | null): void {
    this.selectedCategory.set(cat); this.page.set(1); this.load();
  }

  load(): void {
    this.loading.set(true);
    this.testApi.list({
      q: this.searchCtrl.value ?? undefined,
      category: this.selectedCategory() ?? undefined,
      page: this.page(), page_size: this.pageSize,
    }).subscribe({
      next: (res) => { this.tests.set(res.items); this.total.set(res.total); this.loading.set(false); },
      error: () => { this.error.set('Failed to load tests.'); this.loading.set(false); },
    });
  }

  book(t: Test): void {
    this.router.navigate(['/booking'], { queryParams: { test_id: t.id } });
  }

  onPageChange(p: number): void { this.page.set(p); this.load(); }
}
