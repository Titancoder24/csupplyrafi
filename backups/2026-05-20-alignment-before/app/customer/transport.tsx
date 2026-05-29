import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator, FlatList, KeyboardAvoidingView, Platform,
  Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, CheckCircle2, Clock, MapPin, Navigation, Package, Search, Truck, X, ArrowDown } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/services/supabase';
import { useAuth } from '@/services/auth/AuthProvider';
import { FontFamily } from '@/constants/theme';
import { toast } from '@/services/toast';

// ─── design tokens ─────────────────────────────────────────────────────────────
const ACCENT  = '#1D4ED8';
const BG      = '#F1F5F9';
const SURFACE = '#FFFFFF';
const BORDER  = '#E2E8F0';
const TEXT    = '#0F172A';
const TEXTSUB = '#334155';
const MUTED   = '#64748B';
const HINT    = '#94A3B8';

type VehicleClass = 'mini' | 'medium' | 'heavy' | 'x_heavy';

const VEHICLES: { id: VehicleClass; label: string; sub: string; icon: string; baseRate: string }[] = [
  { id: 'mini',    label: 'Mini',    sub: 'Up to 1 ton',  icon: '🚐', baseRate: 'from ₹200' },
  { id: 'medium',  label: 'Medium',  sub: '1 – 5 tons',   icon: '🚛', baseRate: 'from ₹400' },
  { id: 'heavy',   label: 'Heavy',   sub: '5 – 15 tons',  icon: '🚚', baseRate: 'from ₹700' },
  { id: 'x_heavy', label: 'X-Heavy', sub: '15+ tons',     icon: '🏗️', baseRate: 'from ₹1,200' },
];

const PRICE_RATE: Record<VehicleClass, { base: number; perKm: number }> = {
  mini:    { base: 200,  perKm: 12 },
  medium:  { base: 400,  perKm: 20 },
  heavy:   { base: 700,  perKm: 35 },
  x_heavy: { base: 1200, perKm: 55 },
};

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function calcPrice(vehicle: VehicleClass, distKm: number): number {
  const { base, perKm } = PRICE_RATE[vehicle];
  return Math.round(base + perKm * distKm);
}

function statusMeta(status: string): { label: string; bg: string; fg: string } {
  const m: Record<string, { label: string; bg: string; fg: string }> = {
    pending_approval: { label: 'Pending Approval', bg: '#FEF9C3', fg: '#A16207' },
    open:             { label: 'Open',             bg: '#DBEAFE', fg: '#1D4ED8' },
    accepted:         { label: 'Accepted',         bg: '#DCFCE7', fg: '#15803D' },
    in_progress:      { label: 'In Progress',      bg: '#FFF7ED', fg: '#C2410C' },
    completed:        { label: 'Completed',        bg: '#F1F5F9', fg: '#475569' },
    rejected:         { label: 'Rejected',         bg: '#FEE2E2', fg: '#DC2626' },
    cancelled:        { label: 'Cancelled',        bg: '#F1F5F9', fg: '#94A3B8' },
  };
  return m[status] ?? { label: status, bg: '#F1F5F9', fg: MUTED };
}

