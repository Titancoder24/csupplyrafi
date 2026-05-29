import React from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet, Platform, StatusBar,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { ArrowLeft, MapPin, Trash2, ShoppingBag, Minus, Plus, ChevronRight } from 'lucide-react-native';
import { FontFamily } from '@/constants/theme';
import { useCart } from '@/stores/cart';
import { computeQuote } from '@/lib/quote';
import { getProductImage } from '@/lib/productImage';

// ── Design tokens ─────────────────────────────────────────────────────────
const BG      = '#F8FAFC';
const SURFACE = '#FFFFFF';
const BORDER  = '#E2E8F0';
const TEXT    = '#0F172A';
const TEXTSUB = '#334155';
const MUTED   = '#64748B';
const PRIMARY = '#1D4ED8';
const ORANGE  = '#F97316';
const GREEN   = '#15803D';
const GREENLT = '#F0FDF4';

const PT = Platform.OS === 'ios' ? 56 : 36;

const fmt = (n: number) => '₹' + n.toLocaleString('en-IN');

// ── Screen ────────────────────────────────────────────────────────────────
export default function Cart() {
  const router  = useRouter();
  const items   = useCart((s) => s.items);
  const setQty  = useCart((s) => s.setQty);
  const remove  = useCart((s) => s.remove);
  const quote   = computeQuote(items);

  /* ── Empty state ── */
  if (!items.length) {
    return (
      <View style={s.root}>
        <StatusBar barStyle="dark-content" backgroundColor={SURFACE} />
        <CartHeader title="My Cart" onBack={() => router.back()} />
        <View style={s.emptyWrap}>
          <View style={s.emptyIconBox}>
            <ShoppingBag size={44} color="#0F172A" strokeWidth={1.4} />
          </View>
          <Text style={s.emptyTitle}>Your cart is empty</Text>
          <Text style={s.emptySub}>
            Browse categories and add cement, steel, sand or aggregate.
          </Text>
          <Pressable style={s.browseBtn} onPress={() => router.push('/customer/home')}>
            <Text style={s.browseBtnTxt}>Browse Categories</Text>
            <ChevronRight size={16} color="#FFFFFF" strokeWidth={2.5} />
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor={SURFACE} />
      <CartHeader title={`My Cart (${items.length})`} onBack={() => router.back()} />

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Delivery bar ── */}
        <View style={s.deliveryBar}>
          <View style={s.deliveryIconBox}>
            <MapPin size={16} color="#0F172A" strokeWidth={2} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={s.deliverToLbl}>Deliver to</Text>
            <Text style={s.deliveryAddr}>Ahmedabad, Gujarat — 380001</Text>
          </View>
          <Pressable
            style={s.changeBtn}
            onPress={() => router.push('/customer/checkout')}
          >
            <Text style={s.changeBtnTxt}>Change</Text>
          </Pressable>
        </View>

        {/* ── Cart items ── */}
        {items.map((it) => (
          <View key={it.productId} style={s.itemCard}>
            <View style={s.itemThumb}>
              <Image
                source={{ uri: getProductImage({ name: it.name, images: it.image ? [it.image] : null }, { size: 200 }) }}
                style={s.itemImg}
                contentFit="cover"
                transition={150}
              />
            </View>

            <View style={{ flex: 1, gap: 2 }}>
              <View style={s.itemTopRow}>
                <Text style={s.itemName} numberOfLines={2}>{it.name}</Text>
                <Pressable hitSlop={10} onPress={() => remove(it.productId)}>
                  <Trash2 size={17} color="#0F172A" strokeWidth={1.8} />
                </Pressable>
              </View>
              <Text style={s.itemUnit}>{it.unit}</Text>
              <Text style={s.itemUnitPrice}>{fmt(it.unitPrice)} / {it.unit}</Text>

              <View style={s.itemBottomRow}>
                <View style={s.stepper}>
                  <Pressable
                    style={s.stepBtn}
                    onPress={() => setQty(it.productId, Math.max(it.moq ?? 1, it.quantity - 1))}
                  >
                    <Minus size={13} color="#0F172A" strokeWidth={2.5} />
                  </Pressable>
                  <Text style={s.stepVal}>{it.quantity}</Text>
                  <Pressable
                    style={s.stepBtn}
                    onPress={() => setQty(it.productId, it.quantity + 1)}
                  >
                    <Plus size={13} color="#0F172A" strokeWidth={2.5} />
                  </Pressable>
                </View>
                <Text style={s.itemTotal}>{fmt(it.unitPrice * it.quantity)}</Text>
              </View>
            </View>
          </View>
        ))}

        {/* ── Price Details ── */}
        <View style={s.priceCard}>
          <Text style={s.priceCardTitle}>Price Details</Text>

          <PriceRow label="Total MRP"        value={fmt(quote.mrpTotal)} />
          <PriceRow label="Delivery Charges" value={fmt(quote.delivery)} />
          {quote.savings > 0 && (
            <PriceRow label="You Save" value={`- ${fmt(quote.savings)}`} green />
          )}

          <View style={s.priceDivider} />

          <View style={s.toPayRow}>
            <Text style={s.toPayLabel}>Total Payable</Text>
            <Text style={s.toPayValue}>{fmt(quote.total)}</Text>
          </View>

          {quote.savings > 0 && (
            <View style={s.savingsBar}>
              <Text style={s.savingsBarTxt}>You're saving {fmt(quote.savings)} on this order</Text>
            </View>
          )}
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* ── Checkout CTA ── */}
      <View style={s.bottomBar}>
        <View style={s.totalInline}>
          <Text style={s.totalInlineLbl}>Total</Text>
          <Text style={s.totalInlineVal}>{fmt(quote.total)}</Text>
        </View>
        <Pressable
          style={s.checkoutBtn}
          onPress={() => router.push('/customer/book/address')}
        >
          <Text style={s.checkoutTxt}>Proceed to Checkout</Text>
          <ChevronRight size={16} color="#FFFFFF" strokeWidth={2.5} />
        </Pressable>
      </View>
    </View>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────
function CartHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <View style={s.header}>
      <Pressable onPress={onBack} hitSlop={10} style={s.iconBtn}>
        <ArrowLeft size={22} color="#0F172A" strokeWidth={2} />
      </Pressable>
      <Text style={s.headerTitle}>{title}</Text>
      <View style={s.iconBtn} />
    </View>
  );
}

