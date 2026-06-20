import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCardModule } from '@angular/material/card';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { LabBranch } from '../../../core/api/api.types';
import { LabBranchApiService } from '../../../core/api/services/lab-branch-api.service';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner.component';
import { ErrorBannerComponent } from '../../../shared/components/error-banner.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state.component';

@Component({
  selector: 'app-admin-lab-branches',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatTableModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatCardModule,
    MatSlideToggleModule, MatSnackBarModule,
    LoadingSpinnerComponent, ErrorBannerComponent, EmptyStateComponent,
  ],
  template: `
    <div class="container">
      <div class="page-header">
        <h1>Lab Branches</h1>
        <button mat-raised-button color="primary" (click)="openForm()">
          <mat-icon>add</mat-icon> Add Branch
        </button>
      </div>

      @if (loading()) { <app-loading-spinner /> }
      @else if (error()) { <app-error-banner [message]="error()!" retryLabel="Retry" (retry)="load()" /> }
      @else {
        @if (showForm()) {
          <mat-card class="form-card">
            <mat-card-header>
              <mat-card-title>{{ editingId() ? 'Edit Branch' : 'New Branch' }}</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <p class="form-hint">Fields marked <span class="req-star">*</span> are required.</p>
              <form [formGroup]="form" (ngSubmit)="save()" class="branch-form">
                <mat-form-field appearance="outline">
                  <mat-label>Branch Name <span class="req-star">*</span></mat-label>
                  <input matInput formControlName="name" required placeholder="e.g. SRI Diagnostics - Anna Nagar" />
                  <mat-error>Branch name is required</mat-error>
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Address <span class="req-star">*</span></mat-label>
                  <textarea matInput formControlName="address" rows="2" required placeholder="e.g. 12, Main Road, Anna Nagar"></textarea>
                  <mat-error>Address is required</mat-error>
                </mat-form-field>
                <div class="form-row">
                  <mat-form-field appearance="outline">
                    <mat-label>City <span class="req-star">*</span></mat-label>
                    <input matInput formControlName="city" required placeholder="e.g. Chennai" />
                    <mat-error>City is required</mat-error>
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>Pincode <span class="req-star">*</span></mat-label>
                    <input matInput formControlName="pincode" maxlength="6" required placeholder="6-digit code" />
                    <mat-error>Pincode is required</mat-error>
                  </mat-form-field>
                </div>
                <mat-form-field appearance="outline">
                  <mat-label>Phone</mat-label>
                  <input matInput formControlName="phone" placeholder="e.g. 044-12345678" />
                  <mat-hint>Optional</mat-hint>
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Operating Hours</mat-label>
                  <input matInput formControlName="operating_hours" placeholder="e.g. Mon–Sat 7am–8pm" />
                  <mat-hint>Optional</mat-hint>
                </mat-form-field>
                <div class="form-actions">
                  <button mat-button type="button" (click)="cancelForm()">Cancel</button>
                  <button mat-raised-button color="primary" type="submit" [disabled]="form.invalid || saving()">
                    {{ saving() ? 'Saving…' : (editingId() ? 'Update' : 'Create') }}
                  </button>
                </div>
              </form>
            </mat-card-content>
          </mat-card>
        }

        @if (branches().length === 0 && !showForm()) {
          <app-empty-state message="No lab branches yet. Add your first branch." ctaLabel="Add Branch" (ctaClick)="openForm()" />
        } @else if (branches().length > 0) {
          <div class="table-scroll">
            <table mat-table [dataSource]="branches()">
              <ng-container matColumnDef="name">
                <th mat-header-cell *matHeaderCellDef>Name</th>
                <td mat-cell *matCellDef="let b">
                  <strong>{{ b.name }}</strong>
                  <div class="sub">{{ b.operating_hours }}</div>
                </td>
              </ng-container>
              <ng-container matColumnDef="address">
                <th mat-header-cell *matHeaderCellDef>Address</th>
                <td mat-cell *matCellDef="let b">
                  <div>{{ b.address }}</div>
                  <div class="sub">{{ b.city }} – {{ b.pincode }}</div>
                </td>
              </ng-container>
              <ng-container matColumnDef="phone">
                <th mat-header-cell *matHeaderCellDef>Phone</th>
                <td mat-cell *matCellDef="let b">{{ b.phone }}</td>
              </ng-container>
              <ng-container matColumnDef="status">
                <th mat-header-cell *matHeaderCellDef>Active</th>
                <td mat-cell *matCellDef="let b">
                  <mat-slide-toggle [checked]="b.is_active" (change)="toggleStatus(b, $event.checked)" />
                </td>
              </ng-container>
              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef>Actions</th>
                <td mat-cell *matCellDef="let b">
                  <button mat-icon-button color="primary" (click)="startEdit(b)" matTooltip="Edit">
                    <mat-icon>edit</mat-icon>
                  </button>
                  <button mat-icon-button color="warn" (click)="confirmDelete(b)" matTooltip="Delete">
                    <mat-icon>delete</mat-icon>
                  </button>
                </td>
              </ng-container>
              <tr mat-header-row *matHeaderRowDef="cols"></tr>
              <tr mat-row *matRowDef="let row; columns: cols"></tr>
            </table>
          </div>
        }
      }
    </div>
  `,
  styles: [`
    .container { padding: 1.5rem; }
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;
      h1 { margin: 0; font-size: 1.5rem; font-weight: 700; }
    }
    .form-card { margin-bottom: 1.5rem; }
    .form-hint { margin: 0 0 .5rem; font-size: .8rem; color: #718096; }
    .req-star { color: #e53e3e; font-weight: 700; }
    .branch-form { display: flex; flex-direction: column; gap: 1rem; padding-top: .5rem; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .form-actions { display: flex; gap: .75rem; justify-content: flex-end; }
    mat-form-field { width: 100%; }
    table { width: 100%; }
    .sub { font-size: .75rem; color: #718096; margin-top: .1rem; }
    .inactive-row { opacity: .55; }
    @media(max-width:600px) { .form-row { grid-template-columns: 1fr; } }
  `],
})
export class AdminLabBranchesComponent implements OnInit {
  cols = ['name', 'address', 'phone', 'status', 'actions'];

