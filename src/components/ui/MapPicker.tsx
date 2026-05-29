/**
 * MapPicker — Web-first location picker using Leaflet + OpenStreetMap.
 *
 * Works exclusively on web (Platform.OS === 'web'). Leaflet CSS and JS are
 * injected into document.head on first mount via <script>/<link> tags so no
 * npm package is required. On native a graceful fallback text-input is shown.
 *
 * Returns { lat, lng, address } through onSelect. The marker is draggable;
 * dragging triggers a Nominatim reverse-geocode to refresh the address.
 */

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { MapPin, Navigation, Search, X } from 'lucide-react-native';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MapLocation {
  lat: number;
  lng: number;
  address: string;
}

export interface MapPickerProps {
  label: string;
  value?: MapLocation;
  onSelect: (loc: MapLocation) => void;
  placeholder?: string;
}

// ─── Nominatim helpers ────────────────────────────────────────────────────────

const NOMINATIM = 'https://nominatim.openstreetmap.org';
const HEADERS = { 'User-Agent': 'CSupply/1.0 (csupply-app)' };

type NominatimResult = {
  place_id: number;
  lat: string;
  lon: string;
  display_name: string;
};

async function searchAddress(query: string): Promise<NominatimResult[]> {
  if (!query.trim()) return [];
  try {
    const url = `${NOMINATIM}/search?format=json&limit=5&countrycodes=in&q=${encodeURIComponent(query)}`;
    const res = await fetch(url, { headers: HEADERS });
    return (await res.json()) as NominatimResult[];
  } catch {
    return [];
  }
}

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const url = `${NOMINATIM}/reverse?format=json&lat=${lat}&lon=${lng}`;
    const res = await fetch(url, { headers: HEADERS });
    const j = (await res.json()) as { display_name?: string };
    return j?.display_name ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  } catch {
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }
}

// ─── Leaflet loader (web only) ────────────────────────────────────────────────

let leafletLoaded = false;
let leafletLoading = false;
const leafletCallbacks: Array<() => void> = [];

function loadLeaflet(onReady: () => void) {
  if (leafletLoaded) { onReady(); return; }
  leafletCallbacks.push(onReady);
  if (leafletLoading) return;
  leafletLoading = true;

  // CSS
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
  link.crossOrigin = '';
  document.head.appendChild(link);

  // JS
  const script = document.createElement('script');
  script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
  script.crossOrigin = '';
  script.onload = () => {
    leafletLoaded = true;
    leafletLoading = false;
    leafletCallbacks.forEach((cb) => cb());
    leafletCallbacks.length = 0;
  };
  document.head.appendChild(script);
}

// ─── Leaflet map instance (web only) ─────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type L = any;

const DEFAULT_LAT = 17.385;
const DEFAULT_LNG = 78.4867; // Hyderabad, India
const DEFAULT_ZOOM = 13;

// ─── Main Component ───────────────────────────────────────────────────────────

