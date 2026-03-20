import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { Router } from '@angular/router';
import { PackageApiService } from '../../../core/api/services/package-api.service';
import { Package } from '../../../core/api/api.types';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner.component';
import { ErrorBannerComponent } from '../../../shared/components/error-banner.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state.component';

@Component({
  selector: 'app-packages-list',
  standalone: true,
  imports: [
    CommonModule, MatCardModule, MatButtonModule, MatChipsModule,
    LoadingSpinnerComponent, ErrorBannerComponent, EmptyStateComponent,
  ],
  template: `
    <div class="container">
      <h2>Health Packages</h2>
      <app-loading-spinner *ngIf="loading()" />
      <app-error-banner *ngIf="error()" [message]="error()!" [retryLabel]="'Retry'" (retry)="load()" />
      <app-empty-state *ngIf="!loading() && packages().length === 0" message="No packages available." />

      <div class="grid">
        <mat-card *ngFor="let p of packages()" class="pkg-card">
          <mat-card-header>
            <mat-card-title>{{ p.name }}</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <p *ngIf="p.description">{{ p.description }}</p>
            <div class="tests">
              <mat-chip *ngFor="let t of p.tests">{{ t.name }}</mat-chip>
            </div>
            <div class="price">
              <span *ngIf="p.original_price > p.discounted_price" class="original">₹{{ p.original_price }}</span>
              <span class="effective">₹{{ p.discounted_price }}</span>
              <span *ngIf="p.original_price > p.discounted_price" class="discount">{{ discountPct(p) }}% off</span>
            </div>
          </mat-card-content>
          <mat-card-actions>
            <button mat-raised-button color="primary" (click)="book(p)">Book Package</button>
          </mat-card-actions>
        </mat-card>
      </div>
    </div>
  `,
  styles: [`
    .container { max-width: 900px; margin: 2rem auto; padding: 1rem; display: flex; flex-direction: column; gap: 1rem; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem; }
    .tests { display: flex; flex-wrap: wrap; gap: 0.25rem; margin: 0.5rem 0; }
    .price { display: flex; align-items: center; gap: 0.5rem; }
    .original { text-decoration: line-through; color: #999; }
    .effective { font-weight: bold; font-size: 1.1rem; }
    .discount { color: green; font-size: 0.85rem; }
  `],
})
export class PackagesListComponent implements OnInit {
  packages = signal<Package[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  constructor(private packageApi: PackageApiService, private router: Router) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.packageApi.list().subscribe({
      next: (res) => { this.packages.set(res.items); this.loading.set(false); },
      error: () => { this.error.set('Failed to load packages.'); this.loading.set(false); },
    });
  }

  discountPct(p: Package): number {
    if (!p.original_price) return 0;
    return Math.round((1 - p.discounted_price / p.original_price) * 100);
  }

  book(p: Package): void {
    this.router.navigate(['/booking'], { queryParams: { package_id: p.id } });
  }
}
