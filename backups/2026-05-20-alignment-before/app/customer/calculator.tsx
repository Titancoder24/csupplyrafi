import React, { useMemo, useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet, ScrollView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Calculator, Package, ShoppingCart } from 'lucide-react-native';
import { useCart } from '@/stores/cart';
import { FontFamily } from '@/constants/theme';

const BG      = '#F8FAFC';
const SURFACE = '#FFFFFF';
const BORDER  = '#E2E8F0';
const TEXT    = '#0F172A';
const TEXTSUB = '#334155';
const MUTED   = '#64748B';
const PRIMARY = '#1D4ED8';
const PRIMLT  = '#EFF6FF';
const ORANGE  = '#F97316';
const PT      = Platform.OS === 'ios' ? 56 : Platform.OS === 'web' ? 0 : 36;

const TYPES = ['Residential', 'Commercial', 'Industrial'] as const;

const RATIOS: Record<typeof TYPES[number], {
  cement: number; steel: number; sand: number; aggregate: number; bricks: number;
}> = {
  Residential: { cement: 0.40, steel: 1.2, sand: 0.05, aggregate: 0.06, bricks: 12 },
  Commercial:  { cement: 0.50, steel: 1.6, sand: 0.06, aggregate: 0.07, bricks: 14 },
  Industrial:  { cement: 0.55, steel: 1.8, sand: 0.07, aggregate: 0.08, bricks: 16 },
};

const MATERIAL_ICONS: Record<string, string> = {
  Cement: '🏗️', Steel: '🔩', Sand: '🏖️', Aggregate: '🪨', Bricks: '🧱',
};

