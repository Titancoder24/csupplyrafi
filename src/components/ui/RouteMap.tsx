/**
 * RouteMap — Renders a pickup → drop route on OpenStreetMap (Leaflet on web).
 *
 * Optional truck overlay: pass `truckPosition` (0–1) to drop a truck marker
 * at that fraction along the OSRM route polyline. The marker auto-updates as
 * the prop changes (e.g. as order status advances).
 *
 * Fallback (no lat/lng): renders a clean route diagram with pickup pin → route
 * line → drop pin → truck icon at the current stage. Never shows "unavailable".
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, Pressable, Platform, StyleSheet, Linking } from 'react-native';
import { Navigation, MapPin, ExternalLink, Truck as TruckIcon } from 'lucide-react-native';

export interface LatLng {
  lat: number;
  lng: number;
  label?: string;
}

interface RouteMapProps {
  from: LatLng;
  to: LatLng;
  height?: number;
  /** 0–1 — fraction along the route where the truck currently sits. */
  truckPosition?: number;
  /** Optional human label for the current stage (e.g. "Heading to pickup"). */
  stageLabel?: string;
}

const PRIMARY = '#1D4ED8';
const GREEN   = '#15803D';
const ACCENT  = '#F97316';

declare global { interface Window { L: any } }

export function RouteMap({ from, to, height = 260, truckPosition, stageLabel }: RouteMapProps) {
  const containerRef     = useRef<any>(null);
  const initRef          = useRef(false);
  const truckMarkerRef   = useRef<any>(null);
  const routeCoordsRef   = useRef<[number, number][]>([]);
  const truckFractionRef = useRef<number>(0);
  const truckAnimRef     = useRef<number | null>(null);
  const truckDriftRef    = useRef<number | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    if (initRef.current) return;
    if (!from?.lat || !to?.lat) return;

    let cancelled = false;
    let intervalId: any;

    function init() {
      if (cancelled) return;
      const L = (window as any).L;
      if (!L || !containerRef.current) return;
      initRef.current = true;

      const fromLL: [number, number] = [from.lat, from.lng];
      const toLL:   [number, number] = [to.lat,   to.lng];

      const map = L.map(containerRef.current, {
        scrollWheelZoom: false,
        zoomControl: false,
        attributionControl: false,
        dragging: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OSM',
        maxZoom: 19,
      }).addTo(map);

      // Container may be size 0 at init in flex layouts — force Leaflet to recompute
      requestAnimationFrame(() => map.invalidateSize());

      // Pickup marker (compact green dot)
      const pickupIcon = L.divIcon({
        className: '',
        html: `<div style="background:${GREEN};width:14px;height:14px;border-radius:50%;border:2.5px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.35);"></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });
      L.marker(fromLL, { icon: pickupIcon }).addTo(map)
        .bindPopup(`<b>Pickup</b><br/>${from.label ?? 'Vendor'}`);

      // Drop marker (orange location pin)
      const dropIcon = L.divIcon({
        className: '',
        html: `<div style="background:${ACCENT};width:18px;height:18px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2.5px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.35);"></div>`,
        iconSize: [18, 18],
        iconAnchor: [9, 18],
      });
      L.marker(toLL, { icon: dropIcon }).addTo(map)
        .bindPopup(`<b>Drop</b><br/>${to.label ?? 'Customer'}`);

      // Fit map to both markers — delay one frame so invalidateSize has run
      requestAnimationFrame(() => {
        map.fitBounds([fromLL, toLL], { padding: [18, 18], maxZoom: 13 });
      });

      // Initial dashed straight line
      const straight = L.polyline([fromLL, toLL], {
        color: PRIMARY, weight: 3, dashArray: '6,8', opacity: 0.5,
      }).addTo(map);

      // Seed route coords for truck placement until OSRM responds
      routeCoordsRef.current = [fromLL, toLL];
      placeTruck();

      // OSRM real driving route
      const url = `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`;
      fetch(url)
        .then(r => r.json())
        .then(json => {
          if (cancelled || !json?.routes?.[0]?.geometry) return;
          const coords: [number, number][] = json.routes[0].geometry.coordinates.map(
            ([lng, lat]: [number, number]) => [lat, lng]
          );
          map.removeLayer(straight);
          // White halo behind the route for a Google-Maps-like look
          L.polyline(coords, { color: '#FFFFFF', weight: 6, opacity: 1 }).addTo(map);
          L.polyline(coords, { color: '#16A34A', weight: 4, opacity: 0.95 }).addTo(map);
          map.fitBounds(coords, { padding: [18, 18], maxZoom: 13 });
          routeCoordsRef.current = coords;
          placeTruck();
        })
        .catch(() => { /* keep dashed straight line if OSRM unavailable */ });

      function buildTruckIcon(bearingDeg: number) {
        return L.divIcon({
          className: '',
          html: `<div style="
              background:#15803D;width:26px;height:26px;border-radius:7px;
              border:2.5px solid white;box-shadow:0 3px 8px rgba(0,0,0,0.35);
              display:flex;align-items:center;justify-content:center;
              transform:rotate(${bearingDeg}deg);transition:transform 600ms ease;
            ">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" style="transform:rotate(90deg);">
                <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/>
                <path d="M15 18H9"/>
                <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/>
                <circle cx="17" cy="18" r="2"/>
                <circle cx="7" cy="18" r="2"/>
              </svg>
            </div>`,
          iconSize: [26, 26],
          iconAnchor: [13, 13],
        });
      }

      function renderTruckAt(fraction: number) {
        const coords = routeCoordsRef.current;
        if (!coords.length) return;
        const pt      = pointAtFraction(coords, fraction);
        const bearing = bearingAtFraction(coords, fraction);
        if (!truckMarkerRef.current) {
          truckMarkerRef.current = L.marker(pt, {
            icon: buildTruckIcon(bearing),
            zIndexOffset: 1000,
          }).addTo(map);
        } else {
          truckMarkerRef.current.setLatLng(pt);
          truckMarkerRef.current.setIcon(buildTruckIcon(bearing));
        }
        truckFractionRef.current = fraction;
      }

      function easeInOutCubic(t: number): number {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      }

      function animateTruckTo(target: number, durationMs = 1400) {
        if (truckAnimRef.current != null) {
          cancelAnimationFrame(truckAnimRef.current);
          truckAnimRef.current = null;
        }
        const start    = truckFractionRef.current;
        const delta    = target - start;
        const t0       = performance.now();
        function step(now: number) {
          const elapsed = now - t0;
          const k       = Math.min(1, elapsed / durationMs);
          const eased   = easeInOutCubic(k);
          renderTruckAt(start + delta * eased);
          if (k < 1) {
            truckAnimRef.current = requestAnimationFrame(step);
          } else {
            truckAnimRef.current = null;
          }
        }
        truckAnimRef.current = requestAnimationFrame(step);
      }

      function startDriftLoop() {
        // Continuous slow forward drift to make the truck feel "alive" within its current stage.
        // Only drifts if there is room before the target. Resets each time placeTruck() is called.
        if (truckDriftRef.current != null) {
          clearInterval(truckDriftRef.current);
          truckDriftRef.current = null;
        }
        truckDriftRef.current = setInterval(() => {
          // skip if a big tween is running
          if (truckAnimRef.current != null) return;
          const target = (window as any).__truckTarget__ as number | undefined;
          if (target === undefined) return;
          // Only drift while in transit phases (target between 0.3 and 0.95)
          if (target < 0.3 || target >= 0.99) return;
          const cur = truckFractionRef.current;
          // Drift up to ~5% before the next stage marker
          const ceiling = Math.min(target + 0.05, 0.99);
          if (cur < ceiling) {
            renderTruckAt(Math.min(cur + 0.0025, ceiling));
          }
        }, 800) as unknown as number;
      }

      function placeTruck() {
        if (truckPosition === undefined) return;
        const coords = routeCoordsRef.current;
        if (!coords.length) return;
        (window as any).__truckTarget__ = truckPosition;
        // First placement: jump there. Subsequent: animate.
        if (!truckMarkerRef.current) {
          renderTruckAt(truckPosition);
          startDriftLoop();
        } else {
          animateTruckTo(truckPosition);
        }
      }

      // Re-place truck whenever the prop changes (handled by separate effect via window event)
      (window as any).__placeTruck__ = placeTruck;
    }

    // Leaflet may not be loaded yet — poll briefly
    if ((window as any).L) {
      init();
    } else {
      intervalId = setInterval(() => {
        if ((window as any).L) {
          clearInterval(intervalId);
          init();
        }
      }, 100);
      setTimeout(() => intervalId && clearInterval(intervalId), 8000);
    }

    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
      if (truckAnimRef.current != null) cancelAnimationFrame(truckAnimRef.current);
      if (truckDriftRef.current != null) clearInterval(truckDriftRef.current);
      truckAnimRef.current  = null;
      truckDriftRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from?.lat, from?.lng, to?.lat, to?.lng]);

  // Update truck position when prop changes
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const place = (window as any).__placeTruck__;
    if (typeof place === 'function') place();
  }, [truckPosition]);

  function openExternalNav() {
    const url = `https://www.google.com/maps/dir/?api=1&origin=${from.lat},${from.lng}&destination=${to.lat},${to.lng}&travelmode=driving`;
    Linking.openURL(url).catch(() => {});
  }

  /* ── Diagram fallback (no lat/lng or non-web) ─────────────────────────── */
  if (!from?.lat || !to?.lat) {
    return <DiagramFallback height={height} from={from} to={to} truckPosition={truckPosition} stageLabel={stageLabel} />;
  }

  if (Platform.OS !== 'web') {
    return (
      <View style={[s.fallback, { height }]}>
        <Navigation size={26} color="#0F172A" strokeWidth={2} />
        <Text style={s.fallbackTitle}>Pickup → Drop Route</Text>
        <Text style={s.fallbackSub}>Open in Maps for turn-by-turn directions</Text>
        <Pressable style={s.openBtn} onPress={openExternalNav}>
          <ExternalLink size={14} color="#FFFFFF" strokeWidth={2.2} />
          <Text style={s.openBtnTxt}>Open in Google Maps</Text>
        </Pressable>
      </View>
    );
  }

  const isCompact = height <= 180;
  return (
    <View style={{ height, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#E2E8F0' }}>
      {React.createElement('div', {
        ref: containerRef,
        style: { width: '100%', height: '100%' },
      })}
      {!isCompact && stageLabel ? (
        <View style={s.stageChip}>
          <View style={s.stageDot} />
          <Text style={s.stageTxt}>{stageLabel}</Text>
        </View>
      ) : null}
      {!isCompact ? (
        <Pressable style={s.openInMaps} onPress={openExternalNav}>
          <Navigation size={12} color="#FFFFFF" strokeWidth={2.2} />
          <Text style={s.openInMapsTxt}>Open in Maps</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/* ─── Helpers ─────────────────────────────────────────────────────────────── */
/** Bearing in degrees (0 = north, clockwise) at fraction t along a polyline. */
function bearingAtFraction(coords: [number, number][], t: number): number {
  if (coords.length < 2) return 0;
  const tt = Math.max(0, Math.min(1, t));
  // Compute cumulative distances and locate the active segment
  const segs: number[] = [];
  let total = 0;
  for (let i = 1; i < coords.length; i++) {
    const d = Math.hypot(coords[i][0] - coords[i - 1][0], coords[i][1] - coords[i - 1][1]);
    segs.push(d);
    total += d;
  }
  if (total === 0) return 0;
  let target = tt * total;
  let idx = 0;
  for (let i = 0; i < segs.length; i++) {
    if (target <= segs[i]) { idx = i; break; }
    target -= segs[i];
    idx = i;
  }
  const [lat1, lng1] = coords[idx];
  const [lat2, lng2] = coords[Math.min(idx + 1, coords.length - 1)];
  // Standard bearing formula
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  const θ = Math.atan2(y, x);
  return (θ * 180) / Math.PI; // -180 .. 180
}

function pointAtFraction(coords: [number, number][], t: number): [number, number] {
  const tt = Math.max(0, Math.min(1, t));
  if (coords.length === 0) return [0, 0];
  if (coords.length === 1) return coords[0];

  // Total length
  let total = 0;
  const segs: number[] = [];
  for (let i = 1; i < coords.length; i++) {
    const d = Math.hypot(coords[i][0] - coords[i - 1][0], coords[i][1] - coords[i - 1][1]);
    segs.push(d);
    total += d;
  }
  if (total === 0) return coords[0];

  let target = tt * total;
  for (let i = 0; i < segs.length; i++) {
    if (target <= segs[i]) {
      const frac = segs[i] === 0 ? 0 : target / segs[i];
      const [lat1, lng1] = coords[i];
      const [lat2, lng2] = coords[i + 1];
      return [lat1 + (lat2 - lat1) * frac, lng1 + (lng2 - lng1) * frac];
    }
    target -= segs[i];
  }
  return coords[coords.length - 1];
}

/* ─── Stylized fallback diagram ───────────────────────────────────────────── */
function DiagramFallback({
  height, from, to, truckPosition = 0, stageLabel,
}: {
  height: number;
  from: LatLng;
  to: LatLng;
  truckPosition?: number;
  stageLabel?: string;
}) {
  // Compute the truck's left position as a percentage of width (between pins)
  const truckLeftPct = `${Math.round(10 + Math.max(0, Math.min(1, truckPosition)) * 80)}%`;
  return (
    <View style={[s.diagram, { height }]}>
      {stageLabel ? <Text style={s.diagramStage}>{stageLabel}</Text> : null}
      <View style={s.diagramTrack}>
        {/* Pickup pin */}
        <View style={s.diagramPin}>
          <View style={[s.diagramPinDot, { backgroundColor: PRIMARY }]}>
            <Text style={s.diagramPinTxt}>P</Text>
          </View>
          <Text style={s.diagramPinLabel} numberOfLines={1}>{from.label ?? 'Pickup'}</Text>
        </View>

        {/* Route dashed line */}
        <View style={s.diagramLineWrap}>
          <View style={s.diagramLine} />
          {/* Truck moves along the line */}
          <View style={[s.diagramTruck, { left: truckLeftPct }]}>
            <TruckIcon size={16} color="#FFFFFF" strokeWidth={2} />
          </View>
        </View>

        {/* Drop pin */}
        <View style={s.diagramPin}>
          <View style={[s.diagramPinDot, { backgroundColor: GREEN }]}>
            <Text style={s.diagramPinTxt}>D</Text>
          </View>
          <Text style={s.diagramPinLabel} numberOfLines={1}>{to.label ?? 'Drop'}</Text>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  fallback: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0',
    alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16,
  },
  fallbackTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: '#0F172A' },
  fallbackSub:   { fontFamily: 'Inter_400Regular',  fontSize: 11.5, color: '#64748B', textAlign: 'center' },
  openBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: PRIMARY, paddingHorizontal: 14, paddingVertical: 9,
    borderRadius: 8, marginTop: 4,
  },
  openBtnTxt: { fontFamily: 'Inter_600SemiBold', fontSize: 12.5, color: '#fff' },

  /* Web map overlays */
  stageChip: {
    position: 'absolute' as never, top: 8, left: 8,
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(15,23,42,0.85)',
    paddingHorizontal: 9, paddingVertical: 4,
    borderRadius: 99,
  },
  stageDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#22C55E' },
  stageTxt: { fontFamily: 'Inter_600SemiBold', fontSize: 10.5, color: '#fff', letterSpacing: 0.1 },

  openInMaps: {
    position: 'absolute' as never, bottom: 8, right: 8,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: PRIMARY, paddingHorizontal: 9, paddingVertical: 5,
    borderRadius: 6,
  },
  openInMapsTxt: { fontFamily: 'Inter_500Medium', fontSize: 10.5, color: '#fff' },

  /* Diagram fallback */
  diagram: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0',
    padding: 14, justifyContent: 'center',
    overflow: 'hidden' as never,
  },
  diagramStage: {
    position: 'absolute' as never, top: 8, left: 12,
    fontFamily: 'Inter_600SemiBold', fontSize: 10.5,
    color: '#475569', backgroundColor: '#F1F5F9',
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: 99,
    letterSpacing: 0.1,
  },
  diagramTrack: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingTop: 6,
  },
  diagramPin: { alignItems: 'center', gap: 4, maxWidth: 80 },
  diagramPinDot: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#fff',
    shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 3, shadowOffset: { width: 0, height: 1 },
  },
  diagramPinTxt: { fontFamily: 'Inter_700Bold', fontSize: 11, color: '#fff' },
  diagramPinLabel: { fontFamily: 'Inter_500Medium', fontSize: 10, color: '#475569', textAlign: 'center' },

  diagramLineWrap: { flex: 1, height: 30, justifyContent: 'center', position: 'relative' as never },
  diagramLine: {
    height: 2, backgroundColor: '#CBD5E1',
    width: '100%',
  },
  diagramTruck: {
    position: 'absolute' as never, top: 3,
    width: 24, height: 24, borderRadius: 6,
    backgroundColor: ACCENT,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#fff',
    shadowColor: '#000', shadowOpacity: 0.22, shadowRadius: 4, shadowOffset: { width: 0, height: 2 },
    marginLeft: -12,
  },
});
