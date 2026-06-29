import { Component, Input, Output, EventEmitter, signal, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';

@Component({
  selector: 'app-search-input',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="search" [class]="'search--' + size">
      <span class="search__icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
      </span>
      <input
        type="search"
        class="search__input"
        [placeholder]="placeholder"
        [(ngModel)]="query"
        (ngModelChange)="onQueryChange($event)"
        (keydown.enter)="onSubmit()"
      />
      @if (query && showClear) {
        <button class="search__clear" (click)="clear()" aria-label="Clear search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      }
      @if (loading) {
        <span class="search__spinner">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10" stroke-dasharray="50" stroke-dashoffset="25"/>
          </svg>
        </span>
      }
    </div>
  `,
  styles: [`
    .search {
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
    
    .search__icon {
      display: flex;
      margin-left: var(--space-3);
      color: var(--text-muted);
      svg { width: 18px; height: 18px; }
    }
    
    .search__input {
      flex: 1;
      height: 100%;
      padding: 0 var(--space-3);
      background: transparent;
      border: none;
      font-size: var(--text-sm);
      color: var(--text-primary);
      
      &::placeholder { color: var(--text-muted); }
      &:focus { outline: none; }
      &::-webkit-search-cancel-button { display: none; }
    }
    
    .search__clear {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      margin-right: var(--space-1);
      background: transparent;
      border: none;
      border-radius: var(--radius-md);
      color: var(--text-muted);
      cursor: pointer;
      transition: all var(--duration-fast);
      
      &:hover { background: var(--bg-secondary); color: var(--text-secondary); }
      svg { width: 16px; height: 16px; }
    }
    
    .search__spinner {
      display: flex;
      margin-right: var(--space-3);
      color: var(--color-primary-500);
      svg {
        width: 18px;
        height: 18px;
        animation: spin 1s linear infinite;
      }
    }
    
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `]
})
export class SearchInputComponent implements OnDestroy {
  @Input() placeholder = 'Search...';
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  @Input() debounce = 300;
  @Input() showClear = true;
  @Input() loading = false;
  @Input() set value(val: string) { this.query = val; }
  
  @Output() search = new EventEmitter<string>();
  @Output() submit = new EventEmitter<string>();
  
  query = '';
  private searchSubject = new Subject<string>();
  private destroy$ = new Subject<void>();
  
  constructor() {
    this.searchSubject.pipe(
      debounceTime(this.debounce),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(value => this.search.emit(value));
  }
  
  onQueryChange(value: string): void {
    this.searchSubject.next(value);
  }
  
  onSubmit(): void {
    this.submit.emit(this.query);
  }
  
  clear(): void {
    this.query = '';
    this.search.emit('');
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
