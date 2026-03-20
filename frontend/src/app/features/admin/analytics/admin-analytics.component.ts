import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatTableModule } from '@angular/material/table';
import { AdminApiService } from '../../../core/api/services/admin-api.service';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner.component';
import { ErrorBannerComponent } from '../../../shared/components/error-banner.component';

@Component({
  selector: 'app-admin-analytics',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatTableModule,
    LoadingSpinnerComponent,
    ErrorBannerComponent,
  ],
  template: `
    <div class="analytics-container">
      <h1>Analytics</h1>

      <mat-card>
        <mat-card-content>
          <div class="filters">
            <mat-form-field>
              <mat-label>From Date</mat-label>
              <input matInput [matDatepicker]="pickerFrom" [(ngModel)]="dateFrom">
              <mat-datepicker-toggle matSuffix [for]="pickerFrom" />
              <mat-datepicker #pickerFrom />
            </mat-form-field>

            <mat-form-field>
              <mat-label>To Date</mat-label>
              <input matInput [matDatepicker]="pickerTo" [(ngModel)]="dateTo">
              <mat-datepicker-toggle matSuffix [for]="pickerTo" />
              <mat-datepicker #pickerTo />
            </mat-form-field>

            <button mat-raised-button color="primary" (click)="loadAnalytics()">Load</button>
            <button mat-raised-button (click)="exportCsv()">Export CSV</button>
          </div>
        </mat-card-content>
      </mat-card>

      @if (loading()) {
        <app-loading-spinner />
      } @else if (error()) {
        <app-error-banner [message]="error()!" retryLabel="Retry" (retry)="loadAnalytics()" />
      } @else if (data()) {
        <mat-card>
          <mat-card-header>
            <mat-card-title>Bookings by Status</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <table mat-table [dataSource]="data()!.bookings_by_status || []">
              <ng-container matColumnDef="status">
                <th mat-header-cell *matHeaderCellDef>Status</th>
                <td mat-cell *matCellDef="let row">{{ row.status }}</td>
              </ng-container>
              <ng-container matColumnDef="count">
                <th mat-header-cell *matHeaderCellDef>Count</th>
                <td mat-cell *matCellDef="let row">{{ row.count }}</td>
              </ng-container>
              <tr mat-header-row *matHeaderRowDef="['status', 'count']"></tr>
              <tr mat-row *matRowDef="let row; columns: ['status', 'count']"></tr>
            </table>
          </mat-card-content>
        </mat-card>

        <mat-card>
          <mat-card-header>
            <mat-card-title>Revenue by Payment Method</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <table mat-table [dataSource]="data()!.revenue_by_method || []">
              <ng-container matColumnDef="method">
                <th mat-header-cell *matHeaderCellDef>Method</th>
                <td mat-cell *matCellDef="let row">{{ row.method }}</td>
              </ng-container>
              <ng-container matColumnDef="revenue">
                <th mat-header-cell *matHeaderCellDef>Revenue</th>
                <td mat-cell *matCellDef="let row">₹{{ row.revenue }}</td>
              </ng-container>
              <tr mat-header-row *matHeaderRowDef="['method', 'revenue']"></tr>
              <tr mat-row *matRowDef="let row; columns: ['method', 'revenue']"></tr>
            </table>
          </mat-card-content>
        </mat-card>
      }
    </div>
  `,
  styles: [`
    .analytics-container {
      padding: 1.5rem;
    }
    h1 {
      margin-bottom: 1.5rem;
    }
    .filters {
      display: flex;
      gap: 1rem;
      align-items: center;
      flex-wrap: wrap;
    }
    mat-card {
      margin-bottom: 1rem;
    }
    table {
      width: 100%;
    }
  `],
})
export class AdminAnalyticsComponent {
  dateFrom: Date | null = null;
  dateTo: Date | null = null;

  loading = signal(false);
  error = signal<string | null>(null);
  data = signal<any>(null);

  constructor(private adminApi: AdminApiService) {}

  loadAnalytics() {
    this.loading.set(true);
    this.error.set(null);
    const params: any = {};
    if (this.dateFrom) params.date_from = this.dateFrom.toISOString().split('T')[0];
    if (this.dateTo) params.date_to = this.dateTo.toISOString().split('T')[0];

    this.adminApi.getAnalytics(params).subscribe({
      next: (res) => {
        this.data.set(res);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.message || 'Failed to load analytics');
        this.loading.set(false);
      },
    });
  }

  exportCsv() {
    const params: any = {};
    if (this.dateFrom) params.date_from = this.dateFrom.toISOString().split('T')[0];
    if (this.dateTo) params.date_to = this.dateTo.toISOString().split('T')[0];

    this.adminApi.exportCsv(params).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `analytics-${Date.now()}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: (err) => {
        this.error.set(err.message || 'Failed to export CSV');
      },
    });
  }
}