export function MapPicker({ label, value, onSelect, placeholder }: MapPickerProps) {
  const isWeb = Platform.OS === 'web';

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L>(null);
  const markerRef = useRef<L>(null);

  const [query, setQuery] = useState(value?.address ?? '');
  const [suggestions, setSuggestions] = useState<NominatimResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [geolocating, setGeolocating] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Initialise Leaflet map ──
  const initMap = useCallback(() => {
    const container = mapContainerRef.current;
    if (!container || mapInstanceRef.current) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const L: L = (window as any).L;
    if (!L) { setMapError('Map library failed to load.'); return; }

    const initLat = value?.lat ?? DEFAULT_LAT;
    const initLng = value?.lng ?? DEFAULT_LNG;

    const map = L.map(container, { zoomControl: true }).setView([initLat, initLng], DEFAULT_ZOOM);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OSM</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    // Custom blue icon
    const icon = L.divIcon({
      className: '',
      html: `<div style="
        width:28px;height:34px;
        background:#0F4C81;
        border-radius:50% 50% 50% 0;
        transform:rotate(-45deg);
        border:3px solid #fff;
        box-shadow:0 2px 8px rgba(0,0,0,0.35);
      "></div>`,
      iconSize: [28, 34],
      iconAnchor: [14, 34],
    });

    const marker = L.marker([initLat, initLng], { draggable: true, icon }).addTo(map);
    markerRef.current = marker;
    mapInstanceRef.current = map;

    // Click on map → move marker + reverse geocode
    map.on('click', async (e: { latlng: { lat: number; lng: number } }) => {
      const { lat, lng } = e.latlng;
      marker.setLatLng([lat, lng]);
      const address = await reverseGeocode(lat, lng);
      setQuery(address);
      onSelect({ lat, lng, address });
    });

    // Drag marker → reverse geocode
    marker.on('dragend', async () => {
      const pos = marker.getLatLng();
      const address = await reverseGeocode(pos.lat, pos.lng);
      setQuery(address);
      onSelect({ lat: pos.lat, lng: pos.lng, address });
    });

    setMapReady(true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Load Leaflet on mount (web only) ──
  useEffect(() => {
    if (!isWeb) return;
    loadLeaflet(() => initMap());
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Fly map to location helper ──
  const flyTo = useCallback((lat: number, lng: number) => {
    if (!mapInstanceRef.current || !markerRef.current) return;
    mapInstanceRef.current.flyTo([lat, lng], 16, { animate: true, duration: 0.8 });
    markerRef.current.setLatLng([lat, lng]);
  }, []);

  // ── Address search with debounce ──
  const handleQueryChange = useCallback((text: string) => {
    setQuery(text);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!text.trim()) { setSuggestions([]); return; }
    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      const results = await searchAddress(text);
      setSuggestions(results);
      setSearching(false);
    }, 400);
  }, []);

  // ── Pick a suggestion ──
  const handleSelectSuggestion = useCallback((item: NominatimResult) => {
    const lat = parseFloat(item.lat);
    const lng = parseFloat(item.lon);
    const address = item.display_name;
    setQuery(address);
    setSuggestions([]);
    flyTo(lat, lng);
    onSelect({ lat, lng, address });
  }, [flyTo, onSelect]);

  // ── Use browser geolocation ──
  const handleUseMyLocation = useCallback(() => {
    if (!('geolocation' in navigator)) return;
    setGeolocating(true);
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const { latitude: lat, longitude: lng } = coords;
        const address = await reverseGeocode(lat, lng);
        setQuery(address);
        setSuggestions([]);
        flyTo(lat, lng);
        onSelect({ lat, lng, address });
        setGeolocating(false);
      },
      () => {
        setGeolocating(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, [flyTo, onSelect]);

  // ── Clear selection ──
  const handleClear = useCallback(() => {
    setQuery('');
    setSuggestions([]);
  }, []);

  // ─── Render ───────────────────────────────────────────────────────────────

  if (!isWeb) {
    // Native fallback: plain text input only (no map)
    return (
      <View style={styles.root}>
        <Text style={styles.label}>{label}</Text>
        <View style={styles.searchRow}>
          <MapPin size={18} color="#0F172A" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.nativeInput}
            placeholder={placeholder ?? 'Enter address…'}
            placeholderTextColor="#94A3B8"
            value={query}
            onChangeText={(t) => {
              setQuery(t);
              if (t.trim()) onSelect({ lat: 0, lng: 0, address: t });
            }}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {/* Label */}
      <Text style={styles.label}>{label}</Text>

      {/* Search row */}
      <View style={styles.searchRow}>
        <View style={styles.searchInputWrapper}>
          <Search size={16} color="#0F172A" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder={placeholder ?? 'Search address…'}
            placeholderTextColor="#94A3B8"
            value={query}
            onChangeText={handleQueryChange}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <Pressable onPress={handleClear} hitSlop={8} style={styles.clearBtn}>
              <X size={14} color="#0F172A" />
            </Pressable>
          )}
          {searching && <ActivityIndicator size="small" color={BLUE} style={{ marginLeft: 6 }} />}
        </View>

        {/* My Location button */}
        <Pressable
          onPress={handleUseMyLocation}
          disabled={geolocating}
          style={({ pressed }) => [styles.locationBtn, pressed && { opacity: 0.7 }]}
          accessibilityLabel="Use my location"
        >
          {geolocating
            ? <ActivityIndicator size="small" color="#FFFFFF" />
            : <Navigation size={16} color="#FFFFFF" />
          }
        </Pressable>
      </View>

      {/* Suggestions dropdown */}
      {suggestions.length > 0 && (
        <View style={styles.dropdown}>
          <FlatList
            data={suggestions}
            keyExtractor={(item) => String(item.place_id)}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <Pressable
                onPress={() => handleSelectSuggestion(item)}
                style={({ pressed }) => [styles.suggestion, pressed && styles.suggestionPressed]}
              >
                <MapPin size={14} color="#0F172A" style={{ marginTop: 2 }} />
                <Text style={styles.suggestionText} numberOfLines={2}>
                  {item.display_name}
                </Text>
              </Pressable>
            )}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        </View>
      )}

      {/* Map container — Leaflet mounts into this div via ref */}
      <View style={styles.mapOuter}>
        {!mapReady && !mapError && (
          <View style={styles.mapLoading}>
            <ActivityIndicator size="large" color={BLUE} />
            <Text style={styles.mapLoadingText}>Loading map…</Text>
          </View>
        )}
        {mapError && (
          <View style={styles.mapLoading}>
            <Text style={{ color: '#EF4444', fontSize: 13 }}>{mapError}</Text>
          </View>
        )}
        {/* The div that Leaflet mounts into — rendered via dangerouslySetInnerHTML trick with ref */}
        <div
          // @ts-ignore — web-only element, safe inside Platform.OS === 'web' branch
          ref={mapContainerRef}
          style={{
            width: '100%',
            height: '100%',
            borderRadius: 12,
            overflow: 'hidden',
            opacity: mapReady ? 1 : 0,
          }}
        />
      </View>

      {/* Selected location chip */}
      {value && value.lat !== 0 && (
        <View style={styles.chip}>
          <MapPin size={13} color="#0F172A" />
          <Text style={styles.chipText} numberOfLines={1}>
            {value.address || `${value.lat.toFixed(5)}, ${value.lng.toFixed(5)}`}
          </Text>
        </View>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const BLUE = '#0F4C81';
const ORANGE = '#F97316';

const styles = StyleSheet.create({
  root: {
    width: '100%',
    gap: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 2,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    minHeight: 44,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1E293B',
    paddingVertical: 10,
    outlineStyle: 'none',
  } as never,
  clearBtn: {
    padding: 4,
  },
  locationBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: BLUE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropdown: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    maxHeight: 220,
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    zIndex: 100,
  },
  suggestion: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  suggestionPressed: {
    backgroundColor: '#F8FAFC',
  },
  suggestionText: {
    flex: 1,
    fontSize: 13,
    color: '#334155',
    lineHeight: 18,
  },
  separator: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginHorizontal: 14,
  },
  mapOuter: {
    height: 280,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F1F5F9',
  },
  mapLoading: {
    position: 'absolute',
    inset: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    zIndex: 1,
  } as never,
  mapLoadingText: {
    fontSize: 13,
    color: '#64748B',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  chipText: {
    flex: 1,
    fontSize: 12,
    color: BLUE,
    fontWeight: '500',
  },
  nativeInput: {
    flex: 1,
    fontSize: 14,
    color: '#1E293B',
    paddingVertical: 10,
  },
});
