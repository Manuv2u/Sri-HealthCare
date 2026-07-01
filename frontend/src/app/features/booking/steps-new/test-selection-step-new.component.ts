import { Component, inject, OnInit, Input, output, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TestApiService } from '../../../core/api/services/test-api.service';
import { PackageApiService } from '../../../core/api/services/package-api.service';
import { BookingWizardStore } from '../../../core/store/booking-wizard.store';
import { Test, Package } from '../../../core/api/api.types';
import {
  ButtonComponent, CardComponent, BadgeComponent,
  SpinnerComponent, SearchInputComponent, TabsComponent
} from '../../../shared/components';

type SelectionMode = 'tests' | 'packages';

interface SelectedItem {
  id: string;
  name: string;
  price: number;
}

@Component({
  selector: 'app-test-selection-step-new',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonComponent,
    CardComponent,
    BadgeComponent,
    SpinnerComponent,
    SearchInputComponent,
    TabsComponent
  ],
  template: `
    <div class="test-selection">
      <!-- Search & Tabs -->
      <div class="selection-header">
        <div class="selection-tabs">
          <button 
            class="tab-btn" 
            [class.tab-btn--active]="mode() === 'tests'"
            (click)="setMode('tests')"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 17H2a3 3 0 003 3h14a3 3 0 003-3zM2 17V5a3 3 0 013-3h14a3 3 0 013 3v12"/>
            </svg>
            Individual Tests
          </button>
          <button 
            class="tab-btn" 
            [class.tab-btn--active]="mode() === 'packages'"
            (click)="setMode('packages')"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
            </svg>
            Health Packages
          </button>
        </div>

        @if (mode() === 'tests') {
          <div class="search-row">
            <div class="search-wrapper">
              <input 
                type="text" 
                class="search-input"
                placeholder="Search tests by name or category..."
                [(ngModel)]="searchQuery"
                (input)="onSearch()"
              />
              <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </div>
            
            <select class="category-select" [(ngModel)]="selectedCategory" (change)="filterTests()">
              <option value="">All Categories</option>
              @for (cat of categories(); track cat) {
                <option [value]="cat">{{ cat }}</option>
              }
            </select>
          </div>
        }
      </div>

      <!-- Scrollable Content Area -->
      <div class="selection-content">
        @if (loading()) {
          <div class="loading-state">
            <app-spinner size="lg" />
            <p>Loading {{ mode() === 'tests' ? 'tests' : 'packages' }}...</p>
          </div>
        } @else {
          <!-- Tests Grid -->
          @if (mode() === 'tests') {
            @if (filteredTests().length === 0) {
              <div class="empty-state">
                <div class="empty-state__icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  </svg>
                </div>
                <h3>No tests found</h3>
                <p>Try adjusting your search or category filter</p>
              </div>
            } @else {
              <div class="items-grid">
                @for (test of filteredTests(); track test.id) {
                  <button 
                    type="button"
                    class="item-card"
                    [class.item-card--selected]="isTestSelected(test.id)"
                    (click)="toggleTest(test)"
                  >
                    <div class="item-card__header">
                      <app-badge variant="default" size="sm">{{ test.category }}</app-badge>
                      @if (test.discount_percentage > 0) {
                        <app-badge variant="success" size="sm">{{ test.discount_percentage }}% OFF</app-badge>
                      }
                    </div>
                    <h4 class="item-card__name">{{ test.name }}</h4>
                    @if (test.description) {
                      <p class="item-card__desc">{{ test.description }}</p>
                    }
                    <div class="item-card__footer">
                      <div class="item-card__price">
                        <span class="price-current">₹{{ test.effective_price }}</span>
                        @if (test.discount_percentage > 0) {
                          <span class="price-original">₹{{ test.price }}</span>
                        }
                      </div>
                      <div class="item-card__meta">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                        </svg>
                        {{ test.turnaround_hours }} hrs
                      </div>
                    </div>
                    <div class="item-card__check" [class.item-card__check--visible]="isTestSelected(test.id)">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    </div>
                  </button>
                }
              </div>
            }
          }

          <!-- Packages Grid -->
          @if (mode() === 'packages') {
            @if (packages().length === 0) {
              <div class="empty-state">
                <div class="empty-state__icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
                  </svg>
                </div>
                <h3>No packages available</h3>
                <p>Check back later for health packages</p>
              </div>
            } @else {
              <div class="packages-grid">
                @for (pkg of packages(); track pkg.id) {
                  <button 
                    type="button"
                    class="package-card"
                    [class.package-card--selected]="isPackageSelected(pkg.id)"
                    (click)="togglePackage(pkg)"
                  >
                    <div class="package-card__header">
                      <h4 class="package-card__name">{{ pkg.name }}</h4>
                      @if (Number(pkg.discounted_price) < Number(pkg.original_price)) {
                        <app-badge variant="success" size="sm">
                          {{ getSavingsPercent(pkg) }}% OFF
                        </app-badge>
                      }
                    </div>
                    
                    @if (pkg.description) {
                      <p class="package-card__desc">{{ pkg.description }}</p>
                    }
                    
                    <div class="package-card__tests">
                      <span class="package-card__tests-label">Includes {{ pkg.tests.length }} tests:</span>
                      <div class="package-card__tests-list">
                        @for (test of pkg.tests.slice(0, 4); track test.id) {
                          <span class="package-card__test-name">{{ test.name }}</span>
                        }
                        @if (pkg.tests.length > 4) {
                          <span class="package-card__test-more">+{{ pkg.tests.length - 4 }} more</span>
                        }
                      </div>
                    </div>
                    
                    <div class="package-card__footer">
                      <div class="package-card__price">
                        <span class="price-current">₹{{ Number(pkg.discounted_price) | number:'1.0-0' }}</span>
                        @if (Number(pkg.discounted_price) < Number(pkg.original_price)) {
                          <span class="price-original">₹{{ Number(pkg.original_price) | number:'1.0-0' }}</span>
                        }
                      </div>
                      <span class="package-card__save">
                        Save ₹{{ (Number(pkg.original_price) - Number(pkg.discounted_price)) | number:'1.0-0' }}
                      </span>
                    </div>
                    
                    <div class="package-card__check" [class.package-card__check--visible]="isPackageSelected(pkg.id)">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    </div>
                  </button>
                }
              </div>
            }
          }
        }
      </div>

      <!-- Selection Summary -->
      @if (hasSelection()) {
        <div class="selection-summary">
          <div class="summary-header">
            <h4>Selected Items</h4>
            <button class="clear-btn" (click)="clearSelection()">Clear All</button>
          </div>
          
          <div class="summary-items">
            @for (item of selectedTests(); track item.id) {
              <div class="summary-item">
                <span class="summary-item__name">{{ item.name }}</span>
                <span class="summary-item__price">₹{{ item.price | number:'1.0-0' }}</span>
                <button class="summary-item__remove" (click)="removeTest(item.id)">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            }
            @for (item of selectedPackages(); track item.id) {
              <div class="summary-item summary-item--package">
                <span class="summary-item__name">{{ item.name }}</span>
                <span class="summary-item__price">₹{{ item.price | number:'1.0-0' }}</span>
                <button class="summary-item__remove" (click)="removePackage(item.id)">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            }
          </div>
          
          <div class="summary-total">
            <span>Total Amount</span>
            <span class="summary-total__amount">₹{{ totalAmount() | number:'1.0-0' }}</span>
          </div>
        </div>
      }

      <!-- Actions -->
      <div class="step-actions">
        <app-button variant="outline" size="lg" (click)="back.emit()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="btn-icon btn-icon--left">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Back
        </app-button>
        <app-button variant="primary" size="lg" [disabled]="!hasSelection()" (click)="onNext()">
          Continue
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="btn-icon">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </app-button>
      </div>
    </div>
  `,
  styles: [`
    .test-selection {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    /* Scrollable Content */
    .selection-content {
      overflow-y: auto;
      max-height: 500px;
      padding-right: 0.5rem;
    }

    .selection-content::-webkit-scrollbar {
      width: 6px;
    }

    .selection-content::-webkit-scrollbar-track {
      background: #F1F5F9;
      border-radius: 3px;
    }

    .selection-content::-webkit-scrollbar-thumb {
      background: #CBD5E1;
      border-radius: 3px;
    }

    .selection-content::-webkit-scrollbar-thumb:hover {
      background: #94A3B8;
    }

    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 3rem;
      gap: 1rem;

      p {
        color: #475569;
        margin: 0;
      }
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding: 3rem;
      gap: 0.75rem;
    }

    .empty-state__icon {
      width: 64px;
      height: 64px;
      border-radius: 9999px;
      background: #F8FAFC;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #94A3B8;

      svg {
        width: 32px;
        height: 32px;
      }
    }

    .empty-state h3 {
      font-size: 1.125rem;
      font-weight: 600;
      color: #0F172A;
      margin: 0;
    }

    .empty-state p {
      color: #475569;
      margin: 0;
    }

    /* Header */
    .selection-header {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .selection-tabs {
      display: flex;
      gap: 0.5rem;
      padding: 0.25rem;
      background: #F8FAFC;
      border-radius: 0.75rem;
    }

    .tab-btn {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 0.75rem 1rem;
      background: transparent;
      border: none;
      border-radius: 0.5rem;
      font-size: 0.875rem;
      font-weight: 500;
      color: #475569;
      cursor: pointer;
      transition: all 150ms;

      svg {
        width: 18px;
        height: 18px;
      }

      &:hover {
        color: #0F172A;
        background: #FFFFFF;
      }
    }

    .tab-btn--active {
      background: #FFFFFF;
      color: #285E61;
      box-shadow: 0 1px 3px 0 rgba(0,0,0,.1),0 1px 2px -1px rgba(0,0,0,.1);
    }

    .search-row {
      display: flex;
      gap: 0.75rem;

      @media (max-width: 640px) {
        flex-direction: column;
      }
    }

    .search-wrapper {
      flex: 1;
      position: relative;
    }

    .search-input {
      width: 100%;
      padding: 0.75rem 0.75rem 0.75rem 2.5rem;
      border: 1.5px solid #E2E8F0;
      border-radius: 0.75rem;
      background: #FFFFFF;
      font-size: 1rem;
      color: #0F172A;
      transition: all 150ms;

      &:focus {
        outline: none;
        border-color: #319795;
        box-shadow: 0 0 0 4px #B2F5EA;
      }

      &::placeholder {
        color: #94A3B8;
      }
    }

    .search-icon {
      position: absolute;
      left: 0.75rem;
      top: 50%;
      transform: translateY(-50%);
      width: 20px;
      height: 20px;
      color: #94A3B8;
    }

    .category-select {
      min-width: 160px;
      padding: 0.75rem;
      border: 1.5px solid #E2E8F0;
      border-radius: 0.75rem;
      background: #FFFFFF;
      font-size: 0.875rem;
      color: #0F172A;
      cursor: pointer;

      &:focus {
        outline: none;
        border-color: #319795;
      }
    }

    /* Items Grid */
    .items-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: 1rem;
    }

    .item-card {
      position: relative;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      padding: 1rem;
      background: #FFFFFF;
      border: 2px solid #E2E8F0;
      border-radius: 1rem;
      text-align: left;
      cursor: pointer;
      transition: all 200ms cubic-bezier(0.4,0,0.2,1);

      &:hover {
        border-color: #4FD1C5;
        transform: translateY(-2px);
        box-shadow: 0 4px 6px -1px rgba(0,0,0,.1),0 2px 4px -2px rgba(0,0,0,.1);
      }
    }

    .item-card--selected {
      border-color: #319795;
      background: #E6FFFA;
      box-shadow: 0 4px 14px 0 rgba(49,151,149,.25);
    }

    .item-card__header {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .item-card__name {
      font-size: 1rem;
      font-weight: 600;
      color: #0F172A;
      margin: 0;
      line-height: 1.375;
    }

    .item-card__desc {
      font-size: 0.875rem;
      color: #475569;
      margin: 0;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .item-card__footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: auto;
      padding-top: 0.75rem;
      border-top: 1px solid #F1F5F9;
    }

    .item-card__price {
      display: flex;
      align-items: baseline;
      gap: 0.5rem;
    }

    .price-current {
      font-size: 1.125rem;
      font-weight: 700;
      color: #0F172A;
    }

    .price-original {
      font-size: 0.875rem;
      color: #94A3B8;
      text-decoration: line-through;
    }

    .item-card__meta {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      font-size: 0.875rem;
      color: #475569;

      svg {
        width: 14px;
        height: 14px;
      }
    }

    .item-card__check {
      position: absolute;
      top: 0.75rem;
      right: 0.75rem;
      width: 24px;
      height: 24px;
      border-radius: 9999px;
      background: #319795;
      color: #FFFFFF;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transform: scale(0.7);
      transition: all 150ms;

      svg {
        width: 14px;
        height: 14px;
      }
    }

    .item-card__check--visible {
      opacity: 1;
      transform: scale(1);
    }

    /* Packages Grid */
    .packages-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 1rem;
    }

    .package-card {
      position: relative;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      padding: 1.25rem;
      background: #FFFFFF;
      border: 2px solid #E2E8F0;
      border-radius: 1rem;
      text-align: left;
      cursor: pointer;
      transition: all 200ms cubic-bezier(0.4,0,0.2,1);

      &:hover {
        border-color: #4FD1C5;
        transform: translateY(-2px);
        box-shadow: 0 4px 6px -1px rgba(0,0,0,.1),0 2px 4px -2px rgba(0,0,0,.1);
      }
    }

    .package-card--selected {
      border-color: #319795;
      background: #E6FFFA;
      box-shadow: 0 4px 14px 0 rgba(49,151,149,.25);
    }

    .package-card__header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 0.5rem;
    }

    .package-card__name {
      font-size: 1.125rem;
      font-weight: 700;
      color: #0F172A;
      margin: 0;
    }

    .package-card__desc {
      font-size: 0.875rem;
      color: #475569;
      margin: 0;
    }

    .package-card__tests {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      padding: 0.75rem;
      background: #F8FAFC;
      border-radius: 0.75rem;
    }

    .package-card__tests-label {
      font-size: 0.75rem;
      font-weight: 600;
      color: #475569;
      text-transform: uppercase;
      letter-spacing: 0.025em;
    }

    .package-card__tests-list {
      display: flex;
      flex-wrap: wrap;
      gap: 0.375rem;
    }

    .package-card__test-name {
      font-size: 0.875rem;
      color: #0F172A;
      padding: 0.25rem 0.5rem;
      background: #FFFFFF;
      border-radius: 0.25rem;
    }

    .package-card__test-more {
      font-size: 0.875rem;
      color: #2C7A7B;
      font-weight: 500;
      padding: 0.25rem 0.5rem;
    }

    .package-card__footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 0.75rem;
      border-top: 1px solid #F1F5F9;
    }

    .package-card__price {
      display: flex;
      align-items: baseline;
      gap: 0.5rem;
    }

    .package-card__save {
      font-size: 0.875rem;
      font-weight: 600;
      color: #2F855A;
    }

    .package-card__check {
      position: absolute;
      top: 1rem;
      right: 1rem;
      width: 28px;
      height: 28px;
      border-radius: 9999px;
      background: #319795;
      color: #FFFFFF;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transform: scale(0.7);
      transition: all 150ms;

      svg {
        width: 16px;
        height: 16px;
      }
    }

    .package-card__check--visible {
      opacity: 1;
      transform: scale(1);
    }

    /* Selection Summary */
    .selection-summary {
      padding: 1.25rem;
      background: #F8FAFC;
      border-radius: 1rem;
      border: 1px solid #E2E8F0;
    }

    .summary-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;

      h4 {
        font-size: 1rem;
        font-weight: 700;
        color: #0F172A;
        margin: 0;
      }
    }

    .clear-btn {
      background: none;
      border: none;
      font-size: 0.875rem;
      font-weight: 500;
      color: #DC2626;
      cursor: pointer;
      padding: 0.25rem 0.5rem;
      border-radius: 0.375rem;
      transition: background 0.15s;

      &:hover {
        background: #FEF2F2;
      }
    }

    .summary-items {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      margin-bottom: 1rem;
    }

    .summary-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem;
      background: #FFFFFF;
      border-radius: 0.75rem;
    }

    .summary-item--package {
      border-left: 3px solid #DD6B20;
    }

    .summary-item__name {
      flex: 1;
      font-size: 0.875rem;
      color: #0F172A;
    }

    .summary-item__price {
      font-size: 0.875rem;
      font-weight: 600;
      color: #0F172A;
    }

    .summary-item__remove {
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: none;
      border: none;
      border-radius: 9999px;
      color: #94A3B8;
      cursor: pointer;
      transition: all 150ms;

      svg {
        width: 16px;
        height: 16px;
      }

      &:hover {
        background: #FEF2F2;
        color: #DC2626;
      }
    }

    .summary-total {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 0.75rem;
      border-top: 1px solid #E2E8F0;

      span:first-child {
        font-size: 0.875rem;
        font-weight: 500;
        color: #475569;
      }
    }

    .summary-total__amount {
      font-size: 1.25rem;
      font-weight: 700;
      color: #285E61;
    }

    /* Step Actions */
    .step-actions {
      display: flex;
      justify-content: space-between;
      padding-top: 1rem;
      border-top: 1px solid #F1F5F9;
    }

    .btn-icon {
      width: 18px;
      height: 18px;
      margin-left: 0.5rem;
    }

    .btn-icon--left {
      margin-left: 0;
      margin-right: 0.5rem;
    }

    /* Reduced Motion */
    @media (prefers-reduced-motion: reduce) {
      .item-card,
      .package-card,
      .item-card__check,
      .package-card__check,
      .tab-btn {
        transition: none;
      }

      .item-card:hover,
      .package-card:hover {
        transform: none;
      }
    }

    /* Responsive */
    @media (max-width: 768px) {
      .selection-content {
        max-height: 400px;
      }
    }
  `]
})
export class TestSelectionStepNewComponent implements OnInit {
  @Input() preselectedPackageId: string | null = null;
  @Input() preselectedTestId: string | null = null;

