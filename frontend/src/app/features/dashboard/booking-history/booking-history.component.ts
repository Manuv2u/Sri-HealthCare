import { Component, OnInit, signal, computed, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Booking, BookingItem, FamilyMember, Report } from '../../../core/api/api.types';
import { BookingApiService } from '../../../core/api/services/booking-api.service';
import { UserApiService } from '../../../core/api/services/user-api.service';
import { ReportApiService } from '../../../core/api/services/report-api.service';
import { AuthStateService } from '../../../core/auth/auth-state.service';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner.component';
import { ErrorBannerComponent } from '../../../shared/components/error-banner.component';

const CANCELLABLE = new Set(['booked', 'technician_assigned', 'accepted']);

@Component({
  selector: 'app-booking-history',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, MatIconModule, FormsModule, LoadingSpinnerComponent, ErrorBannerComponent],
  template: `
    <div class="sh-root" [class.sidebar-open]="sidebarOpen()">

      <!-- ── SIDEBAR OVERLAY (mobile) ── -->
      <div class="sidebar-overlay" (click)="closeSidebar()"></div>

      <!-- ── SIDEBAR ── -->
      <aside class="sh-sidebar">
        <div class="sb-top">
          <div class="sb-brand">
            <div class="sb-brand-mark">
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                <rect width="28" height="28" rx="8" fill="url(#bg)"/>
                <path d="M14 6v16M6 14h16" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/>
                <defs><linearGradient id="bg" x1="0" y1="0" x2="28" y2="28"><stop stop-color="#6366F1"/><stop offset="1" stop-color="#4F46E5"/></linearGradient></defs>
              </svg>
            </div>
            <div>
              <div class="sb-brand-name">Sri Health</div>
              <div class="sb-brand-sub">Diagnostic Platform</div>
            </div>
          </div>
          <button class="sb-close-btn" (click)="closeSidebar()"><mat-icon>close</mat-icon></button>
        </div>

        <div class="sb-user">
          <div class="sb-avatar">{{ initials() }}</div>
          <div class="sb-user-info">
            <div class="sb-user-name">{{ userName() }}</div>
            <div class="sb-user-id">Patient #{{ shortId() }}</div>
          </div>
        </div>

        <nav class="sb-nav">
          <a routerLink="/dashboard" routerLinkActive="active" [routerLinkActiveOptions]="{exact:true}" class="sb-nav-item" (click)="closeSidebar()">
            <span class="sb-nav-icon"><mat-icon>grid_view</mat-icon></span>
            <span>Dashboard</span>
          </a>
          <a routerLink="/booking" routerLinkActive="active" class="sb-nav-item sb-nav-book" (click)="closeSidebar()">
            <span class="sb-nav-icon"><mat-icon>add_circle_outline</mat-icon></span>
            <span>Book New Test</span>
          </a>
          <a routerLink="/reports" routerLinkActive="active" class="sb-nav-item" (click)="closeSidebar()">
            <span class="sb-nav-icon"><mat-icon>description</mat-icon></span>
            <span>My Reports</span>
          </a>
          <a routerLink="/profile/family" routerLinkActive="active" class="sb-nav-item" (click)="closeSidebar()">
            <span class="sb-nav-icon"><mat-icon>people_outline</mat-icon></span>
            <span>Family Members</span>
          </a>
          <a routerLink="/lab-locations" routerLinkActive="active" class="sb-nav-item" (click)="closeSidebar()">
            <span class="sb-nav-icon"><mat-icon>location_on</mat-icon></span>
            <span>Lab Locations</span>
          </a>
          <a routerLink="/profile" routerLinkActive="active" [routerLinkActiveOptions]="{exact:true}" class="sb-nav-item" (click)="closeSidebar()">
            <span class="sb-nav-icon"><mat-icon>manage_accounts</mat-icon></span>
            <span>Profile & Settings</span>
          </a>
        </nav>

        <div class="sb-footer">
          <div class="sb-footer-badge">
            <mat-icon>verified_user</mat-icon>
            <span>NABL Accredited Labs</span>
          </div>
        </div>
      </aside>

      <!-- ── MAIN ── -->
      <main class="sh-main">

        <!-- Top bar (mobile) -->
        <div class="sh-topbar">
          <button class="topbar-menu-btn" (click)="toggleSidebar()"><mat-icon>menu</mat-icon></button>
          <div class="topbar-brand">Sri Health</div>
          <a routerLink="/booking" class="topbar-book-btn">
            <mat-icon>add</mat-icon>
          </a>
        </div>

        <!-- Greeting Header -->
        <div class="sh-greeting-wrap">
          <div class="greeting-content">
            <div class="greeting-eyebrow">{{ todayDateStr() }}</div>
            <h1 class="greeting-title">{{ greeting() }}, {{ firstName() }}! 👋</h1>
            <p class="greeting-sub">Here's your health activity summary.</p>
          </div>
          <a routerLink="/booking" class="greeting-book-btn">
            <mat-icon>add</mat-icon>
            <span>Book New Test</span>
          </a>
        </div>

        <!-- Stats Row -->
        <div class="stats-row">
          <div class="stat-card stat-indigo">
            <div class="stat-icon-wrap">
              <mat-icon>event_available</mat-icon>
            </div>
            <div class="stat-body">
              <div class="stat-value">{{ total() }}</div>
              <div class="stat-label">Total Bookings</div>
            </div>
            <div class="stat-decor"></div>
          </div>
          <div class="stat-card stat-orange">
            <div class="stat-icon-wrap">
              <mat-icon>pending_actions</mat-icon>
            </div>
            <div class="stat-body">
              <div class="stat-value">{{ activeBookings() }}</div>
              <div class="stat-label">Upcoming</div>
            </div>
            <div class="stat-decor"></div>
          </div>
          <div class="stat-card stat-emerald">
            <div class="stat-icon-wrap">
              <mat-icon>task_alt</mat-icon>
            </div>
            <div class="stat-body">
              <div class="stat-value">{{ completedBookings() }}</div>
              <div class="stat-label">Completed</div>
            </div>
            <div class="stat-decor"></div>
          </div>
        </div>

        <!-- Content grid -->
        <div class="content-grid">

          <!-- ── Bookings Panel ── -->
          <div class="bookings-panel">
            <div class="panel-header">
              <div>
                <h2 class="panel-title">Recent Bookings</h2>
                <p class="panel-sub">Your latest diagnostic appointments</p>
              </div>
              <a routerLink="/dashboard" class="link-view-all">View all</a>
            </div>

            <!-- Status Filters -->
            <div class="filter-scroll-wrap">
              <div class="filter-pills">
                @for (f of filterOptions; track f.value) {
                  <button class="filter-pill" [class.active]="activeFilter() === f.value" (click)="setFilter(f.value)">
                    {{ f.label }}
                  </button>
                }
              </div>
            </div>

            <app-loading-spinner *ngIf="loading()" />
            <app-error-banner *ngIf="error()" [message]="error()!" [retryLabel]="'Retry'" (retry)="load()" />

            @if (!loading() && !error()) {
              @if (filteredBookings().length === 0) {
                <div class="empty-state">
                  <div class="empty-icon-wrap">
                    <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                      <circle cx="32" cy="32" r="32" fill="#EEF2FF"/>
                      <path d="M20 24h24M20 32h16M20 40h10" stroke="#6366F1" stroke-width="2" stroke-linecap="round"/>
                      <circle cx="46" cy="40" r="8" fill="#F97316" opacity=".15"/>
                      <path d="M43 40h6M46 37v6" stroke="#F97316" stroke-width="1.5" stroke-linecap="round"/>
                    </svg>
                  </div>
                  <div class="empty-text">No bookings found</div>
                  <div class="empty-sub">{{ activeFilter() === 'all' ? 'Start your health journey today.' : 'No bookings with this status.' }}</div>
                  <a routerLink="/tests" class="empty-cta">Book Your First Test</a>
                </div>
              } @else {
                <div class="booking-cards">
                  @for (b of filteredBookings(); track b.id) {
                    <div class="booking-card" [class.expanded]="expandedId() === b.id">
                      <div class="bcard-main" (click)="toggleExpand(b.id)">
                        <div class="bcard-top-row">
                          <span class="bcard-ref">{{ b.reference_number }}</span>
                          <span class="status-pill" [class]="'status-' + statusKey(b.status)">{{ statusLabel(b.status) }}</span>
                        </div>
                        <div class="bcard-name">{{ bookingLabel(b) }}</div>
                        <div class="bcard-meta-row">
                          <span class="bcard-meta-item">
                            <mat-icon>calendar_month</mat-icon>
                            {{ b.booking_date | date:'MMM d, y' }}
                          </span>
                          <span class="bcard-meta-item">
                            <mat-icon>{{ b.collection_type === 'home' ? 'home' : 'local_hospital' }}</mat-icon>
                            {{ b.collection_type === 'home' ? 'Home Collection' : 'Lab Visit' }}
                          </span>
                        </div>
                        <div class="bcard-bottom-row">
                          <div class="bcard-amount">
                            ₹{{ bookingTotal(b) | number:'1.0-0' }}
                          </div>
                          <div class="bcard-actions">
                            <button class="bcard-action-btn bcard-view-btn" (click)="$event.stopPropagation(); toggleExpand(b.id)">
                              <mat-icon>{{ expandedId() === b.id ? 'expand_less' : 'expand_more' }}</mat-icon>
                              {{ expandedId() === b.id ? 'Close' : 'Details' }}
                            </button>
                            @if (b.status === 'completed' || b.status === 'report_uploaded') {
                              @for (r of reports(); track r.id; let first = $first) {
                                @if (first) {
                                  <button class="bcard-action-btn bcard-report-btn" (click)="$event.stopPropagation(); downloadReport(r)">
                                    <mat-icon>download</mat-icon>
                                    Report
                                  </button>
                                }
                              }
                            }
                            @if (isCancellable(b.status)) {
                              <button class="bcard-action-btn bcard-cancel-btn" (click)="$event.stopPropagation(); openCancel(b)">
                                Cancel
                              </button>
                            }
                          </div>
                        </div>
                      </div>

                      <!-- Expanded detail -->
                      @if (expandedId() === b.id) {
                        <div class="bcard-detail">
                          <div class="bcard-detail-title">Booked Items</div>
                          <div class="bcard-items-list">
                            @for (item of (b.items ?? []); track item.id) {
                              <div class="bcard-item-row">
                                <span class="item-type-chip">{{ item.item_type }}</span>
                                <span class="item-row-name">{{ item.item_name || '—' }}</span>
                                <span class="item-row-price">₹{{ item.unit_price | number:'1.0-0' }}</span>
                              </div>
                            }
                            @if (!(b.items?.length)) {
                              <span class="no-items-text">No item details available.</span>
                            }
                          </div>
                          <div class="bcard-detail-footer">
                            <span class="detail-footer-item">
                              Payment: <strong>{{ b.payment_status | titlecase }}</strong>
                            </span>
                            @if (b.cancellation_reason) {
                              <span class="detail-footer-item detail-footer-cancel">
                                Cancelled: <strong>{{ b.cancellation_reason }}</strong>
                              </span>
                            }
                          </div>
                        </div>
                      }
                    </div>
                  }
                </div>
              }
            }
          </div>

          <!-- ── Right Panel ── -->
          <div class="right-col">

            <!-- Reports -->
            <div class="reports-card">
              <div class="panel-header">
                <div>
                  <h2 class="panel-title">Latest Reports</h2>
                  <p class="panel-sub">Download your results</p>
                </div>
                <a routerLink="/reports" class="link-view-all">View all</a>
              </div>

              @if (reportsLoading()) {
                <div class="reports-loading">
                  <div class="loading-pulse"></div>
                  <div class="loading-pulse" style="width:60%"></div>
                  <div class="loading-pulse" style="width:75%"></div>
                </div>
              } @else if (reports().length === 0) {
                <div class="reports-empty">
                  <mat-icon>description</mat-icon>
                  <span>No reports available yet.</span>
                </div>
              } @else {
                <div class="report-list">
                  @for (r of reports(); track r.id; let i = $index) {
                    <div class="report-row">
                      <div class="report-icon-wrap" [class]="reportIconClass(i)">
                        <mat-icon>picture_as_pdf</mat-icon>
                      </div>
                      <div class="report-info">
                        <div class="report-name">{{ r.file_name }}</div>
                        <div class="report-date">{{ r.uploaded_at | date:'MMM d, y' }}</div>
                      </div>
                      <button class="report-dl-btn" (click)="downloadReport(r)" title="Download report">
                        <mat-icon>download</mat-icon>
                      </button>
                    </div>
                  }
                </div>
              }
            </div>

            <!-- Promo Card -->
            <div class="promo-card">
              <div class="promo-inner">
                <div class="promo-eyebrow">LIMITED OFFER</div>
                <h3 class="promo-title">Full Body Wellness Checkup</h3>
                <p class="promo-desc">Early detection saves lives. 80+ parameters, comprehensive screening.</p>
                <div class="promo-price-row">
                  <span class="promo-price-eff">₹149</span>
                  <span class="promo-price-orig">₹299</span>
                  <span class="promo-savings-badge">50% OFF</span>
                </div>
                <a routerLink="/packages" class="promo-cta">Book Special Offer</a>
              </div>
              <div class="promo-art">
                <svg width="80" height="80" viewBox="0 0 80 80" fill="none" opacity=".18">
                  <circle cx="40" cy="40" r="36" stroke="#fff" stroke-width="2"/>
                  <circle cx="40" cy="40" r="24" stroke="#fff" stroke-width="2"/>
                  <path d="M40 16v48M16 40h48" stroke="#fff" stroke-width="2" stroke-linecap="round"/>
                </svg>
              </div>
            </div>

            <!-- Family card -->
            <div class="family-card">
              <div class="family-card-icon"><mat-icon>people</mat-icon></div>
              <div class="family-card-info">
                <div class="family-card-count">{{ familyMemberCount() }} members</div>
                <div class="family-card-label">Family Health Profiles</div>
              </div>
              <a routerLink="/profile/family" class="family-card-link">Manage</a>
            </div>
          </div>
        </div>
      </main>

      <!-- ── FAB (mobile) ── -->
      <a routerLink="/booking" class="sh-fab">
        <mat-icon>add</mat-icon>
      </a>
    </div>

    <!-- ── Cancellation Dialog ── -->
    @if (cancelDialogOpen()) {
      <div class="dialog-backdrop" (click)="closeCancel()">
        <div class="dialog-box" (click)="$event.stopPropagation()">
          <div class="dialog-head">
            <div class="dialog-head-icon">
              <mat-icon>cancel_schedule_send</mat-icon>
            </div>
            <div>
              <h3 class="dialog-title">Cancel Booking</h3>
              <p class="dialog-sub">{{ cancelBooking()?.reference_number }}</p>
            </div>
            <button class="dialog-close-btn" (click)="closeCancel()"><mat-icon>close</mat-icon></button>
          </div>

          @if (cancelFeeInfo()) {
            <div class="fee-notice">
              <mat-icon class="fee-warn-icon">warning_amber</mat-icon>
              <div class="fee-breakdown">
                <div class="fee-notice-title">Cancellation fee applies</div>
                <div class="fee-line">
                  <span>Booking amount</span>
                  <span>₹{{ cancelBookingTotal() | number:'1.0-0' }}</span>
                </div>
                <div class="fee-line fee-line-red">
                  <span>Cancellation fee@if (cancelFeeInfo()!.charge_type === 'percentage') { ({{ cancelFeeInfo()!.charge_value }}%) }</span>
                  <span>−₹{{ cancelFeeAmount() | number:'1.0-0' }}</span>
                </div>
                <div class="fee-line fee-line-bold">
                  <span>Refund amount</span>
                  <span>₹{{ cancelRefundAmount() | number:'1.0-0' }}</span>
                </div>
              </div>
            </div>
          }

          <div class="dialog-body">
            <label class="dlg-label">Reason for cancellation <span class="dlg-required">*</span></label>
            <select [(ngModel)]="cancelReason" class="dlg-select">
              <option value="">Select a reason…</option>
              <option value="Schedule changed">Schedule changed</option>
              <option value="Booked by mistake">Booked by mistake</option>
              <option value="Test no longer required">Test no longer required</option>
              <option value="Found another diagnostic center">Found another diagnostic center</option>
              <option value="Unable to visit">Unable to visit</option>
              <option value="Other">Other</option>
            </select>
            @if (cancelReason === 'Other') {
              <textarea [(ngModel)]="cancelReasonOther" class="dlg-textarea" rows="3"
                placeholder="Please describe your reason…"></textarea>
            }
            @if (cancelError()) {
              <div class="dlg-error">
                <mat-icon>error_outline</mat-icon>
                {{ cancelError() }}
              </div>
            }
          </div>

          <div class="dialog-foot">
            <button class="dlg-btn-ghost" (click)="closeCancel()" [disabled]="cancelling()">Keep Booking</button>
            <button class="dlg-btn-danger" (click)="confirmCancel()" [disabled]="cancelling()">
              {{ cancelling() ? 'Cancelling…' : 'Confirm Cancellation' }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    /* ── TOKENS ─────────────────────────────────────────────────────── */
    :host {
      --c-primary:      #6366F1;
      --c-primary-dk:   #4F46E5;
      --c-primary-lt:   #EEF2FF;
      --c-accent:       #F97316;
      --c-accent-dk:    #EA580C;
      --c-accent-lt:    #FFF7ED;
      --c-success:      #22C55E;
      --c-success-lt:   #DCFCE7;
      --c-warning:      #F59E0B;
      --c-warning-lt:   #FEF3C7;
      --c-error:        #EF4444;
      --c-error-lt:     #FEE2E2;
      --c-purple:       #A855F7;
      --c-purple-lt:    #F3E8FF;
      --c-blue:         #3B82F6;
      --c-blue-lt:      #DBEAFE;
      --c-emerald:      #10B981;
      --c-emerald-lt:   #D1FAE5;
      --c-bg:           #F8F9FF;
      --c-surface:      #FFFFFF;
      --c-text:         #0F172A;
      --c-text-2:       #475569;
      --c-muted:        #94A3B8;
      --c-border:       #E2E8F0;
      --r-sm:           8px;
      --r-md:           12px;
      --r-lg:           16px;
      --r-xl:           20px;
      --r-pill:         999px;
      --sb-width:       240px;
      --topbar-h:       60px;
    }

    /* ── RESET / BASE ─────────────────────────────────────────────── */
    * { box-sizing: border-box; }

    /* ── ROOT LAYOUT ─────────────────────────────────────────────── */
    .sh-root {
      display: flex;
      min-height: 100vh;
      background: var(--c-bg);
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      position: relative;
    }

    /* ── SIDEBAR OVERLAY ─────────────────────────────────────────── */
    .sidebar-overlay {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(15,23,42,.45);
      z-index: 39;
      backdrop-filter: blur(2px);
    }
    .sh-root.sidebar-open .sidebar-overlay { display: block; }

    /* ── SIDEBAR ─────────────────────────────────────────────────── */
    .sh-sidebar {
      width: var(--sb-width);
      min-height: 100vh;
      background: var(--c-surface);
      border-right: 1px solid var(--c-border);
      display: flex;
      flex-direction: column;
      flex-shrink: 0;
      position: sticky;
      top: 0;
      height: 100vh;
      overflow-y: auto;
    }

    .sb-top {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      padding: 1.25rem 1rem 0;
    }
    .sb-brand {
      display: flex;
      align-items: center;
      gap: .6rem;
      padding: .25rem 0 1.25rem;
    }
    .sb-brand-mark {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .sb-brand-name {
      font-size: .95rem;
      font-weight: 800;
      color: var(--c-text);
      letter-spacing: -.01em;
    }
    .sb-brand-sub {
      font-size: .6rem;
      font-weight: 600;
      color: var(--c-muted);
      letter-spacing: .08em;
      text-transform: uppercase;
    }
    .sb-close-btn {
      display: none;
      background: none;
      border: none;
      cursor: pointer;
      color: var(--c-muted);
      padding: .25rem;
      border-radius: var(--r-sm);
      margin-top: .25rem;
      flex-shrink: 0;
    }
    .sb-close-btn:hover { background: var(--c-bg); }

    .sb-user {
      display: flex;
      align-items: center;
      gap: .75rem;
      margin: 0 .75rem .5rem;
      background: var(--c-primary-lt);
      border-radius: var(--r-md);
      padding: .75rem;
    }
    .sb-avatar {
      width: 38px;
      height: 38px;
      border-radius: var(--r-pill);
      background: linear-gradient(135deg, var(--c-primary), var(--c-primary-dk));
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: .85rem;
      font-weight: 700;
      flex-shrink: 0;
      box-shadow: 0 2px 8px rgba(99,102,241,.35);
    }
    .sb-user-name {
      font-size: .85rem;
      font-weight: 700;
      color: var(--c-text);
      line-height: 1.2;
    }
    .sb-user-id {
      font-size: .7rem;
      color: var(--c-muted);
      font-variant-numeric: tabular-nums;
    }

    .sb-nav {
      display: flex;
      flex-direction: column;
      gap: .15rem;
      padding: .5rem .75rem;
      flex: 1;
    }
    .sb-nav-item {
      display: flex;
      align-items: center;
      gap: .65rem;
      padding: .6rem .75rem;
      border-radius: var(--r-md);
      font-size: .875rem;
      font-weight: 500;
      color: var(--c-text-2);
      text-decoration: none;
      transition: background .15s, color .15s;
    }
    .sb-nav-item:hover {
      background: var(--c-bg);
      color: var(--c-text);
      text-decoration: none;
    }
    .sb-nav-item.active {
      background: var(--c-primary-lt);
      color: var(--c-primary);
      font-weight: 600;
    }
    .sb-nav-item.active .sb-nav-icon mat-icon { color: var(--c-primary); }
    .sb-nav-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      flex-shrink: 0;
    }
    .sb-nav-icon mat-icon {
      font-size: 1.1rem;
      width: 1.1rem;
      height: 1.1rem;
      color: var(--c-muted);
    }
    .sb-nav-book {
      background: linear-gradient(135deg, #FFF7ED, #FFEDD5);
      color: var(--c-accent);
      font-weight: 600;
    }
    .sb-nav-book .sb-nav-icon mat-icon { color: var(--c-accent); }
    .sb-nav-book:hover { background: #FFEDD5; color: var(--c-accent-dk); text-decoration: none; }

    .sb-footer {
      padding: 1rem;
      border-top: 1px solid var(--c-border);
    }
    .sb-footer-badge {
      display: flex;
      align-items: center;
      gap: .5rem;
      font-size: .72rem;
      font-weight: 600;
      color: var(--c-success);
      letter-spacing: .02em;
    }
    .sb-footer-badge mat-icon { font-size: .9rem; width: .9rem; height: .9rem; }

    /* ── MAIN ─────────────────────────────────────────────────────── */
    .sh-main {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      padding: 2rem 2rem 5rem;
      max-width: 1100px;
    }

    /* ── TOP BAR (mobile only) ─────────────────────────────────── */
    .sh-topbar {
      display: none;
      align-items: center;
      gap: .75rem;
      padding: .75rem 0;
    }
    .topbar-menu-btn {
      background: none;
      border: none;
      cursor: pointer;
      color: var(--c-text);
      padding: .35rem;
      border-radius: var(--r-sm);
      display: flex;
      align-items: center;
    }
    .topbar-brand {
      flex: 1;
      font-size: 1rem;
      font-weight: 800;
      color: var(--c-text);
      letter-spacing: -.01em;
    }
    .topbar-book-btn {
      width: 34px;
      height: 34px;
      border-radius: var(--r-pill);
      background: var(--c-accent);
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      text-decoration: none;
      box-shadow: 0 2px 8px rgba(249,115,22,.4);
    }
    .topbar-book-btn mat-icon { font-size: 1.1rem; width: 1.1rem; height: 1.1rem; }

    /* ── GREETING ─────────────────────────────────────────────── */
    .sh-greeting-wrap {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      gap: 1rem;
      flex-wrap: wrap;
    }
    .greeting-eyebrow {
      font-size: .75rem;
      font-weight: 600;
      color: var(--c-primary);
      letter-spacing: .06em;
      text-transform: uppercase;
      margin-bottom: .35rem;
    }
    .greeting-title {
      font-size: 1.65rem;
      font-weight: 800;
      color: var(--c-text);
      line-height: 1.2;
      letter-spacing: -.02em;
      margin: 0 0 .3rem;
      text-wrap: balance;
    }
    .greeting-sub {
      font-size: .875rem;
      color: var(--c-text-2);
      margin: 0;
    }
    .greeting-book-btn {
      display: inline-flex;
      align-items: center;
      gap: .45rem;
      background: var(--c-primary);
      color: #fff;
      border-radius: var(--r-pill);
      padding: .6rem 1.25rem;
      font-size: .875rem;
      font-weight: 600;
      text-decoration: none;
      white-space: nowrap;
      box-shadow: 0 4px 14px rgba(99,102,241,.35);
      transition: background .15s, box-shadow .15s, transform .15s;
    }
    .greeting-book-btn mat-icon { font-size: 1rem; width: 1rem; height: 1rem; }
    .greeting-book-btn:hover {
      background: var(--c-primary-dk);
      box-shadow: 0 6px 20px rgba(99,102,241,.45);
      transform: translateY(-1px);
      text-decoration: none;
    }

    /* ── STATS ROW ────────────────────────────────────────────── */
    .stats-row {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1rem;
    }
    .stat-card {
      background: var(--c-surface);
      border-radius: var(--r-lg);
      border: 1px solid var(--c-border);
      padding: 1.1rem 1.25rem;
      display: flex;
      align-items: center;
      gap: .9rem;
      box-shadow: 0 1px 4px rgba(15,23,42,.04);
      position: relative;
      overflow: hidden;
      transition: transform .15s, box-shadow .15s;
    }
    .stat-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 16px rgba(15,23,42,.08);
    }
    .stat-decor {
      position: absolute;
      right: -12px;
      bottom: -12px;
      width: 64px;
      height: 64px;
      border-radius: 50%;
      opacity: .07;
    }
    .stat-icon-wrap {
      width: 44px;
      height: 44px;
      border-radius: var(--r-md);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .stat-icon-wrap mat-icon {
      font-size: 1.3rem;
      width: 1.3rem;
      height: 1.3rem;
    }
    .stat-indigo .stat-icon-wrap { background: var(--c-primary-lt); }
    .stat-indigo .stat-icon-wrap mat-icon { color: var(--c-primary); }
    .stat-indigo .stat-decor { background: var(--c-primary); }
    .stat-orange .stat-icon-wrap { background: var(--c-accent-lt); }
    .stat-orange .stat-icon-wrap mat-icon { color: var(--c-accent); }
    .stat-orange .stat-decor { background: var(--c-accent); }
    .stat-emerald .stat-icon-wrap { background: var(--c-emerald-lt); }
    .stat-emerald .stat-icon-wrap mat-icon { color: var(--c-emerald); }
    .stat-emerald .stat-decor { background: var(--c-emerald); }
    .stat-value {
      font-size: 1.6rem;
      font-weight: 800;
      color: var(--c-text);
      line-height: 1;
      font-variant-numeric: tabular-nums;
    }
    .stat-label {
      font-size: .75rem;
      font-weight: 500;
      color: var(--c-text-2);
      margin-top: .2rem;
    }

    /* ── CONTENT GRID ─────────────────────────────────────────── */
    .content-grid {
      display: grid;
      grid-template-columns: 1fr 300px;
      gap: 1.5rem;
      align-items: start;
    }

    /* ── PANEL SHARED ─────────────────────────────────────────── */
    .bookings-panel,
    .reports-card {
      background: var(--c-surface);
      border-radius: var(--r-xl);
      border: 1px solid var(--c-border);
      padding: 1.5rem;
      box-shadow: 0 1px 4px rgba(15,23,42,.04);
    }
    .panel-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1.1rem;
    }
    .panel-title {
      font-size: 1.05rem;
      font-weight: 700;
      color: var(--c-text);
      margin: 0 0 .2rem;
    }
    .panel-sub {
      font-size: .75rem;
      color: var(--c-muted);
      margin: 0;
    }
    .link-view-all {
      font-size: .8rem;
      font-weight: 600;
      color: var(--c-primary);
      text-decoration: none;
      white-space: nowrap;
      margin-top: .2rem;
    }
    .link-view-all:hover { text-decoration: underline; }

    /* ── STATUS FILTER PILLS ──────────────────────────────────── */
    .filter-scroll-wrap {
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      margin-bottom: 1.1rem;
      padding-bottom: .25rem;
    }
    .filter-scroll-wrap::-webkit-scrollbar { height: 3px; }
    .filter-scroll-wrap::-webkit-scrollbar-track { background: transparent; }
    .filter-scroll-wrap::-webkit-scrollbar-thumb { background: var(--c-border); border-radius: 99px; }
    .filter-pills {
      display: flex;
      gap: .4rem;
      width: max-content;
    }
    .filter-pill {
      padding: .35rem .85rem;
      border-radius: var(--r-pill);
      font-size: .78rem;
      font-weight: 500;
      color: var(--c-text-2);
      background: var(--c-bg);
      border: 1px solid var(--c-border);
      cursor: pointer;
      white-space: nowrap;
      transition: all .15s;
    }
    .filter-pill:hover {
      background: var(--c-primary-lt);
      color: var(--c-primary);
      border-color: var(--c-primary);
    }
    .filter-pill.active {
      background: var(--c-primary);
      color: #fff;
      border-color: var(--c-primary);
      font-weight: 600;
    }

    /* ── BOOKING CARDS ────────────────────────────────────────── */
    .booking-cards {
      display: flex;
      flex-direction: column;
      gap: .75rem;
    }
    .booking-card {
      border: 1px solid var(--c-border);
      border-radius: var(--r-lg);
      overflow: hidden;
      transition: box-shadow .15s, border-color .15s;
    }
    .booking-card:hover {
      box-shadow: 0 4px 16px rgba(15,23,42,.07);
      border-color: #C7D2FE;
    }
    .booking-card.expanded {
      border-color: var(--c-primary);
      box-shadow: 0 0 0 3px rgba(99,102,241,.1), 0 4px 16px rgba(15,23,42,.07);
    }
    .bcard-main {
      padding: 1rem 1.1rem;
      cursor: pointer;
      background: var(--c-surface);
    }
    .bcard-top-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: .5rem;
      margin-bottom: .5rem;
    }
    .bcard-ref {
      font-size: .75rem;
      font-weight: 700;
      color: var(--c-muted);
      font-family: 'SF Mono', 'Fira Code', monospace;
      letter-spacing: .04em;
    }
    .bcard-name {
      font-size: .9rem;
      font-weight: 600;
      color: var(--c-text);
      margin-bottom: .55rem;
      line-height: 1.35;
    }
    .bcard-meta-row {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: .65rem;
    }
    .bcard-meta-item {
      display: flex;
      align-items: center;
      gap: .3rem;
      font-size: .78rem;
      color: var(--c-text-2);
    }
    .bcard-meta-item mat-icon {
      font-size: .9rem;
      width: .9rem;
      height: .9rem;
      color: var(--c-muted);
    }
    .bcard-bottom-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: .5rem;
    }
    .bcard-amount {
      font-size: 1rem;
      font-weight: 800;
      color: var(--c-accent);
      font-variant-numeric: tabular-nums;
    }
    .bcard-actions {
      display: flex;
      align-items: center;
      gap: .4rem;
      flex-wrap: wrap;
    }
    .bcard-action-btn {
      display: inline-flex;
      align-items: center;
      gap: .25rem;
      padding: .3rem .7rem;
      border-radius: var(--r-pill);
      font-size: .75rem;
      font-weight: 600;
      cursor: pointer;
      border: 1px solid transparent;
      transition: all .15s;
    }
    .bcard-action-btn mat-icon { font-size: .85rem; width: .85rem; height: .85rem; }
    .bcard-view-btn {
      background: var(--c-primary-lt);
      color: var(--c-primary);
      border-color: #C7D2FE;
    }
    .bcard-view-btn:hover { background: #C7D2FE; }
    .bcard-report-btn {
      background: var(--c-emerald-lt);
      color: var(--c-emerald);
      border-color: #A7F3D0;
    }
    .bcard-report-btn:hover { background: #A7F3D0; }
    .bcard-cancel-btn {
      background: var(--c-error-lt);
      color: var(--c-error);
      border-color: #FECACA;
    }
    .bcard-cancel-btn:hover { background: #FECACA; }

    /* ── BOOKING CARD DETAIL ──────────────────────────────────── */
    .bcard-detail {
      padding: 1rem 1.1rem;
      background: #FAFBFF;
      border-top: 1px solid #EEF2FF;
    }
    .bcard-detail-title {
      font-size: .72rem;
      font-weight: 700;
      color: var(--c-muted);
      letter-spacing: .07em;
      text-transform: uppercase;
      margin-bottom: .6rem;
    }
    .bcard-items-list {
      display: flex;
      flex-direction: column;
      gap: .4rem;
      margin-bottom: .75rem;
    }
    .bcard-item-row {
      display: flex;
      align-items: center;
      gap: .6rem;
      font-size: .825rem;
    }
    .item-type-chip {
      font-size: .65rem;
      font-weight: 700;
      text-transform: uppercase;
      background: var(--c-primary-lt);
      color: var(--c-primary);
      padding: .15rem .5rem;
      border-radius: var(--r-sm);
      letter-spacing: .04em;
      flex-shrink: 0;
    }
    .item-row-name {
      flex: 1;
      color: var(--c-text-2);
      font-weight: 500;
    }
    .item-row-price {
      font-weight: 700;
      color: var(--c-text);
      font-variant-numeric: tabular-nums;
    }
    .no-items-text {
      font-size: .8rem;
      color: var(--c-muted);
    }
    .bcard-detail-footer {
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
      border-top: 1px solid var(--c-border);
      padding-top: .6rem;
      font-size: .8rem;
      color: var(--c-text-2);
    }
    .detail-footer-item strong { color: var(--c-text); }
    .detail-footer-cancel { color: var(--c-error); }

    /* ── STATUS PILLS ─────────────────────────────────────────── */
    .status-pill {
      display: inline-flex;
      align-items: center;
      padding: .2rem .6rem;
      border-radius: var(--r-pill);
      font-size: .7rem;
      font-weight: 700;
      letter-spacing: .02em;
      white-space: nowrap;
    }
    .status-booked,
    .status-confirmed,
    .status-accepted    { background: var(--c-success-lt);  color: #166534; }
    .status-pending     { background: #F1F5F9;               color: var(--c-text-2); }
    .status-technician_assigned { background: var(--c-purple-lt); color: #7E22CE; }
    .status-sample_collected,
    .status-processing  { background: var(--c-blue-lt);     color: #1D4ED8; }
    .status-report_uploaded,
    .status-completed   { background: var(--c-emerald-lt);  color: #065F46; }
    .status-cancelled,
    .status-failed      { background: var(--c-error-lt);    color: #B91C1C; }
    .status-rescheduled { background: var(--c-warning-lt);  color: #92400E; }

    /* ── EMPTY STATE ──────────────────────────────────────────── */
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 2.5rem 1rem;
      text-align: center;
    }
    .empty-icon-wrap { margin-bottom: 1rem; }
    .empty-text {
      font-size: 1rem;
      font-weight: 700;
      color: var(--c-text);
      margin-bottom: .35rem;
    }
    .empty-sub {
      font-size: .85rem;
      color: var(--c-muted);
      margin-bottom: 1.25rem;
    }
    .empty-cta {
      display: inline-flex;
      align-items: center;
      background: var(--c-primary);
      color: #fff;
      border-radius: var(--r-pill);
      padding: .55rem 1.35rem;
      font-size: .875rem;
      font-weight: 600;
      text-decoration: none;
      box-shadow: 0 3px 10px rgba(99,102,241,.3);
      transition: background .15s, transform .15s;
    }
    .empty-cta:hover { background: var(--c-primary-dk); transform: translateY(-1px); text-decoration: none; }

    /* ── RIGHT COL ────────────────────────────────────────────── */
    .right-col {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    /* ── REPORTS CARD ─────────────────────────────────────────── */
    .loading-pulse {
      height: 12px;
      background: linear-gradient(90deg, var(--c-bg) 25%, var(--c-border) 50%, var(--c-bg) 75%);
      background-size: 200% 100%;
      border-radius: var(--r-sm);
      margin-bottom: .5rem;
      width: 100%;
      animation: pulse 1.4s infinite;
    }
    @keyframes pulse {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
    .reports-loading { padding: .5rem 0; }
    .reports-empty {
      display: flex;
      align-items: center;
      gap: .5rem;
      color: var(--c-muted);
      font-size: .85rem;
      padding: .5rem 0;
    }
    .reports-empty mat-icon { font-size: 1.1rem; width: 1.1rem; height: 1.1rem; }
    .report-list { display: flex; flex-direction: column; gap: .7rem; }
    .report-row { display: flex; align-items: center; gap: .75rem; }
    .report-icon-wrap {
      width: 36px;
      height: 36px;
      border-radius: var(--r-md);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .report-icon-wrap mat-icon { font-size: 1.05rem; width: 1.05rem; height: 1.05rem; }
    .report-icon-wrap.red { background: var(--c-error-lt); }
    .report-icon-wrap.red mat-icon { color: var(--c-error); }
    .report-icon-wrap.green { background: var(--c-emerald-lt); }
    .report-icon-wrap.green mat-icon { color: var(--c-emerald); }
    .report-icon-wrap.blue { background: var(--c-blue-lt); }
    .report-icon-wrap.blue mat-icon { color: var(--c-blue); }
    .report-info { flex: 1; min-width: 0; }
    .report-name {
      font-size: .825rem;
      font-weight: 600;
      color: var(--c-text);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .report-date { font-size: .72rem; color: var(--c-muted); }
    .report-dl-btn {
      width: 30px;
      height: 30px;
      border-radius: var(--r-sm);
      background: var(--c-bg);
      border: 1px solid var(--c-border);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      color: var(--c-muted);
      flex-shrink: 0;
      transition: background .15s, color .15s;
    }
    .report-dl-btn mat-icon { font-size: .9rem; width: .9rem; height: .9rem; }
    .report-dl-btn:hover { background: var(--c-primary-lt); color: var(--c-primary); border-color: var(--c-primary); }

    /* ── PROMO CARD ───────────────────────────────────────────── */
    .promo-card {
      border-radius: var(--r-xl);
      background: linear-gradient(135deg, var(--c-accent) 0%, var(--c-accent-dk) 100%);
      padding: 1.35rem 1.25rem;
      color: #fff;
      position: relative;
      overflow: hidden;
    }
    .promo-inner { position: relative; z-index: 1; }
    .promo-art {
      position: absolute;
      right: -8px;
      top: 50%;
      transform: translateY(-50%);
      z-index: 0;
      pointer-events: none;
    }
    .promo-eyebrow {
      font-size: .63rem;
      font-weight: 700;
      letter-spacing: .1em;
      opacity: .8;
      margin-bottom: .4rem;
    }
    .promo-title {
      font-size: 1rem;
      font-weight: 800;
      line-height: 1.3;
      margin: 0 0 .4rem;
      text-wrap: balance;
    }
    .promo-desc {
      font-size: .8rem;
      opacity: .85;
      line-height: 1.5;
      margin: 0 0 .85rem;
    }
    .promo-price-row {
      display: flex;
      align-items: baseline;
      gap: .5rem;
      margin-bottom: .9rem;
    }
    .promo-price-eff {
      font-size: 1.4rem;
      font-weight: 800;
      font-variant-numeric: tabular-nums;
    }
    .promo-price-orig {
      font-size: .85rem;
      opacity: .6;
      text-decoration: line-through;
      font-variant-numeric: tabular-nums;
    }
    .promo-savings-badge {
      font-size: .65rem;
      font-weight: 700;
      background: rgba(255,255,255,.25);
      border: 1px solid rgba(255,255,255,.4);
      padding: .15rem .45rem;
      border-radius: var(--r-pill);
      letter-spacing: .04em;
    }
    .promo-cta {
      display: block;
      background: #fff;
      color: var(--c-accent-dk);
      border-radius: var(--r-md);
      padding: .6rem 1rem;
      font-size: .875rem;
      font-weight: 700;
      text-align: center;
      text-decoration: none;
      transition: background .15s, transform .15s;
    }
    .promo-cta:hover { background: #FFF7ED; text-decoration: none; transform: translateY(-1px); }

    /* ── FAMILY CARD ──────────────────────────────────────────── */
    .family-card {
      background: var(--c-surface);
      border-radius: var(--r-lg);
      border: 1px solid var(--c-border);
      padding: .9rem 1.1rem;
      display: flex;
      align-items: center;
      gap: .75rem;
    }
    .family-card-icon {
      width: 38px;
      height: 38px;
      border-radius: var(--r-md);
      background: var(--c-primary-lt);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .family-card-icon mat-icon { font-size: 1.1rem; width: 1.1rem; height: 1.1rem; color: var(--c-primary); }
    .family-card-info { flex: 1; }
    .family-card-count { font-size: .875rem; font-weight: 700; color: var(--c-text); }
    .family-card-label { font-size: .72rem; color: var(--c-muted); }
    .family-card-link {
      font-size: .78rem;
      font-weight: 600;
      color: var(--c-primary);
      text-decoration: none;
      padding: .3rem .7rem;
      border-radius: var(--r-pill);
      background: var(--c-primary-lt);
      border: 1px solid #C7D2FE;
    }
    .family-card-link:hover { background: #C7D2FE; text-decoration: none; }

    /* ── FAB ──────────────────────────────────────────────────── */
    .sh-fab {
      display: none;
      position: fixed;
      bottom: 80px;
      right: 1.25rem;
      width: 52px;
      height: 52px;
      border-radius: var(--r-pill);
      background: linear-gradient(135deg, var(--c-accent), var(--c-accent-dk));
      color: #fff;
      align-items: center;
      justify-content: center;
      z-index: 30;
      text-decoration: none;
      box-shadow: 0 4px 20px rgba(249,115,22,.5);
      transition: transform .15s, box-shadow .15s;
    }
    .sh-fab:hover { transform: scale(1.07); box-shadow: 0 6px 28px rgba(249,115,22,.6); }
    .sh-fab mat-icon { font-size: 1.4rem; width: 1.4rem; height: 1.4rem; }

    /* ── CANCELLATION DIALOG ──────────────────────────────────── */
    .dialog-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15,23,42,.5);
      z-index: 100;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
      backdrop-filter: blur(3px);
    }
    .dialog-box {
      background: var(--c-surface);
      border-radius: var(--r-xl);
      width: 100%;
      max-width: 460px;
      overflow: hidden;
      box-shadow: 0 24px 60px rgba(15,23,42,.2);
      animation: dlg-in .2s ease;
    }
    @keyframes dlg-in {
      from { transform: scale(.96) translateY(8px); opacity: 0; }
      to   { transform: scale(1) translateY(0);    opacity: 1; }
    }
    .dialog-head {
      display: flex;
      align-items: center;
      gap: .75rem;
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid var(--c-border);
    }
    .dialog-head-icon {
      width: 40px;
      height: 40px;
      border-radius: var(--r-md);
      background: var(--c-error-lt);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .dialog-head-icon mat-icon { color: var(--c-error); font-size: 1.2rem; width: 1.2rem; height: 1.2rem; }
    .dialog-title { font-size: 1rem; font-weight: 700; color: var(--c-text); margin: 0 0 .1rem; }
    .dialog-sub { font-size: .75rem; color: var(--c-muted); margin: 0; font-family: monospace; }
    .dialog-close-btn {
      margin-left: auto;
      background: none;
      border: none;
      cursor: pointer;
      color: var(--c-muted);
      padding: .25rem;
      border-radius: var(--r-sm);
      display: flex;
    }
    .dialog-close-btn:hover { background: var(--c-bg); }

    .fee-notice {
      display: flex;
      gap: .75rem;
      padding: 1rem 1.5rem;
      background: #FFFBEB;
      border-bottom: 1px solid #FDE68A;
    }
    .fee-warn-icon { color: var(--c-warning); flex-shrink: 0; margin-top: .1rem; font-size: 1.2rem; width: 1.2rem; height: 1.2rem; }
    .fee-breakdown { flex: 1; }
    .fee-notice-title { font-size: .78rem; font-weight: 700; color: #92400E; margin-bottom: .5rem; }
    .fee-line {
      display: flex;
      justify-content: space-between;
      font-size: .83rem;
      color: var(--c-text-2);
      padding: .15rem 0;
      font-variant-numeric: tabular-nums;
    }
    .fee-line-red { color: var(--c-error); }
    .fee-line-bold {
      font-weight: 700;
      color: var(--c-text);
      border-top: 1px solid var(--c-border);
      margin-top: .3rem;
      padding-top: .3rem;
    }

    .dialog-body {
      padding: 1.25rem 1.5rem;
      display: flex;
      flex-direction: column;
      gap: .75rem;
    }
    .dlg-label {
      font-size: .8rem;
      font-weight: 600;
      color: var(--c-text-2);
    }
    .dlg-required { color: var(--c-error); }
    .dlg-select,
    .dlg-textarea {
      border: 1.5px solid var(--c-border);
      border-radius: var(--r-md);
      padding: .55rem .85rem;
      font-size: .875rem;
      color: var(--c-text);
      background: var(--c-surface);
      width: 100%;
      font-family: inherit;
      transition: border-color .15s, box-shadow .15s;
    }
    .dlg-select:focus,
    .dlg-textarea:focus {
      outline: none;
      border-color: var(--c-primary);
      box-shadow: 0 0 0 3px rgba(99,102,241,.12);
    }
    .dlg-textarea { resize: vertical; }
    .dlg-error {
      display: flex;
      align-items: center;
      gap: .4rem;
      font-size: .8rem;
      color: var(--c-error);
      background: var(--c-error-lt);
      padding: .55rem .8rem;
      border-radius: var(--r-md);
    }
    .dlg-error mat-icon { font-size: 1rem; width: 1rem; height: 1rem; }

    .dialog-foot {
      display: flex;
      justify-content: flex-end;
      gap: .75rem;
      padding: 1rem 1.5rem;
      border-top: 1px solid var(--c-border);
      background: var(--c-bg);
    }
    .dlg-btn-ghost {
      background: none;
      border: 1.5px solid var(--c-border);
      border-radius: var(--r-pill);
      padding: .55rem 1.1rem;
      font-size: .875rem;
      cursor: pointer;
      color: var(--c-text-2);
      font-weight: 500;
      transition: background .15s;
    }
    .dlg-btn-ghost:hover { background: var(--c-border); }
    .dlg-btn-ghost:disabled { opacity: .5; cursor: not-allowed; }
    .dlg-btn-danger {
      background: var(--c-error);
      color: #fff;
      border: none;
      border-radius: var(--r-pill);
      padding: .55rem 1.25rem;
      font-size: .875rem;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(239,68,68,.35);
      transition: background .15s;
    }
    .dlg-btn-danger:hover { background: #DC2626; }
    .dlg-btn-danger:disabled { opacity: .5; cursor: not-allowed; }

    /* ── RESPONSIVE ───────────────────────────────────────────── */
    @media (max-width: 1024px) {
      .content-grid { grid-template-columns: 1fr; }
      .right-col { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
      .promo-card { grid-column: span 2; }
    }

    @media (max-width: 900px) {
      .sh-sidebar {
        position: fixed;
        left: 0;
        top: 0;
        bottom: 0;
        z-index: 40;
        transform: translateX(-100%);
        transition: transform .25s cubic-bezier(.4,0,.2,1);
        box-shadow: 0 0 40px rgba(15,23,42,.15);
      }
      .sh-root.sidebar-open .sh-sidebar { transform: translateX(0); }
      .sb-close-btn { display: flex; }
      .sh-topbar { display: flex; }
      .sh-greeting-wrap { margin-top: 0; }
      .greeting-book-btn { display: none; }
      .sh-main { padding: 1rem 1rem 6rem; }
      .sh-fab { display: flex; }
      .stats-row { grid-template-columns: repeat(3, 1fr); }
    }

    @media (max-width: 600px) {
      .stats-row { grid-template-columns: 1fr 1fr; }
      .stat-card:last-child { grid-column: span 2; }
      .right-col { grid-template-columns: 1fr; }
      .promo-card { grid-column: span 1; }
      .greeting-title { font-size: 1.35rem; }
    }

    @media (max-width: 400px) {
      .stats-row { grid-template-columns: 1fr; }
      .stat-card:last-child { grid-column: span 1; }
    }

    /* ── REDUCED MOTION ───────────────────────────────────────── */
    @media (prefers-reduced-motion: reduce) {
      * { animation-duration: .01ms !important; transition-duration: .01ms !important; }
    }
  `],
})

