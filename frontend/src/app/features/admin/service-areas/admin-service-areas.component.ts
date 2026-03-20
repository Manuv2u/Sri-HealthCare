import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCardModule } from '@angular/material/card';
import { ServiceArea } from '../../../core/api/api.types';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner.component';
import { ErrorBannerComponent } from '../../../shared/components/error-banner.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state.component';

@Component({
  selector: 'app-admin-service-areas',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatCardModule,
    LoadingSpinnerComponent,
    ErrorBannerComponent,
    EmptyStateComponent,
  ],
  template: `
    <div class="service-areas-container">
      <div class="header">
        <h1>Service Areas</h1>
        <button mat-raised-button color="primary" (click)="startCreate()">
          <mat-icon>add</mat-icon> Add Area
        </button>
      </div>

      @if (loading()) {
        <app-loading-spinner />
      } @else if (error()) {
        <app-error-banner [message]="error()!" retryLabel="Retry" (retry)="loadAll()" />
      } @else {
        @if (editMode()) {
          <mat-card class="edit-form">
            <mat-card-header>
              <mat-card-title>Create Service Area</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <div class="form-grid">
                <mat-form-field>
                  <mat-label>Pincode</mat-label>
                  <input matInput [(ngModel)]="editingArea()!.pincode" required>
                </mat-form-field>

                <mat-form-field>
                  <mat-label>City</mat-label>
                  <input matInput [(ngModel)]="editingArea()!.city" required>
                </mat-form-field>

                <mat-form-field>
                  <mat-label>State</mat-label>
                  <input matInput [(ngModel)]="editingArea()!.state" required>
                </mat-form-field>
              </div>

              <div class="actions">
                <button mat-button (click)="cancelEdit()">Cancel</button>
                <button mat-raised-button color="primary" (click)="saveArea()">Save</button>
              </div>
            </mat-card-content>
          </mat-card>
        }

        @if (areas().length === 0) {
          <app-empty-state message="No service areas found" ctaLabel="Add Area" (ctaClick)="startCreate()" />
        } @else {
          <table mat-table [dataSource]="areas()">
            <ng-container matColumnDef="pincode">
              <th mat-header-cell *matHeaderCellDef>Pincode</th>
              <td mat-cell *matCellDef="let a">{{ a.pincode }}</td>
            </ng-container>

            <ng-container matColumnDef="city">
              <th mat-header-cell *matHeaderCellDef>City</th>
              <td mat-cell *matCellDef="let a">{{ a.city }}</td>
            </ng-container>

            <ng-container matColumnDef="state">
              <th mat-header-cell *matHeaderCellDef>State</th>
              <td mat-cell *matCellDef="let a">{{ a.state }}</td>
            </ng-container>

            <ng-container matColumnDef="is_active">
              <th mat-header-cell *matHeaderCellDef>Active</th>
              <td mat-cell *matCellDef="let a">{{ a.is_active ? 'Yes' : 'No' }}</td>
            </ng-container>

            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef>Actions</th>
              <td mat-cell *matCellDef="let a">
                <button mat-stroked-button [color]="a.is_active ? 'warn' : 'primary'" (click)="toggleArea(a)">
                  {{ a.is_active ? 'Disable' : 'Enable' }}
                </button>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
          </table>
        }
      }

      <mat-card class="notify-section">
        <mat-card-header>
          <mat-card-title>Pending Notify Me Requests</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          @if (notifyRequests().length === 0) {
            <p>No pending requests.</p>
          } @else {
            @for (group of groupedRequests(); track group.pincode) {
              <div class="pincode-group">
                <strong>Pincode: {{ group.pincode }}</strong>
                <span class="count">{{ group.count }} request(s)</span>
              </div>
            }
          }
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .service-areas-container {
      padding: 1.5rem;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
    }
    .edit-form {
      margin-bottom: 1.5rem;
    }
    .form-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin-bottom: 1rem;
    }
    .actions {
      display: flex;
      gap: 0.5rem;
      justify-content: flex-end;
    }
    table {
      width: 100%;
    }
    .notify-section {
      margin-top: 2rem;
    }
    .pincode-group {
      display: flex;
      justify-content: space-between;
      padding: 0.5rem 0;
      border-bottom: 1px solid #eee;
    }
    .count {
      color: #666;
    }
  `],
})
export class AdminServiceAreasComponent implements OnInit {
  displayedColumns = ['pincode', 'city', 'state', 'is_active', 'actions'];

  loading = signal(false);
  error = signal<string | null>(null);
  areas = signal<ServiceArea[]>([]);
  editMode = signal(false);
  editingArea = signal<Partial<ServiceArea> | null>(null);
  notifyRequests = signal<any[]>([]);
  groupedRequests = signal<{ pincode: string; count: number }[]>([]);

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.loadAll();
  }

  loadAll() {
    this.loading.set(true);
    this.error.set(null);

    this.http.get<any>('/service-areas').subscribe({
      next: (res: any) => {
        this.areas.set(res.items ?? res);
        this.loading.set(false);
      },
      error: (err: any) => {
        this.error.set(err.message || 'Failed to load service areas');
        this.loading.set(false);
      },
    });

    this.http.get<any[]>('/admin/service-requests').subscribe({
      next: (res: any[]) => {
        this.notifyRequests.set(res);
        const grouped = res.reduce((acc: Record<string, number>, r: any) => {
          acc[r.pincode] = (acc[r.pincode] || 0) + 1;
          return acc;
        }, {});
        this.groupedRequests.set(
          Object.entries(grouped).map(([pincode, count]) => ({ pincode, count: count as number }))
        );
      },
      error: () => {},
    });
  }

  startCreate() {
    this.editingArea.set({ pincode: '', city: '', state: '', is_active: true });
    this.editMode.set(true);
  }

  cancelEdit() {
    this.editMode.set(false);
    this.editingArea.set(null);
  }

  saveArea() {
    const area = this.editingArea();
    if (!area) return;

    this.http.post('/service-areas', area).subscribe({
      next: (_res: any) => {
        this.cancelEdit();
        this.loadAll();
      },
      error: (err: any) => {
        this.error.set(err.message || 'Failed to save service area');
      },
    });
  }

  toggleArea(area: ServiceArea) {
    this.http.put(`/service-areas/${area.id}`, { ...area, is_active: !area.is_active }).subscribe({
      next: (_res: any) => this.loadAll(),
      error: (err: any) => {
        this.error.set(err.message || 'Failed to update service area');
      },
    });
  }
}
