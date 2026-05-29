import React, { useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, ScrollView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Lock, Smartphone, LogOut, ChevronRight, Shield, Eye, EyeOff } from 'lucide-react-native';
import { useAuth } from '@/services/auth/AuthProvider';
import { FontFamily } from '@/constants/theme';

const BG      = '#F8FAFC';
const SURFACE = '#FFFFFF';
const BORDER  = '#E2E8F0';
const TEXT    = '#0F172A';
const TEXTSUB = '#334155';
const MUTED   = '#64748B';
const PRIMARY = '#1D4ED8';
const PT      = Platform.OS === 'ios' ? 56 : Platform.OS === 'web' ? 0 : 36;

const PASSCODE_LEN = 4;

export default function Security() {
  const router = useRouter();
  const { signOut } = useAuth();
  const [showPasscode, setShowPasscode] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [step, setStep] = useState<'view' | 'enter' | 'confirm'>('view');
  const [confirmCode, setConfirmCode] = useState('');

  const handleDigit = (d: string) => {
    if (step === 'enter') {
      const next = passcode + d;
      setPasscode(next);
      if (next.length === PASSCODE_LEN) setStep('confirm');
    } else if (step === 'confirm') {
      const next = confirmCode + d;
      setConfirmCode(next);
      if (next.length === PASSCODE_LEN) {
        if (next === passcode) {
          setStep('view');
          setPasscode('');
          setConfirmCode('');
        } else {
          setConfirmCode('');
        }
      }
    }
  };

  const handleBackspace = () => {
    if (step === 'enter')   setPasscode(p => p.slice(0, -1));
    if (step === 'confirm') setConfirmCode(p => p.slice(0, -1));
  };

  const currentCode = step === 'enter' ? passcode : confirmCode;

  return (
    <View style={s.root}>
      <View style={[s.header, { paddingTop: PT > 0 ? PT : 14 }]}>
        <Pressable onPress={() => { if (step !== 'view') setStep('view'); else router.back(); }} hitSlop={12} style={s.backBtn}>
          <ArrowLeft size={20} color="#0F172A" strokeWidth={2} />
        </Pressable>
        <Text style={s.headerTitle}>Security</Text>
        <View style={s.backBtn} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {step === 'view' ? (
          <>
            {/* Passcode section */}
            <View style={s.card}>
              <Text style={s.cardTitle}>Authentication</Text>
              {[
                {
                  icon: Lock, iconColor: PRIMARY, iconBg: '#EFF6FF',
                  label: '4-digit Passcode', sub: 'Used for quick login on this device',
                  action: () => setStep('enter'), actionLabel: 'Change',
                },
                {
                  icon: Smartphone, iconColor: '#7C3AED', iconBg: '#F5F3FF',
                  label: 'Biometric Login', sub: 'Touch ID / Face ID for fast access',
                  action: () => {}, actionLabel: 'Enable',
                },
              ].map(item => (
                <Pressable key={item.label} style={s.row} onPress={item.action}>
                  <View style={[s.iconBox, { backgroundColor: item.iconBg }]}>
                    <item.icon size={18} color={item.iconColor} strokeWidth={1.8} />
                  </View>
                  <View style={s.rowBody}>
                    <Text style={s.rowLabel}>{item.label}</Text>
                    <Text style={s.rowSub}>{item.sub}</Text>
                  </View>
                  <View style={s.actionChip}>
                    <Text style={s.actionTxt}>{item.actionLabel}</Text>
                    <ChevronRight size={13} color="#0F172A" strokeWidth={2.5} />
                  </View>
                </Pressable>
              ))}
            </View>

            {/* Sessions */}
            <View style={s.card}>
              <Text style={s.cardTitle}>Sessions</Text>
              <Pressable
                style={s.row}
                onPress={async () => {
                  try { await signOut?.(); }
                  catch { /* ignore */ }
                  router.replace('/auth/login' as never);
                }}
              >
                <View style={[s.iconBox, { backgroundColor: '#FEF2F2' }]}>
                  <LogOut size={18} color="#0F172A" strokeWidth={1.8} />
                </View>
                <View style={s.rowBody}>
                  <Text style={[s.rowLabel, { color: '#EF4444' }]}>Sign Out from All Devices</Text>
                  <Text style={s.rowSub}>Logs out all sessions immediately</Text>
                </View>
                <ChevronRight size={16} color="#0F172A" strokeWidth={2} />
              </Pressable>
            </View>

            <View style={s.secureNote}>
              <Shield size={14} color="#0F172A" strokeWidth={2} />
              <Text style={s.secureNoteTxt}>Your account is protected with end-to-end encryption.</Text>
            </View>
          </>
        ) : (
          /* Passcode entry UI */
          <View style={s.passcodeWrap}>
            <Shield size={36} color="#0F172A" strokeWidth={1.6} />
            <Text style={s.passcodeTitle}>
              {step === 'enter' ? 'Set New Passcode' : 'Confirm Passcode'}
            </Text>
            <Text style={s.passcodeSub}>
              {step === 'enter' ? 'Enter a 4-digit passcode' : 'Re-enter the same passcode'}
            </Text>

            {/* Dots */}
            <View style={s.dots}>
              {Array.from({ length: PASSCODE_LEN }).map((_, i) => (
                <View key={i} style={[s.dot, i < currentCode.length && s.dotFilled]} />
              ))}
            </View>

            {/* Keypad */}
            <View style={s.keypad}>
              {['1','2','3','4','5','6','7','8','9','','0','⌫'].map(key => (
                <Pressable
                  key={key}
                  style={[s.key, !key && s.keyEmpty]}
                  onPress={() => key === '⌫' ? handleBackspace() : key && handleDigit(key)}
                  disabled={!key}
                >
                  <Text style={[s.keyTxt, key === '⌫' && s.backTxt]}>{key}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}
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
  headerTitle: { flex: 1, textAlign: 'center', fontFamily: FontFamily.bold, fontSize: 16, color: TEXT },

  scroll: { padding: 16, gap: 14, paddingBottom: 40 },

  card: {
    backgroundColor: SURFACE, borderRadius: 14, borderWidth: 1, borderColor: BORDER, overflow: 'hidden',
    shadowColor: TEXT, shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 1 }, elevation: 1,
  },
  cardTitle: {
    fontFamily: FontFamily.semiBold, fontSize: 13, color: TEXTSUB,
    paddingHorizontal: 14, paddingVertical: 11,
    backgroundColor: BG, borderBottomWidth: 1, borderBottomColor: BORDER,
  },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 14, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: BORDER,
  },
  iconBox:  { width: 42, height: 42, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  rowBody:  { flex: 1, gap: 2 },
  rowLabel: { fontFamily: FontFamily.semiBold, fontSize: 14, color: TEXT },
  rowSub:   { fontFamily: FontFamily.regular, fontSize: 12.5, color: MUTED },
  actionChip: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  actionTxt:  { fontFamily: FontFamily.semiBold, fontSize: 13, color: PRIMARY },

  secureNote: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    justifyContent: 'center',
  },
  secureNoteTxt: { fontFamily: FontFamily.regular, fontSize: 12, color: MUTED },

  passcodeWrap: { alignItems: 'center', paddingTop: 20, gap: 16 },
  passcodeTitle:{ fontFamily: FontFamily.bold, fontSize: 22, color: TEXT },
  passcodeSub:  { fontFamily: FontFamily.regular, fontSize: 14, color: MUTED },
  dots: { flexDirection: 'row', gap: 18, marginVertical: 8 },
  dot:  { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: BORDER, backgroundColor: SURFACE },
  dotFilled: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  keypad: { flexDirection: 'row', flexWrap: 'wrap', width: 270, gap: 0 },
  key: {
    width: 90, height: 72, alignItems: 'center', justifyContent: 'center',
    borderWidth: 0.5, borderColor: BORDER, backgroundColor: SURFACE,
  },
  keyEmpty: { opacity: 0 },
  keyTxt:   { fontFamily: FontFamily.semiBold, fontSize: 22, color: TEXT },
  backTxt:  { fontSize: 20, color: MUTED },
});
