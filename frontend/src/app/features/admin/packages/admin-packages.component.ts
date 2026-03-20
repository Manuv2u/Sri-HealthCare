import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { Package } from '../../../core/api/api.types';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner.component';
import { ErrorBannerComponent } from '../../../shared/components/error-banner.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state.component';

@Component({
  selector: 'app-admin-packages',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCardModule,
    LoadingSpinnerComponent,
    ErrorBannerComponent,
    EmptyStateComponent,
  ],
  template: `
    <div class="packages-container">
      <div class="header">
        <h1>Packages Management</h1>
        <button mat-raised-button color="primary" (click)="startCreate()">
          <mat-icon>add</mat-icon> Add Package
        </button>
      </div>

      @if (loading()) {
        <app-loading-spinner />
      } @else if (error()) {
        <app-error-banner [message]="error()!" retryLabel="Retry" (retry)="loadPackages()" />
      } @else {
        @if (editMode()) {
          <mat-card class="edit-form">
            <mat-card-header>
              <mat-card-title>{{ editingPackage()?.id ? 'Edit Package' : 'Create Package' }}</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <div class="form-grid">
                <mat-form-field>
                  <mat-label>Name</mat-label>
                  <input matInput [(ngModel)]="editingPackage()!.name" required>
                </mat-form-field>

                <mat-form-field>
                  <mat-label>Description</mat-label>
                  <input matInput [(ngModel)]="editingPackage()!.description">
                </mat-form-field>

                <mat-form-field>
                  <mat-label>Price</mat-label>
                  <input matInput type="number" [(ngModel)]="editingPackage()!.price" required>
                </mat-form-field>

                <mat-form-field>
                  <mat-label>Discount %</mat-label>
                  <input matInput type="number" [(ngModel)]="editingPackage()!.discount_percent">
                </mat-form-field>
              </div>

              <div class="actions">
                <button mat-button (click)="cancelEdit()">Cancel</button>
                <button mat-raised-button color="primary" (click)="savePackage()">Save</button>
              </div>
            </mat-card-content>
          </mat-card>
        }

        @if (packages().length === 0) {
          <app-empty-state message="No packages found" ctaLabel="Add Package" (ctaClick)="startCreate()" />
        } @else {
          <table mat-table [dataSource]="packages()">
            <ng-container matColumnDef="name">
              <th mat-header-cell *matHeaderCellDef>Name</th>
              <td mat-cell *matCellDef="let pkg">{{ pkg.name }}</td>
            </ng-container>

            <ng-container matColumnDef="price">
              <th mat-header-cell *matHeaderCellDef>Price</th>
              <td mat-cell *matCellDef="let pkg">₹{{ pkg.price }}</td>
            </ng-container>

            <ng-container matColumnDef="discount_percent">
              <th mat-header-cell *matHeaderCellDef>Discount %</th>
              <td mat-cell *matCellDef="let pkg">{{ pkg.discount_percent }}%</td>
            </ng-container>

            <ng-container matColumnDef="is_active">
              <th mat-header-cell *matHeaderCellDef>Active</th>
              <td mat-cell *matCellDef="let pkg">{{ pkg.is_active ? 'Yes' : 'No' }}</td>
            </ng-container>

            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef>Actions</th>
              <td mat-cell *matCellDef="let pkg">
                <button mat-icon-button (click)="startEdit(pkg)">
                  <mat-icon>edit</mat-icon>
                </button>
                <button mat-stroked-button [color]="pkg.is_active ? 'warn' : 'primary'" (click)="toggleActive(pkg)">
                  {{ pkg.is_active ? 'Disable' : 'Enable' }}
                </button>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
          </table>
        }
      }
    </div>
  `,
  styles: [`
    .packages-container {
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
  `],
})
export class AdminPackagesComponent implements OnInit {
  displayedColumns = ['name', 'price', 'discount_percent', 'is_active', 'actions'];

  loading = signal(false);
  error = signal<string | null>(null);
  packages = signal<Package[]>([]);
  editMode = signal(false);
  editingPackage = signal<Partial<Package> | null>(null);

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.loadPackages();
  }

  loadPackages() {
    this.loading.set(true);
    this.error.set(null);
    this.http.get<any>('/packages').subscribe({
      next: (res) => {
        this.packages.set(res.items ?? res);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.message || 'Failed to load packages');
        this.loading.set(false);
      },
    });
  }

  startCreate() {
    this.editingPackage.set({ name: '', description: '', price: 0, discount_percent: 0, is_active: true });
    this.editMode.set(true);
  }

  startEdit(pkg: Package) {
    this.editingPackage.set({ ...pkg });
    this.editMode.set(true);
  }

  cancelEdit() {
    this.editMode.set(false);
    this.editingPackage.set(null);
  }

  savePackage() {
    const pkg = this.editingPackage();
    if (!pkg) return;

    const obs = pkg.id
      ? this.http.put(`/packages/${pkg.id}`, pkg)
      : this.http.post('/packages', pkg);

    obs.subscribe({
      next: () => {
        this.cancelEdit();
        this.loadPackages();
      },
      error: (err) => {
        this.error.set(err.message || 'Failed to save package');
      },
    });
  }

  toggleActive(pkg: Package) {
    this.http.put(`/packages/${pkg.id}`, { ...pkg, is_active: !pkg.is_active }).subscribe({
      next: () => this.loadPackages(),
      error: (err) => {
        this.error.set(err.message || 'Failed to update package');
      },
    });
  }
}
