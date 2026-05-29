import React, { useState } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, MapPin, Package, Clock, Truck, Receipt, ChevronRight, AlertCircle } from 'lucide-react-native';
import { useCart } from '@/stores/cart';
import { useBooking } from '@/stores/booking';
import { computeQuote } from '@/lib/quote';
import { formatINR } from '@/lib/format';
import { supabase } from '@/services/supabase';
import { useAuth } from '@/services/auth/AuthProvider';
import { FontFamily } from '@/constants/theme';

const BG      = '#F8FAFC';
const SURFACE = '#FFFFFF';
const BORDER  = '#E2E8F0';
const TEXT    = '#0F172A';
const TEXTSUB = '#334155';
const MUTED   = '#64748B';
const PRIMARY = '#15803D';
const PRIMLT  = '#F0FDF4';
const GREEN   = '#15803D';
const PT      = Platform.OS === 'ios' ? 56 : Platform.OS === 'web' ? 0 : 36;
const STEPS = 7;
const STEP  = 6;

function StepHeader({ title, step, total, onBack }: { title: string; step: number; total: number; onBack: () => void }) {
  const pct = Math.round((step / total) * 100);
  return (
    <View style={sh.wrap}>
      <View style={[sh.row, { paddingTop: PT > 0 ? PT : 14 }]}>
        <Pressable onPress={onBack} hitSlop={12} style={sh.backBtn}>
          <ArrowLeft size={20} color="#0F172A" strokeWidth={2} />
        </Pressable>
        <View style={{ flex: 1, alignItems: 'center', gap: 2 }}>
          <Text style={sh.title}>{title}</Text>
          <Text style={sh.step}>Step {step} of {total}</Text>
        </View>
        <View style={sh.backBtn} />
      </View>
      <View style={sh.barBg}>
        <View style={[sh.barFill, { width: `${pct}%` as any }]} />
      </View>
    </View>
  );
}

const sh = StyleSheet.create({
  wrap:    { backgroundColor: SURFACE, borderBottomWidth: 1, borderBottomColor: BORDER },
  row:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4, paddingBottom: 12 },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22 },
  title:   { fontFamily: FontFamily.bold, fontSize: 16, color: TEXT },
  step:    { fontFamily: FontFamily.regular, fontSize: 11, color: MUTED },
  barBg:   { height: 3, backgroundColor: BORDER },
  barFill: { height: 3, backgroundColor: PRIMARY, borderRadius: 2 },
});

function SectionCard({ icon: Icon, iconColor, title, editRoute, children }: {
  icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  iconColor: string; title: string; editRoute?: string; children: React.ReactNode;
}) {
  const router = useRouter();
  return (
    <View style={sc.card}>
      <View style={sc.header}>
        <View style={sc.headerLeft}>
          <View style={[sc.iconBox, { backgroundColor: iconColor + '18' }]}>
            <Icon size={15} color="#0F172A" strokeWidth={2} />
          </View>
          <Text style={sc.title}>{title}</Text>
        </View>
        {editRoute && (
          <Pressable onPress={() => router.push(editRoute as never)} style={sc.editBtn}>
            <Text style={sc.editTxt}>Edit</Text>
          </Pressable>
        )}
      </View>
      {children}
    </View>
  );
}

