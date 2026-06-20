import { Routes } from '@angular/router';
import { authGuard } from '../../core/auth/auth.guard';

export const PROFILE_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./profile/profile.component').then((m) => m.ProfileComponent),
    canActivate: [authGuard],
  },
  {
    path: 'edit',
    loadComponent: () => import('./profile-edit/profile-edit.component').then((m) => m.ProfileEditComponent),
    canActivate: [authGuard],
  },
  {
    path: 'family',
    loadComponent: () => import('./family-members/family-members.component').then((m) => m.FamilyMembersComponent),
    canActivate: [authGuard],
  },
  {
    path: 'addresses',
    loadComponent: () => import('./address-book/address-book.component').then((m) => m.AddressBookComponent),
    canActivate: [authGuard],
  },
];
