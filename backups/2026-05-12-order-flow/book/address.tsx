import React, { useState } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet,
  TextInput, ActivityIndicator, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Search, MapPin, Plus, CheckCircle2, ChevronRight } from 'lucide-react-native';
import { useBooking } from '@/stores/booking';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/services/supabase';
import { useAuth } from '@/services/auth/AuthProvider';
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
const STEPS   = 7;
const STEP    = 1;

const DEMO = [
  { id: 'demo-home', label: 'Home', line1: '12, Green Street', city: 'Coimbatore', pincode: '641001', is_default: true },
  { id: 'demo-site', label: 'Site Address', line1: 'Building Construction, Avinashi Road', city: 'Coimbatore', pincode: '641037', is_default: false },
];

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

export default function StepAddress() {
  const router = useRouter();
  const { addressId, set } = useBooking();
  const { profile } = useAuth();
  const [search, setSearch] = useState('');

  const { data: saved = [], isLoading } = useQuery({
    queryKey: ['addresses', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const { data } = await supabase
        .from('addresses')
        .select('id, label, line1, city, state, pincode, is_default')
        .eq('profile_id', profile.id);
      return data ?? [];
    },
    enabled: Boolean(profile?.id),
  });

  const addresses = saved.length > 0 ? saved : DEMO;
  const filtered  = addresses.filter(
    a => a.label.toLowerCase().includes(search.toLowerCase()) ||
         a.line1.toLowerCase().includes(search.toLowerCase())
  );

  const [selected, setSelected] = useState<string>(
    addressId ?? addresses.find(a => a.is_default)?.id ?? addresses[0]?.id ?? ''
  );

  return (
    <View style={s.root}>
      <StepHeader title="Delivery Address" step={STEP} total={STEPS} onBack={() => router.back()} />

      {/* Search */}
      <View style={s.searchWrap}>
        <Search size={15} color={MUTED} strokeWidth={2} />
        <TextInput
          style={s.searchInput}
          placeholder="Search saved addresses"
          placeholderTextColor={MUTED}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <ScrollView contentContainerStyle={s.list} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <ActivityIndicator color={PRIMARY} style={{ marginTop: 40 }} />
        ) : (
          filtered.map(a => {
            const sel = selected === a.id;
            return (
              <Pressable
                key={a.id}
                onPress={() => setSelected(a.id)}
                style={[s.card, sel && s.cardSelected]}
              >
                <View style={[s.iconBox, { backgroundColor: sel ? PRIMLT : BG }]}>
                  <MapPin size={18} color={sel ? PRIMARY : MUTED} strokeWidth={2} />
                </View>
                <View style={s.cardBody}>
                  <View style={s.cardTopRow}>
                    <Text style={[s.cardLabel, sel && { color: PRIMARY }]}>{a.label}</Text>
                    {a.is_default && (
                      <View style={s.defaultBadge}>
                        <Text style={s.defaultBadgeTxt}>Default</Text>
                      </View>
                    )}
                  </View>
                  <Text style={s.cardAddr}>{a.line1}, {a.city} — {a.pincode}</Text>
                </View>
                {sel
                  ? <CheckCircle2 size={22} color={PRIMARY} strokeWidth={2} />
                  : <View style={s.radio} />
                }
              </Pressable>
            );
          })
        )}

        <Pressable style={s.addRow}>
          <View style={s.addIconBox}>
            <Plus size={16} color={PRIMARY} strokeWidth={2.5} />
          </View>
          <Text style={s.addText}>Add New Address</Text>
        </Pressable>
      </ScrollView>

      {/* Sticky CTA */}
      <View style={s.stickyBar}>
        <Pressable
          style={[s.btn, !selected && s.btnDis]}
          disabled={!selected}
          onPress={() => { set({ addressId: selected }); router.push('/customer/book/gst'); }}
        >
          <Text style={s.btnTxt}>Continue</Text>
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

  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: SURFACE, borderRadius: 14, borderWidth: 1.5, borderColor: BORDER, padding: 14,
    shadowColor: TEXT, shadowOpacity: 0.04, shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 }, elevation: 1,
  },
  cardSelected: { borderColor: PRIMARY, backgroundColor: '#F8FBFF' },
  iconBox:      { width: 42, height: 42, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  cardBody:     { flex: 1, gap: 4 },
  cardTopRow:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardLabel:    { fontFamily: FontFamily.semiBold, fontSize: 15, color: TEXT },
  defaultBadge: { backgroundColor: PRIMLT, borderRadius: 99, paddingHorizontal: 7, paddingVertical: 2 },
  defaultBadgeTxt: { fontFamily: FontFamily.semiBold, fontSize: 9.5, color: PRIMARY },
  cardAddr:     { fontFamily: FontFamily.regular, fontSize: 12.5, color: MUTED, lineHeight: 18 },
  radio:        { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: BORDER },

  addRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 14, paddingHorizontal: 2,
  },
  addIconBox: {
    width: 34, height: 34, borderRadius: 8,
    backgroundColor: PRIMLT, alignItems: 'center', justifyContent: 'center',
  },
  addText: { fontFamily: FontFamily.semiBold, fontSize: 14, color: PRIMARY },

  stickyBar: {
    paddingHorizontal: 16, paddingVertical: 12, paddingBottom: 28,
    backgroundColor: SURFACE, borderTopWidth: 1, borderTopColor: BORDER,
  },
  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: PRIMARY, borderRadius: 12, paddingVertical: 15,
  },
  btnDis:  { opacity: 0.45 },
  btnTxt:  { fontFamily: FontFamily.bold, fontSize: 15, color: SURFACE },
});
