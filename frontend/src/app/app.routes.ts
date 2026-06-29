import { Routes } from '@angular/router';

export const routes: Routes = [
  // ── Public landing — home page
  {
    path: '',
    loadComponent: () => import('./features/home/home.component').then((m) => m.HomeComponent),
    pathMatch: 'full',
  },

  // ── Info pages ──────────────────────────────────────────────────────────────
  {
    path: 'about',
    loadComponent: () => import('./features/about/about.component').then((m) => m.AboutComponent),
  },
  {
    path: 'contact',
    loadComponent: () => import('./features/contact/contact.component').then((m) => m.ContactComponent),
  },

  // ── Public routes (no login required) ──────────────────────────────────────
  {
    path: 'auth',
    loadChildren: () =>
      import('./features/auth/auth.routes').then((m) => m.AUTH_ROUTES),
  },
  {
    path: 'tests',
    loadChildren: () =>
      import('./features/tests/tests.routes').then((m) => m.TESTS_ROUTES),
  },
  {
    path: 'packages',
    loadChildren: () =>
      import('./features/packages/packages.routes').then((m) => m.PACKAGES_ROUTES),
  },

  // ── Protected routes (login required) ──────────────────────────────────────
  {
    path: 'dashboard',
    loadChildren: () =>
      import('./features/dashboard/dashboard.routes').then((m) => m.DASHBOARD_ROUTES),
  },
  {
    path: 'booking',
    loadChildren: () =>
      import('./features/booking/booking.routes').then((m) => m.BOOKING_ROUTES),
  },
  {
    path: 'reports',
    loadChildren: () =>
      import('./features/reports/reports.routes').then((m) => m.REPORTS_ROUTES),
  },
  {
    path: 'profile',
    loadChildren: () =>
      import('./features/profile/profile.routes').then((m) => m.PROFILE_ROUTES),
  },
  {
    path: 'payments',
    loadChildren: () =>
      import('./features/payments/payments.routes').then((m) => m.PAYMENTS_ROUTES),
  },
  {
    path: 'bookings',
    loadChildren: () =>
      import('./features/bookings/bookings.routes').then((m) => m.BOOKINGS_ROUTES),
  },

  // ── Admin only ──────────────────────────────────────────────────────────────
  {
    path: 'admin',
    loadChildren: () =>
      import('./features/admin/admin.routes').then((m) => m.ADMIN_ROUTES),
  },

  // ── Lab locations (public) ───────────────────────────────────────────────────
  {
    path: 'lab-locations',
    loadComponent: () => import('./features/lab-locations/lab-locations.component').then((m) => m.LabLocationsComponent),
  },

  // ── Technician only ─────────────────────────────────────────────────────────
  {
    path: 'technician',
    loadChildren: () =>
      import('./features/technician/technician.routes').then((m) => m.TECHNICIAN_ROUTES),
  },

  {
    path: '**',
    redirectTo: 'tests',
  },
];
