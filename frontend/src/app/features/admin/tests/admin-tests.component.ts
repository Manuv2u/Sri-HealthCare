import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { TestApiService } from '../../../core/api/services/test-api.service';
import { Test } from '../../../core/api/api.types';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner.component';
import { ErrorBannerComponent } from '../../../shared/components/error-banner.component';

@Component({
  selector: 'app-admin-tests',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule, LoadingSpinnerComponent, ErrorBannerComponent],
  template: `
    <div class="admin-page">
      <!-- Header -->
      <div class="page-header">
        <div>
          <h2>Tests Catalog</h2>
          <p>Manage lab tests, pricing and availability</p>
        </div>
        <button class="btn-primary" (click)="startCreate()">
          <mat-icon>add</mat-icon> Add Test
        </button>
      </div>

      @if (loading()) { <app-loading-spinner /> }
      @else if (error()) { <app-error-banner [message]="error()!" retryLabel="Retry" (retry)="load()" /> }
      @else {
        <!-- Form panel -->
        @if (editMode()) {
          <div class="form-panel">
            <h3>{{ form().id ? 'Edit Test' : 'New Test' }}</h3>
            <div class="form-grid">
              <div class="field">
                <label>Test Name *</label>
                <input [(ngModel)]="form().name" placeholder="e.g. Complete Blood Count" />
              </div>
              <div class="field">
                <label>Category *</label>
                <input [(ngModel)]="form().category" placeholder="e.g. Haematology" />
              </div>
              <div class="field">
                <label>Price (₹) *</label>
                <input type="number" [(ngModel)]="form().price" placeholder="350" />
              </div>
              <div class="field">
                <label>Discount %</label>
                <input type="number" [(ngModel)]="form().discount_percentage" placeholder="0" />
              </div>
              <div class="field">
                <label>Turnaround (hours)</label>
                <input type="number" [(ngModel)]="form().turnaround_hours" placeholder="24" />
              </div>
              <div class="field">
                <label>Status</label>
                <select [(ngModel)]="form().is_active">
                  <option [ngValue]="true">Active</option>
                  <option [ngValue]="false">Inactive</option>
                </select>
              </div>
              <div class="field full">
                <label>Description</label>
                <textarea [(ngModel)]="form().description" rows="2" placeholder="Optional description"></textarea>
              </div>
            </div>
            <div class="form-actions">
              <button class="btn-ghost" (click)="cancelEdit()">Cancel</button>
              <button class="btn-primary" (click)="save()" [disabled]="saving()">
                {{ saving() ? 'Saving…' : 'Save Test' }}
              </button>
            </div>
          </div>
        }

        <!-- Table -->
        <div class="table-card">
          <div class="table-toolbar">
            <div class="search-wrap">
              <mat-icon>search</mat-icon>
              <input placeholder="Search tests…" [(ngModel)]="searchQ" (input)="onSearch()" />
            </div>
            <span class="count-badge">{{ tests().length }} tests</span>
          </div>
          <table class="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Category</th>
                <th>Price</th>
                <th>Discount</th>
                <th>TAT</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              @if (filtered().length === 0) {
                <tr><td colspan="7" class="empty-row">No tests found</td></tr>
              }
              @for (t of filtered(); track t.id) {
                <tr>
                  <td><span class="fw-600">{{ t.name }}</span></td>
                  <td><span class="badge badge-info">{{ t.category }}</span></td>
                  <td>
                    <div class="price-cell">
                      <span class="price-main">₹{{ t.price }}</span>
                      @if (t.discount_percent > 0) {
                        <span class="price-eff">₹{{ t.effective_price }}</span>
                      }
                    </div>
                  </td>
                  <td>{{ t.discount_percent > 0 ? t.discount_percent + '%' : '—' }}</td>
                  <td>{{ t.turnaround_hours }}h</td>
                  <td>
                    <span class="badge" [class]="t.is_active ? 'badge-success' : 'badge-danger'">
                      {{ t.is_active ? 'Active' : 'Inactive' }}
                    </span>
                  </td>
                  <td>
                    <div class="row-actions">
                      <button class="action-btn" (click)="startEdit(t)" title="Edit"><mat-icon>edit</mat-icon></button>
                      <button class="action-btn danger" (click)="remove(t)" title="Delete"><mat-icon>delete</mat-icon></button>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>
  `,
  styles: [`
    .admin-page { display: flex; flex-direction: column; gap: 1.25rem; }

    .page-header {
      display: flex; justify-content: space-between; align-items: flex-start;
      h2 { font-size: 1.25rem; font-weight: 700; color: #1a202c; margin: 0; }
      p  { font-size: .875rem; color: #718096; margin: .2rem 0 0; }
    }

    .btn-primary {
      display: inline-flex; align-items: center; gap: .4rem;
      background: #00796b; color: #fff; border: none; border-radius: 8px;
      padding: .55rem 1.1rem; font-size: .875rem; font-weight: 600; cursor: pointer;
      mat-icon { font-size: 1.1rem; width: 1.1rem; height: 1.1rem; }
      &:hover { background: #00695c; }
      &:disabled { opacity: .6; cursor: not-allowed; }
    }
    .btn-ghost {
      background: none; border: 1px solid #e2e8f0; border-radius: 8px;
      padding: .55rem 1.1rem; font-size: .875rem; cursor: pointer; color: #4a5568;
      &:hover { background: #f7fafc; }
    }

    .form-panel {
      background: #fff; border-radius: 12px; padding: 1.5rem;
      border: 1px solid #e2e8f0; box-shadow: 0 2px 8px rgba(0,0,0,.06);
      h3 { font-size: 1rem; font-weight: 700; margin: 0 0 1.25rem; color: #1a202c; }
    }
    .form-grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1rem;
    }
    .field {
      display: flex; flex-direction: column; gap: .35rem;
      &.full { grid-column: 1 / -1; }
      label { font-size: .8rem; font-weight: 600; color: #4a5568; }
      input, select, textarea {
        border: 1px solid #e2e8f0; border-radius: 8px; padding: .5rem .75rem;
        font-size: .875rem; color: #2d3748; background: #fff;
        &:focus { outline: none; border-color: #00796b; box-shadow: 0 0 0 3px rgba(0,121,107,.1); }
      }
      textarea { resize: vertical; font-family: inherit; }
    }
    .form-actions {
      display: flex; gap: .75rem; justify-content: flex-end; margin-top: 1.25rem;
    }

    .table-card {
      background: #fff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden;
    }
    .table-toolbar {
      display: flex; align-items: center; gap: 1rem; padding: .75rem 1rem;
      border-bottom: 1px solid #f0f4f8;
    }
    .search-wrap {
      display: flex; align-items: center; gap: .5rem; flex: 1;
      background: #f7fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: .4rem .75rem;
      mat-icon { color: #a0aec0; font-size: 1.1rem; width: 1.1rem; height: 1.1rem; }
      input { border: none; outline: none; background: transparent; font-size: .875rem; width: 100%; }
    }
    .count-badge {
      font-size: .8rem; color: #718096; font-weight: 500; white-space: nowrap;
    }
    .data-table {
      width: 100%; border-collapse: collapse;
      th {
        background: #f7fafc; padding: .7rem 1rem; text-align: left;
        font-size: .78rem; font-weight: 600; color: #718096; text-transform: uppercase;
        letter-spacing: .05em; border-bottom: 1px solid #e2e8f0;
      }
      td { padding: .8rem 1rem; border-bottom: 1px solid #f0f4f8; font-size: .875rem; color: #2d3748; }
      tr:last-child td { border-bottom: none; }
      tr:hover td { background: #f7fafc; }
    }
    .fw-600 { font-weight: 600; }
    .empty-row { text-align: center; color: #a0aec0; padding: 2rem !important; }

    .price-cell { display: flex; flex-direction: column; gap: .1rem; }
    .price-main { font-weight: 600; }
    .price-eff { font-size: .78rem; color: #38a169; }

    .badge {
      display: inline-flex; align-items: center; padding: .2rem .6rem;
      border-radius: 999px; font-size: .75rem; font-weight: 600;
      &.badge-success { background: #c6f6d5; color: #276749; }
      &.badge-danger  { background: #fed7d7; color: #9b2c2c; }
      &.badge-info    { background: #bee3f8; color: #2a4365; }
    }

    .row-actions { display: flex; gap: .25rem; }
    .action-btn {
      background: none; border: none; cursor: pointer; padding: .3rem; border-radius: 6px;
      display: inline-flex; align-items: center; color: #718096;
      mat-icon { font-size: 1.1rem; width: 1.1rem; height: 1.1rem; }
      &:hover { background: #f0f4f8; color: #2d3748; }
      &.danger { &:hover { background: #fed7d7; color: #e53e3e; } }
    }
  `],
})
export class AdminTestsComponent implements OnInit {
  loading = signal(false);
  saving = signal(false);
  error = signal<string | null>(null);
  tests = signal<Test[]>([]);
  filtered = signal<Test[]>([]);
  editMode = signal(false);
  form = signal<any>({});
  searchQ = '';

