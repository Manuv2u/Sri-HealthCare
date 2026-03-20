import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
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
    CommonModule, MatCardModule, MatButtonModule, MatIconModule,
    LoadingSpinnerComponent, ErrorBannerComponent, EmptyStateComponent, PaginationComponent,
  ],
  template: `
    <div class="container">
      <h2>My Reports</h2>
      <app-loading-spinner *ngIf="loading()" />
      <app-error-banner *ngIf="error()" [message]="error()!" [retryLabel]="'Retry'" (retry)="load()" />
      <app-empty-state *ngIf="!loading() && reports().length === 0" message="No reports available yet." />

      <mat-card *ngFor="let r of reports()" class="report-card">
        <mat-card-header>
          <mat-card-title>{{ r.file_name }}</mat-card-title>
          <mat-card-subtitle>
            Uploaded {{ r.uploaded_at | date:'medium' }} by {{ r.uploader_role }}
          </mat-card-subtitle>
        </mat-card-header>
        <mat-card-actions>
          <button mat-button color="primary" (click)="download(r)">
            <mat-icon>download</mat-icon> Download
          </button>
        </mat-card-actions>
      </mat-card>

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
    .container { max-width: 700px; margin: 2rem auto; padding: 1rem; display: flex; flex-direction: column; gap: 1rem; }
    .report-card { margin-bottom: 0.5rem; }
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
}