  next = output<void>();
  back = output<void>();

  private testApi = inject(TestApiService);
  private packageApi = inject(PackageApiService);
  readonly store = inject(BookingWizardStore);

  // Make Number available in template
  Number = Number;

  /* State */
  loading = signal(false);
  mode = signal<SelectionMode>('tests');
  tests = signal<Test[]>([]);
  packages = signal<Package[]>([]);
  filteredTests = signal<Test[]>([]);
  categories = signal<string[]>([]);
  selectedTests = signal<SelectedItem[]>([]);
  selectedPackages = signal<SelectedItem[]>([]);

  searchQuery = '';
  selectedCategory = '';

  totalAmount = computed(() => {
    const testsTotal = this.selectedTests().reduce((sum, t) => sum + t.price, 0);
    const packagesTotal = this.selectedPackages().reduce((sum, p) => sum + p.price, 0);
    return testsTotal + packagesTotal;
  });

  hasSelection = computed(() => 
    this.selectedTests().length > 0 || this.selectedPackages().length > 0
  );

  ngOnInit(): void {
    this.loadData();
  }

  private loadData(): void {
    this.loading.set(true);

    this.testApi.list({ page_size: 100 }).subscribe({
      next: (res) => {
        const activeTests = res.items.filter(t => t.is_active);
        this.tests.set(activeTests);
        this.filteredTests.set(activeTests);
        
        const cats = [...new Set(activeTests.map(t => t.category))].sort();
        this.categories.set(cats);

        /* Preselect test if provided */
        if (this.preselectedTestId) {
          const test = activeTests.find(t => t.id === this.preselectedTestId);
          if (test) {
            this.selectedTests.set([{ id: test.id, name: test.name, price: test.effective_price }]);
          }
        }

        this.loadPackages();
      },
      error: () => this.loading.set(false)
    });
  }

