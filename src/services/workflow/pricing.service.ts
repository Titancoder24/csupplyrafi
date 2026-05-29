import { supabase } from '@/services/supabase';
import type { PricingBreakdown, FareEstimate, VehicleType } from './types';

// ── Calculate fare for known distance ────────────────────────────

export async function calculateFare(
  distanceKm:   number,
  weightKg:     number,
  vehicleType:  VehicleType,
  surgeFactor?: number,
  autoSurge?:   boolean,
): Promise<{ fare: PricingBreakdown; surge_factor: number; eligible_vehicles: { vehicle_type: VehicleType }[] }> {
  const { data, error } = await supabase.functions.invoke('pricing-engine', {
    body: { distanceKm, weightKg, vehicleType, surgeFactor, autoSurge },
  });
  if (error) throw new Error(error.message);
  if (!data.success) throw new Error(data.error ?? 'Pricing failed');
  return data;
}

// ── Estimate fare including route calculation ──────────────────────

export async function estimateFareWithRoute(
  originLat:   number,
  originLng:   number,
  destLat:     number,
  destLng:     number,
  weightKg:    number,
  vehicleType: VehicleType,
): Promise<FareEstimate> {
  const { data, error } = await supabase.functions.invoke('geo-service', {
    body: {
      action: 'estimate_fare',
      originLat, originLng, destLat, destLng,
      weightKg, vehicleType,
    },
  });
  if (error) throw new Error(error.message);
  if (!data.success) throw new Error(data.error ?? 'Fare estimation failed');
  return { distance_km: data.distance_km, duration_min: data.duration_min, fare: data.fare };
}

// ── Get all pricing config (for UI display) ────────────────────────

export async function getPricingConfig() {
  const { data, error } = await supabase
    .from('pricing_config')
    .select('*')
    .eq('is_active', true)
    .order('max_capacity_kg', { ascending: true });

  if (error) throw new Error(error.message);
  return data;
}

// ── Admin: update pricing config ──────────────────────────────────

export async function updatePricingConfig(
  vehicleType: VehicleType,
  updates: Partial<{
    base_fare_inr:         number;
    per_km_rate_inr:       number;
    per_kg_rate_inr:       number;
    minimum_fare_inr:      number;
    fuel_multiplier:       number;
    surge_multiplier:      number;
    extra_weight_rate_inr: number;
  }>,
): Promise<void> {
  const { error } = await supabase
    .from('pricing_config')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('vehicle_type', vehicleType);

  if (error) throw new Error(error.message);
}

// ── Suggest best vehicle type for a load ──────────────────────────

export async function suggestVehicle(
  weightKg:    number,
  distanceKm:  number,
): Promise<{ vehicle_type: VehicleType; fare: PricingBreakdown; label: string }[]> {
  const { data: configs } = await supabase
    .from('pricing_config')
    .select('*')
    .eq('is_active', true)
    .gte('max_capacity_kg', weightKg)
    .order('max_capacity_kg', { ascending: true });

  if (!configs?.length) return [];

  const estimates = await Promise.all(
    configs.slice(0, 3).map(async (cfg: { vehicle_type: VehicleType }) => {
      const { data: fare } = await supabase.rpc('calculate_transport_fare', {
        p_distance_km:  distanceKm,
        p_weight_kg:    weightKg,
        p_vehicle_type: cfg.vehicle_type,
        p_surge_factor: 1.0,
      });
      return { vehicle_type: cfg.vehicle_type, fare: fare as PricingBreakdown };
    }),
  );

  const { VEHICLE_LABELS } = await import('./types');

  return estimates.map(e => ({
    ...e,
    label: VEHICLE_LABELS[e.vehicle_type],
  }));
}