export default function CalculatorScreen() {
  const router = useRouter();
  const add    = useCart(s => s.add);
  const [area, setArea] = useState('1000');
  const [type, setType] = useState<typeof TYPES[number]>('Residential');

  const result = useMemo(() => {
    const a = parseFloat(area || '0');
    const r = RATIOS[type];
    return [
      { label: 'Cement',    value: `${Math.round(a * r.cement)} bags`,          unit: 'bags' },
      { label: 'Steel',     value: `${Math.round(a * r.steel)} kg`,             unit: 'kg'   },
      { label: 'Sand',      value: `${(a * r.sand).toFixed(1)} cu m`,           unit: 'cu m' },
      { label: 'Aggregate', value: `${(a * r.aggregate).toFixed(1)} cu m`,      unit: 'cu m' },
      { label: 'Bricks',    value: `${Math.round(a * r.bricks).toLocaleString('en-IN')} pcs`, unit: 'pcs' },
    ];
  }, [area, type]);

  return (
    <View style={s.root}>
      <View style={[s.header, { paddingTop: PT > 0 ? PT : 14 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={s.backBtn}>
          <ArrowLeft size={20} color="#0F172A" strokeWidth={2} />
        </Pressable>
        <View style={s.headerCenter}>
          <Calculator size={16} color="#0F172A" strokeWidth={2} />
          <Text style={s.headerTitle}>Material Calculator</Text>
        </View>
        <View style={s.backBtn} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Input card */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Construction Details</Text>

          <View style={s.fieldWrap}>
            <Text style={s.fieldLabel}>Total Construction Area</Text>
            <View style={s.inputRow}>
              <TextInput
                style={s.input}
                keyboardType="number-pad"
                value={area}
                onChangeText={v => setArea(v.replace(/\D/g, ''))}
                placeholder="1000"
                placeholderTextColor={MUTED}
              />
              <View style={s.inputUnit}>
                <Text style={s.inputUnitTxt}>sq ft</Text>
              </View>
            </View>
          </View>

          <View style={s.fieldWrap}>
            <Text style={s.fieldLabel}>Construction Type</Text>
            <View style={s.typeRow}>
              {TYPES.map(t => {
                const active = t === type;
                return (
                  <Pressable
                    key={t}
                    style={[s.typeBtn, active && s.typeBtnActive]}
                    onPress={() => setType(t)}
                  >
                    <Text style={[s.typeTxt, active && s.typeTxtActive]}>{t}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>

        {/* Results card */}
        <View style={s.resultCard}>
          <View style={s.resultHeader}>
            <Package size={15} color="#0F172A" strokeWidth={2} />
            <Text style={s.resultTitle}>Estimated Bill of Materials</Text>
          </View>
          <Text style={s.resultSub}>
            For {parseFloat(area || '0').toLocaleString('en-IN')} sq ft · {type} grade
          </Text>
          <View style={s.rows}>
            {result.map((row, i) => (
              <View key={row.label} style={[s.resultRow, i < result.length - 1 && s.resultRowBorder]}>
                <View style={s.resultLeft}>
                  <Text style={s.resultEmoji}>{MATERIAL_ICONS[row.label] ?? '📦'}</Text>
                  <Text style={s.resultLabel}>{row.label}</Text>
                </View>
                <Text style={s.resultValue}>{row.value}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* CTA */}
        <Pressable
          style={s.addAllBtn}
          onPress={() => router.push('/customer/home' as never)}
        >
          <ShoppingCart size={16} color="#FFFFFF" strokeWidth={2.5} />
          <Text style={s.addAllTxt}>Shop These Materials</Text>
        </Pressable>

        <Text style={s.disclaimer}>
          * Estimates are approximate based on standard construction norms. Actual quantities may vary by 10–15%.
        </Text>
      </ScrollView>
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
  headerCenter:{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  headerTitle: { fontFamily: FontFamily.bold, fontSize: 16, color: TEXT },

  scroll: { padding: 16, gap: 16, paddingBottom: 40 },

  card: {
    backgroundColor: SURFACE, borderRadius: 14, borderWidth: 1, borderColor: BORDER, padding: 16, gap: 14,
    shadowColor: TEXT, shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 1 }, elevation: 1,
  },
  cardTitle: { fontFamily: FontFamily.semiBold, fontSize: 14, color: TEXTSUB },

  fieldWrap:  { gap: 7 },
  fieldLabel: { fontFamily: FontFamily.semiBold, fontSize: 13, color: TEXTSUB },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: BORDER, borderRadius: 10, overflow: 'hidden',
    backgroundColor: SURFACE,
  },
  input:     { flex: 1, paddingHorizontal: 14, paddingVertical: 13, fontFamily: FontFamily.semiBold, fontSize: 16, color: TEXT },
  inputUnit: { paddingHorizontal: 14, paddingVertical: 13, backgroundColor: BG, borderLeftWidth: 1, borderLeftColor: BORDER },
  inputUnitTxt: { fontFamily: FontFamily.semiBold, fontSize: 13, color: MUTED },

  typeRow: { flexDirection: 'row', gap: 8 },
  typeBtn: {
    flex: 1, paddingVertical: 11, alignItems: 'center', borderRadius: 9,
    borderWidth: 1.5, borderColor: BORDER, backgroundColor: SURFACE,
  },
  typeBtnActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  typeTxt:       { fontFamily: FontFamily.semiBold, fontSize: 13, color: TEXTSUB },
  typeTxtActive: { color: SURFACE },

  resultCard: {
    backgroundColor: SURFACE, borderRadius: 14, borderWidth: 1, borderColor: BORDER, overflow: 'hidden',
    shadowColor: TEXT, shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 1 }, elevation: 1,
  },
  resultHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    paddingHorizontal: 14, paddingTop: 14, paddingBottom: 4,
  },
  resultTitle: { fontFamily: FontFamily.bold, fontSize: 15, color: TEXT },
  resultSub:   { fontFamily: FontFamily.regular, fontSize: 12, color: MUTED, paddingHorizontal: 14, paddingBottom: 10 },
  rows:        { borderTopWidth: 1, borderTopColor: BORDER },
  resultRow:   { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 13 },
  resultRowBorder: { borderBottomWidth: 1, borderBottomColor: BORDER },
  resultLeft:  { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  resultEmoji: { fontSize: 18 },
  resultLabel: { fontFamily: FontFamily.semiBold, fontSize: 14, color: TEXT },
  resultValue: { fontFamily: FontFamily.bold, fontSize: 15, color: PRIMARY },

  addAllBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: ORANGE, borderRadius: 12, paddingVertical: 15,
    shadowColor: ORANGE, shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 4,
  },
  addAllTxt: { fontFamily: FontFamily.bold, fontSize: 15, color: SURFACE },

  disclaimer: {
    fontFamily: FontFamily.regular, fontSize: 11.5, color: MUTED,
    textAlign: 'center', lineHeight: 17,
  },
});
