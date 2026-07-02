import { Component, OnInit, signal, computed, effect, ElementRef, ViewChild, AfterViewInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { TestApiService } from '../../../core/api/services/test-api.service';
import { HealthConcernApiService } from '../../../core/api/services/health-concern-api.service';
import { UserApiService } from '../../../core/api/services/user-api.service';
import { AuthStateService } from '../../../core/auth/auth-state.service';
import { Test, HealthConcern } from '../../../core/api/api.types';

const CATEGORY_META: Record<string, { icon: string; color: string; light: string; border: string }> = {
  'Diabetes':       { icon: 'water_drop',      color: '#0EA5E9', light: '#E0F2FE', border: '#BAE6FD' },
  'Heart':          { icon: 'favorite',         color: '#EF4444', light: '#FEE2E2', border: '#FECACA' },
  'Kidney':         { icon: 'opacity',          color: '#8B5CF6', light: '#EDE9FE', border: '#DDD6FE' },
  'Liver':          { icon: 'eco',              color: '#22C55E', light: '#DCFCE7', border: '#BBF7D0' },
  'Thyroid':        { icon: 'psychology',       color: '#F97316', light: '#FFEDD5', border: '#FED7AA' },
  'Full Body':      { icon: 'accessibility_new',color: '#6366F1', light: '#EEF2FF', border: '#C7D2FE' },
  "Women's Health": { icon: 'spa',              color: '#EC4899', light: '#FCE7F3', border: '#FBCFE8' },
  'Vitamin':        { icon: 'wb_sunny',         color: '#F59E0B', light: '#FEF3C7', border: '#FDE68A' },
};

const CATEGORY_ICONS = [
  { label: 'All',           icon: 'apps',             key: null },
  { label: 'Diabetes',      icon: 'water_drop',       key: 'Diabetes' },
  { label: 'Heart',         icon: 'favorite',         key: 'Heart' },
  { label: 'Kidney',        icon: 'opacity',          key: 'Kidney' },
  { label: 'Liver',         icon: 'eco',              key: 'Liver' },
  { label: 'Thyroid',       icon: 'psychology',       key: 'Thyroid' },
  { label: 'Full Body',     icon: 'accessibility_new',key: 'Full Body' },
  { label: "Women's Health",icon: 'spa',              key: "Women's Health" },
  { label: 'Vitamin',       icon: 'wb_sunny',         key: 'Vitamin' },
];

@Component({
  selector: 'app-test-catalog',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule, MatIconModule],
  template: `
    <!-- ═══════════════════════════════════════════════
         HERO BANNER
    ════════════════════════════════════════════════ -->
    <section class="hero">
      <div class="hero-bg-shapes" aria-hidden="true">
        <span class="shape shape-1"></span>
        <span class="shape shape-2"></span>
        <span class="shape shape-3"></span>
      </div>
      <div class="hero-inner">
        <p class="hero-eyebrow">
          <mat-icon class="eyebrow-icon">verified</mat-icon>
          NABL Certified Labs · Free Home Collection
        </p>
        <h1 class="hero-headline">Find the right<br>test for you</h1>
        <p class="hero-sub">Trusted by 50,000+ patients · Results within 24 hours</p>

        <div class="hero-search-wrap">
          <div class="hero-search" [class.focused]="searchFocused">
            <mat-icon class="search-icon">search</mat-icon>
            <input
              #searchInput
              [formControl]="searchCtrl"
              placeholder="Search CBC, Thyroid, HbA1c, Lipid Panel…"
              autocomplete="off"
              (focus)="searchFocused = true"
              (blur)="searchFocused = false"
              class="search-input"
            />
            @if (searchCtrl.value) {
              <button class="search-clear" (click)="searchCtrl.setValue('')" aria-label="Clear search">
                <mat-icon>close</mat-icon>
              </button>
            }
          </div>
          @if (searchCtrl.value) {
            <div class="search-hint">
              <mat-icon>info_outline</mat-icon>
              {{ filteredTests().length }} result{{ filteredTests().length !== 1 ? 's' : '' }} for "{{ searchCtrl.value }}"
            </div>
          }
        </div>
      </div>
    </section>

    <!-- ═══════════════════════════════════════════════
         CATEGORY PILLS — sticky below hero
    ════════════════════════════════════════════════ -->
    <div class="cats-bar-wrap">
      <div class="cats-fade cats-fade--left" [class.visible]="canScrollLeft()"></div>
      <div class="cats-fade cats-fade--right" [class.visible]="canScrollRight()"></div>
      <nav class="cats-bar" #catsBar aria-label="Filter by category"
           (scroll)="updateCatsFade()" (wheel)="onCatsWheel($event)">
        @for (cat of categoryChips(); track $index) {
          <button
            class="cat-chip"
            [class.active]="selectedCategory() === cat.key"
            [style.--chip-color]="getCatColor(cat.key)"
            [style.--chip-light]="getCatLight(cat.key)"
            [style.--chip-border]="getCatBorder(cat.key)"
            (click)="selectCategory(cat.key)"
          >
            <mat-icon class="chip-icon">{{ cat.icon }}</mat-icon>
            <span class="chip-label">{{ cat.label }}</span>
            @if (cat.key !== null) {
              <span class="chip-count">{{ getCatCount(cat.key) }}</span>
            }
          </button>
        }
      </nav>
    </div>

    <!-- ═══════════════════════════════════════════════
         MAIN CONTENT
    ════════════════════════════════════════════════ -->
    <main class="content-wrap">

      @if (selectedConcernKeys().length) {
        <div class="concern-banner">
          <div>
            <h2 class="concern-heading">Recommended Tests for {{ concernNames() }}</h2>
            <p class="concern-sub">Curated based on the health concern(s) you selected.</p>
          </div>
          <button class="btn-clear-filters" (click)="clearConcernFilter()">
            <mat-icon>close</mat-icon> Clear filter
          </button>
        </div>
      } @else if (savedConcernNames()) {
        <div class="concern-banner concern-banner--suggestion">
          <div>
            <h2 class="concern-heading">Recommended for you</h2>
            <p class="concern-sub">Based on your saved interest in {{ savedConcernNames() }}.</p>
          </div>
          <button class="btn-clear-filters" (click)="applySavedConcerns()">
            <mat-icon>arrow_forward</mat-icon> Show recommended
          </button>
        </div>
      }

      <!-- LOADING SKELETONS -->
      @if (loading()) {
        <div class="skeletons-featured">
          <div class="skeleton-feat"></div>
        </div>
        <div class="tests-grid">
          @for (i of [1,2,3,4,5,6]; track i) {
            <div class="skeleton-card">
              <div class="sk-top"></div>
              <div class="sk-title"></div>
              <div class="sk-line"></div>
              <div class="sk-line sk-short"></div>
              <div class="sk-footer">
                <div class="sk-price"></div>
                <div class="sk-btn"></div>
              </div>
            </div>
          }
        </div>
      } @else if (error()) {
        <div class="state-panel error-panel">
          <div class="state-icon-wrap error-icon-wrap">
            <mat-icon>wifi_off</mat-icon>
          </div>
          <h3>Could not load tests</h3>
          <p>{{ error() }}</p>
          <button class="btn-primary" (click)="load()">
            <mat-icon>refresh</mat-icon> Try Again
          </button>
        </div>
      } @else {

        <!-- RESULT COUNT BAR -->
        <div class="result-bar">
          <span class="result-count">
            @if (selectedCategory()) {
              <strong>{{ selectedCategory() }}</strong> ·
            }
            {{ filteredTests().length }} test{{ filteredTests().length !== 1 ? 's' : '' }}
            @if (searchCtrl.value) { matching "{{ searchCtrl.value }}" }
          </span>
          @if (selectedCategory() || searchCtrl.value) {
            <button class="btn-clear-filters" (click)="clearFilters()">
              <mat-icon>tune</mat-icon> Clear filters
            </button>
          }
        </div>

        <!-- FEATURED CARD -->
        @if (filteredTests().length > 0 && !selectedCategory() && !searchCtrl.value) {
          <div class="featured-card" (click)="book(filteredTests()[0])" role="button" tabindex="0"
               (keydown.enter)="book(filteredTests()[0])" (keydown.space)="book(filteredTests()[0])">
            <div class="featured-left-bar" [style.background]="getFeaturedGradient()"></div>

            <div class="featured-body">
              <div class="featured-info">
                <div class="featured-header-row">
                  <span class="featured-badge">
                    <mat-icon>local_fire_department</mat-icon> Popular
                  </span>
                  <span class="featured-cat-chip"
                        [style.background]="getCatLight(filteredTests()[0].category)"
                        [style.color]="getCatColor(filteredTests()[0].category)"
                        [style.border-color]="getCatBorder(filteredTests()[0].category)">
                    <mat-icon>{{ getCatIcon(filteredTests()[0].category) }}</mat-icon>
                    {{ filteredTests()[0].category }}
                  </span>
                </div>
                <h2 class="featured-name">{{ filteredTests()[0].name }}</h2>
                @if (filteredTests()[0].description) {
                  <p class="featured-desc">{{ filteredTests()[0].description }}</p>
                }
                <div class="featured-meta-row">
                  <span class="meta-tag">
                    <mat-icon>schedule</mat-icon>
                    {{ filteredTests()[0].turnaround_hours }}h results
                  </span>
                  <span class="meta-tag">
                    <mat-icon>home</mat-icon>
                    Free home collection
                  </span>
                  <span class="meta-tag">
                    <mat-icon>verified</mat-icon>
                    NABL Certified
                  </span>
                </div>
              </div>

              <div class="featured-action">
                <div class="featured-price-block">
                  @if (filteredTests()[0].discount_percentage > 0) {
                    <span class="feat-price-orig">₹{{ filteredTests()[0].price }}</span>
                    <span class="feat-discount-pill">{{ filteredTests()[0].discount_percentage }}% off</span>
                  }
                  <span class="feat-price-eff">₹{{ filteredTests()[0].effective_price }}</span>
                </div>
                <button class="btn-book-featured" (click)="book(filteredTests()[0]); $event.stopPropagation()">
                  Book Now
                  <mat-icon>arrow_forward</mat-icon>
                </button>
                <a [routerLink]="['/tests', filteredTests()[0].id]" class="feat-details-link"
                   (click)="$event.stopPropagation()">View details</a>
              </div>
            </div>
          </div>
        }

        <!-- EMPTY STATE -->
        @if (filteredTests().length === 0) {
          <div class="state-panel empty-panel">
            <div class="state-icon-wrap empty-icon-wrap">
              <mat-icon>manage_search</mat-icon>
            </div>
            <h3>No tests found</h3>
            <p>Try a different keyword or browse all categories</p>
            <button class="btn-primary" (click)="clearFilters()">
              <mat-icon>apps</mat-icon> Show all tests
            </button>
          </div>
        } @else {
          <div class="tests-grid">
            @for (test of gridTests(); track test.id) {
              <article class="test-card"
                       [style.--cat-color]="getCatColor(test.category)"
                       [style.--cat-light]="getCatLight(test.category)"
                       [style.--cat-border]="getCatBorder(test.category)">
                <div class="card-top-bar"></div>
                <div class="card-body">
                  <div class="card-header-row">
                    <span class="card-cat-badge">
                      <mat-icon>{{ getCatIcon(test.category) }}</mat-icon>
                      {{ test.category }}
                    </span>
                    @if (test.discount_percentage > 0) {
                      <span class="card-discount-badge">{{ test.discount_percentage }}% off</span>
                    }
                  </div>

                  <h3 class="card-name">{{ test.name }}</h3>

                  @if (test.description) {
                    <p class="card-desc">{{ test.description }}</p>
                  }

                  <div class="card-tags-row">
                    <span class="card-tag">
                      <mat-icon>schedule</mat-icon> {{ test.turnaround_hours }}h
                    </span>
                    <span class="card-tag home-tag">
                      <mat-icon>home</mat-icon> Home collection
                    </span>
                  </div>

                  <div class="card-footer">
                    <div class="card-price">
                      @if (test.discount_percentage > 0) {
                        <span class="card-price-orig">₹{{ test.price }}</span>
                      }
                      <span class="card-price-eff">₹{{ test.effective_price }}</span>
                    </div>
                    <div class="card-actions">
                      <a [routerLink]="['/tests', test.id]" class="btn-details-sm">Details</a>
                      <button class="btn-book-sm" (click)="book(test)">
                        Book Now
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            }
          </div>

          <!-- PAGINATION -->
          @if (totalPages() > 1) {
            <div class="pagination">
              <button class="page-btn" [disabled]="page() === 1" (click)="changePage(page() - 1)" aria-label="Previous page">
                <mat-icon>chevron_left</mat-icon>
              </button>
              @for (p of pageRange(); track p) {
                <button class="page-num" [class.active]="p === page()" (click)="changePage(p)">{{ p }}</button>
              }
              <button class="page-btn" [disabled]="page() === totalPages()" (click)="changePage(page() + 1)" aria-label="Next page">
                <mat-icon>chevron_right</mat-icon>
              </button>
            </div>
          }
        }

      }
    </main>
  `,
  styles: [`
    /* ─── RESET / BASE ──────────────────────────── */
    :host { display:block; font-family:'Inter',system-ui,-apple-system,sans-serif; background:#F8F9FF; }
    *, *::before, *::after { box-sizing:border-box; }
    button { font-family:inherit; cursor:pointer; }
    a { font-family:inherit; }

    /* ─── HERO ───────────────────────────────────── */
    .hero {
      position:relative;
      background:linear-gradient(145deg, #4338CA 0%, #6366F1 45%, #7C3AED 100%);
      padding:3rem 1.5rem 3.5rem;
      overflow:hidden;
    }
    .hero-bg-shapes { position:absolute; inset:0; pointer-events:none; }
    .shape {
      position:absolute; border-radius:50%;
      background:rgba(255,255,255,.06);
    }
    .shape-1 { width:320px; height:320px; top:-80px; right:-60px; }
    .shape-2 { width:200px; height:200px; bottom:-60px; left:-40px; background:rgba(255,255,255,.04); }
    .shape-3 { width:120px; height:120px; top:50%; left:60%; background:rgba(249,115,22,.15); }

    .hero-inner {
      position:relative; z-index:1;
      max-width:680px; margin:0 auto; text-align:center;
      display:flex; flex-direction:column; align-items:center; gap:.75rem;
    }
    .hero-eyebrow {
      display:inline-flex; align-items:center; gap:.35rem;
      background:rgba(255,255,255,.15); color:rgba(255,255,255,.9);
      font-size:.72rem; font-weight:600; letter-spacing:.08em;
      text-transform:uppercase; padding:.3rem .85rem; border-radius:999px;
      border:1px solid rgba(255,255,255,.2);
    }
    .eyebrow-icon { font-size:.85rem; width:.85rem; height:.85rem; color:#86EFAC; }
    .hero-headline {
      font-size:clamp(1.9rem, 5vw, 2.75rem); font-weight:800;
      color:#fff; line-height:1.15; text-wrap:balance;
      letter-spacing:-.02em; margin:0;
    }
    .hero-sub {
      font-size:.875rem; color:rgba(255,255,255,.7);
      margin:0; letter-spacing:.01em;
    }

    .hero-search-wrap { width:100%; max-width:560px; display:flex; flex-direction:column; gap:.5rem; margin-top:.5rem; }
    .hero-search {
      display:flex; align-items:center; gap:.5rem;
      background:#fff;
      border-radius:14px; padding:.65rem 1rem;
      box-shadow:0 8px 32px rgba(0,0,0,.25), 0 2px 8px rgba(0,0,0,.12);
      border:2px solid transparent;
      transition:border-color .2s, box-shadow .2s;
    }
    .hero-search.focused {
      border-color:#6366F1;
      box-shadow:0 8px 32px rgba(99,102,241,.3), 0 0 0 4px rgba(99,102,241,.12);
    }
    .search-icon { color:#94A3B8; font-size:1.15rem; width:1.15rem; height:1.15rem; flex-shrink:0; }
    .search-input {
      flex:1; border:none; outline:none;
      font-size:.95rem; color:#0F172A; background:transparent;
      font-family:inherit;
    }
    .search-input::placeholder { color:#94A3B8; }
    .search-clear {
      background:none; border:none; padding:.1rem;
      display:flex; align-items:center;
      color:#94A3B8; transition:color .15s;
    }
    .search-clear:hover { color:#475569; }
    .search-clear mat-icon { font-size:1rem; width:1rem; height:1rem; }
    .search-hint {
      display:inline-flex; align-items:center; gap:.3rem;
      font-size:.8rem; color:rgba(255,255,255,.7); align-self:flex-start; padding-left:.25rem;
    }
    .search-hint mat-icon { font-size:.85rem; width:.85rem; height:.85rem; }

    /* ─── CATEGORY PILLS BAR ─────────────────────── */
    .cats-bar-wrap {
      background:#fff;
      border-bottom:1px solid #E2E8F0;
      position:sticky; top:68px; z-index:40;
      box-shadow:0 2px 8px rgba(0,0,0,.05);
    }
    .cats-bar {
      display:flex; gap:.5rem; align-items:center;
      flex-wrap:nowrap;
      overflow-x:auto; padding:.75rem 1.5rem;
      max-width:1280px; margin:0 auto;
      scrollbar-width:none;
      scroll-behavior:smooth;
      -webkit-overflow-scrolling:touch;
      overscroll-behavior-x:contain;
      touch-action:pan-x;
    }
    .cats-bar::-webkit-scrollbar { display:none; }
    .cats-fade {
      position:absolute; top:0; bottom:0; width:2.5rem;
      pointer-events:none; z-index:1;
      opacity:0; transition:opacity .2s ease;
    }
    .cats-fade--left {
      left:0;
      background:linear-gradient(to right, #fff, rgba(255,255,255,0));
    }
    .cats-fade--right {
      right:0;
      background:linear-gradient(to left, #fff, rgba(255,255,255,0));
    }
    .cats-fade.visible { opacity:1; }

    .cat-chip {
      display:inline-flex; align-items:center; gap:.35rem;
      flex-shrink:0;
      padding:.4rem .9rem; border-radius:999px;
      border:1.5px solid #E2E8F0;
      background:#fff; color:#475569;
      font-size:.8rem; font-weight:600;
      transition:all .18s ease; white-space:nowrap;
    }
    .cat-chip:hover {
      border-color:var(--chip-color, #6366F1);
      color:var(--chip-color, #6366F1);
      background:var(--chip-light, #EEF2FF);
    }
    .cat-chip.active {
      background:var(--chip-color, #6366F1);
      border-color:var(--chip-color, #6366F1);
      color:#fff;
      box-shadow:0 2px 8px rgba(0,0,0,.15);
    }
    .cat-chip.active .chip-count { background:rgba(255,255,255,.25); color:#fff; }
    .chip-icon { font-size:.85rem; width:.85rem; height:.85rem; }
    .chip-label { line-height:1; }
    .chip-count {
      font-size:.68rem; font-weight:700;
      background:#F1F5F9; color:#64748B;
      padding:.1rem .35rem; border-radius:999px;
      transition:all .18s;
    }

    /* ─── CONTENT AREA ───────────────────────────── */
    .content-wrap {
      max-width:1280px; margin:0 auto;
      padding:1.75rem 1.5rem 4rem;
      display:flex; flex-direction:column; gap:1.5rem;
    }

    /* ─── RESULT BAR ─────────────────────────────── */
    .result-bar {
      display:flex; justify-content:space-between; align-items:center;
      flex-wrap:wrap; gap:.75rem;
    }
    .result-count { font-size:.875rem; color:#475569; }
    .result-count strong { color:#0F172A; font-weight:700; }
    .btn-clear-filters {
      display:inline-flex; align-items:center; gap:.3rem;
      background:none; border:1.5px solid #E2E8F0; border-radius:8px;
      padding:.3rem .75rem; font-size:.78rem; font-weight:600; color:#475569;
      transition:all .15s;
    }
    .btn-clear-filters:hover { border-color:#6366F1; color:#6366F1; }
    .btn-clear-filters mat-icon { font-size:.85rem; width:.85rem; height:.85rem; }

    .concern-banner {
      display:flex; align-items:center; justify-content:space-between; gap:1rem;
      flex-wrap:wrap;
      background:#EEF2FF; border:1px solid #C7D2FE; border-radius:14px;
      padding:1rem 1.25rem; margin-bottom:1.25rem;
    }
    .concern-banner--suggestion { background:#F0FDFA; border-color:#99F6E4; }
    .concern-heading { font-size:1.05rem; font-weight:700; color:#0F172A; margin:0 0 .2rem 0; }
    .concern-sub { font-size:.8rem; color:#475569; margin:0; }
    .concern-banner .btn-clear-filters { background:#fff; flex-shrink:0; }

    /* ─── FEATURED CARD ──────────────────────────── */
    .featured-card {
      background:#fff;
      border-radius:20px;
      border:1px solid #E2E8F0;
      box-shadow:0 4px 20px rgba(99,102,241,.1), 0 1px 4px rgba(0,0,0,.05);
      overflow:hidden; display:flex;
      cursor:pointer;
      transition:box-shadow .2s, transform .2s;
      position:relative;
    }
    .featured-card:hover {
      box-shadow:0 8px 32px rgba(99,102,241,.18), 0 2px 8px rgba(0,0,0,.08);
      transform:translateY(-2px);
    }
    .featured-card:focus-visible {
      outline:3px solid #6366F1; outline-offset:3px;
    }
    .featured-left-bar { width:5px; flex-shrink:0; }
    .featured-body {
      flex:1; display:flex; justify-content:space-between;
      align-items:flex-start; gap:2rem; flex-wrap:wrap;
      padding:1.75rem 1.75rem 1.75rem 1.5rem;
    }
    .featured-info { flex:1; min-width:0; display:flex; flex-direction:column; gap:.6rem; }
    .featured-header-row { display:flex; align-items:center; gap:.65rem; flex-wrap:wrap; }
    .featured-badge {
      display:inline-flex; align-items:center; gap:.25rem;
      background:linear-gradient(135deg,#F97316,#EA580C);
      color:#fff; font-size:.7rem; font-weight:700;
      padding:.2rem .6rem; border-radius:999px; letter-spacing:.04em;
    }
    .featured-badge mat-icon { font-size:.8rem; width:.8rem; height:.8rem; }
    .featured-cat-chip {
      display:inline-flex; align-items:center; gap:.25rem;
      font-size:.72rem; font-weight:600; padding:.2rem .6rem;
      border-radius:999px; border:1.5px solid transparent;
    }
    .featured-cat-chip mat-icon { font-size:.8rem; width:.8rem; height:.8rem; }
    .featured-name {
      font-size:1.3rem; font-weight:800; color:#0F172A;
      line-height:1.2; letter-spacing:-.01em; text-wrap:balance;
      margin:0;
    }
    .featured-desc {
      font-size:.875rem; color:#475569; line-height:1.65;
      margin:0; max-width:520px;
      display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;
    }
    .featured-meta-row { display:flex; gap:.65rem; flex-wrap:wrap; }
    .meta-tag {
      display:inline-flex; align-items:center; gap:.3rem;
      font-size:.75rem; font-weight:500; color:#64748B;
      background:#F8F9FF; padding:.25rem .6rem; border-radius:8px;
      border:1px solid #E2E8F0;
    }
    .meta-tag mat-icon { font-size:.82rem; width:.82rem; height:.82rem; color:#94A3B8; }

    .featured-action {
      display:flex; flex-direction:column; align-items:flex-end;
      gap:.85rem; flex-shrink:0;
    }
    .featured-price-block { display:flex; flex-direction:column; align-items:flex-end; gap:.25rem; }
    .feat-price-orig { font-size:.85rem; color:#94A3B8; text-decoration:line-through; }
    .feat-discount-pill {
      font-size:.72rem; font-weight:700; background:#DCFCE7; color:#15803D;
      padding:.15rem .5rem; border-radius:999px;
    }
    .feat-price-eff {
      font-size:2rem; font-weight:800; color:#F97316;
      line-height:1; font-variant-numeric:tabular-nums;
      letter-spacing:-.02em;
    }
    .btn-book-featured {
      display:inline-flex; align-items:center; gap:.4rem;
      background:#6366F1; color:#fff;
      border:none; border-radius:12px;
      padding:.65rem 1.35rem; font-size:.9rem; font-weight:700;
      transition:background .18s, transform .15s, box-shadow .18s;
      box-shadow:0 4px 12px rgba(99,102,241,.35);
    }
    .btn-book-featured:hover {
      background:#4F46E5;
      box-shadow:0 6px 18px rgba(99,102,241,.45);
      transform:translateY(-1px);
    }
    .btn-book-featured mat-icon { font-size:.95rem; width:.95rem; height:.95rem; }
    .feat-details-link {
      font-size:.8rem; font-weight:500; color:#6366F1;
      text-decoration:none; text-align:center;
      transition:color .15s;
    }
    .feat-details-link:hover { color:#4F46E5; text-decoration:underline; }

    /* ─── TEST GRID ──────────────────────────────── */
    .tests-grid {
      display:grid;
      grid-template-columns:repeat(auto-fill,minmax(260px,1fr));
      gap:1rem;
    }
    .test-card {
      background:#fff; border-radius:16px;
      border:1px solid #E2E8F0;
      overflow:hidden;
      display:flex; flex-direction:column;
      box-shadow:0 1px 4px rgba(0,0,0,.05);
      transition:box-shadow .2s, transform .2s;
    }
    .test-card:hover {
      box-shadow:0 6px 24px rgba(0,0,0,.1), 0 0 0 1.5px var(--cat-color, #6366F1);
      transform:translateY(-3px);
    }
    .card-top-bar {
      height:4px;
      background:var(--cat-color, #6366F1);
      flex-shrink:0;
    }
    .card-body {
      display:flex; flex-direction:column; gap:.6rem;
      padding:1.1rem 1.1rem 1rem; flex:1;
    }
    .card-header-row { display:flex; justify-content:space-between; align-items:center; gap:.5rem; }
    .card-cat-badge {
      display:inline-flex; align-items:center; gap:.25rem;
      font-size:.7rem; font-weight:600;
      background:var(--cat-light, #EEF2FF);
      color:var(--cat-color, #6366F1);
      border:1px solid var(--cat-border, #C7D2FE);
      padding:.15rem .5rem; border-radius:999px;
    }
    .card-cat-badge mat-icon { font-size:.78rem; width:.78rem; height:.78rem; }
    .card-discount-badge {
      font-size:.68rem; font-weight:700;
      background:#DCFCE7; color:#15803D;
      padding:.15rem .45rem; border-radius:999px;
    }
    .card-name {
      font-size:.95rem; font-weight:700; color:#0F172A;
      line-height:1.3; margin:0;
    }
    .card-desc {
      font-size:.8rem; color:#64748B; line-height:1.55;
      margin:0;
      display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;
    }
    .card-tags-row { display:flex; gap:.5rem; flex-wrap:wrap; }
    .card-tag {
      display:inline-flex; align-items:center; gap:.25rem;
      font-size:.72rem; color:#64748B;
      background:#F8FAFC; padding:.2rem .5rem; border-radius:6px;
      border:1px solid #F1F5F9;
    }
    .card-tag mat-icon { font-size:.78rem; width:.78rem; height:.78rem; color:#94A3B8; }
    .home-tag mat-icon { color:#22C55E; }

    .card-footer {
      display:flex; justify-content:space-between; align-items:center;
      margin-top:auto; padding-top:.75rem;
      border-top:1px solid #F1F5F9;
    }
    .card-price { display:flex; flex-direction:column; gap:.05rem; }
    .card-price-orig { font-size:.73rem; color:#94A3B8; text-decoration:line-through; font-variant-numeric:tabular-nums; }
    .card-price-eff {
      font-size:1.1rem; font-weight:800; color:#F97316;
      font-variant-numeric:tabular-nums; line-height:1;
    }
    .card-actions { display:flex; gap:.4rem; align-items:center; }
    .btn-details-sm {
      padding:.32rem .65rem; border-radius:8px;
      border:1.5px solid #E2E8F0;
      font-size:.76rem; font-weight:600; color:#475569;
      text-decoration:none; transition:all .15s;
    }
    .btn-details-sm:hover { border-color:#6366F1; color:#6366F1; }
    .btn-book-sm {
      padding:.32rem .75rem; border-radius:8px;
      background:#6366F1; color:#fff;
      border:none; font-size:.76rem; font-weight:700;
      transition:background .15s, box-shadow .15s;
      box-shadow:0 2px 6px rgba(99,102,241,.3);
    }
    .btn-book-sm:hover { background:#4F46E5; box-shadow:0 3px 10px rgba(99,102,241,.4); }

    /* ─── SKELETONS ──────────────────────────────── */
    @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
    .skeleton-feat {
      height:160px; border-radius:20px;
      background:linear-gradient(90deg,#EEF2FF 25%,#E0E7FF 50%,#EEF2FF 75%);
      background-size:200% 100%; animation:shimmer 1.6s infinite;
    }
    .skeleton-card {
      background:#fff; border-radius:16px; border:1px solid #E2E8F0;
      padding:1.1rem; display:flex; flex-direction:column; gap:.65rem;
      overflow:hidden;
    }
    .sk-top { height:.6rem; width:35%; border-radius:4px; background:linear-gradient(90deg,#EEF2FF 25%,#E0E7FF 50%,#EEF2FF 75%); background-size:200% 100%; animation:shimmer 1.6s infinite; }
    .sk-title { height:.9rem; width:80%; border-radius:4px; background:linear-gradient(90deg,#EEF2FF 25%,#E0E7FF 50%,#EEF2FF 75%); background-size:200% 100%; animation:shimmer 1.6s infinite; }
    .sk-line { height:.7rem; width:100%; border-radius:4px; background:linear-gradient(90deg,#EEF2FF 25%,#E0E7FF 50%,#EEF2FF 75%); background-size:200% 100%; animation:shimmer 1.6s infinite; }
    .sk-short { width:60%; }
    .sk-footer { display:flex; justify-content:space-between; align-items:center; margin-top:.3rem; }
    .sk-price { height:1.1rem; width:25%; border-radius:4px; background:linear-gradient(90deg,#FFEDD5 25%,#FED7AA 50%,#FFEDD5 75%); background-size:200% 100%; animation:shimmer 1.6s infinite; }
    .sk-btn { height:1.75rem; width:28%; border-radius:8px; background:linear-gradient(90deg,#EEF2FF 25%,#E0E7FF 50%,#EEF2FF 75%); background-size:200% 100%; animation:shimmer 1.6s infinite; }

    /* ─── STATES ─────────────────────────────────── */
    .state-panel {
      display:flex; flex-direction:column; align-items:center;
      text-align:center; gap:1rem; padding:4rem 2rem;
    }
    .state-icon-wrap {
      width:72px; height:72px; border-radius:20px;
      display:flex; align-items:center; justify-content:center;
    }
    .state-icon-wrap mat-icon { font-size:2rem; width:2rem; height:2rem; }
    .empty-icon-wrap { background:#EEF2FF; }
    .empty-icon-wrap mat-icon { color:#6366F1; }
    .error-icon-wrap { background:#FEE2E2; }
    .error-icon-wrap mat-icon { color:#EF4444; }
    .state-panel h3 { font-size:1.1rem; font-weight:700; color:#0F172A; margin:0; }
    .state-panel p { font-size:.875rem; color:#64748B; margin:0; }
    .btn-primary {
      display:inline-flex; align-items:center; gap:.4rem;
      background:#6366F1; color:#fff;
      border:none; border-radius:10px;
      padding:.6rem 1.4rem; font-size:.875rem; font-weight:700;
      box-shadow:0 4px 12px rgba(99,102,241,.3);
      transition:background .15s, box-shadow .15s;
    }
    .btn-primary:hover { background:#4F46E5; box-shadow:0 6px 16px rgba(99,102,241,.4); }
    .btn-primary mat-icon { font-size:1rem; width:1rem; height:1rem; }

    /* ─── PAGINATION ─────────────────────────────── */
    .pagination { display:flex; justify-content:center; align-items:center; gap:.4rem; padding:.5rem 0; }
    .page-btn {
      width:36px; height:36px; border-radius:10px;
      border:1.5px solid #E2E8F0; background:#fff;
      display:flex; align-items:center; justify-content:center;
      color:#475569; transition:all .15s;
    }
    .page-btn:not(:disabled):hover { border-color:#6366F1; color:#6366F1; }
    .page-btn:disabled { opacity:.35; cursor:not-allowed; }
    .page-btn mat-icon { font-size:1.1rem; width:1.1rem; height:1.1rem; }
    .page-num {
      width:36px; height:36px; border-radius:10px;
      border:1.5px solid #E2E8F0; background:#fff;
      font-size:.85rem; font-weight:600; color:#475569;
      transition:all .15s; font-variant-numeric:tabular-nums;
    }
    .page-num:hover { border-color:#6366F1; color:#6366F1; }
    .page-num.active {
      background:#6366F1; border-color:#6366F1; color:#fff;
      box-shadow:0 2px 8px rgba(99,102,241,.3);
    }

    /* ─── RESPONSIVE ─────────────────────────────── */
    @media (max-width:768px) {
      .hero { padding:2rem 1rem 2.5rem; }
      .hero-headline { letter-spacing:-.015em; }
      .cats-bar-wrap { top:64px; }
      .content-wrap { padding:1.25rem 1rem 3rem; }
      .featured-body { gap:1.25rem; }
      .featured-action { align-items:flex-start; }
      .feat-price-eff { font-size:1.6rem; }
      .tests-grid { grid-template-columns:repeat(auto-fill,minmax(220px,1fr)); gap:.75rem; }
    }
    @media (max-width:480px) {
      .tests-grid { grid-template-columns:1fr; }
      .featured-body { flex-direction:column; padding:1.25rem; }
      .featured-action { align-items:flex-start; }
      .btn-book-featured { width:100%; justify-content:center; }
    }
  `],
})
export class TestCatalogComponent implements OnInit, AfterViewInit {
  @ViewChild('catsBar') catsBarRef?: ElementRef<HTMLElement>;
  canScrollLeft = signal(false);
  canScrollRight = signal(false);
  searchCtrl = new FormControl('');
  allTests = signal<Test[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  total = signal(0);
  page = signal(1);
  pageSize = 20;
  selectedCategory = signal<string | null>(null);
  searchFocused = false;

  selectedConcernKeys = signal<string[]>([]);
  allConcerns = signal<HealthConcern[]>([]);
  savedConcernKeys = signal<string[]>([]);

  concernNames = computed(() =>
    this.selectedConcernKeys()
      .map(k => this.allConcerns().find(c => c.key === k)?.name ?? k)
      .join(', ')
  );

  savedConcernNames = computed(() => {
    if (this.selectedConcernKeys().length || !this.savedConcernKeys().length) return '';
    return this.savedConcernKeys()
      .map(k => this.allConcerns().find(c => c.key === k)?.name ?? k)
      .join(', ');
  });

  categories = computed(() => {
    const map = new Map<string, number>();
    this.allTests().forEach(t => map.set(t.category, (map.get(t.category) ?? 0) + 1));
    return Array.from(map.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  });

  filteredTests = computed(() => {
    let tests = this.allTests();
    const q = (this.searchCtrl.value ?? '').toLowerCase().trim();
    const cat = this.selectedCategory();
    if (q) tests = tests.filter(t =>
      t.name.toLowerCase().includes(q) ||
      t.category.toLowerCase().includes(q) ||
      (t.description ?? '').toLowerCase().includes(q)
    );
    if (cat) tests = tests.filter(t => t.category === cat);
    return tests;
  });

  totalPages = computed(() => Math.ceil(this.filteredTests().length / this.pageSize));

  gridTests = computed(() => {
    const all = this.filteredTests();
    const skipFeatured = this.page() === 1 && !this.selectedCategory() && !(this.searchCtrl.value ?? '').trim();
    const list = skipFeatured ? all.slice(1) : all;
    const start = (this.page() - 1) * this.pageSize;
    return list.slice(start, start + this.pageSize);
  });

  pageRange = computed(() => {
    const total = this.totalPages();
    const current = this.page();
    const delta = 2;
    const pages: number[] = [];
    for (let i = Math.max(1, current - delta); i <= Math.min(total, current + delta); i++) {
      pages.push(i);
    }
    return pages;
  });

  categoryChips = computed(() => {
    const dynamicKeys = new Set(this.categories().map(c => c.name));
    // Show static chips that exist in data, plus any dynamic ones not in static list
    const staticKeys = new Set(CATEGORY_ICONS.slice(1).map(c => c.key));
    const extra = this.categories()
      .filter(c => !staticKeys.has(c.name))
      .map(c => ({ label: c.name, icon: 'biotech', key: c.name }));
    return [...CATEGORY_ICONS, ...extra];
  });

  constructor(
    private testApi: TestApiService,
    private healthConcernApi: HealthConcernApiService,
    private userApi: UserApiService,
    private authState: AuthStateService,
    private router: Router,
    private route: ActivatedRoute,
  ) {
    effect(() => {
      this.categoryChips();
      queueMicrotask(() => this.updateCatsFade());
    });
  }

  ngAfterViewInit(): void {
    this.updateCatsFade();
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    this.updateCatsFade();
  }

  updateCatsFade(): void {
    const el = this.catsBarRef?.nativeElement;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    this.canScrollLeft.set(el.scrollLeft > 4);
    this.canScrollRight.set(maxScroll > 4 && el.scrollLeft < maxScroll - 4);
  }

  onCatsWheel(event: WheelEvent): void {
    const el = this.catsBarRef?.nativeElement;
    if (!el || el.scrollWidth <= el.clientWidth) return;
    if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
    event.preventDefault();
    el.scrollLeft += event.deltaY;
  }

  ngOnInit(): void {
    this.healthConcernApi.list().subscribe({ next: (list) => this.allConcerns.set(list) });

    this.route.queryParams.subscribe(params => {
      if (params['q']) this.searchCtrl.setValue(params['q']);
      const concernParam = params['health_concern'];
      this.selectedConcernKeys.set(concernParam ? concernParam.split(',').filter(Boolean) : []);
      this.load();
    });
    this.searchCtrl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe(() => this.page.set(1));

    if (this.authState.isAuthenticated()) {
      this.userApi.getProfile().subscribe({
        next: (profile) => this.savedConcernKeys.set(profile.health_concerns ?? []),
      });
    }
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    const concernKeys = this.selectedConcernKeys();
    this.testApi.list({ page_size: 500, health_concern: concernKeys.length ? concernKeys.join(',') : undefined }).subscribe({
      next: (res) => {
        const activeOnly = res.items.filter((t: any) => t.is_active);
        this.allTests.set(activeOnly);
        this.total.set(activeOnly.length);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load tests. Please try again.');
        this.loading.set(false);
      },
    });
  }

  selectCategory(cat: string | null): void { this.selectedCategory.set(cat); this.page.set(1); }
  changePage(p: number): void { this.page.set(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  clearFilters(): void { this.searchCtrl.setValue(''); this.selectedCategory.set(null); this.page.set(1); }
  book(test: Test): void { this.router.navigate(['/booking'], { queryParams: { test_id: test.id } }); }

  clearConcernFilter(): void {
    this.router.navigate(['/tests'], { queryParams: { q: this.searchCtrl.value || null } });
  }

  applySavedConcerns(): void {
    this.router.navigate(['/tests'], { queryParams: { health_concern: this.savedConcernKeys().join(',') } });
  }

  getCatColor(cat: string | null): string { return cat ? (CATEGORY_META[cat]?.color ?? '#6366F1') : '#6366F1'; }
  getCatLight(cat: string | null): string { return cat ? (CATEGORY_META[cat]?.light ?? '#EEF2FF') : '#EEF2FF'; }
  getCatBorder(cat: string | null): string { return cat ? (CATEGORY_META[cat]?.border ?? '#C7D2FE') : '#C7D2FE'; }
  getCatIcon(cat: string): string { return CATEGORY_META[cat]?.icon ?? 'biotech'; }
  getCatCount(key: string | null): number {
    if (!key) return this.total();
    return this.categories().find(c => c.name === key)?.count ?? 0;
  }
  getFeaturedGradient(): string {
    const test = this.filteredTests()[0];
    if (!test) return 'linear-gradient(180deg,#6366F1,#4F46E5)';
    const color = this.getCatColor(test.category);
    return `linear-gradient(180deg,${color},${color}cc)`;
  }
}
