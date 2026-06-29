import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpParams } from '@angular/common/http';
import { ServiceArea } from '../../../core/api/api.types';
import { BadgeComponent } from '../../../shared/components/badge/badge.component';
import { SpinnerComponent } from '../../../shared/components/spinner/spinner.component';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { AlertComponent } from '../../../shared/components/alert/alert.component';

@Component({
  selector: 'app-admin-service-areas',
  standalone: true,
  imports: [CommonModule, FormsModule, BadgeComponent, SpinnerComponent, ButtonComponent, ModalComponent, AlertComponent],
  template: `
<div class="page">
  <div class="page-header">
    <div><h1 class="page-title">Service Areas</h1><p class="page-sub">Manage serviceable pincodes for home collection</p></div>
    <app-button variant="primary" (click)="openCreate()">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:6px"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      Add Area
    </app-button>
  </div>
  @if (error()) { <app-alert type="error" [dismissible]="true" (dismissed)="error.set('')">{{ error() }}</app-alert> }

  <div class="filter-bar">
    <div class="search-field">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
      <input placeholder="Search city, pincode…" [(ngModel)]="searchQ" (input)="applyFilter()" />
    </div>
    <span class="count-badge">{{ filtered().length }} areas</span>
  </div>

  @if (loading()) { <div class="load-wrap"><app-spinner size="md" /></div>
  } @else {
    <div class="table-wrap">
      <table class="tbl">
        <thead><tr><th>City</th><th>District</th><th>Pincode</th><th>Status</th><th>Added</th><th>Actions</th></tr></thead>
        <tbody>
          @if (filtered().length === 0) { <tr><td colspan="6" class="empty-td">No service areas found.</td></tr> }
          @for (a of filtered(); track a.id) {
            <tr>
              <td class="fw-med">{{ a.city }}</td>
              <td>{{ a.district }}</td>
              <td class="mono">{{ a.pincode }}</td>
              <td><app-badge [color]="a.is_active ? 'success' : 'error'" size="sm">{{ a.is_active ? 'Active' : 'Inactive' }}</app-badge></td>
              <td class="text-sm text-muted">{{ a.created_at | date:'dd MMM yyyy' }}</td>
              <td>
                <div class="row-acts">
                  <button class="act-btn" (click)="toggleActive(a)">{{ a.is_active ? 'Disable' : 'Enable' }}</button>
                  <button class="act-btn danger" (click)="remove(a)">Delete</button>
                </div>
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  }

  <app-modal [isOpen]="showModal()" title="Add Service Area" size="md" (close)="closeModal()">
    <div class="form-grid">
      <div class="field"><label>City *</label><input [(ngModel)]="f.city" class="inp" placeholder="e.g. Hyderabad" /></div>
      <div class="field"><label>District *</label><input [(ngModel)]="f.district" class="inp" placeholder="e.g. Rangareddy" /></div>
      <div class="field span2"><label>Pincode *</label><input [(ngModel)]="f.pincode" class="inp" placeholder="6-digit pincode" maxlength="6" /></div>
    </div>
    @if (formErr()) { <p class="form-err">{{ formErr() }}</p> }
    <div modal-footer>
      <app-button variant="outline" (click)="closeModal()">Cancel</app-button>
      <app-button variant="primary" [loading]="saving()" (click)="save()">Add Area</app-button>
    </div>
  </app-modal>
</div>`,
  styles: [`
    .page { display:flex; flex-direction:column; gap:1.25rem; }
    .page-header { display:flex; justify-content:space-between; align-items:flex-start; }
    .page-title { font-size:1.5rem; font-weight:700; color:#0F172A; margin:0 0 0.25rem 0; }
    .page-sub { font-size:0.875rem; color:#475569; margin:0; }
    .filter-bar { display:flex; align-items:center; gap:0.75rem; }
    .search-field { display:flex; align-items:center; gap:0.5rem; background:#FFFFFF; border:1px solid #E2E8F0; border-radius:0.75rem; padding:0.625rem 1rem; flex:1; svg { width:18px; height:18px; color:#94A3B8; flex-shrink:0; } input { border:none; outline:none; font-size:0.875rem; color:#0F172A; background:transparent; width:100%; } &:focus-within { border-color:#319795; } }
    .count-badge { font-size:0.875rem; color:#94A3B8; white-space:nowrap; font-weight:500; }
    .load-wrap { display:flex; justify-content:center; padding:3rem; }
    .table-wrap { background:#FFFFFF; border:1px solid #F1F5F9; border-radius:1rem; overflow:hidden; }
    .tbl { width:100%; border-collapse:collapse; thead tr { background:#F8FAFC; } th { padding:0.75rem 1rem; text-align:left; font-size:0.75rem; font-weight:600; color:#94A3B8; text-transform:uppercase; letter-spacing:0.025em; border-bottom:1px solid #F1F5F9; } td { padding:0.875rem 1rem; border-bottom:1px solid #F1F5F9; font-size:0.875rem; color:#0F172A; } tbody tr:last-child td { border-bottom:none; } tbody tr:hover td { background:#F8FAFC; } }
    .fw-med { font-weight:500; }
    .mono { font-family:'JetBrains Mono','SF Mono','Fira Code',monospace; font-size:0.75rem; letter-spacing:0.025em; }
    .text-sm { font-size:0.875rem; }
    .text-muted { color:#94A3B8; }
    .empty-td { text-align:center; color:#94A3B8; padding:3rem !important; }
    .row-acts { display:flex; gap:0.5rem; }
    .act-btn { display:inline-flex; padding:0.375rem 0.75rem; border:1px solid #E2E8F0; border-radius:0.5rem; background:#FFFFFF; font-size:0.75rem; font-weight:500; color:#475569; cursor:pointer; transition:all 150ms; &:hover { background:#E6FFFA; border-color:#4FD1C5; color:#285E61; } &.danger:hover { background:#FEF2F2; border-color:#FCA5A5; color:#DC2626; } }
    .form-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:1rem; }
    .field { display:flex; flex-direction:column; gap:0.375rem; &.span2 { grid-column:span 2; } label { font-size:0.875rem; font-weight:500; color:#0F172A; } }
    .inp { border:1px solid #E2E8F0; border-radius:0.75rem; padding:0.625rem 0.875rem; font-size:0.875rem; color:#0F172A; background:#FFFFFF; width:100%; box-sizing:border-box; &:focus { outline:none; border-color:#319795; box-shadow:0 0 0 3px rgba(49,151,149,.1); } }
    .form-err { font-size:0.875rem; color:#DC2626; margin:0.5rem 0 0 0; }
  `]
})
export class AdminServiceAreasComponent implements OnInit {
  loading = signal(false); saving = signal(false); error = signal(''); formErr = signal('');
  all = signal<ServiceArea[]>([]); filtered = signal<ServiceArea[]>([]);
  showModal = signal(false); searchQ = '';
  f = { city:'', district:'', pincode:'' };

