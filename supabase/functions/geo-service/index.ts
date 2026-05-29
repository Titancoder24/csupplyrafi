/**
 * Geo Service — OpenStreetMap-backed routing, geocoding, and distance.
 *
 * POST /geo-service  { action, ...params }
 *
 * Actions:
 *   geocode         — address → { lat, lng, display_name }
 *   reverse         — { lat, lng } → address
 *   route           — { originLat, originLng, destLat, destLng } → { distance_km, duration_min, polyline }
 *   estimate_fare   — route + vehicleType → fare breakdown
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL     = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// OSRM public instance (OpenStreetMap Routing Machine)
const OSRM_BASE = 'https://router.project-osrm.org';

// Nominatim geocoding (OpenStreetMap)
const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';

const HEADERS = {
  'User-Agent': 'C-Supply/1.0 (csupply@app.com)',
  'Accept-Language': 'en',
};

// ── Geo helpers ────────────────────────────────────────────────────

async function geocode(address: string) {
  const url = `${NOMINATIM_BASE}/search?q=${encodeURIComponent(address)}&format=json&limit=5&countrycodes=in`;
  const res  = await fetch(url, { headers: HEADERS });
  const data = await res.json();
  return data.map((r: Record<string, string>) => ({
    display_name: r.display_name,
    lat:          parseFloat(r.lat),
    lng:          parseFloat(r.lon),
    type:         r.type,
    importance:   parseFloat(r.importance),
  }));
}

async function reverse(lat: number, lng: number) {
  const url = `${NOMINATIM_BASE}/reverse?lat=${lat}&lon=${lng}&format=json`;
  const res  = await fetch(url, { headers: HEADERS });
  const data = await res.json();
  return {
    display_name: data.display_name,
    address:      data.address,
    lat, lng,
  };
}

async function getRoute(
  originLat: number, originLng: number,
  destLat: number,   destLng: number,
) {
  const url = `${OSRM_BASE}/route/v1/driving/${originLng},${originLat};${destLng},${destLat}?overview=full&geometries=polyline&steps=false`;
  const res  = await fetch(url, { headers: HEADERS });
  const data = await res.json();

  if (data.code !== 'Ok' || !data.routes?.length) {
    throw new Error('Route not found');
  }

  const route = data.routes[0];
  return {
    distance_km:  parseFloat((route.distance / 1000).toFixed(2)),
    duration_min: Math.ceil(route.duration / 60),
    polyline:     route.geometry,    // encoded polyline
    weight:       route.weight,
  };
}

// Haversine fallback when OSRM fails
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Main handler ──────────────────────────────────────────────────

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE);

  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 }); }

  const action = body.action as string;

  // ── GEOCODE ─────────────────────────────────────────────────────
  if (action === 'geocode') {
    const address = body.address as string;
    if (!address) return new Response(JSON.stringify({ error: 'address required' }), { status: 400 });

    try {
      const results = await geocode(address);
      return new Response(JSON.stringify({ success: true, results }), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: String(e) }), { status: 502 });
    }
  }

  // ── REVERSE ─────────────────────────────────────────────────────
  if (action === 'reverse') {
    const lat = body.lat as number;
    const lng = body.lng as number;
    if (!lat || !lng) return new Response(JSON.stringify({ error: 'lat, lng required' }), { status: 400 });

    try {
      const result = await reverse(lat, lng);
      return new Response(JSON.stringify({ success: true, ...result }), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: String(e) }), { status: 502 });
    }
  }

  // ── ROUTE ────────────────────────────────────────────────────────
  if (action === 'route') {
    const { originLat, originLng, destLat, destLng } = body as {
      originLat: number; originLng: number;
      destLat:   number; destLng:   number;
    };

    if (!originLat || !originLng || !destLat || !destLng) {
      return new Response(JSON.stringify({ error: 'originLat/Lng and destLat/Lng required' }), { status: 400 });
    }

    // Check cache first
    const roundedOriginLat = Math.round(originLat * 1000) / 1000;
    const roundedOriginLng = Math.round(originLng * 1000) / 1000;
    const roundedDestLat   = Math.round(destLat   * 1000) / 1000;
    const roundedDestLng   = Math.round(destLng   * 1000) / 1000;

    const { data: cached } = await sb
      .from('geo_routes')
      .select('*')
      .eq('origin_lat', roundedOriginLat)
      .eq('origin_lng', roundedOriginLng)
      .eq('dest_lat', roundedDestLat)
      .eq('dest_lng', roundedDestLng)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (cached) {
      return new Response(JSON.stringify({
        success:      true,
        distance_km:  cached.distance_km,
        duration_min: cached.duration_min,
        polyline:     cached.polyline,
        source:       'cache',
      }), { headers: { 'Content-Type': 'application/json' } });
    }

    // Fetch from OSRM
    let routeData: { distance_km: number; duration_min: number; polyline: string | null };
    try {
      routeData = await getRoute(originLat, originLng, destLat, destLng);
    } catch {
      // Haversine fallback — ~20% road factor added
      const straightKm = haversineKm(originLat, originLng, destLat, destLng);
      routeData = {
        distance_km:  parseFloat((straightKm * 1.25).toFixed(2)),
        duration_min: Math.ceil((straightKm * 1.25) / 40 * 60), // avg 40 km/h
        polyline:     null,
      };
    }

    // Cache result
    await sb.from('geo_routes').insert({
      origin_lat:   roundedOriginLat,
      origin_lng:   roundedOriginLng,
      dest_lat:     roundedDestLat,
      dest_lng:     roundedDestLng,
      distance_km:  routeData.distance_km,
      duration_min: routeData.duration_min,
      polyline:     routeData.polyline,
    });

    return new Response(JSON.stringify({
      success:      true,
      ...routeData,
      source:       'osrm',
    }), { headers: { 'Content-Type': 'application/json' } });
  }

  // ── ESTIMATE FARE (route + pricing in one call) ──────────────────
  if (action === 'estimate_fare') {
    const { originLat, originLng, destLat, destLng, weightKg, vehicleType } = body as {
      originLat:   number; originLng:   number;
      destLat:     number; destLng:     number;
      weightKg:    number;
      vehicleType: string;
    };

    if (!originLat || !destLat || !weightKg || !vehicleType) {
      return new Response(JSON.stringify({ error: 'originLat/Lng, destLat/Lng, weightKg, vehicleType required' }), {
        status: 400,
      });
    }

    let distance_km: number;
    let duration_min: number;

    try {
      const route = await getRoute(originLat, originLng, destLat, destLng);
      distance_km  = route.distance_km;
      duration_min = route.duration_min;
    } catch {
      const straight = haversineKm(originLat, originLng, destLat, destLng);
      distance_km  = parseFloat((straight * 1.25).toFixed(2));
      duration_min = Math.ceil((distance_km / 40) * 60);
    }

    const { data: fare, error: fareErr } = await sb.rpc('calculate_transport_fare', {
      p_distance_km:  distance_km,
      p_weight_kg:    weightKg,
      p_vehicle_type: vehicleType,
      p_surge_factor: 1.0,
    });

    if (fareErr) {
      return new Response(JSON.stringify({ error: fareErr.message }), { status: 422 });
    }

    return new Response(JSON.stringify({
      success:       true,
      distance_km,
      duration_min,
      fare,
    }), { headers: { 'Content-Type': 'application/json' } });
  }

  return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), { status: 400 });
});
