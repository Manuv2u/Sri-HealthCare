import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { PackageApiService } from '../../core/api/services/package-api.service';
import { Package } from '../../core/api/api.types';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule, MatIconModule],
  template: `
    <!-- Hero -->
    <section class="hero">
      <div class="hero-content">
        <div class="hero-text">
          <div class="hero-badge">
            <span class="dot"></span> 30-min to your doorstep, guaranteed
          </div>
          <h1>Clinical Precision,<br><span class="accent">Expert Care</span></h1>
          <p>Experience the gold standard in diagnostic accuracy. Our state-of-the-art labs provide rapid, reliable results powered by world-class pathologists.</p>
          <div class="hero-search">
            <mat-icon>search</mat-icon>
            <input [formControl]="searchCtrl" placeholder="Search for e.g., CBC, Thyroid Profile…" (keydown.enter)="goSearch()" />
            <button class="btn-find" (click)="goSearch()">Find Test</button>
          </div>
          <div class="hero-actions">
            <a routerLink="/booking" class="hero-action-btn">
              <mat-icon>calendar_today</mat-icon> Book Collection
            </a>
            <a routerLink="/reports" class="hero-action-btn outline">
              <mat-icon>download</mat-icon> Download Reports
            </a>
            <a routerLink="/profile" class="hero-action-btn outline">
              <mat-icon>people</mat-icon> Manage Family Profiles
            </a>
          </div>
          <div class="hero-stat">
            <span class="stat-num">99.9%</span>
            <span class="stat-label">ACCURACY RATE</span>
          </div>
        </div>
        <div class="hero-visual">
          <div class="hero-img-wrap">
            <div class="hero-circle"></div>
            <div class="hero-icon-grid">
              <div class="hig-item"><mat-icon>biotech</mat-icon></div>
              <div class="hig-item"><mat-icon>science</mat-icon></div>
              <div class="hig-item"><mat-icon>vaccines</mat-icon></div>
              <div class="hig-item"><mat-icon>monitor_heart</mat-icon></div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Popular Packages -->
    <section class="section">
      <div class="section-inner">
        <div class="section-header">
          <div>
            <h2>Popular Health Packages</h2>
            <p>Comprehensive diagnostic panels designed for early detection and holistic health monitoring</p>
          </div>
          <a routerLink="/packages" class="view-all">View all 150+ tests →</a>
        </div>
        <div class="pkg-grid">
          @for (pkg of packages(); track pkg.id) {
            <div class="pkg-card">
              <div class="pkg-icon"><mat-icon>inventory_2</mat-icon></div>
              <h3>{{ pkg.name }}</h3>
              @if (pkg.description) { <p class="pkg-desc">{{ pkg.description }}</p> }
              <div class="pkg-tests">
                @for (t of pkg.tests.slice(0, 3); track t.id) {
                  <span class="pkg-test-chip">
                    <mat-icon>check_circle</mat-icon> {{ t.name }}
                  </span>
                }
                @if (pkg.tests.length > 3) {
                  <span class="pkg-test-chip more">+{{ pkg.tests.length - 3 }} more</span>
                }
              </div>
              <div class="pkg-footer">
                <div class="pkg-price">
                  @if (pkg.original_price > pkg.discounted_price) {
                    <span class="pkg-orig">₹{{ pkg.original_price }}</span>
                  }
                  <span class="pkg-eff">from ₹{{ pkg.discounted_price }}</span>
                </div>
                <button class="btn-book" (click)="bookPackage(pkg)">Book Now</button>
              </div>
            </div>
          }
          @if (packages().length === 0 && !pkgLoading()) {
            <div class="pkg-card empty-pkg">
              <mat-icon>inventory_2</mat-icon>
              <p>No packages available yet</p>
            </div>
          }
        </div>
      </div>
    </section>

    <!-- Features -->
    <section class="features-section">
      <div class="section-inner">
        <div class="features-grid">
          <div class="feature-item">
            <div class="feature-icon teal"><mat-icon>home</mat-icon></div>
            <h4>Home Sample Collection</h4>
            <p>Certified phlebotomists arrive at your doorstep with sterile, single-use kits for maximum hygiene.</p>
          </div>
          <div class="feature-item">
            <div class="feature-icon blue"><mat-icon>shield</mat-icon></div>
            <h4>100% Secure Reports</h4>
            <p>Your medical data is encrypted and accessible only through our secure patient portal and family dashboard.</p>
          </div>
          <div class="feature-item">
            <div class="feature-icon green"><mat-icon>verified</mat-icon></div>
            <h4>Expert Pathologists</h4>
            <p>Every report is cross-certified by MD pathologists to ensure the clinical precision you can trust.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Quality section -->
    <section class="quality-section">
      <div class="section-inner quality-inner">
        <div class="quality-text">
          <h2>Committed to Quality</h2>
          <p>SRI Lab operates across 12 major districts, bringing highest clinical standards to your neighbourhood.</p>
          <div class="quality-stats">
            <div class="qs-item">
              <span class="qs-num">12+</span>
              <span class="qs-label">Districts</span>
            </div>
            <div class="qs-item">
              <span class="qs-num">2M+</span>
              <span class="qs-label">Tests</span>
            </div>
          </div>
          <div class="quality-badges">
            <span class="qb"><mat-icon>verified</mat-icon> NABL Accredited</span>
            <span class="qb"><mat-icon>workspace_premium</mat-icon> ISO 9001:2015</span>
            <span class="qb"><mat-icon>star</mat-icon> CAP Certified</span>
          </div>
        </div>
        <div class="quality-map">
          <div class="map-circle">
            <mat-icon>location_on</mat-icon>
            <span>All Collection Centres Active</span>
          </div>
        </div>
      </div>
    </section>

    <!-- Footer -->
    <footer class="home-footer">
      <div class="section-inner footer-inner">
        <div class="footer-brand">
          <strong>SRI Lab</strong>
          <p>Setting new standards in diagnostic excellence since 1998. Your partner in health precision.</p>
        </div>
        <div class="footer-col">
          <strong>Popular Tests</strong>
          <a routerLink="/tests">Complete Blood Count</a>
          <a routerLink="/tests">Thyroid Profile (T3, T4, TSH)</a>
          <a routerLink="/tests">HbA1c Fasting Panel</a>
          <a routerLink="/tests">Lipid Profile</a>
        </div>
        <div class="footer-col">
          <strong>Quick Links</strong>
          <a routerLink="/tests">Browse Tests</a>
          <a routerLink="/packages">Health Packages</a>
          <a routerLink="/booking">Book Now</a>
          <a routerLink="/auth/login">Sign In</a>
        </div>
        <div class="footer-col">
          <strong>Newsletter</strong>
          <p class="footer-nl-desc">Get health tips and package updates</p>
          <div class="footer-nl">
            <input placeholder="Email address" />
            <button>Join</button>
          </div>
        </div>
      </div>
      <div class="footer-bottom">
        <span>© 2026 SRI Diagnostic Laboratory & Health Care. All rights reserved.</span>
        <span class="footer-links">
          <a>Privacy Policy</a>
          <a>Terms of Service</a>
          <a>Policy Policy</a>
        </span>
      </div>
    </footer>
  `,
  styles: [`
    /* ── Hero ── */
    .hero {
      background: linear-gradient(135deg, #f0fdf9 0%, #e0f2f1 100%);
      padding: 4rem 1.5rem 3rem;
    }
    .hero-content {
      max-width: 1100px; margin: 0 auto;
      display: grid; grid-template-columns: 1fr 1fr; gap: 3rem; align-items: center;
    }
    .hero-badge {
      display: inline-flex; align-items: center; gap: .5rem;
      background: #c6f6d5; color: #276749; padding: .3rem .8rem;
      border-radius: 999px; font-size: .8rem; font-weight: 600; margin-bottom: 1rem;
      .dot { width: 8px; height: 8px; background: #38a169; border-radius: 50%; }
    }
    .hero-text h1 {
      font-size: 2.8rem; font-weight: 800; line-height: 1.15; color: #1a202c; margin-bottom: 1rem;
      .accent { color: #00796b; }
    }
    .hero-text p { color: #4a5568; font-size: 1rem; line-height: 1.7; margin-bottom: 1.5rem; }
    .hero-search {
      display: flex; align-items: center; gap: .5rem;
      background: #fff; border: 1.5px solid #e2e8f0; border-radius: 12px;
      padding: .5rem .75rem; margin-bottom: 1.25rem;
      box-shadow: 0 2px 8px rgba(0,0,0,.06);
      mat-icon { color: #a0aec0; }
      input { flex: 1; border: none; outline: none; font-size: .95rem; color: #2d3748; background: transparent; }
    }
    .btn-find {
      background: #00796b; color: #fff; border: none; border-radius: 8px;
      padding: .45rem 1rem; font-size: .875rem; font-weight: 600; cursor: pointer; white-space: nowrap;
      &:hover { background: #00695c; }
    }
    .hero-actions {
      display: flex; flex-wrap: wrap; gap: .75rem; margin-bottom: 1.5rem;
    }
    .hero-action-btn {
      display: inline-flex; align-items: center; gap: .4rem;
      background: #fff; border: 1.5px solid #e2e8f0; border-radius: 10px;
      padding: .5rem 1rem; font-size: .85rem; font-weight: 600; color: #2d3748;
      text-decoration: none; transition: all .15s;
      mat-icon { font-size: 1rem; width: 1rem; height: 1rem; color: #00796b; }
      &:hover { border-color: #00796b; color: #00796b; }
      &.outline { background: transparent; }
    }
    .hero-stat {
      display: flex; flex-direction: column;
      .stat-num { font-size: 2rem; font-weight: 800; color: #00796b; }
      .stat-label { font-size: .75rem; font-weight: 600; color: #718096; letter-spacing: .08em; }
    }
    .hero-visual { display: flex; justify-content: center; align-items: center; }
    .hero-img-wrap { position: relative; width: 320px; height: 320px; }
    .hero-circle {
      width: 280px; height: 280px; border-radius: 50%;
      background: linear-gradient(135deg, #00796b22, #26a69a44);
      position: absolute; top: 20px; left: 20px;
    }
    .hero-icon-grid {
      position: absolute; inset: 0; display: grid;
      grid-template-columns: 1fr 1fr; gap: 1rem; padding: 3rem;
    }
    .hig-item {
      background: #fff; border-radius: 16px; display: flex; align-items: center;
      justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,.1);
      mat-icon { font-size: 2rem; width: 2rem; height: 2rem; color: #00796b; }
    }

    /* ── Sections ── */
    .section { padding: 4rem 1.5rem; }
    .section-inner { max-width: 1100px; margin: 0 auto; }
    .section-header {
      display: flex; justify-content: space-between; align-items: flex-start;
      margin-bottom: 2rem; flex-wrap: wrap; gap: 1rem;
      h2 { font-size: 1.75rem; font-weight: 800; color: #1a202c; }
      p { color: #718096; margin-top: .25rem; }
    }
    .view-all {
      color: #00796b; font-size: .875rem; font-weight: 600; text-decoration: none; white-space: nowrap;
      &:hover { text-decoration: underline; }
    }

    /* ── Packages ── */
    .pkg-grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1.25rem;
    }
    .pkg-card {
      background: #fff; border-radius: 14px; padding: 1.5rem;
      border: 1px solid #e2e8f0; box-shadow: 0 2px 8px rgba(0,0,0,.05);
      display: flex; flex-direction: column; gap: .75rem;
      transition: box-shadow .2s, transform .2s;
      &:hover { box-shadow: 0 6px 20px rgba(0,0,0,.1); transform: translateY(-2px); }
      &.empty-pkg { align-items: center; justify-content: center; color: #a0aec0; min-height: 180px; }
    }
    .pkg-icon {
      width: 44px; height: 44px; background: #e0f2f1; border-radius: 12px;
      display: flex; align-items: center; justify-content: center;
      mat-icon { color: #00796b; }
    }
    .pkg-card h3 { font-size: 1rem; font-weight: 700; color: #1a202c; }
    .pkg-desc { font-size: .85rem; color: #718096; line-height: 1.5; }
    .pkg-tests { display: flex; flex-direction: column; gap: .3rem; }
    .pkg-test-chip {
      display: inline-flex; align-items: center; gap: .3rem;
      font-size: .8rem; color: #4a5568;
      mat-icon { font-size: .9rem; width: .9rem; height: .9rem; color: #38a169; }
      &.more { color: #718096; }
    }
    .pkg-footer { display: flex; justify-content: space-between; align-items: center; margin-top: auto; padding-top: .75rem; border-top: 1px solid #f0f4f8; }
    .pkg-price { display: flex; flex-direction: column; }
    .pkg-orig { font-size: .8rem; color: #a0aec0; text-decoration: line-through; }
    .pkg-eff { font-size: 1rem; font-weight: 700; color: #00796b; }
    .btn-book {
      background: #00796b; color: #fff; border: none; border-radius: 8px;
      padding: .45rem 1rem; font-size: .85rem; font-weight: 600; cursor: pointer;
      &:hover { background: #00695c; }
    }

    /* ── Features ── */
    .features-section { background: #f7fafc; padding: 4rem 1.5rem; }
    .features-grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 2rem;
    }
    .feature-item { display: flex; flex-direction: column; gap: .75rem; }
    .feature-icon {
      width: 52px; height: 52px; border-radius: 14px;
      display: flex; align-items: center; justify-content: center;
      mat-icon { font-size: 1.5rem; width: 1.5rem; height: 1.5rem; }
      &.teal { background: #e0f2f1; mat-icon { color: #00796b; } }
      &.blue { background: #ebf8ff; mat-icon { color: #3182ce; } }
      &.green { background: #c6f6d5; mat-icon { color: #276749; } }
    }
    .feature-item h4 { font-size: 1rem; font-weight: 700; color: #1a202c; }
    .feature-item p { font-size: .875rem; color: #718096; line-height: 1.6; }

    /* ── Quality ── */
    .quality-section { padding: 4rem 1.5rem; }
    .quality-inner { display: grid; grid-template-columns: 1fr 1fr; gap: 3rem; align-items: center; }
    .quality-text h2 { font-size: 1.75rem; font-weight: 800; color: #1a202c; margin-bottom: .75rem; }
    .quality-text p { color: #718096; line-height: 1.7; margin-bottom: 1.5rem; }
    .quality-stats { display: flex; gap: 2rem; margin-bottom: 1.5rem; }
    .qs-item { display: flex; flex-direction: column;
      .qs-num { font-size: 2rem; font-weight: 800; color: #00796b; }
      .qs-label { font-size: .8rem; color: #718096; font-weight: 600; }
    }
    .quality-badges { display: flex; flex-wrap: wrap; gap: .75rem; }
    .qb {
      display: inline-flex; align-items: center; gap: .3rem;
      background: #f7fafc; border: 1px solid #e2e8f0; border-radius: 8px;
      padding: .35rem .75rem; font-size: .8rem; font-weight: 600; color: #4a5568;
      mat-icon { font-size: .9rem; width: .9rem; height: .9rem; color: #00796b; }
    }
    .quality-map { display: flex; justify-content: center; }
    .map-circle {
      width: 240px; height: 240px; border-radius: 50%;
      background: linear-gradient(135deg, #00796b, #26a69a);
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      color: #fff; gap: .5rem; text-align: center; padding: 1.5rem;
      mat-icon { font-size: 2.5rem; width: 2.5rem; height: 2.5rem; }
      span { font-size: .85rem; font-weight: 600; }
    }

    /* ── Footer ── */
    .home-footer { background: #1a202c; color: #a0aec0; padding: 3rem 1.5rem 1.5rem; }
    .footer-inner {
      display: grid; grid-template-columns: 2fr 1fr 1fr 1.5fr; gap: 2rem; margin-bottom: 2rem;
    }
    .footer-brand strong { color: #fff; font-size: 1.1rem; display: block; margin-bottom: .5rem; }
    .footer-brand p { font-size: .85rem; line-height: 1.6; }
    .footer-col { display: flex; flex-direction: column; gap: .5rem;
      strong { color: #fff; font-size: .9rem; margin-bottom: .25rem; }
      a { font-size: .85rem; color: #a0aec0; text-decoration: none; cursor: pointer;
        &:hover { color: #fff; }
      }
    }
    .footer-nl-desc { font-size: .8rem; margin-bottom: .5rem; }
    .footer-nl {
      display: flex; gap: .5rem;
      input { flex: 1; background: #2d3748; border: 1px solid #4a5568; border-radius: 8px;
        padding: .45rem .75rem; color: #fff; font-size: .85rem; outline: none;
        &::placeholder { color: #718096; }
      }
      button { background: #00796b; color: #fff; border: none; border-radius: 8px;
        padding: .45rem .9rem; font-size: .85rem; font-weight: 600; cursor: pointer;
        &:hover { background: #00695c; }
      }
    }
    .footer-bottom {
      border-top: 1px solid #2d3748; padding-top: 1.25rem;
      display: flex; justify-content: space-between; align-items: center;
      font-size: .8rem; flex-wrap: wrap; gap: .5rem;
    }
    .footer-links { display: flex; gap: 1.5rem;
      a { color: #718096; cursor: pointer; &:hover { color: #fff; } }
    }

    @media (max-width: 768px) {
      .hero-content { grid-template-columns: 1fr; }
      .hero-visual { display: none; }
      .quality-inner { grid-template-columns: 1fr; }
      .footer-inner { grid-template-columns: 1fr 1fr; }
    }
  `],
})
export class HomeComponent implements OnInit {
  searchCtrl = new FormControl('');
  packages = signal<Package[]>([]);
  pkgLoading = signal(true);

  constructor(private packageApi: PackageApiService, private router: Router) {}

  ngOnInit() {
    this.packageApi.list().subscribe({
      next: (res) => { this.packages.set(res.items.slice(0, 3)); this.pkgLoading.set(false); },
      error: () => this.pkgLoading.set(false),
    });
  }

  goSearch() {
    const q = this.searchCtrl.value;
    this.router.navigate(['/tests'], q ? { queryParams: { q } } : {});
  }

  bookPackage(pkg: Package) {
    this.router.navigate(['/booking'], { queryParams: { package_id: pkg.id } });
  }
}
