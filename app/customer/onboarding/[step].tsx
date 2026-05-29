import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, ScrollView, Pressable, TextInput,
  StyleSheet, ActivityIndicator, Platform, Image,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  User as UserIcon, MapPin, Building2, ChevronRight,
  CheckCircle2, ArrowLeft, Mail, Phone, Briefcase, FileText,
  Package, ShieldCheck, Truck, Sparkles,
} from 'lucide-react-native';
import { supabase } from '@/services/supabase';
import { useAuth } from '@/services/auth/AuthProvider';
import { sendOtp, verifyOtp } from '@/services/auth/otp';
import { toast } from '@/services/toast';
import { FontFamily } from '@/constants/theme';

const TOTAL = 5;
const TITLES = [
  'Welcome to C-Supply',
  'Enter Your Mobile',
  'Your Profile',
  'Delivery Address',
  'Business Details',
];
const SUBTITLES = [
  "Let's get your account set up in a minute",
  "We'll send a 6-digit code to verify your number",
  'Tell us a bit about yourself',
  'Where should we deliver your orders?',
  'Optional — adds GST invoicing for businesses',
];

const BG      = '#F8FAFC';
const SURFACE = '#FFFFFF';
const BORDER  = '#E2E8F0';
const INK_900 = '#0F172A';
const INK_700 = '#334155';
const INK_500 = '#64748B';
const INK_400 = '#94A3B8';
const PRIMARY = '#15803D';   // green — matches vendor/transporter
const PRIMARY_DK = '#166534';
const PRIMARY_LT = '#F0FDF4';
const GREEN   = '#15803D';
const GREEN_BG = '#DCFCE7';
const DANGER   = '#B91C1C';

const PT = Platform.OS === 'ios' ? 56 : Platform.OS === 'web' ? 16 : 28;

type Form = {
  phone:        string;
  otp:          string;
  fullName:     string;
  email:        string;
  line1:        string;
  city:         string;
  state:        string;
  pincode:      string;
  businessName: string;
  gstNumber:    string;
};

const EMPTY: Form = {
  phone: '', otp: '',
  fullName: '', email: '',
  line1: '', city: '', state: '', pincode: '',
  businessName: '', gstNumber: '',
};

