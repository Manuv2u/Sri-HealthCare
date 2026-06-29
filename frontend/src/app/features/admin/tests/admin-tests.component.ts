import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TestApiService } from '../../../core/api/services/test-api.service';
import { Test } from '../../../core/api/api.types';
import { BadgeComponent } from '../../../shared/components/badge/badge.component';
import { SpinnerComponent } from '../../../shared/components/spinner/spinner.component';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { AlertComponent } from '../../../shared/components/alert/alert.component';

@Component({
  selector: 'app-admin-tests',
  standalone: true,
  imports: [CommonModule, FormsModule, BadgeComponent, SpinnerComponent, ButtonComponent, ModalComponent, AlertComponent],
  template: `
<div class="page">
  <div class="page-header">
    <div><h1 class="page-title">Tests Catalog</h1><p class="page-sub">Manage lab tests, pricing and availability</p></div>
    <app-button variant="primary" (click)="openCreate()">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:6px"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      Add Test
    </app-button>
  </div>

  @if (error()) { <app-alert type="error" [dismissible]="true" (dismissed)="error.set('')">{{ error() }}</app-alert> }

  <div class="filter-bar">
    <div class="search-field">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
      <input placeholder="Search tests, categories…" [(ngModel)]="searchQ" (input)="applyFilter()" />
    </div>
    <span class="count-badge">{{ filtered().length }} tests</span>
  </div>

  @if (loading()) {
    <div class="load-wrap"><app-spinner size="md" /></div>
  } @else {
    <div class="table-wrap">
      <table class="tbl">
        <thead><tr><th>Name</th><th>Category</th><th>Price</th><th>Discount</th><th>TAT</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>
          @if (filtered().length === 0) { <tr><td colspan="7" class="empty-td">No tests found.</td></tr> }
          @for (t of filtered(); track t.id) {
            <tr>
              <td class="fw-med">{{ t.name }}</td>
              <td><app-badge color="info" size="sm">{{ t.category }}</app-badge></td>
              <td>
                <div class="price-col">
                  <span class="fw-med">₹{{ t.price }}</span>
                  @if (t.discount_percentage > 0) { <span class="eff-price">₹{{ t.effective_price }} eff.</span> }
                </div>
              </td>
              <td>{{ t.discount_percentage > 0 ? t.discount_percentage + '%' : '—' }}</td>
              <td class="text-muted">{{ t.turnaround_hours }}h</td>
              <td><app-badge [color]="t.is_active ? 'success' : 'default'" size="sm">{{ t.is_active ? 'Active' : 'Inactive' }}</app-badge></td>
              <td>
                <div class="row-acts">
                  <button class="act-btn" (click)="openEdit(t)" title="Edit">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </button>
                  <button class="act-btn" (click)="toggleActive(t)" [title]="t.is_active ? 'Deactivate' : 'Activate'">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  </button>
                  <button class="act-btn danger" (click)="remove(t)" title="Delete">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                  </button>
                </div>
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  }

  <!-- Add / Edit Modal -->
  <app-modal [isOpen]="showModal()" [title]="editId() ? 'Edit Test' : 'New Test'" size="lg" (close)="closeModal()">
    <div class="form-grid">
      <div class="field span2"><label>Test Name *</label><input [(ngModel)]="f.name" placeholder="e.g. Complete Blood Count" class="inp" /></div>
      <div class="field"><label>Category *</label><input [(ngModel)]="f.category" placeholder="e.g. Haematology" class="inp" /></div>
      <div class="field"><label>Price (₹) *</label><input type="number" [(ngModel)]="f.price" min="0" class="inp" /></div>
      <div class="field"><label>Discount %</label><input type="number" [(ngModel)]="f.discount" min="0" max="100" class="inp" /></div>
      <div class="field"><label>Turnaround (hours) *</label><input type="number" [(ngModel)]="f.tat" min="1" class="inp" /></div>
      <div class="field"><label>Status</label><select [(ngModel)]="f.active" class="inp"><option [ngValue]="true">Active</option><option [ngValue]="false">Inactive</option></select></div>
      <div class="field span2"><label>Description</label><textarea [(ngModel)]="f.desc" rows="2" class="inp" placeholder="Optional"></textarea></div>
    </div>
    @if (formErr()) { <p class="form-err">{{ formErr() }}</p> }
    <div modal-footer>
      <app-button variant="outline" (click)="closeModal()">Cancel</app-button>
      <app-button variant="primary" [loading]="saving()" (click)="save()">{{ editId() ? 'Update' : 'Create' }} Test</app-button>
    </div>
  </app-modal>
</div>`,
  styles: [`
    .page { display:flex; flex-direction:column; gap:1.25rem; }
    .page-header { display:flex; justify-content:space-between; align-items:flex-start; }
    .page-title { font-size:1.5rem; font-weight:700; color:#0F172A; margin:0 0 0.25rem 0; }
    .page-sub { font-size:0.875rem; color:#475569; margin:0; }
    .filter-bar { display:flex; align-items:center; gap:0.75rem; }
    .search-field { display:flex; align-items:center; gap:0.5rem; background:#FFFFFF; border:1px solid #E2E8F0; border-radius:0.75rem; padding:0.625rem 1rem; flex:1; svg { width:18px; height:18px; color:#94A3B8; flex-shrink:0; } input { border:none; outline:none; font-size:0.875rem; color:#0F172A; background:transparent; width:100%; } &:focus-within { border-color:#319795; box-shadow:0 0 0 3px rgba(49,151,149,.1); } }
    .count-badge { font-size:0.875rem; color:#94A3B8; white-space:nowrap; font-weight:500; }
    .load-wrap { display:flex; justify-content:center; padding:3rem; }
    .table-wrap { background:#FFFFFF; border:1px solid #F1F5F9; border-radius:1rem; overflow:hidden; }
    .tbl { width:100%; border-collapse:collapse; thead tr { background:#F8FAFC; } th { padding:0.75rem 1rem; text-align:left; font-size:0.75rem; font-weight:600; color:#94A3B8; text-transform:uppercase; letter-spacing:0.025em; border-bottom:1px solid #F1F5F9; } td { padding:0.875rem 1rem; border-bottom:1px solid #F1F5F9; font-size:0.875rem; color:#0F172A; } tbody tr:last-child td { border-bottom:none; } tbody tr:hover td { background:#F8FAFC; } }
    .fw-med { font-weight:500; }
    .price-col { display:flex; flex-direction:column; gap:1px; }
    .eff-price { font-size:0.75rem; color:#2F855A; }
    .text-muted { color:#94A3B8; }
    .empty-td { text-align:center; color:#94A3B8; padding:3rem !important; }
    .row-acts { display:flex; gap:0.5rem; }
    .act-btn { display:inline-flex; align-items:center; justify-content:center; width:32px; height:32px; border:1px solid #E2E8F0; border-radius:0.5rem; background:#FFFFFF; cursor:pointer; transition:all 150ms; color:#475569; svg { width:15px; height:15px; } &:hover { background:#E6FFFA; border-color:#4FD1C5; color:#2C7A7B; } &.danger:hover { background:#FEF2F2; border-color:#FCA5A5; color:#DC2626; } }
    .form-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:1rem; }
    .field { display:flex; flex-direction:column; gap:0.375rem; &.span2 { grid-column:span 2; } label { font-size:0.875rem; font-weight:500; color:#0F172A; } }
    .inp { border:1px solid #E2E8F0; border-radius:0.75rem; padding:0.625rem 0.875rem; font-size:0.875rem; color:#0F172A; background:#FFFFFF; width:100%; box-sizing:border-box; transition:border-color 150ms; &:focus { outline:none; border-color:#319795; box-shadow:0 0 0 3px rgba(49,151,149,.1); } }
    textarea.inp { resize:vertical; font-family:inherit; }
    .form-err { font-size:0.875rem; color:#DC2626; margin:0.5rem 0 0 0; }
  `]
})
export class AdminTestsComponent implements OnInit {
  loading = signal(false);
  saving = signal(false);
  error = signal('');
  formErr = signal('');
  tests = signal<Test[]>([]);
  filtered = signal<Test[]>([]);
  showModal = signal(false);
  editId = signal<string | null>(null);
  searchQ = '';
  f = { name:'', category:'', price:0, discount:0, tat:24, active:true, desc:'' };

