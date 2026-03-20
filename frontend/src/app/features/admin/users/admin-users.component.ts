import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { AdminApiService } from '../../../core/api/services/admin-api.service';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner.component';
import { ErrorBannerComponent } from '../../../shared/components/error-banner.component';
import { PaginationComponent } from '../../../shared/components/pagination.component';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule, MatSelectModule,
    LoadingSpinnerComponent, ErrorBannerComponent, PaginationComponent,
  ],
  template: `
    <div class="admin-page">
      <!-- Stats row -->
      @if (stats()) {
        <div class="stats-row">
          <div class="stat-card">
            <span class="stat-value">{{ stats().total }}</span>
            <span class="stat-label">Total Users</span>
          </div>
          <div class="stat-card success">
            <span class="stat-value">{{ stats().active }}</span>
            <span class="stat-label">Active</span>
          </div>
          <div class="stat-card warn">
            <span class="stat-value">{{ stats().inactive }}</span>
            <span class="stat-label">Inactive</span>
          </div>
          @for (entry of roleEntries(); track entry.role) {
            <div class="stat-card info">
              <span class="stat-value">{{ entry.count }}</span>
              <span class="stat-label">{{ entry.role | titlecase }}</span>
            </div>
          }
        </div>
      }

      <!-- Filters -->
      <div class="filter-bar">
        <div class="search-wrap">
          <mat-icon class="search-icon">search</mat-icon>
          <input class="search-input" placeholder="Search name, phone, email…" [(ngModel)]="searchQ" (input)="onSearch()" />
        </div>
        <select class="filter-select" [(ngModel)]="roleFilter" (change)="load()">
          <option value="">All Roles</option>
          <option value="user">User</option>
          <option value="admin">Admin</option>
          <option value="technician">Technician</option>
        </select>
        <select class="filter-select" [(ngModel)]="activeFilter" (change)="load()">
          <option value="">All Status</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
      </div>

      @if (loading()) {
        <app-loading-spinner />
      } @else if (error()) {
        <app-error-banner [message]="error()!" retryLabel="Retry" (retry)="load()" />
      } @else {
        <div class="table-card">
          <table class="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              @if (users().length === 0) {
                <tr><td colspan="7" class="empty-row">No users found</td></tr>
              }
              @for (u of users(); track u.id) {
                <tr>
                  <td><span class="user-name">{{ u.name }}</span></td>
                  <td>{{ u.phone || '—' }}</td>
                  <td>{{ u.email || '—' }}</td>
                  <td><span class="badge" [class]="'badge-' + u.role">{{ u.role }}</span></td>
                  <td>
                    <span class="badge" [class]="u.is_active ? 'badge-success' : 'badge-danger'">
                      {{ u.is_active ? 'Active' : 'Inactive' }}
                    </span>
                  </td>
                  <td>{{ u.created_at | date:'dd MMM yyyy' }}</td>
                  <td>
                    @if (u.is_active) {
                      <button class="action-btn danger" (click)="deactivate(u)" title="Deactivate">
                        <mat-icon>block</mat-icon>
                      </button>
                    } @else {
                      <button class="action-btn success" (click)="activate(u)" title="Activate">
                        <mat-icon>check_circle</mat-icon>
                      </button>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <app-pagination [page]="page()" [total]="total()" [pageSize]="pageSize" (pageChange)="onPage($event)" />
      }
    </div>
  `,
  styles: [`
    .admin-page { display: flex; flex-direction: column; gap: 1.25rem; }

    .stats-row {
      display: flex; gap: 1rem; flex-wrap: wrap;
    }
    .stat-card {
      background: #fff; border-radius: 10px; padding: 1rem 1.5rem;
      border: 1px solid #e2e8f0; display: flex; flex-direction: column; gap: .2rem;
      min-width: 120px;
      &.success .stat-value { color: #38a169; }
      &.warn .stat-value { color: #d69e2e; }
      &.info .stat-value { color: #3182ce; }
    }
    .stat-value { font-size: 1.75rem; font-weight: 700; color: #1a202c; }
    .stat-label { font-size: .8rem; color: #718096; font-weight: 500; text-transform: uppercase; letter-spacing: .04em; }

    .filter-bar {
      display: flex; gap: .75rem; align-items: center; flex-wrap: wrap;
    }
    .search-wrap {
      display: flex; align-items: center; gap: .5rem;
      background: #fff; border: 1px solid #e2e8f0; border-radius: 8px;
      padding: .4rem .75rem; flex: 1; min-width: 200px;
      mat-icon { color: #a0aec0; font-size: 1.1rem; width: 1.1rem; height: 1.1rem; }
    }
    .search-input {
      border: none; outline: none; font-size: .9rem; width: 100%; background: transparent;
    }
    .filter-select {
      border: 1px solid #e2e8f0; border-radius: 8px; padding: .5rem .75rem;
      font-size: .875rem; background: #fff; color: #2d3748; cursor: pointer;
      &:focus { outline: none; border-color: #00796b; }
    }

    .table-card {
      background: #fff; border-radius: 10px; border: 1px solid #e2e8f0; overflow: hidden;
    }
    .data-table {
      width: 100%; border-collapse: collapse;
      th {
        background: #f7fafc; padding: .75rem 1rem; text-align: left;
        font-size: .8rem; font-weight: 600; color: #718096; text-transform: uppercase;
        letter-spacing: .05em; border-bottom: 1px solid #e2e8f0;
      }
      td {
        padding: .85rem 1rem; border-bottom: 1px solid #f0f4f8;
        font-size: .875rem; color: #2d3748;
      }
      tr:last-child td { border-bottom: none; }
      tr:hover td { background: #f7fafc; }
    }
    .user-name { font-weight: 600; }
    .empty-row { text-align: center; color: #a0aec0; padding: 2rem !important; }

    .badge {
      display: inline-flex; align-items: center; padding: .2rem .6rem;
      border-radius: 999px; font-size: .75rem; font-weight: 600;
      &.badge-user       { background: #ebf8ff; color: #2b6cb0; }
      &.badge-admin      { background: #faf5ff; color: #6b46c1; }
      &.badge-technician { background: #fffaf0; color: #c05621; }
      &.badge-success    { background: #c6f6d5; color: #276749; }
      &.badge-danger     { background: #fed7d7; color: #9b2c2c; }
    }

    .action-btn {
      background: none; border: none; cursor: pointer; padding: .3rem;
      border-radius: 6px; display: inline-flex; align-items: center;
      mat-icon { font-size: 1.1rem; width: 1.1rem; height: 1.1rem; }
      &.danger { color: #e53e3e; &:hover { background: #fed7d7; } }
      &.success { color: #38a169; &:hover { background: #c6f6d5; } }
    }
  `],
})
export class AdminUsersComponent implements OnInit {
  pageSize = 20;
  searchQ = '';
  roleFilter = '';
  activeFilter = '';
  private searchTimer: any;

