import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { TestApiService } from '../../../core/api/services/test-api.service';
import { Test } from '../../../core/api/api.types';

@Component({
  selector: 'app-admin-tests',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  template: `
    <div class="admin-page">
      <div class="page-header">
        <div>
          <h2>Tests Catalog</h2>
          <p>Manage lab tests, pricing and availability</p>
        </div>
        <button class="btn-primary" (click)="startCreate()">
          <mat-icon>add</mat-icon> Add Test
        </button>
      </div>

      @if (error()) {
        <div class="alert-error"><mat-icon>error_outline</mat-icon> {{ error() }}</div>
      }

      <!-- Form panel -->
      @if (editMode()) {
        <div class="form-panel">
          <h3>{{ editId() ? 'Edit Test' : 'New Test' }}</h3>
          <div class="form-grid">
            <div class="field">
              <label>Test Name *</label>
              <input [(ngModel)]="fname" placeholder="e.g. Complete Blood Count" />
            </div>
            <div class="field">
              <label>Category *</label>
              <input [(ngModel)]="fcategory" placeholder="e.g. Haematology" />
            </div>
            <div class="field">
              <label>Price (₹) *</label>
              <input type="number" [(ngModel)]="fprice" placeholder="350" min="0" />
            </div>
            <div class="field">
              <label>Discount %</label>
              <input type="number" [(ngModel)]="fdiscount" placeholder="0" min="0" max="100" />
            </div>
            <div class="field">
              <label>Turnaround (hours) *</label>
              <input type="number" [(ngModel)]="ftat" placeholder="24" min="1" />
            </div>
            <div class="field">
              <label>Status</label>
              <select [(ngModel)]="factive">
                <option [ngValue]="true">Active</option>
                <option [ngValue]="false">Inactive</option>
              </select>
            </div>
            <div class="field full">
              <label>Description</label>
              <textarea [(ngModel)]="fdesc" rows="2" placeholder="Optional description"></textarea>
            </div>
          </div>
          @if (formError()) {
            <div class="alert-error small"><mat-icon>error_outline</mat-icon> {{ formError() }}</div>
          }
          <div class="form-actions">
            <button class="btn-ghost" (click)="cancelEdit()">Cancel</button>
            <button class="btn-primary" (click)="save()" [disabled]="saving()">
              @if (saving()) { <span class="spinner"></span> Saving… }
              @else { <mat-icon>save</mat-icon> {{ editId() ? 'Update Test' : 'Create Test' }} }
            </button>
          </div>
        </div>
      }

      <!-- Table -->
      <div class="table-card">
        <div class="table-toolbar">
          <div class="search-wrap">
            <mat-icon>search</mat-icon>
            <input placeholder="Search tests…" [(ngModel)]="searchQ" (input)="applyFilter()" />
          </div>
          <span class="count-badge">{{ filtered().length }} tests</span>
        </div>

        @if (loading()) {
          <div class="loading-rows">
            @for (i of [1,2,3,4]; track i) { <div class="skeleton-row"></div> }
          </div>
        } @else {
          <table class="data-table">
            <thead>
              <tr>
                <th>Name</th><th>Category</th><th>Price</th><th>Discount</th><th>TAT</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              @if (filtered().length === 0) {
                <tr><td colspan="7" class="empty-row">No tests found. Click "Add Test" to create one.</td></tr>
              }
              @for (t of filtered(); track t.id) {
                <tr>
                  <td><span class="fw-600">{{ t.name }}</span></td>
                  <td><span class="badge badge-info">{{ t.category }}</span></td>
                  <td>
                    <div class="price-cell">
                      <span class="price-main">₹{{ t.price }}</span>
                      @if (t.discount_percentage > 0) {
                        <span class="price-eff">₹{{ t.effective_price }} effective</span>
                      }
                    </div>
                  </td>
                  <td>{{ t.discount_percentage > 0 ? t.discount_percentage + '%' : '—' }}</td>
                  <td>{{ t.turnaround_hours }}h</td>
                  <td>
                    <span class="badge" [class]="t.is_active ? 'badge-success' : 'badge-muted'">
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
        }
      </div>
    </div>
  `,
  styles: [`
    .admin-page { display:flex; flex-direction:column; gap:1.25rem; }
    .page-header { display:flex; justify-content:space-between; align-items:flex-start;
      h2 { font-size:1.25rem; font-weight:700; color:#1a202c; margin:0; }
      p  { font-size:.875rem; color:#718096; margin:.2rem 0 0; }
    }
    .btn-primary {
      display:inline-flex; align-items:center; gap:.4rem;
      background:#00796b; color:#fff; border:none; border-radius:8px;
      padding:.55rem 1.1rem; font-size:.875rem; font-weight:600; cursor:pointer;
      mat-icon { font-size:1.1rem; width:1.1rem; height:1.1rem; }
      &:hover { background:#00695c; }
      &:disabled { opacity:.6; cursor:not-allowed; }
    }
    .btn-ghost {
      background:none; border:1px solid #e2e8f0; border-radius:8px;
      padding:.55rem 1.1rem; font-size:.875rem; cursor:pointer; color:#4a5568;
      &:hover { background:#f7fafc; }
    }
    .alert-error {
      display:flex; align-items:center; gap:.5rem; padding:.75rem 1rem;
      border-radius:8px; background:#fed7d7; color:#9b2c2c; font-size:.875rem;
      mat-icon { font-size:1.1rem; width:1.1rem; height:1.1rem; flex-shrink:0; }
      &.small { padding:.5rem .75rem; font-size:.8rem; margin-top:.75rem; }
    }
    .form-panel {
      background:#fff; border-radius:12px; padding:1.5rem;
      border:1px solid #e2e8f0; box-shadow:0 2px 8px rgba(0,0,0,.06);
      h3 { font-size:1rem; font-weight:700; margin:0 0 1.25rem; color:#1a202c; }
    }
    .form-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(200px,1fr)); gap:1rem; }
    .field {
      display:flex; flex-direction:column; gap:.35rem;
      &.full { grid-column:1/-1; }
      label { font-size:.8rem; font-weight:600; color:#4a5568; }
      input, select, textarea {
        border:1px solid #e2e8f0; border-radius:8px; padding:.5rem .75rem;
        font-size:.875rem; color:#2d3748; background:#fff;
        &:focus { outline:none; border-color:#00796b; box-shadow:0 0 0 3px rgba(0,121,107,.1); }
      }
      textarea { resize:vertical; font-family:inherit; }
    }
    .form-actions { display:flex; gap:.75rem; justify-content:flex-end; margin-top:1.25rem; }
    .spinner { width:14px; height:14px; border:2px solid rgba(255,255,255,.4); border-top-color:#fff; border-radius:50%; animation:spin .7s linear infinite; display:inline-block; }
    @keyframes spin { to { transform:rotate(360deg); } }
    .table-card { background:#fff; border-radius:12px; border:1px solid #e2e8f0; overflow:hidden; }
    .table-toolbar { display:flex; align-items:center; gap:1rem; padding:.75rem 1rem; border-bottom:1px solid #f0f4f8; }
    .search-wrap {
      display:flex; align-items:center; gap:.5rem; flex:1;
      background:#f7fafc; border:1px solid #e2e8f0; border-radius:8px; padding:.4rem .75rem;
      mat-icon { color:#a0aec0; font-size:1.1rem; width:1.1rem; height:1.1rem; }
      input { border:none; outline:none; background:transparent; font-size:.875rem; width:100%; }
    }
    .count-badge { font-size:.8rem; color:#718096; font-weight:500; white-space:nowrap; }
    .loading-rows { padding:1rem; display:flex; flex-direction:column; gap:.5rem; }
    .skeleton-row { height:44px; background:linear-gradient(90deg,#f0f4f8 25%,#e2e8f0 50%,#f0f4f8 75%); background-size:200% 100%; border-radius:8px; animation:shimmer 1.5s infinite; }
    @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
    .data-table {
      width:100%; border-collapse:collapse;
      th { background:#f7fafc; padding:.7rem 1rem; text-align:left; font-size:.78rem; font-weight:600; color:#718096; text-transform:uppercase; letter-spacing:.05em; border-bottom:1px solid #e2e8f0; }
      td { padding:.8rem 1rem; border-bottom:1px solid #f0f4f8; font-size:.875rem; color:#2d3748; }
      tr:last-child td { border-bottom:none; }
      tr:hover td { background:#f7fafc; }
    }
    .fw-600 { font-weight:600; }
    .empty-row { text-align:center; color:#a0aec0; padding:2.5rem !important; font-size:.9rem; }
    .price-cell { display:flex; flex-direction:column; gap:.1rem; }
    .price-main { font-weight:600; }
    .price-eff { font-size:.75rem; color:#38a169; }
    .badge { display:inline-flex; align-items:center; padding:.2rem .6rem; border-radius:999px; font-size:.75rem; font-weight:600;
      &.badge-success { background:#c6f6d5; color:#276749; }
      &.badge-muted   { background:#f0f4f8; color:#718096; }
      &.badge-info    { background:#bee3f8; color:#2a4365; }
    }
    .row-actions { display:flex; gap:.25rem; }
    .action-btn {
      background:none; border:none; cursor:pointer; padding:.3rem; border-radius:6px;
      display:inline-flex; align-items:center; color:#718096;
      mat-icon { font-size:1.1rem; width:1.1rem; height:1.1rem; }
      &:hover { background:#f0f4f8; color:#2d3748; }
      &.danger:hover { background:#fed7d7; color:#e53e3e; }
    }
  `],
})
export class AdminTestsComponent implements OnInit {
  loading = signal(false);
  saving = signal(false);
  error = signal<string | null>(null);
  formError = signal<string | null>(null);
  tests = signal<Test[]>([]);
  filtered = signal<Test[]>([]);
  editMode = signal(false);
  editId = signal<string | null>(null);
  searchQ = '';

