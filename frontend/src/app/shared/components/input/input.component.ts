import { Component, Input, Output, EventEmitter, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormsModule } from '@angular/forms';

export type InputSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'app-input',
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => InputComponent),
    multi: true
  }],
  template: `
    <div class="input-wrapper" [class.input-wrapper--error]="error" [class.input-wrapper--disabled]="disabled">
      @if (label) {
        <label class="input__label" [for]="inputId">
          {{ label }}
          @if (required) { <span class="input__required">*</span> }
        </label>
      }
      <div class="input__container" [class]="'input__container--' + size">
        @if (iconLeft) {
          <span class="input__icon input__icon--left" [innerHTML]="iconLeft"></span>
        }
        @if (type === 'textarea') {
          <textarea
            [id]="inputId"
            class="input__field"
            [placeholder]="placeholder"
            [disabled]="disabled"
            [readonly]="readonly"
            [rows]="rows"
            [(ngModel)]="value"
            (ngModelChange)="onValueChange($event)"
            (blur)="onTouched()"
          ></textarea>
        } @else {
          <input
            [id]="inputId"
            class="input__field"
            [type]="showPassword ? 'text' : type"
            [placeholder]="placeholder"
            [disabled]="disabled"
            [readonly]="readonly"
            [(ngModel)]="value"
            (ngModelChange)="onValueChange($event)"
            (blur)="onTouched()"
          />
        }
        @if (type === 'password') {
          <button type="button" class="input__toggle" (click)="togglePassword()" tabindex="-1">
            @if (showPassword) {
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
                <line x1="1" y1="1" x2="23" y2="23"/>
              </svg>
            } @else {
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            }
          </button>
        }
        @if (iconRight && type !== 'password') {
          <span class="input__icon input__icon--right" [innerHTML]="iconRight"></span>
        }
      </div>
      @if (error && errorMessage) {
        <span class="input__error">{{ errorMessage }}</span>
      }
      @if (hint && !error) {
        <span class="input__hint">{{ hint }}</span>
      }
    </div>
  `,
  styles: [`
    .input-wrapper {
      display: flex;
      flex-direction: column;
      gap: var(--space-1-5);
    }
    
    .input__label {
      font-size: var(--text-sm);
      font-weight: var(--font-medium);
      color: var(--text-primary);
    }
    
    .input__required {
      color: var(--color-error-500);
      margin-left: var(--space-0-5);
    }
    
    .input__container {
      position: relative;
      display: flex;
      align-items: center;
      background: var(--bg-primary);
      border: 1px solid var(--border-default);
      border-radius: var(--radius-lg);
      transition: all var(--duration-fast) var(--ease-default);
      
      &:focus-within {
        border-color: var(--color-primary-500);
        box-shadow: 0 0 0 3px var(--color-primary-100);
      }
      
      &--sm { height: var(--input-height-sm); }
      &--md { height: var(--input-height-md); }
      &--lg { height: var(--input-height-lg); }
    }
    
    .input-wrapper--error .input__container {
      border-color: var(--color-error-500);
      &:focus-within {
        box-shadow: 0 0 0 3px var(--color-error-100);
      }
    }
    
    .input-wrapper--disabled .input__container {
      background: var(--bg-secondary);
      cursor: not-allowed;
    }
    
    .input__field {
      flex: 1;
      width: 100%;
      height: 100%;
      padding: 0 var(--space-3);
      border: none;
      background: transparent;
      font-size: var(--text-sm);
      color: var(--text-primary);
      
      &::placeholder { color: var(--text-muted); }
      &:focus { outline: none; }
      &:disabled { cursor: not-allowed; }
    }
    
    textarea.input__field {
      padding: var(--space-3);
      resize: vertical;
      min-height: 100px;
    }
    
    .input__icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 20px;
      height: 20px;
      color: var(--text-muted);
      flex-shrink: 0;
      
      &--left { margin-left: var(--space-3); }
      &--right { margin-right: var(--space-3); }
      
      :deep(svg) { width: 100%; height: 100%; }
    }
    
    .input__toggle {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 100%;
      padding: 0;
      margin-right: var(--space-1);
      background: transparent;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      
      &:hover { color: var(--text-secondary); }
      svg { width: 18px; height: 18px; }
    }
    
    .input__error {
      font-size: var(--text-xs);
      color: var(--color-error-600);
    }
    
    .input__hint {
      font-size: var(--text-xs);
      color: var(--text-tertiary);
    }
  `]
})
export class InputComponent implements ControlValueAccessor {
  @Input() label?: string;
  @Input() type: string = 'text';
  @Input() placeholder = '';
  @Input() size: InputSize = 'md';
  @Input() disabled = false;
  @Input() readonly = false;
  @Input() required = false;
  /** Pass a boolean OR an error string — if a non-empty string is passed it acts as both error=true and errorMessage */
  @Input() set error(val: boolean | string | undefined) {
    if (typeof val === 'string') {
      this._error = val.length > 0;
      if (val.length > 0 && !this.errorMessage) this._errorMessage = val;
    } else {
      this._error = !!val;
    }
  }
  get error(): boolean { return this._error; }
  private _error = false;

  @Input() set errorMessage(val: string | undefined) { this._errorMessage = val; }
  get errorMessage(): string | undefined { return this._errorMessage; }
  private _errorMessage?: string;
  @Input() hint?: string;
  @Input() iconLeft?: string;
  @Input() iconRight?: string;
  @Input() rows = 3;
  
  inputId = `input-${Math.random().toString(36).substr(2, 9)}`;
  value: any = '';
  showPassword = false;
  
  private onChange: (value: any) => void = () => {};
  onTouched: () => void = () => {};
  
  writeValue(value: any): void {
    this.value = value;
  }
  
  registerOnChange(fn: (value: any) => void): void {
    this.onChange = fn;
  }
  
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }
  
  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }
  
  onValueChange(value: any): void {
    this.value = value;
    this.onChange(value);
  }
  
  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }
}
