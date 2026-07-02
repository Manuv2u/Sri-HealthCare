import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ModalComponent } from '../modal/modal.component';
import { ButtonComponent } from '../button/button.component';
import { CallbackRequestApiService } from '../../../core/api/services/callback-request-api.service';

@Component({
  selector: 'app-quick-help-widget',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, ModalComponent, ButtonComponent],
  template: `
    <button
      type="button"
      class="fab"
      (click)="open()"
      aria-label="How can we help?"
    >
      <mat-icon>support_agent</mat-icon>
    </button>

    <app-modal [isOpen]="isOpen()" title="How can we help?" size="sm" (close)="close()">
      @if (!submitted()) {
        <div class="help-body">
          <h3 class="help-title">Get assistance in booking a lab test!</h3>
          <p class="help-sub">Our health advisors will connect to understand your needs.</p>

          <div class="field">
            <input [(ngModel)]="name" placeholder="Name" class="inp" />
          </div>
          <div class="field">
            <input [(ngModel)]="phone" placeholder="Phone No.*" class="inp" maxlength="10" inputmode="numeric" />
          </div>
          @if (formErr()) { <p class="form-err">{{ formErr() }}</p> }
        </div>
      } @else {
        <div class="confirm-body">
          <mat-icon class="confirm-icon">check_circle</mat-icon>
          <p class="confirm-text">Thanks! Our team will reach out to you shortly.</p>
        </div>
      }

      @if (!submitted()) {
        <div modal-footer>
          <app-button variant="primary" [fullWidth]="true" [loading]="submitting()" (click)="submit()">Submit</app-button>
        </div>
      } @else {
        <div modal-footer>
          <app-button variant="outline" [fullWidth]="true" (click)="close()">Close</app-button>
        </div>
      }
    </app-modal>
  `,
  styles: [`
    .fab {
      position: fixed;
      right: 1.5rem;
      bottom: 1.5rem;
      width: 56px;
      height: 56px;
      border-radius: 50%;
      border: none;
      background: #2C7A7B;
      color: #FFFFFF;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 8px 20px rgba(44,122,123,0.35);
      cursor: pointer;
      z-index: var(--z-modal-backdrop, 1000);
      transition: transform 150ms, background 150ms;
    }
    .fab:hover { background: #285E61; transform: scale(1.05); }
    .fab mat-icon { font-size: 26px; width: 26px; height: 26px; }

    .help-title { font-size: 1rem; font-weight: 700; color: #0F172A; margin: 0 0 0.375rem 0; }
    .help-sub { font-size: 0.8125rem; color: #475569; margin: 0 0 1.25rem 0; }
    .field { margin-bottom: 0.75rem; }
    .inp {
      width: 100%;
      box-sizing: border-box;
      border: 1px solid #E2E8F0;
      border-radius: 0.75rem;
      padding: 0.75rem 0.875rem;
      font-size: 0.875rem;
      color: #0F172A;
    }
    .inp:focus { outline: none; border-color: #319795; box-shadow: 0 0 0 3px rgba(49,151,149,.1); }
    .form-err { font-size: 0.8125rem; color: #DC2626; margin: 0.25rem 0 0 0; }

    .confirm-body { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 0.75rem; padding: 1rem 0; }
    .confirm-icon { color: #38A169; width: 48px; height: 48px; font-size: 48px; }
    .confirm-text { font-size: 0.9375rem; color: #0F172A; margin: 0; }

    @media (max-width: 480px) {
      .fab { right: 1rem; bottom: 1rem; width: 50px; height: 50px; }
    }
  `],
})
export class QuickHelpWidgetComponent {
  isOpen = signal(false);
  submitting = signal(false);
  submitted = signal(false);
  formErr = signal('');

  name = '';
  phone = '';

  constructor(private callbackApi: CallbackRequestApiService) {}

  open(): void {
    this.name = '';
    this.phone = '';
    this.formErr.set('');
    this.submitted.set(false);
    this.isOpen.set(true);
  }

  close(): void {
    this.isOpen.set(false);
  }

  submit(): void {
    const phone = this.phone.trim();
    if (!/^\d{10}$/.test(phone)) {
      this.formErr.set('Please enter a valid 10-digit phone number.');
      return;
    }
    this.formErr.set('');
    this.submitting.set(true);
    this.callbackApi.create({ name: this.name.trim() || undefined, phone }).subscribe({
      next: () => { this.submitting.set(false); this.submitted.set(true); },
      error: () => { this.submitting.set(false); this.formErr.set('Something went wrong. Please try again.'); },
    });
  }
}