  // flat form fields — avoids ngModel + signal object mutation issues
  fname = '';
  fcategory = '';
  fprice: number = 0;
  fdiscount: number = 0;
  ftat: number = 24;
  factive: boolean = true;
  fdesc = '';

  constructor(private testApi: TestApiService) {}

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.error.set(null);
    this.testApi.list({ page_size: 500 }).subscribe({
      next: (res) => { this.tests.set(res.items); this.applyFilter(); this.loading.set(false); },
      error: (err) => { this.error.set(err.error?.detail?.message || err.error?.message || 'Failed to load tests'); this.loading.set(false); },
    });
  }

  applyFilter() {
    const q = this.searchQ.toLowerCase();
    this.filtered.set(q ? this.tests().filter(t => t.name.toLowerCase().includes(q) || t.category.toLowerCase().includes(q)) : [...this.tests()]);
  }

  startCreate() {
    this.editId.set(null);
    this.fname = ''; this.fcategory = ''; this.fprice = 0;
    this.fdiscount = 0; this.ftat = 24; this.factive = true; this.fdesc = '';
    this.formError.set(null);
    this.editMode.set(true);
  }

  startEdit(t: Test) {
    this.editId.set(t.id);
    this.fname = t.name; this.fcategory = t.category; this.fprice = t.price;
    this.fdiscount = t.discount_percentage; this.ftat = t.turnaround_hours;
    this.factive = t.is_active; this.fdesc = t.description ?? '';
    this.formError.set(null);
    this.editMode.set(true);
  }

  cancelEdit() { this.editMode.set(false); this.editId.set(null); this.formError.set(null); }

  save() {
    this.formError.set(null);
    if (!this.fname.trim()) { this.formError.set('Test name is required.'); return; }
    if (!this.fcategory.trim()) { this.formError.set('Category is required.'); return; }
    if (this.fprice == null || this.fprice < 0) { this.formError.set('Valid price is required.'); return; }
    if (!this.ftat || this.ftat < 1) { this.formError.set('Turnaround hours must be at least 1.'); return; }

    this.saving.set(true);
    const payload: any = {
      name: this.fname.trim(),
      category: this.fcategory.trim(),
      description: this.fdesc.trim() || null,
      price: Number(this.fprice),
      discount_percentage: Number(this.fdiscount) || 0,
      turnaround_hours: Number(this.ftat),
    };

    const id = this.editId();
    const obs = id
      ? this.testApi.update(id, { ...payload, is_active: this.factive })
      : this.testApi.create(payload);

    obs.subscribe({
      next: () => { this.saving.set(false); this.cancelEdit(); this.load(); },
      error: (err) => {
        const msg = err.error?.detail?.message || err.error?.detail || err.error?.message || 'Failed to save test.';
        this.formError.set(typeof msg === 'string' ? msg : JSON.stringify(msg));
        this.saving.set(false);
      },
    });
  }

  remove(t: Test) {
    if (!confirm(`Delete "${t.name}"? This cannot be undone.`)) return;
    this.testApi.delete(t.id).subscribe({
      next: () => this.load(),
      error: (err) => this.error.set(err.error?.detail?.message || 'Failed to delete'),
    });
  }
}
