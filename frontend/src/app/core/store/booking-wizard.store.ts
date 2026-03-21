import { signalStore, withState, withMethods, patchState } from '@ngrx/signals';

export interface BookingWizardState {
  patientId: string | null;
  patientName: string | null;
  selectedTests: { id: string; name: string; price: number }[];
  selectedPackages: { id: string; name: string; price: number }[];
  slotId: string | null;
  slotDate: string | null;
  collectionType: 'home' | 'lab' | null;
  pincode: string | null;
  labBranchId: string | null;
  selectedAddressId: string | null;
  paymentMethod: string | null;
  currentStep: number;
}

const initialState: BookingWizardState = {
  patientId: null,
  patientName: null,
  selectedTests: [],
  selectedPackages: [],
  slotId: null,
  slotDate: null,
  collectionType: null,
  pincode: null,
  labBranchId: null,
  selectedAddressId: null,
  paymentMethod: null,
  currentStep: 0,
};

export const BookingWizardStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withMethods((store) => ({
    reset(): void {
      patchState(store, initialState);
    },
    patch(partial: Partial<BookingWizardState>): void {
      patchState(store, partial);
    },
  })),
);
