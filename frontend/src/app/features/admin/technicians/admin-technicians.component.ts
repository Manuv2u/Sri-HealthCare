import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCardModule } from '@angular/material/card';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { HttpClient } from '@angular/common/http';
import { AdminApiService } from '../../../core/api/services/admin-api.service';
import { Technician } from '../../../core/api/api.types';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner.component';
import { ErrorBannerComponent } from '../../../shared/components/error-banner.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state.component';

@Component({
  selector: 'app-admin-technicians',
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
    MatDatepickerModule,
    MatNativeDateModule,
    LoadingSpinnerComponent,
    ErrorBannerComponent,
    EmptyStateComponent,
  ],
  template: `
    <div class="technicians-container">
      <div class="header">
        <h1>Technicians Management</h1>
        <button mat-raised-button color="primary" (click)="startCreate()">
          <mat-icon>add</mat-icon> Add Technician
        </button>
      </div>

      @if (loading()) {
        <app-loading-spinner />
      } @else if (error()) {
        <app-error-banner [message]="error()!" retryLabel="Retry" (retry)="loadTechnicians()" />
      } @else {
        @if (editMode()) {
          <mat-card class="edit-form">
            <mat-card-header>
              <mat-card-title>{{ editingTech()?.id ? 'Edit Technician' : 'Create Technician' }}</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <div class="form-grid">
                <mat-form-field>
                  <mat-label>Name</mat-label>
                  <input matInput [(ngModel)]="editingTech()!.name" required>
                </mat-form-field>

                <mat-form-field>
                  <mat-label>Phone</mat-label>
                  <input matInput [(ngModel)]="editingTech()!.phone" required>
                </mat-form-field>

                <mat-form-field>
                  <mat-label>Email</mat-label>
                  <input matInput [(ngModel)]="editingTech()!.email">
                </mat-form-field>
              </div>

              <div class="actions">
                <button mat-button (click)="cancelEdit()">Cancel</button>
                <button mat-raised-button color="primary" (click)="saveTechnician()">Save</button>
              </div>
            </mat-card-content>
          </mat-card>
        }

        @if (technicians().length === 0) {
          <app-empty-state message="No technicians found" ctaLabel="Add Technician" (ctaClick)="startCreate()" />
        } @else {
          <table mat-table [dataSource]="technicians()">
            <ng-container matColumnDef="name">
              <th mat-header-cell *matHeaderCellDef>Name</th>
              <td mat-cell *matCellDef="let t">{{ t.name }}</td>
            </ng-container>

            <ng-container matColumnDef="phone">
              <th mat-header-cell *matHeaderCellDef>Phone</th>
              <td mat-cell *matCellDef="let t">{{ t.phone }}</td>
            </ng-container>

            <ng-container matColumnDef="email">
              <th mat-header-cell *matHeaderCellDef>Email</th>
              <td mat-cell *matCellDef="let t">{{ t.email }}</td>
            </ng-container>

            <ng-container matColumnDef="is_active">
              <th mat-header-cell *matHeaderCellDef>Active</th>
              <td mat-cell *matCellDef="let t">{{ t.is_active ? 'Yes' : 'No' }}</td>
            </ng-container>

            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef>Actions</th>
              <td mat-cell *matCellDef="let t">
                <button mat-icon-button (click)="startEdit(t)">
                  <mat-icon>edit</mat-icon>
                </button>
                <button mat-stroked-button color="warn" (click)="deactivate(t)" [disabled]="!t.is_active">
                  Deactivate
                </button>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
          </table>
        }
      }

      <mat-card class="workload-section">
        <mat-card-header>
          <mat-card-title>Workload Summary</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <div class="workload-filters">
            <mat-form-field>
              <mat-label>Date</mat-label>
              <input matInput [matDatepicker]="workloadPicker" [(ngModel)]="workloadDate">
              <mat-datepicker-toggle matSuffix [for]="workloadPicker" />
              <mat-datepicker #workloadPicker />
            </mat-form-field>
            <button mat-raised-button (click)="loadWorkload()">Load Workload</button>
          </div>

          @if (workload().length > 0) {
            <table mat-table [dataSource]="workload()">
              <ng-container matColumnDef="technician">
                <th mat-header-cell *matHeaderCellDef>Technician</th>
                <td mat-cell *matCellDef="let w">{{ w.technician_name }}</td>
              </ng-container>

              <ng-container matColumnDef="bookings">
                <th mat-header-cell *matHeaderCellDef>Bookings</th>
                <td mat-cell *matCellDef="let w">{{ w.booking_count }}</td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="['technician', 'bookings']"></tr>
              <tr mat-row *matRowDef="let row; columns: ['technician', 'bookings']"></tr>
            </table>
          }
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .technicians-container {
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
    .workload-section {
      margin-top: 2rem;
    }
    .workload-filters {
      display: flex;
      gap: 1rem;
      align-items: center;
      margin-bottom: 1rem;
    }
  `],
})
export class AdminTechniciansComponent implements OnInit {
  displayedColumns = ['name', 'phone', 'email', 'is_active', 'actions'];

  loading = signal(false);
  error = signal<string | null>(null);
  technicians = signal<Technician[]>([]);
  editMode = signal(false);
  editingTech = signal<Partial<Technician> | null>(null);
  workloadDate: Date | null = null;
  workload = signal<any[]>([]);

  constructor(private adminApi: AdminApiService, private http: HttpClient) {}

  ngOnInit() {
    this.loadTechnicians();
  }

  loadTechnicians() {
    this.loading.set(true);
    this.error.set(null);
    this.adminApi.getTechnicians().subscribe({
      next: (res: any) => {
        this.technicians.set(res.items ?? res);
        this.loading.set(false);
      },
      error: (err: any) => {
        this.error.set(err.message || 'Failed to load technicians');
        this.loading.set(false);
      },
    });
  }

  startCreate() {
    this.editingTech.set({ name: '', phone: '', email: '', is_active: true });
    this.editMode.set(true);
  }

  startEdit(tech: Technician) {
    this.editingTech.set({ ...tech });
    this.editMode.set(true);
  }

  cancelEdit() {
    this.editMode.set(false);
    this.editingTech.set(null);
  }

  saveTechnician() {
    const tech = this.editingTech();
    if (!tech) return;

    const obs = tech.id
      ? this.http.put(`/technicians/${tech.id}`, tech)
      : this.http.post('/technicians', tech);

    obs.subscribe({
      next: (_res: any) => {
        this.cancelEdit();
        this.loadTechnicians();
      },
      error: (err: any) => {
        this.error.set(err.message || 'Failed to save technician');
      },
    });
  }

  deactivate(tech: Technician) {
    if (!confirm(`Deactivate technician "${tech.name}"?`)) return;
    this.http.put(`/technicians/${tech.id}`, { ...tech, is_active: false }).subscribe({
      next: (_res: any) => this.loadTechnicians(),
      error: (err: any) => {
        this.error.set(err.message || 'Failed to deactivate technician');
      },
    });
  }

  loadWorkload() {
    if (!this.workloadDate) return;
    const date = this.workloadDate.toISOString().split('T')[0];
    this.adminApi.getWorkload(date).subscribe({
      next: (res: any[]) => this.workload.set(res),
      error: (err: any) => {
        this.error.set(err.message || 'Failed to load workload');
      },
    });
  }
}
