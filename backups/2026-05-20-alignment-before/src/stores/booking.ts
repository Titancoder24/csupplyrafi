import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

type DeliveryMode = 'instant' | 'schedule';

type BookingState = {
  step: number;
  addressId: string | null;
  gst: { hasGst: boolean; gstNumber?: string; businessName?: string; fullName?: string };
  delivery: { mode: DeliveryMode; date?: string; slot?: string };
  vehicleEntry: {
    needed: boolean;
    vehicleNumber?: string;
    entryTime?: string;
    contactPerson?: string;
    phone?: string;
  };
  set: (patch: Partial<BookingState>) => void;
  reset: () => void;
};

const initial: Pick<
  BookingState,
  'step' | 'addressId' | 'gst' | 'delivery' | 'vehicleEntry'
> = {
  step: 0,
  addressId: null,
  gst: { hasGst: false },
  delivery: { mode: 'schedule' },
  vehicleEntry: { needed: false },
};

export const useBooking = create<BookingState>()(
  persist(
    (set) => ({
      ...initial,
      set: (patch) => set((s) => ({ ...s, ...patch })),
      reset: () => set(() => ({ ...initial })),
    }),
    { name: 'csupply-booking', storage: createJSONStorage(() => AsyncStorage) }
  )
);
