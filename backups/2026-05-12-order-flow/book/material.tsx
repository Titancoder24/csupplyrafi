import React, { useState } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet, TextInput, Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { ArrowLeft, Search, Package, Minus, Plus, ChevronRight, ShoppingCart } from 'lucide-react-native';
import { useCart } from '@/stores/cart';
import { formatINR } from '@/lib/format';
import { getProductImage } from '@/lib/productImage';
import { FontFamily } from '@/constants/theme';

const BG      = '#F8FAFC';
const SURFACE = '#FFFFFF';
const BORDER  = '#E2E8F0';
const TEXT    = '#0F172A';
const TEXTSUB = '#334155';
const MUTED   = '#64748B';
const PRIMARY = '#1D4ED8';
const PRIMLT  = '#EFF6FF';
const PT      = Platform.OS === 'ios' ? 56 : Platform.OS === 'web' ? 0 : 36;
const STEPS = 7;
const STEP  = 3;

function StepHeader({ title, step, total, onBack }: { title: string; step: number; total: number; onBack: () => void }) {
  const pct = Math.round((step / total) * 100);
  return (
    <View style={sh.wrap}>
      <View style={[sh.row, { paddingTop: PT > 0 ? PT : 14 }]}>
        <Pressable onPress={onBack} hitSlop={12} style={sh.backBtn}>
          <ArrowLeft size={20} color={TEXT} strokeWidth={2} />
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

function Stepper({ value, min, onChange }: { value: number; min: number; onChange: (n: number) => void }) {
  return (
    <View style={st.wrap}>
      <Pressable
        style={[st.btn, value <= min && st.btnDis]}
        onPress={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
      >
        <Minus size={13} color={TEXT} strokeWidth={2.5} />
      </Pressable>
      <Text style={st.val}>{value}</Text>
      <Pressable style={st.btn} onPress={() => onChange(value + 1)}>
        <Plus size={13} color={PRIMARY} strokeWidth={2.5} />
      </Pressable>
    </View>
  );
}

const st = StyleSheet.create({
  wrap:   { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: BORDER, borderRadius: 8, overflow: 'hidden' },
  btn:    { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', backgroundColor: SURFACE },
  btnDis: { opacity: 0.35 },
  val: {
    fontFamily: FontFamily.bold, fontSize: 14, color: TEXT,
    paddingHorizontal: 12,
    borderLeftWidth: 1, borderRightWidth: 1, borderColor: BORDER,
    lineHeight: 34, height: 34, textAlignVertical: 'center',
  },
});

export default function StepMaterial() {
  const router  = useRouter();
  const items   = useCart(s => s.items);
  const setQty  = useCart(s => s.setQty);
  const total   = useCart(s => s.totalItems());
  const [search, setSearch] = useState('');

  const filtered = items.filter(it =>
    it.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={s.root}>
      <StepHeader title="Review Materials" step={STEP} total={STEPS} onBack={() => router.back()} />

      <View style={s.searchWrap}>
        <Search size={15} color={MUTED} strokeWidth={2} />
        <TextInput
          style={s.searchInput}
          placeholder="Search material"
          placeholderTextColor={MUTED}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <ScrollView contentContainerStyle={s.list} showsVerticalScrollIndicator={false}>
        {filtered.length === 0 ? (
          <View style={s.empty}>
            <View style={s.emptyIconBox}>
              <Package size={40} color={MUTED} strokeWidth={1.4} />
            </View>
            <Text style={s.emptyTitle}>
              {items.length === 0 ? 'Cart is empty' : 'No results'}
            </Text>
            <Text style={s.emptySub}>
              {items.length === 0
                ? 'Add materials from the home screen first.'
                : 'No materials match your search.'}
            </Text>
          </View>
        ) : (
          filtered.map(it => (
            <View key={it.productId} style={s.card}>
              <View style={s.imgWrap}>
                <Image
                  source={{ uri: getProductImage(it.name, { size: 200 }) }}
                  style={s.img}
                  contentFit="cover"
                  transition={150}
                />
              </View>
              <View style={s.info}>
                <Text style={s.name} numberOfLines={2}>{it.name}</Text>
                <Text style={s.price}>{formatINR(it.unitPrice)} / {it.unit}</Text>
              </View>
              <Stepper
                value={it.quantity}
                min={it.moq ?? 1}
                onChange={n => setQty(it.productId, n)}
              />
            </View>
          ))
        )}
      </ScrollView>

      <View style={s.stickyBar}>
        {total > 0 && (
          <View style={s.totalRow}>
            <ShoppingCart size={16} color={PRIMARY} strokeWidth={2} />
            <Text style={s.totalTxt}>{total} items selected</Text>
          </View>
        )}
        <Pressable
          style={[s.btn, total === 0 && s.btnDis]}
          disabled={total === 0}
          onPress={() => router.push('/customer/book/time')}
        >
          <Text style={s.btnTxt}>Continue to Delivery</Text>
          <ChevronRight size={16} color={SURFACE} strokeWidth={2.5} />
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: SURFACE, borderRadius: 12, borderWidth: 1, borderColor: BORDER,
    marginHorizontal: 16, marginTop: 14, marginBottom: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    shadowColor: TEXT, shadowOpacity: 0.04, shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 }, elevation: 1,
  },
  searchInput: { flex: 1, fontSize: 14, fontFamily: FontFamily.regular, color: TEXT },

  list: { paddingHorizontal: 16, gap: 10, paddingBottom: 32 },

  empty:       { alignItems: 'center', paddingVertical: 56, gap: 12 },
  emptyIconBox:{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  emptyTitle:  { fontFamily: FontFamily.bold, fontSize: 16, color: TEXT },
  emptySub:    { fontFamily: FontFamily.regular, fontSize: 13, color: MUTED, textAlign: 'center', lineHeight: 20 },

  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: SURFACE, borderRadius: 14, borderWidth: 1, borderColor: BORDER, padding: 12,
    shadowColor: TEXT, shadowOpacity: 0.04, shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 }, elevation: 1,
  },
  imgWrap: { width: 64, height: 64, borderRadius: 10, overflow: 'hidden', backgroundColor: '#F1F5F9' },
  img:     { width: 64, height: 64 },
  info:    { flex: 1, gap: 4 },
  name:    { fontFamily: FontFamily.semiBold, fontSize: 13.5, color: TEXT, lineHeight: 19 },
  price:   { fontFamily: FontFamily.regular, fontSize: 12, color: MUTED },

  stickyBar: {
    paddingHorizontal: 16, paddingTop: 10, paddingBottom: 28,
    backgroundColor: SURFACE, borderTopWidth: 1, borderTopColor: BORDER, gap: 10,
  },
  totalRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  totalTxt: { fontFamily: FontFamily.semiBold, fontSize: 13, color: PRIMARY },
  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: PRIMARY, borderRadius: 12, paddingVertical: 15,
  },
  btnDis:  { opacity: 0.45 },
  btnTxt:  { fontFamily: FontFamily.bold, fontSize: 15, color: SURFACE },
});
