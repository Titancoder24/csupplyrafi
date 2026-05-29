import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, Pressable, ActivityIndicator,
  ScrollView, StyleSheet, Platform, StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ClipboardList, Star } from 'lucide-react-native';
import { FontFamily } from '@/constants/theme';
import { supabase } from '@/services/supabase';
import { useAuth } from '@/services/auth/AuthProvider';
import { formatINR } from '@/lib/format';
import { toast } from '@/services/toast';

// ── Design tokens ─────────────────────────────────────────────────────────
const BG       = '#F8FAFC';
const SURFACE  = '#FFFFFF';
const SURFACE2 = '#FAFBFC';
const BORDER   = '#E5E7EB';
const HAIRLINE = '#F1F5F9';
const TEXT     = '#0F172A';
const TEXTSUB  = '#334155';
const MUTED    = '#64748B';
const HINT     = '#94A3B8';
const PRIMARY  = '#1D4ED8';
const PRIMARY_LT = '#EFF6FF';

const PT = Platform.OS === 'ios' ? 56 : 36;

// ── Types ─────────────────────────────────────────────────────────────────
type Order = {
  id: string;
  order_number: string;
  status: string;
  total_amount: number;
  created_at: string;
  delivery_date?: string;
  delivery_slot?: string;
};

type FilterTab = 'all' | 'active' | 'completed';

// ── Status config ─────────────────────────────────────────────────────────
const STATUS_LABEL: Record<string, string> = {
  placed:                              'Order Placed',
  vendor_pending:                      'Pending Vendor',
  vendor_accepted:                     'Vendor Accepted',
  vendor_rejected:                     'Vendor Rejected',
  transporter_pending:                 'Finding Transporter',
  transporter_accepted:                'Transporter Assigned',
  out_for_pickup:                      'Out for Pickup',
  pending_admin_pickup_confirmation:   'Pickup Reported',
  picked_up:                           'Picked Up',
  in_transit:                          'In Transit',
  out_for_delivery:                    'Out for Delivery',
  pending_admin_confirmation:          'Delivery Reported',
  delivered:                           'Delivered',
  cancelled:                           'Cancelled',
  refunded:                            'Refunded',
  disputed:                            'Disputed',
};

const STATUS_COLOR: Record<string, { bg: string; text: string; border: string; accent: string }> = {
  placed:               { bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE', accent: '#1D4ED8' },
  vendor_pending:       { bg: '#FFFBEB', text: '#B45309', border: '#FDE68A', accent: '#D97706' },
  vendor_accepted:      { bg: '#F0FDF4', text: '#15803D', border: '#BBF7D0', accent: '#15803D' },
  vendor_rejected:      { bg: '#FEF2F2', text: '#B91C1C', border: '#FECACA', accent: '#B91C1C' },
  transporter_pending:  { bg: '#FFFBEB', text: '#B45309', border: '#FDE68A', accent: '#D97706' },
  transporter_accepted: { bg: '#EEF2FF', text: '#4338CA', border: '#C7D2FE', accent: '#4338CA' },
  out_for_pickup:                   { bg: '#EEF2FF', text: '#4338CA', border: '#C7D2FE', accent: '#4338CA' },
  pending_admin_pickup_confirmation:{ bg: '#FFFBEB', text: '#B45309', border: '#FDE68A', accent: '#D97706' },
  picked_up:                        { bg: '#FFF7ED', text: '#C2410C', border: '#FED7AA', accent: '#C2410C' },
  in_transit:                       { bg: '#FFF7ED', text: '#C2410C', border: '#FED7AA', accent: '#C2410C' },
  out_for_delivery:                 { bg: '#FFF7ED', text: '#EA580C', border: '#FED7AA', accent: '#EA580C' },
  pending_admin_confirmation:       { bg: '#F0FDF4', text: '#15803D', border: '#BBF7D0', accent: '#15803D' },
  delivered:                        { bg: '#F0FDF4', text: '#15803D', border: '#BBF7D0', accent: '#15803D' },
  cancelled:            { bg: '#FEF2F2', text: '#B91C1C', border: '#FECACA', accent: '#B91C1C' },
  refunded:             { bg: '#F5F3FF', text: '#6D28D9', border: '#DDD6FE', accent: '#6D28D9' },
  disputed:             { bg: '#FEF2F2', text: '#DC2626', border: '#FECACA', accent: '#DC2626' },
};

const ACTIVE_STATUSES    = ['placed', 'vendor_pending', 'vendor_accepted', 'transporter_pending', 'transporter_accepted', 'out_for_pickup', 'picked_up', 'in_transit', 'out_for_delivery'];
const COMPLETED_STATUSES = ['delivered', 'cancelled', 'vendor_rejected', 'refunded', 'disputed'];

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: 'all',       label: 'All Orders' },
  { key: 'active',    label: 'Active' },
  { key: 'completed', label: 'Completed' },
];

