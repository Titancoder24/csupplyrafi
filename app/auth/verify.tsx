/**
 * /auth/verify — C-Supply OTP verification.
 * Matches the light card design language from /auth/login.
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet,
  ActivityIndicator, Image, KeyboardAvoidingView,
  Platform, ScrollView, Animated, SafeAreaView, StatusBar,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, MessageSquare, ShieldCheck } from 'lucide-react-native';
import { FontFamily } from '@/constants/theme';
import { verifyOtp, sendOtp, hashLocal } from '@/services/auth/otp';

/* ─── Palette — matches /auth/login ───────────────────────────────────────── */
const TEAL_LINE     = '#22535A';

const CARD_BG       = '#FFFFFF';
const INK           = '#0E1422';

const TEXT_MUTED    = '#6B7280';
const TEXT_FAINT    = '#9CA3AF';
const TEXT_SUBTLE   = '#B8BEC9';

const BORDER        = '#E5E7EB';
const BORDER_F      = '#0E1422';
const DANGER        = '#DC2626';

export default function Verify() {
  const router = useRouter();
  const params = useLocalSearchParams<{ phone?: string }>();
  const phone = params.phone ?? '';

  const [code, setCode]           = useState<string[]>(['', '', '', '', '', '']);
  const [error, setError]         = useState<string | null>(null);
  const [loading, setLoading]     = useState(false);
  const [resending, setResending] = useState(false);
  const [seconds, setSeconds]     = useState(30);
  const inputs    = useRef<Array<TextInput | null>>([]);
  const pcInputs  = useRef<Array<TextInput | null>>([]);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  // New state variables for passcode verification
  const [isPasscodeMode, setIsPasscodeMode] = useState(false);
  const [passcode, setPasscode]             = useState<string[]>(['', '', '', '']);
  const [role, setRole]                     = useState<string>('customer');
  const [savedPasscodeHash, setSavedPasscodeHash] = useState<string | null>(null);

  useEffect(() => {
    const t = setInterval(() => setSeconds(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      if (isPasscodeMode) {
        pcInputs.current[0]?.focus();
      } else {
        inputs.current[0]?.focus();
      }
    }, 400);
    return () => clearTimeout(t);
  }, [isPasscodeMode]);

  function shake() {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10,  duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8,   duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8,  duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0,   duration: 60, useNativeDriver: true }),
    ]).start();
  }

  function routeByRole(role: string) {
    switch (role) {
      case 'vendor':      router.replace('/vendor/dashboard' as never); break;
      case 'transporter': router.replace('/transporter/dashboard' as never); break;
      case 'admin':       router.replace('/admin/dashboard' as never); break;
      case 'super_admin': router.replace('/superadmin/dashboard' as never); break;
      default:            router.replace('/customer/home' as never);
    }
  }

  async function submitCode(joined: string) {
    if (joined.length !== 6) { setError('Enter all 6 digits'); return; }

    setLoading(true);
    setError(null);
    try {
      const res = await verifyOtp(phone, joined);
      if (!res.ok) {
        setError(res.error ?? 'Invalid OTP. Please try again.');
        shake();
        setCode(['', '', '', '', '', '']);
        setTimeout(() => inputs.current[0]?.focus(), 100);
        return;
      }

      // If user is vendor, transporter, or customer and they have a passcode set, prompt for passcode first.
      if ((res.role === 'vendor' || res.role === 'transporter' || res.role === 'customer') && res.passcodeHash) {
        setRole(res.role);
        setSavedPasscodeHash(res.passcodeHash);
        setIsPasscodeMode(true);
        setError(null);
        setLoading(false);
        setPasscode(['', '', '', '']);
        setTimeout(() => pcInputs.current[0]?.focus(), 100);
        return;
      }

      routeByRole(res.role);
    } catch {
      setError('Connection failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function submitPasscode(joinedPc: string) {
    if (joinedPc.length !== 4) { setError('Enter all 4 digits'); return; }

    setLoading(true);
    setError(null);
    try {
      const hashed = hashLocal(joinedPc);
      if (hashed === savedPasscodeHash) {
        routeByRole(role);
      } else {
        setError('Incorrect passcode. Please try again.');
        shake();
        setPasscode(['', '', '', '']);
        setTimeout(() => pcInputs.current[0]?.focus(), 100);
      }
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function setDigit(i: number, v: string) {
    setError(null);
    const digit = v.replace(/\D/g, '').slice(-1);
    
    if (isPasscodeMode) {
      const next = [...passcode];
      next[i] = digit;
      setPasscode(next);
      if (digit && i < 3) pcInputs.current[i + 1]?.focus();
      if (!digit && i > 0) pcInputs.current[i - 1]?.focus();
      if (next.every(d => d !== '')) submitPasscode(next.join(''));
    } else {
      const next = [...code];
      next[i] = digit;
      setCode(next);
      if (digit && i < 5) inputs.current[i + 1]?.focus();
      if (!digit && i > 0) inputs.current[i - 1]?.focus();
      if (next.every(d => d !== '')) submitCode(next.join(''));
    }
  }

  async function resend() {
    setResending(true);
    setCode(['', '', '', '', '', '']);
    setError(null);
    setSeconds(30);
    await sendOtp(phone);
    setResending(false);
    setTimeout(() => inputs.current[0]?.focus(), 100);
  }

  const maskedPhone = phone.replace(/(\+91)(\d{5})(\d{5})/, '$1 ••••• $3');

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor={CARD_BG} />

      {/* Thin teal hairline at top */}
      <View style={s.topLine} />

      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={s.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={s.card}>
              {/* Faded crane watermark — top-right */}
              <Image
                source={require('../../assets/ng_real4.png')}
                style={s.watermark}
                resizeMode="cover"
              />
              <View style={s.watermarkFade} />

              <View style={s.cardInner}>
                {/* Back */}
                <Pressable 
                  onPress={() => {
                    if (isPasscodeMode) {
                      setIsPasscodeMode(false);
                      setError(null);
                    } else {
                      router.back();
                    }
                  }} 
                  hitSlop={12} 
                  style={s.backBtn}
                >
                  <ArrowLeft size={18} color="#0F172A" strokeWidth={1.75} />
                </Pressable>

                {/* Logo */}
                <View style={s.logoBlock}>
                  <Image
                    source={require('../../assets/Logo final.png')}
                    style={s.brandLogo}
                    resizeMode="contain"
                  />
                </View>

                {/* Chat icon badge */}
                <View style={s.iconBadgeWrap}>
                  <View style={s.iconBadge}>
                    <MessageSquare size={18} color="#0F172A" strokeWidth={1.75} />
                  </View>
                </View>

                {/* Heading */}
                <Text style={s.heading}>
                  {isPasscodeMode ? 'Enter Security Passcode' : 'Verify your number'}
                </Text>
                <Text style={s.subtext}>
                  {isPasscodeMode ? 'Enter your 4-digit security passcode to continue' : 'We sent a 6-digit OTP to'}
                </Text>
                {!isPasscodeMode && <Text style={s.phoneHighlight}>{maskedPhone}</Text>}

                {/* OTP / Passcode boxes */}
                <Animated.View style={[s.otpRow, { transform: [{ translateX: shakeAnim }] }]}>
                  {isPasscodeMode ? (
                    passcode.map((d, i) => (
                      <TextInput
                        key={i}
                        ref={r => { pcInputs.current[i] = r; }}
                        value={d ? '●' : ''}
                        onChangeText={v => setDigit(i, v)}
                        keyboardType="number-pad"
                        maxLength={1}
                        secureTextEntry
                        placeholderTextColor={TEXT_SUBTLE}
                        style={[
                          s.otpBox,
                          d        ? s.otpFilled : null,
                          error    ? s.otpError  : null,
                        ]}
                        onKeyPress={({ nativeEvent }) => {
                          if (nativeEvent.key === 'Backspace' && !d && i > 0) {
                            pcInputs.current[i - 1]?.focus();
                          }
                        }}
                      />
                    ))
                  ) : (
                    code.map((d, i) => (
                      <TextInput
                        key={i}
                        ref={r => { inputs.current[i] = r; }}
                        value={d}
                        onChangeText={v => setDigit(i, v)}
                        keyboardType="number-pad"
                        maxLength={1}
                        placeholderTextColor={TEXT_SUBTLE}
                        style={[
                          s.otpBox,
                          d        ? s.otpFilled : null,
                          error    ? s.otpError  : null,
                        ]}
                        onKeyPress={({ nativeEvent }) => {
                          if (nativeEvent.key === 'Backspace' && !d && i > 0) {
                            inputs.current[i - 1]?.focus();
                          }
                        }}
                      />
                    ))
                  )}
                </Animated.View>

                {/* Error */}
                {error ? <Text style={s.errorText}>{error}</Text> : null}

                {/* Loading indicator (replaces resend when verifying) */}
                {loading ? (
                  <View style={s.loadingRow}>
                    <ActivityIndicator size="small" color={INK} />
                  </View>
                ) : !isPasscodeMode ? (
                  <View style={s.resendRow}>
                    {seconds > 0 ? (
                      <Text style={s.timerText}>
                        Resend code in <Text style={s.timerCount}>{seconds}s</Text>
                      </Text>
                    ) : (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={s.timerText}>Didn't receive it?</Text>
                        <Pressable onPress={resend} disabled={resending} hitSlop={10}>
                          {resending
                            ? <ActivityIndicator size={14} color={INK} />
                            : <Text style={s.resendLink}>Resend OTP</Text>
                          }
                        </Pressable>
                      </View>
                    )}
                  </View>
                ) : null}

                {/* Security badge */}
                <View style={s.secureBlock}>
                  <View style={s.secureRow}>
                    <ShieldCheck size={13} color="#0F172A" strokeWidth={1.75} />
                    <Text style={s.secureTxt}>
                      Secure and private. Your data is protected{'\n'}with 256-bit encryption.
                    </Text>
                  </View>
                </View>

                {/* Change number */}
                <Pressable 
                  onPress={() => {
                    if (isPasscodeMode) {
                      setIsPasscodeMode(false);
                      setError(null);
                    } else {
                      router.back();
                    }
                  }} 
                  hitSlop={8} 
                  style={s.changeRow}
                >
                  <Text style={s.changeText}>
                    {isPasscodeMode ? (
                      <>Wrong account? <Text style={s.changeLink}>Back to OTP</Text></>
                    ) : (
                      <>Wrong number? <Text style={s.changeLink}>Change number</Text></>
                    )}
                  </Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: CARD_BG },

  topLine: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 2,
    backgroundColor: TEAL_LINE,
    zIndex: 10,
  },

  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 32,
    alignItems: 'center',
  },

  card: {
    width: '100%',
    maxWidth: 460,
    backgroundColor: CARD_BG,
    overflow: 'hidden',
  },

  watermark: {
    position: 'absolute',
    top: 0, right: -40,
    width: '85%', height: 320,
    opacity: 0.10,
  },
  watermarkFade: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 320,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },

  cardInner: {
    paddingHorizontal: 4,
    paddingTop: 8,
    paddingBottom: 16,
  },

  /* Back */
  backBtn: {
    width: 38, height: 38, borderRadius: 10,
    borderWidth: 1, borderColor: BORDER,
    backgroundColor: '#FFFFFF',
    alignItems: 'center', justifyContent: 'center',
  },

  /* Logo */
  logoBlock: {
    marginTop: 28,
    marginBottom: 32,
  },
  brandLogo: {
    width: 180, height: 56,
  },

  /* Chat icon badge */
  iconBadgeWrap: {
    alignItems: 'center',
    marginBottom: 18,
  },
  iconBadge: {
    width: 44, height: 44, borderRadius: 12,
    borderWidth: 1, borderColor: BORDER,
    backgroundColor: '#FFFFFF',
    alignItems: 'center', justifyContent: 'center',
  },

  /* Heading */
  heading: {
    fontFamily: FontFamily.bold,
    fontSize: 26, lineHeight: 32,
    color: INK,
    textAlign: 'center',
    letterSpacing: -0.8,
    marginBottom: 10,
  },
  subtext: {
    fontFamily: FontFamily.regular,
    fontSize: 14, color: TEXT_MUTED,
    textAlign: 'center', lineHeight: 22,
    marginBottom: 4,
  },
  phoneHighlight: {
    fontFamily: FontFamily.semiBold,
    fontSize: 15, color: INK,
    textAlign: 'center',
    letterSpacing: 1,
    marginBottom: 28,
  },

  /* OTP boxes */
  otpRow: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
    justifyContent: 'center',
    marginBottom: 18,
  },
  otpBox: {
    width: 48, height: 56,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: '#FFFFFF',
    textAlign: 'center',
    fontFamily: FontFamily.bold,
    fontSize: 22, color: INK,
    // @ts-ignore web
    outlineStyle: 'none',
  },
  otpFilled: {
    borderColor: BORDER_F,
  },
  otpError: {
    borderColor: DANGER,
  },

  errorText: {
    fontFamily: FontFamily.medium,
    fontSize: 12.5, color: DANGER,
    textAlign: 'center',
    marginBottom: 10,
  },

  /* Resend / timer */
  resendRow: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 28,
  },
  loadingRow: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 28,
  },
  timerText: {
    fontFamily: FontFamily.regular,
    fontSize: 13, color: TEXT_MUTED,
  },
  timerCount: {
    fontFamily: FontFamily.bold, color: INK,
  },
  resendLink: {
    fontFamily: FontFamily.semiBold,
    fontSize: 13, color: INK,
    textDecorationLine: 'underline',
  },

  /* Security */
  secureBlock: {
    alignItems: 'center',
    marginBottom: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  secureRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: 8,
    paddingTop: 12,
  },
  secureTxt: {
    fontFamily: FontFamily.regular,
    fontSize: 11.5, color: TEXT_MUTED,
    lineHeight: 18,
    letterSpacing: 0.05,
  },

  /* Change number */
  changeRow: { alignItems: 'center' },
  changeText: {
    fontFamily: FontFamily.regular,
    fontSize: 12, color: TEXT_FAINT,
    textAlign: 'center',
  },
  changeLink: {
    fontFamily: FontFamily.semiBold, color: INK,
    textDecorationLine: 'underline',
  },
});
