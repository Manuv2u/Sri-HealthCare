import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [MatIconModule],
  template: `
    <div class="page-container">
      <div class="contact-header">
        <h1>Contact Us</h1>
        <p>We're here to help. Reach out to us anytime.</p>
      </div>

      <div class="contact-grid">
        <!-- Info cards -->
        <div class="info-col">
          <div class="info-card">
            <div class="info-icon"><mat-icon>location_on</mat-icon></div>
            <div>
              <h4>Address</h4>
              <p>Shiva jyothi complex, Kuvempu road<br>near Hosmane 2nd cross<br>Shivamogga 577201</p>
            </div>
          </div>
          <div class="info-card">
            <div class="info-icon"><mat-icon>phone</mat-icon></div>
            <div>
              <h4>Phone</h4>
              <p><a href="tel:7795207">7795***207</a></p>
            </div>
          </div>
          <div class="info-card">
            <div class="info-icon"><mat-icon>schedule</mat-icon></div>
            <div>
              <h4>Working Hours</h4>
              <p>Monday – Saturday: 7:00 AM – 8:00 PM<br>Sunday: 8:00 AM – 2:00 PM</p>
            </div>
          </div>
          <div class="social-row">
            <span>Follow us:</span>
            <a href="https://instagram.com" target="_blank" aria-label="Instagram" class="social-link">
              <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
            </a>
            <a href="https://facebook.com" target="_blank" aria-label="Facebook" class="social-link">
              <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
            </a>
            <a href="https://twitter.com" target="_blank" aria-label="Twitter / X" class="social-link">
              <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            </a>
          </div>
        </div>

        <!-- Map placeholder -->
        <div class="map-col">
          <div class="map-embed">
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3886.0!2d75.5681!3d13.9299!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMTPCsDU1JzQ3LjYiTiA3NcKwMzQnMDUuMiJF!5e0!3m2!1sen!2sin!4v1234567890"
              width="100%" height="100%" style="border:0;" allowfullscreen loading="lazy"
              referrerpolicy="no-referrer-when-downgrade" title="SRI Diagnostic Lab Location">
            </iframe>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page-container { max-width: 1000px; margin: 0 auto; padding: 3rem 1.5rem; }
    .contact-header { margin-bottom: 2.5rem;
      h1 { font-size: 2rem; font-weight: 800; color: #1a202c; }
      p { color: #718096; margin-top: .35rem; font-size: 1rem; }
    }
    .contact-grid {
      display: grid; grid-template-columns: 1fr 1.2fr; gap: 2rem; align-items: start;
    }
    .info-col { display: flex; flex-direction: column; gap: 1rem; }
    .info-card {
      display: flex; align-items: flex-start; gap: 1rem;
      background: #fff; border-radius: 12px; padding: 1.25rem;
      border: 1px solid #e2e8f0; box-shadow: 0 2px 6px rgba(0,0,0,.04);
    }
    .info-icon {
      width: 44px; height: 44px; background: #e0f2f1; border-radius: 10px;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
      mat-icon { color: #00796b; }
    }
    .info-card h4 { font-size: .9rem; font-weight: 700; color: #1a202c; margin-bottom: .3rem; }
    .info-card p { font-size: .875rem; color: #718096; line-height: 1.6;
      a { color: #00796b; text-decoration: none; &:hover { text-decoration: underline; } }
    }
    .social-row {
      display: flex; align-items: center; gap: .75rem; padding: .5rem 0;
      span { font-size: .875rem; color: #718096; font-weight: 600; }
    }
    .social-link { color: #718096; display: flex; align-items: center; transition: color .15s;
      &:hover { color: #00796b; }
    }
    .map-col { height: 420px; }
    .map-embed { width: 100%; height: 100%; border-radius: 14px; overflow: hidden; border: 1px solid #e2e8f0; }
    @media (max-width: 768px) {
      .contact-grid { grid-template-columns: 1fr; }
      .map-col { height: 280px; }
    }
  `],
})
export class ContactComponent {}
