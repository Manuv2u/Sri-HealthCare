import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { AdminApiService } from '../../../core/api/services/admin-api.service';
import { Technician } from '../../../core/api/api.types';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner.component';
import { ErrorBannerComponent } from '../../../shared/components/error-banner.component';

@Component({
  selector: 'app-admin-technicians',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, LoadingSpinnerComponent, ErrorBannerComponent],
  template: `
    <div class="admin-page">
      <div class="page-header">
        <div>
          <h2>Technicians</h2>
          <p>Manage field technicians for sample collection</p>
        </div>
        <button class="btn-primary" (click)="startCreate()">
          <mat-icon>add</mat-icon> Add Technician
        </button>
      </div>

      @if (loading()) { <app-loading-spinner /> }
      @else if (error()) { <app-error-banner [message]="error()!" retryLabel="Retry" (retry)="load()" /> }
      @else {
        @if (editMode()) {
          <div class="form-panel">
            <h3>{{ form().id ? 'Edit Technician' : 'New Technician' }}</h3>
            <div class="form-grid">
              <div class="field">
                <label>Full Name *</label>
                <input [(ngModel)]="form().name" placeholder="e.g. Ravi Kumar" />
              </div>
              <div class="field">
                <label>Phone *</label>
                <input [(ngModel)]="form().phone" placeholder="10-digit mobile" />
              </div>
              <div class="field">
                <label>Email</label>
                <input [(ngModel)]="form().email" placeholder="ravi@sri.local" />
              </div>
            </div>
            <div class="form-actions">
              <button class="btn-ghost" (click)="cancelEdit()">Cancel</button>
              <button class="btn-primary" (click)="save()" [disabled]="saving()">
                {{ saving() ? 'Saving…' : 'Save' }}
              </button>
            </div>
          </div>
        }

        <div class="table-card">
          <table class="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>Email</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              @if (technicians().length === 0) {
                <tr><td colspan="5" class="empty-row">No technicians yet. Add one to get started.</td></tr>
              }
              @for (t of technicians(); track t.id) {
                <tr>
                  <td><span class="fw-600">{{ t.name }}</span></td>
                  <td>{{ t.phone }}</td>
                  <td>{{ t.email || '—' }}</td>
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
      h3 { font-size: 1rem; font-weight: 700; margin: 0 0 1.25rem; }
    }
    .form-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1rem; }
    .field {
      display: flex; flex-direction: column; gap: .35rem;
      label { font-size: .8rem; font-weight: 600; color: #4a5568; }
      input {
        border: 1px solid #e2e8f0; border-radius: 8px; padding: .5rem .75rem;
        font-size: .875rem; color: #2d3748;
        &:focus { outline: none; border-color: #00796b; box-shadow: 0 0 0 3px rgba(0,121,107,.1); }
      }
    }
    .form-actions { display: flex; gap: .75rem; justify-content: flex-end; margin-top: 1.25rem; }
    .table-card { background: #fff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; }
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
    .badge {
      display: inline-flex; padding: .2rem .6rem; border-radius: 999px; font-size: .75rem; font-weight: 600;
      &.badge-success { background: #c6f6d5; color: #276749; }
      &.badge-danger  { background: #fed7d7; color: #9b2c2c; }
    }
    .row-actions { display: flex; gap: .25rem; }
    .action-btn {
      background: none; border: none; cursor: pointer; padding: .3rem; border-radius: 6px;
      display: inline-flex; align-items: center; color: #718096;
      mat-icon { font-size: 1.1rem; width: 1.1rem; height: 1.1rem; }
      &:hover { background: #f0f4f8; color: #2d3748; }
      &.danger:hover { background: #fed7d7; color: #e53e3e; }
    }
  `],
})
export class AdminTechniciansComponent implements OnInit {
  loading = signal(false);
  saving = signal(false);
  error = signal<string | null>(null);
  technicians = signal<Technician[]>([]);
  editMode = signal(false);
  form = signal<any>({});

  constructor(private adminApi: AdminApiService) {}

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.adminApi.getTechnicians().subscribe({
      next: (res: any) => { this.technicians.set(res.items ?? res); this.loading.set(false); },
      error: (err: any) => { this.error.set(err.error?.message || 'Failed to load'); this.loading.set(false); },
    });
  }

  startCreate() { this.form.set({ name: '', phone: '', email: '' }); this.editMode.set(true); }
  startEdit(t: Technician) { this.form.set({ ...t }); this.editMode.set(true); }
  cancelEdit() { this.editMode.set(false); this.form.set({}); }

  save() {
    const f = this.form();
    if (!f.name || !f.phone) return;
    this.saving.set(true);
    const obs = f.id ? this.adminApi.updateTechnician(f.id, f) : this.adminApi.createTechnician(f);
    obs.subscribe({
      next: () => { this.saving.set(false); this.cancelEdit(); this.load(); },
      error: (err: any) => { this.error.set(err.error?.message || 'Failed to save'); this.saving.set(false); },
    });
  }

  remove(t: Technician) {
    if (!confirm(`Delete technician "${t.name}"?`)) return;
    this.adminApi.deleteTechnician(t.id).subscribe({
      next: () => this.load(),
      error: (err: any) => this.error.set(err.error?.message || 'Failed to delete'),
    });
  }
}
