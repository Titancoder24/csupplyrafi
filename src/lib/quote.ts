import type { CartItem } from '@/stores/cart';

export type Quote = {
  subtotal: number;
  delivery: number;
  commission: number;
  gst: number;
  total: number;
  totalWeightKg: number;
  vehicleClass: 'mini' | 'medium' | 'heavy' | 'x_heavy';
  mrpTotal: number;
  savings: number;
};

/** Lightweight client-side quote (mirrors server compute-quote Edge Function). */
export function computeQuote(
  items: CartItem[],
  opts: { distanceKm?: number; commissionPct?: number; gstPct?: number; freeDeliveryThreshold?: number } = {}
): Quote {
  const { distanceKm = 12, commissionPct = 8, gstPct = 18 } = opts;

  const subtotal = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  const mrpTotal = items.reduce((s, i) => s + (i.mrp ?? i.unitPrice) * i.quantity, 0);
  const totalWeightKg = items.reduce((s, i) => s + (i.weightPerUnitKg ?? 0) * i.quantity, 0);

  const vehicleClass: Quote['vehicleClass'] =
    totalWeightKg <= 1500
      ? 'mini'
      : totalWeightKg <= 5000
      ? 'medium'
      : totalWeightKg <= 13000
      ? 'heavy'
      : 'x_heavy';

  const baseFare =
    vehicleClass === 'mini'
      ? 200
      : vehicleClass === 'medium'
      ? 300
      : vehicleClass === 'heavy'
      ? 500
      : 700;
  const perKm =
    vehicleClass === 'mini'
      ? 15
      : vehicleClass === 'medium'
      ? 25
      : vehicleClass === 'heavy'
      ? 40
      : 50;

  const delivery = Math.max(baseFare + perKm * distanceKm, baseFare);
  const commission = (subtotal * commissionPct) / 100;
  const gst = ((subtotal + delivery) * gstPct) / 100;
  const total = subtotal + delivery + gst;
  const savings = Math.max(0, mrpTotal - subtotal);
  return { subtotal, delivery, commission, gst, total, totalWeightKg, vehicleClass, mrpTotal, savings };
}
