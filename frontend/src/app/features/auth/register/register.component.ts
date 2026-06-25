import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AuthApiService } from '../../../core/api/services/auth-api.service';
import { AuthStateService } from '../../../core/auth/auth-state.service';

function passwordStrength(control: AbstractControl): ValidationErrors | null {
  const v: string = control.value ?? '';
  if (!v) return null;
  if (v.length < 8) return { weak: 'at least 8 characters' };
  if (!/[A-Z]/.test(v)) return { weak: 'one uppercase letter' };
  if (!/[a-z]/.test(v)) return { weak: 'one lowercase letter' };
  if (!/[0-9]/.test(v)) return { weak: 'one digit' };
  if (!/[^A-Za-z0-9]/.test(v)) return { weak: 'one special character' };
  return null;
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, MatIconModule],
  template: `
    <div class="auth-page">

      <!-- Left brand panel -->
      <div class="brand-panel" aria-hidden="true">
        <div class="brand-inner">
          <div class="brand-logo">
            <div class="logo-mark">
              <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
                <circle cx="18" cy="18" r="18" fill="rgba(255,255,255,0.15)"/>
                <path d="M13 10h10M18 10v4M11 22l3-8h8l3 8" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <circle cx="18" cy="26" r="2" fill="#F97316"/>
                <path d="M14 18h8" stroke="rgba(255,255,255,0.6)" stroke-width="1.5" stroke-linecap="round"/>
              </svg>
            </div>
            <span class="brand-name">Sri Health</span>
          </div>

          <div class="brand-headline">
            <h1>Diagnostics made<br><em>personal</em></h1>
            <p>Book tests, track results, and manage your family's health — all in one place.</p>
          </div>

          <ul class="brand-features">
            <li>
              <span class="feat-icon">
                <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clip-rule="evenodd"/></svg>
              </span>
              <span>1,200+ tests available</span>
            </li>
            <li>
              <span class="feat-icon">
                <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clip-rule="evenodd"/></svg>
              </span>
              <span>Home sample collection</span>
            </li>
            <li>
              <span class="feat-icon">
                <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clip-rule="evenodd"/></svg>
              </span>
              <span>Certified NABL laboratories</span>
            </li>
          </ul>

          <div class="brand-trust">
            <div class="trust-avatars">
              <span class="avatar">A</span>
              <span class="avatar">P</span>
              <span class="avatar">R</span>
              <span class="avatar">M</span>
            </div>
            <span class="trust-text">Join 50,000+ patients who trust Sri Health</span>
          </div>
        </div>

        <!-- decorative orbs -->
        <div class="orb orb-1" aria-hidden="true"></div>
        <div class="orb orb-2" aria-hidden="true"></div>
      </div>

      <!-- Right form panel -->
      <div class="form-panel">
        <div class="form-inner">

          <!-- Header -->
          <div class="form-header">
            <div class="mobile-logo">
              <div class="logo-mark-sm">
                <svg width="22" height="22" viewBox="0 0 36 36" fill="none">
                  <path d="M13 10h10M18 10v4M11 22l3-8h8l3 8" stroke="#6366F1" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
                  <circle cx="18" cy="26" r="2" fill="#F97316"/>
                </svg>
              </div>
              <span>Sri Health</span>
            </div>
            <div class="step-badge">New account</div>
          </div>

          <h2 class="form-title">Create your account</h2>
          <p class="form-subtitle">Get started in under a minute</p>

          @if (error()) {
            <div class="alert-error" role="alert">
              <mat-icon>error_outline</mat-icon>
              <span>{{ error() }}</span>
            </div>
          }

          <form [formGroup]="form" (ngSubmit)="submit()" novalidate>

            <!-- Name -->
            <div class="field-group">
              <label class="field-label" for="reg-name">Full Name</label>
              <div class="input-shell"
                   [class.shell-focused]="nameFocused"
                   [class.shell-error]="form.get('name')?.invalid && form.get('name')?.touched">
                <mat-icon class="field-icon">person_outline</mat-icon>
                <input
                  id="reg-name"
                  formControlName="name"
                  type="text"
                  placeholder="Priya Sharma"
                  autocomplete="name"
                  (focus)="nameFocused=true"
                  (blur)="nameFocused=false"
                />
              </div>
              @if (form.get('name')?.invalid && form.get('name')?.touched) {
                <span class="field-error">Full name is required</span>
              }
            </div>

            <!-- Phone -->
            <div class="field-group">
              <label class="field-label" for="reg-phone">Mobile Number</label>
              <div class="input-shell"
                   [class.shell-focused]="phoneFocused"
                   [class.shell-error]="form.get('phone')?.invalid && form.get('phone')?.touched">
                <div class="phone-prefix">
                  <svg width="14" height="10" viewBox="0 0 14 10" fill="none">
                    <rect width="14" height="10" rx="1.5" fill="#FF9933"/>
                    <rect y="3.33" width="14" height="3.34" fill="white"/>
                    <rect y="6.67" width="14" height="3.33" rx="0 0 1.5 1.5" fill="#138808"/>
                    <circle cx="7" cy="5" r="1.3" stroke="#000080" stroke-width="0.5" fill="none"/>
                  </svg>
                  <span>+91</span>
                </div>
                <div class="prefix-divider"></div>
                <input
                  id="reg-phone"
                  formControlName="phone"
                  type="tel"
                  placeholder="98765 43210"
                  autocomplete="tel"
                  inputmode="numeric"
                  (focus)="phoneFocused=true"
                  (blur)="phoneFocused=false"
                />
              </div>
              @if (form.get('phone')?.invalid && form.get('phone')?.touched) {
                <span class="field-error">Enter a valid 10-digit mobile number</span>
              }
            </div>

            <!-- Email -->
            <div class="field-group">
              <label class="field-label" for="reg-email">Email Address</label>
              <div class="input-shell"
                   [class.shell-focused]="emailFocused"
                   [class.shell-error]="form.get('email')?.invalid && form.get('email')?.touched">
                <mat-icon class="field-icon">mail_outline</mat-icon>
                <input
                  id="reg-email"
                  formControlName="email"
                  type="email"
                  placeholder="priya@example.com"
                  autocomplete="email"
                  (focus)="emailFocused=true"
                  (blur)="emailFocused=false"
                />
              </div>
              @if (form.get('email')?.invalid && form.get('email')?.touched) {
                <span class="field-error">Enter a valid email address</span>
              }
            </div>

            <!-- Password -->
            <div class="field-group">
              <label class="field-label" for="reg-password">Password</label>
              <div class="input-shell"
                   [class.shell-focused]="pwFocused"
                   [class.shell-error]="form.get('password')?.errors?.['weak'] && form.get('password')?.touched">
                <mat-icon class="field-icon">lock_outline</mat-icon>
                <input
                  id="reg-password"
                  formControlName="password"
                  [type]="showPassword() ? 'text' : 'password'"
                  placeholder="Min 8 chars, uppercase, number, symbol"
                  autocomplete="new-password"
                  (focus)="pwFocused=true"
                  (blur)="pwFocused=false"
                />
                <button type="button" class="eye-btn" (click)="showPassword.set(!showPassword())" tabindex="-1" [attr.aria-label]="showPassword() ? 'Hide password' : 'Show password'">
                  <mat-icon>{{ showPassword() ? 'visibility_off' : 'visibility' }}</mat-icon>
                </button>
              </div>

              <!-- Strength meter -->
              @if (pwValue()) {
                <div class="strength-meter">
                  <div class="strength-bars">
                    <div class="bar" [class.bar-filled]="pwScore() >= 1" [attr.data-strength]="pwScore()"></div>
                    <div class="bar" [class.bar-filled]="pwScore() >= 2" [attr.data-strength]="pwScore()"></div>
                    <div class="bar" [class.bar-filled]="pwScore() >= 3" [attr.data-strength]="pwScore()"></div>
                  </div>
                  <span class="strength-label" [attr.data-strength]="pwScore()">
                    {{ pwScore() === 1 ? 'Weak' : pwScore() === 2 ? 'Fair' : 'Strong' }}
                  </span>
                </div>
              }

              @if (form.get('password')?.errors?.['weak'] && form.get('password')?.touched) {
                <span class="field-error">Password needs {{ form.get('password')?.errors?.['weak'] }}</span>
              }
            </div>

            <!-- Terms -->
            <label class="terms-row">
              <div class="custom-checkbox" [class.checked]="termsAccepted">
                <input type="checkbox" [checked]="termsAccepted" (change)="termsAccepted = $any($event.target).checked" aria-label="Agree to terms"/>
                @if (termsAccepted) {
                  <mat-icon>check</mat-icon>
                }
              </div>
              <span class="terms-text">
                I agree to the <a href="#" class="terms-link" (click)="$event.preventDefault()">Terms of Service</a>
                and <a href="#" class="terms-link" (click)="$event.preventDefault()">Privacy Policy</a>
              </span>
            </label>

            <!-- Submit -->
            <button
              class="submit-btn"
              type="submit"
              [disabled]="form.invalid || loading() || !termsAccepted">
              @if (loading()) {
                <span class="spinner"></span>
                <span>Creating account&hellip;</span>
              } @else {
                <span>Create Account</span>
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                  <path d="M4 10h12M11 5l5 5-5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              }
            </button>

          </form>

          <p class="sign-in-prompt">
            Already have an account?
            <a routerLink="/auth/login" class="sign-in-link">Sign in</a>
          </p>

        </div>
      </div>

    </div>
  `,
  styles: [`
    /* ─── Reset / base ─────────────────────────────────────────── */
    * { box-sizing: border-box; }

    /* ─── Page layout ───────────────────────────────────────────── */
    .auth-page {
      min-height: 100vh;
      display: grid;
      grid-template-columns: 1fr 1fr;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #F8F9FF;
    }

    /* ─── Brand panel (left) ────────────────────────────────────── */
    .brand-panel {
      position: relative;
      background: linear-gradient(145deg, #6366F1 0%, #4F46E5 45%, #3730A3 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      padding: 3rem 2.5rem;
    }

    .brand-inner {
      position: relative;
      z-index: 1;
      display: flex;
      flex-direction: column;
      gap: 2.5rem;
      max-width: 380px;
      width: 100%;
    }

    .brand-logo {
      display: flex;
      align-items: center;
      gap: .75rem;
    }

    .logo-mark {
      width: 52px;
      height: 52px;
      background: rgba(255,255,255,0.12);
      border-radius: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1px solid rgba(255,255,255,0.2);
    }

    .brand-name {
      font-size: 1.4rem;
      font-weight: 800;
      color: #fff;
      letter-spacing: -0.02em;
    }

    .brand-headline h1 {
      font-size: clamp(2rem, 3vw, 2.75rem);
      font-weight: 800;
      color: #fff;
      line-height: 1.15;
      letter-spacing: -0.03em;
      text-wrap: balance;
      margin: 0 0 1rem;
    }

    .brand-headline h1 em {
      font-style: normal;
      color: #FBD38D;
    }

    .brand-headline p {
      font-size: 1rem;
      color: rgba(255,255,255,0.75);
      line-height: 1.65;
      margin: 0;
    }

    .brand-features {
      list-style: none;
      padding: 0;
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: .875rem;
    }

    .brand-features li {
      display: flex;
      align-items: center;
      gap: .75rem;
      font-size: .95rem;
      color: rgba(255,255,255,0.9);
    }

    .feat-icon {
      width: 28px;
      height: 28px;
      background: rgba(249, 115, 22, 0.25);
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #FBD38D;
      flex-shrink: 0;
    }

    .brand-trust {
      display: flex;
      align-items: center;
      gap: .875rem;
      padding-top: 1rem;
      border-top: 1px solid rgba(255,255,255,0.15);
    }

    .trust-avatars {
      display: flex;
    }

    .avatar {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: linear-gradient(135deg, #F97316, #EA580C);
      color: #fff;
      font-size: .7rem;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2px solid rgba(99,102,241,0.8);
      margin-left: -6px;
    }

    .avatar:first-child { margin-left: 0; }

    .trust-text {
      font-size: .8rem;
      color: rgba(255,255,255,0.7);
      line-height: 1.4;
    }

    /* decorative orbs */
    .orb {
      position: absolute;
      border-radius: 50%;
      pointer-events: none;
    }

    .orb-1 {
      width: 320px;
      height: 320px;
      top: -80px;
      right: -80px;
      background: radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%);
    }

    .orb-2 {
      width: 240px;
      height: 240px;
      bottom: -60px;
      left: -60px;
      background: radial-gradient(circle, rgba(249,115,22,0.15) 0%, transparent 70%);
    }

    /* ─── Form panel (right) ────────────────────────────────────── */
    .form-panel {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2.5rem 2rem;
      overflow-y: auto;
    }

    .form-inner {
      width: 100%;
      max-width: 420px;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    /* ─── Form header ───────────────────────────────────────────── */
    .form-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: .25rem;
    }

    .mobile-logo {
      display: none;
      align-items: center;
      gap: .5rem;
      font-size: .95rem;
      font-weight: 800;
      color: #0F172A;
    }

    .logo-mark-sm {
      width: 34px;
      height: 34px;
      background: #EEF2FF;
      border-radius: 9px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .step-badge {
      font-size: .72rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: .08em;
      color: #6366F1;
      background: #EEF2FF;
      border: 1px solid #C7D2FE;
      border-radius: 999px;
      padding: .25rem .75rem;
    }

    .form-title {
      font-size: 1.75rem;
      font-weight: 800;
      color: #0F172A;
      letter-spacing: -0.03em;
      margin: 0;
      text-wrap: balance;
    }

    .form-subtitle {
      font-size: .9rem;
      color: #475569;
      margin: -.5rem 0 0;
    }

    /* ─── Alert ─────────────────────────────────────────────────── */
    .alert-error {
      display: flex;
      align-items: center;
      gap: .625rem;
      background: #FEF2F2;
      border: 1px solid #FECACA;
      color: #DC2626;
      border-radius: 12px;
      padding: .75rem 1rem;
      font-size: .875rem;
    }

    .alert-error mat-icon {
      font-size: 1.1rem;
      width: 1.1rem;
      height: 1.1rem;
      flex-shrink: 0;
    }

    /* ─── Form fields ───────────────────────────────────────────── */
    form {
      display: flex;
      flex-direction: column;
      gap: 1.125rem;
    }

    .field-group {
      display: flex;
      flex-direction: column;
      gap: .35rem;
    }

    .field-label {
      font-size: .8rem;
      font-weight: 600;
      color: #475569;
      letter-spacing: .01em;
    }

    .input-shell {
      display: flex;
      align-items: center;
      gap: .625rem;
      background: #fff;
      border: 1.5px solid #E2E8F0;
      border-radius: 12px;
      padding: .7rem 1rem;
      transition: border-color .15s, box-shadow .15s;
    }

    .input-shell.shell-focused {
      border-color: #6366F1;
      box-shadow: 0 0 0 3px rgba(99,102,241,0.12);
    }

    .input-shell.shell-error {
      border-color: #EF4444;
    }

    .field-icon {
      color: #94A3B8;
      font-size: 1.15rem;
      width: 1.15rem;
      height: 1.15rem;
      flex-shrink: 0;
    }

    .input-shell input {
      flex: 1;
      border: none;
      outline: none;
      font-size: .9375rem;
      color: #0F172A;
      background: transparent;
      font-family: inherit;
    }

    .input-shell input::placeholder {
      color: #CBD5E1;
    }

    /* ─── Phone prefix ──────────────────────────────────────────── */
    .phone-prefix {
      display: flex;
      align-items: center;
      gap: .4rem;
      flex-shrink: 0;
    }

    .phone-prefix span {
      font-size: .9375rem;
      font-weight: 600;
      color: #475569;
    }

    .prefix-divider {
      width: 1px;
      height: 18px;
      background: #E2E8F0;
      flex-shrink: 0;
    }

    /* ─── Eye button ────────────────────────────────────────────── */
    .eye-btn {
      background: none;
      border: none;
      cursor: pointer;
      padding: 0;
      color: #94A3B8;
      display: flex;
      align-items: center;
      flex-shrink: 0;
      transition: color .15s;
    }

    .eye-btn mat-icon {
      font-size: 1.15rem;
      width: 1.15rem;
      height: 1.15rem;
    }

    .eye-btn:hover { color: #475569; }

    /* ─── Password strength ─────────────────────────────────────── */
    .strength-meter {
      display: flex;
      align-items: center;
      gap: .625rem;
      margin-top: .25rem;
    }

    .strength-bars {
      display: flex;
      gap: .3rem;
      flex: 1;
    }

    .bar {
      height: 4px;
      flex: 1;
      border-radius: 999px;
      background: #E2E8F0;
      transition: background .25s;
    }

    .bar.bar-filled[data-strength="1"] { background: #EF4444; }
    .bar.bar-filled[data-strength="2"] { background: #F59E0B; }
    .bar.bar-filled[data-strength="3"] { background: #22C55E; }

    .strength-label {
      font-size: .72rem;
      font-weight: 700;
      width: 3.5rem;
      text-align: right;
      flex-shrink: 0;
    }

    .strength-label[data-strength="1"] { color: #EF4444; }
    .strength-label[data-strength="2"] { color: #F59E0B; }
    .strength-label[data-strength="3"] { color: #22C55E; }

    /* ─── Field error ───────────────────────────────────────────── */
    .field-error {
      font-size: .76rem;
      color: #EF4444;
      font-weight: 500;
    }

    /* ─── Terms row ─────────────────────────────────────────────── */
    .terms-row {
      display: flex;
      align-items: flex-start;
      gap: .75rem;
      cursor: pointer;
      user-select: none;
    }

    .custom-checkbox {
      width: 18px;
      height: 18px;
      border-radius: 5px;
      border: 1.5px solid #CBD5E1;
      background: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      margin-top: 1px;
      transition: border-color .15s, background .15s;
    }

    .custom-checkbox input {
      position: absolute;
      opacity: 0;
      pointer-events: none;
      width: 0;
      height: 0;
    }

    .custom-checkbox.checked {
      background: #6366F1;
      border-color: #6366F1;
    }

    .custom-checkbox mat-icon {
      font-size: .85rem;
      width: .85rem;
      height: .85rem;
      color: #fff;
      line-height: 1;
    }

    .terms-text {
      font-size: .84rem;
      color: #475569;
      line-height: 1.55;
    }

    .terms-link {
      color: #6366F1;
      font-weight: 600;
      text-decoration: none;
    }

    .terms-link:hover { text-decoration: underline; }

    /* ─── Submit button ─────────────────────────────────────────── */
    .submit-btn {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: .625rem;
      background: linear-gradient(135deg, #6366F1 0%, #4F46E5 100%);
      color: #fff;
      border: none;
      border-radius: 12px;
      padding: .9rem 1.5rem;
      font-size: 1rem;
      font-weight: 700;
      cursor: pointer;
      transition: opacity .15s, transform .15s, box-shadow .15s;
      box-shadow: 0 4px 14px rgba(99,102,241,0.35);
      font-family: inherit;
      margin-top: .25rem;
    }

    .submit-btn:hover:not(:disabled) {
      opacity: .93;
      transform: translateY(-1px);
      box-shadow: 0 6px 20px rgba(99,102,241,0.4);
    }

    .submit-btn:active:not(:disabled) {
      transform: translateY(0);
    }

    .submit-btn:disabled {
      opacity: .45;
      cursor: not-allowed;
      box-shadow: none;
    }

    /* ─── Spinner ───────────────────────────────────────────────── */
    .spinner {
      width: 18px;
      height: 18px;
      border: 2px solid rgba(255,255,255,0.35);
      border-top-color: #fff;
      border-radius: 50%;
      animation: spin .7s linear infinite;
      flex-shrink: 0;
    }

    @keyframes spin { to { transform: rotate(360deg); } }

    /* ─── Sign-in footer ────────────────────────────────────────── */
    .sign-in-prompt {
      text-align: center;
      font-size: .875rem;
      color: #94A3B8;
      margin: 0;
    }

    .sign-in-link {
      color: #6366F1;
      font-weight: 700;
      text-decoration: none;
      margin-left: .25rem;
    }

    .sign-in-link:hover { text-decoration: underline; }

    /* ─── Responsive ────────────────────────────────────────────── */
    @media (max-width: 768px) {
      .auth-page {
        grid-template-columns: 1fr;
      }

      .brand-panel {
        display: none;
      }

      .form-panel {
        padding: 2rem 1.25rem;
        align-items: flex-start;
        padding-top: 3rem;
      }

      .mobile-logo {
        display: flex;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .submit-btn,
      .input-shell,
      .custom-checkbox,
      .bar,
      .spinner {
        transition: none;
        animation: none;
      }
    }
  `],
})
export class RegisterComponent {
  form = this.fb.group({
    name: ['', Validators.required],
    phone: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, passwordStrength]],
  });
  loading = signal(false);
  error = signal<string | null>(null);
  showPassword = signal(false);

  termsAccepted = false;

  nameFocused = false;
  phoneFocused = false;
  emailFocused = false;
  pwFocused = false;

  /** Raw password value for the strength meter */
  pwValue = computed(() => (this.form.get('password')?.value ?? '') as string);

  /** 0 = empty, 1 = weak, 2 = fair, 3 = strong */
  pwScore = computed(() => {
    const v = this.pwValue();
    if (!v) return 0;
    let score = 0;
    if (v.length >= 8) score++;
    if (/[A-Z]/.test(v) && /[a-z]/.test(v)) score++;
    if (/[0-9]/.test(v) && /[^A-Za-z0-9]/.test(v)) score++;
    return Math.max(1, score) as 1 | 2 | 3;
  });

  constructor(
    private fb: FormBuilder,
    private authApi: AuthApiService,
    private authState: AuthStateService,
    private router: Router,
  ) {}

  submit(): void {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.error.set(null);
    const { name, phone, email, password } = this.form.value;
    this.authApi.register(name!, phone!, email!, password!).subscribe({
      next: (tokens) => {
        this.loading.set(false);
        this.authState.setTokens(tokens.access_token, tokens.refresh_token);
        try {
          const payload = JSON.parse(atob(tokens.access_token.split('.')[1]));
          this.authState.setUser({ id: payload.sub, name: payload.name ?? name!, role: payload.role });
        } catch {}
        const role = this.authState.role();
        const defaultUrl = role === 'admin' ? '/admin' : role === 'technician' ? '/dashboard' : '/profile';
        this.router.navigateByUrl(defaultUrl);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.error?.message ?? 'Registration failed. Please try again.');
      },
    });
  }
}
