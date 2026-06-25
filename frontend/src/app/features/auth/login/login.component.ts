// TODO(TEMP_PASSWORD_AUTH): The "password" mode and all related logic can be removed
// when switching back to OTP-only auth. Search for TODO(TEMP_PASSWORD_AUTH) to find all touch-points.
import { Component, OnDestroy, OnInit, signal, computed, ElementRef, ViewChildren, QueryList, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AuthApiService } from '../../../core/api/services/auth-api.service';
import { AuthStateService } from '../../../core/auth/auth-state.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule, RouterModule],
  template: `
    <div class="auth-root">

      <!-- LEFT BRAND PANEL (desktop only) -->
      <div class="brand-panel" aria-hidden="true">
        <div class="brand-panel__inner">
          <!-- Logo mark -->
          <div class="brand-logo">
            <div class="brand-logo__icon">
              <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
                <rect width="36" height="36" rx="10" fill="rgba(255,255,255,0.15)"/>
                <path d="M18 8C18 8 10 12.5 10 19.5C10 23.64 13.58 27 18 27C22.42 27 26 23.64 26 19.5C26 12.5 18 8 18 8Z" fill="white" opacity="0.9"/>
                <path d="M18 13C18 13 13 16.25 13 20.5C13 23.26 15.24 25.5 18 25.5C20.76 25.5 23 23.26 23 20.5C23 16.25 18 13 18 13Z" fill="rgba(99,102,241,0.6)"/>
                <circle cx="18" cy="20" r="3" fill="white"/>
              </svg>
            </div>
            <span class="brand-logo__name">Sri Health</span>
          </div>

          <!-- Hero text -->
          <div class="brand-hero">
            <h1 class="brand-hero__title">Diagnostics you can trust, results when you need them.</h1>
            <p class="brand-hero__sub">Fast, accurate, and affordable lab tests — delivered to your home or at our centres across India.</p>
          </div>

          <!-- Trust badges -->
          <div class="trust-badges">
            <div class="trust-badge">
              <div class="trust-badge__icon">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 1L11.09 6.26L17 7.27L13 11.14L14.18 17.02L9 14.27L3.82 17.02L5 11.14L1 7.27L6.91 6.26L9 1Z" fill="currentColor"/></svg>
              </div>
              <div>
                <div class="trust-badge__value">4.9 / 5</div>
                <div class="trust-badge__label">Patient rating</div>
              </div>
            </div>
            <div class="trust-badge">
              <div class="trust-badge__icon">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 2C9 2 3 5.5 3 10.5C3 14.09 5.69 17 9 17C12.31 17 15 14.09 15 10.5C15 5.5 9 2 9 2Z" fill="currentColor"/></svg>
              </div>
              <div>
                <div class="trust-badge__value">NABL Certified</div>
                <div class="trust-badge__label">Accredited labs</div>
              </div>
            </div>
            <div class="trust-badge">
              <div class="trust-badge__icon">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="8" stroke="currentColor" stroke-width="1.5"/><path d="M5.5 9L7.5 11L12.5 6.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </div>
              <div>
                <div class="trust-badge__value">2 Lakh+</div>
                <div class="trust-badge__label">Reports delivered</div>
              </div>
            </div>
          </div>

          <!-- Decorative circles -->
          <div class="brand-deco brand-deco--1"></div>
          <div class="brand-deco brand-deco--2"></div>
        </div>
      </div>

      <!-- RIGHT FORM PANEL -->
      <div class="form-panel">
        <div class="form-panel__inner">

          <!-- Mobile logo (hidden on desktop) -->
          <div class="mobile-brand">
            <div class="mobile-brand__icon">
              <svg width="28" height="28" viewBox="0 0 36 36" fill="none">
                <path d="M18 4C18 4 8 9.5 8 18.5C8 23.64 12.48 28 18 28C23.52 28 28 23.64 28 18.5C28 9.5 18 4 18 4Z" fill="#6366F1" opacity="0.15"/>
                <path d="M18 4C18 4 8 9.5 8 18.5C8 23.64 12.48 28 18 28C23.52 28 28 23.64 28 18.5C28 9.5 18 4 18 4Z" stroke="#6366F1" stroke-width="1.5"/>
                <circle cx="18" cy="18" r="4" fill="#6366F1"/>
              </svg>
            </div>
            <span class="mobile-brand__name">Sri Health</span>
          </div>

          <!-- Form header -->
          <div class="form-header">
            <h2 class="form-header__title">Welcome back</h2>
            <p class="form-header__sub">Sign in to access your reports and bookings</p>
          </div>

          <!-- Mode tabs -->
          <div class="mode-tabs" role="tablist">
            <button class="mode-tab" role="tab" [class.mode-tab--active]="mode() === 'password'" (click)="switchMode('password')" [attr.aria-selected]="mode() === 'password'">
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="1" y="5" width="13" height="9" rx="2" stroke="currentColor" stroke-width="1.4"/><path d="M5 5V3.5C5 2.12 6.12 1 7.5 1C8.88 1 10 2.12 10 3.5V5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><circle cx="7.5" cy="9.5" r="1" fill="currentColor"/></svg>
              Password
            </button>
            <button class="mode-tab" role="tab" [class.mode-tab--active]="mode() === 'otp'" (click)="switchMode('otp')" [attr.aria-selected]="mode() === 'otp'">
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="2" y="1" width="11" height="13" rx="2" stroke="currentColor" stroke-width="1.4"/><path d="M5 10.5H10M5 7.5H10M5 4.5H8" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
              OTP
            </button>
            <div class="mode-tabs__slider" [class.mode-tabs__slider--right]="mode() === 'otp'"></div>
          </div>

          <!-- Alert: session message -->
          @if (sessionMessage()) {
            <div class="alert alert--info" role="status">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.4"/><path d="M8 5V8.5M8 11H8.01" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
              {{ sessionMessage() }}
            </div>
          }

          <!-- Alert: error -->
          @if (error()) {
            <div class="alert alert--error" role="alert">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.4"/><path d="M8 5V8M8 11H8.01" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
              {{ error() }}
            </div>
          }

          <!-- ─── PASSWORD MODE ─── -->
          @if (mode() === 'password') {
            <form [formGroup]="passwordForm" (ngSubmit)="loginWithPassword()" class="auth-form" novalidate>

              <div class="field" [class.field--focused]="identifierFocused" [class.field--error]="passwordForm.get('identifier')?.invalid && passwordForm.get('identifier')?.touched" [class.field--filled]="passwordForm.get('identifier')?.value">
                <label class="field__label" for="identifier">Email or Phone</label>
                <div class="field__wrap">
                  <span class="field__icon">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="5.5" r="2.5" stroke="currentColor" stroke-width="1.4"/><path d="M2.5 13.5C2.5 11.29 5.02 9.5 8 9.5C10.98 9.5 13.5 11.29 13.5 13.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
                  </span>
                  <input id="identifier" formControlName="identifier" type="text" class="field__input"
                    placeholder=" " (focus)="identifierFocused=true" (blur)="identifierFocused=false"
                    autocomplete="username" />
                </div>
                @if (passwordForm.get('identifier')?.invalid && passwordForm.get('identifier')?.touched) {
                  <span class="field__error">Enter your email or phone number</span>
                }
              </div>

              <div class="field" [class.field--focused]="pwFocused" [class.field--error]="passwordForm.get('password')?.invalid && passwordForm.get('password')?.touched" [class.field--filled]="passwordForm.get('password')?.value">
                <label class="field__label" for="password">Password</label>
                <div class="field__wrap">
                  <span class="field__icon">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="7" width="12" height="8" rx="1.5" stroke="currentColor" stroke-width="1.4"/><path d="M5 7V4.5C5 3.12 6.34 2 8 2C9.66 2 11 3.12 11 4.5V7" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
                  </span>
                  <input id="password" formControlName="password" [type]="showPassword ? 'text' : 'password'"
                    class="field__input" placeholder=" "
                    (focus)="pwFocused=true" (blur)="pwFocused=false"
                    autocomplete="current-password" />
                  <button type="button" class="field__eye" (click)="showPassword=!showPassword" tabindex="-1" [attr.aria-label]="showPassword ? 'Hide password' : 'Show password'">
                    @if (showPassword) {
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M1 8C1 8 4 3 8 3C12 3 15 8 15 8C15 8 12 13 8 13C4 13 1 8 1 8Z" stroke="currentColor" stroke-width="1.4"/><circle cx="8" cy="8" r="2" stroke="currentColor" stroke-width="1.4"/><path d="M2 2L14 14" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
                    } @else {
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M1 8C1 8 4 3 8 3C12 3 15 8 15 8C15 8 12 13 8 13C4 13 1 8 1 8Z" stroke="currentColor" stroke-width="1.4"/><circle cx="8" cy="8" r="2" stroke="currentColor" stroke-width="1.4"/></svg>
                    }
                  </button>
                </div>
                @if (passwordForm.get('password')?.invalid && passwordForm.get('password')?.touched) {
                  <span class="field__error">Password is required</span>
                }
              </div>

              <div class="forgot-row">
                <a routerLink="/auth/forgot-password" class="forgot-link">Forgot password?</a>
              </div>

              <button class="btn-primary" type="submit" [disabled]="passwordForm.invalid || loading()">
                @if (loading()) {
                  <span class="btn-spinner" aria-hidden="true"></span>
                  <span>Signing in…</span>
                } @else {
                  <span>Sign In</span>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8H13M9 4L13 8L9 12" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
                }
              </button>
            </form>
          }

          <!-- ─── OTP MODE ─── -->
          @if (mode() === 'otp') {
            <div class="otp-flow" [class.otp-flow--otp-step]="step() === 'otp'">

              <!-- PHONE STEP -->
              @if (step() === 'phone') {
                <form [formGroup]="phoneForm" (ngSubmit)="sendOtp()" class="auth-form otp-step" novalidate>
                  <div class="field" [class.field--focused]="phoneFocused" [class.field--error]="phoneForm.get('phone')?.invalid && phoneForm.get('phone')?.touched" [class.field--filled]="phoneForm.get('phone')?.value">
                    <label class="field__label" for="phone">Mobile number</label>
                    <div class="field__wrap">
                      <span class="field__prefix">+91</span>
                      <input id="phone" formControlName="phone" type="tel" class="field__input field__input--prefixed"
                        placeholder=" " maxlength="10" inputmode="numeric"
                        (focus)="phoneFocused=true" (blur)="phoneFocused=false" autocomplete="tel" />
                    </div>
                    @if (phoneForm.get('phone')?.invalid && phoneForm.get('phone')?.touched) {
                      <span class="field__error">Enter a valid 10-digit mobile number</span>
                    }
                  </div>

                  <button class="btn-primary" type="submit" [disabled]="phoneForm.invalid || loading()">
                    @if (loading()) {
                      <span class="btn-spinner" aria-hidden="true"></span>
                      <span>Sending OTP…</span>
                    } @else {
                      <span>Send OTP</span>
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8H13M9 4L13 8L9 12" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    }
                  </button>
                </form>
              }

              <!-- OTP VERIFICATION STEP -->
              @if (step() === 'otp') {
                <div class="auth-form otp-step">

                  <!-- Phone confirmed chip -->
                  <div class="phone-chip">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1C7 1 2.5 3.75 2.5 7.5C2.5 9.98 4.52 12 7 12C9.48 12 11.5 9.98 11.5 7.5C11.5 3.75 7 1 7 1Z" fill="currentColor" opacity="0.3"/><circle cx="7" cy="7" r="2.5" fill="currentColor"/></svg>
                    <span>+91 {{ phoneForm.value.phone }}</span>
                    <button type="button" class="phone-chip__change" (click)="step.set('phone')">Change</button>
                  </div>

                  <!-- Circular timer -->
                  <div class="timer-ring-wrap">
                    <svg class="timer-ring" width="80" height="80" viewBox="0 0 80 80">
                      <circle class="timer-ring__track" cx="40" cy="40" r="34" />
                      <circle class="timer-ring__progress" cx="40" cy="40" r="34"
                        [style.stroke-dashoffset]="timerDashOffset()"
                        [class.timer-ring__progress--expired]="timeLeft() === 0" />
                    </svg>
                    <div class="timer-ring__label" [class.timer-ring__label--expired]="timeLeft() === 0">
                      @if (timeLeft() > 0) {
                        <span class="timer-ring__time">{{ timerDisplay() }}</span>
                      } @else {
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="9" stroke="currentColor" stroke-width="1.5"/><path d="M10 5V9.5M10 13H10.01" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
                      }
                    </div>
                  </div>
                  @if (timeLeft() > 0) {
                    <p class="timer-hint">OTP expires in {{ timerDisplay() }}</p>
                  } @else {
                    <p class="timer-hint timer-hint--expired">OTP expired</p>
                  }

                  <form [formGroup]="otpForm" (ngSubmit)="verifyOtp()" novalidate>
                    <!-- OTP single input styled as digit boxes -->
                    <div class="otp-field-wrap">
                      <label class="sr-only" for="otpInput">Enter 6-digit OTP</label>
                      <div class="otp-boxes" [class.otp-boxes--focused]="otpFocused" [class.otp-boxes--error]="otpForm.get('otp')?.invalid && otpForm.get('otp')?.touched">
                        <input #otpInputRef id="otpInput" formControlName="otp"
                          type="text" inputmode="numeric" maxlength="6"
                          class="otp-boxes__input" autocomplete="one-time-code"
                          (focus)="otpFocused=true" (blur)="otpFocused=false"
                          (input)="onOtpInput($event)" />
                        @for (i of [0,1,2,3,4,5]; track i) {
                          <div class="otp-digit" [class.otp-digit--filled]="(otpForm.value.otp?.length ?? 0) > i" [class.otp-digit--active]="otpFocused && (otpForm.value.otp?.length ?? 0) === i">
                            {{ (otpForm.value.otp ?? '')[i] ?? '' }}
                          </div>
                        }
                      </div>
                    </div>

                    <button class="btn-primary" type="submit" [disabled]="otpForm.invalid || timeLeft() === 0 || loading()">
                      @if (loading()) {
                        <span class="btn-spinner" aria-hidden="true"></span>
                        <span>Verifying…</span>
                      } @else {
                        <span>Verify &amp; Sign In</span>
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8H13M9 4L13 8L9 12" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
                      }
                    </button>
                  </form>

                  @if (timeLeft() === 0) {
                    <div class="resend-row">
                      <button type="button" class="btn-resend" (click)="resendOtp()">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7C2 4.24 4.24 2 7 2C8.8 2 10.38 2.94 11.28 4.35M12 7C12 9.76 9.76 12 7 12C5.2 12 3.62 11.06 2.72 9.65" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><path d="M11 1.5V4.5H8" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>
                        Resend OTP
                      </button>
                    </div>
                  }
                </div>
              }
            </div>
          }

          <!-- Footer -->
          <div class="form-footer">
            <span>New to Sri Health?</span>
            <a (click)="goRegister()" class="form-footer__link" role="button" tabindex="0" (keydown.enter)="goRegister()">Create account</a>
          </div>

        </div>
      </div>
    </div>
  `,
  styles: [`
    /* ── Reset & base ── */
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :host {
      display: block;
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      -webkit-font-smoothing: antialiased;
    }

    .sr-only {
      position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
      overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0;
    }

    /* ── Root layout ── */
    .auth-root {
      min-height: 100vh;
      display: flex;
      background: #F8F9FF;
    }

    /* ── Brand panel ── */
    .brand-panel {
      display: none;
      flex: 0 0 480px;
      background: linear-gradient(145deg, #4F46E5 0%, #6366F1 45%, #7C3AED 100%);
      position: relative;
      overflow: hidden;
    }

    @media (min-width: 960px) {
      .brand-panel { display: flex; align-items: center; justify-content: center; }
    }

    .brand-panel__inner {
      position: relative;
      z-index: 2;
      padding: 3rem 3rem;
      display: flex;
      flex-direction: column;
      gap: 2.5rem;
    }

    .brand-logo {
      display: flex;
      align-items: center;
      gap: .75rem;
    }

    .brand-logo__icon {
      width: 48px;
      height: 48px;
      border-radius: 14px;
      background: rgba(255,255,255,0.1);
      border: 1px solid rgba(255,255,255,0.2);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .brand-logo__name {
      font-size: 1.35rem;
      font-weight: 800;
      color: white;
      letter-spacing: -0.02em;
    }

    .brand-hero {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .brand-hero__title {
      font-size: 2rem;
      font-weight: 800;
      color: white;
      line-height: 1.2;
      letter-spacing: -0.03em;
      text-wrap: balance;
    }

    .brand-hero__sub {
      font-size: .95rem;
      color: rgba(255,255,255,0.72);
      line-height: 1.6;
    }

    .trust-badges {
      display: flex;
      flex-direction: column;
      gap: .75rem;
    }

    .trust-badge {
      display: flex;
      align-items: center;
      gap: 1rem;
      background: rgba(255,255,255,0.08);
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 14px;
      padding: .85rem 1.1rem;
      backdrop-filter: blur(8px);
    }

    .trust-badge__icon {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      background: rgba(249,115,22,0.25);
      border: 1px solid rgba(249,115,22,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #FDBA74;
      flex-shrink: 0;
    }

    .trust-badge__value {
      font-size: .9rem;
      font-weight: 700;
      color: white;
    }

    .trust-badge__label {
      font-size: .75rem;
      color: rgba(255,255,255,0.55);
      margin-top: .1rem;
    }

    /* Decorative circles */
    .brand-deco {
      position: absolute;
      border-radius: 50%;
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.06);
      pointer-events: none;
    }

    .brand-deco--1 {
      width: 360px;
      height: 360px;
      top: -120px;
      right: -120px;
      z-index: 0;
    }

    .brand-deco--2 {
      width: 240px;
      height: 240px;
      bottom: -80px;
      left: -60px;
      z-index: 0;
    }

    /* ── Form panel ── */
    .form-panel {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem 1.25rem;
    }

    .form-panel__inner {
      width: 100%;
      max-width: 420px;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    /* ── Mobile brand ── */
    .mobile-brand {
      display: flex;
      align-items: center;
      gap: .6rem;
    }

    @media (min-width: 960px) {
      .mobile-brand { display: none; }
    }

    .mobile-brand__icon {
      width: 40px;
      height: 40px;
      border-radius: 12px;
      background: #EEF2FF;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .mobile-brand__name {
      font-size: 1.15rem;
      font-weight: 800;
      color: #0F172A;
      letter-spacing: -0.02em;
    }

    /* ── Form header ── */
    .form-header__title {
      font-size: 1.6rem;
      font-weight: 800;
      color: #0F172A;
      letter-spacing: -0.03em;
    }

    .form-header__sub {
      font-size: .9rem;
      color: #475569;
      margin-top: .35rem;
      line-height: 1.5;
    }

    /* ── Mode tabs ── */
    .mode-tabs {
      display: flex;
      position: relative;
      background: #EEF2FF;
      border-radius: 12px;
      padding: 4px;
      gap: 0;
    }

    .mode-tab {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: .45rem;
      background: transparent;
      border: none;
      border-radius: 9px;
      padding: .6rem .75rem;
      font-size: .875rem;
      font-weight: 600;
      color: #6366F1;
      cursor: pointer;
      transition: color .2s;
      position: relative;
      z-index: 1;
    }

    .mode-tab svg { flex-shrink: 0; }

    .mode-tab--active {
      color: #4F46E5;
    }

    .mode-tabs__slider {
      position: absolute;
      top: 4px;
      left: 4px;
      width: calc(50% - 4px);
      height: calc(100% - 8px);
      background: white;
      border-radius: 9px;
      box-shadow: 0 1px 6px rgba(99,102,241,0.12);
      transition: transform .25s cubic-bezier(.4,0,.2,1);
      z-index: 0;
    }

    .mode-tabs__slider--right {
      transform: translateX(calc(100% + 4px));
    }

    /* ── Alerts ── */
    .alert {
      display: flex;
      align-items: flex-start;
      gap: .6rem;
      padding: .8rem 1rem;
      border-radius: 12px;
      font-size: .875rem;
      line-height: 1.5;
    }

    .alert svg { flex-shrink: 0; margin-top: 1px; }

    .alert--info {
      background: #EFF6FF;
      color: #1D4ED8;
      border: 1px solid #BFDBFE;
    }

    .alert--error {
      background: #FEF2F2;
      color: #B91C1C;
      border: 1px solid #FECACA;
    }

    /* ── Form ── */
    .auth-form {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    /* ── Field (floating label) ── */
    .field {
      display: flex;
      flex-direction: column;
      gap: .3rem;
      position: relative;
    }

    .field__label {
      font-size: .8rem;
      font-weight: 600;
      color: #94A3B8;
      transition: color .15s;
      pointer-events: none;
      letter-spacing: .01em;
    }

    .field--focused .field__label {
      color: #6366F1;
    }

    .field--error .field__label {
      color: #EF4444;
    }

    .field__wrap {
      display: flex;
      align-items: center;
      background: white;
      border: 1.5px solid #E2E8F0;
      border-radius: 12px;
      padding: 0 1rem;
      height: 52px;
      transition: border-color .15s, box-shadow .15s;
      gap: .65rem;
    }

    .field--focused .field__wrap {
      border-color: #6366F1;
      box-shadow: 0 0 0 3px rgba(99,102,241,0.12);
    }

    .field--error .field__wrap {
      border-color: #EF4444;
      box-shadow: 0 0 0 3px rgba(239,68,68,0.08);
    }

    .field__icon {
      display: flex;
      align-items: center;
      color: #94A3B8;
      flex-shrink: 0;
      transition: color .15s;
    }

    .field--focused .field__icon {
      color: #6366F1;
    }

    .field__prefix {
      font-size: .95rem;
      font-weight: 600;
      color: #475569;
      flex-shrink: 0;
      border-right: 1.5px solid #E2E8F0;
      padding-right: .75rem;
      margin-right: .1rem;
      line-height: 1;
    }

    .field__input {
      flex: 1;
      border: none;
      outline: none;
      background: transparent;
      font-size: .975rem;
      color: #0F172A;
      font-family: inherit;
      min-width: 0;
    }

    .field__input::placeholder {
      color: transparent;
    }

    .field__input--prefixed {
      font-size: .975rem;
      letter-spacing: .05em;
    }

    .field__eye {
      background: none;
      border: none;
      cursor: pointer;
      padding: 4px;
      color: #94A3B8;
      display: flex;
      align-items: center;
      border-radius: 6px;
      transition: color .15s, background .15s;
      flex-shrink: 0;
    }

    .field__eye:hover {
      color: #475569;
      background: #F1F5F9;
    }

    .field__eye:focus-visible {
      outline: 2px solid #6366F1;
      outline-offset: 1px;
    }

    .field__error {
      font-size: .78rem;
      color: #EF4444;
      font-weight: 500;
    }

    /* ── Forgot link ── */
    .forgot-row {
      display: flex;
      justify-content: flex-end;
      margin-top: -.25rem;
    }

    .forgot-link {
      font-size: .82rem;
      font-weight: 600;
      color: #6366F1;
      text-decoration: none;
      transition: color .15s;
    }

    .forgot-link:hover { color: #4F46E5; text-decoration: underline; }

    .forgot-link:focus-visible {
      outline: 2px solid #6366F1;
      border-radius: 4px;
    }

    /* ── Primary button ── */
    .btn-primary {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: .55rem;
      background: linear-gradient(135deg, #6366F1 0%, #4F46E5 100%);
      color: white;
      border: none;
      border-radius: 12px;
      padding: .9rem 1.5rem;
      font-size: 1rem;
      font-weight: 700;
      cursor: pointer;
      transition: opacity .15s, transform .15s, box-shadow .15s;
      box-shadow: 0 4px 14px rgba(99,102,241,0.35);
      letter-spacing: -0.01em;
      font-family: inherit;
      margin-top: .25rem;
    }

    .btn-primary:hover:not(:disabled) {
      opacity: .92;
      transform: translateY(-1px);
      box-shadow: 0 6px 18px rgba(99,102,241,0.4);
    }

    .btn-primary:active:not(:disabled) {
      transform: translateY(0);
    }

    .btn-primary:disabled {
      opacity: .5;
      cursor: not-allowed;
      box-shadow: none;
    }

    .btn-primary:focus-visible {
      outline: 2px solid #6366F1;
      outline-offset: 3px;
    }

    .btn-spinner {
      width: 18px;
      height: 18px;
      border: 2px solid rgba(255,255,255,0.35);
      border-top-color: white;
      border-radius: 50%;
      animation: spin .7s linear infinite;
      flex-shrink: 0;
    }

    @keyframes spin { to { transform: rotate(360deg); } }

    /* ── OTP Flow ── */
    .otp-flow {
      animation: stepIn .25s ease both;
    }

    @keyframes stepIn {
      from { opacity: 0; transform: translateX(12px); }
      to { opacity: 1; transform: translateX(0); }
    }

    .otp-step {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      align-items: stretch;
    }

    /* Phone chip */
    .phone-chip {
      display: flex;
      align-items: center;
      gap: .5rem;
      background: #EEF2FF;
      border: 1px solid #C7D2FE;
      border-radius: 999px;
      padding: .5rem 1rem;
      font-size: .875rem;
      font-weight: 600;
      color: #4F46E5;
      align-self: flex-start;
    }

    .phone-chip svg { flex-shrink: 0; color: #6366F1; }

    .phone-chip__change {
      background: none;
      border: none;
      font-size: .8rem;
      color: #94A3B8;
      cursor: pointer;
      text-decoration: underline;
      font-family: inherit;
      padding: 0 0 0 .35rem;
      transition: color .15s;
    }

    .phone-chip__change:hover { color: #4F46E5; }

    /* Circular timer */
    .timer-ring-wrap {
      position: relative;
      width: 80px;
      height: 80px;
      align-self: center;
    }

    .timer-ring { transform: rotate(-90deg); }

    .timer-ring__track {
      fill: none;
      stroke: #EEF2FF;
      stroke-width: 5;
    }

    .timer-ring__progress {
      fill: none;
      stroke: #6366F1;
      stroke-width: 5;
      stroke-linecap: round;
      stroke-dasharray: 213.6;
      stroke-dashoffset: 0;
      transition: stroke-dashoffset 1s linear, stroke .3s;
    }

    .timer-ring__progress--expired {
      stroke: #EF4444;
    }

    .timer-ring__label {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #4F46E5;
    }

    .timer-ring__label--expired { color: #EF4444; }

    .timer-ring__time {
      font-size: .9rem;
      font-weight: 800;
      font-variant-numeric: tabular-nums;
      letter-spacing: -0.02em;
      color: #0F172A;
    }

    .timer-hint {
      font-size: .82rem;
      color: #94A3B8;
      text-align: center;
      margin-top: -.5rem;
    }

    .timer-hint--expired { color: #EF4444; font-weight: 600; }

    /* OTP digit boxes */
    .otp-field-wrap {
      width: 100%;
    }

    .otp-boxes {
      display: flex;
      gap: .5rem;
      position: relative;
      justify-content: center;
    }

    .otp-boxes__input {
      position: absolute;
      inset: 0;
      opacity: 0;
      width: 100%;
      height: 100%;
      cursor: text;
      z-index: 2;
      font-size: 16px; /* prevent iOS zoom */
    }

    .otp-digit {
      flex: 1;
      height: 54px;
      max-width: 52px;
      border: 2px solid #E2E8F0;
      border-radius: 12px;
      background: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.4rem;
      font-weight: 800;
      color: #0F172A;
      transition: border-color .15s, box-shadow .15s, background .15s;
      font-variant-numeric: tabular-nums;
    }

    .otp-boxes--focused .otp-digit.otp-digit--active {
      border-color: #6366F1;
      box-shadow: 0 0 0 3px rgba(99,102,241,0.12);
      background: #FAFBFF;
    }

    .otp-digit--filled {
      border-color: #C7D2FE;
      background: #EEF2FF;
      color: #4F46E5;
    }

    .otp-boxes--error .otp-digit {
      border-color: #FECACA;
      background: #FEF2F2;
    }

    /* Resend button */
    .resend-row {
      display: flex;
      justify-content: center;
      margin-top: -.25rem;
    }

    .btn-resend {
      display: flex;
      align-items: center;
      gap: .4rem;
      background: none;
      border: 1.5px solid #6366F1;
      border-radius: 999px;
      padding: .45rem 1.1rem;
      font-size: .85rem;
      font-weight: 600;
      color: #6366F1;
      cursor: pointer;
      font-family: inherit;
      transition: background .15s, color .15s;
    }

    .btn-resend:hover {
      background: #EEF2FF;
      color: #4F46E5;
    }

    .btn-resend:focus-visible {
      outline: 2px solid #6366F1;
      outline-offset: 2px;
    }

    /* ── Form footer ── */
    .form-footer {
      text-align: center;
      font-size: .875rem;
      color: #94A3B8;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: .4rem;
      padding-top: .25rem;
    }

    .form-footer__link {
      font-weight: 700;
      color: #F97316;
      text-decoration: none;
      cursor: pointer;
      transition: color .15s;
    }

    .form-footer__link:hover { color: #EA580C; text-decoration: underline; }

    .form-footer__link:focus-visible {
      outline: 2px solid #F97316;
      border-radius: 4px;
    }

    /* ── Reduced motion ── */
    @media (prefers-reduced-motion: reduce) {
      .btn-primary, .field__wrap, .mode-tabs__slider, .otp-flow { transition: none; animation: none; }
      .btn-primary:hover:not(:disabled) { transform: none; }
    }
  `],
})
export class LoginComponent implements OnInit, OnDestroy {
  // TODO(TEMP_PASSWORD_AUTH): default mode is 'password'; revert to 'otp' when removing password auth
  mode = signal<'otp' | 'password'>('password');
  step = signal<'phone' | 'otp'>('phone');
  loading = signal(false);
  error = signal<string | null>(null);
  sessionMessage = signal<string | null>(null);
  timeLeft = signal(300);