  private loadPackages(): void {
    this.packageApi.list({ page_size: 100 }).subscribe({
      next: (res) => {
        // Normalize prices to numbers (backend sends Decimal as strings)
        const activePkgs = res.items
          .filter(p => p.is_active)
          .map(p => ({
            ...p,
            original_price: Number(p.original_price),
            discounted_price: Number(p.discounted_price)
          }));
        this.packages.set(activePkgs);

        /* Preselect package if provided */
        if (this.preselectedPackageId) {
          const pkg = activePkgs.find(p => p.id === this.preselectedPackageId);
          if (pkg) {
            this.selectedPackages.set([{ id: pkg.id, name: pkg.name, price: Number(pkg.discounted_price) }]);
            this.mode.set('packages');
          }
        }

        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  setMode(newMode: SelectionMode): void {
    this.mode.set(newMode);
  }

  onSearch(): void {
    this.filterTests();
  }

  filterTests(): void {
    let filtered = this.tests();

    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(t => 
        t.name.toLowerCase().includes(query) || 
        t.category.toLowerCase().includes(query) ||
        t.description?.toLowerCase().includes(query)
      );
    }

    if (this.selectedCategory) {
      filtered = filtered.filter(t => t.category === this.selectedCategory);
    }

    this.filteredTests.set(filtered);
  }

  isTestSelected(id: string): boolean {
    return this.selectedTests().some(t => t.id === id);
  }

  isPackageSelected(id: string): boolean {
    return this.selectedPackages().some(p => p.id === id);
  }

  toggleTest(test: Test): void {
    const current = this.selectedTests();
    const exists = current.find(t => t.id === test.id);

    if (exists) {
      this.selectedTests.set(current.filter(t => t.id !== test.id));
    } else {
      this.selectedTests.set([...current, { id: test.id, name: test.name, price: test.effective_price }]);
    }
  }

  togglePackage(pkg: Package): void {
    const current = this.selectedPackages();
    const exists = current.find(p => p.id === pkg.id);

    if (exists) {
      this.selectedPackages.set(current.filter(p => p.id !== pkg.id));
    } else {
      this.selectedPackages.set([...current, { id: pkg.id, name: pkg.name, price: Number(pkg.discounted_price) }]);
    }
  }

  removeTest(id: string): void {
    this.selectedTests.update(list => list.filter(t => t.id !== id));
  }

  removePackage(id: string): void {
    this.selectedPackages.update(list => list.filter(p => p.id !== id));
  }

  clearSelection(): void {
    this.selectedTests.set([]);
    this.selectedPackages.set([]);
  }

  getSavingsPercent(pkg: Package): number {
    const original = Number(pkg.original_price);
    const discounted = Number(pkg.discounted_price);
    if (original <= 0 || original <= discounted) return 0;
    return Math.round(((original - discounted) / original) * 100);
  }

  onNext(): void {
    this.store.patch({
      selectedTests: this.selectedTests(),
      selectedPackages: this.selectedPackages()
    });
    this.next.emit();
  }
}
