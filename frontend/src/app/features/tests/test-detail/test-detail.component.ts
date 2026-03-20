import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { TestApiService } from '../../../core/api/services/test-api.service';
import { Test } from '../../../core/api/api.types';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner.component';
import { ErrorBannerComponent } from '../../../shared/components/error-banner.component';

@Component({
  selector: 'app-test-detail',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatCardModule, LoadingSpinnerComponent, ErrorBannerComponent],
  template: `
    <div class="container">
      <app-loading-spinner *ngIf="loading()" />
      <app-error-banner *ngIf="error()" [message]="error()!" />

      <mat-card *ngIf="test()">
        <mat-card-header>
          <mat-card-title>{{ test()!.name }}</mat-card-title>
          <mat-card-subtitle>{{ test()!.category }}</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <p *ngIf="test()!.description">{{ test()!.description }}</p>
          <p>Turnaround: {{ test()!.turnaround_hours }} hours</p>
          <div class="price">
            <span *ngIf="test()!.discount_percent > 0" class="original">₹{{ test()!.price }}</span>
            <span class="effective">₹{{ test()!.effective_price }}</span>
            <span *ngIf="test()!.discount_percent > 0" class="discount">{{ test()!.discount_percent }}% off</span>
          </div>
        </mat-card-content>
        <mat-card-actions>
          <button mat-raised-button color="primary" (click)="addToBooking()">Add to Booking</button>
          <button mat-button (click)="router.navigate(['/tests'])">Back</button>
        </mat-card-actions>
      </mat-card>
    </div>
  `,
  styles: [`
    .container { max-width: 600px; margin: 2rem auto; padding: 1rem; }
    .price { display: flex; align-items: center; gap: 0.5rem; margin-top: 0.5rem; }
    .original { text-decoration: line-through; color: #999; }
    .effective { font-weight: bold; font-size: 1.2rem; }
    .discount { color: green; }
  `],
})
export class TestDetailComponent implements OnInit {
  test = signal<Test | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);

  constructor(
    private route: ActivatedRoute,
    public router: Router,
    private testApi: TestApiService,
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.testApi.get(id).subscribe({
      next: (t) => { this.test.set(t); this.loading.set(false); },
      error: () => { this.error.set('Test not found.'); this.loading.set(false); },
    });
  }

  addToBooking(): void {
    this.router.navigate(['/booking'], { queryParams: { test_id: this.test()?.id } });
  }
}
