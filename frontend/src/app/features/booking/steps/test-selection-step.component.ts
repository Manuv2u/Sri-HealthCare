import { Component, inject, Input, OnInit, output, signal, computed, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { TestApiService } from '../../../core/api/services/test-api.service';
import { PackageApiService } from '../../../core/api/services/package-api.service';
import { BookingWizardStore } from '../../../core/store/booking-wizard.store';
import { Package, Test } from '../../../core/api/api.types';

@Component({
  selector: 'app-test-selection-step',
  standalone: true,
  imports: [CommonModule, MatIconModule, FormsModule],
  template: `
    <div class="step-wrap">
      <div class="step-header">
        <h2>Select Tests & Packages</h2>
        <p>Choose one or more tests or packages for this booking</p>
      </div>

      <!-- Tab toggle -->
      <div class="tab-row">
        <button class="tab-btn" [class.active]="activeTab === 'tests'" (click)="activeTab = 'tests'">
          <mat-icon>biotech</mat-icon> Tests
        </button>
        <button class="tab-btn" [class.active]="activeTab === 'packages'" (click)="activeTab = 'packages'; loadPackages()">
          <mat-icon>inventory_2</mat-icon> Packages
        </button>
      </div>

      <!-- Search (tests only) -->
      @if (activeTab === 'tests') {
        <div class="search-row">
          <mat-icon class="search-icon">search</mat-icon>
          <input class="search-input" [(ngModel)]="searchQuery" (ngModelChange)="onSearch($event)"
            placeholder="Search tests e.g. CBC, Thyroid..." />
        </div>

        @if (loadingTests()) {
          <div class="skeleton-list">
            @for (i of [1,2,3]; track i) { <div class="skeleton-row"></div> }
          </div>
        } @else if (testError()) {
          <div class="error-box">
            <mat-icon>error_outline</mat-icon> {{ testError() }}
            <button (click)="search(searchQuery)">Retry</button>
          </div>
        } @else if (testResults().length === 0) {
          <div class="empty-state">
            <mat-icon>search_off</mat-icon>
            <p>No tests found. Try a different search.</p>
          </div>
        } @else {
          <div class="item-list">
            @for (test of testResults(); track test.id) {
              <div class="item-card" [class.selected]="isTestSelected(test.id)">
                <div class="item-info">
                  <div class="item-name">{{ test.name }}</div>
                  <div class="item-meta">{{ test.category }}</div>
                </div>
                <div class="item-right">
                  <div class="item-price">
                    @if (test.discount_percentage > 0) {
                      <span class="price-original">₹{{ test.price }}</span>
                    }
                    <span class="price-final">₹{{ test.effective_price }}</span>
                  </div>
                  <button class="btn-add" [class.added]="isTestSelected(test.id)"
                    (click)="toggleTest(test)">
                    @if (isTestSelected(test.id)) {
                      <mat-icon>check</mat-icon> Added
                    } @else {
                      <mat-icon>add</mat-icon> Add
                    }
                  </button>
                </div>
              </div>
            }
          </div>
        }
      }

      <!-- Packages tab -->
      @if (activeTab === 'packages') {
        @if (loadingPackages()) {
          <div class="skeleton-list">
            @for (i of [1,2,3]; track i) { <div class="skeleton-row"></div> }
          </div>
        } @else if (packageError()) {
          <div class="error-box">
            <mat-icon>error_outline</mat-icon> {{ packageError() }}
            <button (click)="loadPackages()">Retry</button>
          </div>
        } @else if (packages().length === 0) {
          <div class="empty-state">
            <mat-icon>inventory_2</mat-icon>
            <p>No packages available.</p>
          </div>
        } @else {
          <div class="item-list">
            @for (pkg of packages(); track pkg.id) {
              <div class="item-card pkg-card" [class.selected]="isPkgSelected(pkg.id)">
                <div class="item-info">
                  <div class="item-name">{{ pkg.name }}</div>
                  @if (pkg.description) {
                    <div class="item-meta">{{ pkg.description }}</div>
                  }
                  <div class="pkg-tests">
                    @for (t of pkg.tests; track t.id) {
                      <span class="test-chip">{{ t.name }}</span>
                    }
                  </div>
                </div>
                <div class="item-right">
                  <div class="item-price">
                    @if (pkg.original_price > pkg.discounted_price) {
                      <span class="price-original">₹{{ pkg.original_price }}</span>
                    }
                    <span class="price-final">₹{{ pkg.discounted_price }}</span>
                  </div>
                  <button class="btn-add" [class.added]="isPkgSelected(pkg.id)"
                    (click)="togglePackage(pkg)">
                    @if (isPkgSelected(pkg.id)) {
                      <mat-icon>check</mat-icon> Added
                    } @else {
                      <mat-icon>add</mat-icon> Add
                    }
                  </button>
                </div>
              </div>
            }
          </div>
        }
      }

      <!-- Billing summary -->
      @if (totalItems() > 0) {
        <div class="billing-card">
          <div class="billing-title">
            <mat-icon>receipt_long</mat-icon> Order Summary
          </div>
          @for (t of selectedTests(); track t.id) {
            <div class="billing-row">
              <span>{{ t.name }}</span>
              <span>₹{{ fmt(t.price) }}</span>
            </div>
          }
          @for (p of selectedPackages(); track p.id) {
            <div class="billing-row">
              <span>{{ p.name }}</span>
              <span>₹{{ fmt(p.price) }}</span>
            </div>
          }
          <div class="billing-total">
            <span>Total</span>
            <span>₹{{ fmt(grandTotal()) }}</span>
          </div>
        </div>
      }

      <div class="step-actions">
        <button class="btn-back" (click)="back.emit()">
          <mat-icon>arrow_back</mat-icon> Back
        </button>
        <button class="btn-next" [disabled]="totalItems() === 0" (click)="onNext()">
          Continue <mat-icon>arrow_forward</mat-icon>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .step-wrap { display: flex; flex-direction: column; gap: 1.25rem; }
    .step-header h2 { font-size: 1.25rem; font-weight: 800; color: #1a202c; margin-bottom: .25rem; }
    .step-header p { font-size: .875rem; color: #718096; }

    .tab-row { display: flex; gap: .5rem; }
    .tab-btn {
      display: flex; align-items: center; gap: .4rem;
      padding: .55rem 1.1rem; border-radius: 10px; border: 1.5px solid #e2e8f0;
      background: #fff; font-size: .875rem; font-weight: 600; color: #718096; cursor: pointer; transition: all .15s;
      mat-icon { font-size: 1rem; width: 1rem; height: 1rem; }
      &.active { border-color: #00796b; background: #e0f2f1; color: #00796b; }
      &:hover:not(.active) { border-color: #00796b; color: #00796b; }
    }

    .search-row {
      display: flex; align-items: center; gap: .5rem;
      background: #fff; border: 1.5px solid #e2e8f0; border-radius: 10px; padding: .6rem .9rem;
      &:focus-within { border-color: #00796b; }
    }
    .search-icon { color: #a0aec0; font-size: 1.1rem; width: 1.1rem; height: 1.1rem; }
    .search-input { flex: 1; border: none; outline: none; font-size: .95rem; color: #2d3748; background: transparent; }

    .item-list { display: flex; flex-direction: column; gap: .6rem; max-height: 320px; overflow-y: auto; }
    .item-card {
      display: flex; align-items: flex-start; gap: 1rem;
      padding: .9rem 1rem; border-radius: 12px; border: 1.5px solid #e2e8f0; background: #fff; transition: border-color .15s;
      &.selected { border-color: #00796b; background: #f0fdf9; }
    }
    .item-info { flex: 1; }
    .item-name { font-size: .9rem; font-weight: 700; color: #1a202c; }
    .item-meta { font-size: .78rem; color: #718096; margin-top: .15rem; }
    .pkg-tests { display: flex; flex-wrap: wrap; gap: .3rem; margin-top: .4rem; }
    .test-chip { font-size: .7rem; background: #e8eaf6; color: #3949ab; padding: .15rem .45rem; border-radius: 4px; font-weight: 600; }
    .item-right { display: flex; flex-direction: column; align-items: flex-end; gap: .4rem; flex-shrink: 0; }
    .item-price { display: flex; flex-direction: column; align-items: flex-end; }
    .price-original { font-size: .75rem; color: #a0aec0; text-decoration: line-through; }
    .price-final { font-size: .95rem; font-weight: 700; color: #1a202c; }
    .btn-add {
      display: inline-flex; align-items: center; gap: .25rem;
      padding: .35rem .8rem; border-radius: 8px; border: 1.5px solid #00796b;
      background: #fff; color: #00796b; font-size: .8rem; font-weight: 700; cursor: pointer; transition: all .15s; white-space: nowrap;
      mat-icon { font-size: .9rem; width: .9rem; height: .9rem; }
      &.added { background: #00796b; color: #fff; }
      &:hover:not(.added) { background: #e0f2f1; }
    }

    .billing-card {
      background: #f7fafc; border: 1.5px solid #e2e8f0; border-radius: 12px; padding: 1rem 1.1rem;
      display: flex; flex-direction: column; gap: .5rem;
    }
    .billing-title { display: flex; align-items: center; gap: .4rem; font-size: .875rem; font-weight: 700; color: #2d3748;
      mat-icon { font-size: 1rem; width: 1rem; height: 1rem; color: #00796b; }
    }
    .billing-row { display: flex; justify-content: space-between; font-size: .85rem; color: #4a5568; }
    .billing-total { display: flex; justify-content: space-between; font-size: .95rem; font-weight: 800; color: #1a202c; border-top: 1px solid #e2e8f0; padding-top: .5rem; margin-top: .25rem; }

    .skeleton-list { display: flex; flex-direction: column; gap: .6rem; }
    .skeleton-row { height: 68px; border-radius: 12px; background: linear-gradient(90deg,#f0f4f8 25%,#e2e8f0 50%,#f0f4f8 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; }
    @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }

    .error-box { display: flex; align-items: center; gap: .75rem; padding: 1rem; background: #fff5f5; border-radius: 10px; color: #c53030; font-size: .875rem;
      mat-icon { font-size: 1.1rem; width: 1.1rem; height: 1.1rem; }
      button { margin-left: auto; background: none; border: 1px solid #c53030; border-radius: 6px; padding: .25rem .75rem; color: #c53030; cursor: pointer; font-size: .8rem; }
    }
    .empty-state { display: flex; flex-direction: column; align-items: center; gap: .5rem; padding: 2rem; color: #a0aec0;
      mat-icon { font-size: 2rem; width: 2rem; height: 2rem; }
      p { font-size: .875rem; }
    }

    .step-actions { display: flex; justify-content: space-between; align-items: center; padding-top: .25rem; }
    .btn-back {
      display: inline-flex; align-items: center; gap: .4rem;
      background: none; border: 1.5px solid #e2e8f0; border-radius: 10px;
      padding: .6rem 1.25rem; font-size: .875rem; font-weight: 600; color: #4a5568; cursor: pointer; transition: all .15s;
      mat-icon { font-size: 1rem; width: 1rem; height: 1rem; }
      &:hover { border-color: #00796b; color: #00796b; }
    }
    .btn-next {
      display: inline-flex; align-items: center; gap: .4rem;
      background: #00796b; color: #fff; border: none; border-radius: 10px;
      padding: .65rem 1.5rem; font-size: .9rem; font-weight: 700; cursor: pointer; transition: background .15s;
      mat-icon { font-size: 1rem; width: 1rem; height: 1rem; }
      &:hover:not(:disabled) { background: #00695c; }
      &:disabled { opacity: .5; cursor: not-allowed; }
    }
  `],
})
export class TestSelectionStepComponent implements OnInit, OnDestroy {
  next = output<void>();
  back = output<void>();

