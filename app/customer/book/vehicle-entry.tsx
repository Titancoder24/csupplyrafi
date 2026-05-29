import React, { useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet, ScrollView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Truck, Clock, User, Phone, CheckCircle2, ChevronRight } from 'lucide-react-native';
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
const STEP  = 5;

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

function FieldInput({
  label, value, onChange, placeholder,
  autoCapitalize = 'none', keyboardType = 'default',
  icon: Icon,
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder: string; autoCapitalize?: any; keyboardType?: any;
  icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
}) {
  return (
    <View style={fi.wrap}>
      <Text style={fi.label}>{label}</Text>
      <View style={fi.row}>
        <Icon size={16} color="#0F172A" strokeWidth={1.8} />
        <TextInput
          style={fi.input}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={MUTED}
          autoCapitalize={autoCapitalize}
          keyboardType={keyboardType}
        />
      </View>
    </View>
  );
}

const fi = StyleSheet.create({
  wrap:  { gap: 6 },
  label: { fontFamily: FontFamily.semiBold, fontSize: 13, color: TEXTSUB },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: SURFACE, borderRadius: 10, borderWidth: 1.5, borderColor: BORDER,
    paddingHorizontal: 14, paddingVertical: 13,
  },
  input: { flex: 1, fontFamily: FontFamily.regular, fontSize: 14, color: TEXT },
});

export default function StepVehicleEntry() {
  const router  = useRouter();
  const b       = useBooking();
  const [needed,  setNeeded]  = useState<'yes' | 'no'>(b.vehicleEntry.needed ? 'yes' : 'no');
  const [vno,     setVno]     = useState(b.vehicleEntry.vehicleNumber ?? '');
  const [time,    setTime]    = useState(b.vehicleEntry.entryTime ?? '10:30 AM');
  const [contact, setContact] = useState(b.vehicleEntry.contactPerson ?? '');
  const [phone,   setPhone]   = useState(b.vehicleEntry.phone ?? '');

  const valid = needed === 'no' ||
    (vno.length >= 6 && contact.trim().length > 1 && phone.replace(/\D/g, '').length === 10);

  return (
    <View style={s.root}>
      <StepHeader title="Vehicle Entry" step={STEP} total={STEPS} onBack={() => router.back()} />

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Info banner */}
        <View style={s.infoBanner}>
          <View style={s.infoIconBox}>
            <Truck size={18} color="#0F172A" strokeWidth={1.8} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={s.infoTitle}>Vehicle Entry Pass</Text>
            <Text style={s.infoSub}>Required if your site has restricted vehicle access.</Text>
          </View>
        </View>

        {/* Yes / No toggle */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>Do you need a vehicle entry slip?</Text>
          <View style={s.toggle}>
            {(['yes', 'no'] as const).map(opt => (
              <Pressable
                key={opt}
                style={[s.toggleBtn, needed === opt && s.toggleBtnActive]}
                onPress={() => setNeeded(opt)}
              >
                {needed === opt && (
                  <CheckCircle2 size={15} color="#FFFFFF" strokeWidth={2.5} />
                )}
                <Text style={[s.toggleTxt, needed === opt && s.toggleTxtActive]}>
                  {opt === 'yes' ? 'Yes, I need one' : 'No, not required'}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {needed === 'yes' && (
          <View style={s.card}>
            <Text style={s.cardTitle}>Entry Details</Text>
            <View style={s.fields}>
              <FieldInput
                label="Vehicle Number"
                value={vno}
                onChange={v => setVno(v.toUpperCase())}
                placeholder="TN 38 AB 1234"
                autoCapitalize="characters"
                icon={Truck}
              />
              <FieldInput
                label="Expected Entry Time"
                value={time}
                onChange={setTime}
                placeholder="10:30 AM"
                icon={Clock}
              />
              <FieldInput
                label="Contact Person at Gate"
                value={contact}
                onChange={setContact}
                placeholder="Ramesh Kumar"
                autoCapitalize="words"
                icon={User}
              />
              <FieldInput
                label="Phone Number"
                value={phone}
                onChange={t => setPhone(t.replace(/\D/g, ''))}
                placeholder="9876543210"
                keyboardType="number-pad"
                icon={Phone}
              />
            </View>
          </View>
        )}

        {needed === 'no' && (
          <View style={s.noSlipCard}>
            <CheckCircle2 size={32} color="#0F172A" strokeWidth={1.8} />
            <Text style={s.noSlipTitle}>No Pass Required</Text>
            <Text style={s.noSlipSub}>Your order will be delivered directly to the site without a vehicle entry pass.</Text>
          </View>
        )}
      </ScrollView>

      <View style={s.stickyBar}>
        <Pressable
          style={[s.btn, !valid && s.btnDis]}
          disabled={!valid}
          onPress={() => {
            b.set({
              vehicleEntry: needed === 'yes'
                ? { needed: true, vehicleNumber: vno, entryTime: time, contactPerson: contact, phone }
                : { needed: false },
            });
            router.push('/customer/book/review');
          }}
        >
          <Text style={s.btnTxt}>Continue to Review</Text>
          <ChevronRight size={16} color="#FFFFFF" strokeWidth={2.5} />
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: BG },
  scroll: { padding: 16, gap: 16, paddingBottom: 32 },

  infoBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: PRIMLT, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#BFDBFE',
  },
  infoIconBox: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: PRIMARY + '18', alignItems: 'center', justifyContent: 'center',
  },
  infoTitle: { fontFamily: FontFamily.semiBold, fontSize: 14, color: '#1E40AF' },
  infoSub:   { fontFamily: FontFamily.regular,  fontSize: 12, color: '#3B82F6' },

  section:      { gap: 10 },
  sectionLabel: { fontFamily: FontFamily.bold, fontSize: 15, color: TEXT, letterSpacing: -0.2 },

  toggle:        { gap: 10 },
  toggleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 14, borderRadius: 12,
    borderWidth: 1.5, borderColor: BORDER, backgroundColor: SURFACE,
  },
  toggleBtnActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  toggleTxt:       { fontFamily: FontFamily.semiBold, fontSize: 14, color: TEXTSUB },
  toggleTxtActive: { color: SURFACE },

  card: {
    backgroundColor: SURFACE, borderRadius: 14, borderWidth: 1, borderColor: BORDER,
    padding: 16, gap: 14,
    shadowColor: TEXT, shadowOpacity: 0.04, shadowRadius: 8,
    shadowOffset: { width: 0, height: 1 }, elevation: 1,
  },
  cardTitle: { fontFamily: FontFamily.semiBold, fontSize: 14, color: TEXTSUB },
  fields:    { gap: 12 },

  noSlipCard: {
    alignItems: 'center', gap: 10,
    backgroundColor: SURFACE, borderRadius: 14, borderWidth: 1, borderColor: BORDER,
    padding: 28,
    shadowColor: TEXT, shadowOpacity: 0.04, shadowRadius: 8,
    shadowOffset: { width: 0, height: 1 }, elevation: 1,
  },
  noSlipTitle: { fontFamily: FontFamily.bold, fontSize: 16, color: TEXT },
  noSlipSub: {
    fontFamily: FontFamily.regular, fontSize: 13, color: MUTED,
    textAlign: 'center', lineHeight: 20,
  },

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
