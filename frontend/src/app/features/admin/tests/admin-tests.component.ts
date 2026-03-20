import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { TestApiService } from '../../../core/api/services/test-api.service';
import { Test } from '../../../core/api/api.types';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner.component';
import { ErrorBannerComponent } from '../../../shared/components/error-banner.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state.component';

@Component({
  selector: 'app-admin-tests',
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
    <div class="tests-container">
      <div class="header">
        <h1>Tests Management</h1>
        <button mat-raised-button color="primary" (click)="startCreate()">
          <mat-icon>add</mat-icon> Add Test
        </button>
      </div>

      @if (loading()) {
        <app-loading-spinner />
      } @else if (error()) {
        <app-error-banner [message]="error()!" retryLabel="Retry" (retry)="loadTests()" />
      } @else {
        @if (editMode()) {
          <mat-card class="edit-form">
            <mat-card-header>
              <mat-card-title>{{ editingTest()?.id ? 'Edit Test' : 'Create Test' }}</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <div class="form-grid">
                <mat-form-field>
                  <mat-label>Name</mat-label>
                  <input matInput [(ngModel)]="editingTest()!.name" required>
                </mat-form-field>

                <mat-form-field>
                  <mat-label>Category</mat-label>
                  <input matInput [(ngModel)]="editingTest()!.category" required>
                </mat-form-field>

                <mat-form-field>
                  <mat-label>Price</mat-label>
                  <input matInput type="number" [(ngModel)]="editingTest()!.price" required>
                </mat-form-field>

                <mat-form-field>
                  <mat-label>Discount %</mat-label>
                  <input matInput type="number" [(ngModel)]="editingTest()!.discount_percent">
                </mat-form-field>

                <mat-form-field>
                  <mat-label>Active</mat-label>
                  <mat-select [(ngModel)]="editingTest()!.is_active">
                    <mat-option [value]="true">Yes</mat-option>
                    <mat-option [value]="false">No</mat-option>
                  </mat-select>
                </mat-form-field>
              </div>

              <div class="actions">
                <button mat-button (click)="cancelEdit()">Cancel</button>
                <button mat-raised-button color="primary" (click)="saveTest()">Save</button>
              </div>
            </mat-card-content>
          </mat-card>
        }

        @if (tests().length === 0) {
          <app-empty-state message="No tests found" ctaLabel="Add Test" (ctaClick)="startCreate()" />
        } @else {
          <table mat-table [dataSource]="tests()">
            <ng-container matColumnDef="name">
              <th mat-header-cell *matHeaderCellDef>Name</th>
              <td mat-cell *matCellDef="let test">{{ test.name }}</td>
            </ng-container>

            <ng-container matColumnDef="category">
              <th mat-header-cell *matHeaderCellDef>Category</th>
              <td mat-cell *matCellDef="let test">{{ test.category }}</td>
            </ng-container>

            <ng-container matColumnDef="price">
              <th mat-header-cell *matHeaderCellDef>Price</th>
              <td mat-cell *matCellDef="let test">₹{{ test.price }}</td>
            </ng-container>

            <ng-container matColumnDef="discount_percent">
              <th mat-header-cell *matHeaderCellDef>Discount %</th>
              <td mat-cell *matCellDef="let test">{{ test.discount_percent }}%</td>
            </ng-container>

            <ng-container matColumnDef="is_active">
              <th mat-header-cell *matHeaderCellDef>Active</th>
              <td mat-cell *matCellDef="let test">{{ test.is_active ? 'Yes' : 'No' }}</td>
            </ng-container>

            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef>Actions</th>
              <td mat-cell *matCellDef="let test">
                <button mat-icon-button (click)="startEdit(test)">
                  <mat-icon>edit</mat-icon>
                </button>
                <button mat-icon-button color="warn" (click)="deleteTest(test)">
                  <mat-icon>delete</mat-icon>
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
    .tests-container {
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
export class AdminTestsComponent implements OnInit {
  displayedColumns = ['name', 'category', 'price', 'discount_percent', 'is_active', 'actions'];

  loading = signal(false);
  error = signal<string | null>(null);
  tests = signal<Test[]>([]);
  editMode = signal(false);
  editingTest = signal<Partial<Test> | null>(null);

  constructor(private testApi: TestApiService) {}

  ngOnInit() {
    this.loadTests();
  }

  loadTests() {
    this.loading.set(true);
    this.error.set(null);
    this.testApi.list({ page_size: 1000 }).subscribe({
      next: (res) => {
        this.tests.set(res.items);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.message || 'Failed to load tests');
        this.loading.set(false);
      },
    });
  }

  startCreate() {
    this.editingTest.set({ name: '', category: '', price: 0, discount_percent: 0, is_active: true });
    this.editMode.set(true);
  }

  startEdit(test: Test) {
    this.editingTest.set({ ...test });
    this.editMode.set(true);
  }

  cancelEdit() {
    this.editMode.set(false);
    this.editingTest.set(null);
  }

  saveTest() {
    const test = this.editingTest();
    if (!test) return;

    const obs = test.id
      ? this.testApi.update(test.id, test)
      : this.testApi.create(test);

    obs.subscribe({
      next: () => {
        this.cancelEdit();
        this.loadTests();
      },
      error: (err) => {
        this.error.set(err.message || 'Failed to save test');
      },
    });
  }

  deleteTest(test: Test) {
    if (!confirm(`Delete test "${test.name}"?`)) return;

    this.testApi.delete(test.id).subscribe({
      next: () => this.loadTests(),
      error: (err) => {
        this.error.set(err.message || 'Failed to delete test');
      },
    });
  }
}
