import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { BookingApiService } from '../../../core/api/services/booking-api.service';
import { AuthStateService } from '../../../core/auth/auth-state.service';
import { Booking } from '../../../core/api/api.types';
import { 
  CardComponent, BadgeComponent, ButtonComponent, 
  StatCardComponent, EmptyStateComponent, SpinnerComponent 
} from '../../../shared/components';

@Component({
  selector: 'app-patient-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    CardComponent,
    BadgeComponent,
    ButtonComponent,
    StatCardComponent,
    EmptyStateComponent,
    SpinnerComponent
  ],
  template: `
    <div class="dashboard">
      <!-- Welcome Section -->
      <section class="dashboard__welcome">
        <div class="welcome__content">
          <p class="welcome__date">{{ todayDate }}</p>
          <h1 class="welcome__title">{{ greeting }}, {{ firstName() }}</h1>
          <p class="welcome__subtitle">Here's your health activity summary</p>
        </div>
        <a routerLink="/booking" class="welcome__cta">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          <span>Book a Test</span>
        </a>
      </section>

      <!-- Stats Grid -->
      <section class="dashboard__stats">
        <div class="stat-card stat-card--primary">
          <div class="stat-card__icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          </div>
          <div class="stat-card__content">
            <span class="stat-card__value">{{ totalBookings() }}</span>
            <span class="stat-card__label">Total Bookings</span>
          </div>
        </div>
        
        <div class="stat-card stat-card--warning">
          <div class="stat-card__icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
          </div>
          <div class="stat-card__content">
            <span class="stat-card__value">{{ upcomingBookings() }}</span>
            <span class="stat-card__label">Upcoming</span>
          </div>
        </div>
        
        <div class="stat-card stat-card--success">
          <div class="stat-card__icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          </div>
          <div class="stat-card__content">
            <span class="stat-card__value">{{ completedBookings() }}</span>
            <span class="stat-card__label">Completed</span>
          </div>
        </div>
        
        <div class="stat-card stat-card--info">
          <div class="stat-card__icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
          </div>
          <div class="stat-card__content">
            <span class="stat-card__value">{{ reportsReady() }}</span>
            <span class="stat-card__label">Reports Ready</span>
          </div>
        </div>
      </section>

      <!-- Main Content Grid -->
      <div class="dashboard__grid">
        <!-- Recent Bookings -->
        <section class="dashboard__section dashboard__section--bookings">
          <div class="section__header">
            <h2 class="section__title">Recent Bookings</h2>
            <a routerLink="/dashboard/bookings" class="section__link">View All</a>
          </div>
          
          @if (loading()) {
            <div class="section__loading">
              <app-spinner size="md" />
            </div>
          } @else if (recentBookings().length === 0) {
            <app-empty-state
              title="No bookings yet"
              description="Book your first health test today"
              icon="calendar"
            >
              <app-button routerLink="/booking">Book a Test</app-button>
            </app-empty-state>
          } @else {
            <div class="booking-list">
              @for (booking of recentBookings(); track booking.id) {
                <a [routerLink]="['/dashboard/bookings', booking.id]" class="booking-card">
                  <div class="booking-card__header">
                    <span class="booking-card__ref">#{{ booking.reference_number }}</span>
                    <app-badge [variant]="getStatusVariant(booking.status)" [dot]="true">
                      {{ formatStatus(booking.status) }}
                    </app-badge>
                  </div>
                  <div class="booking-card__body">
                    <div class="booking-card__tests">
                      {{ getTestNames(booking) }}
                    </div>
                    <div class="booking-card__meta">
                      <span class="booking-card__date">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                          <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
                          <line x1="3" y1="10" x2="21" y2="10"/>
                        </svg>
                        {{ formatDate(booking.booking_date) }}
                      </span>
                      <span class="booking-card__type">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          @if (booking.collection_type === 'home') {
                            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
                            <polyline points="9 22 9 12 15 12 15 22"/>
                          } @else {
                            <rect x="4" y="2" width="16" height="20" rx="2" ry="2"/>
                            <path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/>
                          }
                        </svg>
                        {{ booking.collection_type === 'home' ? 'Home' : 'Lab' }}
                      </span>
                    </div>
                  </div>
                  <div class="booking-card__footer">
                    <span class="booking-card__amount">₹{{ booking.total_amount }}</span>
                    <svg class="booking-card__arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                  </div>
                </a>
              }
            </div>
          }
        </section>

        <!-- Quick Actions -->
        <section class="dashboard__section dashboard__section--actions">
          <div class="section__header">
            <h2 class="section__title">Quick Actions</h2>
          </div>
          
          <div class="quick-actions">
            <a routerLink="/booking" class="quick-action quick-action--primary">
              <div class="quick-action__icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
              </div>
              <span class="quick-action__label">Book Test</span>
            </a>
            
            <a routerLink="/reports" class="quick-action">
              <div class="quick-action__icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                </svg>
              </div>
              <span class="quick-action__label">View Reports</span>
            </a>
            
            <a routerLink="/profile/family" class="quick-action">
              <div class="quick-action__icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
                </svg>
              </div>
              <span class="quick-action__label">Family</span>
            </a>
            
            <a routerLink="/tests" class="quick-action">
              <div class="quick-action__icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
              </div>
              <span class="quick-action__label">Browse Tests</span>
            </a>
            
            <a routerLink="/packages" class="quick-action">
              <div class="quick-action__icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/>
                  <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
                </svg>
              </div>
              <span class="quick-action__label">Packages</span>
            </a>
            
            <a routerLink="/profile" class="quick-action">
              <div class="quick-action__icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/>
                </svg>
              </div>
              <span class="quick-action__label">Settings</span>
            </a>
          </div>
        </section>
      </div>
    </div>
  `,
  styles: [`
    .dashboard {
      padding: 1.5rem;
      max-width: 1400px;
      margin: 0 auto;

      @media (max-width: 768px) {
        padding: 1rem;
      }
    }

    /* Welcome Section */
    .dashboard__welcome {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
      padding: 1.5rem;
      background: linear-gradient(135deg, #2C7A7B 0%, #285E61 100%);
      border-radius: 1rem;
      color: #FFFFFF;

      @media (max-width: 768px) {
        flex-direction: column;
        align-items: flex-start;
        gap: 1rem;
      }
    }

    .welcome__date {
      font-size: 0.875rem;
      opacity: 0.85;
      margin-bottom: 0.25rem;
    }

    .welcome__title {
      font-family: 'Plus Jakarta Sans','Inter',-apple-system,sans-serif;
      font-size: 1.5rem;
      font-weight: 700;
      margin: 0 0 0.25rem 0;

      @media (max-width: 768px) {
        font-size: 1.25rem;
      }
    }

    .welcome__subtitle {
      font-size: 1rem;
      opacity: 0.9;
      margin: 0;
    }

    .welcome__cta {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1.25rem;
      background: #FFFFFF;
      color: #285E61;
      border-radius: 0.75rem;
      font-weight: 600;
      font-size: 0.875rem;
      text-decoration: none;
      transition: all 200ms cubic-bezier(0.4,0,0.2,1);
      box-shadow: 0 1px 3px 0 rgba(0,0,0,.1),0 1px 2px -1px rgba(0,0,0,.1);

      svg {
        width: 18px;
        height: 18px;
      }

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 6px -1px rgba(0,0,0,.1),0 2px 4px -2px rgba(0,0,0,.1);
      }

      @media (max-width: 768px) {
        width: 100%;
        justify-content: center;
      }
    }

    /* Stats Section */
    .dashboard__stats {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1rem;
      margin-bottom: 2rem;

      @media (max-width: 1024px) {
        grid-template-columns: repeat(2, 1fr);
      }

      @media (max-width: 640px) {
        grid-template-columns: 1fr;
      }
    }

    .stat-card {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1.25rem;
      background: #FFFFFF;
      border-radius: 1rem;
      border: 1px solid #F1F5F9;
      transition: all 200ms cubic-bezier(0.4,0,0.2,1);

      &:hover {
        border-color: #E2E8F0;
        box-shadow: 0 1px 3px 0 rgba(0,0,0,.1),0 1px 2px -1px rgba(0,0,0,.1);
      }
    }

    .stat-card__icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 48px;
      height: 48px;
      border-radius: 0.75rem;
      flex-shrink: 0;

      svg {
        width: 24px;
        height: 24px;
      }
    }

    .stat-card--primary .stat-card__icon {
      background: #E6FFFA;
      color: #2C7A7B;
    }

    .stat-card--warning .stat-card__icon {
      background: #FFFBEB;
      color: #D97706;
    }

    .stat-card--success .stat-card__icon {
      background: #F0FFF4;
      color: #2F855A;
    }

    .stat-card--info .stat-card__icon {
      background: #F0F9FF;
      color: #0284C7;
    }

    .stat-card__content {
      display: flex;
      flex-direction: column;
      gap: 0.125rem;
    }

    .stat-card__value {
      font-family: 'Plus Jakarta Sans','Inter',-apple-system,sans-serif;
      font-size: 1.5rem;
      font-weight: 700;
      color: #0F172A;
      line-height: 1.25;
    }

    .stat-card__label {
      font-size: 0.875rem;
      color: #475569;
    }

    /* Main Grid */
    .dashboard__grid {
      display: grid;
      grid-template-columns: 1fr 320px;
      gap: 1.5rem;

      @media (max-width: 1024px) {
        grid-template-columns: 1fr;
      }
    }

    .dashboard__section {
      background: #FFFFFF;
      border-radius: 1rem;
      border: 1px solid #F1F5F9;
      overflow: hidden;
    }

    .section__header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.25rem 1.25rem 1rem;
      border-bottom: 1px solid #F1F5F9;
    }

    .section__title {
      font-size: 1.125rem;
      font-weight: 600;
      color: #0F172A;
      margin: 0;
    }

    .section__link {
      font-size: 0.875rem;
      font-weight: 500;
      color: #2C7A7B;
      text-decoration: none;
      transition: color 150ms;

      &:hover {
        color: #285E61;
      }
    }

    .section__loading {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 200px;
    }

    /* Booking List */
    .booking-list {
      display: flex;
      flex-direction: column;
    }

    .booking-card {
      display: flex;
      flex-direction: column;
      padding: 1rem 1.25rem;
      text-decoration: none;
      border-bottom: 1px solid #F1F5F9;
      transition: background 150ms;

      &:last-child {
        border-bottom: none;
      }

      &:hover {
        background: #F8FAFC;
      }
    }

    .booking-card__header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.5rem;
    }

    .booking-card__ref {
      font-family: 'JetBrains Mono','SF Mono','Fira Code',monospace;
      font-size: 0.875rem;
      font-weight: 500;
      color: #0F172A;
    }

    .booking-card__tests {
      font-size: 1rem;
      color: #0F172A;
      margin-bottom: 0.5rem;
      font-weight: 500;
    }

    .booking-card__meta {
      display: flex;
      gap: 1rem;
      margin-bottom: 0.75rem;
    }

    .booking-card__date,
    .booking-card__type {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      font-size: 0.875rem;
      color: #475569;

      svg {
        width: 14px;
        height: 14px;
        opacity: 0.7;
      }
    }

    .booking-card__footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .booking-card__amount {
      font-size: 1rem;
      font-weight: 600;
      color: #0F172A;
    }

    .booking-card__arrow {
      width: 18px;
      height: 18px;
      color: #94A3B8;
      transition: transform 150ms;

      .booking-card:hover & {
        transform: translateX(4px);
        color: #2C7A7B;
      }
    }

    /* Quick Actions */
    .quick-actions {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 0.75rem;
      padding: 1rem;
    }

    .quick-action {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
      padding: 1rem;
      border-radius: 0.75rem;
      text-decoration: none;
      background: #F8FAFC;
      border: 1px solid transparent;
      transition: all 200ms cubic-bezier(0.4,0,0.2,1);

      &:hover {
        background: #F1F5F9;
        border-color: #E2E8F0;
        transform: translateY(-2px);
      }
    }

    .quick-action--primary {
      background: #E6FFFA;
      border-color: #B2F5EA;

      .quick-action__icon {
        background: #2C7A7B;
        color: #FFFFFF;
      }

      &:hover {
        background: #B2F5EA;
        border-color: #81E6D9;
      }
    }

    .quick-action__icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 44px;
      height: 44px;
      border-radius: 0.75rem;
      background: #E2E8F0;
      color: #475569;
      transition: all 150ms;

      svg {
        width: 20px;
        height: 20px;
      }

      .quick-action:hover & {
        background: #2C7A7B;
        color: #FFFFFF;
      }
    }

    .quick-action__label {
      font-size: 0.875rem;
      font-weight: 500;
      color: #0F172A;
      text-align: center;
    }

    /* Responsive adjustments */
    @media (max-width: 1024px) {
      .dashboard__section--actions {
        order: -1;
      }

      .quick-actions {
        grid-template-columns: repeat(3, 1fr);
      }
    }

    @media (max-width: 640px) {
      .quick-actions {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    /* Reduced motion */
    @media (prefers-reduced-motion: reduce) {
      .welcome__cta,
      .stat-card,
      .booking-card,
      .booking-card__arrow,
      .quick-action,
      .quick-action__icon {
        transition: none;
      }

      .welcome__cta:hover,
      .quick-action:hover {
        transform: none;
      }
    }
  `]
})
export class PatientDashboardComponent implements OnInit {
  private bookingApi = inject(BookingApiService);
  private authState = inject(AuthStateService);

