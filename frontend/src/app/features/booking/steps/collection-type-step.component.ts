import { Component, inject, OnInit, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { LabBranchApiService } from '../../../core/api/services/lab-branch-api.service';
import { UserApiService } from '../../../core/api/services/user-api.service';
import { BookingWizardStore } from '../../../core/store/booking-wizard.store';
import { LabBranch, UserAddress, UserAddressListResponse } from '../../../core/api/api.types';

@Component({
  selector: 'app-collection-type-step',
  standalone: true,
  imports: [CommonModule, MatIconModule, FormsModule],
  template: `
    <div class="step-wrap">

      <!-- Header -->
      <div class="step-header">
        <div class="step-eyebrow">Sample Collection</div>
        <h2>How would you like to get tested?</h2>
        <p>Choose a collection method that works best for you</p>
      </div>

      <!-- Collection Type Cards -->
      <div class="collection-cards">

        <!-- Home Collection Card -->
        <label class="collection-card" [class.selected]="collectionType === 'home'">
          <input type="radio" name="collection" value="home" [(ngModel)]="collectionType"
            (ngModelChange)="onCollectionTypeChange($event)" />

          <div class="card-selected-badge" [class.visible]="collectionType === 'home'">
            <mat-icon>check</mat-icon>
          </div>

          <div class="card-illustration home-illustration">
            <div class="illus-ring illus-ring-1"></div>
            <div class="illus-ring illus-ring-2"></div>
            <div class="illus-icon-wrap home-icon-bg">
              <mat-icon class="illus-icon">home</mat-icon>
            </div>
          </div>

          <div class="card-content">
            <div class="card-title">Home Collection</div>
            <div class="card-subtitle">Technician visits your doorstep</div>
            <ul class="card-features">
              <li>
                <span class="feat-dot home-dot"></span>
                Trained phlebotomist comes to you
              </li>
              <li>
                <span class="feat-dot home-dot"></span>
                Same-day processing guaranteed
              </li>
              <li>
                <span class="feat-dot home-dot"></span>
                No travel, no waiting
              </li>
            </ul>
          </div>

          <div class="card-arrow">
            <mat-icon>arrow_forward</mat-icon>
          </div>
        </label>

        <!-- Visit Lab Card -->
        <label class="collection-card" [class.selected]="collectionType === 'lab'">
          <input type="radio" name="collection" value="lab" [(ngModel)]="collectionType"
            (ngModelChange)="onCollectionTypeChange($event)" />

          <div class="card-selected-badge" [class.visible]="collectionType === 'lab'">
            <mat-icon>check</mat-icon>
          </div>

          <div class="card-illustration lab-illustration">
            <div class="illus-ring illus-ring-1 orange-ring"></div>
            <div class="illus-ring illus-ring-2 orange-ring"></div>
            <div class="illus-icon-wrap lab-icon-bg">
              <mat-icon class="illus-icon">science</mat-icon>
            </div>
          </div>

          <div class="card-content">
            <div class="card-title">Visit Lab</div>
            <div class="card-subtitle">Walk in to a collection centre</div>
            <ul class="card-features">
              <li>
                <span class="feat-dot lab-dot"></span>
                Multiple branches near you
              </li>
              <li>
                <span class="feat-dot lab-dot"></span>
                Immediate sample processing
              </li>
              <li>
                <span class="feat-dot lab-dot"></span>
                NABL accredited facility
              </li>
            </ul>
          </div>

          <div class="card-arrow">
            <mat-icon>arrow_forward</mat-icon>
          </div>
        </label>

      </div>

      <!-- Home Collection: Address Section -->
      @if (collectionType === 'home') {
        <div class="detail-panel home-panel">
          <div class="panel-header">
            <div class="panel-icon-wrap home-panel-icon">
              <mat-icon>location_on</mat-icon>
            </div>
            <div>
              <div class="panel-title">Collection Address</div>
              <div class="panel-subtitle">Where should the technician come?</div>
            </div>
          </div>

          @if (loadingAddresses()) {
            <div class="skeleton-list">
              <div class="skeleton-item"></div>
              <div class="skeleton-item short"></div>
            </div>
          } @else if (savedAddresses().length > 0 && !useManualEntry()) {
            <!-- Saved Addresses -->
            <div class="saved-addresses">
              <div class="addresses-grid">
                @for (addr of savedAddresses(); track addr.id) {
                  <label class="address-card" [class.selected]="selectedAddressId === addr.id">
                    <input type="radio" name="savedAddress" [value]="addr.id" [(ngModel)]="selectedAddressId"
                      (ngModelChange)="onAddressSelect($event)" />
                    <div class="address-card-top">
                      <div class="addr-label-row">
                        <span class="addr-label-text">{{ addr.label }}</span>
                        @if (addr.is_default) {
                          <span class="default-pill">Default</span>
                        }
                      </div>
                      <div class="addr-check-mark" [class.visible]="selectedAddressId === addr.id">
                        <mat-icon>check_circle</mat-icon>
                      </div>
                    </div>
                    <div class="addr-body">
                      <mat-icon class="addr-pin-icon">place</mat-icon>
                      <div class="addr-text">
                        <div class="addr-line1">{{ addr.address_line1 }}{{ addr.address_line2 ? ', ' + addr.address_line2 : '' }}</div>
                        <div class="addr-line2">{{ addr.city }}, {{ addr.state }} – {{ addr.pincode }}</div>
                      </div>
                    </div>
                  </label>
                }
              </div>

              <button class="btn-different-addr" (click)="useManualEntry.set(true)">
                <mat-icon>add_location_alt</mat-icon>
                <span>Use a different address</span>
              </button>
            </div>

          } @else {
            <!-- Manual Pincode Entry -->
            <div class="pincode-section">
              @if (savedAddresses().length > 0) {
                <button class="btn-back-saved" (click)="switchToSaved()">
                  <mat-icon>arrow_back</mat-icon>
                  <span>Back to saved addresses</span>
                </button>
              }

              <div class="pincode-field-group">
                <label class="field-label">Enter your pincode</label>
                <div class="field-hint">We'll verify home collection is available in your area</div>

                <div class="pincode-row">
                  <div class="pincode-input-wrap"
                    [class.state-valid]="pincodeValid()"
                    [class.state-invalid]="!!pincodeError()">
                    <mat-icon class="pin-icon">pin_drop</mat-icon>
                    <input
                      [(ngModel)]="pincode"
                      maxlength="6"
                      placeholder="e.g. 600001"
                      inputmode="numeric"
                      class="pincode-input" />
                    @if (pincodeValid()) {
                      <div class="pincode-valid-tick">
                        <mat-icon>check_circle</mat-icon>
                      </div>
                    }
                  </div>
                  <button
                    class="btn-check-pin"
                    [disabled]="pincode.length !== 6 || checking()"
                    (click)="validatePincode()">
                    @if (checking()) {
                      <span class="spinner"></span>
                    } @else {
                      <span>Check</span>
                      <mat-icon>east</mat-icon>
                    }
                  </button>
                </div>

                @if (pincodeError()) {
                  <div class="field-feedback error-feedback">
                    <mat-icon>error_outline</mat-icon>
                    <span>{{ pincodeError() }}</span>
                  </div>
                }
                @if (pincodeValid()) {
                  <div class="field-feedback success-feedback">
                    <mat-icon>verified</mat-icon>
                    <span>Home collection available at this pincode</span>
                  </div>
                }
              </div>
            </div>
          }
        </div>
      }

      <!-- Lab Visit: Branch Selection -->
      @if (collectionType === 'lab') {
        <div class="detail-panel lab-panel">
          <div class="panel-header">
            <div class="panel-icon-wrap lab-panel-icon">
              <mat-icon>corporate_fare</mat-icon>
            </div>
            <div>
              <div class="panel-title">Choose a Branch</div>
              <div class="panel-subtitle">Select the centre closest to you</div>
            </div>
          </div>

          @if (loadingBranches()) {
            <div class="branch-skeletons">
              @for (i of [1,2,3]; track i) {
                <div class="skeleton-branch"></div>
              }
            </div>
          } @else if (branches().length === 0) {
            <div class="empty-state">
              <mat-icon class="empty-icon">location_off</mat-icon>
              <div class="empty-title">No branches available</div>
              <div class="empty-desc">Please contact us to find a centre near you</div>
            </div>
          } @else {
            <div class="branches-grid">
              @for (branch of branches(); track branch.id) {
                <label class="branch-card" [class.selected]="selectedBranchId === branch.id">
                  <input type="radio" name="branch" [value]="branch.id" [(ngModel)]="selectedBranchId" />

                  <div class="branch-card-inner">
                    <div class="branch-map-icon">
                      <mat-icon>location_on</mat-icon>
                    </div>
                    <div class="branch-details">
                      <div class="branch-name">{{ branch.name }}</div>
                      <div class="branch-addr">{{ branch.address }}</div>
                      @if (branch.phone) {
                        <div class="branch-phone">
                          <mat-icon>call</mat-icon>
                          <span>{{ branch.phone }}</span>
                        </div>
                      }
                    </div>
                    <div class="branch-check" [class.visible]="selectedBranchId === branch.id">
                      <mat-icon>check_circle</mat-icon>
                    </div>
                  </div>
                </label>
              }
            </div>
          }
        </div>
      }

      <!-- Actions -->
      <div class="step-actions">
        <button class="btn-back" (click)="back.emit()">
          <mat-icon>arrow_back</mat-icon>
          <span>Back</span>
        </button>
        <button class="btn-continue" [disabled]="!canProceed()" (click)="onNext()">
          <span>Continue</span>
          <mat-icon>arrow_forward</mat-icon>
        </button>
      </div>

    </div>
  `,
  styles: [`
    /* ─── Tokens ──────────────────────────────────────────── */
    :host {
      --indigo:        #6366F1;
      --indigo-dark:   #4F46E5;
      --indigo-light:  #EEF2FF;
      --indigo-mid:    #C7D2FE;
      --orange:        #F97316;
      --orange-dark:   #EA580C;
      --orange-light:  #FFF7ED;
      --orange-mid:    #FED7AA;
      --green:         #22C55E;
      --green-light:   #F0FDF4;
      --red:           #EF4444;
      --red-light:     #FEF2F2;
      --bg:            #F8F9FF;
      --surface:       #FFFFFF;
      --text:          #0F172A;
      --text-sec:      #475569;
      --muted:         #94A3B8;
      --border:        #E2E8F0;
      --border-focus:  #C7D2FE;
      --radius:        12px;
      --radius-lg:     16px;
      --radius-xl:     20px;
      --radius-pill:   999px;
      --shadow-sm:     0 1px 3px rgba(99,102,241,.06), 0 1px 2px rgba(0,0,0,.04);
      --shadow-md:     0 4px 12px rgba(99,102,241,.10), 0 2px 4px rgba(0,0,0,.04);
      --shadow-lg:     0 8px 24px rgba(99,102,241,.14), 0 4px 8px rgba(0,0,0,.06);
      --shadow-indigo: 0 8px 24px rgba(99,102,241,.30);
      --shadow-orange: 0 8px 24px rgba(249,115,22,.25);
    }

    /* ─── Layout ──────────────────────────────────────────── */
    .step-wrap {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      font-family: Inter, system-ui, sans-serif;
    }

    /* ─── Header ──────────────────────────────────────────── */
    .step-header { display: flex; flex-direction: column; gap: .25rem; }

    .step-eyebrow {
      font-size: .7rem;
      font-weight: 700;
      letter-spacing: .1em;
      text-transform: uppercase;
      color: var(--indigo);
    }

    .step-header h2 {
      font-size: 1.3rem;
      font-weight: 800;
      color: var(--text);
      line-height: 1.3;
      text-wrap: balance;
      margin: 0;
    }

    .step-header p {
      font-size: .875rem;
      color: var(--text-sec);
      margin: 0;
    }

    /* ─── Collection Type Cards ───────────────────────────── */
    .collection-cards {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: .875rem;
    }

    .collection-card {
      position: relative;
      display: flex;
      flex-direction: column;
      gap: .75rem;
      padding: 1.25rem;
      border-radius: var(--radius-lg);
      border: 2px solid var(--border);
      background: var(--surface);
      cursor: pointer;
      transition: border-color .18s, box-shadow .18s, transform .15s;
      overflow: hidden;
    }

    .collection-card input[type=radio] { display: none; }

    .collection-card:hover {
      border-color: var(--indigo-mid);
      box-shadow: var(--shadow-md);
      transform: translateY(-1px);
    }

    .collection-card.selected {
      border-color: var(--indigo);
      box-shadow: var(--shadow-indigo);
      background: linear-gradient(145deg, #fff 0%, var(--indigo-light) 100%);
    }

    /* Selected badge (checkmark in corner) */
    .card-selected-badge {
      position: absolute;
      top: .7rem;
      right: .7rem;
      width: 22px;
      height: 22px;
      border-radius: 50%;
      background: var(--indigo);
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transform: scale(.7);
      transition: opacity .18s, transform .18s;
    }

    .card-selected-badge.visible {
      opacity: 1;
      transform: scale(1);
    }

    .card-selected-badge mat-icon {
      font-size: .85rem;
      width: .85rem;
      height: .85rem;
      color: #fff;
    }

    /* Illustration area */
    .card-illustration {
      position: relative;
      width: 52px;
      height: 52px;
    }

    .illus-ring {
      position: absolute;
      border-radius: 50%;
      border: 1.5px solid;
      opacity: .35;
    }

    .illus-ring-1 {
      inset: 0;
      border-color: var(--indigo);
    }

    .illus-ring-2 {
      inset: 5px;
      border-color: var(--indigo);
      opacity: .2;
    }

    .illus-ring.orange-ring { border-color: var(--orange); }

    .illus-icon-wrap {
      position: absolute;
      inset: 7px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .home-icon-bg { background: var(--indigo-light); }
    .lab-icon-bg  { background: var(--orange-light); }

    .illus-icon {
      font-size: 1.15rem;
      width: 1.15rem;
      height: 1.15rem;
    }

    .home-illustration .illus-icon { color: var(--indigo); }
    .lab-illustration  .illus-icon { color: var(--orange); }

    /* Card content */
    .card-content { display: flex; flex-direction: column; gap: .2rem; flex: 1; }

    .card-title {
      font-size: .95rem;
      font-weight: 800;
      color: var(--text);
      line-height: 1.2;
    }

    .card-subtitle {
      font-size: .75rem;
      color: var(--text-sec);
      margin-bottom: .3rem;
    }

    .card-features {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: .28rem;
    }

    .card-features li {
      display: flex;
      align-items: center;
      gap: .4rem;
      font-size: .72rem;
      color: var(--text-sec);
      line-height: 1.4;
    }

    .feat-dot {
      width: 5px;
      height: 5px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .home-dot { background: var(--indigo); }
    .lab-dot  { background: var(--orange); }

    /* Arrow at bottom right */
    .card-arrow {
      display: flex;
      justify-content: flex-end;
      margin-top: .25rem;
    }

    .card-arrow mat-icon {
      font-size: 1rem;
      width: 1rem;
      height: 1rem;
      color: var(--muted);
      transition: color .15s, transform .15s;
    }

    .collection-card:hover .card-arrow mat-icon,
    .collection-card.selected .card-arrow mat-icon {
      color: var(--indigo);
      transform: translateX(2px);
    }

    /* ─── Detail Panels ───────────────────────────────────── */
    .detail-panel {
      border-radius: var(--radius-lg);
      border: 1.5px solid var(--border);
      background: var(--surface);
      overflow: hidden;
      box-shadow: var(--shadow-sm);
      animation: panelEnter .2s ease both;
    }

    @keyframes panelEnter {
      from { opacity: 0; transform: translateY(6px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    .panel-header {
      display: flex;
      align-items: center;
      gap: .875rem;
      padding: 1rem 1.25rem;
      border-bottom: 1.5px solid var(--border);
      background: var(--bg);
    }

    .panel-icon-wrap {
      width: 38px;
      height: 38px;
      border-radius: var(--radius);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .home-panel-icon {
      background: var(--indigo-light);
    }

    .home-panel-icon mat-icon { color: var(--indigo); font-size: 1.15rem; width: 1.15rem; height: 1.15rem; }

    .lab-panel-icon {
      background: var(--orange-light);
    }

    .lab-panel-icon mat-icon { color: var(--orange); font-size: 1.15rem; width: 1.15rem; height: 1.15rem; }

    .panel-title {
      font-size: .9rem;
      font-weight: 700;
      color: var(--text);
    }

    .panel-subtitle {
      font-size: .775rem;
      color: var(--text-sec);
    }

    /* ─── Saved Addresses ─────────────────────────────────── */
    .saved-addresses {
      padding: 1rem 1.25rem;
      display: flex;
      flex-direction: column;
      gap: .875rem;
    }

    .addresses-grid {
      display: flex;
      flex-direction: column;
      gap: .625rem;
    }

    .address-card {
      display: flex;
      flex-direction: column;
      gap: .5rem;
      padding: .875rem 1rem;
      border-radius: var(--radius);
      border: 1.5px solid var(--border);
      background: var(--surface);
      cursor: pointer;
      transition: border-color .15s, background .15s, box-shadow .15s;
    }

    .address-card input[type=radio] { display: none; }

    .address-card:hover {
      border-color: var(--indigo-mid);
      box-shadow: var(--shadow-sm);
    }

    .address-card.selected {
      border-color: var(--indigo);
      background: var(--indigo-light);
      box-shadow: 0 0 0 3px rgba(99,102,241,.1);
    }

    .address-card-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .addr-label-row {
      display: flex;
      align-items: center;
      gap: .4rem;
    }

    .addr-label-text {
      font-size: .825rem;
      font-weight: 700;
      color: var(--text);
    }

    .default-pill {
      font-size: .62rem;
      font-weight: 700;
      letter-spacing: .05em;
      text-transform: uppercase;
      background: var(--indigo);
      color: #fff;
      padding: .1rem .45rem;
      border-radius: var(--radius-pill);
    }

    .addr-check-mark {
      color: var(--indigo);
      opacity: 0;
      transform: scale(.8);
      transition: opacity .15s, transform .15s;
    }

    .addr-check-mark.visible { opacity: 1; transform: scale(1); }

    .addr-check-mark mat-icon { font-size: 1.05rem; width: 1.05rem; height: 1.05rem; }

    .addr-body {
      display: flex;
      align-items: flex-start;
      gap: .4rem;
    }

    .addr-pin-icon {
      font-size: .9rem;
      width: .9rem;
      height: .9rem;
      color: var(--muted);
      margin-top: 1px;
    }

    .addr-text { display: flex; flex-direction: column; gap: .1rem; }

    .addr-line1 {
      font-size: .8rem;
      color: var(--text-sec);
    }

    .addr-line2 {
      font-size: .75rem;
      color: var(--muted);
    }

    /* Use different address button */
    .btn-different-addr {
      display: flex;
      align-items: center;
      gap: .45rem;
      background: none;
      border: 1.5px dashed var(--border);
      border-radius: var(--radius);
      padding: .65rem 1rem;
      font-size: .825rem;
      font-weight: 600;
      color: var(--text-sec);
      cursor: pointer;
      transition: border-color .15s, color .15s;
      width: 100%;
      justify-content: center;
    }

    .btn-different-addr mat-icon { font-size: .95rem; width: .95rem; height: .95rem; }

    .btn-different-addr:hover {
      border-color: var(--indigo);
      color: var(--indigo);
    }

    /* ─── Pincode Section ─────────────────────────────────── */
    .pincode-section {
      padding: 1rem 1.25rem;
      display: flex;
      flex-direction: column;
      gap: .875rem;
    }

    .btn-back-saved {
      display: inline-flex;
      align-items: center;
      gap: .3rem;
      background: none;
      border: none;
      color: var(--indigo);
      font-size: .825rem;
      font-weight: 600;
      cursor: pointer;
      padding: 0;
      transition: opacity .15s;
    }

    .btn-back-saved mat-icon { font-size: .9rem; width: .9rem; height: .9rem; }
    .btn-back-saved:hover { opacity: .75; }

    .pincode-field-group { display: flex; flex-direction: column; gap: .4rem; }

    .field-label {
      font-size: .825rem;
      font-weight: 700;
      color: var(--text);
    }

    .field-hint {
      font-size: .75rem;
      color: var(--muted);
      margin-top: -.15rem;
    }

    .pincode-row {
      display: flex;
      gap: .625rem;
      margin-top: .25rem;
    }

    .pincode-input-wrap {
      flex: 1;
      display: flex;
      align-items: center;
      gap: .5rem;
      background: var(--bg);
      border: 1.5px solid var(--border);
      border-radius: var(--radius);
      padding: .625rem .875rem;
      transition: border-color .15s, box-shadow .15s;
    }

    .pincode-input-wrap:focus-within {
      border-color: var(--indigo);
      box-shadow: 0 0 0 3px rgba(99,102,241,.12);
      background: var(--surface);
    }

    .pincode-input-wrap.state-valid {
      border-color: var(--green);
      background: var(--green-light);
    }

    .pincode-input-wrap.state-invalid {
      border-color: var(--red);
      background: var(--red-light);
    }

    .pin-icon {
      font-size: 1.05rem;
      width: 1.05rem;
      height: 1.05rem;
      color: var(--muted);
      flex-shrink: 0;
    }

    .pincode-input {
      flex: 1;
      border: none;
      outline: none;
      font-size: .9rem;
      font-weight: 500;
      color: var(--text);
      background: transparent;
      font-family: Inter, system-ui, sans-serif;
      letter-spacing: .05em;
      font-variant-numeric: tabular-nums;
    }

    .pincode-input::placeholder { color: var(--muted); letter-spacing: 0; }

    .pincode-valid-tick {
      color: var(--green);
      display: flex;
      align-items: center;
    }

    .pincode-valid-tick mat-icon { font-size: 1.05rem; width: 1.05rem; height: 1.05rem; }

    .btn-check-pin {
      display: inline-flex;
      align-items: center;
      gap: .3rem;
      background: var(--indigo);
      color: #fff;
      border: none;
      border-radius: var(--radius);
      padding: .625rem 1.1rem;
      font-size: .825rem;
      font-weight: 700;
      cursor: pointer;
      white-space: nowrap;
      transition: background .15s, box-shadow .15s, transform .1s;
      font-family: Inter, system-ui, sans-serif;
    }

    .btn-check-pin mat-icon { font-size: .9rem; width: .9rem; height: .9rem; }

    .btn-check-pin:hover:not(:disabled) {
      background: var(--indigo-dark);
      box-shadow: var(--shadow-indigo);
      transform: translateY(-1px);
    }

    .btn-check-pin:disabled { opacity: .45; cursor: not-allowed; }

    /* Feedback messages */
    .field-feedback {
      display: flex;
      align-items: center;
      gap: .4rem;
      font-size: .775rem;
      font-weight: 600;
      border-radius: 8px;
      padding: .45rem .625rem;
    }

    .field-feedback mat-icon { font-size: .9rem; width: .9rem; height: .9rem; }

    .success-feedback {
      color: #16a34a;
      background: var(--green-light);
    }

    .error-feedback {
      color: #dc2626;
      background: var(--red-light);
    }

    /* ─── Branches Grid ───────────────────────────────────── */
    .branches-grid {
      display: flex;
      flex-direction: column;
      gap: .5rem;
      padding: 1rem 1.25rem;
      max-height: 260px;
      overflow-y: auto;
    }

    .branches-grid::-webkit-scrollbar { width: 4px; }
    .branches-grid::-webkit-scrollbar-track { background: transparent; }
    .branches-grid::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }

    .branch-card {
      display: block;
      border-radius: var(--radius);
      border: 1.5px solid var(--border);
      background: var(--surface);
      cursor: pointer;
      transition: border-color .15s, box-shadow .15s, background .15s;
      overflow: hidden;
    }

    .branch-card input[type=radio] { display: none; }

    .branch-card:hover {
      border-color: var(--orange-mid);
      box-shadow: var(--shadow-sm);
    }

    .branch-card.selected {
      border-color: var(--orange);
      background: var(--orange-light);
      box-shadow: 0 0 0 3px rgba(249,115,22,.12);
    }

    .branch-card-inner {
      display: flex;
      align-items: flex-start;
      gap: .75rem;
      padding: .875rem 1rem;
    }

    .branch-map-icon {
      width: 34px;
      height: 34px;
      border-radius: 10px;
      background: var(--orange-light);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: background .15s;
    }

    .branch-card.selected .branch-map-icon { background: rgba(249,115,22,.2); }

    .branch-map-icon mat-icon {
      font-size: 1.05rem;
      width: 1.05rem;
      height: 1.05rem;
      color: var(--orange);
    }

    .branch-details { flex: 1; display: flex; flex-direction: column; gap: .2rem; }

    .branch-name {
      font-size: .875rem;
      font-weight: 700;
      color: var(--text);
    }

    .branch-addr {
      font-size: .775rem;
      color: var(--text-sec);
      line-height: 1.4;
    }

    .branch-phone {
      display: flex;
      align-items: center;
      gap: .25rem;
      font-size: .75rem;
      color: var(--muted);
      margin-top: .1rem;
    }

    .branch-phone mat-icon { font-size: .8rem; width: .8rem; height: .8rem; }

    .branch-check {
      color: var(--orange);
      opacity: 0;
      transform: scale(.8);
      transition: opacity .15s, transform .15s;
      flex-shrink: 0;
      padding-top: .1rem;
    }

    .branch-check.visible { opacity: 1; transform: scale(1); }

    .branch-check mat-icon { font-size: 1.1rem; width: 1.1rem; height: 1.1rem; }

    .branch-skeletons {
      display: flex;
      flex-direction: column;
      gap: .5rem;
      padding: 1rem 1.25rem;
    }

    .skeleton-branch {
      height: 72px;
      border-radius: var(--radius);
      background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
      background-size: 200% 100%;
      animation: shimmer 1.4s ease-in-out infinite;
    }

    /* ─── Address Skeletons ───────────────────────────────── */
    .skeleton-list {
      display: flex;
      flex-direction: column;
      gap: .5rem;
      padding: 1rem 1.25rem;
    }

    .skeleton-item {
      height: 68px;
      border-radius: var(--radius);
      background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
      background-size: 200% 100%;
      animation: shimmer 1.4s ease-in-out infinite;
    }

    .skeleton-item.short { height: 44px; }

    @keyframes shimmer {
      0%   { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }

    /* ─── Empty State ─────────────────────────────────────── */
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: .35rem;
      padding: 2rem 1rem;
      text-align: center;
    }

    .empty-icon {
      font-size: 2rem;
      width: 2rem;
      height: 2rem;
      color: var(--muted);
    }

    .empty-title {
      font-size: .875rem;
      font-weight: 700;
      color: var(--text-sec);
    }

    .empty-desc {
      font-size: .775rem;
      color: var(--muted);
    }

    /* ─── Spinner ─────────────────────────────────────────── */
    .spinner {
      width: 14px;
      height: 14px;
      border: 2px solid rgba(255,255,255,.35);
      border-top-color: #fff;
      border-radius: 50%;
      animation: spin .65s linear infinite;
      display: inline-block;
    }

    @keyframes spin { to { transform: rotate(360deg); } }

    /* ─── Step Actions ────────────────────────────────────── */
    .step-actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: .25rem;
    }

    .btn-back {
      display: inline-flex;
      align-items: center;
      gap: .4rem;
      background: none;
      border: 1.5px solid var(--border);
      border-radius: var(--radius);
      padding: .65rem 1.25rem;
      font-size: .875rem;
      font-weight: 600;
      color: var(--text-sec);
      cursor: pointer;
      transition: border-color .15s, color .15s;
      font-family: Inter, system-ui, sans-serif;
    }

    .btn-back mat-icon { font-size: .95rem; width: .95rem; height: .95rem; }

    .btn-back:hover {
      border-color: var(--indigo);
      color: var(--indigo);
    }

    .btn-continue {
      display: inline-flex;
      align-items: center;
      gap: .45rem;
      background: var(--indigo);
      color: #fff;
      border: none;
      border-radius: var(--radius);
      padding: .7rem 1.625rem;
      font-size: .9rem;
      font-weight: 700;
      cursor: pointer;
      transition: background .15s, box-shadow .15s, transform .12s;
      font-family: Inter, system-ui, sans-serif;
    }

    .btn-continue mat-icon { font-size: .95rem; width: .95rem; height: .95rem; }

    .btn-continue:hover:not(:disabled) {
      background: var(--indigo-dark);
      box-shadow: var(--shadow-indigo);
      transform: translateY(-1px);
    }

    .btn-continue:disabled { opacity: .45; cursor: not-allowed; }

    /* ─── Responsive ──────────────────────────────────────── */
    @media (max-width: 480px) {
      .collection-cards {
        grid-template-columns: 1fr;
      }

      .collection-card {
        flex-direction: row;
        align-items: center;
      }

      .card-illustration {
        width: 44px;
        height: 44px;
        flex-shrink: 0;
      }

      .card-content { gap: .1rem; }

      .card-features { display: none; }

      .card-arrow { display: none; }
    }

    @media (prefers-reduced-motion: reduce) {
      .collection-card,
      .btn-continue,
      .btn-check-pin,
      .card-selected-badge,
      .addr-check-mark,
      .branch-check { transition: none; }

      @keyframes panelEnter { from { opacity: 1; transform: none; } }
    }
  `],
})
export class CollectionTypeStepComponent implements OnInit {
  next = output<void>();
  back = output<void>();

  private labBranchApi = inject(LabBranchApiService);
  private userApi = inject(UserApiService);
  readonly store = inject(BookingWizardStore);

  loadingBranches = signal(true);
  loadingAddresses = signal(false);
  checking = signal(false);
  branches = signal<LabBranch[]>([]);
  savedAddresses = signal<UserAddress[]>([]);
  pincodeError = signal<string | null>(null);
  pincodeValid = signal(false);
  useManualEntry = signal(false);

  collectionType: 'home' | 'lab' = (this.store.collectionType() as 'home' | 'lab') ?? 'lab';
  pincode = this.store.pincode() ?? '';
  selectedBranchId = this.store.labBranchId() ?? '';
  selectedAddressId = this.store.selectedAddressId() ?? '';

  ngOnInit(): void {
    this.labBranchApi.list().subscribe({
      next: (branches: LabBranch[]) => {
        this.branches.set(branches.filter((b: LabBranch) => b.is_active));
        this.loadingBranches.set(false);
        // Auto-select first branch if none selected
        if (!this.selectedBranchId && this.branches().length > 0) {
          this.selectedBranchId = this.branches()[0].id;
        }
      },
      error: () => this.loadingBranches.set(false),
    });

    if (this.collectionType === 'home') {
      this.loadSavedAddresses();
    }
  }

  onCollectionTypeChange(type: string): void {
    if (type === 'home') {
      this.loadSavedAddresses();
    }
  }

  loadSavedAddresses(): void {
    this.loadingAddresses.set(true);
    this.userApi.getAddresses().subscribe({
      next: (res: UserAddressListResponse) => {
        const addresses = res.items;
        this.savedAddresses.set(addresses);
        this.loadingAddresses.set(false);
        if (addresses.length === 0) {
          this.useManualEntry.set(true);
        } else {
          const defaultAddr = addresses.find((a: UserAddress) => a.is_default) ?? addresses[0];
          this.selectedAddressId = defaultAddr.id;
          this.pincode = defaultAddr.pincode;
          this.pincodeValid.set(true);
        }
      },
      error: () => {
        this.loadingAddresses.set(false);
        this.useManualEntry.set(true);
      },
    });
  }

  onAddressSelect(addressId: string): void {
    const addr = this.savedAddresses().find((a: UserAddress) => a.id === addressId);
    if (addr) {
      this.pincode = addr.pincode;
      this.pincodeValid.set(true);
      this.pincodeError.set(null);
    }
  }

  switchToSaved(): void {
    this.useManualEntry.set(false);
    this.pincodeValid.set(false);
    this.pincodeError.set(null);
    this.pincode = '';
    const defaultAddr = this.savedAddresses().find((a: UserAddress) => a.is_default) ?? this.savedAddresses()[0];
    if (defaultAddr) {
      this.selectedAddressId = defaultAddr.id;
      this.pincode = defaultAddr.pincode;
      this.pincodeValid.set(true);
    }
  }

  validatePincode(): void {
    this.pincodeError.set(null);
    this.pincodeValid.set(false);
    if (!/^\d{6}$/.test(this.pincode)) {
      this.pincodeError.set('Please enter a valid 6-digit pincode.');
      return;
    }
    this.pincodeValid.set(true);
  }

  canProceed(): boolean {
    if (this.collectionType === 'home') {
      if (!this.useManualEntry() && this.savedAddresses().length > 0) {
        return !!this.selectedAddressId;
      }
      return this.pincodeValid();
    }
    return !!this.selectedBranchId;
  }

  onNext(): void {
    const usingSaved = this.collectionType === 'home' && !this.useManualEntry() && this.savedAddresses().length > 0;
    this.store.patch({
      collectionType: this.collectionType,
      pincode: this.collectionType === 'home' ? this.pincode : null,
      labBranchId: this.collectionType === 'lab' ? this.selectedBranchId : null,
      selectedAddressId: usingSaved ? this.selectedAddressId : null,
    });
    this.next.emit();
  }
}
