import { signalStore, withState, withComputed, withMethods } from '@ngrx/signals';
import { computed } from '@angular/core';

export interface AuthState {
  currentUser: { id: string; name: string; role: string } | null;
  isAuthenticated: boolean;
  role: string | null;
}

const initialState: AuthState = {
  currentUser: null,
  isAuthenticated: false,
  role: null,
};

export const AuthStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed((store) => ({
    isAdmin: computed(() => store.role() === 'admin'),
  })),
  withMethods((store) => ({
    setUser(user: { id: string; name: string; role: string }): void {
      // patchState is imported from @ngrx/signals
      const { patchState } = store as any;
      if (patchState) {
        patchState({ currentUser: user, isAuthenticated: true, role: user.role });
      }
    },
    clearUser(): void {
      const { patchState } = store as any;
      if (patchState) {
        patchState({ currentUser: null, isAuthenticated: false, role: null });
      }
    },
  })),
);
