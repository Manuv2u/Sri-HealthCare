import { Component, Input, forwardRef, signal, computed, HostListener, ElementRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormsModule } from '@angular/forms';

export interface SelectOption {
  value: any;
  label: string;
  disabled?: boolean;
}

@Component({
  selector: 'app-select',
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => SelectComponent),
    multi: true
  }],
  template: `
    <div class="select-wrapper" [class.select-wrapper--error]="error" [class.select-wrapper--disabled]="disabled">
      @if (label) {
        <label class="select__label">
          {{ label }}
          @if (required) { <span class="select__required">*</span> }
        </label>
      }
      <div 
        class="select__container"
        [class.select__container--open]="isOpen()"
        [class]="'select__container--' + size"
        (click)="toggle()"
        role="combobox"
        [attr.aria-expanded]="isOpen()"
        tabindex="0"
        (keydown.enter)="toggle()"
        (keydown.space)="toggle(); $event.preventDefault()"
        (keydown.escape)="close()"
      >
        <span class="select__value" [class.select__value--placeholder]="!selectedOption()">
          {{ selectedOption()?.label || placeholder }}
        </span>
        <span class="select__arrow" [class.select__arrow--open]="isOpen()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </span>
      </div>
      
      @if (isOpen()) {
        <div class="select__dropdown" role="listbox">
          @for (option of options; track option.value) {
            <div 
              class="select__option"
              [class.select__option--selected]="option.value === value()"
              [class.select__option--disabled]="option.disabled"
              (click)="selectOption(option, $event)"
              role="option"
              [attr.aria-selected]="option.value === value()"
            >
              {{ option.label }}
              @if (option.value === value()) {
                <svg class="select__check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              }
            </div>
          }
        </div>
      }
      
      @if (error && errorMessage) {
        <span class="select__error">{{ errorMessage }}</span>
      }
    </div>
  `,
  styles: [`
    .select-wrapper {
      position: relative;
      display: flex;
      flex-direction: column;
      gap: var(--space-1-5);
    }
    
    .select__label {
      font-size: var(--text-sm);
      font-weight: var(--font-medium);
      color: var(--text-primary);
    }
    
    .select__required {
      color: var(--color-error-500);
    }
    
    .select__container {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: var(--bg-primary);
      border: 1px solid var(--border-default);
      border-radius: var(--radius-lg);
      padding: 0 var(--space-3);
      cursor: pointer;
      transition: all var(--duration-fast) var(--ease-default);
      
      &:focus {
        outline: none;
        border-color: var(--color-primary-500);
        box-shadow: 0 0 0 3px var(--color-primary-100);
      }
      
      &--open {
        border-color: var(--color-primary-500);
        box-shadow: 0 0 0 3px var(--color-primary-100);
      }
      
      &--sm { height: var(--input-height-sm); }
      &--md { height: var(--input-height-md); }
      &--lg { height: var(--input-height-lg); }
    }
    
    .select-wrapper--error .select__container {
      border-color: var(--color-error-500);
    }
    
    .select-wrapper--disabled .select__container {
      background: var(--bg-secondary);
      cursor: not-allowed;
      opacity: 0.6;
    }
    
    .select__value {
      flex: 1;
      font-size: var(--text-sm);
      color: var(--text-primary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      
      &--placeholder { color: var(--text-muted); }
    }
    
    .select__arrow {
      width: 20px;
      height: 20px;
      color: var(--text-muted);
      transition: transform var(--duration-fast) var(--ease-default);
      
      &--open { transform: rotate(180deg); }
      svg { width: 100%; height: 100%; }
    }
    
    .select__dropdown {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      margin-top: var(--space-1);
      background: var(--bg-primary);
      border: 1px solid var(--border-default);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-lg);
      max-height: 240px;
      overflow-y: auto;
      z-index: var(--z-dropdown);
      animation: slideDown var(--duration-fast) var(--ease-out);
    }
    
    @keyframes slideDown {
      from { opacity: 0; transform: translateY(-8px); }
      to { opacity: 1; transform: translateY(0); }
    }
    
    .select__option {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--space-2-5) var(--space-3);
      font-size: var(--text-sm);
      color: var(--text-secondary);
      cursor: pointer;
      transition: background var(--duration-fast);
      
      &:hover:not(.select__option--disabled) {
        background: var(--bg-secondary);
        color: var(--text-primary);
      }
      
      &--selected {
        background: var(--color-primary-50);
        color: var(--color-primary-700);
      }
      
      &--disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }
    
    .select__check {
      width: 16px;
      height: 16px;
      color: var(--color-primary-600);
    }
    
    .select__error {
      font-size: var(--text-xs);
      color: var(--color-error-600);
    }
  `]
})
export class SelectComponent implements ControlValueAccessor {
  @Input() label?: string;
  @Input() placeholder = 'Select an option';
  @Input() options: SelectOption[] = [];
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  @Input() disabled = false;
  @Input() required = false;
  @Input() error = false;
  @Input() errorMessage?: string;
  
  private elementRef = inject(ElementRef);
  
  isOpen = signal(false);
  value = signal<any>(null);
  
  selectedOption = computed(() => 
    this.options.find(opt => opt.value === this.value())
  );
  
  private onChange: (value: any) => void = () => {};
  private onTouched: () => void = () => {};
  
  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.close();
    }
  }
  
  writeValue(value: any): void {
    this.value.set(value);
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
  
  toggle(): void {
    if (!this.disabled) {
      this.isOpen.update(v => !v);
    }
  }
  
  close(): void {
    this.isOpen.set(false);
    this.onTouched();
  }
  
  selectOption(option: SelectOption, event: Event): void {
    event.stopPropagation();
    if (!option.disabled) {
      this.value.set(option.value);
      this.onChange(option.value);
      this.close();
    }
  }
}
