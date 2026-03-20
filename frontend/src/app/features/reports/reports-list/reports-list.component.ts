import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ReportApiService } from '../../../core/api/services/report-api.service';
import { Report } from '../../../core/api/api.types';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner.component';
import { ErrorBannerComponent } from '../../../shared/components/error-banner.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state.component';
import { PaginationComponent } from '../../../shared/components/pagination.component';

@Component({
  selector: 'app-reports-list',
  standalone: true,
  imports: [
    CommonModule, MatButtonModule, MatIconModule,
    LoadingSpinnerComponent, ErrorBannerComponent, EmptyStateComponent, PaginationComponent,
  ],
  template: `
    <div class="page-container">
      <div class="page-header">
        <h1>My Reports</h1>
        <p>Download your lab test results</p>
      </div>

      <app-loading-spinner *ngIf="loading()" />
      <app-error-banner *ngIf="error()" [message]="error()!" [retryLabel]="'Retry'" (retry)="load()" />
      <app-empty-state *ngIf="!loading() && !error() && reports().length === 0"
        message="No reports available yet. Reports appear here once your tests are processed." />

      <div class="report-list">
        @for (r of reports(); track r.id) {
          <div class="sri-card report-card">
            <div class="report-icon-wrap">
              <mat-icon class="report-icon">description</mat-icon>
            </div>
            <div class="report-info">
              <div class="report-name">{{ r.file_name }}</div>
              <div class="report-meta">
                Uploaded {{ r.uploaded_at | date:'mediumDate' }} &bull; {{ formatSize(r.file_size_bytes) }}
              </div>
              <div class="report-meta">By {{ r.uploader_role }}</div>
            </div>
            <div class="report-actions">
              <span class="badge badge-info retention">Until {{ r.retention_until | date:'mediumDate' }}</span>
              <button mat-flat-button color="primary" (click)="download(r)" class="dl-btn">
                <mat-icon>download</mat-icon> Download
              </button>
            </div>
          </div>
        }
      </div>

      <app-pagination
        *ngIf="total() > pageSize"
        [page]="page()"
        [total]="total()"
        [pageSize]="pageSize"
        (pageChange)="onPageChange($event)"
      />
    </div>
  `,
  styles: [`
    .report-list { display: flex; flex-direction: column; gap: 1rem; }
    .report-card {
      display: flex; align-items: center; gap: 1rem; padding: 1.25rem; flex-wrap: wrap;
    }
    .report-icon-wrap {
      width: 48px; height: 48px; border-radius: 12px;
      background: var(--color-primary-lt); display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .report-icon { color: var(--color-primary); }
    .report-info { flex: 1; min-width: 0;
      .report-name { font-weight: 600; font-size: .95rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .report-meta { font-size: .8rem; color: var(--color-muted); margin-top: .15rem; }
    }
    .report-actions { display: flex; align-items: center; gap: .75rem; flex-shrink: 0; flex-wrap: wrap; }
    .retention { font-size: .7rem; }
    .dl-btn { font-size: .875rem; }
  `],
})
export class ReportsListComponent implements OnInit {
  reports = signal<Report[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  page = signal(1);
  total = signal(0);
  pageSize = 10;

  constructor(private reportApi: ReportApiService) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.reportApi.list({ page: this.page(), page_size: this.pageSize }).subscribe({
      next: (res) => { this.reports.set(res.items); this.total.set(res.total); this.loading.set(false); },
      error: () => { this.error.set('Failed to load reports.'); this.loading.set(false); },
    });
  }

  download(report: Report): void {
    this.reportApi.getDownloadUrl(report.id).subscribe({
      next: (res) => window.open(res.download_url, '_blank'),
      error: () => alert('Failed to get download link.'),
    });
  }

  onPageChange(p: number): void { this.page.set(p); this.load(); }

  formatSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }
}
