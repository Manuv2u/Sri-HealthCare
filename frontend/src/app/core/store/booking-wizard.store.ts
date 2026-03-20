import { signalStore, withState, withMethods } from '@ngrx/signals';

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
  paymentMethod: null,
  currentStep: 0,
};

export const BookingWizardStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withMethods((store) => ({
    reset(): void {
      Object.assign(store, initialState);
    },
    nextStep(): void {
      (store as any).patchState?.({ currentStep: store.currentStep() + 1 });
    },
    prevStep(): void {
      (store as any).patchState?.({ currentStep: Math.max(0, store.currentStep() - 1) });
    },
  })),
);