  /** Pre-selected package_id from URL query param */
  @Input() preselectedPackageId: string | null = null;
  /** Pre-selected test_id from URL query param */
  @Input() preselectedTestId: string | null = null;

  private testApi = inject(TestApiService);
  private packageApi = inject(PackageApiService);
  readonly store = inject(BookingWizardStore);

  activeTab: 'tests' | 'packages' = 'tests';
  searchQuery = '';

  loadingTests = signal(false);
  testError = signal<string | null>(null);
  testResults = signal<Test[]>([]);

  loadingPackages = signal(false);
  packageError = signal<string | null>(null);
  packages = signal<Package[]>([]);
  packagesLoaded = false;

  selectedTests = this.store.selectedTests;
  selectedPackages = this.store.selectedPackages;

  totalItems = computed(() => this.selectedTests().length + this.selectedPackages().length);
  grandTotal = computed(() => {
    const testSum = this.selectedTests().reduce((s: number, t: { id: string; name: string; price: number }) => s + t.price, 0);
    const pkgSum = this.selectedPackages().reduce((s: number, p: { id: string; name: string; price: number }) => s + p.price, 0);
    return testSum + pkgSum;
  });

  private search$ = new Subject<string>();
  private sub = this.search$.pipe(
    debounceTime(300),
    distinctUntilChanged(),
    switchMap((q: string) => {
      this.loadingTests.set(true);
      this.testError.set(null);
      return this.testApi.list({ q, page_size: 30 });
    }),
  ).subscribe({
    next: (res: { items: Test[] }) => { this.testResults.set(res.items); this.loadingTests.set(false); },
    error: () => { this.testError.set('Failed to load tests.'); this.loadingTests.set(false); },
  });

