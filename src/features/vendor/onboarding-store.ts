import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type MapLocation = { lat: number; lng: number; address: string };

export type VendorOnboarding = {
  phone: string;
  passcode?: string;
  businessType: 'gst' | 'non_gst' | 'individual' | null;
  shopName: string;
  ownerName: string;
  address: string;
  baseLocation?: MapLocation | null;
  pin?: { lat: number; lng: number };
  landmark?: string;
  gstNumber?: string;
  gstUrl?: string;
  idProofUrl?: string;
  selfieUrl?: string;
  bankAccount?: string;
  bankIfsc?: string;
  categories: string[];
  products: Array<{ name: string; price: number; unit: string; image?: string }>;
  totalStock?: number;
  lowStockEnabled: boolean;
  lowStockThreshold?: number;
  autoHideOos: boolean;
  variants: Array<{ product: string; size: string; moq: number; unit: string }>;
  slots: string[];
  vehicleTypes: string[];
  charges: { mode: 'free' | 'paid'; basePrice?: number; perKm?: number; perVehicle?: Record<string, number> };
  radiusKm: number;
  set: (patch: Partial<VendorOnboarding>) => void;
  reset: () => void;
};

const initial: Omit<VendorOnboarding, 'set' | 'reset'> = {
  phone: '',
  businessType: null,
  shopName: '',
  ownerName: '',
  address: '',
  baseLocation: null,
  categories: [],
  products: [],
  lowStockEnabled: true,
  autoHideOos: true,
  variants: [],
  slots: [],
  vehicleTypes: [],
  charges: { mode: 'paid', basePrice: 200, perKm: 25, perVehicle: { '3wheeler': 15, mini: 20, '4wheeler': 25, '5ton': 30, '6wheeler': 40, '10tyre': 45, '14tyre': 50 } },
  radiusKm: 25,
};

export const useVendorOnboarding = create<VendorOnboarding>()(
  persist(
    (set) => ({
      ...initial,
      set: (p) => set((s) => ({ ...s, ...p })),
      reset: () => set(() => ({ ...initial })),
    }),
    { name: 'csupply-vendor-onboarding', storage: createJSONStorage(() => AsyncStorage) }
  )
);