function fmtINR(n: number) {
  return '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

type MyRequest = {
  id: string;
  pickup_address: string;
  dropoff_address: string;
  distance_km: number | null;
  weight_kg: number | null;
  vehicle_class: VehicleClass;
  status: string;
  offered_price: number | null;
  created_at: string;
};

type NomiResult = { place_id: number; lat: string; lon: string; display_name: string };

async function searchNominatim(q: string): Promise<NomiResult[]> {
  if (!q.trim()) return [];
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=5&countrycodes=in&q=${encodeURIComponent(q)}`,
      { headers: { 'User-Agent': 'CSupply/1.0' } }
    );
    return await r.json();
  } catch { return []; }
}

let leafletReady = false;
let leafletLoading = false;
const leafletCbs: Array<() => void> = [];

function loadLeaflet(cb: () => void) {
  if (leafletReady) { cb(); return; }
  leafletCbs.push(cb);
  if (leafletLoading) return;
  leafletLoading = true;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
  document.head.appendChild(link);
  const script = document.createElement('script');
  script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
  script.onload = () => {
    leafletReady = true; leafletLoading = false;
    leafletCbs.forEach(f => f()); leafletCbs.length = 0;
  };
  document.head.appendChild(script);
}

interface MapFieldProps {
  label: string;
  dotColor: string;
  value: { address: string; lat: number; lng: number } | null;
  onSelect: (v: { address: string; lat: number; lng: number }) => void;
}

function MapField({ label, dotColor, value, onSelect }: MapFieldProps) {
  const isWeb = Platform.OS === 'web';
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [query, setQuery] = useState(value?.address ?? '');
  const [suggestions, setSuggestions] = useState<NomiResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [geolocating, setGeolocating] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const timerRef = useRef<any>(null);

  const initMap = useCallback(() => {
    if (!containerRef.current || mapRef.current) return;
    const L = (window as any).L;
    if (!L) return;
    const lat = value?.lat || 17.385;
    const lng = value?.lng || 78.4867;
    const map = L.map(containerRef.current, { zoomControl: true }).setView([lat, lng], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OSM contributors', maxZoom: 19,
    }).addTo(map);
    const icon = L.divIcon({
      className: '',
      html: `<div style="width:22px;height:28px;background:${dotColor};border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.4)"></div>`,
      iconSize: [22, 28], iconAnchor: [11, 28],
    });
    const marker = L.marker([lat, lng], { draggable: true, icon }).addTo(map);
    markerRef.current = marker;
    mapRef.current = map;

    async function onPosChange(lt: number, ln: number) {
      try {
        const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lt}&lon=${ln}`, { headers: { 'User-Agent': 'CSupply/1.0' } });
        const j = await r.json();
        const addr = j.display_name ?? `${lt.toFixed(5)}, ${ln.toFixed(5)}`;
        setQuery(addr);
        onSelect({ address: addr, lat: lt, lng: ln });
      } catch {
        setQuery(`${lt.toFixed(5)}, ${ln.toFixed(5)}`);
        onSelect({ address: `${lt.toFixed(5)}, ${ln.toFixed(5)}`, lat: lt, lng: ln });
      }
    }

    map.on('click', (e: any) => { const { lat: lt, lng: ln } = e.latlng; marker.setLatLng([lt, ln]); onPosChange(lt, ln); });
    marker.on('dragend', () => { const p = marker.getLatLng(); onPosChange(p.lat, p.lng); });
    setMapReady(true);
  }, []);

  useEffect(() => {
    if (!isWeb) return;
    loadLeaflet(() => initMap());
    return () => { if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; markerRef.current = null; } };
  }, []);

  function flyTo(lat: number, lng: number) {
    if (!mapRef.current || !markerRef.current) return;
    mapRef.current.flyTo([lat, lng], 16, { animate: true, duration: 0.8 });
    markerRef.current.setLatLng([lat, lng]);
  }

  function onQueryChange(t: string) {
    setQuery(t);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!t.trim()) { setSuggestions([]); return; }
    timerRef.current = setTimeout(async () => {
      setSearching(true);
      setSuggestions(await searchNominatim(t));
      setSearching(false);
    }, 400);
  }

  function pickSuggestion(item: NomiResult) {
    const lat = parseFloat(item.lat), lng = parseFloat(item.lon);
    setQuery(item.display_name);
    setSuggestions([]);
    flyTo(lat, lng);
    onSelect({ address: item.display_name, lat, lng });
  }

  function useMyLocation() {
    if (!('geolocation' in navigator)) return;
    setGeolocating(true);
    navigator.geolocation.getCurrentPosition(
      async ({ coords: { latitude: lat, longitude: lng } }) => {
        try {
          const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`, { headers: { 'User-Agent': 'CSupply/1.0' } });
          const j = await r.json();
          const addr = j.display_name ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
          setQuery(addr); flyTo(lat, lng);
          onSelect({ address: addr, lat, lng });
        } catch { }
        setGeolocating(false);
      },
      () => setGeolocating(false),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  if (!isWeb) {
    return (
      <View style={mf.root}>
        <View style={mf.labelRow}><View style={[mf.dot, { backgroundColor: dotColor }]} /><Text style={mf.label}>{label}</Text></View>
        <TextInput style={mf.nativeInput} placeholder="Enter address…" placeholderTextColor={HINT} value={query} onChangeText={t => { setQuery(t); if (t.trim()) onSelect({ address: t, lat: 0, lng: 0 }); }} />
      </View>
    );
  }

  return (
    <View style={mf.root}>
      <View style={mf.labelRow}><View style={[mf.dot, { backgroundColor: dotColor }]} /><Text style={mf.label}>{label}</Text></View>
      <View style={mf.searchRow}>
        <View style={mf.searchWrap}>
          <Search size={15} color="#0F172A" strokeWidth={2} />
          <TextInput style={mf.searchInput} placeholder="Search address…" placeholderTextColor={HINT} value={query} onChangeText={onQueryChange} />
          {query.length > 0 && <Pressable onPress={() => { setQuery(''); setSuggestions([]); }} hitSlop={8}><X size={14} color="#0F172A" /></Pressable>}
          {searching && <ActivityIndicator size="small" color={ACCENT} />}
        </View>
        <Pressable onPress={useMyLocation} disabled={geolocating} style={[mf.locBtn, { backgroundColor: dotColor }]}>
          {geolocating ? <ActivityIndicator size="small" color="#fff" /> : <Navigation size={15} color="#FFFFFF" />}
        </Pressable>
      </View>

      {suggestions.length > 0 && (
        <View style={mf.dropdown}>
          <FlatList
            data={suggestions}
            keyExtractor={i => String(i.place_id)}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <Pressable onPress={() => pickSuggestion(item)} style={({ pressed }) => [mf.suggestion, pressed && { backgroundColor: BG }]}>
                <MapPin size={13} color="#0F172A" style={{ marginTop: 2 }} />
                <Text style={mf.suggestionTxt} numberOfLines={2}>{item.display_name}</Text>
              </Pressable>
            )}
            ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: BORDER, marginHorizontal: 14 }} />}
          />
        </View>
      )}

      <View style={mf.mapOuter}>
        {!mapReady && (
          <View style={mf.mapLoading}>
            <ActivityIndicator color={ACCENT} size="large" />
            <Text style={{ fontSize: 12, color: HINT, marginTop: 6, fontFamily: FontFamily.regular }}>Loading map…</Text>
          </View>
        )}
        <div // @ts-ignore
          ref={containerRef}
          style={{ width: '100%', height: '100%', opacity: mapReady ? 1 : 0, borderRadius: 10 }}
        />
      </View>

      {value && value.lat !== 0 && (
        <View style={[mf.chip, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}>
          <MapPin size={12} color="#0F172A" />
          <Text style={[mf.chipTxt, { color: ACCENT }]} numberOfLines={1}>{value.address}</Text>
        </View>
      )}
    </View>
  );
}

const mf = StyleSheet.create({
  root: { gap: 8 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  label: { fontFamily: FontFamily.bold, fontSize: 13, color: TEXTSUB },
  searchRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  searchWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: SURFACE, borderWidth: 1.5, borderColor: BORDER, borderRadius: 10, paddingHorizontal: 12, minHeight: 46 },
  searchInput: { flex: 1, fontFamily: FontFamily.regular, fontSize: 14, color: TEXT, paddingVertical: 10, outlineStyle: 'none' } as any,
  locBtn: { width: 46, height: 46, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  dropdown: { backgroundColor: SURFACE, borderWidth: 1, borderColor: BORDER, borderRadius: 10, maxHeight: 200, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  suggestion: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingHorizontal: 14, paddingVertical: 10 },
  suggestionTxt: { flex: 1, fontFamily: FontFamily.regular, fontSize: 13, color: TEXT, lineHeight: 18 },
  mapOuter: { height: 220, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: BORDER, backgroundColor: '#F1F5F9' },
  mapLoading: { position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center', zIndex: 1 } as any,
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1 },
  chipTxt: { flex: 1, fontFamily: FontFamily.medium, fontSize: 12 },
  nativeInput: { backgroundColor: SURFACE, borderWidth: 1.5, borderColor: BORDER, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, fontFamily: FontFamily.regular, fontSize: 14, color: TEXT },
});

function IncreaseOfferPanel({ request, onIncrease, loading }: {
  request: MyRequest;
  onIncrease: (id: string, price: number) => void;
  loading: boolean;
}) {
  const current = request.offered_price ?? 0;
  const [newPrice, setNewPrice] = useState(current + 1000);

  return (
    <View style={ip.root}>
      <Text style={ip.title}>Rejected — increase your offer to attract transporters</Text>
      <View style={ip.currentRow}>
        <Text style={ip.currentLabel}>Current offer</Text>
        <Text style={ip.currentPrice}>{fmtINR(current)}</Text>
      </View>
      <View style={ip.bumps}>
        {[500, 1000, 2000].map(bump => {
          const sel = newPrice === current + bump;
          return (
            <Pressable key={bump} onPress={() => setNewPrice(current + bump)} style={[ip.bumpBtn, sel && ip.bumpBtnSel]}>
              <Text style={[ip.bumpTxt, sel && ip.bumpTxtSel]}>+₹{bump}</Text>
            </Pressable>
          );
        })}
      </View>
      <View style={ip.inputRow}>
        <Text style={ip.inputLabel}>New offer (₹)</Text>
        <TextInput
          style={ip.input}
          keyboardType="numeric"
          value={String(newPrice)}
          onChangeText={v => {
            const n = parseInt(v.replace(/[^0-9]/g, ''), 10);
            if (!isNaN(n) && n > 0) setNewPrice(n);
          }}
        />
      </View>
      <Pressable
        onPress={() => onIncrease(request.id, newPrice)}
        disabled={loading || newPrice <= current}
        style={[ip.btn, (loading || newPrice <= current) && { opacity: 0.5 }]}
      >
        {loading
          ? <ActivityIndicator color="#fff" size="small" />
          : <Text style={ip.btnTxt}>Offer {fmtINR(newPrice)} to transporters</Text>}
      </Pressable>
    </View>
  );
}

const ip = StyleSheet.create({
  root: { marginTop: 12, padding: 14, backgroundColor: '#FEF2F2', borderRadius: 10, borderWidth: 1, borderColor: '#FECACA', gap: 10 },
  title: { fontFamily: FontFamily.semiBold, fontSize: 12, color: '#DC2626' },
  currentRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  currentLabel: { fontFamily: FontFamily.regular, fontSize: 12, color: MUTED },
  currentPrice: { fontFamily: FontFamily.bold, fontSize: 16, color: TEXT },
  bumps: { flexDirection: 'row', gap: 8 },
  bumpBtn: { flex: 1, paddingVertical: 9, borderRadius: 8, borderWidth: 1.5, borderColor: BORDER, alignItems: 'center', backgroundColor: SURFACE },
  bumpBtnSel: { borderColor: ACCENT, backgroundColor: '#EFF6FF' },
  bumpTxt: { fontFamily: FontFamily.semiBold, fontSize: 12, color: MUTED },
  bumpTxtSel: { color: ACCENT },
  inputRow: { gap: 4 },
  inputLabel: { fontFamily: FontFamily.semiBold, fontSize: 11, color: MUTED },
  input: { backgroundColor: SURFACE, borderWidth: 1.5, borderColor: BORDER, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9, fontFamily: FontFamily.regular, fontSize: 14, color: TEXT },
  btn: { height: 46, borderRadius: 10, backgroundColor: ACCENT, alignItems: 'center', justifyContent: 'center' },
  btnTxt: { fontFamily: FontFamily.bold, fontSize: 13, color: '#fff' },
});

export default function CustomerTransportScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [tab, setTab] = useState<'form' | 'requests'>('form');
  const [pickup, setPickup]   = useState<{ address: string; lat: number; lng: number } | null>(null);
  const [dropoff, setDropoff] = useState<{ address: string; lat: number; lng: number } | null>(null);
  const [description, setDesc]  = useState('');
  const [weight, setWeight]     = useState('');
  const [vehicle, setVehicle]   = useState<VehicleClass | null>(null);
  const [notes, setNotes]       = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState('');
  const [justSubmitted, setJustSubmitted] = useState(false);
  const [myRequests, setMyRequests] = useState<MyRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [increasing, setIncreasing] = useState<string | null>(null);

  const priceEstimate = useMemo(() => {
    if (!vehicle || !pickup || !dropoff) return null;
    if (!pickup.lat || !dropoff.lat || pickup.lat === 0 || dropoff.lat === 0) return null;
    const km = haversineKm(pickup.lat, pickup.lng, dropoff.lat, dropoff.lng);
    return { km: Math.round(km * 10) / 10, price: calcPrice(vehicle, km) };
  }, [vehicle, pickup, dropoff]);

  const fetchMyRequests = useCallback(async (silent = false) => {
    if (!silent) setLoadingRequests(true);
    try {
      let uid = user?.id;
      if (!uid) {
        const { data: sd } = await supabase.auth.getSession();
        uid = sd.session?.user?.id ?? undefined;
      }
      if (!uid) return;
      const { data } = await supabase
        .from('transport_requests')
        .select('id, pickup_address, dropoff_address, distance_km, weight_kg, vehicle_class, status, offered_price, created_at')
        .eq('requester_id', uid)
        .order('created_at', { ascending: false })
        .limit(20);
      setMyRequests((data ?? []) as MyRequest[]);
    } finally {
      setLoadingRequests(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchMyRequests();
    if (!user?.id) return;
    const channel = supabase
      .channel(`customer-transport-rt:${user.id}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'transport_requests',
        filter: `requester_id=eq.${user.id}`,
      }, (payload: any) => {
        const oldStatus = payload.old?.status;
        const newStatus = payload.new?.status;
        if (newStatus !== oldStatus) {
          if (newStatus === 'open') toast.success('Request Approved!', 'Your transport request is now live — transporters can see it.');
          else if (newStatus === 'rejected' && oldStatus === 'pending_approval') toast.error('Rejected by Admin', 'Your request was not approved. You can increase the offer and re-submit.');
          else if (newStatus === 'rejected' && oldStatus === 'open') toast.error('No Transporter Accepted', 'Increase your offer price to attract transporters.');
          else if (newStatus === 'pending_approval' && oldStatus === 'rejected') toast.success('Re-submitted!', 'Your updated offer has been sent to admin for approval.');
          else if (newStatus === 'accepted') toast.success('Transport Captain Approved!', 'A transporter has accepted your request and will contact you shortly.');
        }
        fetchMyRequests(true);
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'transport_requests', filter: `requester_id=eq.${user.id}` }, () => fetchMyRequests(true))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchMyRequests, user?.id]);

  async function handleSubmit() {
    setError('');
    if (!pickup?.address.trim())  { setError('Select a pickup location on the map'); return; }
    if (!dropoff?.address.trim()) { setError('Select a dropoff location on the map'); return; }
    if (!description.trim())      { setError('Describe the goods'); return; }
    if (!weight.trim())           { setError('Enter weight in kg'); return; }
    if (!vehicle)                 { setError('Select vehicle type'); return; }
    const w = parseFloat(weight);
    if (isNaN(w) || w <= 0)       { setError('Enter a valid weight'); return; }

    setSubmitting(true);
    try {
      let uid = user?.id;
      if (!uid) {
        const { data: sd } = await supabase.auth.getSession();
        uid = sd.session?.user?.id ?? undefined;
      }
      if (!uid) { setError('Please log in to continue'); return; }

      let distKm: number | null = null;
      let offeredPrice: number | null = null;
      if (pickup.lat !== 0 && dropoff.lat !== 0) {
        distKm = Math.round(haversineKm(pickup.lat, pickup.lng, dropoff.lat, dropoff.lng) * 10) / 10;
        offeredPrice = calcPrice(vehicle, distKm);
      }

      const { data: inserted, error: dbErr } = await supabase
        .from('transport_requests')
        .insert({
          requester_id: uid, requester_role: 'customer',
          pickup_address: pickup.address, pickup_lat: pickup.lat, pickup_lng: pickup.lng,
          dropoff_address: dropoff.address, dropoff_lat: dropoff.lat, dropoff_lng: dropoff.lng,
          distance_km: distKm, offered_price: offeredPrice,
          goods_description: description.trim(), weight_kg: w,
          vehicle_class: vehicle, notes: notes.trim() || null, status: 'pending_approval',
        })
        .select('id, pickup_address, dropoff_address, distance_km, weight_kg, vehicle_class, status, offered_price, created_at')
        .single();

      if (dbErr) throw new Error(dbErr.message || 'Failed to submit request. Please try again.');
      if (inserted) setMyRequests(prev => [inserted as MyRequest, ...prev]);

      setPickup(null); setDropoff(null); setDesc(''); setWeight(''); setVehicle(null); setNotes('');
      setJustSubmitted(true); setTab('requests');
      fetchMyRequests(true);
      setTimeout(() => setJustSubmitted(false), 5000);
    } catch (e: any) {
      setError(e?.message ?? 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  async function increaseOffer(requestId: string, newPrice: number) {
    setIncreasing(requestId);
    try {
      const { error } = await supabase.rpc('increase_transport_offer', { p_request_id: requestId, p_new_price: newPrice });
      if (error) toast.error('Failed to update offer', error.message);
      else {
        setMyRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: 'open', offered_price: newPrice } : r));
        toast.success('Offer Updated', 'Transporters have been notified');
      }
    } finally { setIncreasing(null); }
  }

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#0F4C81' }}>
      {/* Header */}
      <View style={s.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={s.backBtn}>
          <ArrowLeft size={20} color="#FFFFFF" strokeWidth={2.5} />
        </Pressable>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>Book Transport</Text>
          <Text style={s.headerSub}>Customer Portal</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Tab bar */}
      <View style={s.tabWrap}>
        <View style={s.tabBar}>
          <Pressable onPress={() => setTab('form')} style={[s.tab, tab === 'form' && s.tabActive]}>
            <Text style={[s.tabTxt, tab === 'form' && s.tabTxtActive]}>New Request</Text>
          </Pressable>
          <Pressable onPress={() => setTab('requests')} style={[s.tab, tab === 'requests' && s.tabActive]}>
            <Text style={[s.tabTxt, tab === 'requests' && s.tabTxtActive]}>
              My Requests{myRequests.length > 0 ? ` (${myRequests.length})` : ''}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Form tab */}
      {tab === 'form' && (
        <KeyboardAvoidingView style={{ flex: 1, backgroundColor: BG }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

            {/* Route section */}
            <View style={s.sectionLabel}><Text style={s.sectionLabelTxt}>Route</Text></View>
            <View style={s.card}>
              <MapField label="Pickup Location" dotColor="#15803D" value={pickup} onSelect={setPickup} />
              <View style={s.routeDivider}>
                <View style={s.routeDividerLine} />
                <View style={s.routeDividerIcon}><ArrowDown size={12} color="#0F172A" strokeWidth={2} /></View>
                <View style={s.routeDividerLine} />
              </View>
              <MapField label="Dropoff Location" dotColor="#EF4444" value={dropoff} onSelect={setDropoff} />
            </View>

            {/* Goods section */}
            <View style={s.sectionLabel}><Text style={s.sectionLabelTxt}>Goods Details</Text></View>
            <View style={s.card}>
              <View style={s.fieldGroup}>
                <View style={s.fieldLabelRow}>
                  <Package size={14} color="#0F172A" strokeWidth={2} />
                  <Text style={s.fieldLabel}>Description *</Text>
                </View>
                <TextInput style={[s.input, { minHeight: 72, textAlignVertical: 'top', paddingTop: 12 }]} placeholder="e.g. 50 bags OPC cement, TMT steel rods…" placeholderTextColor={HINT} value={description} onChangeText={setDesc} multiline />
              </View>
              <View style={s.fieldGroup}>
                <Text style={s.fieldLabel}>Total Weight (kg) *</Text>
                <TextInput style={s.input} placeholder="e.g. 2500" placeholderTextColor={HINT} value={weight} onChangeText={v => setWeight(v.replace(/[^0-9.]/g, ''))} keyboardType="decimal-pad" />
              </View>
            </View>

            {/* Vehicle section */}
            <View style={s.sectionLabel}><Text style={s.sectionLabelTxt}>Vehicle Type *</Text></View>
            <View style={s.card}>
              {VEHICLES.map(v => {
                const sel = vehicle === v.id;
                return (
                  <Pressable key={v.id} onPress={() => setVehicle(v.id)} style={[s.vehicleCard, sel && s.vehicleCardSel]}>
                    <Text style={s.vehicleEmoji}>{v.icon}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.vehicleLabel, sel && { color: ACCENT }]}>{v.label}</Text>
                      <Text style={s.vehicleSub}>{v.sub}</Text>
                    </View>
                    <Text style={[s.vehicleRate, sel && { color: ACCENT }]}>{v.baseRate}</Text>
                    <View style={[s.radio, sel && s.radioSel]}>{sel && <View style={s.radioDot} />}</View>
                  </Pressable>
                );
              })}

              {priceEstimate && (
                <View style={s.priceCard}>
                  <View>
                    <Text style={s.priceLabel}>Estimated Total</Text>
                    <Text style={s.priceSub}>{priceEstimate.km} km · auto-calculated</Text>
                  </View>
                  <Text style={s.priceValue}>{fmtINR(priceEstimate.price)}</Text>
                </View>
              )}
            </View>

            {/* Notes section */}
            <View style={s.sectionLabel}><Text style={s.sectionLabelTxt}>Additional Notes</Text></View>
            <View style={s.card}>
              <TextInput style={[s.input, { minHeight: 72, textAlignVertical: 'top', paddingTop: 12 }]} placeholder="Special handling, loading instructions, delivery windows…" placeholderTextColor={HINT} value={notes} onChangeText={setNotes} multiline />
            </View>

            {error ? (
              <View style={s.errorBox}>
                <Text style={s.errorTxt}>{error}</Text>
              </View>
            ) : null}

            <Pressable
              onPress={handleSubmit}
              disabled={submitting}
              style={({ pressed }) => [s.submitBtn, submitting && { opacity: 0.6 }, pressed && !submitting && { opacity: 0.88 }]}
            >
              {submitting
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={s.submitTxt}>Submit Transport Request</Text>}
            </Pressable>

            <View style={{ height: 32 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      )}

      {/* Requests tab */}
      {tab === 'requests' && (
        <ScrollView style={{ flex: 1, backgroundColor: BG }} contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>

          {justSubmitted && (
            <View style={s.successBanner}>
              <CheckCircle2 size={18} color="#0F172A" strokeWidth={2.5} />
              <Text style={s.successBannerTxt}>Request submitted! Pending admin approval before transporters can see it.</Text>
            </View>
          )}

          {loadingRequests ? (
            <View style={s.emptyBox}>
              <ActivityIndicator color={ACCENT} size="large" />
            </View>
          ) : myRequests.length === 0 ? (
            <View style={s.emptyBox}>
              <View style={s.emptyIconBox}>
                <Truck size={32} color="#0F172A" strokeWidth={1.5} />
              </View>
              <Text style={s.emptyTxt}>No requests yet</Text>
              <Text style={s.emptySubTxt}>Submit your first transport request to get started</Text>
              <Pressable onPress={() => setTab('form')} style={s.emptyBtn}>
                <Text style={s.emptyBtnTxt}>+ New Request</Text>
              </Pressable>
            </View>
          ) : (
            myRequests.map(req => {
              const sm = statusMeta(req.status);
              return (
                <View key={req.id} style={s.reqCard}>
                  {/* Route timeline */}
                  <View style={s.routeTimeline}>
                    <View style={s.timelineLeft}>
                      <View style={[s.timelineDot, { backgroundColor: '#15803D' }]} />
                      <View style={s.timelineConnector} />
                      <View style={[s.timelineDot, { backgroundColor: '#EF4444' }]} />
                    </View>
                    <View style={s.timelineContent}>
                      <Text style={s.timelineAddr} numberOfLines={2}>{req.pickup_address}</Text>
                      <View style={{ height: 10 }} />
                      <Text style={s.timelineAddr} numberOfLines={2}>{req.dropoff_address}</Text>
                    </View>
                  </View>

                  {/* Meta chips */}
                  <View style={s.reqMeta}>
                    <View style={[s.statusBadge, { backgroundColor: sm.bg }]}>
                      <Text style={[s.statusBadgeTxt, { color: sm.fg }]}>{sm.label}</Text>
                    </View>
                    {req.distance_km ? <View style={s.metaChip}><Text style={s.metaChipTxt}>{req.distance_km} km</Text></View> : null}
                    {req.offered_price != null ? <Text style={s.reqPrice}>{fmtINR(req.offered_price)}</Text> : null}
                    <Text style={s.reqDate}>{new Date(req.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</Text>
                  </View>

                  {req.status === 'accepted' && (
                    <View style={s.statusBanner}>
                      <CheckCircle2 size={14} color="#0F172A" strokeWidth={2.5} />
                      <Text style={s.statusBannerTxt}>A transporter has accepted your request</Text>
                    </View>
                  )}
                  {req.status === 'in_progress' && (
                    <View style={[s.statusBanner, { backgroundColor: '#FFF7ED', borderColor: '#FED7AA' }]}>
                      <Clock size={14} color="#0F172A" strokeWidth={2.5} />
                      <Text style={[s.statusBannerTxt, { color: '#C2410C' }]}>Transport is in progress</Text>
                    </View>
                  )}
                  {req.status === 'rejected' && (
                    <IncreaseOfferPanel request={req} onIncrease={increaseOffer} loading={increasing === req.id} />
                  )}
                </View>
              );
            })
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header: { backgroundColor: '#0F4C81', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 16, paddingTop: 6, gap: 12 },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.1)' },
  headerCenter: { flex: 1, alignItems: 'center', gap: 2 },
  headerTitle: { fontFamily: FontFamily.bold, fontSize: 17, color: '#fff', letterSpacing: -0.2 },
  headerSub:   { fontFamily: FontFamily.regular, fontSize: 11, color: 'rgba(255,255,255,0.6)' },

  tabWrap: { backgroundColor: '#0F4C81', paddingHorizontal: 20, paddingBottom: 16 },
  tabBar: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 12, padding: 3 },
  tab: { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: 10 },
  tabActive: { backgroundColor: '#fff' },
  tabTxt: { fontFamily: FontFamily.semiBold, fontSize: 13, color: 'rgba(255,255,255,0.65)' },
  tabTxtActive: { color: '#0F4C81' },

  body: { padding: 16, paddingTop: 20, gap: 4 },
  sectionLabel: { paddingHorizontal: 2, paddingBottom: 8, paddingTop: 12 },
  sectionLabelTxt: { fontFamily: FontFamily.bold, fontSize: 11, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.8 },

  card: { backgroundColor: SURFACE, borderRadius: 14, borderWidth: 1, borderColor: BORDER, padding: 16, gap: 14, shadowColor: '#0F172A', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },

  routeDivider: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  routeDividerLine: { flex: 1, height: 1, backgroundColor: BORDER },
  routeDividerIcon: { width: 24, height: 24, borderRadius: 12, backgroundColor: BG, borderWidth: 1, borderColor: BORDER, alignItems: 'center', justifyContent: 'center' },

  fieldGroup: { gap: 8 },
  fieldLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  fieldLabel: { fontFamily: FontFamily.semiBold, fontSize: 12, color: TEXTSUB },
  input: { backgroundColor: BG, borderWidth: 1.5, borderColor: BORDER, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, fontFamily: FontFamily.regular, fontSize: 14, color: TEXT, minHeight: 46 },

  vehicleCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: BG, borderWidth: 1.5, borderColor: BORDER, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14 },
  vehicleCardSel: { backgroundColor: '#EFF6FF', borderColor: ACCENT },
  vehicleEmoji: { fontSize: 24 },
  vehicleLabel: { fontFamily: FontFamily.bold, fontSize: 14, color: TEXT },
  vehicleSub:   { fontFamily: FontFamily.regular, fontSize: 11, color: HINT, marginTop: 2 },
  vehicleRate:  { fontFamily: FontFamily.semiBold, fontSize: 11, color: MUTED },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: BORDER, alignItems: 'center', justifyContent: 'center' },
  radioSel: { borderColor: ACCENT, backgroundColor: ACCENT },
  radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff' },

  priceCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#EFF6FF', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    borderWidth: 1, borderColor: '#BFDBFE',
  },
  priceLabel: { fontFamily: FontFamily.bold, fontSize: 13, color: ACCENT },
  priceSub:   { fontFamily: FontFamily.regular, fontSize: 11, color: MUTED, marginTop: 2 },
  priceValue: { fontFamily: FontFamily.bold, fontSize: 24, color: ACCENT, letterSpacing: -0.5 },

  errorBox: { backgroundColor: '#FEF2F2', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: '#FECACA' },
  errorTxt: { fontFamily: FontFamily.semiBold, fontSize: 13, color: '#DC2626' },

  submitBtn: {
    height: 56, borderRadius: 14, backgroundColor: ACCENT,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: ACCENT, shadowOpacity: 0.4, shadowRadius: 14, shadowOffset: { width: 0, height: 5 }, elevation: 7,
    marginTop: 8,
  },
  submitTxt: { fontFamily: FontFamily.bold, fontSize: 16, color: '#fff', letterSpacing: 0.2 },

  successBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: '#F0FDF4', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#BBF7D0' },
  successBannerTxt: { flex: 1, fontFamily: FontFamily.semiBold, fontSize: 13, color: '#15803D', lineHeight: 18 },

  emptyBox: { backgroundColor: SURFACE, borderRadius: 14, padding: 40, alignItems: 'center', gap: 10, borderWidth: 1, borderColor: BORDER },
  emptyIconBox: { width: 64, height: 64, borderRadius: 32, backgroundColor: BG, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  emptyTxt: { fontFamily: FontFamily.bold, fontSize: 16, color: TEXT },
  emptySubTxt: { fontFamily: FontFamily.regular, fontSize: 13, color: MUTED, textAlign: 'center' },
  emptyBtn: { marginTop: 8, backgroundColor: ACCENT, paddingHorizontal: 28, paddingVertical: 12, borderRadius: 99 },
  emptyBtnTxt: { fontFamily: FontFamily.bold, fontSize: 14, color: '#fff' },

  reqCard: { backgroundColor: SURFACE, borderRadius: 14, borderWidth: 1, borderColor: BORDER, padding: 16, shadowColor: '#0F172A', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },

  routeTimeline: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  timelineLeft: { alignItems: 'center', paddingTop: 3, gap: 0 },
  timelineDot: { width: 10, height: 10, borderRadius: 5 },
  timelineConnector: { width: 1.5, flex: 1, backgroundColor: '#CBD5E1', minHeight: 18, marginVertical: 3 },
  timelineContent: { flex: 1, gap: 0 },
  timelineAddr: { fontFamily: FontFamily.regular, fontSize: 13, color: TEXT, lineHeight: 18 },

  reqMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99 },
  statusBadgeTxt: { fontFamily: FontFamily.bold, fontSize: 11 },
  metaChip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 99, backgroundColor: BG },
  metaChipTxt: { fontFamily: FontFamily.medium, fontSize: 11, color: MUTED },
  reqPrice: { fontFamily: FontFamily.bold, fontSize: 14, color: ACCENT, marginLeft: 'auto' as never },
  reqDate: { fontFamily: FontFamily.regular, fontSize: 11, color: HINT },

  statusBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, backgroundColor: '#F0FDF4', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: '#BBF7D0' },
  statusBannerTxt: { fontFamily: FontFamily.semiBold, fontSize: 12, color: '#15803D' },
});
