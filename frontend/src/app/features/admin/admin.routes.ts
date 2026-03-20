import { Routes } from '@angular/router';
import { authGuard, roleGuard } from '../../core/auth/auth.guard';

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./admin-shell.component').then(m => m.AdminShellComponent),
    canActivate: [authGuard, roleGuard(['admin'])],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard',     loadComponent: () => import('./dashboard/admin-dashboard.component').then(m => m.AdminDashboardComponent) },
      { path: 'users',         loadComponent: () => import('./users/admin-users.component').then(m => m.AdminUsersComponent) },
      { path: 'tests',         loadComponent: () => import('./tests/admin-tests.component').then(m => m.AdminTestsComponent) },
      { path: 'packages',      loadComponent: () => import('./packages/admin-packages.component').then(m => m.AdminPackagesComponent) },
      { path: 'technicians',   loadComponent: () => import('./technicians/admin-technicians.component').then(m => m.AdminTechniciansComponent) },
      { path: 'bookings',      loadComponent: () => import('./bookings/admin-bookings.component').then(m => m.AdminBookingsComponent) },
      { path: 'service-areas', loadComponent: () => import('./service-areas/admin-service-areas.component').then(m => m.AdminServiceAreasComponent) },
      { path: 'analytics',     loadComponent: () => import('./analytics/admin-analytics.component').then(m => m.AdminAnalyticsComponent) },
      { path: 'feature-flags', loadComponent: () => import('./feature-flags/admin-feature-flags.component').then(m => m.AdminFeatureFlagsComponent) },
    ],
  },
];
