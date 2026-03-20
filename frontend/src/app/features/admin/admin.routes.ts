import { Routes } from '@angular/router';
import { authGuard, roleGuard } from '../../core/auth/auth.guard';

export const ADMIN_ROUTES: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'dashboard', loadComponent: () => import('./dashboard/admin-dashboard.component').then(m => m.AdminDashboardComponent), canActivate: [authGuard, roleGuard(['admin'])] },
  { path: 'analytics', loadComponent: () => import('./analytics/admin-analytics.component').then(m => m.AdminAnalyticsComponent), canActivate: [authGuard, roleGuard(['admin'])] },
  { path: 'tests', loadComponent: () => import('./tests/admin-tests.component').then(m => m.AdminTestsComponent), canActivate: [authGuard, roleGuard(['admin'])] },
  { path: 'packages', loadComponent: () => import('./packages/admin-packages.component').then(m => m.AdminPackagesComponent), canActivate: [authGuard, roleGuard(['admin'])] },
  { path: 'technicians', loadComponent: () => import('./technicians/admin-technicians.component').then(m => m.AdminTechniciansComponent), canActivate: [authGuard, roleGuard(['admin'])] },
  { path: 'service-areas', loadComponent: () => import('./service-areas/admin-service-areas.component').then(m => m.AdminServiceAreasComponent), canActivate: [authGuard, roleGuard(['admin'])] },
  { path: 'feature-flags', loadComponent: () => import('./feature-flags/admin-feature-flags.component').then(m => m.AdminFeatureFlagsComponent), canActivate: [authGuard, roleGuard(['admin'])] },
  { path: 'bookings', loadComponent: () => import('./bookings/admin-bookings.component').then(m => m.AdminBookingsComponent), canActivate: [authGuard, roleGuard(['admin'])] },
];
