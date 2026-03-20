import { Routes } from '@angular/router';
import { authGuard } from '../../core/auth/auth.guard';

export const DASHBOARD_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./booking-history/booking-history.component').then((m) => m.BookingHistoryComponent),
    canActivate: [authGuard],
  },
];
