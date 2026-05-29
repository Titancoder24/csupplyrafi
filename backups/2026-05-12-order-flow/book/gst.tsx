import React, { useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet, ScrollView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, CheckCircle2, ChevronRight, Building2, User } from 'lucide-react-native';
import { useBooking } from '@/stores/booking';
import { FontFamily } from '@/constants/theme';

const BG      = '#F8FAFC';
const SURFACE = '#FFFFFF';
const BORDER  = '#E2E8F0';
const TEXT    = '#0F172A';
const TEXTSUB = '#334155';
const MUTED   = '#64748B';
const PRIMARY = '#1D4ED8';
const PRIMLT  = '#EFF6FF';
const GREEN   = '#15803D';
const GREENLT = '#F0FDF4';
const PT      = Platform.OS === 'ios' ? 56 : Platform.OS === 'web' ? 0 : 36;
const STEPS = 7;
const STEP  = 2;

const GST_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

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

function FieldInput({
  label, value, onChange, placeholder,
  autoCapitalize = 'none', keyboardType = 'default', valid, hint,
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder: string; autoCapitalize?: any; keyboardType?: any;
  valid?: boolean; hint?: string;
}) {
  const borderColor = valid === true ? GREEN : valid === false ? '#EF4444' : BORDER;
  return (
    <View style={fi.wrap}>
      <Text style={fi.label}>{label}</Text>
      <View style={[fi.row, { borderColor }]}>
        <TextInput
          style={fi.input}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={MUTED}
          autoCapitalize={autoCapitalize}
          keyboardType={keyboardType}
        />
        {valid === true && <CheckCircle2 size={18} color={GREEN} strokeWidth={2} />}
      </View>
      {hint && <Text style={fi.hint}>{hint}</Text>}
    </View>
  );
}

const fi = StyleSheet.create({
  wrap:  { gap: 6 },
  label: { fontFamily: FontFamily.semiBold, fontSize: 13, color: TEXTSUB },
  row: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: SURFACE, borderRadius: 10, borderWidth: 1.5,
    paddingHorizontal: 14, paddingVertical: 13, gap: 8,
  },
  input: { flex: 1, fontFamily: FontFamily.regular, fontSize: 14, color: TEXT },
  hint:  { fontFamily: FontFamily.regular, fontSize: 11, color: MUTED, lineHeight: 16 },
});

export default function StepGst() {
  const router  = useRouter();
  const booking = useBooking();
  const [hasGst, setHasGst] = useState<'yes' | 'no'>(booking.gst.hasGst ? 'yes' : 'no');
  const [gst,     setGst]     = useState(booking.gst.gstNumber    ?? '');
  const [bizName, setBizName] = useState(booking.gst.businessName ?? '');
  const [name,    setName]    = useState(booking.gst.fullName     ?? '');

  const gstValid   = GST_RE.test(gst);
  const canContinue = hasGst === 'yes'
    ? gstValid && bizName.trim().length > 1
    : name.trim().length > 1;

  return (
    <View style={s.root}>
      <StepHeader title="GST Details" step={STEP} total={STEPS} onBack={() => router.back()} />

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Toggle */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>Do you have a GST number?</Text>
          <View style={s.toggle}>
            <Pressable
              style={[s.toggleBtn, hasGst === 'yes' && s.toggleBtnActive]}
              onPress={() => setHasGst('yes')}
            >
              <Building2 size={16} color={hasGst === 'yes' ? SURFACE : MUTED} strokeWidth={1.8} />
              <Text style={[s.toggleTxt, hasGst === 'yes' && s.toggleTxtActive]}>Yes, I have GST</Text>
            </Pressable>
            <Pressable
              style={[s.toggleBtn, hasGst === 'no' && s.toggleBtnActive]}
              onPress={() => setHasGst('no')}
            >
              <User size={16} color={hasGst === 'no' ? SURFACE : MUTED} strokeWidth={1.8} />
              <Text style={[s.toggleTxt, hasGst === 'no' && s.toggleTxtActive]}>No GST</Text>
            </Pressable>
          </View>
        </View>

        {/* Fields */}
        <View style={s.card}>
          {hasGst === 'yes' ? (
            <View style={{ gap: 14 }}>
              <FieldInput
                label="GST Number"
                value={gst}
                onChange={v => setGst(v.toUpperCase())}
                placeholder="33ABCDE1234F1Z5"
                autoCapitalize="characters"
                valid={gst.length > 0 ? gstValid : undefined}
                hint="15-character GST Identification Number"
              />
              <FieldInput
                label="Business / Company Name"
                value={bizName}
                onChange={setBizName}
                placeholder="ABC Constructions Pvt Ltd"
                autoCapitalize="words"
              />
            </View>
          ) : (
            <FieldInput
              label="Full Name"
              value={name}
              onChange={setName}
              placeholder="Your full name"
              autoCapitalize="words"
            />
          )}
        </View>

        {hasGst === 'yes' && gstValid && (
          <View style={s.verifiedBanner}>
            <CheckCircle2 size={16} color={GREEN} strokeWidth={2} />
            <Text style={s.verifiedTxt}>GST number format verified</Text>
          </View>
        )}
      </ScrollView>

      <View style={s.stickyBar}>
        <Pressable
          style={[s.btn, !canContinue && s.btnDis]}
          disabled={!canContinue}
          onPress={() => {
            booking.set({
              gst: hasGst === 'yes'
                ? { hasGst: true, gstNumber: gst, businessName: bizName }
                : { hasGst: false, fullName: name },
            });
            router.push('/customer/book/material');
          }}
        >
          <Text style={s.btnTxt}>Continue</Text>
          <ChevronRight size={16} color={SURFACE} strokeWidth={2.5} />
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

  toggle: { flexDirection: 'row', gap: 10 },
  toggleBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 14, borderRadius: 12,
    borderWidth: 1.5, borderColor: BORDER, backgroundColor: SURFACE,
  },
  toggleBtnActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  toggleTxt:       { fontFamily: FontFamily.semiBold, fontSize: 14, color: TEXTSUB },
  toggleTxtActive: { color: SURFACE },

  card: {
    backgroundColor: SURFACE, borderRadius: 14, borderWidth: 1, borderColor: BORDER,
    padding: 16,
    shadowColor: TEXT, shadowOpacity: 0.04, shadowRadius: 8,
    shadowOffset: { width: 0, height: 1 }, elevation: 1,
  },

  verifiedBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: GREENLT, borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: '#BBF7D0',
  },
  verifiedTxt: { fontFamily: FontFamily.semiBold, fontSize: 13, color: GREEN },

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
