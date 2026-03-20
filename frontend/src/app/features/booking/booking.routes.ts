import { Routes } from '@angular/router';
import { authGuard } from '../../core/auth/auth.guard';

export const BOOKING_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./wizard/booking-wizard.component').then((m) => m.BookingWizardComponent),
    canActivate: [authGuard],
  },
];