  constructor(private testApi: TestApiService) {}

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.error.set(null);
    this.testApi.list({ page_size: 1000 }).subscribe({
      next: (res) => {
        this.tests.set(res.items);
        this.applyFilter();
        this.loading.set(false);
      },
      error: (err) => { this.error.set(err.error?.message || 'Failed to load tests'); this.loading.set(false); },
    });
  }

  onSearch() { this.applyFilter(); }

  applyFilter() {
    const q = this.searchQ.toLowerCase();
    this.filtered.set(q ? this.tests().filter(t => t.name.toLowerCase().includes(q) || t.category.toLowerCase().includes(q)) : this.tests());
  }

  startCreate() {
    this.form.set({ name: '', category: '', price: 0, discount_percentage: 0, turnaround_hours: 24, is_active: true, description: '' });
    this.editMode.set(true);
  }

  startEdit(t: Test) {
    this.form.set({ ...t, discount_percentage: (t as any).discount_percent ?? 0 });
    this.editMode.set(true);
  }

  cancelEdit() { this.editMode.set(false); this.form.set({}); }

  save() {
    const f = this.form();
    if (!f.name || !f.category || f.price == null) return;
    this.saving.set(true);
    const obs = f.id ? this.testApi.update(f.id, f) : this.testApi.create(f);
    obs.subscribe({
      next: () => { this.saving.set(false); this.cancelEdit(); this.load(); },
      error: (err) => { this.error.set(err.error?.message || 'Failed to save'); this.saving.set(false); },
    });
  }

  remove(t: Test) {
    if (!confirm(`Delete "${t.name}"?`)) return;
    this.testApi.delete(t.id).subscribe({ next: () => this.load(), error: (err) => this.error.set(err.error?.message || 'Failed to delete') });
  }
}
