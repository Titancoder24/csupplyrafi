/**
 * /auth/login — C-Supply sign-in.
 * Light editorial card on dark backdrop. Construction crane watermark.
 */
import React, { useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Image,
  SafeAreaView, StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, ArrowRight, ChevronDown, ShieldCheck } from 'lucide-react-native';
import { FontFamily } from '@/constants/theme';
import { sendOtp } from '@/services/auth/otp';

/* ─── Palette — light card on dark backdrop ──────────────────────────────── */
const TEAL_LINE     = '#22535A';

const CARD_BG       = '#FFFFFF';
const INK           = '#0E1422';

const TEXT_MUTED    = '#6B7280';
const TEXT_FAINT    = '#9CA3AF';
const TEXT_SUBTLE   = '#B8BEC9';

const BORDER        = '#E5E7EB';
const BORDER_F      = '#0E1422';
const INPUT_BG      = '#FFFFFF';
const PLACEHOLDER   = '#C4C9D2';

const CTA_BG        = '#0E1422';
const CTA_PRESS     = '#1A2233';
const DANGER        = '#DC2626';

export default function Login() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);

  const submit = async () => {
    setError(null);
    const digits = phone.replace(/\D/g, '');
    if (digits.length !== 10 || !/^[6-9]/.test(digits)) {
      setError('Enter a valid 10-digit mobile number');
      return;
    }
    setLoading(true);
    const res = await sendOtp(`+91${digits}`);
    setLoading(false);
    if (!res.ok) { setError(res.error ?? 'Failed to send OTP. Try again.'); return; }
    router.push({ pathname: '/auth/verify', params: { phone: `+91${digits}` } });
  };

  const valid = phone.length === 10 && /^[6-9]/.test(phone);

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
                {/* ── Top — back button ── */}
                <Pressable onPress={() => router.back()} hitSlop={12} style={s.backBtn}>
                  <ArrowLeft size={18} color="#0F172A" strokeWidth={1.75} />
                </Pressable>

                {/* ── Logo ── */}
                <View style={s.logoBlock}>
                  <Image
                    source={require('../../assets/Logo final.png')}
                    style={s.brandLogo}
                    resizeMode="contain"
                  />
                </View>

                {/* ── Eyebrow + heading ── */}
                <View style={s.headBlock}>
                  <View style={s.eyebrowRow}>
                    <View style={s.eyebrowDot} />
                    <Text style={s.eyebrowTxt}>SIGN IN</Text>
                  </View>

                  <Text style={s.heading}>Welcome back.</Text>
                  <Text style={s.subhead}>
                    Sign in to continue managing materials and deliveries.
                  </Text>
                </View>

                {/* ── Phone input ── */}
                <View style={s.formBlock}>
                  <Text style={s.inputLabel}>MOBILE NUMBER</Text>

                  <View
                    style={[
                      s.inputRow,
                      focused && s.inputFocused,
                      error ? s.inputError : null,
                    ]}
                  >
                    <Pressable style={s.flagBox} hitSlop={6}>
                      <Text style={s.flagCode}>IN</Text>
                      <ChevronDown size={13} color="#0F172A" strokeWidth={1.75} />
                      <Text style={s.prefixText}>+91</Text>
                    </Pressable>

                    <View style={s.dividerV} />

                    <TextInput
                      style={s.textInput}
                      placeholder="98765 43210"
                      placeholderTextColor={PLACEHOLDER}
                      keyboardType="number-pad"
                      maxLength={10}
                      value={phone}
                      onChangeText={(t) => { setError(null); setPhone(t.replace(/\D/g, '')); }}
                      returnKeyType="done"
                      onSubmitEditing={submit}
                      onFocus={() => setFocused(true)}
                      onBlur={() => setFocused(false)}
                    />
                  </View>

                  {error ? <Text style={s.errorText}>{error}</Text> : null}

                  {/* ── Primary CTA ── */}
                  <Pressable
                    onPress={submit}
                    disabled={loading}
                    style={({ pressed }) => [
                      s.cta,
                      pressed && { backgroundColor: CTA_PRESS },
                      !valid && s.ctaDisabled,
                      loading && { opacity: 0.7 },
                    ]}
                  >
                    {loading ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <>
                        <Text style={s.ctaTxt}>Continue</Text>
                        <ArrowRight size={16} color="#FFFFFF" strokeWidth={2} />
                      </>
                    )}
                  </Pressable>
                </View>

                {/* ── Security badge ── */}
                <View style={s.secureBlock}>
                  <View style={s.secureRow}>
                    <ShieldCheck size={13} color="#0F172A" strokeWidth={1.75} />
                    <Text style={s.secureTxt}>Secured with 256-bit encryption</Text>
                  </View>
                  <Text style={s.secureSub}>Your data is private and secure.</Text>
                </View>

                {/* ── Terms ── */}
                <Text style={s.terms}>
                  By continuing, you agree to our{' '}
                  <Text style={s.termsLink}>Terms of Service</Text>
                  {' '}and{' '}
                  <Text style={s.termsLink}>Privacy Policy</Text>.
                </Text>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

