import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { PackageApiService } from '../../../core/api/services/package-api.service';
import { Package } from '../../../core/api/api.types';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner.component';
import { ErrorBannerComponent } from '../../../shared/components/error-banner.component';

@Component({
  selector: 'app-admin-packages',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, LoadingSpinnerComponent, ErrorBannerComponent],
  template: `
    <div class="admin-page">
      <div class="page-header">
        <div>
          <h2>Packages</h2>
          <p>Manage health check packages and bundled tests</p>
        </div>
        <button class="btn-primary" (click)="startCreate()">
          <mat-icon>add</mat-icon> Add Package
        </button>
      </div>

      @if (loading()) { <app-loading-spinner /> }
      @else if (error()) { <app-error-banner [message]="error()!" retryLabel="Retry" (retry)="load()" /> }
      @else {
        @if (editMode()) {
          <div class="form-panel">
            <h3>{{ form().id ? 'Edit Package' : 'New Package' }}</h3>
            <div class="form-grid">
              <div class="field">
                <label>Package Name *</label>
                <input [(ngModel)]="form().name" placeholder="e.g. Full Body Checkup" />
              </div>
              <div class="field">
                <label>Original Price (₹) *</label>
                <input type="number" [(ngModel)]="form().original_price" placeholder="999" />
              </div>
              <div class="field">
                <label>Discounted Price (₹) *</label>
                <input type="number" [(ngModel)]="form().discounted_price" placeholder="799" />
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
                <textarea [(ngModel)]="form().description" rows="2" placeholder="What's included…"></textarea>
              </div>
            </div>
            <div class="form-actions">
              <button class="btn-ghost" (click)="cancelEdit()">Cancel</button>
              <button class="btn-primary" (click)="save()" [disabled]="saving()">
                {{ saving() ? 'Saving…' : 'Save Package' }}
              </button>
            </div>
          </div>
        }

        <div class="packages-grid">
          @if (packages().length === 0) {
            <div class="empty-state">
              <mat-icon>inventory_2</mat-icon>
              <p>No packages yet. Create one to get started.</p>
              <button class="btn-primary" (click)="startCreate()">Add Package</button>
            </div>
          }
          @for (pkg of packages(); track pkg.id) {
            <div class="pkg-card" [class.inactive]="!pkg.is_active">
              <div class="pkg-header">
                <span class="pkg-name">{{ pkg.name }}</span>
                <span class="badge" [class]="pkg.is_active ? 'badge-success' : 'badge-danger'">
                  {{ pkg.is_active ? 'Active' : 'Inactive' }}
                </span>
              </div>
              @if (pkg.description) {
                <p class="pkg-desc">{{ pkg.description }}</p>
              }
              <div class="pkg-price">
                <span class="price-main">₹{{ pkg.discounted_price }}</span>
                @if (pkg.original_price > pkg.discounted_price) {
                  <span class="discount-badge" style="text-decoration:line-through;font-size:.8rem;color:#718096">₹{{ pkg.original_price }}</span>
                }
              </div>
              @if (pkg.tests?.length) {
                <div class="pkg-tests">
                  <span class="tests-label">{{ pkg.tests.length }} tests included</span>
                </div>
              }
              <div class="pkg-actions">
                <button class="action-btn" (click)="startEdit(pkg)"><mat-icon>edit</mat-icon> Edit</button>
                <button class="action-btn" (click)="toggleActive(pkg)">
                  <mat-icon>{{ pkg.is_active ? 'visibility_off' : 'visibility' }}</mat-icon>
                  {{ pkg.is_active ? 'Disable' : 'Enable' }}
                </button>
                <button class="action-btn danger" (click)="remove(pkg)"><mat-icon>delete</mat-icon></button>
              </div>
            </div>
          }
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
      h3 { font-size: 1rem; font-weight: 700; margin: 0 0 1.25rem; }
    }
    .form-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1rem; }
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
    .form-actions { display: flex; gap: .75rem; justify-content: flex-end; margin-top: 1.25rem; }

    .packages-grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem;
    }
    .pkg-card {
      background: #fff; border-radius: 12px; padding: 1.25rem;
      border: 1px solid #e2e8f0; display: flex; flex-direction: column; gap: .75rem;
      &.inactive { opacity: .65; }
    }
    .pkg-header { display: flex; justify-content: space-between; align-items: flex-start; gap: .5rem; }
    .pkg-name { font-size: 1rem; font-weight: 700; color: #1a202c; }
    .pkg-desc { font-size: .85rem; color: #718096; margin: 0; }
    .pkg-price { display: flex; align-items: center; gap: .5rem; }
    .price-main { font-size: 1.4rem; font-weight: 700; color: #00796b; }
    .discount-badge {
      background: #c6f6d5; color: #276749; font-size: .75rem; font-weight: 600;
      padding: .15rem .5rem; border-radius: 999px;
    }
    .pkg-tests { font-size: .8rem; color: #718096; }
    .tests-label { background: #f0f4f8; padding: .2rem .6rem; border-radius: 6px; }
    .pkg-actions { display: flex; gap: .5rem; flex-wrap: wrap; margin-top: .25rem; }
    .action-btn {
      display: inline-flex; align-items: center; gap: .3rem;
      background: none; border: 1px solid #e2e8f0; border-radius: 7px;
      padding: .3rem .65rem; font-size: .8rem; cursor: pointer; color: #4a5568;
      mat-icon { font-size: .95rem; width: .95rem; height: .95rem; }
      &:hover { background: #f7fafc; border-color: #cbd5e0; }
      &.danger { color: #e53e3e; &:hover { background: #fed7d7; border-color: #fc8181; } }
    }
    .badge {
      display: inline-flex; padding: .2rem .6rem; border-radius: 999px; font-size: .75rem; font-weight: 600;
      &.badge-success { background: #c6f6d5; color: #276749; }
      &.badge-danger  { background: #fed7d7; color: #9b2c2c; }
    }
    .empty-state {
      grid-column: 1 / -1; text-align: center; padding: 3rem;
      background: #fff; border-radius: 12px; border: 1px dashed #e2e8f0;
      display: flex; flex-direction: column; align-items: center; gap: 1rem;
      mat-icon { font-size: 3rem; width: 3rem; height: 3rem; color: #cbd5e0; }
      p { color: #718096; margin: 0; }
    }
  `],
})
export class AdminPackagesComponent implements OnInit {
  loading = signal(false);
  saving = signal(false);
  error = signal<string | null>(null);
  packages = signal<Package[]>([]);
  editMode = signal(false);
  form = signal<any>({});