  constructor(private http: HttpClient) {}
  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    const p = new HttpParams().set('page_size', '500');
    this.http.get<any>('/service-areas', { params: p }).subscribe({
      next: r => { this.all.set(r.items || r); this.applyFilter(); this.loading.set(false); },
      error: () => { this.error.set('Failed to load service areas.'); this.loading.set(false); }
    });
  }

  applyFilter() { const q = this.searchQ.toLowerCase(); this.filtered.set(q ? this.all().filter(a => a.city.toLowerCase().includes(q) || a.pincode.includes(q) || a.district.toLowerCase().includes(q)) : [...this.all()]); }
  openCreate() { this.f = { city:'', district:'', pincode:'' }; this.formErr.set(''); this.showModal.set(true); }
  closeModal() { this.showModal.set(false); }

  save() {
    if (!this.f.city.trim() || !this.f.pincode.trim()) { this.formErr.set('City and pincode are required.'); return; }
    if (!/^\d{6}$/.test(this.f.pincode)) { this.formErr.set('Pincode must be 6 digits.'); return; }
    this.saving.set(true);
    this.http.post('/service-areas', this.f).subscribe({
      next: () => { this.saving.set(false); this.closeModal(); this.load(); },
      error: err => { this.formErr.set(err.error?.detail?.message || 'Failed to save.'); this.saving.set(false); }
    });
  }

  toggleActive(a: ServiceArea) { this.http.patch(`/service-areas/${a.id}`, { is_active: !a.is_active }).subscribe({ next: () => this.load() }); }
  remove(a: ServiceArea) { if (!confirm(`Delete ${a.city} - ${a.pincode}?`)) return; this.http.delete(`/service-areas/${a.id}`).subscribe({ next: () => this.load() }); }
}
