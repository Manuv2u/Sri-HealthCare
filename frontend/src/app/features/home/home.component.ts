import { Component, OnInit, signal, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
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
    <!-- ══════════════════════════════════════════
         HERO
    ══════════════════════════════════════════ -->
    <section class="hero" aria-label="Hero">
      <canvas #heroCanvas class="hero-canvas" aria-hidden="true"></canvas>
      <div class="hero-inner">
        <div class="hero-text-col">
          <div class="trust-badge">
            <span class="trust-stars">★★★★★</span>
            <span>4.8 &nbsp;·&nbsp; Trusted by 50,000+ patients</span>
          </div>
          <h1 class="hero-headline">
            Book Lab Tests<br>
            <span class="hero-headline-accent">at Home</span>
          </h1>
          <p class="hero-sub">
            Certified phlebotomists, NABL-accredited labs, and same-day reports —
            all from the comfort of your home across Shivamogga and beyond.
          </p>
          <div class="hero-ctas">
            <a routerLink="/booking" class="btn-primary">
              <mat-icon>calendar_today</mat-icon>
              Book a Test
            </a>
            <a routerLink="/tests" class="btn-outline">
              <mat-icon>biotech</mat-icon>
              View Tests
            </a>
          </div>
          <div class="hero-chips">
            <a routerLink="/reports" class="hero-chip">
              <mat-icon>download</mat-icon> Reports
            </a>
            <a routerLink="/profile" class="hero-chip">
              <mat-icon>group</mat-icon> Family
            </a>
            <a routerLink="/packages" class="hero-chip">
              <mat-icon>inventory_2</mat-icon> Packages
            </a>
          </div>
        </div>
        <div class="hero-visual-col" aria-hidden="true">
          <div class="hero-card-stack">
            <div class="hv-card hv-card-main">
              <div class="hvc-icon-row">
                <div class="hvc-icon-box hvc-ib-1"><mat-icon>biotech</mat-icon></div>
                <div class="hvc-icon-box hvc-ib-2"><mat-icon>science</mat-icon></div>
              </div>
              <div class="hvc-icon-row">
                <div class="hvc-icon-box hvc-ib-3"><mat-icon>vaccines</mat-icon></div>
                <div class="hvc-icon-box hvc-ib-4"><mat-icon>monitor_heart</mat-icon></div>
              </div>
              <div class="hvc-label">NABL Accredited Lab</div>
            </div>
            <div class="hv-card hv-card-stat">
              <span class="hvs-num">99.9%</span>
              <span class="hvs-label">Accuracy Rate</span>
            </div>
            <div class="hv-card hv-card-report">
              <mat-icon>task_alt</mat-icon>
              <div>
                <div class="hvr-title">Report Ready</div>
                <div class="hvr-sub">Same day delivery</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ══════════════════════════════════════════
         STATS BAR
    ══════════════════════════════════════════ -->
    <section class="stats-bar" aria-label="Key stats">
      <div class="stats-inner">
        <div class="stat-item">
          <span class="stat-icon"><mat-icon>people</mat-icon></span>
          <div>
            <span class="stat-num">50K+</span>
            <span class="stat-label">Patients</span>
          </div>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-item">
          <span class="stat-icon"><mat-icon>biotech</mat-icon></span>
          <div>
            <span class="stat-num">200+</span>
            <span class="stat-label">Tests Available</span>
          </div>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-item">
          <span class="stat-icon"><mat-icon>location_on</mat-icon></span>
          <div>
            <span class="stat-num">15+</span>
            <span class="stat-label">Branches</span>
          </div>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-item">
          <span class="stat-icon"><mat-icon>speed</mat-icon></span>
          <div>
            <span class="stat-num">Same Day</span>
            <span class="stat-label">Reports</span>
          </div>
        </div>
      </div>
    </section>

    <!-- ══════════════════════════════════════════
         WHY CHOOSE US
    ══════════════════════════════════════════ -->
    <section class="section why-section" aria-labelledby="why-heading">
      <div class="section-inner">
        <div class="section-eyebrow">Why Sri Health</div>
        <h2 id="why-heading" class="section-heading">Built around your convenience</h2>
        <p class="section-sub">Every step is designed so getting tested feels effortless, not clinical.</p>
        <div class="why-grid">
          <div class="why-card why-card-anim">
            <div class="why-icon why-icon-indigo">
              <mat-icon>home</mat-icon>
            </div>
            <h3>Home Collection</h3>
            <p>Certified phlebotomists arrive at your door with sterile, single-use kits. No clinic, no queue.</p>
          </div>
          <div class="why-card why-card-anim">
            <div class="why-icon why-icon-orange">
              <mat-icon>verified</mat-icon>
            </div>
            <h3>Expert Lab</h3>
            <p>Every sample is processed at our NABL-accredited facility and reviewed by MD pathologists.</p>
          </div>
          <div class="why-card why-card-anim">
            <div class="why-icon why-icon-green">
              <mat-icon>speed</mat-icon>
            </div>
            <h3>Same Day Reports</h3>
            <p>Most results are delivered digitally within hours — no waiting, no follow-up calls.</p>
          </div>
          <div class="why-card why-card-anim">
            <div class="why-icon why-icon-purple">
              <mat-icon>workspace_premium</mat-icon>
            </div>
            <h3>Certified Results</h3>
            <p>ISO 9001:2015 and NABL certified. Every report carries the quality mark your doctor trusts.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ══════════════════════════════════════════
         POPULAR TESTS
    ══════════════════════════════════════════ -->
    <section class="section popular-section" aria-labelledby="popular-heading">
      <div class="section-inner">
        <div class="popular-header">
          <div>
            <div class="section-eyebrow">Most Booked</div>
            <h2 id="popular-heading" class="section-heading">Popular Tests</h2>
          </div>
          <a routerLink="/tests" class="link-arrow">Browse all tests <mat-icon>arrow_forward</mat-icon></a>
        </div>
        <div class="tests-grid">
          <a routerLink="/tests" class="test-chip">
            <div class="test-chip-icon"><mat-icon>bloodtype</mat-icon></div>
            <div>
              <div class="test-chip-name">CBC</div>
              <div class="test-chip-full">Complete Blood Count</div>
            </div>
          </a>
          <a routerLink="/tests" class="test-chip">
            <div class="test-chip-icon"><mat-icon>science</mat-icon></div>
            <div>
              <div class="test-chip-name">LFT</div>
              <div class="test-chip-full">Liver Function Test</div>
            </div>
          </a>
          <a routerLink="/tests" class="test-chip">
            <div class="test-chip-icon"><mat-icon>water_drop</mat-icon></div>
            <div>
              <div class="test-chip-name">KFT</div>
              <div class="test-chip-full">Kidney Function Test</div>
            </div>
          </a>
          <a routerLink="/tests" class="test-chip">
            <div class="test-chip-icon"><mat-icon>monitor_heart</mat-icon></div>
            <div>
              <div class="test-chip-name">Thyroid</div>
              <div class="test-chip-full">T3 / T4 / TSH Panel</div>
            </div>
          </a>
          <a routerLink="/tests" class="test-chip">
            <div class="test-chip-icon"><mat-icon>favorite</mat-icon></div>
            <div>
              <div class="test-chip-name">Lipid Profile</div>
              <div class="test-chip-full">Cholesterol Panel</div>
            </div>
          </a>
          <a routerLink="/tests" class="test-chip">
            <div class="test-chip-icon"><mat-icon>vaccines</mat-icon></div>
            <div>
              <div class="test-chip-name">HbA1c</div>
              <div class="test-chip-full">Diabetes Marker</div>
            </div>
          </a>
        </div>
      </div>
    </section>

    <!-- ══════════════════════════════════════════
         HOW IT WORKS
    ══════════════════════════════════════════ -->
    <section class="section how-section" aria-labelledby="how-heading">
      <div class="section-inner">
        <div class="section-eyebrow">Simple Process</div>
        <h2 id="how-heading" class="section-heading">How it works</h2>
        <p class="section-sub">From booking to report, everything happens in four steps.</p>
        <div class="steps-row">
          <div class="step">
            <div class="step-num">1</div>
            <div class="step-icon"><mat-icon>checklist</mat-icon></div>
            <h4>Choose Tests</h4>
            <p>Pick individual tests or a health package that suits your needs.</p>
          </div>
          <div class="step-connector" aria-hidden="true"></div>
          <div class="step">
            <div class="step-num">2</div>
            <div class="step-icon"><mat-icon>calendar_today</mat-icon></div>
            <h4>Book a Slot</h4>
            <p>Select a date and time that works for you — early morning slots available.</p>
          </div>
          <div class="step-connector" aria-hidden="true"></div>
          <div class="step">
            <div class="step-num">3</div>
            <div class="step-icon"><mat-icon>vaccines</mat-icon></div>
            <h4>Sample Collected</h4>
            <p>Our phlebotomist arrives at your door and collects the sample hygienically.</p>
          </div>
          <div class="step-connector" aria-hidden="true"></div>
          <div class="step">
            <div class="step-num">4</div>
            <div class="step-icon"><mat-icon>description</mat-icon></div>
            <h4>Get Reports</h4>
            <p>Reports are sent to your phone and available in your dashboard same day.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ══════════════════════════════════════════
         CTA BANNER
    ══════════════════════════════════════════ -->
    <section class="cta-banner" aria-label="Call to action">
      <div class="cta-banner-inner">
        <div class="cta-text">
          <h2>Get tested from the<br>comfort of your home</h2>
          <p>Shivamogga's most trusted diagnostic lab — now at your doorstep.</p>
        </div>
        <a routerLink="/booking" class="btn-primary btn-primary-large">
          <mat-icon>calendar_today</mat-icon>
          Book Now
        </a>
      </div>
    </section>

    <!-- ══════════════════════════════════════════
         FOOTER
    ══════════════════════════════════════════ -->
    <footer class="home-footer">
      <div class="footer-inner">
        <div class="footer-brand">
          <img src="assets/logo.png" alt="SRI Diagnostic Laboratory" class="footer-logo" />
          <strong>SRI Diagnostic Laboratory & Health Care</strong>
          <p>Setting new standards in diagnostic excellence across Shivamogga.</p>
          <div class="footer-contact">
            <span>
              <mat-icon>location_on</mat-icon>
              Shiva jyothi complex, Kuvempu road near Hosmane 2nd cross, Shivamogga 577201
            </span>
            <span>
              <mat-icon>phone</mat-icon>
              7795***207
            </span>
          </div>
          <div class="footer-social">
            <a href="https://instagram.com" target="_blank" rel="noopener" aria-label="Instagram">
              <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
            </a>
            <a href="https://facebook.com" target="_blank" rel="noopener" aria-label="Facebook">
              <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
            </a>
            <a href="https://twitter.com" target="_blank" rel="noopener" aria-label="Twitter / X">
              <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            </a>
          </div>
        </div>
        <div class="footer-col">
          <strong>Popular Tests</strong>
          <a routerLink="/tests">Complete Blood Count</a>
          <a routerLink="/tests">Thyroid Profile (T3, T4, TSH)</a>
          <a routerLink="/tests">HbA1c Fasting Panel</a>
          <a routerLink="/tests">Lipid Profile</a>
          <a routerLink="/tests">Kidney Function Test</a>
        </div>
        <div class="footer-col">
          <strong>Quick Links</strong>
          <a routerLink="/tests">Browse Tests</a>
          <a routerLink="/packages">Health Packages</a>
          <a routerLink="/booking">Book Now</a>
          <a routerLink="/about">About Us</a>
          <a routerLink="/contact">Contact Us</a>
          <a routerLink="/auth/login">Sign In</a>
        </div>
        <div class="footer-col">
          <strong>Newsletter</strong>
          <p class="footer-nl-desc">Health tips and package offers, straight to your inbox.</p>
          <div class="footer-nl">
            <input placeholder="Email address" aria-label="Email address for newsletter" />
            <button type="button">Join</button>
          </div>
          <div class="footer-badges">
            <span class="footer-badge"><mat-icon>verified</mat-icon> NABL</span>
            <span class="footer-badge"><mat-icon>workspace_premium</mat-icon> ISO 9001</span>
          </div>
        </div>
      </div>
      <div class="footer-bottom">
        <span>© 2026 SRI Diagnostic Laboratory & Health Care. All rights reserved.</span>
        <span class="footer-links">
          <a>Privacy Policy</a>
          <a>Terms of Service</a>
        </span>
      </div>
    </footer>
  `,
  styles: [`
    /* ──────────────────────────────────────────
       TOKENS
    ────────────────────────────────────────── */
    :host {
      --indigo:       #6366F1;
      --indigo-dark:  #4F46E5;
      --indigo-xdark: #3730A3;
      --indigo-light: #EEF2FF;
      --indigo-mid:   #C7D2FE;
      --orange:       #F97316;
      --orange-dark:  #EA580C;
      --orange-light: #FFF7ED;
      --green:        #22C55E;
      --green-light:  #DCFCE7;
      --purple:       #A855F7;
      --purple-light: #F3E8FF;
      --bg:           #F8F9FF;
      --surface:      #FFFFFF;
      --text:         #0F172A;
      --text-2:       #475569;
      --muted:        #94A3B8;
      --border:       #E2E8F0;
      --r:            12px;
      --r-lg:         16px;
      --r-xl:         20px;
      --r-pill:       999px;

      display: block;
      background: var(--bg);
      font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      color: var(--text);
      -webkit-font-smoothing: antialiased;
    }

    /* ──────────────────────────────────────────
       HERO
    ────────────────────────────────────────── */
    .hero {
      position: relative;
      min-height: 600px;
      background: linear-gradient(135deg, #312e81 0%, #4338ca 35%, #6366f1 65%, #7c3aed 100%);
      overflow: hidden;
      display: flex;
      align-items: center;
      padding: 5rem 1.5rem 4rem;
    }

    .hero-canvas {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
    }

    .hero-inner {
      position: relative;
      z-index: 1;
      max-width: 1140px;
      margin: 0 auto;
      width: 100%;
      display: grid;
      grid-template-columns: 1fr 420px;
      gap: 4rem;
      align-items: center;
    }

    /* Trust badge */
    .trust-badge {
      display: inline-flex;
      align-items: center;
      gap: .5rem;
      background: rgba(255,255,255,.12);
      border: 1px solid rgba(255,255,255,.25);
      backdrop-filter: blur(8px);
      border-radius: var(--r-pill);
      padding: .35rem 1rem;
      font-size: .82rem;
      font-weight: 600;
      color: rgba(255,255,255,.95);
      margin-bottom: 1.25rem;
      width: fit-content;
    }
    .trust-stars {
      color: #FBBF24;
      letter-spacing: .05em;
      font-size: .9rem;
    }

    /* Headline */
    .hero-headline {
      font-size: clamp(2.4rem, 5vw, 3.5rem);
      font-weight: 800;
      line-height: 1.1;
      color: #fff;
      margin: 0 0 1.25rem;
      text-wrap: balance;
    }
    .hero-headline-accent {
      color: #FBBF24;
    }

    .hero-sub {
      font-size: 1.05rem;
      color: rgba(255,255,255,.82);
      line-height: 1.7;
      max-width: 48ch;
      margin: 0 0 2rem;
    }

    /* CTAs */
    .hero-ctas {
      display: flex;
      flex-wrap: wrap;
      gap: .875rem;
      margin-bottom: 1.5rem;
    }

    .btn-primary {
      display: inline-flex;
      align-items: center;
      gap: .5rem;
      background: var(--orange);
      color: #fff;
      border: none;
      border-radius: var(--r);
      padding: .875rem 1.75rem;
      font-size: .975rem;
      font-weight: 700;
      text-decoration: none;
      cursor: pointer;
      transition: background .18s, transform .18s, box-shadow .18s;
      box-shadow: 0 4px 20px rgba(249,115,22,.4);
      min-height: 52px;
      mat-icon { font-size: 1.1rem; width: 1.1rem; height: 1.1rem; }
    }
    .btn-primary:hover {
      background: var(--orange-dark);
      transform: translateY(-2px);
      box-shadow: 0 8px 28px rgba(249,115,22,.5);
      text-decoration: none;
    }
    .btn-primary:active { transform: translateY(0); }

    .btn-primary-large {
      padding: 1rem 2.25rem;
      font-size: 1.05rem;
      border-radius: var(--r-lg);
    }

    .btn-outline {
      display: inline-flex;
      align-items: center;
      gap: .5rem;
      background: rgba(255,255,255,.1);
      color: #fff;
      border: 1.5px solid rgba(255,255,255,.45);
      border-radius: var(--r);
      padding: .875rem 1.75rem;
      font-size: .975rem;
      font-weight: 700;
      text-decoration: none;
      cursor: pointer;
      transition: background .18s, border-color .18s, transform .18s;
      min-height: 52px;
      backdrop-filter: blur(4px);
      mat-icon { font-size: 1.1rem; width: 1.1rem; height: 1.1rem; }
    }
    .btn-outline:hover {
      background: rgba(255,255,255,.18);
      border-color: rgba(255,255,255,.7);
      transform: translateY(-2px);
      text-decoration: none;
    }

    /* Quick chips */
    .hero-chips {
      display: flex;
      flex-wrap: wrap;
      gap: .5rem;
    }
    .hero-chip {
      display: inline-flex;
      align-items: center;
      gap: .35rem;
      background: rgba(255,255,255,.1);
      border: 1px solid rgba(255,255,255,.2);
      border-radius: var(--r-pill);
      padding: .4rem .9rem;
      font-size: .82rem;
      font-weight: 600;
      color: rgba(255,255,255,.9);
      text-decoration: none;
      transition: background .15s;
      mat-icon { font-size: .95rem; width: .95rem; height: .95rem; }
    }
    .hero-chip:hover {
      background: rgba(255,255,255,.2);
      text-decoration: none;
    }

    /* Visual column */
    .hero-visual-col {
      display: flex;
      justify-content: center;
    }
    .hero-card-stack {
      position: relative;
      width: 340px;
      height: 360px;
    }
    .hv-card {
      position: absolute;
      background: rgba(255,255,255,.12);
      backdrop-filter: blur(16px);
      border: 1px solid rgba(255,255,255,.22);
      border-radius: var(--r-xl);
      padding: 1.25rem;
      color: #fff;
    }
    .hv-card-main {
      top: 0; left: 0; right: 0;
      padding: 1.75rem;
    }
    .hvc-icon-row {
      display: flex;
      gap: 1rem;
      margin-bottom: 1rem;
    }
    .hvc-icon-box {
      width: 68px;
      height: 68px;
      border-radius: var(--r-lg);
      display: flex;
      align-items: center;
      justify-content: center;
      mat-icon { font-size: 2rem; width: 2rem; height: 2rem; }
    }
    .hvc-ib-1 { background: rgba(99,102,241,.45); }
    .hvc-ib-2 { background: rgba(168,85,247,.45); }
    .hvc-ib-3 { background: rgba(249,115,22,.45); }
    .hvc-ib-4 { background: rgba(34,197,94,.35); }
    .hvc-label {
      font-size: .78rem;
      font-weight: 700;
      letter-spacing: .08em;
      text-transform: uppercase;
      color: rgba(255,255,255,.7);
      margin-top: .5rem;
    }
    .hv-card-stat {
      bottom: 60px; right: -20px;
      background: #fff;
      border-radius: var(--r-lg);
      padding: 1rem 1.25rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: .15rem;
      box-shadow: 0 8px 32px rgba(0,0,0,.18);
    }
    .hvs-num {
      font-size: 1.6rem;
      font-weight: 800;
      color: var(--indigo);
    }
    .hvs-label {
      font-size: .72rem;
      font-weight: 600;
      color: var(--text-2);
      letter-spacing: .04em;
    }
    .hv-card-report {
      bottom: 0; left: -10px;
      background: var(--orange);
      border-radius: var(--r-lg);
      padding: .875rem 1rem;
      display: flex;
      align-items: center;
      gap: .65rem;
      box-shadow: 0 8px 24px rgba(249,115,22,.5);
      mat-icon { font-size: 1.5rem; width: 1.5rem; height: 1.5rem; }
    }
    .hvr-title {
      font-size: .875rem;
      font-weight: 700;
      color: #fff;
    }
    .hvr-sub {
      font-size: .75rem;
      color: rgba(255,255,255,.75);
    }

    /* ──────────────────────────────────────────
       STATS BAR
    ────────────────────────────────────────── */
    .stats-bar {
      background: var(--indigo-xdark);
      padding: 1.25rem 1.5rem;
    }
    .stats-inner {
      max-width: 1140px;
      margin: 0 auto;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0;
      flex-wrap: wrap;
    }
    .stat-item {
      display: flex;
      align-items: center;
      gap: .75rem;
      padding: .75rem 2.5rem;
      flex: 1;
      min-width: 140px;
      justify-content: center;
    }
    .stat-icon {
      width: 40px;
      height: 40px;
      background: rgba(255,255,255,.12);
      border-radius: var(--r);
      display: flex;
      align-items: center;
      justify-content: center;
      mat-icon { color: var(--indigo-mid); font-size: 1.2rem; width: 1.2rem; height: 1.2rem; }
    }
    .stat-item > div {
      display: flex;
      flex-direction: column;
    }
    .stat-num {
      font-size: 1.25rem;
      font-weight: 800;
      color: #fff;
      line-height: 1.2;
      font-variant-numeric: tabular-nums;
    }
    .stat-label {
      font-size: .72rem;
      font-weight: 600;
      color: rgba(255,255,255,.6);
      letter-spacing: .06em;
      text-transform: uppercase;
    }
    .stat-divider {
      width: 1px;
      height: 36px;
      background: rgba(255,255,255,.15);
      flex-shrink: 0;
    }

    /* ──────────────────────────────────────────
       SHARED SECTION STYLES
    ────────────────────────────────────────── */
    .section {
      padding: 5rem 1.5rem;
    }
    .section-inner {
      max-width: 1140px;
      margin: 0 auto;
    }
    .section-eyebrow {
      font-size: .78rem;
      font-weight: 700;
      letter-spacing: .1em;
      text-transform: uppercase;
      color: var(--indigo);
      margin-bottom: .6rem;
    }
    .section-heading {
      font-size: clamp(1.6rem, 3vw, 2.25rem);
      font-weight: 800;
      color: var(--text);
      margin: 0 0 .75rem;
      text-wrap: balance;
    }
    .section-sub {
      font-size: 1rem;
      color: var(--text-2);
      line-height: 1.7;
      max-width: 54ch;
      margin: 0 0 2.75rem;
    }

    /* ──────────────────────────────────────────
       WHY SECTION
    ────────────────────────────────────────── */
    .why-section {
      background: var(--surface);
    }
    .why-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1.5rem;
    }
    .why-card {
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: var(--r-lg);
      padding: 1.75rem 1.5rem;
      display: flex;
      flex-direction: column;
      gap: .875rem;
      transition: transform .2s, box-shadow .2s, border-color .2s;
    }
    .why-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 12px 32px rgba(99,102,241,.1);
      border-color: var(--indigo-mid);
    }
    .why-card h3 {
      font-size: 1rem;
      font-weight: 700;
      color: var(--text);
      margin: 0;
    }
    .why-card p {
      font-size: .875rem;
      color: var(--text-2);
      line-height: 1.65;
      margin: 0;
    }
    .why-icon {
      width: 52px;
      height: 52px;
      border-radius: var(--r);
      display: flex;
      align-items: center;
      justify-content: center;
      mat-icon { font-size: 1.4rem; width: 1.4rem; height: 1.4rem; }
    }
    .why-icon-indigo {
      background: var(--indigo-light);
      mat-icon { color: var(--indigo); }
    }
    .why-icon-orange {
      background: var(--orange-light);
      mat-icon { color: var(--orange); }
    }
    .why-icon-green {
      background: var(--green-light);
      mat-icon { color: var(--green); }
    }
    .why-icon-purple {
      background: var(--purple-light);
      mat-icon { color: var(--purple); }
    }

    /* ──────────────────────────────────────────
       POPULAR TESTS
    ────────────────────────────────────────── */
    .popular-section {
      background: var(--bg);
    }
    .popular-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-bottom: 2rem;
      flex-wrap: wrap;
      gap: 1rem;
    }
    .popular-header .section-heading {
      margin-bottom: 0;
    }
    .link-arrow {
      display: inline-flex;
      align-items: center;
      gap: .3rem;
      font-size: .9rem;
      font-weight: 600;
      color: var(--indigo);
      text-decoration: none;
      transition: gap .15s;
      mat-icon { font-size: 1rem; width: 1rem; height: 1rem; transition: transform .15s; }
    }
    .link-arrow:hover {
      text-decoration: none;
      mat-icon { transform: translateX(3px); }
    }
    .tests-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1rem;
    }
    .test-chip {
      display: flex;
      align-items: center;
      gap: 1rem;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--r-lg);
      padding: 1.1rem 1.25rem;
      text-decoration: none;
      color: var(--text);
      transition: border-color .18s, box-shadow .18s, transform .18s;
    }
    .test-chip:hover {
      border-color: var(--indigo);
      box-shadow: 0 4px 16px rgba(99,102,241,.12);
      transform: translateY(-2px);
      text-decoration: none;
    }
    .test-chip-icon {
      width: 44px;
      height: 44px;
      background: var(--indigo-light);
      border-radius: var(--r);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      mat-icon { font-size: 1.2rem; width: 1.2rem; height: 1.2rem; color: var(--indigo); }
    }
    .test-chip-name {
      font-size: .95rem;
      font-weight: 700;
      color: var(--text);
    }
    .test-chip-full {
      font-size: .78rem;
      color: var(--muted);
      margin-top: .1rem;
    }

    /* ──────────────────────────────────────────
       HOW IT WORKS
    ────────────────────────────────────────── */
    .how-section {
      background: var(--surface);
    }
    .steps-row {
      display: flex;
      align-items: flex-start;
      gap: 0;
    }
    .step {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: .875rem;
      padding: 0 1rem;
    }
    .step-num {
      width: 36px;
      height: 36px;
      background: var(--indigo);
      color: #fff;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: .875rem;
      font-weight: 800;
      flex-shrink: 0;
    }
    .step-icon {
      width: 64px;
      height: 64px;
      background: var(--indigo-light);
      border-radius: var(--r-lg);
      display: flex;
      align-items: center;
      justify-content: center;
      mat-icon { font-size: 1.6rem; width: 1.6rem; height: 1.6rem; color: var(--indigo); }
    }
    .step h4 {
      font-size: 1rem;
      font-weight: 700;
      color: var(--text);
      margin: 0;
    }
    .step p {
      font-size: .875rem;
      color: var(--text-2);
      line-height: 1.65;
      margin: 0;
    }
    .step-connector {
      flex-shrink: 0;
      width: 60px;
      height: 2px;
      background: linear-gradient(90deg, var(--indigo-mid), var(--indigo));
      margin-top: 82px;
      position: relative;
    }
    .step-connector::after {
      content: '';
      position: absolute;
      right: -5px;
      top: -4px;
      border: 5px solid transparent;
      border-left-color: var(--indigo);
    }

    /* ──────────────────────────────────────────
       CTA BANNER
    ────────────────────────────────────────── */
    .cta-banner {
      background: linear-gradient(135deg, #312e81 0%, #4F46E5 60%, #7c3aed 100%);
      padding: 5rem 1.5rem;
    }
    .cta-banner-inner {
      max-width: 1140px;
      margin: 0 auto;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 2rem;
      flex-wrap: wrap;
    }
    .cta-text h2 {
      font-size: clamp(1.6rem, 3.5vw, 2.25rem);
      font-weight: 800;
      color: #fff;
      margin: 0 0 .75rem;
      text-wrap: balance;
      line-height: 1.2;
    }
    .cta-text p {
      font-size: 1rem;
      color: rgba(255,255,255,.75);
      margin: 0;
    }

    /* ──────────────────────────────────────────
       FOOTER
    ────────────────────────────────────────── */
    .home-footer {
      background: #0F172A;
      color: #94A3B8;
      padding: 4rem 1.5rem 1.5rem;
    }
    .footer-inner {
      max-width: 1140px;
      margin: 0 auto;
      display: grid;
      grid-template-columns: 2fr 1fr 1fr 1.5fr;
      gap: 2.5rem;
      margin-bottom: 3rem;
    }
    .footer-brand strong {
      color: #fff;
      font-size: 1rem;
      display: block;
      margin-bottom: .5rem;
    }
    .footer-brand p {
      font-size: .85rem;
      line-height: 1.65;
      margin: 0 0 .75rem;
    }
    .footer-logo {
      height: 52px;
      width: auto;
      object-fit: contain;
      margin-bottom: .75rem;
      display: block;
    }
    .footer-contact {
      display: flex;
      flex-direction: column;
      gap: .4rem;
      margin-bottom: .875rem;
    }
    .footer-contact span {
      display: flex;
      align-items: flex-start;
      gap: .4rem;
      font-size: .8rem;
      line-height: 1.5;
      mat-icon { font-size: .95rem; width: .95rem; height: .95rem; color: var(--indigo); flex-shrink: 0; margin-top: .1rem; }
    }
    .footer-social {
      display: flex;
      gap: .75rem;
    }
    .footer-social a {
      color: #64748B;
      display: flex;
      align-items: center;
      transition: color .15s;
    }
    .footer-social a:hover { color: #fff; }

    .footer-col {
      display: flex;
      flex-direction: column;
      gap: .5rem;
    }
    .footer-col strong {
      color: #fff;
      font-size: .875rem;
      margin-bottom: .35rem;
    }
    .footer-col a {
      font-size: .84rem;
      color: #64748B;
      text-decoration: none;
      cursor: pointer;
      transition: color .15s;
    }
    .footer-col a:hover { color: #fff; }

    .footer-nl-desc {
      font-size: .8rem;
      margin: 0 0 .6rem;
      line-height: 1.55;
    }
    .footer-nl {
      display: flex;
      gap: .5rem;
      margin-bottom: 1rem;
    }
    .footer-nl input {
      flex: 1;
      background: #1E293B;
      border: 1px solid #334155;
      border-radius: var(--r);
      padding: .5rem .75rem;
      color: #fff;
      font-size: .84rem;
      outline: none;
      transition: border-color .15s;
    }
    .footer-nl input::placeholder { color: #475569; }
    .footer-nl input:focus { border-color: var(--indigo); }
    .footer-nl button {
      background: var(--indigo);
      color: #fff;
      border: none;
      border-radius: var(--r);
      padding: .5rem 1rem;
      font-size: .84rem;
      font-weight: 600;
      cursor: pointer;
      transition: background .15s;
      white-space: nowrap;
    }
    .footer-nl button:hover { background: var(--indigo-dark); }

    .footer-badges {
      display: flex;
      gap: .5rem;
      flex-wrap: wrap;
    }
    .footer-badge {
      display: inline-flex;
      align-items: center;
      gap: .25rem;
      background: #1E293B;
      border: 1px solid #334155;
      border-radius: var(--r);
      padding: .25rem .6rem;
      font-size: .72rem;
      font-weight: 600;
      color: #94A3B8;
      mat-icon { font-size: .8rem; width: .8rem; height: .8rem; color: var(--indigo); }
    }

    .footer-bottom {
      max-width: 1140px;
      margin: 0 auto;
      border-top: 1px solid #1E293B;
      padding-top: 1.5rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: .8rem;
      flex-wrap: wrap;
      gap: .5rem;
    }
    .footer-links {
      display: flex;
      gap: 1.5rem;
    }
    .footer-links a {
      color: #475569;
      cursor: pointer;
      text-decoration: none;
      transition: color .15s;
    }
    .footer-links a:hover { color: #fff; }

    /* ──────────────────────────────────────────
       RESPONSIVE
    ────────────────────────────────────────── */
    @media (max-width: 1024px) {
      .why-grid { grid-template-columns: repeat(2, 1fr); }
      .hero-inner { grid-template-columns: 1fr; }
      .hero-visual-col { display: none; }
    }

    @media (max-width: 768px) {
      .hero { padding: 3.5rem 1.25rem 3rem; }
      .section { padding: 3.5rem 1.25rem; }
      .tests-grid { grid-template-columns: repeat(2, 1fr); }
      .steps-row { flex-direction: column; align-items: center; gap: 2rem; }
      .step-connector { width: 2px; height: 40px; margin-top: 0; }
      .step-connector::after {
        right: -4px;
        top: auto;
        bottom: -5px;
        border-left-color: transparent;
        border-top-color: var(--indigo);
      }
      .cta-banner-inner { flex-direction: column; align-items: flex-start; }
      .footer-inner { grid-template-columns: 1fr 1fr; }
      .stat-divider { display: none; }
      .stat-item { padding: .75rem 1.25rem; }
    }

    @media (max-width: 480px) {
      .hero { padding: 2.5rem 1rem 2.5rem; }
      .hero-headline { font-size: 2rem; }
      .hero-ctas { flex-direction: column; }
      .btn-primary, .btn-outline { width: 100%; justify-content: center; }
      .why-grid { grid-template-columns: 1fr; }
      .tests-grid { grid-template-columns: 1fr; }
      .footer-inner { grid-template-columns: 1fr; }
      .stats-inner { justify-content: flex-start; }
    }

    /* ──────────────────────────────────────────
       REDUCED MOTION
    ────────────────────────────────────────── */
    @media (prefers-reduced-motion: reduce) {
      .why-card, .test-chip, .btn-primary, .btn-outline { transition: none; }
    }
  `],
})
export class HomeComponent implements OnInit, AfterViewInit {
  @ViewChild('heroCanvas') heroCanvasRef!: ElementRef<HTMLCanvasElement>;

  packages = signal<Package[]>([]);
  pkgLoading = signal(true);

  constructor(private packageApi: PackageApiService, private router: Router) {}

  ngOnInit() {
    this.packageApi.list().subscribe({
      next: (res) => { this.packages.set(res.items.slice(0, 3)); this.pkgLoading.set(false); },
      error: () => this.pkgLoading.set(false),
    });
  }

  ngAfterViewInit() {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;
    this.startHeroCanvas();
  }

  private startHeroCanvas() {
    const canvas = this.heroCanvasRef?.nativeElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const orbs = [
      { x: 0.15, y: 0.2, r: 320, color: 'rgba(99,102,241,0.35)', dx: 0.00012, dy: 0.00007 },
      { x: 0.75, y: 0.6, r: 280, color: 'rgba(124,58,237,0.3)', dx: -0.0001, dy: 0.00008 },
      { x: 0.55, y: 0.1, r: 200, color: 'rgba(249,115,22,0.18)', dx: 0.00008, dy: -0.00006 },
      { x: 0.35, y: 0.75, r: 240, color: 'rgba(139,92,246,0.22)', dx: -0.00007, dy: -0.0001 },
    ];

    let animId: number;
    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      for (const o of orbs) {
        o.x += o.dx;
        o.y += o.dy;
        if (o.x < 0 || o.x > 1) o.dx *= -1;
        if (o.y < 0 || o.y > 1) o.dy *= -1;
        const grad = ctx.createRadialGradient(o.x * w, o.y * h, 0, o.x * w, o.y * h, o.r);
        grad.addColorStop(0, o.color);
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(o.x * w, o.y * h, o.r, 0, Math.PI * 2);
        ctx.fill();
      }
      animId = requestAnimationFrame(draw);
    };
    draw();
  }
}