function PriceRow({ label, value, green }: { label: string; value: string; green?: boolean }) {
  return (
    <View style={s.priceRow}>
      <Text style={s.priceLabel}>{label}</Text>
      <Text style={[s.priceValue, green && { color: GREEN }]}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  header: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: SURFACE, borderBottomWidth: 1, borderBottomColor: BORDER,
    paddingHorizontal: 4, paddingTop: PT, paddingBottom: 8,
  },
  iconBtn:     { width: 46, height: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 23 },
  headerTitle: { flex: 1, textAlign: 'center', fontFamily: FontFamily.bold, fontSize: 17, color: TEXT },

  emptyWrap: {
    flex: 1, alignItems: 'center', paddingTop: 80, paddingHorizontal: 40, gap: 12,
  },
  emptyIconBox: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  emptyTitle: { fontFamily: FontFamily.bold, fontSize: 20, color: TEXT },
  emptySub: {
    fontFamily: FontFamily.regular, fontSize: 14,
    color: MUTED, textAlign: 'center', lineHeight: 22,
  },
  browseBtn: {
    marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: PRIMARY, paddingHorizontal: 22, paddingVertical: 13, borderRadius: 10,
  },
  browseBtnTxt: { fontFamily: FontFamily.bold, fontSize: 15, color: SURFACE },

  scroll: { padding: 16, gap: 12 },

  deliveryBar: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: SURFACE, borderRadius: 12,
    borderWidth: 1, borderColor: BORDER, padding: 14,
    shadowColor: TEXT, shadowOpacity: 0.04, shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 }, elevation: 1,
  },
  deliveryIconBox: {
    width: 36, height: 36, borderRadius: 8,
    backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center',
  },
  deliverToLbl: { fontFamily: FontFamily.regular, fontSize: 10.5, color: MUTED },
  deliveryAddr: { fontFamily: FontFamily.semiBold, fontSize: 13.5, color: TEXT },
  changeBtn: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 99, borderWidth: 1, borderColor: ORANGE + '50',
    backgroundColor: '#FFF7ED',
  },
  changeBtnTxt: { fontFamily: FontFamily.semiBold, fontSize: 12, color: ORANGE },

  itemCard: {
    flexDirection: 'row', gap: 12,
    backgroundColor: SURFACE, borderRadius: 14,
    padding: 12, borderWidth: 1, borderColor: BORDER,
    shadowColor: TEXT, shadowOpacity: 0.05, shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  itemThumb: {
    width: 76, height: 76, borderRadius: 10,
    backgroundColor: '#F1F5F9', overflow: 'hidden',
  },
  itemImg:      { width: '100%', height: '100%' },
  itemTopRow:   { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  itemName:     { fontFamily: FontFamily.semiBold, fontSize: 13.5, color: TEXT, flex: 1, lineHeight: 19 },
  itemUnit:     { fontFamily: FontFamily.regular, fontSize: 11, color: MUTED },
  itemUnitPrice:{ fontFamily: FontFamily.medium, fontSize: 12, color: TEXTSUB },
  itemBottomRow:{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  stepper: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: BORDER, borderRadius: 8, overflow: 'hidden',
  },
  stepBtn:  { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', backgroundColor: SURFACE },
  stepVal: {
    fontFamily: FontFamily.bold, fontSize: 14, color: TEXT,
    paddingHorizontal: 12,
    borderLeftWidth: 1, borderRightWidth: 1, borderColor: BORDER,
    lineHeight: 32, height: 32, textAlignVertical: 'center',
  },
  itemTotal: { fontFamily: FontFamily.bold, fontSize: 15.5, color: TEXT },

  priceCard: {
    backgroundColor: SURFACE, borderRadius: 14, padding: 16, gap: 6,
    borderWidth: 1, borderColor: BORDER,
    shadowColor: TEXT, shadowOpacity: 0.04, shadowRadius: 8,
    shadowOffset: { width: 0, height: 1 }, elevation: 1,
  },
  priceCardTitle: { fontFamily: FontFamily.bold, fontSize: 16, color: TEXT, marginBottom: 6 },
  priceRow:       { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  priceLabel:     { fontFamily: FontFamily.regular, fontSize: 14, color: TEXTSUB },
  priceValue:     { fontFamily: FontFamily.medium,  fontSize: 14, color: TEXT },
  priceDivider:   { height: 1, backgroundColor: BORDER, marginVertical: 10 },
  toPayRow:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  toPayLabel:     { fontFamily: FontFamily.bold, fontSize: 16, color: TEXT },
  toPayValue:     { fontFamily: FontFamily.bold, fontSize: 22, color: TEXT },
  savingsBar: {
    marginTop: 10, backgroundColor: GREENLT, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: '#BBF7D0',
  },
  savingsBarTxt: { fontFamily: FontFamily.semiBold, fontSize: 12.5, color: GREEN },

  bottomBar: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 16, paddingBottom: 24,
    backgroundColor: SURFACE, borderTopWidth: 1, borderTopColor: BORDER,
  },
  totalInline:    { gap: 1 },
  totalInlineLbl: { fontFamily: FontFamily.regular, fontSize: 11, color: MUTED },
  totalInlineVal: { fontFamily: FontFamily.bold, fontSize: 19, color: TEXT },
  checkoutBtn: {
    flex: 1, height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, backgroundColor: PRIMARY, borderRadius: 10,
    shadowColor: PRIMARY, shadowOpacity: 0.3, shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 }, elevation: 4,
  },
  checkoutTxt: { fontFamily: FontFamily.bold, fontSize: 16, color: SURFACE },
});
