import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [RouterLink, MatIconModule],
  template: `
    <div class="page-container">
      <div class="about-hero">
        <img src="assets/logo.png" alt="SRI Diagnostic Laboratory" class="about-logo" />
        <h1>SRI Diagnostic Laboratory & Health Care</h1>
        <p class="about-tagline">Committed to clinical precision and compassionate care</p>
      </div>

      <div class="about-grid">
        <div class="about-card">
          <div class="about-icon"><mat-icon>info</mat-icon></div>
          <h3>Who We Are</h3>
          <p>SRI Diagnostic Laboratory & Health Care is a trusted diagnostic centre serving the Shivamogga region. We combine state-of-the-art technology with expert pathologists to deliver accurate, timely results you can rely on.</p>
        </div>
        <div class="about-card">
          <div class="about-icon"><mat-icon>visibility</mat-icon></div>
          <h3>Our Vision</h3>
          <p>To be the most trusted diagnostic partner in Karnataka, making quality healthcare accessible to every family through innovation, integrity, and excellence.</p>
        </div>
        <div class="about-card">
          <div class="about-icon"><mat-icon>favorite</mat-icon></div>
          <h3>Our Mission</h3>
          <p>Deliver accurate diagnostic results with speed and care, empowering patients and physicians to make informed health decisions.</p>
        </div>
      </div>

      <div class="about-stats">
        <div class="stat"><span class="stat-num">2M+</span><span class="stat-label">Tests Conducted</span></div>
        <div class="stat"><span class="stat-num">12+</span><span class="stat-label">Districts Served</span></div>
        <div class="stat"><span class="stat-num">99.9%</span><span class="stat-label">Accuracy Rate</span></div>
        <div class="stat"><span class="stat-num">24/7</span><span class="stat-label">Support Available</span></div>
      </div>

      <div class="about-badges">
        <span class="badge-item"><mat-icon>verified</mat-icon> NABL Accredited</span>
        <span class="badge-item"><mat-icon>workspace_premium</mat-icon> ISO 9001:2015</span>
        <span class="badge-item"><mat-icon>star</mat-icon> CAP Certified</span>
      </div>

      <div class="about-cta">
        <a routerLink="/contact" class="btn-primary">Contact Us</a>
        <a routerLink="/tests" class="btn-outline">Browse Tests</a>
      </div>
    </div>
  `,
  styles: [`
    .page-container { max-width: 1000px; margin: 0 auto; padding: 3rem 1.5rem; }
    .about-hero {
      text-align: center; margin-bottom: 3rem;
      .about-logo { height: 100px; width: auto; margin-bottom: 1.25rem; }
      h1 { font-size: 2rem; font-weight: 800; color: #1a202c; margin-bottom: .5rem; }
      .about-tagline { color: #718096; font-size: 1.05rem; }
    }
    .about-grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 1.5rem; margin-bottom: 3rem;
    }
    .about-card {
      background: #fff; border-radius: 14px; padding: 1.75rem;
      border: 1px solid #e2e8f0; box-shadow: 0 2px 8px rgba(0,0,0,.05);
      display: flex; flex-direction: column; gap: .75rem;
    }
    .about-icon {
      width: 48px; height: 48px; background: #e0f2f1; border-radius: 12px;
      display: flex; align-items: center; justify-content: center;
      mat-icon { color: #00796b; }
    }
    .about-card h3 { font-size: 1.05rem; font-weight: 700; color: #1a202c; }
    .about-card p { font-size: .9rem; color: #718096; line-height: 1.7; }
    .about-stats {
      display: flex; justify-content: center; flex-wrap: wrap; gap: 2.5rem;
      background: linear-gradient(135deg, #00796b, #26a69a);
      border-radius: 16px; padding: 2.5rem; margin-bottom: 2rem;
    }
    .stat { display: flex; flex-direction: column; align-items: center; gap: .25rem;
      .stat-num { font-size: 2.25rem; font-weight: 800; color: #fff; }
      .stat-label { font-size: .8rem; font-weight: 600; color: rgba(255,255,255,.8); text-transform: uppercase; letter-spacing: .05em; }
    }
    .about-badges {
      display: flex; flex-wrap: wrap; justify-content: center; gap: 1rem; margin-bottom: 2.5rem;
    }
    .badge-item {
      display: inline-flex; align-items: center; gap: .4rem;
      background: #f7fafc; border: 1px solid #e2e8f0; border-radius: 8px;
      padding: .5rem 1rem; font-size: .875rem; font-weight: 600; color: #4a5568;
      mat-icon { font-size: 1rem; width: 1rem; height: 1rem; color: #00796b; }
    }
    .about-cta { display: flex; justify-content: center; gap: 1rem; flex-wrap: wrap; }
    .btn-primary {
      background: #00796b; color: #fff; border-radius: 10px;
      padding: .65rem 1.75rem; font-size: .95rem; font-weight: 600; text-decoration: none;
      &:hover { background: #00695c; }
    }
    .btn-outline {
      background: transparent; color: #00796b; border: 2px solid #00796b; border-radius: 10px;
      padding: .65rem 1.75rem; font-size: .95rem; font-weight: 600; text-decoration: none;
      &:hover { background: #e0f2f1; }
    }
  `],
})
export class AboutComponent {}