  constructor(private testApi: TestApiService) {}
  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.testApi.list({ page_size: 500, include_inactive: true }).subscribe({
      next: r => { this.tests.set(r.items); this.applyFilter(); this.loading.set(false); },
      error: () => { this.error.set('Failed to load tests.'); this.loading.set(false); }
    });
  }

  applyFilter() {
    const q = this.searchQ.toLowerCase();
    this.filtered.set(q ? this.tests().filter(t => t.name.toLowerCase().includes(q) || t.category.toLowerCase().includes(q)) : [...this.tests()]);
  }

  openCreate() { this.editId.set(null); this.f = { name:'', category:'', price:0, discount:0, tat:24, active:true, desc:'' }; this.formErr.set(''); this.showModal.set(true); }
  openEdit(t: Test) { this.editId.set(t.id); this.f = { name:t.name, category:t.category, price:t.price, discount:t.discount_percentage, tat:t.turnaround_hours, active:t.is_active, desc:t.description||'' }; this.formErr.set(''); this.showModal.set(true); }
  closeModal() { this.showModal.set(false); this.editId.set(null); }

  save() {
    if (!this.f.name.trim()) { this.formErr.set('Test name is required.'); return; }
    if (!this.f.category.trim()) { this.formErr.set('Category is required.'); return; }
    if (this.f.price < 0) { this.formErr.set('Valid price is required.'); return; }
    this.saving.set(true);
    const id = this.editId();
    const payload: any = { name:this.f.name.trim(), category:this.f.category.trim(), description:this.f.desc||null, price:+this.f.price, discount_percentage:+this.f.discount||0, turnaround_hours:+this.f.tat };
    const obs = id ? this.testApi.update(id, { ...payload, is_active:this.f.active }) : this.testApi.create(payload);
    obs.subscribe({ next: () => { this.saving.set(false); this.closeModal(); this.load(); }, error: err => { this.formErr.set(err.error?.detail?.message || err.error?.message || 'Failed to save.'); this.saving.set(false); } });
  }

  remove(t: Test) { if (!confirm(`Delete "${t.name}"?`)) return; this.testApi.delete(t.id).subscribe({ next: () => this.load(), error: () => this.error.set('Failed to delete.') }); }
  toggleActive(t: Test) { this.testApi.update(t.id, { is_active: !t.is_active }).subscribe({ next: () => this.load() }); }
}
