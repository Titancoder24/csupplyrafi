/**
 * Pricing Engine — calculates transport fare using:
 *   distance, weight, vehicle type, surge factor
 *
 * POST /pricing-engine
 * Body: { distanceKm, weightKg, vehicleType, surgeFactor? }
 *
 * Also supports live surge calculation based on demand (active bids / available transporters).
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL     = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

type VehicleType =
  | 'mini_truck' | 'pickup' | 'tata_ace'
  | 'lpt_407'   | 'lpt_709'
  | 'container_20ft' | 'container_40ft' | 'trailer';

interface FareRequest {
  distanceKm:    number;
  weightKg:      number;
  vehicleType:   VehicleType;
  surgeFactor?:  number;
  autoSurge?:    boolean;   // compute surge from live demand if true
}

async function computeLiveSurge(
  sb: ReturnType<typeof createClient>,
  vehicleType: VehicleType,
): Promise<number> {
  // Count active transport requests vs available transporters
  const [{ count: openJobs }, { count: availableTransporters }] = await Promise.all([
    sb.from('transport_requests')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'marketplace_open')
      .eq('preferred_vehicle_type', vehicleType),
    sb.from('transporter_profiles')
      .select('*', { count: 'exact', head: true })
      .eq('vehicle_type', vehicleType)
      .eq('is_available', true)
      .eq('is_verified', true),
  ]);

  const jobs         = openJobs ?? 0;
  const transporters = availableTransporters ?? 1;
  const ratio        = jobs / Math.max(transporters, 1);

  // Surge tiers
  if (ratio >= 3.0) return 1.5;  // 50% surge — very high demand
  if (ratio >= 2.0) return 1.3;  // 30% surge
  if (ratio >= 1.5) return 1.15; // 15% surge
  if (ratio >= 1.0) return 1.05; // 5% surge — light demand
  return 1.0;                    // no surge
}

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE);

  let body: FareRequest;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 });
  }

  const { distanceKm, weightKg, vehicleType, autoSurge = false } = body;
  let { surgeFactor = 1.0 } = body;

  if (!distanceKm || !weightKg || !vehicleType) {
    return new Response(JSON.stringify({ error: 'distanceKm, weightKg, vehicleType are required' }), { status: 400 });
  }

  if (autoSurge) {
    surgeFactor = await computeLiveSurge(sb, vehicleType);
  }

  const { data, error } = await sb.rpc('calculate_transport_fare', {
    p_distance_km:  distanceKm,
    p_weight_kg:    weightKg,
    p_vehicle_type: vehicleType,
    p_surge_factor: surgeFactor,
  });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 422 });
  }

  // Also return fare estimates for all vehicle types (useful for vendor to choose)
  const allVehicles: VehicleType[] = [
    'mini_truck', 'pickup', 'tata_ace', 'lpt_407',
    'lpt_709', 'container_20ft', 'container_40ft', 'trailer',
  ];

  const { data: configs } = await sb
    .from('pricing_config')
    .select('vehicle_type, max_capacity_kg, minimum_fare_inr')
    .eq('is_active', true);

  const comparison = configs
    ?.filter((c: { max_capacity_kg: number }) => c.max_capacity_kg >= weightKg)
    .map((c: { vehicle_type: VehicleType }) => ({ vehicle_type: c.vehicle_type }))
    ?? [];

  return new Response(JSON.stringify({
    success:          true,
    fare:             data,
    surge_factor:     surgeFactor,
    surge_source:     autoSurge ? 'live_demand' : 'manual',
    eligible_vehicles: comparison,
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
