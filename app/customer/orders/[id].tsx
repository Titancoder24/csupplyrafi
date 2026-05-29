import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet, Platform, ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { ArrowLeft, Check, Truck, MapPin, Package, Clock, Receipt } from 'lucide-react-native';
import { supabase } from '@/services/supabase';
import { formatINR } from '@/lib/format';
import { FontFamily } from '@/constants/theme';
import { getProductImage } from '@/lib/productImage';

const BG      = '#F8FAFC';
const SURFACE = '#FFFFFF';
const BORDER  = '#E2E8F0';
const TEXT    = '#0F172A';
const TEXTSUB = '#334155';
const MUTED   = '#64748B';
const PRIMARY = '#1D4ED8';
const GREEN   = '#15803D';
const PT      = Platform.OS === 'ios' ? 56 : Platform.OS === 'web' ? 0 : 36;

const STAGES: Array<{
  key: string; label: string;
  icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
}> = [
  { key: 'placed',               label: 'Order\nConfirmed', icon: Check  },
  { key: 'vendor_accepted',      label: 'Vendor\nAccepted', icon: Package },
  { key: 'transporter_accepted', label: 'Vehicle\nAssigned', icon: Truck },
  { key: 'out_for_delivery',     label: 'Out for\nDelivery', icon: MapPin },
  { key: 'delivered',            label: 'Delivered',         icon: Clock  },
];

const STATUS_RANK: Record<string, number> = {
  placed: 0, vendor_pending: 0, vendor_accepted: 1,
  transporter_pending: 1, transporter_accepted: 2,
  out_for_pickup: 2, picked_up: 3, in_transit: 3,
  out_for_delivery: 3, delivered: 4,
};