  constructor(private pkgApi: PackageApiService) {}

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.pkgApi.list().subscribe({
      next: (res) => { this.packages.set(res.items); this.loading.set(false); },
      error: (err) => { this.error.set(err.error?.message || 'Failed to load'); this.loading.set(false); },
    });
  }

  startCreate() { this.form.set({ name: '', original_price: 0, discounted_price: 0, is_active: true, description: '', test_ids: [] }); this.editMode.set(true); }
  startEdit(p: Package) { this.form.set({ ...p }); this.editMode.set(true); }
  cancelEdit() { this.editMode.set(false); this.form.set({}); }

  save() {
    const f = this.form();
    if (!f.name || f.original_price == null) return;
    this.saving.set(true);
    const obs = f.id ? this.pkgApi.update(f.id, f) : this.pkgApi.create(f);
    obs.subscribe({
      next: () => { this.saving.set(false); this.cancelEdit(); this.load(); },
      error: (err: any) => { this.error.set(err.error?.message || 'Failed to save'); this.saving.set(false); },
    });
  }

  toggleActive(p: Package) {
    this.pkgApi.update(p.id, { is_active: !p.is_active }).subscribe({
      next: () => this.load(),
      error: (err: any) => this.error.set(err.error?.message || 'Failed to update'),
    });
  }

  remove(p: Package) {
    if (!confirm(`Delete package "${p.name}"?`)) return;
    this.pkgApi.delete(p.id).subscribe({
      next: () => this.load(),
      error: (err: any) => this.error.set(err.error?.message || 'Failed to delete'),
    });
  }
}
