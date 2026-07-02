import { Component, ElementRef, EventEmitter, HostListener, Input, OnChanges, Output, SimpleChanges, ViewChild, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { ModalComponent } from '../modal/modal.component';
import { ButtonComponent } from '../button/button.component';
import { HealthConcernApiService } from '../../../core/api/services/health-concern-api.service';
import { HealthConcern } from '../../../core/api/api.types';

@Component({
  selector: 'app-health-concern-modal',
  standalone: true,
  imports: [CommonModule, MatIconModule, ModalComponent, ButtonComponent],
  template: `
    <app-modal
      [isOpen]="isOpen"
      title="Welcome to Sri Diagnostic Lab"
      size="xl"
      [showClose]="true"
      (close)="handleSkip()"
    >
      <div #dialogBody>
        <p class="subtitle">Select your health concern to discover the most relevant tests and health packages.</p>

        <div class="concern-grid" role="group" aria-label="Health concerns">
          @for (c of concerns(); track c.key) {
            <button
              type="button"
              class="concern-card"
              [class.selected]="isSelected(c.key)"
              [attr.aria-pressed]="isSelected(c.key)"
              (click)="toggle(c.key)"
            >
              <mat-icon class="concern-icon">{{ c.icon }}</mat-icon>
              <span class="concern-name">{{ c.name }}</span>
            </button>
          }
        </div>
      </div>

      <div modal-footer>
        <app-button variant="outline" (click)="handleSkip()">Skip for Now</app-button>
        <app-button variant="primary" [disabled]="selected().size === 0" (click)="handleContinue()">Continue</app-button>
      </div>
    </app-modal>
  `,
  styles: [`
    .subtitle {
      font-size: var(--text-sm);
      color: var(--text-secondary);
      margin: 0 0 var(--space-5) 0;
    }
    .concern-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
      gap: var(--space-3);
    }
    .concern-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: var(--space-2);
      padding: var(--space-4) var(--space-2);
      background: var(--bg-secondary);
      border: 2px solid transparent;
      border-radius: var(--radius-lg);
      cursor: pointer;
      transition: all var(--duration-fast);
      text-align: center;

      &:hover { border-color: var(--border-default); }
      &:focus-visible { outline: 2px solid var(--color-primary-500, #319795); outline-offset: 2px; }
      &.selected {
        background: var(--color-primary-50, #E6FFFA);
        border-color: var(--color-primary-500, #319795);
      }
    }
    .concern-icon {
      color: var(--text-secondary);
      width: 28px;
      height: 28px;
      font-size: 28px;
    }
    .selected .concern-icon { color: var(--color-primary-600, #2C7A7B); }
    .concern-name {
      font-size: var(--text-sm);
      font-weight: var(--font-medium);
      color: var(--text-primary);
    }
    @media (max-width: 480px) {
      .concern-grid { grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); }
    }
  `],
})
export class HealthConcernModalComponent implements OnChanges {
  @Input() isOpen = false;
  @Output() continueWith = new EventEmitter<string[]>();
  @Output() skip = new EventEmitter<void>();

  @ViewChild('dialogBody') dialogBody?: ElementRef<HTMLElement>;

  concerns = signal<HealthConcern[]>([]);
  selected = signal<Set<string>>(new Set());

  constructor(private healthConcernApi: HealthConcernApiService, private elementRef: ElementRef<HTMLElement>) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen'] && this.isOpen) {
      this.selected.set(new Set());
      if (!this.concerns().length) {
        this.healthConcernApi.list().subscribe({ next: (list) => this.concerns.set(list) });
      }
      setTimeout(() => this.focusFirstCard(), 0);
    }
  }

  private focusFirstCard(): void {
    const first = this.dialogBody?.nativeElement.querySelector<HTMLButtonElement>('.concern-card');
    first?.focus();
  }

  @HostListener('keydown.tab', ['$event'])
  onTabKey(event: KeyboardEvent): void {
    if (!this.isOpen) return;
    const modal = this.elementRef.nativeElement.querySelector<HTMLElement>('.modal');
    if (!modal) return;
    const focusable = Array.from(
      modal.querySelectorAll<HTMLElement>('button:not([disabled]), [tabindex]:not([tabindex="-1"])')
    );
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;
    if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  isSelected(key: string): boolean {
    return this.selected().has(key);
  }

  toggle(key: string): void {
    const next = new Set(this.selected());
    next.has(key) ? next.delete(key) : next.add(key);
    this.selected.set(next);
  }

  handleContinue(): void {
    if (this.selected().size === 0) return;
    this.continueWith.emit(Array.from(this.selected()));
  }

  handleSkip(): void {
    this.skip.emit();
  }
}
