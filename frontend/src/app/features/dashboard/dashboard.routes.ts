import { Routes } from '@angular/router';
import { authGuard, roleGuard } from '../../core/auth/auth.guard';

export const DASHBOARD_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./patient-dashboard/patient-dashboard.component').then(m => m.PatientDashboardComponent),
    canActivate: [authGuard],
  },
  {
    path: 'technician',
    loadComponent: () => import('./technician-dashboard/technician-dashboard.component').then(m => m.TechnicianDashboardComponent),
    canActivate: [authGuard, roleGuard(['technician'])]
  },
  {
    path: 'admin',
    loadComponent: () => import('./admin-dashboard-new/admin-dashboard-new.component').then(m => m.AdminDashboardNewComponent),
    canActivate: [authGuard, roleGuard(['admin'])]
  },
  {
    path: 'bookings',
    loadComponent: () => import('./booking-history/booking-history.component').then(m => m.BookingHistoryComponent),
    canActivate: [authGuard],
  }
];