const STATUS_STYLE: Record<string, { bg: string; text: string; border: string }> = {
  pending_approval: { bg: '#FFFBEB', text: '#D97706', border: '#FDE68A' },
  vendor_accepted:  { bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE' },
  out_for_delivery: { bg: '#F5F3FF', text: '#7C3AED', border: '#DDD6FE' },
  delivered:        { bg: '#F0FDF4', text: '#15803D', border: '#BBF7D0' },
  cancelled:        { bg: '#FEF2F2', text: '#DC2626', border: '#FECACA' },
};

function StatusChip({ status }: { status: string }) {
  const style = STATUS_STYLE[status] ?? { bg: '#F1F5F9', text: MUTED, border: BORDER };
  return (
    <View style={[chip.wrap, { backgroundColor: style.bg, borderColor: style.border }]}>
      <Text style={[chip.txt, { color: style.text }]}>
        {status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
      </Text>
    </View>
  );
}
const chip = StyleSheet.create({
  wrap: { borderRadius: 99, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 4 },
  txt:  { fontFamily: FontFamily.semiBold, fontSize: 12 },
});

function SummaryRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={sr.row}>
      <Text style={[sr.label, bold && sr.bold]}>{label}</Text>
      <Text style={[sr.value, bold && sr.bold]}>{value}</Text>
    </View>
  );
}
const sr = StyleSheet.create({
  row:   { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  label: { fontFamily: FontFamily.regular, fontSize: 14, color: TEXTSUB },
  value: { fontFamily: FontFamily.semiBold, fontSize: 14, color: TEXTSUB },
  bold:  { fontFamily: FontFamily.bold, fontSize: 16, color: TEXT },
});

export default function OrderDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [order, setOrder] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      const { data: o } = await supabase.from('orders').select('*').eq('id', id).maybeSingle();
      const { data: i } = await supabase.from('order_items').select('*').eq('order_id', id);
      setOrder(o);
      setItems(i ?? []);
    };
    load();
    const ch = supabase
      .channel(`order-detail-${id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${id}` }, payload => {
        setOrder(payload.new);
      })
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [id]);

  const rank = STATUS_RANK[order?.status ?? ''] ?? 0;

  return (
    <View style={s.root}>
      <View style={[s.header, { paddingTop: PT > 0 ? PT : 14 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={s.backBtn}>
          <ArrowLeft size={20} color="#0F172A" strokeWidth={2} />
        </Pressable>
        <Text style={s.headerTitle}>
          {order ? `Order #${order.order_number}` : 'Order Detail'}
        </Text>
        <View style={s.backBtn} />
      </View>

      {!order ? (
        <View style={s.loadWrap}>
          <ActivityIndicator color={PRIMARY} size="large" />
          <Text style={s.loadTxt}>Loading order…</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

          {/* Status banner */}
          <View style={s.statusBanner}>
            <View style={s.statusLeft}>
              <Text style={s.statusLabel}>Order #{order.order_number}</Text>
              <StatusChip status={order.status} />
            </View>
            <View style={s.livePill}>
              <View style={s.liveDot} />
              <Text style={s.liveTxt}>Live</Text>
            </View>
          </View>

          {/* Tracking timeline */}
          <View style={s.card}>
            <View style={s.cardHeader}>
              <Truck size={14} color="#0F172A" strokeWidth={2} />
              <Text style={s.cardTitle}>Delivery Tracking</Text>
            </View>
            <View style={s.timeline}>
              {STAGES.map((stage, idx) => {
                const done = idx <= rank;
                const active = idx === rank;
                const last = idx === STAGES.length - 1;
                const Icon = stage.icon;
                return (
                  <React.Fragment key={stage.key}>
                    <View style={s.tlStep}>
                      <View style={[s.tlCircle, done && s.tlCircleDone, active && s.tlCircleActive]}>
                        <Icon size={13} color="#FFFFFF" strokeWidth={2.5} />
                      </View>
                      <Text style={[s.tlLabel, done && s.tlLabelDone]}>{stage.label}</Text>
                    </View>
                    {!last && <View style={[s.tlLine, idx < rank && s.tlLineDone]} />}
                  </React.Fragment>
                );
              })}
            </View>
          </View>

          {/* Delivery info */}
          {order.delivery_date && (
            <View style={s.deliveryCard}>
              <Clock size={15} color="#0F172A" strokeWidth={2} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={s.deliveryLabel}>Expected Delivery</Text>
                <Text style={s.deliveryValue}>
                  {new Date(order.delivery_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                  {order.delivery_slot ? `, ${order.delivery_slot}` : ''}
                </Text>
              </View>
            </View>
          )}

          {/* Order items */}
          <View style={s.card}>
            <View style={s.cardHeader}>
              <Package size={14} color="#0F172A" strokeWidth={2} />
              <Text style={s.cardTitle}>Order Items ({items.length})</Text>
            </View>
            <View style={s.itemsWrap}>
              {items.map((it, i) => (
                <View key={it.id} style={[s.itemRow, i < items.length - 1 && s.itemRowBorder]}>
                  <View style={s.itemThumb}>
                    <Image
                      source={{ uri: getProductImage(it.product_name, { size: 200 }) }}
                      style={s.itemThumbImg}
                      contentFit="cover"
                      transition={150}
                    />
                  </View>
                  <View style={s.itemLeft}>
                    <Text style={s.itemName} numberOfLines={2}>{it.product_name}</Text>
                    <Text style={s.itemQty}>{it.quantity} {it.unit}</Text>
                  </View>
                  <Text style={s.itemAmt}>{formatINR(it.line_total)}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Payment summary */}
          <View style={s.card}>
            <View style={s.cardHeader}>
              <Receipt size={14} color="#0F172A" strokeWidth={2} />
              <Text style={s.cardTitle}>Payment Summary</Text>
            </View>
            <View style={s.priceWrap}>
              <SummaryRow label="Subtotal"         value={formatINR(order.subtotal)} />
              <SummaryRow label="Delivery Charges" value={formatINR(order.delivery_charge)} />
              <SummaryRow label="GST (18%)"        value={formatINR(order.gst_amount)} />
              <View style={s.divider} />
              <SummaryRow label="Total Amount"     value={formatINR(order.total_amount)} bold />
            </View>
          </View>

          <View style={s.codNote}>
            <Text style={s.codTxt}>💵  Cash on Delivery</Text>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 4, paddingBottom: 12,
    backgroundColor: SURFACE, borderBottomWidth: 1, borderBottomColor: BORDER,
  },
  backBtn:     { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontFamily: FontFamily.bold, fontSize: 16, color: TEXT },

  loadWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadTxt:  { fontFamily: FontFamily.regular, fontSize: 14, color: MUTED },

  scroll: { padding: 16, gap: 12, paddingBottom: 40 },

  statusBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: SURFACE, borderRadius: 14, borderWidth: 1, borderColor: BORDER, padding: 14,
    shadowColor: TEXT, shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 1 }, elevation: 1,
  },
  statusLeft:  { gap: 6 },
  statusLabel: { fontFamily: FontFamily.bold, fontSize: 15, color: TEXT },
  livePill:    { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#F0FDF4', borderRadius: 99, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: '#BBF7D0' },
  liveDot:     { width: 6, height: 6, borderRadius: 3, backgroundColor: GREEN },
  liveTxt:     { fontFamily: FontFamily.semiBold, fontSize: 11, color: GREEN },

  card: {
    backgroundColor: SURFACE, borderRadius: 14, borderWidth: 1, borderColor: BORDER, overflow: 'hidden',
    shadowColor: TEXT, shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 1 }, elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    paddingHorizontal: 14, paddingVertical: 11,
    backgroundColor: BG, borderBottomWidth: 1, borderBottomColor: BORDER,
  },
  cardTitle: { fontFamily: FontFamily.semiBold, fontSize: 13, color: TEXT },

  timeline: { flexDirection: 'row', alignItems: 'flex-start', padding: 16, paddingTop: 18 },
  tlStep:   { alignItems: 'center', gap: 6, width: 52 },
  tlCircle: {
    width: 30, height: 30, borderRadius: 15, borderWidth: 2,
    borderColor: BORDER, alignItems: 'center', justifyContent: 'center', backgroundColor: SURFACE,
  },
  tlCircleDone:   { backgroundColor: '#CBD5E1', borderColor: '#CBD5E1' },
  tlCircleActive: { backgroundColor: GREEN, borderColor: GREEN },
  tlLabel:        { fontFamily: FontFamily.regular, fontSize: 9, color: MUTED, textAlign: 'center', lineHeight: 13 },
  tlLabelDone:    { color: TEXT, fontFamily: FontFamily.semiBold },
  tlLine:         { flex: 1, height: 2, backgroundColor: BORDER, marginTop: 14 },
  tlLineDone:     { backgroundColor: GREEN },

  deliveryCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: SURFACE, borderRadius: 14, borderWidth: 1, borderColor: '#DDD6FE', padding: 14,
  },
  deliveryLabel: { fontFamily: FontFamily.regular, fontSize: 12, color: MUTED },
  deliveryValue: { fontFamily: FontFamily.semiBold, fontSize: 14, color: TEXT },

  itemsWrap:     { gap: 0 },
  itemRow:       { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, paddingHorizontal: 14 },
  itemRowBorder: { borderBottomWidth: 1, borderBottomColor: BORDER },
  itemThumb: {
    width: 52, height: 52, borderRadius: 10, overflow: 'hidden',
    backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: BORDER,
  },
  itemThumbImg:  { width: '100%', height: '100%' },
  itemLeft:      { flex: 1, gap: 3 },
  itemName:      { fontFamily: FontFamily.semiBold, fontSize: 13.5, color: TEXT, lineHeight: 18 },
  itemQty:       { fontFamily: FontFamily.regular, fontSize: 12, color: MUTED },
  itemAmt:       { fontFamily: FontFamily.semiBold, fontSize: 14, color: TEXT, letterSpacing: -0.1 },

  priceWrap: { paddingHorizontal: 14, paddingVertical: 8, paddingBottom: 12 },
  divider:   { height: 1, backgroundColor: BORDER, marginVertical: 6 },

  codNote: {
    backgroundColor: '#FFFBEB', borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: '#FDE68A', alignItems: 'center',
  },
  codTxt: { fontFamily: FontFamily.regular, fontSize: 13, color: '#92400E' },
});
