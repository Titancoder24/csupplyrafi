import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, Pressable, ActivityIndicator,
  ScrollView, StyleSheet, Platform, StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ClipboardList, ArrowRight, Star, CheckCircle2, XCircle, Calendar } from 'lucide-react-native';
import { FontFamily } from '@/constants/theme';
import { supabase } from '@/services/supabase';
import { useAuth } from '@/services/auth/AuthProvider';
import { formatINR } from '@/lib/format';
import { toast } from '@/services/toast';

// ── Design tokens ─────────────────────────────────────────────────────────
const BG      = '#F8FAFC';
const SURFACE = '#FFFFFF';
const BORDER  = '#E2E8F0';
const TEXT    = '#0F172A';
const TEXTSUB = '#334155';
const MUTED   = '#64748B';
const HINT    = '#94A3B8';
const PRIMARY = '#1D4ED8';

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
            <ClipboardList size={42} color={HINT} strokeWidth={1.4} />
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
            return (
              <Pressable
                key={o.id}
                style={[s.card, { borderLeftColor: c.accent }]}
                onPress={() => router.push({ pathname: '/customer/order-detail', params: { id: o.id } } as never)}
              >
                <View style={s.cardTop}>
                  <View style={{ gap: 3, flexShrink: 1, minWidth: 0 }}>
                    <Text style={s.orderNum} numberOfLines={1}>Order #{o.order_number}</Text>
                    <Text style={s.orderDate}>
                      {new Date(o.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'short', year: 'numeric',
                      })}
                    </Text>
                  </View>
                  <View style={[s.statusPill, { backgroundColor: c.bg, borderColor: c.border }]}>
                    <View style={[s.statusDot, { backgroundColor: c.accent }]} />
                    <Text style={[s.statusTxt, { color: c.text }]} numberOfLines={1}>
                      {STATUS_LABEL[o.status] ?? o.status.replace(/_/g, ' ')}
                    </Text>
                  </View>
                </View>

                <View style={s.divider} />

                <View style={s.cardBottom}>
                  {(() => {
                    if (o.status === 'delivered') {
                      return (
                        <View style={s.statusLine}>
                          <CheckCircle2 size={13} color="#15803D" strokeWidth={2.4} />
                          <Text style={[s.deliveryLabel, { color: '#15803D' }]}>
                            Delivered{o.delivery_date ? ` on ${new Date(o.delivery_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : ''}
                          </Text>
                        </View>
                      );
                    }
                    if (o.status === 'cancelled' || o.status === 'vendor_rejected') {
                      return (
                        <View style={s.statusLine}>
                          <XCircle size={13} color="#B91C1C" strokeWidth={2.4} />
                          <Text style={[s.deliveryLabel, { color: '#B91C1C' }]}>
                            {o.status === 'vendor_rejected' ? 'Vendor declined the order' : 'Order cancelled'}
                          </Text>
                        </View>
                      );
                    }
                    return (
                      <View style={s.statusLine}>
                        <Calendar size={13} color={MUTED} strokeWidth={2.2} />
                        <Text style={s.deliveryLabel}>
                          {o.delivery_date
                            ? `Delivery: ${new Date(o.delivery_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`
                            : 'Awaiting schedule'}
                        </Text>
                      </View>
                    );
                  })()}
                  <View style={s.amountRow}>
                    <Text style={s.amount}>{formatINR(o.total_amount)}</Text>
                    <ArrowRight size={15} color={MUTED} strokeWidth={2} />
                  </View>
                </View>

                {/* Rate / Rated row for delivered orders */}
                {o.status === 'delivered' && (
                  ratings[o.id] ? (
                    <View style={s.ratedRow}>
                      <View style={s.starsInline}>
                        {[1, 2, 3, 4, 5].map(n => (
                          <Star
                            key={n}
                            size={13}
                            color={n <= ratings[o.id] ? '#F59E0B' : '#E2E8F0'}
                            fill={n <= ratings[o.id] ? '#F59E0B' : 'transparent'}
                            strokeWidth={1.5}
                          />
                        ))}
                      </View>
                      <Text style={s.ratedTxt}>You rated this delivery {ratings[o.id]}/5</Text>
                    </View>
                  ) : (
                    <Pressable
                      style={s.rateBtn}
                      onPress={(e) => {
                        e.stopPropagation?.();
                        router.push({ pathname: '/customer/order-detail', params: { id: o.id } } as never);
                      }}
                    >
                      <Star size={13} color="#fff" fill="#fff" strokeWidth={2} />
                      <Text style={s.rateBtnTxt}>Rate Delivery</Text>
                    </Pressable>
                  )
                )}
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

  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 20, paddingTop: PT, paddingBottom: 14,
    backgroundColor: SURFACE, borderBottomWidth: 1, borderBottomColor: BORDER,
  },
  headerTitle: { fontFamily: FontFamily.bold, fontSize: 22, color: TEXT, letterSpacing: -0.4 },
  countPill: {
    backgroundColor: PRIMARY + '18', borderRadius: 99,
    paddingHorizontal: 9, paddingVertical: 3,
  },
  countTxt: { fontFamily: FontFamily.bold, fontSize: 12, color: PRIMARY },

  filterBar: {
    flexDirection: 'row', gap: 8,
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: SURFACE, borderBottomWidth: 1, borderBottomColor: BORDER,
  },
  filterTab: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 99, borderWidth: 1, borderColor: BORDER, backgroundColor: SURFACE,
  },
  filterTabActive: { backgroundColor: PRIMARY + '12', borderColor: PRIMARY + '30' },
  filterTabTxt:    { fontFamily: FontFamily.medium, fontSize: 13, color: MUTED },
  filterTabTxtActive: { color: PRIMARY, fontFamily: FontFamily.semiBold },

  center:     { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingTxt: { fontFamily: FontFamily.medium, fontSize: 14, color: MUTED },

  emptyWrap: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 40, gap: 12,
  },
  emptyIconBox: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: '#F1F5F9',
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  emptyTitle: { fontFamily: FontFamily.bold, fontSize: 18, color: TEXT },
  emptySub:   {
    fontFamily: FontFamily.regular, fontSize: 14, color: MUTED,
    textAlign: 'center', lineHeight: 21,
  },

  scroll: { padding: 16, gap: 12 },

  card: {
    backgroundColor: SURFACE, borderRadius: 14,
    borderWidth: 1, borderColor: BORDER, borderLeftWidth: 4,
    padding: 16,
    shadowColor: TEXT, shadowOpacity: 0.05, shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
    flexWrap: 'wrap',
  },
  orderNum:    { fontFamily: FontFamily.bold, fontSize: 15, color: TEXT, letterSpacing: -0.1 },
  orderDate:   { fontFamily: FontFamily.regular, fontSize: 12, color: MUTED },
  statusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: 99, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1,
    flexShrink: 1, maxWidth: '100%',
  },
  statusDot: { width: 6, height: 6, borderRadius: 3, flexShrink: 0 },
  statusTxt:  { fontFamily: FontFamily.semiBold, fontSize: 11, flexShrink: 1 },
  divider:    { height: 1, backgroundColor: BORDER, marginVertical: 12 },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusLine: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  deliveryLabel: { fontFamily: FontFamily.medium, fontSize: 12.5, color: TEXTSUB },
  amountRow:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  amount:     { fontFamily: FontFamily.bold, fontSize: 17, color: TEXT },

  /* Rate / Rated */
  rateBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    marginTop: 10, paddingVertical: 9, borderRadius: 10,
    backgroundColor: '#F59E0B',
  },
  rateBtnTxt: { fontFamily: FontFamily.bold, fontSize: 13, color: '#fff' },
  ratedRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginTop: 10, paddingVertical: 8, paddingHorizontal: 10,
    backgroundColor: '#FFFBEB', borderRadius: 8,
    borderWidth: 1, borderColor: '#FDE68A',
  },
  starsInline: { flexDirection: 'row', gap: 1 },
  ratedTxt:    { fontFamily: FontFamily.semiBold, fontSize: 12, color: '#B45309' },
});