export default function CustomerOnboarding() {
  const router = useRouter();
  const { profile, refreshProfile } = useAuth();
  const { step } = useLocalSearchParams<{ step: string }>();
  const n = Math.max(1, Math.min(TOTAL, parseInt(step ?? '1', 10) || 1));

  const [form, setForm]     = useState<Form>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  // OTP-specific state on step 2
  const [otpSent,  setOtpSent]  = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifying,  setVerifying]  = useState(false);
  const [resendIn,   setResendIn]   = useState(0);

  const resendTimer = useRef<any>(null);

  // Prefill from profile when available
  useEffect(() => {
    if (profile) {
      setForm(f => ({
        ...f,
        phone:    f.phone || (profile.phone ?? '').replace(/^\+91/, ''),
        fullName: f.fullName || (profile.full_name ?? ''),
        email:    f.email    || (profile.email ?? ''),
      }));
    }
  }, [profile?.id]);

  // Resend countdown
  useEffect(() => {
    if (resendIn > 0) {
      resendTimer.current = setTimeout(() => setResendIn(r => r - 1), 1000);
    }
    return () => { if (resendTimer.current) clearTimeout(resendTimer.current); };
  }, [resendIn]);

  function update<K extends keyof Form>(k: K, v: Form[K]) {
    setForm(f => ({ ...f, [k]: v }));
    if (error) setError('');
  }

  /* ─── OTP actions ─────────────────────────────────────────────────────── */
  async function handleSendOtp() {
    setError('');
    const digits = form.phone.replace(/\D/g, '');
    if (digits.length !== 10 || !/^[6-9]/.test(digits)) {
      setError('Enter a valid 10-digit Indian mobile number');
      return;
    }
    setSendingOtp(true);
    const res = await sendOtp(`+91${digits}`);
    setSendingOtp(false);
    if (!res.ok) {
      setError(res.error ?? 'Failed to send OTP — please try again');
      return;
    }
    setOtpSent(true);
    setResendIn(30);
    toast.success('OTP sent', `Code sent to +91 ${digits}`);
  }

  async function handleVerifyOtp() {
    setError('');
    if (form.otp.length !== 6) {
      setError('Enter the 6-digit OTP');
      return;
    }
    setVerifying(true);
    const digits = form.phone.replace(/\D/g, '');
    const res = await verifyOtp(`+91${digits}`, form.otp);
    setVerifying(false);
    if (!res.ok) {
      setError(res.error ?? 'Invalid OTP — please try again');
      return;
    }
    toast.success('Verified', 'Continuing your registration');
    await refreshProfile();
    router.push('/customer/onboarding/3' as never);
  }

  /* ─── Step validation ─────────────────────────────────────────────────── */
  function validateCurrent(): string | null {
    if (n === 3 && !form.fullName.trim()) return 'Please enter your full name';
    if (n === 4) {
      if (!form.line1.trim())                       return 'Please enter your address';
      if (!form.city.trim())                        return 'Please enter your city';
      if (!form.pincode.trim() || form.pincode.length < 6) return 'Enter a valid 6-digit pincode';
    }
    return null;
  }

  /* ─── Navigation ──────────────────────────────────────────────────────── */
  async function handleNext() {
    const v = validateCurrent();
    if (v) { setError(v); return; }

    if (n < TOTAL) {
      router.push(`/customer/onboarding/${n + 1}` as never);
      return;
    }

    // Final step — persist everything
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const uid = user?.id ?? profile?.id;
      if (!uid) { setError('Session expired — start again from Step 2.'); return; }

      const profilePatch: any = { full_name: form.fullName.trim() };
      if (form.email.trim()) profilePatch.email = form.email.trim().toLowerCase();
      await supabase.from('profiles').update(profilePatch).eq('id', uid);

      await supabase.from('addresses').insert({
        profile_id: uid,
        label:      'Home',
        line1:      form.line1.trim(),
        city:       form.city.trim(),
        state:      form.state.trim(),
        pincode:    form.pincode.trim(),
        is_default: true,
      });

      // Best-effort business info (column may not exist on profiles)
      if (form.businessName.trim() || form.gstNumber.trim()) {
        await supabase.from('profiles').update({
          business_name: form.businessName.trim() || null,
          gst_number:    form.gstNumber.trim() || null,
        }).eq('id', uid).then(() => {}).catch(() => {});
      }

      await refreshProfile();
      toast.success('Welcome to C-Supply!', 'Your account is ready');
      router.replace('/customer/home' as never);
    } catch (e: any) {
      setError(e?.message ?? 'Something went wrong. Try again.');
    } finally {
      setSaving(false);
    }
  }

  function handlePrev() {
    if (n > 1) router.push(`/customer/onboarding/${n - 1}` as never);
    else       router.back();
  }

  function handleSkipBusiness() {
    // Step 5 only — Skip = finish without business info
    setForm(f => ({ ...f, businessName: '', gstNumber: '' }));
    handleNext();
  }

  /* ─── Render ──────────────────────────────────────────────────────────── */
  const cantContinue =
    saving
    || (n === 2 && !otpSent)
    || (n === 2 && otpSent && form.otp.length !== 6)
    || verifying;

  return (
    <View style={s.root}>
      {/* Top bar */}
      <View style={[s.topbar, { paddingTop: PT }]}>
        <Pressable onPress={handlePrev} hitSlop={10} style={s.backBtn}>
          <ArrowLeft size={20} color="#0F172A" strokeWidth={2} />
        </Pressable>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={s.stepLabel}>Step {n} of {TOTAL}</Text>
          <Text style={s.stepTitle} numberOfLines={1}>{TITLES[n - 1]}</Text>
        </View>
        <View style={{ width: 38 }} />
      </View>

      {/* Progress bar */}
      <View style={s.progressTrack}>
        <View style={[s.progressFill, { width: `${(n / TOTAL) * 100}%` }]} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={s.hero}>
          {n === 1 ? (
            <Image
              source={require('../../../assets/Logo_Ui.png')}
              style={s.welcomeLogo}
              resizeMode="contain"
            />
          ) : (
            <View style={s.heroIcon}>
              {n === 2 && <Phone    size={26} color="#0F172A" strokeWidth={2} />}
              {n === 3 && <UserIcon size={26} color="#0F172A" strokeWidth={2} />}
              {n === 4 && <MapPin   size={26} color="#0F172A" strokeWidth={2} />}
              {n === 5 && <Building2 size={26} color="#0F172A" strokeWidth={2} />}
            </View>
          )}
          <Text style={s.heroTitle}>{TITLES[n - 1]}</Text>
          <Text style={s.heroSub}>{SUBTITLES[n - 1]}</Text>
        </View>

        {/* ───────── Step 1: Welcome ───────── */}
        {n === 1 && (
          <View style={s.card}>
            <View style={s.benefitRow}>
              <View style={[s.benefitIcon, { backgroundColor: PRIMARY_LT }]}>
                <Package size={16} color="#0F172A" strokeWidth={2.2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.benefitTitle}>Browse 500+ products</Text>
                <Text style={s.benefitSub}>Cement, steel, sand, bricks and more</Text>
              </View>
            </View>
            <View style={s.benefitRow}>
              <View style={[s.benefitIcon, { backgroundColor: '#FFF7ED' }]}>
                <Truck size={16} color="#0F172A" strokeWidth={2.2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.benefitTitle}>Doorstep delivery</Text>
                <Text style={s.benefitSub}>Live tracking from pickup to drop-off</Text>
              </View>
            </View>
            <View style={s.benefitRow}>
              <View style={[s.benefitIcon, { backgroundColor: '#F0FDF4' }]}>
                <ShieldCheck size={16} color="#0F172A" strokeWidth={2.2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.benefitTitle}>Verified vendors only</Text>
                <Text style={s.benefitSub}>KYC-approved suppliers across 28 states</Text>
              </View>
            </View>
            <View style={s.disclaimer}>
              <Text style={s.disclaimerTxt}>
                By continuing, you agree to our Terms of Service and Privacy Policy.
              </Text>
            </View>
          </View>
        )}

        {/* ───────── Step 2: Phone + OTP ───────── */}
        {n === 2 && (
          <View style={s.card}>
            <Text style={s.fieldLabel}>Mobile Number</Text>
            <View style={[s.fieldRow, otpSent && { opacity: 0.6 }]}>
              <View style={s.phonePrefix}>
                <Text style={s.phonePrefixTxt}>+91</Text>
              </View>
              <TextInput
                style={s.fieldInput}
                placeholder="10-digit mobile"
                placeholderTextColor={INK_400}
                value={form.phone}
                onChangeText={v => update('phone', v.replace(/[^0-9]/g, '').slice(0, 10))}
                keyboardType="phone-pad"
                editable={!otpSent}
                maxLength={10}
              />
            </View>

            {!otpSent ? (
              <Pressable
                style={[s.inlineCta, sendingOtp && { opacity: 0.6 }]}
                onPress={handleSendOtp}
                disabled={sendingOtp}
              >
                {sendingOtp ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Text style={s.inlineCtaTxt}>Send OTP</Text>
                    <ChevronRight size={16} color="#FFFFFF" strokeWidth={2.4} />
                  </>
                )}
              </Pressable>
            ) : (
              <>
                <View style={s.otpSentBanner}>
                  <CheckCircle2 size={14} color="#0F172A" strokeWidth={2.4} />
                  <Text style={s.otpSentTxt}>OTP sent to +91 {form.phone}</Text>
                  <Pressable onPress={() => { setOtpSent(false); update('otp', ''); }}>
                    <Text style={s.otpEdit}>Change</Text>
                  </Pressable>
                </View>

                <Text style={[s.fieldLabel, { marginTop: 14 }]}>Enter 6-digit OTP</Text>
                <View style={s.fieldRow}>
                  <TextInput
                    style={[s.fieldInput, { fontSize: 18, letterSpacing: 4, fontFamily: FontFamily.bold, paddingLeft: 14 }]}
                    placeholder="• • • • • •"
                    placeholderTextColor={INK_400}
                    value={form.otp}
                    onChangeText={v => update('otp', v.replace(/[^0-9]/g, '').slice(0, 6))}
                    keyboardType="number-pad"
                    maxLength={6}
                    autoFocus
                  />
                </View>
                <View style={s.resendRow}>
                  {resendIn > 0 ? (
                    <Text style={s.resendDim}>Resend OTP in {resendIn}s</Text>
                  ) : (
                    <Pressable onPress={handleSendOtp} disabled={sendingOtp}>
                      <Text style={s.resendActive}>Resend OTP</Text>
                    </Pressable>
                  )}
                </View>
              </>
            )}
          </View>
        )}

        {/* ───────── Step 3: Profile ───────── */}
        {n === 3 && (
          <View style={s.card}>
            <Field
              icon={<UserIcon size={16} color="#0F172A" strokeWidth={2} />}
              label="Full Name *"
              placeholder="e.g. Ramesh Kumar"
              value={form.fullName}
              onChangeText={v => update('fullName', v)}
            />
            <Field
              icon={<Mail size={16} color="#0F172A" strokeWidth={2} />}
              label="Email (optional)"
              placeholder="ramesh@example.com"
              value={form.email}
              onChangeText={v => update('email', v)}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Field
              icon={<Phone size={16} color="#0F172A" strokeWidth={2} />}
              label="Mobile (verified)"
              placeholder=""
              value={profile?.phone ?? `+91 ${form.phone}`}
              onChangeText={() => {}}
              disabled
            />
          </View>
        )}

        {/* ───────── Step 4: Address ───────── */}
        {n === 4 && (
          <View style={s.card}>
            <Field
              icon={<MapPin size={16} color="#0F172A" strokeWidth={2} />}
              label="Address line *"
              placeholder="House / Building / Street"
              value={form.line1}
              onChangeText={v => update('line1', v)}
            />
            <View style={s.row2}>
              <View style={{ flex: 1 }}>
                <Field
                  label="City *"
                  placeholder="Ahmedabad"
                  value={form.city}
                  onChangeText={v => update('city', v)}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Field
                  label="State"
                  placeholder="Gujarat"
                  value={form.state}
                  onChangeText={v => update('state', v)}
                />
              </View>
            </View>
            <Field
              label="Pincode *"
              placeholder="380001"
              value={form.pincode}
              onChangeText={v => update('pincode', v.replace(/[^0-9]/g, '').slice(0, 6))}
              keyboardType="number-pad"
            />
          </View>
        )}

        {/* ───────── Step 5: Business (optional) ───────── */}
        {n === 5 && (
          <View style={s.card}>
            <View style={s.optionalBanner}>
              <CheckCircle2 size={14} color="#0F172A" strokeWidth={2.2} />
              <Text style={s.optionalBannerTxt}>Optional — skip if you order as an individual</Text>
            </View>
            <Field
              icon={<Briefcase size={16} color="#0F172A" strokeWidth={2} />}
              label="Business / Company name"
              placeholder="e.g. Krishna Constructions"
              value={form.businessName}
              onChangeText={v => update('businessName', v)}
            />
            <Field
              icon={<FileText size={16} color="#0F172A" strokeWidth={2} />}
              label="GST number"
              placeholder="24AABCU9603R1Z2"
              value={form.gstNumber}
              onChangeText={v => update('gstNumber', v.toUpperCase().slice(0, 15))}
              autoCapitalize="characters"
            />
          </View>
        )}

        {/* Inline error */}
        {error ? (
          <View style={s.errorBox}>
            <Text style={s.errorTxt}>{error}</Text>
          </View>
        ) : null}
      </ScrollView>

      {/* Sticky bottom CTA */}
      <View style={s.cta}>
        {n === 5 && (
          <Pressable style={s.skipBtn} onPress={handleSkipBusiness} disabled={saving}>
            <Text style={s.skipBtnTxt}>Skip</Text>
          </Pressable>
        )}
        <Pressable
          style={[s.nextBtn, cantContinue && { opacity: 0.55 }]}
          onPress={n === 2 && otpSent ? handleVerifyOtp : handleNext}
          disabled={cantContinue}
        >
          {(saving || verifying) ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={s.nextBtnTxt}>
              {n === 1 ? 'Get Started'
                : n === 2 && !otpSent ? 'Send OTP'
                : n === 2 && otpSent ? 'Verify & Continue'
                : n === 5 ? 'Finish Setup'
                : 'Continue'}
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

/* ─── Field ──────────────────────────────────────────────────────────────── */
function Field({
  label, placeholder, value, onChangeText, icon, disabled, keyboardType, autoCapitalize,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (v: string) => void;
  icon?: React.ReactNode;
  disabled?: boolean;
  keyboardType?: 'default' | 'email-address' | 'number-pad' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
}) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={s.fieldLabel}>{label}</Text>
      <View style={[s.fieldRow, disabled && { backgroundColor: BG }]}>
        {icon ? <View style={{ paddingLeft: 12 }}>{icon}</View> : null}
        <TextInput
          style={[s.fieldInput, !icon && { paddingLeft: 14 }]}
          placeholder={placeholder}
          placeholderTextColor={INK_400}
          value={value}
          onChangeText={onChangeText}
          editable={!disabled}
          keyboardType={keyboardType ?? 'default'}
          autoCapitalize={autoCapitalize ?? 'sentences'}
        />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  topbar: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 14, paddingBottom: 12,
    backgroundColor: SURFACE,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: BG, alignItems: 'center', justifyContent: 'center',
  },
  stepLabel: { fontFamily: FontFamily.regular, fontSize: 11, color: INK_500, letterSpacing: 0.3 },
  stepTitle: { fontFamily: FontFamily.bold, fontSize: 15, color: INK_900, letterSpacing: -0.2 },

  progressTrack: { height: 3, backgroundColor: '#E2E8F0' },
  progressFill:  { height: 3, backgroundColor: PRIMARY },

  scroll: { padding: 20, paddingBottom: 160, gap: 18 },

  hero: { alignItems: 'center', gap: 8, paddingVertical: 4 },
  welcomeLogo: { width: 220, height: 96, alignSelf: 'center' },
  heroIcon: {
    width: 60, height: 60, borderRadius: 16,
    backgroundColor: PRIMARY_LT, alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },
  heroTitle: { fontFamily: FontFamily.bold, fontSize: 22, color: INK_900, letterSpacing: -0.4, textAlign: 'center' },
  heroSub:   { fontFamily: FontFamily.regular, fontSize: 13, color: INK_500, textAlign: 'center', maxWidth: 320 },

  card: {
    backgroundColor: SURFACE, borderRadius: 14,
    borderWidth: 1, borderColor: BORDER,
    padding: 18, gap: 14,
  },
  row2: { flexDirection: 'row', gap: 12 },

  /* Field */
  fieldLabel: { fontFamily: FontFamily.semiBold, fontSize: 12, color: INK_700, letterSpacing: 0.1 },
  fieldRow: {
    flexDirection: 'row', alignItems: 'center',
    height: 48, borderWidth: 1, borderColor: BORDER, borderRadius: 10,
    backgroundColor: SURFACE,
  },
  fieldInput: {
    flex: 1, paddingHorizontal: 10,
    fontFamily: FontFamily.regular, fontSize: 14, color: INK_900,
    ...(({ outlineStyle: 'none' }) as any),
  },

  /* Phone */
  phonePrefix: {
    height: '100%', paddingHorizontal: 14,
    borderRightWidth: 1, borderRightColor: BORDER,
    alignItems: 'center', justifyContent: 'center',
  },
  phonePrefixTxt: { fontFamily: FontFamily.bold, fontSize: 14, color: INK_900 },

  inlineCta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    backgroundColor: PRIMARY_DK, borderRadius: 10,
    paddingVertical: 12, marginTop: 4,
  },
  inlineCtaTxt: { fontFamily: FontFamily.bold, fontSize: 14, color: '#fff' },

  otpSentBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: GREEN_BG, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1, borderColor: '#BBF7D0',
  },
  otpSentTxt: { fontFamily: FontFamily.medium, fontSize: 12, color: GREEN, flex: 1 },
  otpEdit:    { fontFamily: FontFamily.bold, fontSize: 12, color: GREEN, textDecorationLine: 'underline' },

  resendRow: { alignItems: 'center', marginTop: 8 },
  resendDim:    { fontFamily: FontFamily.regular, fontSize: 12, color: INK_400 },
  resendActive: { fontFamily: FontFamily.bold, fontSize: 12, color: PRIMARY },

  /* Step 1 benefits */
  benefitRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  benefitIcon: {
    width: 36, height: 36, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center',
  },
  benefitTitle: { fontFamily: FontFamily.bold, fontSize: 13.5, color: INK_900 },
  benefitSub:   { fontFamily: FontFamily.regular, fontSize: 12, color: INK_500, marginTop: 1 },

  disclaimer: { marginTop: 4, paddingTop: 12, borderTopWidth: 1, borderTopColor: BORDER },
  disclaimerTxt: { fontFamily: FontFamily.regular, fontSize: 11.5, color: INK_400, lineHeight: 16 },

  /* Optional banner */
  optionalBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: GREEN_BG, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1, borderColor: '#BBF7D0',
  },
  optionalBannerTxt: { fontFamily: FontFamily.medium, fontSize: 12, color: GREEN, flex: 1 },

  /* Error */
  errorBox: {
    backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA',
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
  },
  errorTxt: { fontFamily: FontFamily.medium, fontSize: 12.5, color: DANGER },

  /* Bottom CTA */
  cta: {
    position: 'absolute' as const, left: 0, right: 0, bottom: 0,
    flexDirection: 'row', gap: 10,
    paddingHorizontal: 20, paddingTop: 14,
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
    backgroundColor: SURFACE, borderTopWidth: 1, borderTopColor: BORDER,
  },
  skipBtn: {
    paddingHorizontal: 22, paddingVertical: 13, borderRadius: 10,
    backgroundColor: BG, borderWidth: 1, borderColor: BORDER,
    alignItems: 'center', justifyContent: 'center',
  },
  skipBtnTxt: { fontFamily: FontFamily.semiBold, fontSize: 14, color: INK_500 },
  nextBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    paddingVertical: 13, borderRadius: 10,
    backgroundColor: PRIMARY_DK,
  },
  nextBtnTxt: { fontFamily: FontFamily.bold, fontSize: 14.5, color: '#fff' },
});