// ── Screen ────────────────────────────────────────────────────────────────
export default function CustomerOrders() {
  const router   = useRouter();
  const { profile } = useAuth();
  const [orders,  setOrders]  = useState<Order[]>([]);
  const [ratings, setRatings] = useState<Record<string, number>>({}); // order_id -> stars
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState<FilterTab>('all');

  const fetchOrders = useCallback(async () => {
    if (!profile?.id) return;
    const [{ data: ordersData }, { data: reviews }] = await Promise.all([
      supabase.from('orders')
        .select('id, order_number, status, total_amount, created_at, delivery_date, delivery_slot')
        .eq('customer_id', profile.id)
        .order('created_at', { ascending: false }),
      supabase.from('transport_reviews')
        .select('order_id, rating')
        .eq('reviewer_id', profile.id),
    ]);
    setOrders((ordersData ?? []) as Order[]);
    const map: Record<string, number> = {};
    for (const r of reviews ?? []) map[r.order_id] = r.rating;
    setRatings(map);
    setLoading(false);
  }, [profile?.id]);

  useEffect(() => {
    fetchOrders();
    if (!profile?.id) return;

    const prevStatuses = new Map<string, string>();
    const suffix = Math.random().toString(36).slice(2, 10);

    const channel = supabase
      .channel(`customer-orders-rt:${profile.id}:${suffix}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders', filter: `customer_id=eq.${profile.id}` },
        (payload) => {
          const updated = payload.new as Order & { order_number: string };
          const prev = prevStatuses.get(updated.id);
          if (prev && prev !== updated.status) {
            const label = STATUS_LABEL[updated.status] ?? updated.status.replace(/_/g, ' ');
            const type  = updated.status === 'delivered' ? 'success'
              : updated.status === 'cancelled' || updated.status === 'vendor_rejected' ? 'error'
              : 'info';
            toast.show(`Order #${updated.order_number}`, `Status: ${label}`, type);
          }
          prevStatuses.set(updated.id, updated.status);
          setOrders(prev => prev.map(o => o.id === updated.id ? { ...o, ...updated } : o));
        },
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders', filter: `customer_id=eq.${profile.id}` },
        () => fetchOrders(),
      )
      .subscribe();

    orders.forEach(o => prevStatuses.set(o.id, o.status));
    return () => { supabase.removeChannel(channel); };
  }, [profile?.id, fetchOrders]);

  const filtered = orders.filter(o => {
    if (filter === 'active')    return ACTIVE_STATUSES.includes(o.status);
    if (filter === 'completed') return COMPLETED_STATUSES.includes(o.status);
    return true;
  });

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor={SURFACE} />

      {/* ── Header ── */}
      <View style={s.header}>
        <Text style={s.headerTitle}>My Orders</Text>
        {orders.length > 0 && (
          <View style={s.countPill}>
            <Text style={s.countTxt}>{orders.length}</Text>
          </View>
        )}
      </View>

      {/* ── Filter tabs ── */}
      <View style={s.filterBar}>
        {FILTER_TABS.map(tab => (
          <Pressable
            key={tab.key}
            style={[s.filterTab, filter === tab.key && s.filterTabActive]}
            onPress={() => setFilter(tab.key)}
          >
            <Text style={[s.filterTabTxt, filter === tab.key && s.filterTabTxtActive]}>
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* ── Body ── */}
      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={PRIMARY} />
          <Text style={s.loadingTxt}>Loading orders…</Text>
        </View>
      ) : !filtered.length ? (
        <View style={s.emptyWrap}>
          <View style={s.emptyIconBox}>
            <ClipboardList size={42} color="#0F172A" strokeWidth={1.4} />
          </View>
          <Text style={s.emptyTitle}>
            {filter === 'all' ? 'No orders yet' : `No ${filter} orders`}
          </Text>
          <Text style={s.emptySub}>
            {filter === 'all'
              ? 'Place your first order from the home screen.'
              : 'Orders in this state will appear here.'}
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={s.scroll}
          showsVerticalScrollIndicator={false}
        >
          {filtered.map((o) => {
            const c = STATUS_COLOR[o.status] ?? STATUS_COLOR.placed;
            const isDelivered = o.status === 'delivered';
            const isFailed    = o.status === 'cancelled' || o.status === 'vendor_rejected';
            const statusLabel = STATUS_LABEL[o.status] ?? o.status.replace(/_/g, ' ');
            const placedAt    = new Date(o.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
            const deliveryLine = isDelivered
              ? (o.delivery_date ? `Delivered ${new Date(o.delivery_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : 'Delivered')
              : isFailed
                ? (o.status === 'vendor_rejected' ? 'Vendor declined' : 'Cancelled')
                : (o.delivery_date ? `ETA ${new Date(o.delivery_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : 'Awaiting schedule');
            return (
              <Pressable
                key={o.id}
                onPress={() => router.push({ pathname: '/customer/order-detail', params: { id: o.id } } as never)}
                style={({ pressed }) => [s.card, pressed && { backgroundColor: SURFACE2 }]}
              >
                {/* Status accent — thin tint glow on the left */}
                <View style={[s.cardAccent, { backgroundColor: c.accent }]} />

                {/* Top row: # + status dot label */}
                <View style={s.cardTop}>
                  <Text style={s.orderNum} numberOfLines={1}>#{o.order_number}</Text>
                  <View style={s.dotStatus}>
                    <View style={[s.dot, { backgroundColor: c.accent }]} />
                    <Text style={[s.dotStatusTxt, { color: c.accent }]} numberOfLines={1}>{statusLabel}</Text>
                  </View>
                </View>

                {/* Metadata row */}
                <View style={s.metaRow}>
                  <Text style={s.metaTxt} numberOfLines={1}>
                    {placedAt} <Text style={s.metaDot}>·</Text> {deliveryLine}
                  </Text>
                  <Text style={s.amount}>{formatINR(o.total_amount)}</Text>
                </View>

                {/* Rated state inline (no separate card) */}
                {isDelivered && ratings[o.id] ? (
                  <View style={s.ratedInline}>
                    {[1, 2, 3, 4, 5].map(n => (
                      <Star
                        key={n}
                        size={11}
                        color="#0F172A"
                        fill={n <= ratings[o.id] ? '#0F172A' : 'transparent'}
                        strokeWidth={1.5}
                      />
                    ))}
                    <Text style={s.ratedTxt}>You rated {ratings[o.id]}/5</Text>
                  </View>
                ) : null}

                {/* Rate CTA — minimal text link, not a giant button */}
                {isDelivered && !ratings[o.id] ? (
                  <Pressable
                    style={s.rateLink}
                    onPress={(e) => {
                      e.stopPropagation?.();
                      router.push({ pathname: '/customer/order-detail', params: { id: o.id } } as never);
                    }}
                  >
                    <Star size={11} color="#0F172A" fill="#0F172A" strokeWidth={1.5} />
                    <Text style={s.rateLinkTxt}>Rate this delivery →</Text>
                  </Pressable>
                ) : null}
              </Pressable>
            );
          })}
          <View style={{ height: 24 }} />
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  /* Header — tighter, smaller, with thin hairline */
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingTop: PT - 4, paddingBottom: 10,
    backgroundColor: SURFACE, borderBottomWidth: 1, borderBottomColor: HAIRLINE,
  },
  headerTitle: { fontFamily: FontFamily.semiBold, fontSize: 17, color: TEXT, letterSpacing: -0.3 },
  countPill: {
    backgroundColor: PRIMARY_LT, borderRadius: 6,
    paddingHorizontal: 7, paddingVertical: 1.5,
  },
  countTxt: { fontFamily: FontFamily.semiBold, fontSize: 11, color: PRIMARY, letterSpacing: 0.1 },

  /* Filter bar — segmented control feel */
  filterBar: {
    flexDirection: 'row', gap: 6,
    paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: SURFACE, borderBottomWidth: 1, borderBottomColor: HAIRLINE,
  },
  filterTab: {
    paddingHorizontal: 11, paddingVertical: 5,
    borderRadius: 7, backgroundColor: 'transparent',
  },
  filterTabActive: { backgroundColor: PRIMARY_LT },
  filterTabTxt:    { fontFamily: FontFamily.medium, fontSize: 12, color: MUTED, letterSpacing: -0.05 },
  filterTabTxtActive: { color: PRIMARY, fontFamily: FontFamily.semiBold },

  center:     { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  loadingTxt: { fontFamily: FontFamily.medium, fontSize: 13, color: MUTED },

  emptyWrap: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 32, gap: 8,
  },
  emptyIconBox: {
    width: 64, height: 64, borderRadius: 16,
    backgroundColor: HAIRLINE,
    alignItems: 'center', justifyContent: 'center', marginBottom: 2,
  },
  emptyTitle: { fontFamily: FontFamily.semiBold, fontSize: 15, color: TEXT, letterSpacing: -0.2 },
  emptySub:   {
    fontFamily: FontFamily.regular, fontSize: 12.5, color: MUTED,
    textAlign: 'center', lineHeight: 17,
  },

  /* Scroll list */
  scroll: { padding: 12, gap: 8 },

  /* Card — flatter, thinner, operational */
  card: {
    position: 'relative' as const,
    backgroundColor: SURFACE,
    borderRadius: 10,
    borderWidth: 1, borderColor: BORDER,
    paddingLeft: 14, paddingRight: 14, paddingVertical: 12,
    gap: 6,
    shadowColor: TEXT, shadowOpacity: 0.025, shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 }, elevation: 1,
    overflow: 'hidden' as const,
  },
  /* Thin glow strip on the left replaces the 4px chunky border */
  cardAccent: {
    position: 'absolute' as const, left: 0, top: 0, bottom: 0,
    width: 2,
  },

  /* Top row — # + status indicator */
  cardTop: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    gap: 8,
  },
  orderNum: { fontFamily: FontFamily.semiBold, fontSize: 13.5, color: TEXT, letterSpacing: -0.1 },
  dotStatus: { flexDirection: 'row', alignItems: 'center', gap: 5, flexShrink: 1, minWidth: 0 },
  dot: { width: 6, height: 6, borderRadius: 3, flexShrink: 0 },
  dotStatusTxt: { fontFamily: FontFamily.semiBold, fontSize: 11.5, letterSpacing: -0.05, flexShrink: 1 },

  /* Metadata row — date · delivery + amount */
  metaRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    gap: 8, marginTop: 2,
  },
  metaTxt: {
    flex: 1,
    fontFamily: FontFamily.regular, fontSize: 11.5, color: MUTED,
    letterSpacing: 0,
  },
  metaDot: { color: HINT, paddingHorizontal: 1 },
  amount: { fontFamily: FontFamily.bold, fontSize: 14, color: TEXT, letterSpacing: -0.2 },

  /* Rated inline (no separate box) */
  ratedInline: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    marginTop: 4,
  },
  ratedTxt: { fontFamily: FontFamily.medium, fontSize: 10.5, color: MUTED, marginLeft: 4, letterSpacing: 0 },

  /* Rate link — text, not a button */
  rateLink: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    marginTop: 4, alignSelf: 'flex-start' as const,
  },
  rateLinkTxt: {
    fontFamily: FontFamily.semiBold, fontSize: 11.5, color: '#B45309',
    letterSpacing: -0.05,
  },
});

// Quiet unused-tokens — kept for future styling needs
void TEXTSUB;