const sc = StyleSheet.create({
  card: {
    backgroundColor: SURFACE, borderRadius: 14, borderWidth: 1, borderColor: BORDER,
    overflow: 'hidden',
    shadowColor: TEXT, shadowOpacity: 0.04, shadowRadius: 8,
    shadowOffset: { width: 0, height: 1 }, elevation: 1,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: BORDER,
    backgroundColor: BG,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBox: { width: 28, height: 28, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  title:   { fontFamily: FontFamily.semiBold, fontSize: 13, color: TEXT },
  editBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, backgroundColor: PRIMLT },
  editTxt: { fontFamily: FontFamily.semiBold, fontSize: 12, color: PRIMARY },
});

function PriceRow({ label, value, bold, savings }: { label: string; value: string; bold?: boolean; savings?: boolean }) {
  return (
    <View style={pr.row}>
      <Text style={[pr.label, bold && pr.labelBold]}>{label}</Text>
      <Text style={[pr.value, bold && pr.valueBold, savings && pr.valueSavings]}>{value}</Text>
    </View>
  );
}

const pr = StyleSheet.create({
  row:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  label:       { fontFamily: FontFamily.regular, fontSize: 14, color: TEXTSUB },
  labelBold:   { fontFamily: FontFamily.bold, fontSize: 15, color: TEXT },
  value:       { fontFamily: FontFamily.semiBold, fontSize: 14, color: TEXTSUB },
  valueBold:   { fontFamily: FontFamily.bold, fontSize: 18, color: TEXT },
  valueSavings:{ color: GREEN },
});

export default function StepReview() {
  const router    = useRouter();
  const items     = useCart(s => s.items);
  const clear     = useCart(s => s.clear);
  const booking   = useBooking();
  const { profile } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const q = computeQuote(items);

  const addressLabel = booking.addressId?.startsWith('demo-')
    ? booking.addressId === 'demo-home'
      ? '12, Green Street, Coimbatore — 641001'
      : 'Building Construction, Avinashi Road, Coimbatore — 641037'
    : 'Selected delivery address';

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      if (!profile?.id) throw new Error('Not signed in');

      // Derive vendor_id from cart items. If multiple vendors, leave NULL
      // (admin can decide; multi-vendor splitting not yet supported).
      const uniqueVendorIds = Array.from(
        new Set(items.map(it => it.vendorId).filter((v): v is string => !!v))
      );
      const orderVendorId = uniqueVendorIds.length === 1 ? uniqueVendorIds[0] : null;

      // Pickup is the vendor's saved pickup address (from vendor_profiles)
      let pickupAddressId: string | null = null;
      if (orderVendorId) {
        const { data: vp } = await supabase
          .from('vendor_profiles')
          .select('pickup_address_id')
          .eq('id', orderVendorId)
          .maybeSingle();
        pickupAddressId = (vp as any)?.pickup_address_id ?? null;
      }

      const { data: order, error: oErr } = await supabase
        .from('orders')
        .insert({
          customer_id: profile.id,
          vendor_id: orderVendorId,
          pickup_address_id: pickupAddressId,
          delivery_address_id: booking.addressId?.startsWith('demo-') ? null : booking.addressId,
          status: 'placed',
          payment_status: 'pending',
          payment_method: 'cod',
          delivery_mode: booking.delivery.mode,
          delivery_date: booking.delivery.date,
          delivery_slot: booking.delivery.slot,
          total_weight_kg: q.totalWeightKg,
          vehicle_class_required: q.vehicleClass,
          subtotal: q.subtotal,
          delivery_charge: q.delivery,
          commission: q.commission,
          gst_amount: q.gst,
          total_amount: q.total,
          vehicle_entry: booking.vehicleEntry,
          customer_gst: booking.gst ?? null,
        })
        .select()
        .single();
      if (oErr) throw oErr;

      if (items.length) {
        await supabase.from('order_items').insert(
          items.map(it => ({
            order_id: order.id,
            product_id: it.productId,
            variant_id: it.variantId ?? null,
            product_name: it.name,
            unit: it.unit,
            quantity: it.quantity,
            unit_price: it.unitPrice,
            weight_per_unit_kg: it.weightPerUnitKg ?? 0,
            line_total: it.unitPrice * it.quantity,
          }))
        );
      }
      clear();
      booking.reset();
      router.replace({ pathname: '/customer/book/confirm', params: { orderId: order.id } });
    } catch (e: any) {
      setError(e?.message ?? 'Could not place order. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={s.root}>
      <StepHeader title="Review Order" step={STEP} total={STEPS} onBack={() => router.back()} />

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Delivery Address */}
        <SectionCard icon={MapPin} iconColor={PRIMARY} title="Delivery Address" editRoute="/customer/book/address">
          <View style={s.cardContent}>
            <Text style={s.addressTxt}>{addressLabel}</Text>
          </View>
        </SectionCard>

        {/* Delivery Time */}
        <SectionCard icon={Clock} iconColor="#7C3AED" title="Delivery Schedule" editRoute="/customer/book/time">
          <View style={s.cardContent}>
            <Text style={s.timeTxt}>
              {booking.delivery.mode === 'instant'
                ? 'Instant Delivery — Within 2–4 hours'
                : `${booking.delivery.date ? new Date(booking.delivery.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}${booking.delivery.slot ? `, ${booking.delivery.slot}` : ''}`
              }
            </Text>
          </View>
        </SectionCard>

        {/* Order Items */}
        <SectionCard icon={Package} iconColor="#F97316" title={`Order Items (${items.length})`} editRoute="/customer/book/material">
          <View style={s.itemsWrap}>
            {items.map((it, i) => (
              <View key={it.productId} style={[s.itemRow, i < items.length - 1 && s.itemRowBorder]}>
                <View style={s.itemLeft}>
                  <Text style={s.itemName} numberOfLines={1}>{it.name}</Text>
                  <Text style={s.itemQty}>{it.quantity} {it.unit}</Text>
                </View>
                <Text style={s.itemAmt}>{formatINR(it.unitPrice * it.quantity)}</Text>
              </View>
            ))}
          </View>
        </SectionCard>

        {/* Vehicle Entry */}
        <SectionCard icon={Truck} iconColor={MUTED} title="Vehicle Entry" editRoute="/customer/book/vehicle-entry">
          <View style={s.cardContent}>
            <Text style={s.timeTxt}>
              {booking.vehicleEntry.needed
                ? `Pass required — ${booking.vehicleEntry.vehicleNumber ?? ''}`
                : 'No entry pass required'}
            </Text>
          </View>
        </SectionCard>

        {/* Price Breakdown */}
        <SectionCard icon={Receipt} iconColor={GREEN} title="Price Breakdown">
          <View style={s.priceWrap}>
            <PriceRow label="Item Total"       value={formatINR(q.subtotal)} />
            <PriceRow label="Delivery Charges" value={formatINR(q.delivery)} />
            <PriceRow label="GST (18%)"        value={formatINR(q.gst)} />
            {q.savings > 0 && (
              <PriceRow label="You Save" value={`− ${formatINR(q.savings)}`} savings />
            )}
            <View style={s.priceDivider} />
            <PriceRow label="Total Amount" value={formatINR(q.total)} bold />
          </View>
        </SectionCard>

        {/* Payment note */}
        <View style={s.codNote}>
          <Text style={s.codIcon}>💵</Text>
          <Text style={s.codTxt}>Cash on Delivery — Pay when your order arrives.</Text>
        </View>

        {error && (
          <View style={s.errorBox}>
            <AlertCircle size={16} color="#0F172A" strokeWidth={2} />
            <Text style={s.errorTxt}>{error}</Text>
          </View>
        )}
      </ScrollView>

      <View style={s.stickyBar}>
        <Pressable
          style={[s.btn, (submitting || items.length === 0) && s.btnDis]}
          disabled={submitting || items.length === 0}
          onPress={submit}
        >
          {submitting
            ? <ActivityIndicator color={SURFACE} size="small" />
            : <>
                <Text style={s.btnTxt}>Place Order</Text>
                <ChevronRight size={16} color="#FFFFFF" strokeWidth={2.5} />
              </>
          }
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: BG },
  scroll: { padding: 16, gap: 12, paddingBottom: 32 },

  cardContent: { paddingHorizontal: 14, paddingVertical: 12 },
  addressTxt:  { fontFamily: FontFamily.regular, fontSize: 13.5, color: TEXTSUB, lineHeight: 20 },
  timeTxt:     { fontFamily: FontFamily.regular, fontSize: 13.5, color: TEXTSUB },

  itemsWrap: { gap: 0 },
  itemRow:   { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, paddingHorizontal: 14 },
  itemRowBorder: { borderBottomWidth: 1, borderBottomColor: BORDER },
  itemLeft:  { flex: 1, gap: 2 },
  itemName:  { fontFamily: FontFamily.semiBold, fontSize: 13.5, color: TEXT, lineHeight: 18 },
  itemQty:   { fontFamily: FontFamily.regular, fontSize: 12, color: MUTED },
  itemAmt:   { fontFamily: FontFamily.semiBold, fontSize: 13.5, color: TEXT },

  priceWrap: { paddingHorizontal: 14, paddingVertical: 8, paddingBottom: 14 },
  priceDivider: { height: 1, backgroundColor: BORDER, marginVertical: 8 },

  codNote: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FFFBEB', borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: '#FDE68A',
  },
  codIcon: { fontSize: 15 },
  codTxt:  { fontFamily: FontFamily.regular, fontSize: 12.5, color: '#92400E', flex: 1 },

  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FEF2F2', borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: '#FECACA',
  },
  errorTxt: { fontFamily: FontFamily.regular, fontSize: 13, color: '#DC2626', flex: 1 },

  stickyBar: {
    paddingHorizontal: 16, paddingVertical: 12, paddingBottom: 28,
    backgroundColor: SURFACE, borderTopWidth: 1, borderTopColor: BORDER,
  },
  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: PRIMARY, borderRadius: 12, paddingVertical: 15,
  },
  btnDis: { opacity: 0.45 },
  btnTxt: { fontFamily: FontFamily.bold, fontSize: 15, color: SURFACE },
});