export class BookingHistoryComponent implements OnInit {
  private auth = inject(AuthStateService);
  private http = inject(HttpClient);
  bookings = signal<Booking[]>([]);
  reports = signal<Report[]>([]);
  loading = signal(true);
  reportsLoading = signal(true);
  error = signal<string | null>(null);
  total = signal(0);
  familyMemberCount = signal(0);
  expandedId = signal<string | null>(null);
  sidebarOpen = signal(false);
  activeFilter = signal<string>('all');
  pageSize = 5;

  cancelDialogOpen = signal(false);
  cancelBooking = signal<Booking | null>(null);
  cancelReason = '';
  cancelReasonOther = '';
  cancelling = signal(false);
  cancelError = signal<string | null>(null);
  cancelFeeInfo = signal<{ charge_type: string; charge_value: number } | null>(null);

  readonly REPORT_ICON_CLASSES = ['red', 'green', 'blue'];

  readonly filterOptions = [
    { label: 'All', value: 'all' },
    { label: 'Upcoming', value: 'upcoming' },
    { label: 'Completed', value: 'completed' },
    { label: 'Processing', value: 'processing' },
    { label: 'Cancelled', value: 'cancelled' },
  ];

  userName = computed(() => this.auth.currentUser()?.name ?? '');
  firstName = computed(() => this.userName().split(' ')[0] || 'there');
  initials = computed(() => {
    const n = this.userName();
    return n ? n.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2) : 'U';
  });
  shortId = computed(() => {
    const id = this.auth.currentUser()?.id ?? '';
    return id.slice(-4).toUpperCase() || '0000';
  });
  activeBookings = computed(() =>
    this.bookings().filter((b: Booking) => ['confirmed', 'booked', 'pending', 'accepted', 'technician_assigned'].includes(b.status)).length
  );
  completedBookings = computed(() =>
    this.bookings().filter((b: Booking) => b.status === 'completed' || b.status === 'report_uploaded').length
  );
  filteredBookings = computed(() => {
    const f = this.activeFilter();
    const all = this.bookings();
    if (f === 'all') return all;
    if (f === 'upcoming') return all.filter(b => ['booked','confirmed','accepted','technician_assigned','pending'].includes(b.status));
    if (f === 'completed') return all.filter(b => ['completed','report_uploaded'].includes(b.status));
    if (f === 'processing') return all.filter(b => ['sample_collected','processing'].includes(b.status));
    if (f === 'cancelled') return all.filter(b => ['cancelled','failed'].includes(b.status));
    return all;
  });

  greeting = computed(() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  });

  todayDateStr = computed(() => {
    return new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  });

  cancelBookingTotal = computed(() => {
    const b = this.cancelBooking();
    if (!b?.items?.length) return 0;
    return b.items.reduce((sum: number, i: BookingItem) => sum + Number(i.unit_price), 0);
  });

  cancelFeeAmount = computed(() => {
    const fee = this.cancelFeeInfo();
    if (!fee) return 0;
    const total = this.cancelBookingTotal();
    if (fee.charge_type === 'percentage') return Math.round(total * fee.charge_value / 100);
    return Math.min(fee.charge_value, total);
  });

  cancelRefundAmount = computed(() => Math.max(0, this.cancelBookingTotal() - this.cancelFeeAmount()));

  constructor(
    private bookingApi: BookingApiService,
    private userApi: UserApiService,
    private reportApi: ReportApiService,
  ) {}

  ngOnInit(): void { this.load(); this.loadFamilyMembers(); this.loadReports(); this.loadCancelFee(); }

  load(): void {
    this.loading.set(true);
    this.bookingApi.list({ page: 1, page_size: this.pageSize }).subscribe({
      next: (res: { items: Booking[]; total: number }) => {
        this.bookings.set(res.items);
        this.total.set(res.total);
        this.loading.set(false);
      },
      error: () => { this.error.set('Failed to load bookings.'); this.loading.set(false); },
    });
  }

  loadFamilyMembers(): void {
    this.userApi.getFamilyMembers().subscribe({
      next: (members: FamilyMember[]) => this.familyMemberCount.set(members.filter((m: FamilyMember) => m.is_active && !m.deleted_at).length),
      error: () => {},
    });
  }

  loadReports(): void {
    this.reportsLoading.set(true);
    this.reportApi.list({ page: 1, page_size: 3 }).subscribe({
      next: (res: { items: Report[] }) => { this.reports.set(res.items); this.reportsLoading.set(false); },
      error: () => { this.reportsLoading.set(false); },
    });
  }

  toggleExpand(id: string): void {
    this.expandedId.set(this.expandedId() === id ? null : id);
  }

  setFilter(value: string): void {
    this.activeFilter.set(value);
    this.expandedId.set(null);
  }

  isCancellable(status: string): boolean { return CANCELLABLE.has(status); }

  toggleSidebar(): void { this.sidebarOpen.set(!this.sidebarOpen()); }
  closeSidebar(): void { this.sidebarOpen.set(false); }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.sidebarOpen()) this.closeSidebar();
    if (this.cancelDialogOpen()) this.closeCancel();
  }

  loadCancelFee(): void {
    this.http.get<{ charge_type: string; charge_value: number } | null>('/api/v1/admin/settings/cancellation').subscribe({
      next: (res) => this.cancelFeeInfo.set(res),
      error: () => {},
    });
  }

  openCancel(b: Booking): void {
    this.cancelBooking.set(b);
    this.cancelReason = '';
    this.cancelReasonOther = '';
    this.cancelError.set(null);
    this.cancelDialogOpen.set(true);
  }

  closeCancel(): void {
    if (this.cancelling()) return;
    this.cancelDialogOpen.set(false);
    this.cancelBooking.set(null);
  }

  confirmCancel(): void {
    const reason = this.cancelReason === 'Other' ? this.cancelReasonOther.trim() : this.cancelReason;
    if (!reason) { this.cancelError.set('Please select or enter a cancellation reason.'); return; }
    const b = this.cancelBooking();
    if (!b) return;
    this.cancelling.set(true);
    this.cancelError.set(null);
    this.bookingApi.cancel(b.id, reason).subscribe({
      next: () => {
        this.cancelling.set(false);
        this.cancelDialogOpen.set(false);
        this.cancelBooking.set(null);
        this.load();
      },
      error: (err: any) => {
        this.cancelError.set(err.error?.detail?.message || err.error?.message || 'Failed to cancel booking.');
        this.cancelling.set(false);
      },
    });
  }

  downloadReport(r: Report): void {
    this.reportApi.getDownloadUrl(r.id).subscribe({
      next: (res: { download_url: string }) => window.open(res.download_url, '_blank'),
      error: () => {},
    });
  }

  reportIconClass(index: number): string {
    return this.REPORT_ICON_CLASSES[index % this.REPORT_ICON_CLASSES.length];
  }

  bookingTotal(b: Booking): number {
    if (!b.items?.length) return 0;
    return b.items.reduce((sum: number, i: BookingItem) => sum + Number(i.unit_price), 0);
  }

  statusKey(status: string): string { return status.toLowerCase(); }

  statusLabel(status: string): string {
    const labels: Record<string, string> = {
      booked: 'Booked',
      confirmed: 'Confirmed',
      accepted: 'Accepted',
      pending: 'Pending',
      technician_assigned: 'Technician Assigned',
      sample_collected: 'Sample Collected',
      processing: 'Processing',
      report_uploaded: 'Report Ready',
      completed: 'Completed',
      cancelled: 'Cancelled',
      failed: 'Failed',
      rescheduled: 'Rescheduled',
    };
    return labels[status.toLowerCase()] ?? status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  bookingLabel(b: Booking): string {
    const items = b.items ?? [];
    if (!items.length) return b.collection_type === 'home' ? 'Home Collection' : 'Lab Visit';
    const names = items.map((i: BookingItem) => i.item_name).filter(Boolean);
    if (!names.length) return b.collection_type === 'home' ? 'Home Collection' : 'Lab Visit';
    return names.slice(0, 2).join(', ') + (names.length > 2 ? ` +${names.length - 2} more` : '');
  }
}
