import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type TransporterOnboarding = {
  phone: string;
  type: 'gst' | 'individual' | null;
  gstNumber?: string;
  vehicleNumber?: string;
  vehicleType?: string;
  capacityTons?: number;
  rcNumber?: string;
  dlUrl?: string;
  rcUrl?: string;
  insuranceUrl?: string;
  passcode?: string;
  set: (p: Partial<TransporterOnboarding>) => void;
  reset: () => void;
};

const initial = {
  phone: '',
  type: null,
};

export const useTransporterOnboarding = create<TransporterOnboarding>()(
  persist(
    (set) => ({
      ...(initial as any),
      set: (p) => set((s) => ({ ...s, ...p })),
      reset: () => set(() => ({ ...(initial as any) })),
    }),
    { name: 'csupply-transporter-onboarding', storage: createJSONStorage(() => AsyncStorage) }
  )
);
