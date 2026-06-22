import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AdminApiService } from '../../../core/api/services/admin-api.service';
import { Technician } from '../../../core/api/api.types';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner.component';
import { ErrorBannerComponent } from '../../../shared/components/error-banner.component';

@Component({
  selector: 'app-admin-technicians',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatSnackBarModule, LoadingSpinnerComponent, ErrorBannerComponent],
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

      @if (formMode()) {
        <div class="form-panel">
          <h3>{{ editId() ? 'Edit Technician' : 'Create Technician Account' }}</h3>

          @if (formError()) {
            <div class="alert-error">
              <mat-icon>error_outline</mat-icon>
              <span>{{ formError() }}</span>
            </div>
          }

          <div class="form-grid">
            <div class="field">
              <label>Full Name *</label>
              <input [(ngModel)]="form.name" placeholder="e.g. Ravi Kumar" />
            </div>
            <div class="field">
              <label>Phone Number *</label>
              <input [(ngModel)]="form.phone" placeholder="10-digit mobile" maxlength="10" />
            </div>
            <div class="field">
              <label>Email Address *</label>
              <input [(ngModel)]="form.email" type="email" placeholder="ravi@srilab.in" />
            </div>
            <div class="field">
              <label>Role</label>
              <select [(ngModel)]="form.role" disabled>
                <option value="technician">Technician</option>
              </select>
            </div>
            @if (!editId()) {
              <div class="field">
                <label>Temporary Password *</label>
                <div class="password-input">
                  <input [(ngModel)]="form.password" [type]="showPwd() ? 'text' : 'password'"
                         placeholder="Set initial password" autocomplete="new-password" />
                  <button type="button" class="pwd-toggle" (click)="showPwd.set(!showPwd())">
                    <mat-icon>{{ showPwd() ? 'visibility_off' : 'visibility' }}</mat-icon>
                  </button>
                </div>
                <span class="field-hint">Technician must change this on first login</span>
              </div>
            }
          </div>

          <div class="form-actions">
            <button class="btn-ghost" (click)="cancelEdit()">Cancel</button>
            <button class="btn-primary" (click)="save()" [disabled]="saving()">
              {{ saving() ? 'Saving…' : (editId() ? 'Update' : 'Create Account') }}
            </button>
          </div>
        </div>
      }

      @if (loading()) { <app-loading-spinner /> }
      @else if (error()) { <app-error-banner [message]="error()!" retryLabel="Retry" (retry)="load()" /> }
      @else {
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
    .alert-error {
      display: flex; align-items: center; gap: .5rem;
      padding: .75rem 1rem; border-radius: 8px; background: #fed7d7; color: #9b2c2c;
      font-size: .875rem; margin-bottom: 1rem;
      mat-icon { font-size: 1.1rem; width: 1.1rem; height: 1.1rem; }
    }
    .form-panel {
      background: #fff; border-radius: 12px; padding: 1.5rem;
      border: 1px solid #e2e8f0; box-shadow: 0 2px 8px rgba(0,0,0,.06);
      h3 { font-size: 1rem; font-weight: 700; margin: 0 0 1.25rem; }
    }
    .form-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 1rem; }
    .field {
      display: flex; flex-direction: column; gap: .35rem;
      label { font-size: .8rem; font-weight: 600; color: #4a5568; }
      input, select {
        border: 1px solid #e2e8f0; border-radius: 8px; padding: .5rem .75rem;
        font-size: .875rem; color: #2d3748; background: #fff;
        &:focus { outline: none; border-color: #00796b; box-shadow: 0 0 0 3px rgba(0,121,107,.1); }
        &:disabled { background: #f7fafc; color: #a0aec0; }
      }
    }
    .password-input { position: relative; display: flex;
      input { flex: 1; padding-right: 2.5rem; }
      .pwd-toggle { position: absolute; right: .4rem; top: 50%; transform: translateY(-50%);
        background: none; border: none; cursor: pointer; padding: .2rem; color: #718096; display: flex;
        mat-icon { font-size: 1.1rem; width: 1.1rem; height: 1.1rem; }
      }
    }
    .field-hint { font-size: .75rem; color: #718096; }
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
  formError = signal<string | null>(null);
  technicians = signal<Technician[]>([]);
  formMode = signal(false);
  editId = signal<string | null>(null);
  showPwd = signal(false);

  form: any = { name: '', phone: '', email: '', role: 'technician', password: '' };

  constructor(
    private adminApi: AdminApiService,
    private http: HttpClient,
    private snack: MatSnackBar,
  ) {}

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.adminApi.getTechnicians().subscribe({
      next: (res: any) => { this.technicians.set(res.items ?? res); this.loading.set(false); },
      error: (err: any) => { this.error.set(err.error?.message || 'Failed to load'); this.loading.set(false); },
    });
  }

  startCreate() {
    this.form = { name: '', phone: '', email: '', role: 'technician', password: '' };
    this.editId.set(null);
    this.formError.set(null);
    this.formMode.set(true);
  }

  startEdit(t: Technician) {
    this.form = { name: t.name, phone: t.phone, email: t.email || '', role: 'technician', password: '' };
    this.editId.set(t.id);
    this.formError.set(null);
    this.formMode.set(true);
  }

  cancelEdit() {
    this.formMode.set(false);
    this.editId.set(null);
    this.formError.set(null);
  }

  save() {
    if (!this.form.name?.trim() || !this.form.phone?.trim() || !this.form.email?.trim()) {
      this.formError.set('Name, phone, and email are required.');
      return;
    }
    if (!this.editId() && !this.form.password?.trim()) {
      this.formError.set('Password is required for new technician accounts.');
      return;
    }

    this.saving.set(true);
    this.formError.set(null);

    if (this.editId()) {
      this.adminApi.updateTechnician(this.editId()!, {
        name: this.form.name, phone: this.form.phone, email: this.form.email,
      }).subscribe({
        next: () => { this.saving.set(false); this.cancelEdit(); this.load(); this.snack.open('Technician updated.', 'OK', { duration: 3000 }); },
        error: (err: any) => { this.formError.set(err.error?.message || 'Failed to save'); this.saving.set(false); },
      });
    } else {
      this.http.post('/technicians/create-account', {
        name: this.form.name,
        phone: this.form.phone,
        email: this.form.email,
        password: this.form.password,
      }).subscribe({
        next: () => { this.saving.set(false); this.cancelEdit(); this.load(); this.snack.open('Technician account created.', 'OK', { duration: 3000 }); },
        error: (err: any) => { this.formError.set(this.extractError(err)); this.saving.set(false); },
      });
    }
  }

  private extractError(err: any): string {
    const detail = err.error?.detail;
    if (Array.isArray(detail) && detail.length > 0) {
      return detail.map((d: any) => d.msg?.replace(/^Value error,\s*/i, '') ?? d.type).join('; ');
    }
    return detail?.message || err.error?.message || 'Failed to create account';
  }

  remove(t: Technician) {
    if (!confirm(`Delete technician "${t.name}"? This cannot be undone.`)) return;
    this.adminApi.deleteTechnician(t.id).subscribe({
      next: () => { this.load(); this.snack.open('Technician deleted.', 'OK', { duration: 3000 }); },
      error: (err: any) => this.error.set(err.error?.message || 'Failed to delete'),
    });
  }
}
