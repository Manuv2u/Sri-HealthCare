import { Component, inject, OnInit, output, signal, computed, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCardModule } from '@angular/material/card';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { TestApiService } from '../../../core/api/services/test-api.service';
import { BookingWizardStore } from '../../../core/store/booking-wizard.store';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner.component';
import { ErrorBannerComponent } from '../../../shared/components/error-banner.component';
import { Test } from '../../../core/api/api.types';

@Component({
  selector: 'app-test-selection-step',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatCardModule, FormsModule, LoadingSpinnerComponent, ErrorBannerComponent],
  template: `
    <div class="step-container">
      <h2>Select Tests</h2>

      <mat-form-field appearance="outline" class="search-field">
        <mat-label>Search tests</mat-label>
        <input matInput [(ngModel)]="searchQuery" (ngModelChange)="onSearch($event)" placeholder="e.g. CBC, Thyroid..." />
      </mat-form-field>

      @if (loading()) {
        <app-loading-spinner />
      } @else if (error()) {
        <app-error-banner [message]="error()!" retryLabel="Retry" (retry)="search(searchQuery)" />
      } @else {
        <div class="test-list">
          @for (test of results(); track test.id) {
            <mat-card class="test-card">
              <mat-card-content>
                <div class="test-info">
                  <span class="test-name">{{ test.name }}</span>
                  <span class="test-price">₹{{ test.effective_price }}</span>
                </div>
                <button mat-stroked-button color="primary"
                  [disabled]="isSelected(test.id)"
                  (click)="addTest(test)">
                  {{ isSelected(test.id) ? 'Added' : 'Add' }}
                </button>
              </mat-card-content>
            </mat-card>
          }
        </div>
      }

      @if (selectedTests().length > 0) {
        <div class="selected-section">
          <h3>Selected ({{ selectedTests().length }})</h3>
          @for (t of selectedTests(); track t.id) {
            <div class="selected-item">
              <span>{{ t.name }}</span>
              <span>₹{{ t.price }}</span>
              <button mat-icon-button (click)="removeTest(t.id)">✕</button>
            </div>
          }
          <div class="total">Total: ₹{{ total() }}</div>
        </div>
      }

      <div class="actions">
        <button mat-stroked-button (click)="back.emit()">Back</button>
        <button mat-flat-button color="primary" [disabled]="selectedTests().length === 0" (click)="onNext()">
          Next
        </button>
      </div>
    </div>
  `,
  styles: [`
    .step-container { padding: 1rem; }
    .search-field { width: 100%; }
    .test-list { display: flex; flex-direction: column; gap: 0.5rem; margin: 1rem 0; }
    .test-card mat-card-content { display: flex; align-items: center; justify-content: space-between; padding: 0.5rem; }
    .test-info { display: flex; flex-direction: column; }
    .test-name { font-weight: 500; }
    .test-price { color: #666; font-size: 0.875rem; }
    .selected-section { border-top: 1px solid #eee; padding-top: 1rem; margin-top: 1rem; }
    .selected-item { display: flex; align-items: center; justify-content: space-between; padding: 0.25rem 0; }
    .total { font-weight: 600; margin-top: 0.5rem; }
    .actions { display: flex; gap: 1rem; margin-top: 1.5rem; }
  `],
})
export class TestSelectionStepComponent implements OnInit, OnDestroy {
  next = output<void>();
  back = output<void>();

  private testApi = inject(TestApiService);
  readonly store = inject(BookingWizardStore);

  loading = signal(false);
  error = signal<string | null>(null);
  results = signal<Test[]>([]);
  searchQuery = '';

  selectedTests = this.store.selectedTests;
  total = computed(() => this.selectedTests().reduce((sum: number, t: { id: string; name: string; price: number }) => sum + t.price, 0));

  private search$ = new Subject<string>();
  private sub = this.search$.pipe(
    debounceTime(300),
    distinctUntilChanged(),
    switchMap((q: string) => {
      this.loading.set(true);
      this.error.set(null);
      return this.testApi.list({ q, page_size: 20 });
    }),
  ).subscribe({
    next: (res: { items: Test[] }) => {
      this.results.set(res.items);
      this.loading.set(false);
    },
    error: () => {
      this.error.set('Failed to load tests.');
      this.loading.set(false);
    },
  });

  ngOnInit(): void {
    this.search('');
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }

  onSearch(q: string): void {
    this.search$.next(q);
  }

  search(q: string): void {
    this.search$.next(q);
  }

  isSelected(id: string): boolean {
    return this.selectedTests().some((t) => t.id === id);
  }

  addTest(test: Test): void {
    if (!this.isSelected(test.id)) {
      (this.store as any).patchState({
        selectedTests: [...this.selectedTests(), { id: test.id, name: test.name, price: test.effective_price }],
      });
    }
  }

  removeTest(id: string): void {
    (this.store as any).patchState({
      selectedTests: this.selectedTests().filter((t: { id: string; name: string; price: number }) => t.id !== id),
    });
  }

  onNext(): void {
    this.next.emit();
  }
}
