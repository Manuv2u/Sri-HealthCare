import { Routes } from '@angular/router';
import { redirectIfAuthenticated } from '../../core/auth/auth.guard';

export const AUTH_ROUTES: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  {
    path: 'login',
    canActivate: [redirectIfAuthenticated],
    loadComponent: () => import('./login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'register',
    canActivate: [redirectIfAuthenticated],
    loadComponent: () => import('./register/register.component').then((m) => m.RegisterComponent),
  },
  {
    path: 'verify-otp',
    loadComponent: () => import('./otp-verify/otp-verify.component').then((m) => m.OtpVerifyComponent),
  },
];