  ngOnInit(): void {
    this.search('');
    // If a package_id was passed via URL, switch to packages tab and pre-select it
    if (this.preselectedPackageId) {
      this.activeTab = 'packages';
      this.loadPackages(this.preselectedPackageId);
    }
    // If a test_id was passed via URL, pre-select it after loading
    if (this.preselectedTestId) {
      const testId = this.preselectedTestId;
      this.testApi.get(testId).subscribe({
        next: (test: Test) => {
          if (!this.isTestSelected(test.id)) this.toggleTest(test);
        },
        error: () => {},
      });
    }
  }

  ngOnDestroy(): void { this.sub.unsubscribe(); }

  onSearch(q: string): void { this.search$.next(q); }
  search(q: string): void { this.search$.next(q); }

  loadPackages(preselectId?: string | null): void {
    if (this.packagesLoaded && !preselectId) return;
    this.loadingPackages.set(true);
    this.packageError.set(null);
    this.packageApi.list({ page_size: 50 }).subscribe({
      next: (res: { items: Package[] }) => {
        this.packages.set(res.items);
        this.loadingPackages.set(false);
        this.packagesLoaded = true;
        // Auto-add the pre-selected package if not already in cart
        if (preselectId) {
          const pkg = res.items.find((p: Package) => p.id === preselectId);
          if (pkg && !this.isPkgSelected(pkg.id)) {
            this.togglePackage(pkg);
          }
        }
      },
      error: () => { this.packageError.set('Failed to load packages.'); this.loadingPackages.set(false); },
    });
  }

  isTestSelected(id: string): boolean {
    return this.selectedTests().some((t: { id: string }) => t.id === id);
  }

  isPkgSelected(id: string): boolean {
    return this.selectedPackages().some((p: { id: string }) => p.id === id);
  }

  toggleTest(test: Test): void {
    if (this.isTestSelected(test.id)) {
      this.store.patch({
        selectedTests: this.selectedTests().filter((t: { id: string }) => t.id !== test.id),
      });
    } else {
      this.store.patch({
        selectedTests: [...this.selectedTests(), { id: test.id, name: test.name, price: +test.effective_price }],
      });
    }
  }

  togglePackage(pkg: Package): void {
    if (this.isPkgSelected(pkg.id)) {
      this.store.patch({
        selectedPackages: this.selectedPackages().filter((p: { id: string }) => p.id !== pkg.id),
      });
    } else {
      this.store.patch({
        selectedPackages: [...this.selectedPackages(), { id: pkg.id, name: pkg.name, price: +pkg.discounted_price }],
      });
    }
  }

  fmt(value: number): string {
    const n = +value;
    return Number.isInteger(n)
      ? n.toLocaleString('en-IN')
      : n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  onNext(): void { this.next.emit(); }
}
