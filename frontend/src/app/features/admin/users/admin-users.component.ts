import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminApiService } from '../../../core/api/services/admin-api.service';
import { BadgeComponent } from '../../../shared/components/badge/badge.component';
import { SpinnerComponent } from '../../../shared/components/spinner/spinner.component';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { AvatarComponent } from '../../../shared/components/avatar/avatar.component';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, FormsModule, BadgeComponent, SpinnerComponent, ButtonComponent, AvatarComponent],
  template: `
<div class="page">
  <!-- Header -->
  <div class="page-header">
    <div>
      <h1 class="page-title">User Management</h1>
      <p class="page-sub">Manage patient accounts and access control</p>
    </div>
  </div>

  <!-- Stats -->
  @if (stats()) {
    <div class="stats-row">
      <div class="stat-chip"><span class="sc-val">{{ stats().total }}</span><span class="sc-lbl">Total</span></div>
      <div class="stat-chip success"><span class="sc-val">{{ stats().active }}</span><span class="sc-lbl">Active</span></div>
      <div class="stat-chip warning"><span class="sc-val">{{ stats().inactive }}</span><span class="sc-lbl">Inactive</span></div>
      @for (e of roleEntries(); track e.role) {
        <div class="stat-chip info"><span class="sc-val">{{ e.count }}</span><span class="sc-lbl">{{ e.role | titlecase }}</span></div>
      }
    </div>
  }

  <!-- Filters -->
  <div class="filter-bar">
    <div class="search-field">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
      <input placeholder="Search name, phone, email…" [(ngModel)]="searchQ" (input)="onSearch()" />
    </div>
    <select class="filter-sel" [(ngModel)]="roleFilter" (change)="load()">
      <option value="">All Roles</option>
      <option value="user">Patient</option>
      <option value="admin">Admin</option>
      <option value="technician">Technician</option>
    </select>
    <select class="filter-sel" [(ngModel)]="activeFilter" (change)="load()">
      <option value="">All Status</option>
      <option value="true">Active</option>
      <option value="false">Inactive</option>
    </select>
  </div>

  @if (loading()) {
    <div class="load-wrap"><app-spinner size="md" /></div>
  } @else {
    <!-- Table -->
    <div class="table-wrap">
      <table class="tbl">
        <thead>
          <tr>
            <th>User</th><th>Phone</th><th>Email</th><th>Role</th><th>Status</th><th>Joined</th><th>Actions</th>
          </tr>
        </thead>
        <tbody>
          @if (users().length === 0) {
            <tr><td colspan="7" class="empty-td">No users found</td></tr>
          }
          @for (u of users(); track u.id) {
            <tr>
              <td>
                <div class="user-cell">
                  <app-avatar [name]="u.name" size="sm" />
                  <span class="user-name">{{ u.name }}</span>
                </div>
              </td>
              <td class="mono">{{ u.phone || '—' }}</td>
              <td class="text-sm">{{ u.email || '—' }}</td>
              <td><app-badge [color]="roleColor(u.role)" size="sm">{{ u.role | titlecase }}</app-badge></td>
              <td><app-badge [color]="u.is_active ? 'success' : 'error'" size="sm">{{ u.is_active ? 'Active' : 'Inactive' }}</app-badge></td>
              <td class="text-sm text-muted">{{ u.created_at | date:'dd MMM yyyy' }}</td>
              <td>
                <div class="row-actions">
                  @if (u.is_active) {
                    <button class="act-btn danger" (click)="deactivate(u)" title="Deactivate">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
                    </button>
                  } @else {
                    <button class="act-btn success" (click)="activate(u)" title="Activate">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                    </button>
                  }
                  @if (u.role === 'user') {
                    <button class="act-btn role" (click)="changeRole(u, 'technician')" title="Make Technician">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.24 12.24a6 6 0 00-8.49-8.49L5 10.5V19h8.5z"/><line x1="16" y1="8" x2="2" y2="22"/><line x1="17.5" y1="15" x2="9" y2="15"/></svg>
                    </button>
                  } @else if (u.role === 'technician') {
                    <button class="act-btn role" (click)="changeRole(u, 'user')" title="Make Patient">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    </button>
                  }
                </div>
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    @if (total() > pageSize) {
      <div class="pagination">
        <button class="pg-btn" [disabled]="page() === 1" (click)="onPage(page()-1)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <span class="pg-info">Page {{ page() }} of {{ totalPages() }}</span>
        <button class="pg-btn" [disabled]="page() >= totalPages()" (click)="onPage(page()+1)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>
    }
  }
</div>`,
  styles: [`
    .page { display:flex; flex-direction:column; gap:1.25rem; }
    .page-header { display:flex; justify-content:space-between; align-items:flex-start; }
    .page-title { font-size:1.5rem; font-weight:700; color:#0F172A; margin:0 0 0.25rem 0; }
    .page-sub { font-size:0.875rem; color:#475569; margin:0; }
    .stats-row { display:flex; gap:0.75rem; flex-wrap:wrap; }
    .stat-chip { background:#FFFFFF; border:1px solid #F1F5F9; border-radius:1rem; padding:0.75rem 1.25rem; display:flex; flex-direction:column; gap:2px; min-width:90px; &.success .sc-val { color:#2F855A; } &.warning .sc-val { color:#D97706; } &.info .sc-val { color:#0284C7; } }
    .sc-val { font-size:1.5rem; font-weight:700; color:#0F172A; line-height:1; }
    .sc-lbl { font-size:0.75rem; color:#94A3B8; font-weight:500; text-transform:uppercase; letter-spacing:0.025em; }
    .filter-bar { display:flex; gap:0.75rem; align-items:center; flex-wrap:wrap; }
    .search-field { display:flex; align-items:center; gap:0.5rem; background:#FFFFFF; border:1px solid #E2E8F0; border-radius:0.75rem; padding:0.625rem 1rem; flex:1; min-width:220px; svg { width:18px; height:18px; color:#94A3B8; flex-shrink:0; } input { border:none; outline:none; font-size:0.875rem; color:#0F172A; background:transparent; width:100%; &::placeholder { color:#94A3B8; } } &:focus-within { border-color:#319795; box-shadow:0 0 0 3px rgba(49,151,149,.1); } }
    .filter-sel { height:40px; padding:0 1rem; font-size:0.875rem; color:#0F172A; background:#FFFFFF; border:1px solid #E2E8F0; border-radius:0.75rem; cursor:pointer; &:focus { outline:none; border-color:#319795; } }
    .load-wrap { display:flex; justify-content:center; padding:3rem; }
    .table-wrap { background:#FFFFFF; border:1px solid #F1F5F9; border-radius:1rem; overflow:hidden; }
    .tbl { width:100%; border-collapse:collapse; thead tr { background:#F8FAFC; } th { padding:0.75rem 1rem; text-align:left; font-size:0.75rem; font-weight:600; color:#94A3B8; text-transform:uppercase; letter-spacing:0.025em; border-bottom:1px solid #F1F5F9; } td { padding:0.875rem 1rem; border-bottom:1px solid #F1F5F9; font-size:0.875rem; color:#0F172A; } tbody tr:last-child td { border-bottom:none; } tbody tr:hover td { background:#F8FAFC; } }
    .user-cell { display:flex; align-items:center; gap:0.75rem; }
    .user-name { font-weight:500; }
    .mono { font-family:'JetBrains Mono','SF Mono','Fira Code',monospace; font-size:0.75rem; }
    .text-sm { font-size:0.875rem; }
    .text-muted { color:#94A3B8; }
    .empty-td { text-align:center; color:#94A3B8; padding:3rem !important; }
    .row-actions { display:flex; gap:0.5rem; }
    .act-btn { display:inline-flex; align-items:center; justify-content:center; width:32px; height:32px; border:1px solid #E2E8F0; border-radius:0.5rem; background:#FFFFFF; cursor:pointer; transition:all 150ms; svg { width:16px; height:16px; } &.danger { color:#EF4444; &:hover { background:#FEF2F2; border-color:#FCA5A5; } } &.success { color:#38A169; &:hover { background:#F0FFF4; border-color:#68D391; } } &.role { color:#4F46E5; &:hover { background:#EEF2FF; border-color:#C7D2FE; } } }
    .pagination { display:flex; align-items:center; justify-content:center; gap:1rem; }
    .pg-btn { display:flex; align-items:center; justify-content:center; width:36px; height:36px; border:1px solid #E2E8F0; border-radius:0.5rem; background:#FFFFFF; cursor:pointer; transition:all 150ms; &:hover:not(:disabled) { border-color:#38B2AC; color:#2C7A7B; } &:disabled { opacity:.4; cursor:not-allowed; } }
    .pg-info { font-size:0.875rem; color:#475569; }
  `]
})
export class AdminUsersComponent implements OnInit {
  pageSize = 20;
  searchQ = '';
  roleFilter = '';
  activeFilter = '';
  private searchTimer: any;
  loading = signal(false);
  users = signal<any[]>([]);
  total = signal(0);
  page = signal(1);
  stats = signal<any>(null);
  totalPages = computed(() => Math.ceil(this.total() / this.pageSize));
  roleEntries = () => { const s = this.stats(); if (!s?.by_role) return []; return Object.entries(s.by_role).map(([role, count]) => ({ role, count })); };
  constructor(private adminApi: AdminApiService) {}
  ngOnInit() { this.adminApi.getUserStats().subscribe({ next: s => this.stats.set(s), error: () => {} }); this.load(); }
  load() {
    this.loading.set(true);
    const p: any = { page: this.page(), page_size: this.pageSize };
    if (this.searchQ) p.q = this.searchQ;
    if (this.roleFilter) p.role = this.roleFilter;
    if (this.activeFilter !== '') p.is_active = this.activeFilter;
    this.adminApi.getUsers(p).subscribe({ next: r => { this.users.set(r.items); this.total.set(r.total); this.loading.set(false); }, error: () => this.loading.set(false) });
  }
  onSearch() { clearTimeout(this.searchTimer); this.searchTimer = setTimeout(() => { this.page.set(1); this.load(); }, 400); }
  onPage(p: number) { this.page.set(p); this.load(); }
  activate(u: any) { this.adminApi.activateUser(u.id).subscribe({ next: () => this.load() }); }
  deactivate(u: any) { if (!confirm(`Deactivate ${u.name}?`)) return; this.adminApi.deactivateUser(u.id).subscribe({ next: () => this.load() }); }
  changeRole(u: any, newRole: 'user' | 'technician') {
    const label = newRole === 'technician' ? 'a Technician' : 'a Patient';
    if (!confirm(`Make ${u.name} ${label}?`)) return;
    this.adminApi.changeUserRole(u.id, newRole).subscribe({
      next: () => this.load(),
      error: (err) => alert(err?.error?.detail?.message || err?.error?.detail || 'Failed to change role.'),
    });
  }
  roleColor(r: string) { const m: Record<string,string> = { user:'primary', admin:'secondary', technician:'accent' }; return m[r] ?? 'default'; }
}
