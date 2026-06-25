import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [MatIconModule],
  template: `
    <!-- ── HERO ─────────────────────────────────────────────────── -->
    <section class="hero">
      <div class="hero-bg-grid"></div>
      <div class="hero-inner">
        <div class="hero-eyebrow">
          <mat-icon class="eyebrow-icon">support_agent</mat-icon>
          <span>We're here to help</span>
        </div>
        <h1 class="hero-title">Get in touch<br><em class="hero-accent">with our team</em></h1>
        <p class="hero-sub">
          Whether you need help booking a test, understanding your results, or
          arranging a home collection — our team responds within hours.
        </p>
      </div>
      <div class="hero-hours" aria-label="Working hours">
        <div class="hours-card">
          <div class="hours-title">
            <mat-icon>schedule</mat-icon>
            Working Hours
          </div>
          <div class="hours-row">
            <span class="hours-day">Mon – Sat</span>
            <span class="hours-time">7:00 AM – 8:00 PM</span>
          </div>
          <div class="hours-row">
            <span class="hours-day">Sunday</span>
            <span class="hours-time">8:00 AM – 2:00 PM</span>
          </div>
          <div class="hours-badge">
            <span class="dot"></span> Open today
          </div>
        </div>
      </div>
    </section>

    <!-- ── CONTACT INFO + FORM ────────────────────────────────────── -->
    <section class="main-section">
      <div class="main-inner">

        <!-- left: info cards -->
        <div class="info-col">
          <h2 class="col-title">Reach us directly</h2>

          <div class="info-card">
            <div class="ic-icon ic-icon--indigo">
              <mat-icon>location_on</mat-icon>
            </div>
            <div class="ic-body">
              <h4>Our Address</h4>
              <p>
                Shiva Jyothi Complex, Kuvempu Road<br>
                Near Hosmane 2nd Cross<br>
                Shivamogga — 577 201, Karnataka
              </p>
              <a
                href="https://maps.google.com/?q=Shivamogga+577201"
                target="_blank"
                rel="noopener"
                class="ic-link"
              >
                Open in Maps <mat-icon>open_in_new</mat-icon>
              </a>
            </div>
          </div>

          <div class="info-card">
            <div class="ic-icon ic-icon--saffron">
              <mat-icon>phone</mat-icon>
            </div>
            <div class="ic-body">
              <h4>Call Us</h4>
              <p>Our front desk picks up within seconds.</p>
              <a href="tel:7795207" class="ic-link ic-link--lg">
                <mat-icon>phone_in_talk</mat-icon> 7795 207
              </a>
            </div>
          </div>

          <div class="info-card">
            <div class="ic-icon ic-icon--indigo">
              <mat-icon>mail</mat-icon>
            </div>
            <div class="ic-body">
              <h4>Email Us</h4>
              <p>Expect a reply within a few business hours.</p>
              <a href="mailto:info@srihealth.in" class="ic-link">
                info&#64;srihealth.in
              </a>
            </div>
          </div>

          <!-- social -->
          <div class="social-block">
            <span class="social-label">Find us on</span>
            <div class="social-links">
              <a href="https://instagram.com" target="_blank" rel="noopener"
                 aria-label="Instagram" class="social-btn">
                <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"
                     aria-hidden="true">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </a>
              <a href="https://facebook.com" target="_blank" rel="noopener"
                 aria-label="Facebook" class="social-btn">
                <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"
                     aria-hidden="true">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </a>
              <a href="https://twitter.com" target="_blank" rel="noopener"
                 aria-label="X / Twitter" class="social-btn">
                <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"
                     aria-hidden="true">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </a>
            </div>
          </div>
        </div>

        <!-- right: contact form -->
        <div class="form-col">
          <div class="form-card">
            <div class="form-header">
              <h2>Send a message</h2>
              <p>Fill in the form and we'll get back to you by phone or email.</p>
            </div>
            <form class="contact-form" (submit)="handleSubmit($event)">
              <div class="field-row">
                <div class="field-group">
                  <label for="cf-name">Full Name</label>
                  <div class="field-wrap">
                    <mat-icon class="field-icon">person</mat-icon>
                    <input
                      id="cf-name"
                      type="text"
                      placeholder="e.g. Ramesh Kumar"
                      autocomplete="name"
                    />
                  </div>
                </div>
                <div class="field-group">
                  <label for="cf-phone">Phone Number</label>
                  <div class="field-wrap">
                    <mat-icon class="field-icon">phone</mat-icon>
                    <input
                      id="cf-phone"
                      type="tel"
                      placeholder="e.g. 98765 43210"
                      autocomplete="tel"
                    />
                  </div>
                </div>
              </div>

              <div class="field-group">
                <label for="cf-email">Email Address</label>
                <div class="field-wrap">
                  <mat-icon class="field-icon">mail</mat-icon>
                  <input
                    id="cf-email"
                    type="email"
                    placeholder="you&#64;example.com"
                    autocomplete="email"
                  />
                </div>
              </div>

              <div class="field-group">
                <label for="cf-subject">Subject</label>
                <div class="field-wrap field-wrap--select">
                  <mat-icon class="field-icon">topic</mat-icon>
                  <select id="cf-subject">
                    <option value="" disabled selected>Select a topic…</option>
                    <option value="booking">Test Booking</option>
                    <option value="results">Report / Results</option>
                    <option value="home">Home Collection</option>
                    <option value="billing">Billing / Payment</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div class="field-group">
                <label for="cf-message">Message</label>
                <div class="field-wrap field-wrap--textarea">
                  <textarea
                    id="cf-message"
                    rows="4"
                    placeholder="Describe how we can help you…"
                  ></textarea>
                </div>
              </div>

              <button type="submit" class="submit-btn">
                <mat-icon>send</mat-icon> Send Message
              </button>
            </form>
          </div>
        </div>

      </div>
    </section>

    <!-- ── MAP SECTION ────────────────────────────────────────────── -->
    <section class="map-section">
      <div class="map-section-inner">
        <div class="map-header">
          <div class="map-header-text">
            <div class="section-label">Find Us</div>
            <h2>We're in the heart of Shivamogga</h2>
          </div>
          <a
            href="https://maps.google.com/?q=Shiva+Jyothi+Complex+Shivamogga"
            target="_blank"
            rel="noopener"
            class="btn-directions"
          >
            <mat-icon>directions</mat-icon> Get Directions
          </a>
        </div>
        <div class="map-wrapper">
          <iframe
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3886.0!2d75.5681!3d13.9299!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMTPCsDU1JzQ3LjYiTiA3NcKwMzQnMDUuMiJF!5e0!3m2!1sen!2sin!4v1234567890"
            width="100%"
            height="100%"
            style="border:0;"
            allowfullscreen
            loading="lazy"
            referrerpolicy="no-referrer-when-downgrade"
            title="SRI Diagnostic Lab — Shivamogga"
          ></iframe>
        </div>
      </div>
    </section>
  `,
  styles: [`
    :host {
      display: block;
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      background: #F8F9FF;
      color: #0F172A;
    }

    /* ── HERO ─────────────────────────────────────────────────────── */
    .hero {
      position: relative;
      background: linear-gradient(135deg, #4F46E5 0%, #6366F1 60%, #818CF8 100%);
      padding: 72px 24px 64px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 40px;
      overflow: hidden;
    }

    .hero-bg-grid {
      position: absolute;
      inset: 0;
      background-image:
        linear-gradient(rgba(255,255,255,.06) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255,255,255,.06) 1px, transparent 1px);
      background-size: 40px 40px;
      pointer-events: none;
    }

    .hero-inner {
      position: relative;
      z-index: 1;
      max-width: 540px;
      flex: 1;
    }

    .hero-eyebrow {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(255,255,255,.14);
      border: 1px solid rgba(255,255,255,.25);
      border-radius: 999px;
      padding: 5px 14px 5px 8px;
      color: #fff;
      font-size: 0.78rem;
      font-weight: 600;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      margin-bottom: 20px;
    }
    .eyebrow-icon {
      font-size: 15px;
      width: 15px;
      height: 15px;
      color: #FCD34D;
    }

    .hero-title {
      font-size: clamp(1.8rem, 3.5vw, 2.5rem);
      font-weight: 800;
      line-height: 1.2;
      color: #fff;
      text-wrap: balance;
      margin: 0 0 16px;
    }
    .hero-accent {
      font-style: normal;
      color: #FCD34D;
    }

    .hero-sub {
      font-size: 0.97rem;
      line-height: 1.72;
      color: rgba(255,255,255,.82);
      margin: 0;
      max-width: 460px;
    }

    /* hours card */
    .hero-hours {
      position: relative;
      z-index: 1;
      flex-shrink: 0;
    }

    .hours-card {
      background: rgba(255,255,255,.13);
      backdrop-filter: blur(12px);
      border: 1.5px solid rgba(255,255,255,.28);
      border-radius: 16px;
      padding: 22px 26px;
      color: #fff;
      min-width: 220px;
    }

    .hours-title {
      display: flex;
      align-items: center;
      gap: 7px;
      font-size: 0.78rem;
      font-weight: 700;
      letter-spacing: 0.07em;
      text-transform: uppercase;
      color: rgba(255,255,255,.65);
      margin-bottom: 14px;

      mat-icon { font-size: 15px; width: 15px; height: 15px; }
    }

    .hours-row {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 8px;
    }
    .hours-day { font-size: 0.85rem; color: rgba(255,255,255,.8); }
    .hours-time { font-size: 0.85rem; font-weight: 700; color: #fff; }

    .hours-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      margin-top: 12px;
      background: rgba(34,197,94,.2);
      border: 1px solid rgba(34,197,94,.4);
      border-radius: 999px;
      padding: 4px 10px;
      font-size: 0.75rem;
      font-weight: 600;
      color: #86EFAC;
    }
    .dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #22C55E;
    }

    @media (max-width: 660px) {
      .hero { flex-direction: column; padding: 56px 20px 48px; }
      .hero-hours { width: 100%; }
      .hours-card { min-width: unset; }
    }

    /* ── SHARED ───────────────────────────────────────────────────── */
    .section-label {
      display: inline-block;
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: #6366F1;
      background: #EEF2FF;
      border-radius: 999px;
      padding: 4px 12px;
      margin-bottom: 10px;
    }

    /* ── MAIN SECTION ─────────────────────────────────────────────── */
    .main-section {
      padding: 64px 0 56px;
    }

    .main-inner {
      max-width: 1040px;
      margin: 0 auto;
      padding: 0 24px;
      display: grid;
      grid-template-columns: 380px 1fr;
      gap: 40px;
      align-items: start;
    }

    .col-title {
      font-size: 1.25rem;
      font-weight: 800;
      color: #0F172A;
      margin: 0 0 20px;
    }

    /* ── INFO CARDS ───────────────────────────────────────────────── */
    .info-col {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .info-card {
      display: flex;
      align-items: flex-start;
      gap: 14px;
      background: #fff;
      border-radius: 14px;
      border: 1px solid #E2E8F0;
      padding: 18px 20px;
      box-shadow: 0 2px 8px rgba(0,0,0,.04);
      transition: transform 0.18s, box-shadow 0.18s;
    }
    .info-card:hover {
      transform: translateX(3px);
      box-shadow: 0 4px 20px rgba(99,102,241,.1);
    }

    .ic-icon {
      width: 44px;
      height: 44px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;

      mat-icon { font-size: 20px; width: 20px; height: 20px; }
    }
    .ic-icon--indigo { background: #EEF2FF; mat-icon { color: #6366F1; } }
    .ic-icon--saffron { background: #FFF7ED; mat-icon { color: #F97316; } }

    .ic-body h4 {
      font-size: 0.88rem;
      font-weight: 700;
      color: #0F172A;
      margin: 0 0 4px;
    }
    .ic-body p {
      font-size: 0.84rem;
      line-height: 1.65;
      color: #475569;
      margin: 0 0 8px;
    }

    .ic-link {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 0.82rem;
      font-weight: 600;
      color: #6366F1;
      text-decoration: none;
      transition: color 0.15s;

      mat-icon { font-size: 13px; width: 13px; height: 13px; }
    }
    .ic-link:hover { color: #4F46E5; }

    .ic-link--lg {
      font-size: 1rem;
      font-weight: 700;
      color: #F97316;

      mat-icon { font-size: 16px; width: 16px; height: 16px; }
    }
    .ic-link--lg:hover { color: #EA580C; }

    /* social */
    .social-block {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 0 4px;
    }
    .social-label {
      font-size: 0.8rem;
      font-weight: 600;
      color: #94A3B8;
    }
    .social-links { display: flex; gap: 8px; }

    .social-btn {
      width: 36px;
      height: 36px;
      border-radius: 8px;
      background: #fff;
      border: 1px solid #E2E8F0;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #475569;
      text-decoration: none;
      transition: border-color 0.15s, color 0.15s, background 0.15s;
    }
    .social-btn:hover {
      border-color: #6366F1;
      color: #6366F1;
      background: #EEF2FF;
    }

    /* ── FORM CARD ────────────────────────────────────────────────── */
    .form-col { min-width: 0; }

    .form-card {
      background: #fff;
      border-radius: 16px;
      border: 1px solid #E2E8F0;
      padding: 32px;
      box-shadow: 0 4px 24px rgba(99,102,241,.08);
    }

    .form-header {
      margin-bottom: 28px;

      h2 {
        font-size: 1.25rem;
        font-weight: 800;
        color: #0F172A;
        margin: 0 0 6px;
      }
      p {
        font-size: 0.87rem;
        color: #475569;
        margin: 0;
      }
    }

    .contact-form { display: flex; flex-direction: column; gap: 18px; }

    .field-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }

    .field-group { display: flex; flex-direction: column; gap: 6px; }

    .field-group label {
      font-size: 0.8rem;
      font-weight: 600;
      color: #0F172A;
      letter-spacing: 0.01em;
    }

    .field-wrap {
      position: relative;
    }

    .field-icon {
      position: absolute;
      left: 12px;
      top: 50%;
      transform: translateY(-50%);
      font-size: 17px;
      width: 17px;
      height: 17px;
      color: #94A3B8;
      pointer-events: none;
    }

    .field-wrap input,
    .field-wrap select {
      width: 100%;
      padding: 10px 14px 10px 38px;
      font-family: inherit;
      font-size: 0.88rem;
      color: #0F172A;
      background: #F8F9FF;
      border: 1.5px solid #E2E8F0;
      border-radius: 10px;
      outline: none;
      transition: border-color 0.18s, box-shadow 0.18s;
      box-sizing: border-box;
      appearance: none;
    }

    .field-wrap input::placeholder,
    .field-wrap select::placeholder {
      color: #94A3B8;
    }

    .field-wrap input:focus,
    .field-wrap select:focus {
      border-color: #6366F1;
      background: #fff;
      box-shadow: 0 0 0 3px rgba(99,102,241,.12);
    }

    .field-wrap--select::after {
      content: '';
      position: absolute;
      right: 12px;
      top: 50%;
      transform: translateY(-50%);
      width: 0;
      height: 0;
      border-left: 4px solid transparent;
      border-right: 4px solid transparent;
      border-top: 5px solid #94A3B8;
      pointer-events: none;
    }

    .field-wrap--textarea {
      display: block;
    }

    .field-wrap--textarea textarea {
      width: 100%;
      padding: 10px 14px;
      font-family: inherit;
      font-size: 0.88rem;
      color: #0F172A;
      background: #F8F9FF;
      border: 1.5px solid #E2E8F0;
      border-radius: 10px;
      outline: none;
      resize: vertical;
      min-height: 100px;
      transition: border-color 0.18s, box-shadow 0.18s;
      box-sizing: border-box;
    }
    .field-wrap--textarea textarea::placeholder { color: #94A3B8; }
    .field-wrap--textarea textarea:focus {
      border-color: #6366F1;
      background: #fff;
      box-shadow: 0 0 0 3px rgba(99,102,241,.12);
    }

    .submit-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      background: #F97316;
      color: #fff;
      border: none;
      border-radius: 12px;
      padding: 13px 28px;
      font-family: inherit;
      font-size: 0.95rem;
      font-weight: 700;
      cursor: pointer;
      transition: background 0.18s, transform 0.18s, box-shadow 0.18s;
      box-shadow: 0 4px 16px rgba(249,115,22,.35);

      mat-icon { font-size: 18px; width: 18px; height: 18px; }
    }
    .submit-btn:hover {
      background: #EA580C;
      transform: translateY(-1px);
      box-shadow: 0 6px 22px rgba(249,115,22,.45);
    }
    .submit-btn:active { transform: translateY(0); }
    .submit-btn:focus-visible {
      outline: 3px solid #F97316;
      outline-offset: 2px;
    }

    @media (max-width: 860px) {
      .main-inner { grid-template-columns: 1fr; }
    }
    @media (max-width: 480px) {
      .field-row { grid-template-columns: 1fr; }
      .form-card { padding: 22px 18px; }
    }

    /* ── MAP SECTION ──────────────────────────────────────────────── */
    .map-section {
      padding: 0 0 64px;
    }

    .map-section-inner {
      max-width: 1040px;
      margin: 0 auto;
      padding: 0 24px;
    }

    .map-header {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 20px;
      flex-wrap: wrap;
    }

    .map-header-text h2 {
      font-size: 1.2rem;
      font-weight: 800;
      color: #0F172A;
      margin: 0;
    }

    .btn-directions {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      background: #6366F1;
      color: #fff;
      border-radius: 10px;
      padding: 10px 20px;
      font-size: 0.88rem;
      font-weight: 600;
      text-decoration: none;
      transition: background 0.18s, transform 0.18s;
      box-shadow: 0 3px 12px rgba(99,102,241,.3);
      white-space: nowrap;
      flex-shrink: 0;

      mat-icon { font-size: 17px; width: 17px; height: 17px; }
    }
    .btn-directions:hover {
      background: #4F46E5;
      transform: translateY(-1px);
    }

    .map-wrapper {
      height: 360px;
      border-radius: 16px;
      overflow: hidden;
      border: 1px solid #E2E8F0;
      box-shadow: 0 4px 20px rgba(0,0,0,.06);
    }

    @media (max-width: 480px) {
      .map-wrapper { height: 260px; }
    }
  `],
})
export class ContactComponent {
  handleSubmit(event: Event): void {
    event.preventDefault();
    // form submission logic to be wired up
  }
}
