// Provider-agnostic mapping interface. v1 implementation: OSM stack
// (Nominatim for geocoding, OSRM for routing, OSM tiles for rendering).
// Drop-in replaceable with Google Maps via a different concrete implementation.

export type LatLng = { lat: number; lng: number };

export type GeocodedAddress = {
  formatted: string;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
};

export type RouteResult = {
  distanceKm: number;
  durationMin: number;
  geometry: LatLng[];
};

export interface MapProvider {
  geocode(query: string): Promise<LatLng | null>;
  reverseGeocode(point: LatLng): Promise<GeocodedAddress | null>;
  getRoute(from: LatLng, to: LatLng): Promise<RouteResult | null>;
  distanceKm(a: LatLng, b: LatLng): number;
}

const NOMINATIM = 'https://nominatim.openstreetmap.org';
const OSRM = 'https://router.project-osrm.org';

const haversine = (a: LatLng, b: LatLng) => {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
};

export class OsmMapProvider implements MapProvider {
  async geocode(query: string): Promise<LatLng | null> {
    if (!query.trim()) return null;
    try {
      const r = await fetch(
        `${NOMINATIM}/search?format=json&limit=1&countrycodes=in&q=${encodeURIComponent(query)}`,
        { headers: { 'User-Agent': 'CSupply/1.0' } }
      );
      const data = (await r.json()) as Array<{ lat: string; lon: string }>;
      if (!data?.length) return null;
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    } catch {
      return null;
    }
  }

  async reverseGeocode(point: LatLng): Promise<GeocodedAddress | null> {
    try {
      const r = await fetch(
        `${NOMINATIM}/reverse?format=json&lat=${point.lat}&lon=${point.lng}`,
        { headers: { 'User-Agent': 'CSupply/1.0' } }
      );
      const j = (await r.json()) as {
        display_name?: string;
        address?: {
          city?: string;
          town?: string;
          state?: string;
          postcode?: string;
          country?: string;
        };
      };
      if (!j?.address) return null;
      return {
        formatted: j.display_name ?? '',
        city: j.address.city || j.address.town,
        state: j.address.state,
        pincode: j.address.postcode,
        country: j.address.country,
      };
    } catch {
      return null;
    }
  }

  async getRoute(from: LatLng, to: LatLng): Promise<RouteResult | null> {
    try {
      const r = await fetch(
        `${OSRM}/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`
      );
      const j = (await r.json()) as {
        routes?: Array<{
          distance: number;
          duration: number;
          geometry: { coordinates: [number, number][] };
        }>;
      };
      const route = j?.routes?.[0];
      if (!route) return null;
      return {
        distanceKm: route.distance / 1000,
        durationMin: route.duration / 60,
        geometry: route.geometry.coordinates.map(([lng, lat]) => ({ lat, lng })),
      };
    } catch {
      return null;
    }
  }

  distanceKm(a: LatLng, b: LatLng): number {
    return haversine(a, b);
  }
}

export const mapProvider: MapProvider = new OsmMapProvider();