  loading = signal(false);
  saving = signal(false);
  error = signal<string | null>(null);
  branches = signal<LabBranch[]>([]);
  showForm = signal(false);
  editingId = signal<string | null>(null);

  form = this.fb.group({
    name:             ['', Validators.required],
    address:          ['', Validators.required],
    city:             ['', Validators.required],
    pincode:          ['', Validators.required],
    phone:            [''],
    operating_hours:  [''],
  });

  constructor(
    private fb: FormBuilder,
    private api: LabBranchApiService,
    private snack: MatSnackBar,
  ) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.listAdmin().subscribe({
      next: (res: LabBranch[]) => { this.branches.set(res); this.loading.set(false); },
      error: () => { this.error.set('Failed to load lab branches.'); this.loading.set(false); },
    });
  }

  openForm(): void {
    this.editingId.set(null);
    this.form.reset();
    this.showForm.set(true);
  }

  startEdit(b: LabBranch): void {
    this.editingId.set(b.id);
    this.form.patchValue({
      name:            b.name,
      address:         b.address,
      city:            b.city,
      pincode:         b.pincode,
      phone:           b.phone,
      operating_hours: (b as any).operating_hours ?? '',
    });
    this.showForm.set(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cancelForm(): void { this.showForm.set(false); this.editingId.set(null); this.form.reset(); }

  save(): void {
    if (this.form.invalid) return;
    this.saving.set(true);
    const id = this.editingId();
    const payload = this.form.value as Partial<LabBranch>;
    const req$ = id ? this.api.update(id, payload) : this.api.create(payload);
    req$.subscribe({
      next: () => {
        this.snack.open(id ? 'Branch updated.' : 'Branch created.', 'OK', { duration: 3000 });
        this.saving.set(false);
        this.cancelForm();
        this.load();
      },
      error: () => { this.snack.open('Failed to save branch.', 'OK', { duration: 3000 }); this.saving.set(false); },
    });
  }

  toggleStatus(b: LabBranch, active: boolean): void {
    this.api.update(b.id, { ...b, is_active: active }).subscribe({
      next: () => this.load(),
      error: () => this.snack.open('Failed to update status.', 'OK', { duration: 3000 }),
    });
  }

  confirmDelete(b: LabBranch): void {
    if (!confirm(`Delete "${b.name}"? This cannot be undone.`)) return;
    this.api.delete(b.id).subscribe({
      next: () => { this.snack.open('Branch deleted.', 'OK', { duration: 3000 }); this.load(); },
      error: () => this.snack.open('Failed to delete branch.', 'OK', { duration: 3000 }),
    });
  }
}
