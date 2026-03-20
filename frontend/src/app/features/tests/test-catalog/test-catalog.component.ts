import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatChipsModule } from '@angular/material/chips';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { TestApiService } from '../../../core/api/services/test-api.service';
import { Test } from '../../../core/api/api.types';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner.component';
import { ErrorBannerComponent } from '../../../shared/components/error-banner.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state.component';
import { PaginationComponent } from '../../../shared/components/pagination.component';

const CATEGORIES = ['Blood', 'Urine', 'Imaging', 'Pathology', 'Cardiology', 'Other'];

@Component({
  selector: 'app-test-catalog',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatFormFieldModule, MatInputModule, MatChipsModule, MatCardModule, MatButtonModule,
    LoadingSpinnerComponent, ErrorBannerComponent, EmptyStateComponent, PaginationComponent,
  ],
  template: `
    <div class="container">
      <h2>Test Catalog</h2>

      <mat-form-field appearance="outline" class="search-field">
        <mat-label>Search tests</mat-label>
        <input matInput [formControl]="searchCtrl" placeholder="e.g. CBC, Thyroid..." />
      </mat-form-field>

      <div class="categories">
        <mat-chip-listbox>
          <mat-chip-option *ngFor="let cat of categories"
            [selected]="selectedCategory() === cat"
            (click)="selectCategory(cat)">
            {{ cat }}
          </mat-chip-option>
          <mat-chip-option [selected]="!selectedCategory()" (click)="selectCategory(null)">All</mat-chip-option>
        </mat-chip-listbox>
      </div>

      <app-loading-spinner *ngIf="loading()" />
      <app-error-banner *ngIf="error()" [message]="error()!" [retryLabel]="'Retry'" (retry)="load()" />
      <app-empty-state *ngIf="!loading() && tests().length === 0" message="No tests found." />

      <div class="grid">
        <mat-card *ngFor="let t of tests()" class="test-card">
          <mat-card-header>
            <mat-card-title>{{ t.name }}</mat-card-title>
            <mat-card-subtitle>{{ t.category }}</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <p *ngIf="t.description">{{ t.description }}</p>
            <p>Turnaround: {{ t.turnaround_hours }}h</p>
            <div class="price">
              <span *ngIf="t.discount_percent > 0" class="original">₹{{ t.price }}</span>
              <span class="effective">₹{{ t.effective_price }}</span>
              <span *ngIf="t.discount_percent > 0" class="discount">{{ t.discount_percent }}% off</span>
            </div>
          </mat-card-content>
        </mat-card>
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
    .container { max-width: 900px; margin: 2rem auto; padding: 1rem; display: flex; flex-direction: column; gap: 1rem; }
    .search-field { width: 100%; }
    .categories { display: flex; flex-wrap: wrap; gap: 0.5rem; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 1rem; }
    .price { display: flex; align-items: center; gap: 0.5rem; margin-top: 0.5rem; }
    .original { text-decoration: line-through; color: #999; }
    .effective { font-weight: bold; font-size: 1.1rem; }
    .discount { color: green; font-size: 0.85rem; }
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

  constructor(private testApi: TestApiService) {}

  ngOnInit(): void {
    this.load();
    this.searchCtrl.valueChanges.pipe(debounceTime(300), distinctUntilChanged()).subscribe(() => {
      this.page.set(1);
      this.load();
    });
  }

  selectCategory(cat: string | null): void {
    this.selectedCategory.set(cat);
    this.page.set(1);
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.testApi.list({
      q: this.searchCtrl.value ?? undefined,
      category: this.selectedCategory() ?? undefined,
      page: this.page(),
      page_size: this.pageSize,
    }).subscribe({
      next: (res) => { this.tests.set(res.items); this.total.set(res.total); this.loading.set(false); },
      error: () => { this.error.set('Failed to load tests.'); this.loading.set(false); },
    });
  }

  onPageChange(p: number): void { this.page.set(p); this.load(); }
}