  timerDisplay = computed(() => {
    const t = this.timeLeft();
    const m = Math.floor(t / 60);
    const s = t % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  });

  // Timer ring: circumference = 2 * pi * 34 ≈ 213.63
  timerDashOffset = computed(() => {
    const pct = this.timeLeft() / 300;
    return 213.63 * (1 - pct);
  });

  phoneFocused = false;
  otpFocused = false;
  identifierFocused = false;
  pwFocused = false;
  showPassword = false;

  private timer?: ReturnType<typeof setInterval>;

  phoneForm = this.fb.group({
    phone: ['', [Validators.required, Validators.pattern(/^\+?[0-9]{10,15}$/)]],
  });
  otpForm = this.fb.group({
    otp: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
  });
  // TODO(TEMP_PASSWORD_AUTH): Remove passwordForm when removing password auth
  passwordForm = this.fb.group({
    identifier: ['', [Validators.required]],
    password: ['', [Validators.required]],
  });

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private authApi: AuthApiService,
    private authState: AuthStateService,
  ) {}

  ngOnInit(): void {
    const msg = this.route.snapshot.queryParamMap.get('message');
    if (msg) this.sessionMessage.set(msg);
    const phone = this.route.snapshot.queryParamMap.get('phone');
    if (phone) this.phoneForm.patchValue({ phone });
  }

  ngOnDestroy(): void { clearInterval(this.timer); }

  switchMode(m: 'otp' | 'password'): void {
    this.mode.set(m);
    this.error.set(null);
    this.step.set('phone');
  }

  onOtpInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    // Keep only digits
    const digits = input.value.replace(/\D/g, '').slice(0, 6);
    this.otpForm.patchValue({ otp: digits });
  }

  // TODO(TEMP_PASSWORD_AUTH): Remove this method when removing password auth
  loginWithPassword(): void {
    if (this.passwordForm.invalid) return;
    this.error.set(null);
    this.loading.set(true);
    const { identifier, password } = this.passwordForm.value;

    this.authApi.login(identifier!, password!).subscribe({
      next: (tokens) => {
        this.authState.setTokens(tokens.access_token, tokens.refresh_token);
        try {
          const payload = JSON.parse(atob(tokens.access_token.split('.')[1]));
          this.authState.setUser({ id: payload.sub, name: payload.name ?? 'User', role: payload.role });
        } catch { /* ignore */ }
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
        const role = this.authState.role();
        const defaultUrl = role === 'admin' ? '/admin' : role === 'technician' ? '/dashboard' : '/profile';
        this.router.navigateByUrl(returnUrl ?? defaultUrl);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.error?.message ?? 'Invalid email or password.');
      },
    });
  }

  sendOtp(): void {
    if (this.phoneForm.invalid) return;
    this.error.set(null);
    this.loading.set(true);
    const phone = this.phoneForm.value.phone!;

    this.authApi.loginOtp(phone).subscribe({
      next: () => {
        this.loading.set(false);
        this.step.set('otp');
        this.startTimer();
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Could not send OTP. Please check your phone number.');
      },
    });
  }

  verifyOtp(): void {
    if (this.otpForm.invalid) return;
    this.error.set(null);
    this.loading.set(true);
    const phone = this.phoneForm.value.phone!;
    const otp = this.otpForm.value.otp!;

    this.authApi.verifyOtp(phone, otp).subscribe({
      next: (tokens) => {
        this.authState.setTokens(tokens.access_token, tokens.refresh_token);
        try {
          const payload = JSON.parse(atob(tokens.access_token.split('.')[1]));
          this.authState.setUser({ id: payload.sub, name: payload.name ?? 'User', role: payload.role });
        } catch { /* ignore */ }
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
        const role = this.authState.role();
        const defaultUrl = role === 'admin' ? '/admin' : role === 'technician' ? '/dashboard' : '/profile';
        this.router.navigateByUrl(returnUrl ?? defaultUrl);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.error?.message ?? 'Invalid or expired OTP.');
      },
    });
  }

  resendOtp(): void {
    this.otpForm.reset();
    this.sendOtp();
  }

  goRegister(): void {
    this.router.navigate(['/auth/register']);
  }

  private startTimer(): void {
    clearInterval(this.timer);
    this.timeLeft.set(300);
    this.timer = setInterval(() => {
      this.timeLeft.update(t => Math.max(0, t - 1));
    }, 1000);
  }
}