  /* State */
  loading = signal(true);
  bookings = signal<Booking[]>([]);
  error = signal<string | null>(null);

  /* Computed properties */
  firstName = computed(() => {
    const user = this.authState.currentUser();
    if (!user?.name) return 'there';
    return user.name.split(' ')[0];
  });

  totalBookings = computed(() => this.bookings().length);

  upcomingBookings = computed(() => 
    this.bookings().filter(b => 
      ['pending', 'confirmed', 'sample_collected'].includes(b.status)
    ).length
  );

  completedBookings = computed(() => 
    this.bookings().filter(b => b.status === 'completed').length
  );

  reportsReady = computed(() => 
    this.bookings().filter(b => b.status === 'completed').length
  );

  recentBookings = computed(() => 
    this.bookings()
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5)
  );

  /* Date and greeting */
  todayDate = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  get greeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }

  ngOnInit(): void {
    this.loadBookings();
  }

  private loadBookings(): void {
    this.loading.set(true);
    this.bookingApi.list({ page: 1, page_size: 50 }).subscribe({
      next: (response) => {
        this.bookings.set(response.items);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Failed to load bookings:', err);
        this.error.set('Failed to load bookings');
        this.loading.set(false);
      }
    });
  }

  getStatusVariant(status: string): 'default' | 'success' | 'warning' | 'error' | 'info' {
    const map: Record<string, 'default' | 'success' | 'warning' | 'error' | 'info'> = {
      pending: 'warning',
      confirmed: 'info',
      sample_collected: 'info',
      processing: 'info',
      completed: 'success',
      cancelled: 'error'
    };
    return map[status] || 'default';
  }

  formatStatus(status: string): string {
    const map: Record<string, string> = {
      pending: 'Pending',
      confirmed: 'Confirmed',
      sample_collected: 'Sample Collected',
      processing: 'Processing',
      completed: 'Completed',
      cancelled: 'Cancelled'
    };
    return map[status] || status;
  }

  getTestNames(booking: Booking): string {
    if (!booking.items || booking.items.length === 0) {
      return 'No tests';
    }
    const names = booking.items.map(item => item.item_name);
    if (names.length <= 2) {
      return names.join(', ');
    }
    return `${names[0]}, ${names[1]} +${names.length - 2} more`;
  }

  formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }
}
