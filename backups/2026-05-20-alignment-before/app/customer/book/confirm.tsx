import React from 'react';
import {
  View, Text, Pressable, StyleSheet, ScrollView, Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { CheckCircle2, MapPin, Clock, Package, Home, ChevronRight } from 'lucide-react-native';
import { supabase } from '@/services/supabase';
import { useQuery } from '@tanstack/react-query';
import { FontFamily } from '@/constants/theme';

const BG      = '#F8FAFC';
const SURFACE = '#FFFFFF';
const BORDER  = '#E2E8F0';
const TEXT    = '#0F172A';
const TEXTSUB = '#334155';
const MUTED   = '#64748B';
const PRIMARY = '#15803D';
const GREEN   = '#15803D';
const GREENLT = '#F0FDF4';
const PT      = Platform.OS === 'ios' ? 56 : Platform.OS === 'web' ? 0 : 36;

const TRACK_STEPS = [
  { key: 'placed',               label: 'Order\nConfirmed' },
  { key: 'vendor_accepted',      label: 'Vendor\nAccepted' },
  { key: 'transporter_accepted', label: 'Vehicle\nAssigned' },
  { key: 'out_for_delivery',     label: 'Out for\nDelivery' },
  { key: 'delivered',            label: 'Delivered' },
];

const STATUS_INDEX: Record<string, number> = {
  placed: 0, vendor_pending: 0, vendor_accepted: 1,
  transporter_accepted: 2, out_for_pickup: 2, picked_up: 2, in_transit: 2,
  out_for_delivery: 3, delivered: 4,
};

function TrackStepper({ status }: { status: string }) {
  const idx = STATUS_INDEX[status] ?? 0;
  return (
    <View style={t.wrap}>
      {TRACK_STEPS.map((step, i) => {
        const done = i <= idx;
        const last = i === TRACK_STEPS.length - 1;
        return (
          <React.Fragment key={step.key}>
            <View style={t.step}>
              <View style={[t.circle, done && t.circleDone]}>
                {done
                  ? <CheckCircle2 size={13} color="#FFFFFF" strokeWidth={2.5} />
                  : <View style={t.dot} />
                }
              </View>
              <Text style={[t.label, done && t.labelDone]}>{step.label}</Text>
            </View>
            {!last && <View style={[t.line, i < idx && t.lineDone]} />}
          </React.Fragment>
        );
      })}
    </View>
  );
}

function DetailRow({ icon: Icon, iconColor, label, value }: {
  icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  iconColor: string; label: string; value: string;
}) {
  return (
    <View style={d.row}>
      <View style={[d.iconBox, { backgroundColor: iconColor + '18' }]}>
        <Icon size={14} color="#0F172A" strokeWidth={2} />
      </View>
      <View style={d.col}>
        <Text style={d.label}>{label}</Text>
        <Text style={d.value}>{value}</Text>
      </View>
    </View>
  );
}

export default function StepConfirm() {
  const router = useRouter();
  const { orderId } = useLocalSearchParams<{ orderId: string }>();

  const { data: order } = useQuery({
    queryKey: ['order-confirm', orderId],
    queryFn: async () => {
      if (!orderId) return null;
      const { data } = await supabase
        .from('orders')
        .select('id, order_number, total_amount, delivery_date, delivery_slot, status')
        .eq('id', orderId)
        .maybeSingle();
      return data;
    },
    enabled: Boolean(orderId),
  });

  const deliveryText = order?.delivery_date
    ? `${new Date(order.delivery_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}${order.delivery_slot ? `, ${order.delivery_slot}` : ''}`
    : 'Will be confirmed shortly';

  return (
    <View style={s.root}>
      <View style={[s.topBar, { paddingTop: PT > 0 ? PT : 16 }]} />

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Success circle */}
        <View style={s.successRing}>
          <View style={s.successInner}>
            <CheckCircle2 size={52} color="#0F172A" strokeWidth={1.6} />
          </View>
        </View>

        <Text style={s.heading}>Order Placed!</Text>
        <Text style={s.sub}>Your construction materials are on their way. We'll notify you of every update.</Text>

        {/* Order details */}
        <View style={s.card}>
          <DetailRow icon={Package}   iconColor={PRIMARY} label="Order ID"           value={order?.order_number ?? '—'} />
          <View style={s.divider} />
          <DetailRow icon={Clock}     iconColor="#7C3AED" label="Expected Delivery"  value={deliveryText} />
        </View>

        {/* Tracking timeline */}
        <View style={s.trackCard}>
          <View style={s.trackHeader}>
            <Text style={s.trackTitle}>Live Order Tracking</Text>
            <View style={s.livePill}>
              <View style={s.liveDot} />
              <Text style={s.liveTxt}>Live</Text>
            </View>
          </View>
          <TrackStepper status={order?.status ?? 'placed'} />
        </View>

        {/* Actions */}
        <View style={s.actions}>
          <Pressable
            style={s.btnPrimary}
            onPress={() => router.replace(`/customer/orders/${order?.id ?? ''}` as never)}
          >
            <MapPin size={16} color="#FFFFFF" strokeWidth={2} />
            <Text style={s.btnPrimaryTxt}>Track My Order</Text>
          </Pressable>
          <Pressable
            style={s.btnSecondary}
            onPress={() => router.replace('/customer/home')}
          >
            <Home size={16} color="#0F172A" strokeWidth={2} />
            <Text style={s.btnSecondaryTxt}>Back to Home</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  topBar: { backgroundColor: SURFACE, borderBottomWidth: 1, borderBottomColor: BORDER },
  scroll: {
    padding: 20, paddingTop: 32,
    alignItems: 'center', gap: 20, paddingBottom: 48,
  },

  successRing: {
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: GREENLT, borderWidth: 2, borderColor: '#BBF7D0',
    alignItems: 'center', justifyContent: 'center',
  },
  successInner: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: '#DCFCE7', alignItems: 'center', justifyContent: 'center',
  },

  heading: { fontFamily: FontFamily.bold, fontSize: 26, color: TEXT, textAlign: 'center', letterSpacing: -0.5 },
  sub: {
    fontFamily: FontFamily.regular, fontSize: 14, color: MUTED,
    textAlign: 'center', lineHeight: 22, maxWidth: 300,
  },

  card: {
    width: '100%', backgroundColor: SURFACE, borderRadius: 14,
    borderWidth: 1, borderColor: BORDER, overflow: 'hidden',
    shadowColor: TEXT, shadowOpacity: 0.04, shadowRadius: 8,
    shadowOffset: { width: 0, height: 1 }, elevation: 1,
  },
  divider: { height: 1, backgroundColor: BORDER },

  trackCard: {
    width: '100%', backgroundColor: SURFACE, borderRadius: 14,
    borderWidth: 1, borderColor: BORDER, padding: 16, gap: 16,
    shadowColor: TEXT, shadowOpacity: 0.04, shadowRadius: 8,
    shadowOffset: { width: 0, height: 1 }, elevation: 1,
  },
  trackHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  trackTitle: { fontFamily: FontFamily.semiBold, fontSize: 14, color: TEXT },
  livePill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#F0FDF4', borderRadius: 99, paddingHorizontal: 8, paddingVertical: 3,
    borderWidth: 1, borderColor: '#BBF7D0',
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: GREEN },
  liveTxt: { fontFamily: FontFamily.semiBold, fontSize: 11, color: GREEN },

  actions: { width: '100%', gap: 10 },
  btnPrimary: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: PRIMARY, borderRadius: 12, paddingVertical: 15,
  },
  btnPrimaryTxt: { fontFamily: FontFamily.bold, fontSize: 15, color: SURFACE },
  btnSecondary: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderRadius: 12, paddingVertical: 14,
    borderWidth: 1.5, borderColor: BORDER, backgroundColor: SURFACE,
  },
  btnSecondaryTxt: { fontFamily: FontFamily.semiBold, fontSize: 15, color: TEXTSUB },
});

const t = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'flex-start' },
  step: { alignItems: 'center', gap: 6, width: 54 },
  circle: {
    width: 28, height: 28, borderRadius: 14, borderWidth: 2,
    borderColor: BORDER, alignItems: 'center', justifyContent: 'center',
    backgroundColor: SURFACE,
  },
  circleDone: { backgroundColor: GREEN, borderColor: GREEN },
  dot:  { width: 6, height: 6, borderRadius: 3, backgroundColor: BORDER },
  label: {
    fontFamily: FontFamily.regular, fontSize: 9, color: MUTED,
    textAlign: 'center', lineHeight: 13,
  },
  labelDone: { color: GREEN, fontFamily: FontFamily.semiBold },
  line:     { flex: 1, height: 2, backgroundColor: BORDER, marginTop: 13 },
  lineDone: { backgroundColor: GREEN },
});

const d = StyleSheet.create({
  row:    { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  iconBox:{ width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  col:    { flex: 1, gap: 2 },
  label:  { fontFamily: FontFamily.regular, fontSize: 12, color: MUTED },
  value:  { fontFamily: FontFamily.semiBold, fontSize: 14, color: TEXT },
});
