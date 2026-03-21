import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { TestApiService } from '../../../core/api/services/test-api.service';
import { Test } from '../../../core/api/api.types';

@Component({
  selector: 'app-test-catalog',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule, MatIconModule],
  template: `
    <div class="catalog-layout">
      <aside class="catalog-sidebar">
        <div class="sidebar-section">
          <h3>Categories</h3>
          <div class="category-list">
            <button class="cat-item" [class.active]="!selectedCategory()" (click)="selectCategory(null)">
              <span>All Tests</span><span class="cat-count">{{ total() }}</span>
            </button>
            @for (cat of categories(); track cat.name) {
              <button class="cat-item" [class.active]="selectedCategory() === cat.name" (click)="selectCategory(cat.name)">
                <span>{{ cat.name }}</span><span class="cat-count">{{ cat.count }}</span>
              </button>
            }
          </div>
        </div>
        <div class="sidebar-section">
          <h3>Price Range</h3>
          <div class="price-filters">
            <button class="price-chip" [class.active]="priceFilter() === 'all'" (click)="priceFilter.set('all')">All</button>
            <button class="price-chip" [class.active]="priceFilter() === 'under500'" (click)="priceFilter.set('under500')">Under Rs.500</button>
            <button class="price-chip" [class.active]="priceFilter() === '500to1000'" (click)="priceFilter.set('500to1000')">Rs.500-Rs.1000</button>
            <button class="price-chip" [class.active]="priceFilter() === 'above1000'" (click)="priceFilter.set('above1000')">Above Rs.1000</button>
          </div>
        </div>
      </aside>
      <div class="catalog-main">
        <div class="catalog-header">
          <div class="catalog-title">
            <h1>Diagnostic Tests</h1>
            <span class="result-count">{{ filteredTests().length }} tests found</span>
          </div>
          <div class="catalog-search">
            <mat-icon>search</mat-icon>
            <input [formControl]="searchCtrl" placeholder="Search tests, e.g. CBC, Thyroid..." />
            @if (searchCtrl.value) {
              <button class="clear-btn" (click)="searchCtrl.setValue('')"><mat-icon>close</mat-icon></button>
            }
          </div>
        </div>
        @if (loading()) {
          <div class="loading-grid">
            @for (i of [1,2,3,4,5,6]; track i) { <div class="skeleton-card"></div> }
          </div>
        } @else if (error()) {
          <div class="error-state">
            <mat-icon>error_outline</mat-icon><p>{{ error() }}</p>
            <button class="btn-retry" (click)="load()">Retry</button>
          </div>
        } @else {
          @if (filteredTests().length > 0 && !selectedCategory() && !searchCtrl.value) {
            <div class="featured-card">
              <div class="featured-badge">Most Popular</div>
              <div class="featured-body">
                <div class="featured-info">
                  <div class="featured-cat">{{ filteredTests()[0].category }}</div>
                  <h2>{{ filteredTests()[0].name }}</h2>
                  @if (filteredTests()[0].description) { <p>{{ filteredTests()[0].description }}</p> }
                  <div class="featured-meta">
                    <span class="meta-chip"><mat-icon>schedule</mat-icon> {{ filteredTests()[0].turnaround_hours }}h results</span>
                    <span class="meta-chip"><mat-icon>verified</mat-icon> NABL Certified</span>
                  </div>
                </div>
                <div class="featured-action">
                  <div class="featured-price">
                    @if (filteredTests()[0].discount_percentage > 0) {
                      <span class="price-orig">Rs.{{ filteredTests()[0].price }}</span>
                    }
                    <span class="price-eff">Rs.{{ filteredTests()[0].effective_price }}</span>
                    @if (filteredTests()[0].discount_percentage > 0) {
                      <span class="price-badge">{{ filteredTests()[0].discount_percentage }}% off</span>
                    }
                  </div>
                  <button class="btn-book-featured" (click)="book(filteredTests()[0])">Book Now</button>
                  <a [routerLink]="['/tests', filteredTests()[0].id]" class="btn-details">View Details</a>
                </div>
              </div>
            </div>
          }
          @if (filteredTests().length === 0) {
            <div class="empty-state">
              <mat-icon>search_off</mat-icon><h3>No tests found</h3><p>Try adjusting your search or filters</p>
              <button class="btn-retry" (click)="clearFilters()">Clear Filters</button>
            </div>
          } @else {
            <div class="tests-grid">
              @for (test of gridTests(); track test.id) {
                <div class="test-card">
                  <div class="test-card-top">
                    <span class="test-cat-badge">{{ test.category }}</span>
                    @if (test.discount_percentage > 0) { <span class="test-discount-badge">{{ test.discount_percentage }}% off</span> }
                  </div>
                  <h3>{{ test.name }}</h3>
                  @if (test.description) { <p class="test-desc">{{ test.description }}</p> }
                  <div class="test-meta">
                    <span><mat-icon>schedule</mat-icon> {{ test.turnaround_hours }}h</span>
                  </div>
                  <div class="test-footer">
                    <div class="test-price">
                      @if (test.discount_percentage > 0) { <span class="price-orig-sm">Rs.{{ test.price }}</span> }
                      <span class="price-eff-sm">Rs.{{ test.effective_price }}</span>
                    </div>
                    <div class="test-actions">
                      <a [routerLink]="['/tests', test.id]" class="btn-view">Details</a>
                      <button class="btn-book-sm" (click)="book(test)">Book</button>
                    </div>
                  </div>
                </div>
              }
            </div>
            @if (totalPages() > 1) {
              <div class="pagination">
                <button class="page-btn" [disabled]="page() === 1" (click)="changePage(page() - 1)"><mat-icon>chevron_left</mat-icon></button>
                <span class="page-info">Page {{ page() }} of {{ totalPages() }}</span>
                <button class="page-btn" [disabled]="page() === totalPages()" (click)="changePage(page() + 1)"><mat-icon>chevron_right</mat-icon></button>
              </div>
            }
          }
        }
      </div>
    </div>
  `,
  styles: [`
    .catalog-layout { display:grid; grid-template-columns:240px 1fr; min-height:calc(100vh - 64px); max-width:1200px; margin:0 auto; padding:2rem 1.5rem; gap:2rem; }
    .catalog-sidebar { display:flex; flex-direction:column; gap:1.5rem; }
    .sidebar-section h3 { font-size:.8rem; font-weight:700; color:#718096; text-transform:uppercase; letter-spacing:.08em; margin-bottom:.75rem; }
    .category-list { display:flex; flex-direction:column; gap:.25rem; }
    .cat-item { display:flex; justify-content:space-between; align-items:center; padding:.5rem .75rem; border-radius:8px; border:none; background:none; font-size:.875rem; color:#4a5568; cursor:pointer; text-align:left; transition:all .15s; }
    .cat-item:hover { background:#f7fafc; color:#2d3748; }
    .cat-item.active { background:#e0f2f1; color:#00796b; font-weight:600; }
    .cat-count { font-size:.75rem; background:#f0f4f8; color:#718096; padding:.1rem .45rem; border-radius:999px; }
    .price-filters { display:flex; flex-direction:column; gap:.4rem; }
    .price-chip { padding:.4rem .75rem; border-radius:8px; border:1px solid #e2e8f0; background:#fff; font-size:.8rem; color:#4a5568; cursor:pointer; text-align:left; transition:all .15s; }
    .price-chip:hover { border-color:#00796b; color:#00796b; }
    .price-chip.active { background:#e0f2f1; border-color:#00796b; color:#00796b; font-weight:600; }
    .catalog-main { display:flex; flex-direction:column; gap:1.5rem; }
    .catalog-header { display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem; }
    .catalog-title h1 { font-size:1.5rem; font-weight:800; color:#1a202c; }
    .result-count { font-size:.85rem; color:#718096; display:block; margin-top:.2rem; }
    .catalog-search { display:flex; align-items:center; gap:.5rem; background:#fff; border:1.5px solid #e2e8f0; border-radius:10px; padding:.5rem .75rem; min-width:280px; box-shadow:0 1px 4px rgba(0,0,0,.05); }
    .catalog-search mat-icon { color:#a0aec0; font-size:1.1rem; width:1.1rem; height:1.1rem; }
    .catalog-search input { flex:1; border:none; outline:none; font-size:.9rem; color:#2d3748; background:transparent; }
    .clear-btn { background:none; border:none; cursor:pointer; display:flex; align-items:center; color:#a0aec0; padding:0; }
    .clear-btn mat-icon { font-size:1rem; width:1rem; height:1rem; }
    .featured-card { background:linear-gradient(135deg,#00796b,#26a69a); border-radius:16px; padding:1.75rem; color:#fff; position:relative; overflow:hidden; }
    .featured-badge { position:absolute; top:1rem; right:1rem; background:rgba(255,255,255,.2); color:#fff; font-size:.7rem; font-weight:700; padding:.2rem .6rem; border-radius:999px; letter-spacing:.06em; }
    .featured-body { display:flex; justify-content:space-between; align-items:flex-end; gap:2rem; flex-wrap:wrap; }
    .featured-cat { font-size:.75rem; font-weight:600; opacity:.8; text-transform:uppercase; letter-spacing:.08em; margin-bottom:.4rem; }
    .featured-info h2 { font-size:1.4rem; font-weight:800; margin-bottom:.5rem; }
    .featured-info p { font-size:.875rem; opacity:.85; line-height:1.6; max-width:480px; margin-bottom:.75rem; }
    .featured-meta { display:flex; gap:.75rem; flex-wrap:wrap; }
    .meta-chip { display:inline-flex; align-items:center; gap:.3rem; background:rgba(255,255,255,.15); padding:.25rem .65rem; border-radius:999px; font-size:.78rem; }
    .meta-chip mat-icon { font-size:.9rem; width:.9rem; height:.9rem; }
    .featured-action { display:flex; flex-direction:column; align-items:flex-end; gap:.75rem; flex-shrink:0; }
    .featured-price { display:flex; align-items:baseline; gap:.5rem; }
    .price-orig { font-size:.9rem; opacity:.6; text-decoration:line-through; }
    .price-eff { font-size:1.75rem; font-weight:800; }
    .price-badge { background:rgba(255,255,255,.2); font-size:.75rem; font-weight:700; padding:.2rem .5rem; border-radius:999px; }
    .btn-book-featured { background:#fff; color:#00796b; border:none; border-radius:10px; padding:.6rem 1.5rem; font-size:.9rem; font-weight:700; cursor:pointer; }
    .btn-details { color:rgba(255,255,255,.8); font-size:.8rem; text-decoration:none; }
    .tests-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(240px,1fr)); gap:1rem; }
    .test-card { background:#fff; border-radius:12px; border:1px solid #e2e8f0; padding:1.25rem; display:flex; flex-direction:column; gap:.6rem; box-shadow:0 1px 4px rgba(0,0,0,.05); transition:all .2s; }
    .test-card:hover { box-shadow:0 4px 16px rgba(0,0,0,.1); transform:translateY(-2px); }
    .test-card-top { display:flex; justify-content:space-between; align-items:center; }
    .test-cat-badge { font-size:.7rem; font-weight:600; background:#e0f2f1; color:#00796b; padding:.15rem .5rem; border-radius:999px; }
    .test-discount-badge { font-size:.7rem; font-weight:700; background:#fed7d7; color:#c53030; padding:.15rem .5rem; border-radius:999px; }
    .test-card h3 { font-size:.95rem; font-weight:700; color:#1a202c; line-height:1.3; }
    .test-desc { font-size:.8rem; color:#718096; line-height:1.5; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
    .test-meta { display:flex; gap:.75rem; }
    .test-meta span { display:inline-flex; align-items:center; gap:.25rem; font-size:.75rem; color:#718096; }
    .test-meta mat-icon { font-size:.85rem; width:.85rem; height:.85rem; }
    .test-footer { display:flex; justify-content:space-between; align-items:center; margin-top:auto; padding-top:.6rem; border-top:1px solid #f0f4f8; }
    .test-price { display:flex; flex-direction:column; }
    .price-orig-sm { font-size:.75rem; color:#a0aec0; text-decoration:line-through; }
    .price-eff-sm { font-size:1rem; font-weight:700; color:#00796b; }
    .test-actions { display:flex; gap:.4rem; }
    .btn-view { padding:.3rem .65rem; border-radius:7px; border:1px solid #e2e8f0; font-size:.78rem; font-weight:600; color:#4a5568; text-decoration:none; }
    .btn-book-sm { padding:.3rem .75rem; border-radius:7px; border:none; background:#00796b; color:#fff; font-size:.78rem; font-weight:600; cursor:pointer; }
    .pagination { display:flex; justify-content:center; align-items:center; gap:1rem; padding:1rem 0; }
    .page-btn { width:36px; height:36px; border-radius:8px; border:1px solid #e2e8f0; background:#fff; cursor:pointer; display:flex; align-items:center; justify-content:center; color:#4a5568; }
    .page-btn:disabled { opacity:.4; cursor:not-allowed; }
    .page-btn mat-icon { font-size:1.1rem; width:1.1rem; height:1.1rem; }
    .page-info { font-size:.875rem; color:#718096; }
    .loading-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(240px,1fr)); gap:1rem; }
    .skeleton-card { height:180px; background:linear-gradient(90deg,#f0f4f8 25%,#e2e8f0 50%,#f0f4f8 75%); background-size:200% 100%; border-radius:12px; animation:shimmer 1.5s infinite; }
    @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
    .error-state,.empty-state { display:flex; flex-direction:column; align-items:center; gap:1rem; padding:4rem 2rem; color:#718096; }
    .error-state mat-icon,.empty-state mat-icon { font-size:3rem; width:3rem; height:3rem; color:#cbd5e0; }
    .error-state h3,.empty-state h3 { font-size:1.1rem; font-weight:700; color:#4a5568; }
    .btn-retry { background:#00796b; color:#fff; border:none; border-radius:8px; padding:.5rem 1.25rem; font-size:.875rem; font-weight:600; cursor:pointer; }
    @media(max-width:768px) { .catalog-layout{grid-template-columns:1fr;padding:1rem;} .catalog-sidebar{display:none;} .catalog-header{flex-direction:column;align-items:stretch;} .catalog-search{min-width:unset;} }
  `],
})
export class TestCatalogComponent implements OnInit {
  searchCtrl = new FormControl('');
  allTests = signal<Test[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  total = signal(0);
  page = signal(1);
  pageSize = 20;
  selectedCategory = signal<string | null>(null);
  priceFilter = signal<string>('all');

  categories = computed(() => {
    const map = new Map<string, number>();
    this.allTests().forEach(t => map.set(t.category, (map.get(t.category) ?? 0) + 1));
    return Array.from(map.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  });

  filteredTests = computed(() => {
    let tests = this.allTests();
    const q = (this.searchCtrl.value ?? '').toLowerCase().trim();
    const cat = this.selectedCategory();
    const price = this.priceFilter();
    if (q) tests = tests.filter(t => t.name.toLowerCase().includes(q) || t.category.toLowerCase().includes(q) || (t.description ?? '').toLowerCase().includes(q));
    if (cat) tests = tests.filter(t => t.category === cat);
    if (price === 'under500') tests = tests.filter(t => t.effective_price < 500);
    else if (price === '500to1000') tests = tests.filter(t => t.effective_price >= 500 && t.effective_price <= 1000);
    else if (price === 'above1000') tests = tests.filter(t => t.effective_price > 1000);
    return tests;
  });

  totalPages = computed(() => Math.ceil(this.filteredTests().length / this.pageSize));

  gridTests = computed(() => {
    const all = this.filteredTests();
    const start = (this.page() - 1) * this.pageSize;
    const skipFeatured = this.page() === 1 && !this.selectedCategory() && !(this.searchCtrl.value ?? '').trim();
    const list = skipFeatured ? all.slice(1) : all;
    return list.slice(start, start + this.pageSize);
  });

  constructor(private testApi: TestApiService, private router: Router, private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      if (params['q']) this.searchCtrl.setValue(params['q']);
    });
    this.searchCtrl.valueChanges.pipe(debounceTime(300), distinctUntilChanged()).subscribe(() => this.page.set(1));
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.testApi.list({ page_size: 500 }).subscribe({
      next: (res) => {
        // Always show only active tests in the public catalog (even if admin is browsing)
        const activeOnly = res.items.filter((t: any) => t.is_active);
        this.allTests.set(activeOnly);
        this.total.set(activeOnly.length);
        this.loading.set(false);
      },
      error: () => { this.error.set('Failed to load tests. Please try again.'); this.loading.set(false); },
    });
  }

  selectCategory(cat: string | null): void { this.selectedCategory.set(cat); this.page.set(1); }
  changePage(p: number): void { this.page.set(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  clearFilters(): void { this.searchCtrl.setValue(''); this.selectedCategory.set(null); this.priceFilter.set('all'); this.page.set(1); }
  book(test: Test): void { this.router.navigate(['/booking'], { queryParams: { test_id: test.id } }); }
}
