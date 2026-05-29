import React, { useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, ScrollView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Calendar, Clock, Zap, ChevronRight } from 'lucide-react-native';
import { useBooking } from '@/stores/booking';
import { FontFamily } from '@/constants/theme';

const BG      = '#F8FAFC';
const SURFACE = '#FFFFFF';
const BORDER  = '#E2E8F0';
const TEXT    = '#0F172A';
const TEXTSUB = '#334155';
const MUTED   = '#64748B';
const PRIMARY = '#15803D';
const PRIMLT  = '#F0FDF4';
const PT      = Platform.OS === 'ios' ? 56 : Platform.OS === 'web' ? 0 : 36;
const STEPS = 7;
const STEP  = 4;

const SLOTS = ['8 AM – 12 PM', '12 PM – 4 PM', '4 PM – 8 PM'];

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

export default function StepTime() {
  const router  = useRouter();
  const booking = useBooking();
  const [mode, setMode] = useState<'instant' | 'schedule'>(booking.delivery.mode ?? 'schedule');
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  const [date, setDate] = useState(booking.delivery.date ?? tomorrow.toISOString().slice(0, 10));
  const [slot, setSlot] = useState(booking.delivery.slot ?? SLOTS[0]);

  const dateLabel = new Date(date).toLocaleDateString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    <View style={s.root}>
      <StepHeader title="Delivery Time" step={STEP} total={STEPS} onBack={() => router.back()} />

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Delivery mode cards */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>Choose Delivery Type</Text>
          <View style={s.modeRow}>
            {([
              { key: 'instant',  icon: Zap,      title: 'Instant',   sub: 'Within 2–4 hrs', color: '#B45309', colorLt: '#FFFBEB' },
              { key: 'schedule', icon: Calendar,  title: 'Scheduled', sub: 'Choose date & slot', color: PRIMARY, colorLt: PRIMLT },
            ] as const).map(({ key, icon: Icon, title, sub, color, colorLt }) => (
              <Pressable
                key={key}
                style={[s.modeCard, mode === key && { borderColor: color, backgroundColor: colorLt }]}
                onPress={() => setMode(key)}
              >
                <View style={[s.modeIconBox, { backgroundColor: mode === key ? color + '20' : BG }]}>
                  <Icon size={20} color="#0F172A" strokeWidth={1.8} />
                </View>
                <Text style={[s.modeTitle, mode === key && { color }]}>{title}</Text>
                <Text style={s.modeSub}>{sub}</Text>
                {mode === key && (
                  <View style={[s.modeCheck, { backgroundColor: color }]}>
                    <Text style={s.modeCheckTxt}>✓</Text>
                  </View>
                )}
              </Pressable>
            ))}
          </View>
        </View>

        {/* Schedule options */}
        {mode === 'schedule' && (
          <View style={s.card}>
            <Text style={s.cardTitle}>Select Date</Text>
            <Pressable style={s.dateRow}>
              <Calendar size={16} color="#0F172A" strokeWidth={1.8} />
              <Text style={s.dateText}>{dateLabel}</Text>
            </Pressable>

            <Text style={[s.cardTitle, { marginTop: 16 }]}>Select Time Slot</Text>
            <View style={s.slotsCol}>
              {SLOTS.map(sl => {
                const active = slot === sl;
                return (
                  <Pressable
                    key={sl}
                    onPress={() => setSlot(sl)}
                    style={[s.slotRow, active && s.slotRowActive]}
                  >
                    <Clock size={15} color="#FFFFFF" strokeWidth={2} />
                    <Text style={[s.slotTxt, active && s.slotTxtActive]}>{sl}</Text>
                    {active && <View style={s.slotCheck}><Text style={{ color: SURFACE, fontSize: 10, fontFamily: FontFamily.bold }}>✓</Text></View>}
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {mode === 'instant' && (
          <View style={s.instantCard}>
            <Zap size={18} color="#0F172A" strokeWidth={1.8} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={s.instantTitle}>Instant Delivery Selected</Text>
              <Text style={s.instantSub}>We will dispatch within 2–4 hours of confirmation.</Text>
            </View>
          </View>
        )}
      </ScrollView>

      <View style={s.stickyBar}>
        <Pressable
          style={s.btn}
          onPress={() => {
            booking.set({ delivery: { mode, date, slot } });
            router.push('/customer/book/vehicle-entry');
          }}
        >
          <Text style={s.btnTxt}>Continue</Text>
          <ChevronRight size={16} color="#FFFFFF" strokeWidth={2.5} />
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: BG },
  scroll: { padding: 16, gap: 16, paddingBottom: 32 },

  section:      { gap: 10 },
  sectionLabel: { fontFamily: FontFamily.bold, fontSize: 16, color: TEXT, letterSpacing: -0.2 },

  modeRow: { flexDirection: 'row', gap: 12 },
  modeCard: {
    flex: 1, backgroundColor: SURFACE, borderRadius: 14, borderWidth: 1.5, borderColor: BORDER,
    padding: 14, alignItems: 'center', gap: 6,
    shadowColor: TEXT, shadowOpacity: 0.04, shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 }, elevation: 1,
  },
  modeIconBox: { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  modeTitle:   { fontFamily: FontFamily.bold, fontSize: 14, color: TEXT },
  modeSub:     { fontFamily: FontFamily.regular, fontSize: 11, color: MUTED, textAlign: 'center' },
  modeCheck: {
    position: 'absolute', top: 10, right: 10,
    width: 20, height: 20, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  modeCheckTxt: { fontFamily: FontFamily.bold, fontSize: 11, color: SURFACE },

  card: {
    backgroundColor: SURFACE, borderRadius: 14, borderWidth: 1, borderColor: BORDER,
    padding: 16, gap: 8,
    shadowColor: TEXT, shadowOpacity: 0.04, shadowRadius: 8,
    shadowOffset: { width: 0, height: 1 }, elevation: 1,
  },
  cardTitle: { fontFamily: FontFamily.semiBold, fontSize: 13, color: TEXTSUB },
  dateRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1, borderColor: BORDER, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 13, backgroundColor: BG,
  },
  dateText: { fontFamily: FontFamily.semiBold, fontSize: 14, color: TEXT },

  slotsCol:    { gap: 8, marginTop: 4 },
  slotRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 13, paddingHorizontal: 14,
    borderRadius: 10, borderWidth: 1.5, borderColor: BORDER, backgroundColor: BG,
  },
  slotRowActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  slotTxt:       { fontFamily: FontFamily.semiBold, fontSize: 14, color: TEXTSUB, flex: 1 },
  slotTxtActive: { color: SURFACE },
  slotCheck: {
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center', justifyContent: 'center',
  },

  instantCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#FFFBEB', borderRadius: 12,
    borderWidth: 1, borderColor: '#FDE68A', padding: 14,
  },
  instantTitle: { fontFamily: FontFamily.semiBold, fontSize: 13.5, color: '#92400E' },
  instantSub:   { fontFamily: FontFamily.regular, fontSize: 12, color: '#B45309' },

  stickyBar: {
    paddingHorizontal: 16, paddingVertical: 12, paddingBottom: 28,
    backgroundColor: SURFACE, borderTopWidth: 1, borderTopColor: BORDER,
  },
  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: PRIMARY, borderRadius: 12, paddingVertical: 15,
  },
  btnTxt: { fontFamily: FontFamily.bold, fontSize: 15, color: SURFACE },
});