/* ─── Styles ──────────────────────────────────────────────────────────────── */
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
    borderRadius: 0,
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
    marginTop: 40,
    marginBottom: 48,
    alignItems: 'flex-start' as const,
  },
  brandLogo: {
    width: 320, height: 96,
    marginLeft: -18, // compensates for logo asset's transparent left padding — visible mark sits flush with "•" of SIGN IN
  },

  /* Head block */
  headBlock: {
    marginBottom: 32,
  },
  eyebrowRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginBottom: 14,
  },
  eyebrowDot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: INK,
  },
  eyebrowTxt: {
    fontFamily: FontFamily.semiBold, fontSize: 11,
    color: INK, letterSpacing: 2,
  },
  heading: {
    fontFamily: FontFamily.bold,
    fontSize: 36, lineHeight: 42,
    color: INK,
    letterSpacing: -1.4,
    marginBottom: 14,
  },
  subhead: {
    fontFamily: FontFamily.regular,
    fontSize: 14.5, lineHeight: 22,
    color: TEXT_MUTED,
    maxWidth: 340,
    letterSpacing: -0.1,
  },

  /* Form */
  formBlock: { gap: 14 },

  inputLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: 10.5, color: TEXT_MUTED,
    letterSpacing: 1.6,
    marginBottom: 4,
  },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: INPUT_BG,
    borderWidth: 1, borderColor: BORDER,
    borderRadius: 12,
    height: 58,
    overflow: 'hidden',
  },
  inputFocused: {
    borderColor: BORDER_F,
  },
  inputError: {
    borderColor: DANGER,
  },
  flagBox: {
    flexDirection: 'row', alignItems: 'center',
    paddingLeft: 16, paddingRight: 14, gap: 6,
    height: '100%',
  },
  flagCode: {
    fontFamily: FontFamily.semiBold,
    fontSize: 13.5, color: INK,
    letterSpacing: 0.2,
  },
  prefixText: {
    fontFamily: FontFamily.bold,
    fontSize: 15, color: INK,
    letterSpacing: -0.2,
    marginLeft: 4,
  },
  dividerV: {
    width: 1, height: 24,
    backgroundColor: BORDER,
  },
  textInput: {
    flex: 1,
    fontFamily: FontFamily.medium,
    fontSize: 16, color: INK,
    paddingHorizontal: 16,
    height: '100%',
    letterSpacing: 0.4,
    // @ts-ignore web
    outlineStyle: 'none',
  },
  errorText: {
    fontFamily: FontFamily.medium,
    fontSize: 12.5, color: DANGER,
    marginTop: -4, marginLeft: 4,
  },

  cta: {
    height: 58,
    backgroundColor: CTA_BG,
    borderRadius: 12,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10,
    marginTop: 8,
  },
  ctaDisabled: {
    opacity: 0.45,
  },
  ctaTxt: {
    fontFamily: FontFamily.semiBold,
    fontSize: 15, color: '#FFFFFF',
    letterSpacing: -0.1,
  },

  /* Security badge */
  secureBlock: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 28,
    gap: 4,
  },
  secureRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: 6,
  },
  secureTxt: {
    fontFamily: FontFamily.medium,
    fontSize: 11.5, color: TEXT_MUTED,
    letterSpacing: 0.1,
  },
  secureSub: {
    fontFamily: FontFamily.regular,
    fontSize: 11, color: TEXT_SUBTLE,
    letterSpacing: 0.1,
  },

  /* Terms */
  terms: {
    fontFamily: FontFamily.regular,
    fontSize: 11.5, color: TEXT_MUTED,
    textAlign: 'center', lineHeight: 18,
    letterSpacing: 0.05,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  termsLink: {
    fontFamily: FontFamily.semiBold,
    color: INK,
  },
});
