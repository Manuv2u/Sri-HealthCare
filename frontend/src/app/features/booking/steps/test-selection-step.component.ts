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
    <div class="layout">

      <!-- ── LEFT PANEL ── -->
      <div class="panel-left">

        <!-- Header -->
        <div class="panel-header">
          <div class="header-text">
            <h2>Select Tests &amp; Packages</h2>
            <p>Choose what you need — we'll handle the rest</p>
          </div>
        </div>

        <!-- Tab toggle -->
        <div class="tab-pill-row">
          <button class="tab-pill" [class.tab-active]="activeTab === 'tests'"
            (click)="activeTab = 'tests'">
            <mat-icon>biotech</mat-icon>
            <span>Tests</span>
          </button>
          <button class="tab-pill" [class.tab-active]="activeTab === 'packages'"
            (click)="activeTab = 'packages'; loadPackages()">
            <mat-icon>inventory_2</mat-icon>
            <span>Packages</span>
          </button>
        </div>

        <!-- Search (tests only) -->
        @if (activeTab === 'tests') {
          <div class="search-wrap" [class.search-focused]="searchFocused">
            <mat-icon class="search-icon">search</mat-icon>
            <input
              class="search-input"
              [(ngModel)]="searchQuery"
              (ngModelChange)="onSearch($event)"
              (focus)="searchFocused = true"
              (blur)="searchFocused = false"
              placeholder="Search CBC, Thyroid, HbA1c…"
              autocomplete="off" />
            @if (searchQuery) {
              <button class="search-clear" (click)="searchQuery = ''; onSearch('')">
                <mat-icon>close</mat-icon>
              </button>
            }
          </div>
        }

        <!-- Tests list -->
        @if (activeTab === 'tests') {
          @if (loadingTests()) {
            <div class="skeleton-list">
              @for (i of [1,2,3,4]; track i) {
                <div class="skeleton-card"></div>
              }
            </div>
          } @else if (testError()) {
            <div class="error-state">
              <mat-icon>error_outline</mat-icon>
              <span>{{ testError() }}</span>
              <button class="retry-btn" (click)="search(searchQuery)">Retry</button>
            </div>
          } @else if (testResults().length === 0) {
            <div class="empty-state">
              <div class="empty-icon-wrap">
                <mat-icon>search_off</mat-icon>
              </div>
              <p class="empty-title">No tests found</p>
              <p class="empty-sub">Try searching by a different name or code</p>
            </div>
          } @else {
            <div class="item-list">
              @for (test of testResults(); track test.id) {
                <div class="item-card" [class.item-selected]="isTestSelected(test.id)"
                  (click)="toggleTest(test)">
                  <div class="item-checkbox" [class.checked]="isTestSelected(test.id)">
                    @if (isTestSelected(test.id)) {
                      <mat-icon>check</mat-icon>
                    }
                  </div>
                  <div class="item-body">
                    <div class="item-name">{{ test.name }}</div>
                    @if (test.category) {
                      <div class="item-category">{{ test.category }}</div>
                    }
                  </div>
                  <div class="item-pricing">
                    @if (test.discount_percentage > 0) {
                      <span class="price-strike">₹{{ fmt(test.price) }}</span>
                      <span class="discount-badge">{{ test.discount_percentage }}% off</span>
                    }
                    <span class="price-amount">₹{{ fmt(test.effective_price) }}</span>
                  </div>
                </div>
              }
            </div>
          }
        }

        <!-- Packages list -->
        @if (activeTab === 'packages') {
          @if (loadingPackages()) {
            <div class="skeleton-list">
              @for (i of [1,2,3]; track i) {
                <div class="skeleton-card skeleton-tall"></div>
              }
            </div>
          } @else if (packageError()) {
            <div class="error-state">
              <mat-icon>error_outline</mat-icon>
              <span>{{ packageError() }}</span>
              <button class="retry-btn" (click)="loadPackages()">Retry</button>
            </div>
          } @else if (packages().length === 0) {
            <div class="empty-state">
              <div class="empty-icon-wrap">
                <mat-icon>inventory_2</mat-icon>
              </div>
              <p class="empty-title">No packages available</p>
              <p class="empty-sub">Check back soon or browse individual tests</p>
            </div>
          } @else {
            <div class="item-list">
              @for (pkg of packages(); track pkg.id) {
                <div class="item-card pkg-card" [class.item-selected]="isPkgSelected(pkg.id)"
                  (click)="togglePackage(pkg)">
                  <div class="item-checkbox" [class.checked]="isPkgSelected(pkg.id)">
                    @if (isPkgSelected(pkg.id)) {
                      <mat-icon>check</mat-icon>
                    }
                  </div>
                  <div class="item-body">
                    <div class="item-name">{{ pkg.name }}</div>
                    @if (pkg.description) {
                      <div class="item-category">{{ pkg.description }}</div>
                    }
                    @if (pkg.tests?.length) {
                      <div class="pkg-chips">
                        @for (t of pkg.tests.slice(0,4); track t.id) {
                          <span class="pkg-chip">{{ t.name }}</span>
                        }
                        @if (pkg.tests.length > 4) {
                          <span class="pkg-chip pkg-chip-more">+{{ pkg.tests.length - 4 }} more</span>
                        }
                      </div>
                    }
                  </div>
                  <div class="item-pricing">
                    @if (pkg.original_price > pkg.discounted_price) {
                      <span class="price-strike">₹{{ fmt(pkg.original_price) }}</span>
                      <span class="discount-badge">Save ₹{{ fmt(pkg.original_price - pkg.discounted_price) }}</span>
                    }
                    <span class="price-amount">₹{{ fmt(pkg.discounted_price) }}</span>
                  </div>
                </div>
              }
            </div>
          }
        }

      </div>

      <!-- ── RIGHT PANEL (cart) ── -->
      <div class="panel-right">
        <div class="cart-header">
          <span class="cart-title">Your Selection</span>
          @if (totalItems() > 0) {
            <span class="cart-count">{{ totalItems() }} item{{ totalItems() > 1 ? 's' : '' }}</span>
          }
        </div>

        @if (totalItems() === 0) {
          <div class="cart-empty">
            <div class="cart-empty-icon">
              <mat-icon>add_shopping_cart</mat-icon>
            </div>
            <p class="cart-empty-title">Nothing selected yet</p>
            <p class="cart-empty-sub">Pick tests or packages from the list</p>
          </div>
        } @else {
          <div class="cart-items">
            @for (t of selectedTests(); track t.id) {
              <div class="cart-row">
                <div class="cart-row-left">
                  <span class="cart-type-dot dot-test"></span>
                  <span class="cart-item-name">{{ t.name }}</span>
                </div>
                <div class="cart-row-right">
                  <span class="cart-item-price">₹{{ fmt(t.price) }}</span>
                  <button class="cart-remove" (click)="removeTest(t.id)" title="Remove">
                    <mat-icon>close</mat-icon>
                  </button>
                </div>
              </div>
            }
            @for (p of selectedPackages(); track p.id) {
              <div class="cart-row">
                <div class="cart-row-left">
                  <span class="cart-type-dot dot-pkg"></span>
                  <span class="cart-item-name">{{ p.name }}</span>
                </div>
                <div class="cart-row-right">
                  <span class="cart-item-price">₹{{ fmt(p.price) }}</span>
                  <button class="cart-remove" (click)="removePkg(p.id)" title="Remove">
                    <mat-icon>close</mat-icon>
                  </button>
                </div>
              </div>
            }
          </div>

          <div class="cart-divider"></div>

          <div class="cart-total-row">
            <span class="cart-total-label">Total Amount</span>
            <span class="cart-total-value">₹{{ fmt(grandTotal()) }}</span>
          </div>
        }

        <!-- Actions -->
        <div class="cart-actions">
          <button class="btn-back" (click)="back.emit()">
            <mat-icon>arrow_back</mat-icon>
            <span>Back</span>
          </button>
          <button class="btn-continue" [disabled]="totalItems() === 0" (click)="onNext()">
            <span>Continue</span>
            <mat-icon>arrow_forward</mat-icon>
          </button>
        </div>

        @if (totalItems() === 0) {
          <p class="continue-hint">Select at least one test or package to continue</p>
        }
      </div>

    </div>
  `,
  styles: [`
    /* ── Layout ── */
    .layout {
      display: grid;
      grid-template-columns: 1fr 320px;
      gap: 1.5rem;
      align-items: start;
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
    }
    @media (max-width: 768px) {
      .layout {
        grid-template-columns: 1fr;
      }
    }

    /* ── Left panel ── */
    .panel-left {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .panel-header {
      padding-bottom: 0.25rem;
    }
    .panel-header h2 {
      font-size: 1.3rem;
      font-weight: 800;
      color: #0F172A;
      margin: 0 0 0.2rem;
      letter-spacing: -0.01em;
    }
    .panel-header p {
      font-size: 0.85rem;
      color: #94A3B8;
      margin: 0;
    }

    /* ── Tab pill row ── */
    .tab-pill-row {
      display: flex;
      background: #EEF2FF;
      border-radius: 999px;
      padding: 3px;
      gap: 2px;
      width: fit-content;
    }
    .tab-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.45rem 1.1rem;
      border-radius: 999px;
      border: none;
      background: transparent;
      color: #6366F1;
      font-size: 0.85rem;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.18s, color 0.18s, box-shadow 0.18s;
    }
    .tab-pill mat-icon {
      font-size: 1rem;
      width: 1rem;
      height: 1rem;
    }
    .tab-pill.tab-active {
      background: #6366F1;
      color: #fff;
      box-shadow: 0 2px 8px rgba(99,102,241,0.3);
    }
    .tab-pill:hover:not(.tab-active) {
      background: #C7D2FE;
    }

    /* ── Search ── */
    .search-wrap {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: #fff;
      border: 1.5px solid #E2E8F0;
      border-radius: 12px;
      padding: 0.6rem 0.9rem;
      transition: border-color 0.15s, box-shadow 0.15s;
    }
    .search-wrap.search-focused {
      border-color: #6366F1;
      box-shadow: 0 0 0 3px rgba(99,102,241,0.12);
    }
    .search-icon {
      color: #94A3B8;
      font-size: 1.1rem;
      width: 1.1rem;
      height: 1.1rem;
      flex-shrink: 0;
    }
    .search-input {
      flex: 1;
      border: none;
      outline: none;
      font-size: 0.9rem;
      color: #0F172A;
      background: transparent;
      font-family: inherit;
    }
    .search-input::placeholder { color: #94A3B8; }
    .search-clear {
      display: flex;
      align-items: center;
      background: none;
      border: none;
      cursor: pointer;
      color: #94A3B8;
      padding: 0;
      line-height: 1;
      transition: color 0.15s;
    }
    .search-clear:hover { color: #475569; }
    .search-clear mat-icon { font-size: 1rem; width: 1rem; height: 1rem; }

    /* ── Item list ── */
    .item-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      max-height: 420px;
      overflow-y: auto;
      padding-right: 2px;
    }
    .item-list::-webkit-scrollbar { width: 4px; }
    .item-list::-webkit-scrollbar-track { background: transparent; }
    .item-list::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 4px; }

    /* ── Item card ── */
    .item-card {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      padding: 0.85rem 1rem;
      border-radius: 12px;
      border: 1.5px solid #E2E8F0;
      background: #fff;
      cursor: pointer;
      transition: border-color 0.15s, background 0.15s, box-shadow 0.15s, transform 0.12s;
      user-select: none;
    }
    .item-card:hover {
      border-color: #A5B4FC;
      box-shadow: 0 2px 10px rgba(99,102,241,0.08);
      transform: translateY(-1px);
    }
    .item-card.item-selected {
      border-color: #6366F1;
      background: #EEF2FF;
      box-shadow: 0 2px 12px rgba(99,102,241,0.14);
    }

    /* Checkbox */
    .item-checkbox {
      width: 20px;
      height: 20px;
      border-radius: 6px;
      border: 2px solid #CBD5E1;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-top: 1px;
      transition: background 0.15s, border-color 0.15s;
    }
    .item-checkbox.checked {
      background: #6366F1;
      border-color: #6366F1;
    }
    .item-checkbox mat-icon {
      font-size: 13px;
      width: 13px;
      height: 13px;
      color: #fff;
    }

    /* Item body */
    .item-body { flex: 1; min-width: 0; }
    .item-name {
      font-size: 0.88rem;
      font-weight: 700;
      color: #0F172A;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .item-selected .item-name { color: #4338CA; }
    .item-category {
      font-size: 0.76rem;
      color: #94A3B8;
      margin-top: 0.15rem;
    }

    /* Package chips */
    .pkg-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 0.3rem;
      margin-top: 0.45rem;
    }
    .pkg-chip {
      font-size: 0.68rem;
      font-weight: 600;
      background: #EEF2FF;
      color: #6366F1;
      padding: 0.15rem 0.45rem;
      border-radius: 4px;
      letter-spacing: 0.01em;
    }
    .item-selected .pkg-chip {
      background: #C7D2FE;
      color: #4338CA;
    }
    .pkg-chip-more {
      background: #F1F5F9;
      color: #64748B;
    }

    /* Pricing */
    .item-pricing {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 0.2rem;
      flex-shrink: 0;
    }
    .price-strike {
      font-size: 0.72rem;
      color: #CBD5E1;
      text-decoration: line-through;
      font-variant-numeric: tabular-nums;
    }
    .discount-badge {
      font-size: 0.65rem;
      font-weight: 700;
      color: #EA580C;
      background: #FFF7ED;
      padding: 0.1rem 0.35rem;
      border-radius: 4px;
      letter-spacing: 0.02em;
    }
    .price-amount {
      font-size: 0.95rem;
      font-weight: 800;
      color: #F97316;
      font-variant-numeric: tabular-nums;
    }

    /* ── Skeletons ── */
    .skeleton-list { display: flex; flex-direction: column; gap: 0.5rem; }
    .skeleton-card {
      height: 64px;
      border-radius: 12px;
      background: linear-gradient(90deg, #F1F5F9 25%, #E2E8F0 50%, #F1F5F9 75%);
      background-size: 200% 100%;
      animation: shimmer 1.4s ease-in-out infinite;
    }
    .skeleton-tall { height: 90px; }
    @keyframes shimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }

    /* ── Error state ── */
    .error-state {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      padding: 1rem 1.1rem;
      background: #FFF5F5;
      border: 1px solid #FED7D7;
      border-radius: 12px;
      color: #C53030;
      font-size: 0.85rem;
    }
    .error-state mat-icon { font-size: 1.1rem; width: 1.1rem; height: 1.1rem; flex-shrink: 0; }
    .retry-btn {
      margin-left: auto;
      background: none;
      border: 1.5px solid #FC8181;
      border-radius: 8px;
      padding: 0.3rem 0.8rem;
      color: #C53030;
      font-size: 0.78rem;
      font-weight: 700;
      cursor: pointer;
      font-family: inherit;
      transition: background 0.15s;
    }
    .retry-btn:hover { background: #FED7D7; }

    /* ── Empty state ── */
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 2.5rem 1rem;
      gap: 0.4rem;
      text-align: center;
    }
    .empty-icon-wrap {
      width: 52px;
      height: 52px;
      border-radius: 16px;
      background: #EEF2FF;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 0.4rem;
    }
    .empty-icon-wrap mat-icon { font-size: 1.6rem; width: 1.6rem; height: 1.6rem; color: #A5B4FC; }
    .empty-title { font-size: 0.9rem; font-weight: 700; color: #475569; margin: 0; }
    .empty-sub { font-size: 0.8rem; color: #94A3B8; margin: 0; }

    /* ── Right panel (cart) ── */
    .panel-right {
      background: #fff;
      border: 1.5px solid #E2E8F0;
      border-radius: 16px;
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
      position: sticky;
      top: 1rem;
    }

    .cart-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .cart-title {
      font-size: 0.9rem;
      font-weight: 800;
      color: #0F172A;
      letter-spacing: -0.01em;
    }
    .cart-count {
      font-size: 0.72rem;
      font-weight: 700;
      background: #6366F1;
      color: #fff;
      padding: 0.18rem 0.55rem;
      border-radius: 999px;
    }

    /* Cart empty */
    .cart-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 1.5rem 0.5rem;
      gap: 0.35rem;
      text-align: center;
    }
    .cart-empty-icon {
      width: 48px;
      height: 48px;
      background: #F8F9FF;
      border-radius: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 0.35rem;
    }
    .cart-empty-icon mat-icon { font-size: 1.4rem; width: 1.4rem; height: 1.4rem; color: #C7D2FE; }
    .cart-empty-title { font-size: 0.82rem; font-weight: 700; color: #64748B; margin: 0; }
    .cart-empty-sub { font-size: 0.75rem; color: #94A3B8; margin: 0; }

    /* Cart items */
    .cart-items {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      max-height: 260px;
      overflow-y: auto;
    }
    .cart-items::-webkit-scrollbar { width: 3px; }
    .cart-items::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 4px; }

    .cart-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
      padding: 0.5rem 0.6rem;
      background: #F8F9FF;
      border-radius: 8px;
    }
    .cart-row-left {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      min-width: 0;
      flex: 1;
    }
    .cart-type-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      flex-shrink: 0;
    }
    .dot-test { background: #6366F1; }
    .dot-pkg { background: #F97316; }
    .cart-item-name {
      font-size: 0.78rem;
      font-weight: 600;
      color: #334155;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .cart-row-right {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      flex-shrink: 0;
    }
    .cart-item-price {
      font-size: 0.8rem;
      font-weight: 700;
      color: #F97316;
      font-variant-numeric: tabular-nums;
    }
    .cart-remove {
      display: flex;
      align-items: center;
      background: none;
      border: none;
      cursor: pointer;
      color: #CBD5E1;
      padding: 0;
      border-radius: 4px;
      transition: color 0.15s;
    }
    .cart-remove:hover { color: #EF4444; }
    .cart-remove mat-icon { font-size: 14px; width: 14px; height: 14px; }

    /* Cart total */
    .cart-divider {
      height: 1px;
      background: #E2E8F0;
      margin: 0 -0.1rem;
    }
    .cart-total-row {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
    }
    .cart-total-label {
      font-size: 0.78rem;
      font-weight: 600;
      color: #64748B;
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }
    .cart-total-value {
      font-size: 1.35rem;
      font-weight: 900;
      color: #F97316;
      font-variant-numeric: tabular-nums;
      letter-spacing: -0.02em;
    }

    /* ── Actions ── */
    .cart-actions {
      display: flex;
      gap: 0.6rem;
    }
    .btn-back {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      background: #fff;
      border: 1.5px solid #E2E8F0;
      border-radius: 10px;
      padding: 0.65rem 1rem;
      font-size: 0.85rem;
      font-weight: 600;
      color: #64748B;
      cursor: pointer;
      font-family: inherit;
      transition: border-color 0.15s, color 0.15s;
    }
    .btn-back mat-icon { font-size: 1rem; width: 1rem; height: 1rem; }
    .btn-back:hover { border-color: #6366F1; color: #6366F1; }

    .btn-continue {
      flex: 1;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.4rem;
      background: linear-gradient(135deg, #6366F1 0%, #4F46E5 100%);
      color: #fff;
      border: none;
      border-radius: 10px;
      padding: 0.7rem 1.25rem;
      font-size: 0.9rem;
      font-weight: 700;
      cursor: pointer;
      font-family: inherit;
      transition: opacity 0.15s, box-shadow 0.15s, transform 0.12s;
      box-shadow: 0 4px 12px rgba(99,102,241,0.35);
    }
    .btn-continue mat-icon { font-size: 1rem; width: 1rem; height: 1rem; }
    .btn-continue:hover:not(:disabled) {
      opacity: 0.92;
      box-shadow: 0 6px 18px rgba(99,102,241,0.4);
      transform: translateY(-1px);
    }
    .btn-continue:disabled {
      background: linear-gradient(135deg, #CBD5E1 0%, #94A3B8 100%);
      box-shadow: none;
      cursor: not-allowed;
      opacity: 1;
    }

    .continue-hint {
      font-size: 0.72rem;
      color: #94A3B8;
      text-align: center;
      margin: -0.4rem 0 0;
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
  searchFocused = false;

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

  removeTest(id: string): void {
    this.store.patch({
      selectedTests: this.selectedTests().filter((t: { id: string }) => t.id !== id),
    });
  }

  removePkg(id: string): void {
    this.store.patch({
      selectedPackages: this.selectedPackages().filter((p: { id: string }) => p.id !== id),
    });
  }

  fmt(value: number): string {
    const n = +value;
    return Number.isInteger(n)
      ? n.toLocaleString('en-IN')
      : n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  onNext(): void { this.next.emit(); }
}
