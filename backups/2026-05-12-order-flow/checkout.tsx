import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, TextInput,
  ActivityIndicator, Platform, StatusBar, KeyboardAvoidingView, FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { ArrowLeft, MapPin, Search, X, Navigation, CheckCircle2, ShoppingBag, ShieldCheck } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/services/supabase';
import { useAuth } from '@/services/auth/AuthProvider';
import { useCart } from '@/stores/cart';
import { toast } from '@/services/toast';
import { FontFamily } from '@/constants/theme';
import { getProductImage } from '@/lib/productImage';

const PRIMARY = '#1D4ED8', BG = '#F8FAFC', SURF = '#FFFFFF';
const BORDER = '#E2E8F0', TEXT = '#0F172A', MUTED = '#64748B', HINT = '#94A3B8', GREEN = '#15803D';

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

let leafletReady = false, leafletLoading = false;
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

function DeliveryMap({
  value, onSelect,
}: {
  value: { address: string; lat: number; lng: number } | null;
  onSelect: (v: { address: string; lat: number; lng: number }) => void;
}) {
  const isWeb = Platform.OS === 'web';
  const mapRef = useRef<any>(null), markerRef = useRef<any>(null);
  const containerRef = useRef<any>(null);
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
    const lat = value?.lat || 17.385, lng = value?.lng || 78.4867;
    const map = L.map(containerRef.current, { zoomControl: true }).setView([lat, lng], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OSM contributors', maxZoom: 19,
    }).addTo(map);
    const icon = L.divIcon({
      className: '',
      html: `<div style="width:24px;height:30px;background:${PRIMARY};border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.4)"></div>`,
      iconSize: [24, 30], iconAnchor: [12, 30],
    });
    const marker = L.marker([lat, lng], { draggable: true, icon }).addTo(map);
    markerRef.current = marker;
    mapRef.current = map;

    async function onPos(lt: number, ln: number) {
      try {
        const r = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lt}&lon=${ln}`,
          { headers: { 'User-Agent': 'CSupply/1.0' } }
        );
        const j = await r.json();
        const addr = j.display_name ?? `${lt.toFixed(5)}, ${ln.toFixed(5)}`;
        setQuery(addr);
        onSelect({ address: addr, lat: lt, lng: ln });
      } catch {
        setQuery(`${lt.toFixed(5)}, ${ln.toFixed(5)}`);
        onSelect({ address: `${lt.toFixed(5)}, ${ln.toFixed(5)}`, lat: lt, lng: ln });
      }
    }

    map.on('click', (e: any) => {
      const { lat: lt, lng: ln } = e.latlng;
      marker.setLatLng([lt, ln]);
      onPos(lt, ln);
    });
    marker.on('dragend', () => {
      const p = marker.getLatLng();
      onPos(p.lat, p.lng);
    });
    setMapReady(true);
  }, []);

  useEffect(() => {
    if (!isWeb) return;
    loadLeaflet(() => initMap());
    return () => {
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; markerRef.current = null; }
    };
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
          const r = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
            { headers: { 'User-Agent': 'CSupply/1.0' } }
          );
          const j = await r.json();
          const addr = j.display_name ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
          setQuery(addr); flyTo(lat, lng);
          onSelect({ address: addr, lat, lng });
        } catch {}
        setGeolocating(false);
      },
      () => setGeolocating(false),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  if (!isWeb) {
    return (
      <View style={dm.root}>
        <TextInput
          style={dm.nativeInput}
          placeholder="Enter full delivery address..."
          placeholderTextColor={HINT}
          value={query}
          onChangeText={t => { setQuery(t); if (t.trim()) onSelect({ address: t, lat: 0, lng: 0 }); }}
          multiline
        />
      </View>
    );
  }

  return (
    <View style={dm.root}>
      <View style={dm.searchRow}>
        <View style={dm.searchWrap}>
          <Search size={15} color={HINT} strokeWidth={2} />
          <TextInput
            style={dm.searchInput}
            placeholder="Search delivery address..."
            placeholderTextColor={HINT}
            value={query}
            onChangeText={onQueryChange}
          />
          {query.length > 0 && (
            <Pressable onPress={() => { setQuery(''); setSuggestions([]); }} hitSlop={8}>
              <X size={14} color={HINT} />
            </Pressable>
          )}
          {searching && <ActivityIndicator size="small" color={PRIMARY} />}
        </View>
        <Pressable style={dm.locBtn} onPress={useMyLocation} disabled={geolocating}>
          {geolocating
            ? <ActivityIndicator size="small" color="#fff" />
            : <Navigation size={15} color="#fff" />}
        </Pressable>
      </View>

      {suggestions.length > 0 && (
        <View style={dm.dropdown}>
          <FlatList
            data={suggestions}
            keyExtractor={i => String(i.place_id)}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <Pressable
                onPress={() => pickSuggestion(item)}
                style={({ pressed }) => [dm.suggestion, pressed && { backgroundColor: BG }]}
              >
                <MapPin size={13} color={PRIMARY} style={{ marginTop: 2 }} />
                <Text style={dm.suggestionTxt} numberOfLines={2}>{item.display_name}</Text>
              </Pressable>
            )}
            ItemSeparatorComponent={() => (
              <View style={{ height: 1, backgroundColor: BORDER, marginHorizontal: 14 }} />
            )}
          />
        </View>
      )}

      <View style={dm.mapOuter}>
        {!mapReady && (
          <View style={dm.mapLoading}>
            <ActivityIndicator color={PRIMARY} size="large" />
            <Text style={{ fontSize: 12, color: HINT, marginTop: 6, fontFamily: FontFamily.regular }}>
              Loading map...
            </Text>
          </View>
        )}
        <div
          // @ts-ignore
          ref={containerRef}
          style={{ width: '100%', height: '100%', opacity: mapReady ? 1 : 0, borderRadius: 12 } as any}
        />
      </View>

      {value && value.lat !== 0 && (
        <View style={dm.chip}>
          <MapPin size={12} color={PRIMARY} />
          <Text style={dm.chipTxt} numberOfLines={1}>{value.address}</Text>
        </View>
      )}
    </View>
  );
}

const dm = StyleSheet.create({
  root: { gap: 8 },
  searchRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  searchWrap: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: SURF, borderWidth: 1.5, borderColor: BORDER, borderRadius: 10,
    paddingHorizontal: 12, minHeight: 46,
  },
  searchInput: {
    flex: 1, fontFamily: FontFamily.regular, fontSize: 14, color: TEXT, paddingVertical: 10,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {}),
  },
  locBtn: { width: 46, height: 46, borderRadius: 10, backgroundColor: PRIMARY, alignItems: 'center', justifyContent: 'center' },
  dropdown: {
    backgroundColor: SURF, borderWidth: 1, borderColor: BORDER, borderRadius: 10,
    maxHeight: 200, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 4,
  },
  suggestion: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingHorizontal: 14, paddingVertical: 10 },
  suggestionTxt: { flex: 1, fontFamily: FontFamily.regular, fontSize: 13, color: TEXT, lineHeight: 18 },
  mapOuter: { height: 240, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: BORDER, backgroundColor: '#F1F5F9' },
  mapLoading: { position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center', zIndex: 1 } as any,
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#EFF6FF', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7,
    borderWidth: 1, borderColor: '#BFDBFE',
  },
  chipTxt: { flex: 1, fontFamily: FontFamily.medium, fontSize: 12, color: PRIMARY },
  nativeInput: {
    backgroundColor: SURF, borderWidth: 1.5, borderColor: BORDER, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12, fontFamily: FontFamily.regular, fontSize: 14,
    color: TEXT, minHeight: 80, textAlignVertical: 'top',
  },
});

export default function Checkout() {
  const router = useRouter();
  const { user } = useAuth();
  const items = useCart(s => s.items);
  const clear = useCart(s => s.clear);

  const [deliveryLoc, setDeliveryLoc] = useState<{ address: string; lat: number; lng: number } | null>(null);
  const [note,        setNote]        = useState('');
  const [placing,     setPlacing]     = useState(false);
  const [error,       setError]       = useState('');

  const subtotal = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  const delivery = subtotal > 50000 ? 0 : 500;
  const total    = subtotal + delivery;

  async function placeOrder() {
    setError('');
    if (!deliveryLoc?.address.trim()) { setError('Please select a delivery location on the map'); return; }
    if (!user?.id) { setError('Please log in to continue'); return; }
    if (items.length === 0) { setError('Your cart is empty'); return; }

    setPlacing(true);
    try {
      const { data: addrRow, error: addrErr } = await supabase
        .from('addresses')
        .insert({
          profile_id: user.id, line1: deliveryLoc.address, city: '', state: '',
          lat: deliveryLoc.lat, lng: deliveryLoc.lng, is_default: false,
        })
        .select('id')
        .single();
      if (addrErr) throw new Error('Failed to save address: ' + addrErr.message);

      const vendorId = items[0].vendorId ?? null;

      const { data: order, error: orderErr } = await supabase
        .from('orders')
        .insert({
          customer_id: user.id,
          vendor_id: vendorId,
          status: 'placed',
          payment_status: 'pending',
          subtotal: subtotal,
          delivery_charge: delivery,
          commission: 0,
          gst_amount: 0,
          total_amount: total,
          is_demo: false,
          delivery_address_id: addrRow.id,
          notes: note.trim() || null,
        })
        .select('id, order_number')
        .single();
      if (orderErr) throw new Error(orderErr.message || 'Failed to place order');

      const orderItems = items.map(i => ({
        order_id: order.id, product_id: i.productId, product_name: i.name,
        quantity: i.quantity, unit: i.unit, unit_price: i.unitPrice,
        line_total: i.unitPrice * i.quantity,
      }));
      const { error: itemsErr } = await supabase.from('order_items').insert(orderItems);
      if (itemsErr) throw new Error('Failed to save order items: ' + itemsErr.message);

      clear();
      toast.success('Order Placed!', `Order #${order.order_number} placed. Waiting for admin approval.`);
      router.replace('/customer/orders');
    } catch (e: any) {
      setError(e?.message ?? 'Something went wrong. Please try again.');
    } finally {
      setPlacing(false);
    }
  }

  if (items.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: BG, alignItems: 'center', justifyContent: 'center', gap: 14 }}>
        <ShoppingBag size={52} color={HINT} strokeWidth={1.4} />
        <Text style={{ fontFamily: FontFamily.bold, fontSize: 18, color: TEXT }}>Cart is empty</Text>
        <Pressable
          onPress={() => router.back()}
          style={{ backgroundColor: PRIMARY, borderRadius: 10, paddingHorizontal: 24, paddingVertical: 12 }}
        >
          <Text style={{ fontFamily: FontFamily.bold, fontSize: 14, color: '#fff' }}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BG }} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor={SURF} />

      {/* Header */}
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn} hitSlop={12}>
          <ArrowLeft size={20} color={TEXT} strokeWidth={2.5} />
        </Pressable>
        <Text style={s.headerTitle}>Checkout</Text>
        <View style={{ width: 38 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={s.body}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Order Items */}
          <View style={s.section}>
            <View style={s.summaryHeader}>
              <Text style={s.sectionTitle}>Order Summary</Text>
              <View style={s.countChip}>
                <Text style={s.countChipTxt}>
                  {items.length} {items.length === 1 ? 'item' : 'items'}
                </Text>
              </View>
            </View>
            <View style={s.itemList}>
              {items.map((item, idx) => (
                <View
                  key={item.productId}
                  style={[s.itemRow, idx < items.length - 1 && s.itemRowDivider]}
                >
                  <View style={s.thumbWrap}>
                    <Image
                      source={{ uri: getProductImage({ name: item.name, images: item.image ? [item.image] : null }, { size: 200 }) }}
                      style={s.thumb}
                      contentFit="cover"
                      transition={150}
                    />
                  </View>
                  <View style={s.itemBody}>
                    <Text style={s.itemName} numberOfLines={2}>{item.name}</Text>
                    <Text style={s.itemMeta}>
                      {item.quantity} {item.unit}{'  ·  '}
                      <Text style={s.itemMetaStrong}>₹{item.unitPrice.toLocaleString('en-IN')}</Text>
                      <Text style={s.itemMeta}> / {item.unit}</Text>
                    </Text>
                  </View>
                  <Text style={s.itemTotal}>₹{(item.unitPrice * item.quantity).toLocaleString('en-IN')}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Delivery Location */}
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <MapPin size={16} color={PRIMARY} strokeWidth={2} />
              <Text style={s.sectionTitle}>Delivery Location</Text>
            </View>
            <Text style={s.sectionSub}>
              Pin your exact delivery location on the map or search for an address
            </Text>
            <DeliveryMap value={deliveryLoc} onSelect={setDeliveryLoc} />
          </View>

          {/* Special Instructions */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Special Instructions (Optional)</Text>
            <TextInput
              style={s.noteInput}
              placeholder="E.g. call before delivery, gate code, floor number..."
              placeholderTextColor={HINT}
              value={note}
              onChangeText={setNote}
              multiline
              textAlignVertical="top"
            />
          </View>

          {/* Price summary */}
          <View style={s.priceCard}>
            <Text style={s.priceTit}>Price Details</Text>
            <View style={s.priceRow}>
              <Text style={s.priceLbl}>Subtotal</Text>
              <Text style={s.priceVal}>Rs.{subtotal.toLocaleString('en-IN')}</Text>
            </View>
            <View style={s.priceRow}>
              <Text style={s.priceLbl}>Delivery</Text>
              <Text style={[s.priceVal, delivery === 0 && { color: GREEN }]}>
                {delivery === 0 ? 'Free' : `Rs.${delivery}`}
              </Text>
            </View>
            <View style={s.priceDivider} />
            <View style={s.priceRow}>
              <Text style={s.priceTotal}>Total Payable</Text>
              <Text style={s.priceTotalVal}>Rs.{total.toLocaleString('en-IN')}</Text>
            </View>
            {delivery === 0 && (
              <View style={s.freeDeliveryBadge}>
                <CheckCircle2 size={12} color={GREEN} strokeWidth={2.5} />
                <Text style={s.freeDeliveryTxt}>Free delivery on orders above Rs.50,000</Text>
              </View>
            )}
          </View>

          {/* What happens next */}
          <View style={s.flowBox}>
            <Text style={s.flowTitle}>What happens next?</Text>
            {[
              'Your order is sent to Admin for approval',
              'Admin approves — Vendor is notified',
              'Vendor accepts & books transport',
              'Transporter assigned to your delivery',
              'Track everything in real-time',
            ].map((step, i) => (
              <View key={i} style={s.flowRow}>
                <View style={s.flowNum}>
                  <Text style={s.flowNumTxt}>{i + 1}</Text>
                </View>
                <Text style={s.flowTxt}>{step}</Text>
              </View>
            ))}
          </View>

          {error ? (
            <View style={s.errorBox}>
              <Text style={s.errorTxt}>{error}</Text>
            </View>
          ) : null}

          <Pressable
            style={[s.placeBtn, placing && { opacity: 0.65 }]}
            onPress={placeOrder}
            disabled={placing}
          >
            {placing
              ? <ActivityIndicator color="#fff" size="small" />
              : (
                <>
                  <CheckCircle2 size={20} color="#fff" strokeWidth={2.5} />
                  <Text style={s.placeBtnTxt}>
                    Place Order - Rs.{total.toLocaleString('en-IN')}
                  </Text>
                </>
              )}
          </Pressable>

          <View style={{ height: 20 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: SURF,
    paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: BORDER, gap: 10,
  },
  backBtn: { width: 38, height: 38, borderRadius: 10, backgroundColor: BG, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontFamily: FontFamily.bold, fontSize: 17, color: TEXT },
  body: { padding: 16, gap: 14 },
  section: {
    backgroundColor: SURF, borderRadius: 16, padding: 16, gap: 12,
    borderWidth: 1, borderColor: BORDER,
    shadowColor: '#0F172A', shadowOpacity: 0.04, shadowRadius: 8,
    shadowOffset: { width: 0, height: 1 }, elevation: 1,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { fontFamily: FontFamily.bold, fontSize: 15, color: TEXT, letterSpacing: -0.2 },
  sectionSub: { fontFamily: FontFamily.regular, fontSize: 12, color: MUTED, marginTop: -6 },

  summaryHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  countChip: {
    backgroundColor: '#EFF6FF', borderRadius: 99,
    paddingHorizontal: 9, paddingVertical: 3,
    borderWidth: 1, borderColor: '#BFDBFE',
  },
  countChipTxt: { fontFamily: FontFamily.semiBold, fontSize: 11, color: PRIMARY, letterSpacing: 0.1 },
  itemList: { gap: 0 },

  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  itemRowDivider: { borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  thumbWrap: {
    width: 56, height: 56, borderRadius: 10, overflow: 'hidden',
    backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: BORDER,
  },
  thumb: { width: '100%', height: '100%' },
  itemBody: { flex: 1, gap: 3 },
  itemName: { fontFamily: FontFamily.semiBold, fontSize: 13.5, color: TEXT, lineHeight: 18 },
  itemMeta: { fontFamily: FontFamily.regular, fontSize: 12, color: MUTED },
  itemMetaStrong: { fontFamily: FontFamily.semiBold, color: TEXT },
  itemTotal: { fontFamily: FontFamily.bold, fontSize: 14.5, color: TEXT, letterSpacing: -0.1 },
  noteInput: {
    backgroundColor: BG, borderRadius: 10, borderWidth: 1.5, borderColor: BORDER,
    paddingHorizontal: 14, paddingVertical: 12,
    fontFamily: FontFamily.regular, fontSize: 14, color: TEXT, minHeight: 80,
  },
  priceCard: { backgroundColor: SURF, borderRadius: 16, padding: 16, gap: 8, borderWidth: 1, borderColor: BORDER },
  priceTit: { fontFamily: FontFamily.bold, fontSize: 15, color: TEXT, marginBottom: 4 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  priceLbl: { fontFamily: FontFamily.regular, fontSize: 14, color: MUTED },
  priceVal: { fontFamily: FontFamily.medium, fontSize: 14, color: TEXT },
  priceDivider: { height: 1, backgroundColor: BORDER, marginVertical: 4 },
  priceTotal: { fontFamily: FontFamily.bold, fontSize: 16, color: TEXT },
  priceTotalVal: { fontFamily: FontFamily.bold, fontSize: 22, color: PRIMARY },
  freeDeliveryBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#F0FDF4', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 7, borderWidth: 1, borderColor: '#BBF7D0',
  },
  freeDeliveryTxt: { fontFamily: FontFamily.medium, fontSize: 11.5, color: GREEN },
  flowBox: { backgroundColor: '#EFF6FF', borderRadius: 14, padding: 14, gap: 10, borderWidth: 1, borderColor: '#BFDBFE' },
  flowTitle: { fontFamily: FontFamily.bold, fontSize: 13, color: PRIMARY, marginBottom: 2 },
  flowRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  flowNum: { width: 22, height: 22, borderRadius: 11, backgroundColor: PRIMARY, alignItems: 'center', justifyContent: 'center' },
  flowNumTxt: { fontFamily: FontFamily.bold, fontSize: 11, color: '#fff' },
  flowTxt: { flex: 1, fontFamily: FontFamily.regular, fontSize: 12.5, color: TEXT, lineHeight: 18, marginTop: 2 },
  errorBox: { backgroundColor: '#FEF2F2', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, borderWidth: 1, borderColor: '#FECACA' },
  errorTxt: { fontFamily: FontFamily.semiBold, fontSize: 13, color: '#DC2626' },
  placeBtn: {
    height: 56, borderRadius: 14, backgroundColor: PRIMARY,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    shadowColor: PRIMARY, shadowOpacity: 0.35, shadowRadius: 14, shadowOffset: { width: 0, height: 5 }, elevation: 7,
  },
  placeBtnTxt: { fontFamily: FontFamily.bold, fontSize: 16, color: '#fff' },
});