  loading = signal(false);
  error = signal<string | null>(null);
  users = signal<any[]>([]);
  total = signal(0);
  page = signal(1);
  stats = signal<any>(null);

  roleEntries = () => {
    const s = this.stats();
    if (!s?.by_role) return [];
    return Object.entries(s.by_role).map(([role, count]) => ({ role, count }));
  };

  constructor(private adminApi: AdminApiService) {}

  ngOnInit() {
    this.loadStats();
    this.load();
  }

  loadStats() {
    this.adminApi.getUserStats().subscribe({ next: (s) => this.stats.set(s), error: () => {} });
  }

  load() {
    this.loading.set(true);
    this.error.set(null);
    const params: any = { page: this.page(), page_size: this.pageSize };
    if (this.searchQ) params.q = this.searchQ;
    if (this.roleFilter) params.role = this.roleFilter;
    if (this.activeFilter !== '') params.is_active = this.activeFilter;

    this.adminApi.getUsers(params).subscribe({
      next: (res: any) => {
        this.users.set(res.items);
        this.total.set(res.total);
        this.loading.set(false);
      },
      error: (err: any) => {
        this.error.set(err.error?.message || 'Failed to load users');
        this.loading.set(false);
      },
    });
  }

  onSearch() {
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => { this.page.set(1); this.load(); }, 400);
  }

  onPage(p: number) { this.page.set(p); this.load(); }

  activate(u: any) {
    this.adminApi.activateUser(u.id).subscribe({ next: () => { this.load(); this.loadStats(); }, error: () => {} });
  }

  deactivate(u: any) {
    if (!confirm(`Deactivate ${u.name}?`)) return;
    this.adminApi.deactivateUser(u.id).subscribe({ next: () => { this.load(); this.loadStats(); }, error: () => {} });
  }
}
