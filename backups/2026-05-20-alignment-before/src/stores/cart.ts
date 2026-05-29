import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type CartItem = {
  productId: string;
  variantId?: string;
  name: string;
  brand?: string;
  unit: string;
  unitPrice: number;
  mrp?: number;
  quantity: number;
  image?: string;
  weightPerUnitKg?: number;
  moq?: number;
  vendorId?: string;
};

type CartState = {
  items: CartItem[];
  add: (item: CartItem) => void;
  addItem: (item: CartItem) => void;
  setQty: (productId: string, qty: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
  totalItems: () => number;
  subtotal: () => number;
  totalWeightKg: () => number;
  mrpTotal: () => number;
};

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      add: (item) =>
        set((s) => {
          const existing = s.items.find(
            (i) => i.productId === item.productId && i.variantId === item.variantId
          );
          if (existing) {
            return {
              items: s.items.map((i) =>
                i === existing ? { ...i, quantity: i.quantity + item.quantity } : i
              ),
            };
          }
          return { items: [...s.items, item] };
        }),
      addItem: (item) =>
        set((s) => {
          const existing = s.items.find(
            (i) => i.productId === item.productId && i.variantId === item.variantId
          );
          if (existing) {
            return {
              items: s.items.map((i) =>
                i === existing ? { ...i, quantity: i.quantity + item.quantity } : i
              ),
            };
          }
          return { items: [...s.items, item] };
        }),
      setQty: (productId, qty) =>
        set((s) => ({
          items: s.items
            .map((i) => (i.productId === productId ? { ...i, quantity: qty } : i))
            .filter((i) => i.quantity > 0),
        })),
      remove: (productId) =>
        set((s) => ({ items: s.items.filter((i) => i.productId !== productId) })),
      clear: () => set({ items: [] }),
      totalItems: () => get().items.length,
      subtotal: () =>
        get().items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0),
      mrpTotal: () =>
        get().items.reduce((sum, i) => sum + (i.mrp ?? i.unitPrice) * i.quantity, 0),
      totalWeightKg: () =>
        get().items.reduce(
          (sum, i) => sum + (i.weightPerUnitKg ?? 0) * i.quantity,
          0
        ),
    }),
    {
      name: 'csupply-cart',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
