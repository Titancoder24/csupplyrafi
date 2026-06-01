import React, { useState, useRef } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet, TextInput,
  Alert, Image, ActivityIndicator, Modal,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Check, MapPin, Plus, ChevronDown, Camera, Globe,
  Sun, Moon, Truck, Building2, Phone, Upload,
  PackagePlus, Boxes, CheckCircle2, ArrowRight, User,
  Shield, Zap, TrendingUp,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import Svg, { Path, Rect, Ellipse, Circle, G as SvgG } from 'react-native-svg';
import { Screen } from '@/components/ui/Screen';
import { Header } from '@/components/ui/Header';
import { StepProgress } from '@/components/ui/StepProgress';
import { StickyCta } from '@/components/ui/StickyCta';
import { useVendorOnboarding } from '@/features/vendor/onboarding-store';
import { hashLocal } from '@/services/auth/otp';
import { MapPicker } from '@/components/ui/MapPicker';
import { supabase } from '@/services/supabase';
import { useAuth } from '@/services/auth/AuthProvider';
import { FontFamily } from '@/constants/theme';

const G = '#16A34A';
const GD = '#15803D';
const TOTAL = 15;

const TITLES = [
  'Welcome', 'Mobile Registration', 'Business Type', 'Vendor Details',
  'Vendor Verification', 'Product Categories', 'Upload Products', 'Stock Setup',
  'MOQ + Sizes Setup', 'Delivery Time Slots', 'Vehicle Types',
  'Delivery Charges', 'Delivery Radius', 'Final Review', 'Submitted',
];

/* ─── Category SVGs ──────────────────────────────────────────────── */
function CatCement({ size = 52 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 52 52">
      <Rect x="12" y="15" width="28" height="27" rx="4" fill="#0F172A" />
      <Rect x="15" y="11" width="22" height="8" rx="3" fill="#0F172A" opacity="0.82" />
      <Rect x="12" y="24" width="28" height="5" fill="#FFFFFF" opacity="0.24" />
      <Rect x="17" y="30" width="18" height="7" rx="2" fill="#FFFFFF" opacity="0.64" />
      <Rect x="20" y="32.5" width="12" height="2" rx="1" fill="#0F172A" />
    </Svg>
  );
}
function CatBricks({ size = 52 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 52 52">
      <Rect x="7" y="12" width="16" height="9" rx="2" fill="#0F172A" />
      <Rect x="26" y="12" width="19" height="9" rx="2" fill="#0F172A" opacity="0.82" />
      <Rect x="13" y="23" width="16" height="9" rx="2" fill="#0F172A" opacity="0.82" />
      <Rect x="32" y="23" width="13" height="9" rx="2" fill="#0F172A" />
      <Rect x="7" y="23" width="4" height="9" rx="2" fill="#0F172A" opacity="0.68" />
      <Rect x="7" y="34" width="16" height="9" rx="2" fill="#0F172A" />
      <Rect x="26" y="34" width="19" height="9" rx="2" fill="#0F172A" opacity="0.82" />
    </Svg>
  );
}
function CatSteel({ size = 52 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 52 52">
      <Rect x="7" y="11" width="38" height="7" rx="3.5" fill="#0F172A" />
      <Rect x="7" y="20" width="38" height="7" rx="3.5" fill="#0F172A" opacity="0.74" />
      <Rect x="7" y="29" width="38" height="7" rx="3.5" fill="#0F172A" />
      <Rect x="7" y="38" width="38" height="7" rx="3.5" fill="#0F172A" opacity="0.74" />
    </Svg>
  );
}
function CatMetal({ size = 52 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 52 52">
      <Rect x="7" y="10" width="38" height="5" rx="2.5" fill="#0F172A" />
      <Rect x="21" y="15" width="5" height="22" rx="2.5" fill="#0F172A" opacity="0.74" />
      <Rect x="26" y="15" width="5" height="22" rx="2.5" fill="#0F172A" />
      <Rect x="7" y="37" width="38" height="5" rx="2.5" fill="#0F172A" />
    </Svg>
  );
}
function CatAggregates({ size = 52 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 52 52">
      <Ellipse cx="15" cy="22" rx="7" ry="6" fill="#0F172A" />
      <Ellipse cx="30" cy="19" rx="8" ry="7" fill="#0F172A" opacity="0.74" />
      <Ellipse cx="39" cy="27" rx="6" ry="7" fill="#0F172A" />
      <Ellipse cx="12" cy="34" rx="6" ry="5" fill="#0F172A" opacity="0.74" />
      <Ellipse cx="27" cy="36" rx="8" ry="6" fill="#0F172A" />
      <Ellipse cx="39" cy="38" rx="5" ry="5" fill="#0F172A" opacity="0.74" />
    </Svg>
  );
}
function CatTiles({ size = 52 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 52 52">
      <Rect x="7" y="7" width="17" height="17" rx="2" fill="#0F172A" />
      <Rect x="28" y="7" width="17" height="17" rx="2" fill="#0F172A" opacity="0.74" />
      <Rect x="7" y="28" width="17" height="17" rx="2" fill="#0F172A" opacity="0.74" />
      <Rect x="28" y="28" width="17" height="17" rx="2" fill="#0F172A" />
    </Svg>
  );
}
function CatPlumbing({ size = 52 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 52 52">
      <Rect x="7" y="21" width="20" height="10" rx="5" fill="#0F172A" />
      <Rect x="22" y="7" width="10" height="20" rx="5" fill="#0F172A" opacity="0.74" />
      <Circle cx="27" cy="27" r="7" fill="#0F172A" />
      <Circle cx="27" cy="27" r="4" fill="#FFFFFF" opacity="0.65" />
    </Svg>
  );
}
function CatElectrical({ size = 52 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 52 52">
      <Path d="M30 8 L16 28 L23 28 L22 44 L36 24 L29 24 Z" fill="#0F172A" />
    </Svg>
  );
}

const CAT_ICONS: Record<string, React.ComponentType<{ size?: number }>> = {
  cement: CatCement, bricks: CatBricks, steel: CatSteel, metal: CatMetal,
  aggregate: CatAggregates, tiles: CatTiles, plumbing: CatPlumbing, electrical: CatElectrical,
};

/* ─── Shared form components ──────────────────────────────────────── */
function SectionCard({ children, style }: { children: React.ReactNode; style?: any }) {
  return <View style={[sc.card, style]}>{children}</View>;
}

function SectionHeading({ text, sub }: { text: string; sub?: string }) {
  return (
    <View style={{ gap: 3, marginBottom: 16 }}>
      <Text style={sc.heading}>{text}</Text>
      {sub && <Text style={sc.sub}>{sub}</Text>}
    </View>
  );
}

function FieldLabel({ label, optional }: { label: string; optional?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', gap: 4, marginBottom: 7, alignItems: 'center' }}>
      <Text style={f.label}>{label}</Text>
      {optional && <Text style={f.optional}>Optional</Text>}
    </View>
  );
}

function FieldInput({
  value, onChange, placeholder, keyboardType = 'default',
  autoCapitalize = 'sentences', multiline = false, prefix,
}: {
  value: string; onChange: (v: string) => void; placeholder: string;
  keyboardType?: any; autoCapitalize?: any; multiline?: boolean; prefix?: string;
}) {
  return (
    <View style={[f.inputWrap, multiline && f.inputWrapMulti]}>
      {prefix && <Text style={f.prefix}>{prefix}</Text>}
      <TextInput
        style={[f.input, multiline && f.inputMulti]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        multiline={multiline}
      />
    </View>
  );
}

function CategoryTile({ slug, label, selected, onPress }: {
  slug: string; label: string; selected: boolean; onPress: () => void;
}) {
  const Icon = CAT_ICONS[slug];
  return (
    <Pressable style={[ct.tile, selected && ct.tileSelected]} onPress={onPress}>
      {selected && (
        <View style={ct.checkBadge}>
          <Check size={9} color="#FFFFFF" strokeWidth={3} />
        </View>
      )}
      <View style={ct.iconBox}>{Icon && <Icon size={44} />}</View>
      <Text style={[ct.label, selected && ct.labelSelected]} numberOfLines={2}>{label}</Text>
    </Pressable>
  );
}

function DocUploadRow({ label, optional, uploaded, onPress }: {
  label: string; optional?: boolean; uploaded?: boolean; onPress: () => void;
}) {
  return (
    <Pressable style={[dr.row, uploaded && dr.rowDone]} onPress={onPress}>
      <View style={[dr.iconBox, uploaded ? dr.iconBoxDone : dr.iconBoxPending]}>
        {uploaded
          ? <Check size={14} color="#FFFFFF" strokeWidth={2.5} />
          : <Upload size={14} color="#0F172A" strokeWidth={2} />}
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={dr.label}>{label}</Text>
        {optional && <Text style={dr.optional}>Optional</Text>}
      </View>
      <View style={[dr.statusPill, uploaded ? dr.statusPillDone : dr.statusPillPending]}>
        <Text style={[dr.statusTxt, uploaded ? dr.statusTxtDone : dr.statusTxtPending]}>
          {uploaded ? 'Uploaded' : 'Upload'}
        </Text>
      </View>
    </Pressable>
  );
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <Pressable onPress={() => onChange(!value)} style={[tog.track, value && tog.trackOn]} hitSlop={8}>
      <View style={[tog.thumb, value && tog.thumbOn]} />
    </Pressable>
  );
}

/* ─── Main component ─────────────────────────────────────────────── */
export default function VendorOnboardingStep() {
  const router = useRouter();
  const { step } = useLocalSearchParams<{ step: string }>();
  const n = Math.max(1, Math.min(TOTAL, parseInt(step ?? '1', 10) || 1));
  const v = useVendorOnboarding();
  const { profile } = useAuth();

  const prev = () => (n > 1 ? router.push(`/vendor/onboarding/${n - 1}` as never) : router.back());
  const next = () => router.push(`/vendor/onboarding/${n + 1}` as never);

  const ctaLabel = n === 15 ? 'Go to Dashboard'
    : n === 14 ? 'Submit Application'
    : n === 5  ? 'Submit for Verification'
    : 'Continue';

  const [submitErr, setSubmitErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const ctaAction = async () => {
    if (n === 15) { router.replace('/vendor/dashboard'); return; }
    if (n === 14) {
      if (!profile?.id) {
        setSubmitErr('You are not signed in. Please sign in to submit your application.');
        return;
      }
      setSubmitting(true);
      setSubmitErr(null);
      try {
        // Update user profile role and passcode_hash in profiles table
        const { error: profErr } = await supabase
          .from('profiles')
          .update({
            role: 'vendor',
            passcode_hash: v.passcode ? hashLocal(v.passcode) : null,
            full_name: v.ownerName,
          })
          .eq('id', profile.id);

        if (profErr) {
          setSubmitErr(`Profile update failed: ${profErr.message}`);
          setSubmitting(false);
          return;
        }

        const { error: upErr } = await supabase.from('vendor_profiles').upsert({
          id:                profile.id,
          business_name:     v.shopName,
          business_type:     v.businessType,
          gst_number:        v.gstNumber ?? null,
          bank_account:      v.bankAccount ?? null,
          bank_ifsc:         v.bankIfsc ?? null,
          categories:        v.categories,
          vehicle_types:     v.vehicleTypes,
          delivery_slots:    v.slots,
          delivery_pricing:  v.charges,
          service_radius_km: v.radiusKm,
          kyc_status:        'submitted',
        });
        if (upErr) {
          setSubmitErr(`Submit failed: ${upErr.message}`);
          return;
        }

        if (v.products.length > 0) {
          const productRows = v.products.map(p => ({
            vendor_id:  profile.id,
            name:       p.name.trim(),
            base_price: p.price,
            unit:       p.unit.toLowerCase(),
            stock_qty:  0,
            status:     'draft',
            slug: p.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-' + Date.now() + Math.floor(Math.random() * 1000),
          }));
          const { error: pErr } = await supabase.from('products').insert(productRows);
          if (pErr) console.warn('Products insert error:', pErr.message);
        }

        router.replace('/vendor/pending');
        return;
      } finally {
        setSubmitting(false);
      }
    }
    next();
  };

  return (
    <Screen scroll={false} bottomBarHeight={88} style={ss.root}>
      {n > 1 && <Header title={TITLES[n - 1]} onBack={prev} />}
      <StepProgress step={n} total={TOTAL} />

      <ScrollView contentContainerStyle={ss.scroll} showsVerticalScrollIndicator={false}>
        {n === 1  && <Step1 onLogin={() => router.replace('/vendor/dashboard')} onRegister={next} />}
        {n === 2  && <Step2 />}
        {n === 3  && <Step3 />}
        {n === 4  && <Step4 />}
        {n === 5  && <Step5 />}
        {n === 6  && <Step6 />}
        {n === 7  && <Step7 />}
        {n === 8  && <Step8 />}
        {n === 9  && <Step9 />}
        {n === 10 && <Step10 />}
        {n === 11 && <Step11 />}
        {n === 12 && <Step12 />}
        {n === 13 && <Step13 />}
        {n === 14 && <Step14 />}
        {n === 15 && <Step15 />}
      </ScrollView>

      {n !== 1 && (
        <StickyCta>
          {submitErr ? (
            <View style={{
              backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA',
              borderRadius: 10, padding: 10, marginBottom: 8,
            }}>
              <Text style={{ fontFamily: FontFamily.medium, fontSize: 12, color: '#B91C1C' }}>
                {submitErr}
              </Text>
            </View>
          ) : null}
          <Pressable
            style={[ss.cta, submitting && { opacity: 0.6 }]}
            onPress={ctaAction}
            disabled={submitting}
          >
            <Text style={ss.ctaText}>{submitting ? 'Submitting…' : ctaLabel}</Text>
            {n !== 15 && !submitting && <ArrowRight size={16} color="#FFFFFF" strokeWidth={2.5} />}
          </Pressable>
        </StickyCta>
      )}
    </Screen>
  );
}

/* ─── Step 1 — Welcome ───────────────────────────────────────────── */
function Step1({ onLogin, onRegister }: { onLogin: () => void; onRegister: () => void }) {
  const USPS = [
    { icon: TrendingUp, text: 'Reach 10,000+ active buyers' },
    { icon: Zap,        text: 'Manage orders in real-time' },
    { icon: Shield,     text: 'Secure & verified platform' },
  ];
  return (
    <View style={s1.root}>
      {/* Brand */}
      <View style={s1.brand}>
        <Image
          source={require('../../../assets/Logo_Ui.png')}
          style={s1.brandLogo}
          resizeMode="contain"
        />
        <View style={s1.vendorBadge}>
          <Text style={s1.vendorBadgeTxt}>Vendor</Text>
        </View>
      </View>

      {/* Hero text */}
      <View style={s1.heroBlock}>
        <Text style={s1.heading}>Grow Your Business{'\n'}with C-Supply</Text>
        <Text style={s1.sub}>Join 1,200+ vendors selling construction materials online</Text>
      </View>

      {/* USP list */}
      <View style={s1.uspList}>
        {USPS.map(({ icon: Icon, text }, i) => (
          <View key={i} style={s1.uspRow}>
            <View style={s1.uspIconBox}>
              <Icon size={15} color="#0F172A" strokeWidth={2} />
            </View>
            <Text style={s1.uspText}>{text}</Text>
          </View>
        ))}
      </View>

      {/* CTAs */}
      <View style={s1.ctaBlock}>
        <Pressable style={s1.registerBtn} onPress={onRegister}>
          <Text style={s1.registerBtnTxt}>New Registration</Text>
          <ArrowRight size={16} color="#FFFFFF" strokeWidth={2.5} />
        </Pressable>
        <Pressable style={s1.loginBtn} onPress={onLogin}>
          <Text style={s1.loginBtnTxt}>I already have an account</Text>
        </Pressable>
      </View>

      {/* Language selector */}
      <View style={s1.langRow}>
        <Globe size={14} color="#0F172A" strokeWidth={1.8} />
        <Text style={s1.langTxt}>Language / भाषा</Text>
        <Pressable style={s1.langDrop}>
          <Text style={s1.langDropTxt}>English</Text>
          <ChevronDown size={12} color="#0F172A" strokeWidth={2} />
        </Pressable>
      </View>
    </View>
  );
}

/* ─── Step 2 — Mobile ────────────────────────────────────────────── */
function Step2() {
  const v = useVendorOnboarding();
  const [phone, setPhone] = useState(v.phone.replace('+91', ''));
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState(['', '', '', '']);
  const [passcode, setPasscode] = useState(['', '', '', '']);
  const otpRefs = useRef<(TextInput | null)[]>([]);
  const pcRefs  = useRef<(TextInput | null)[]>([]);

  const handleSendOtp = () => { if (phone.length < 10) return; setOtpSent(true); };

  const onOtpChange = (val: string, idx: number) => {
    const next = [...otp]; next[idx] = val.replace(/\D/g, '').slice(-1); setOtp(next);
    if (val && idx < 3) otpRefs.current[idx + 1]?.focus();
  };

  const onPcChange = (val: string, idx: number) => {
    const next = [...passcode]; next[idx] = val.replace(/\D/g, '').slice(-1); setPasscode(next);
    v.set({ passcode: next.join('') });
    if (val && idx < 3) pcRefs.current[idx + 1]?.focus();
  };

  return (
    <View style={{ gap: 20 }}>
      <SectionCard>
        <SectionHeading text="Mobile Number" sub="We'll send an OTP to verify your number" />
        <View style={s2.phoneRow}>
          <View style={s2.prefixBox}><Text style={s2.prefix}>+91</Text></View>
          <TextInput
            style={s2.phoneInput}
            value={phone}
            onChangeText={t => { const d = t.replace(/\D/g, '').slice(0, 10); setPhone(d); v.set({ phone: `+91${d}` }); }}
            placeholder="Enter 10-digit mobile number"
            placeholderTextColor="#9CA3AF"
            keyboardType="number-pad"
            maxLength={10}
          />
        </View>
        <Pressable
          style={[s2.sendOtpBtn, phone.length < 10 && s2.sendOtpBtnDisabled]}
          onPress={handleSendOtp}
          disabled={phone.length < 10}
        >
          <Text style={s2.sendOtpTxt}>Send OTP</Text>
        </Pressable>
      </SectionCard>

      <SectionCard>
        <SectionHeading text="Enter OTP" sub="4-digit code sent to your mobile" />
        <View style={s2.otpRow}>
          {otp.map((d, i) => (
            <TextInput
              key={i}
              ref={ref => { otpRefs.current[i] = ref; }}
              style={s2.otpBox}
              value={d}
              onChangeText={val => onOtpChange(val, i)}
              keyboardType="number-pad"
              maxLength={1}
              textAlign="center"
              selectTextOnFocus
            />
          ))}
        </View>
      </SectionCard>

      <SectionCard>
        <SectionHeading text="Create 4-digit Passcode" sub="Used to login to your account" />
        <View style={s2.pcRow}>
          {passcode.map((d, i) => (
            <TextInput
              key={i}
              ref={ref => { pcRefs.current[i] = ref; }}
              style={s2.pcBox}
              value={d ? '●' : ''}
              onChangeText={val => onPcChange(val, i)}
              keyboardType="number-pad"
              maxLength={1}
              secureTextEntry
              textAlign="center"
              selectTextOnFocus
            />
          ))}
        </View>
      </SectionCard>
    </View>
  );
}

/* ─── Step 3 — Business Type ─────────────────────────────────────── */
function Step3() {
  const v = useVendorOnboarding();
  const OPTIONS = [
    {
      value: 'gst',
      title: 'GST Registered Vendor',
      sub: 'I have a valid GST Number (GSTIN)',
      icon: <Building2 size={20} color="#0F172A" strokeWidth={1.8} />,
    },
    {
      value: 'non_gst',
      title: 'Non-GST Vendor',
      sub: 'Turnover below GST threshold',
      icon: <Building2 size={20} color="#0F172A" strokeWidth={1.8} />,
    },
    {
      value: 'individual',
      title: 'Individual Supplier',
      sub: 'Personal / unregistered business',
      icon: (
        <Svg width={20} height={20} viewBox="0 0 24 24">
          <Circle cx="12" cy="8" r="4" stroke="#0F172A" strokeWidth="1.8" fill="none" />
          <Path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="#0F172A" strokeWidth="1.8" strokeLinecap="round" fill="none" />
        </Svg>
      ),
    },
  ];
  return (
    <View style={{ gap: 10 }}>
      <Text style={f.pageHint}>Choose the type that best describes your business</Text>
      {OPTIONS.map(opt => {
        const sel = v.businessType === opt.value;
        return (
          <Pressable key={opt.value} style={[s3.card, sel && s3.cardSelected]} onPress={() => v.set({ businessType: opt.value as any })}>
            <View style={[s3.iconWrap, sel && s3.iconWrapSelected]}>{opt.icon}</View>
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={[s3.title, sel && s3.titleSelected]}>{opt.title}</Text>
              <Text style={s3.sub}>{opt.sub}</Text>
            </View>
            <View style={[s3.radio, sel && s3.radioSelected]}>
              {sel && <View style={s3.radioDot} />}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

/* ─── Step 4 — Vendor Details ────────────────────────────────────── */
function Step4() {
  const v = useVendorOnboarding();
  return (
    <SectionCard>
      <SectionHeading text="Business Information" sub="Tell us about your shop" />
      <FieldLabel label="Shop / Business Name" />
      <FieldInput value={v.shopName} onChange={t => v.set({ shopName: t })} placeholder="Sri Balaji Building Materials" autoCapitalize="words" />
      <View style={{ height: 16 }} />
      <FieldLabel label="Owner Name" />
      <FieldInput value={v.ownerName} onChange={t => v.set({ ownerName: t })} placeholder="Ramesh Kumar" autoCapitalize="words" />
      <View style={{ height: 16 }} />
      <FieldLabel label="Full Address" />
      <FieldInput value={v.address} onChange={t => v.set({ address: t })} placeholder={'12-1-98, Main Road,\nKukatpally, Hyderabad - 500072'} multiline />
      <View style={{ height: 16 }} />
      <FieldLabel label="Location Pin" />
      <Pressable style={s4.mapRow}>
        <TextInput style={[f.input, { flex: 1, borderWidth: 0 }]} placeholder="Search location or drop pin" placeholderTextColor="#9CA3AF" editable={false} />
        <Text style={s4.mapLink}>Map</Text>
        <MapPin size={14} color="#0F172A" strokeWidth={2} />
      </Pressable>
      <View style={{ height: 16 }} />
      <FieldLabel label="Pickup Landmark" optional />
      <FieldInput value={v.landmark ?? ''} onChange={t => v.set({ landmark: t })} placeholder="Opp. Sai Temple" />
    </SectionCard>
  );
}

/* ─── Step 5 — Verification ──────────────────────────────────────── */
function Step5() {
  const v = useVendorOnboarding();
  const [docs, setDocs] = useState<Record<string, boolean>>({});

  async function pickDoc(key: string) {
    const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!granted) { Alert.alert('Permission needed'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.8 });
    if (!result.canceled) setDocs(d => ({ ...d, [key]: true }));
  }

  const totalUploaded = Object.values(docs).filter(Boolean).length;

  return (
    <View style={{ gap: 16 }}>
      <SectionCard>
        <SectionHeading text="Identity Documents" sub="Upload to verify your business" />
        {totalUploaded > 0 && (
          <View style={s5.progressRow}>
            <View style={s5.progressBar}>
              <View style={[s5.progressFill, { width: `${(totalUploaded / 3) * 100}%` as any }]} />
            </View>
            <Text style={s5.progressTxt}>{totalUploaded}/3 uploaded</Text>
          </View>
        )}
        <View style={{ gap: 10 }}>
          <DocUploadRow label="GST Certificate"       optional uploaded={docs.gst}   onPress={() => pickDoc('gst')} />
          <DocUploadRow label="ID Proof (Aadhaar / PAN)" uploaded={docs.id}    onPress={() => pickDoc('id')} />
          <DocUploadRow label="Selfie Photo"           uploaded={docs.selfie} onPress={() => pickDoc('selfie')} />
        </View>
      </SectionCard>

      <SectionCard>
        <SectionHeading text="Bank Details" sub="For receiving payments" />
        <FieldLabel label="Account Number" />
        <FieldInput value={v.bankAccount ?? ''} onChange={t => v.set({ bankAccount: t })} placeholder="1234 5678 9012" keyboardType="number-pad" />
        <View style={{ height: 16 }} />
        <FieldLabel label="IFSC Code" />
        <FieldInput value={v.bankIfsc ?? ''} onChange={t => v.set({ bankIfsc: t.toUpperCase() })} placeholder="SBIN0001234" autoCapitalize="characters" />
      </SectionCard>
    </View>
  );
}

/* ─── Step 6 — Categories ────────────────────────────────────────── */
const CATS = [
  { slug: 'cement',     label: 'Cement & Sand' },
  { slug: 'bricks',     label: 'Bricks' },
  { slug: 'steel',      label: 'Steel' },
  { slug: 'metal',      label: 'Metal' },
  { slug: 'aggregate',  label: 'Aggregates' },
  { slug: 'tiles',      label: 'Tiles' },
  { slug: 'plumbing',   label: 'Plumbing' },
  { slug: 'electrical', label: 'Electrical' },
];

function Step6() {
  const v = useVendorOnboarding();
  const toggle = (slug: string) =>
    v.set({ categories: v.categories.includes(slug) ? v.categories.filter(c => c !== slug) : [...v.categories, slug] });

  return (
    <View style={{ gap: 12 }}>
      <Text style={f.pageHint}>Select all categories you deal in</Text>
      {v.categories.length > 0 && (
        <View style={s6.countChip}>
          <Check size={12} color="#0F172A" strokeWidth={2.5} />
          <Text style={s6.countChipTxt}>{v.categories.length} categories selected</Text>
        </View>
      )}
      <View style={ct.grid}>
        {CATS.map(c => (
          <CategoryTile
            key={c.slug} slug={c.slug} label={c.label}
            selected={v.categories.includes(c.slug)}
            onPress={() => toggle(c.slug)}
          />
        ))}
      </View>
    </View>
  );
}

/* ─── Step 7 — Upload Products ───────────────────────────────────── */
const UNIT_OPTS = ['Bag', 'Ton', 'KG', 'Piece', 'Sqft', 'Cum', 'Litre'];

function Step7() {
  const v = useVendorOnboarding();
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [unit, setUnit] = useState('Bag');
  const [imageUri, setImageUri] = useState('');
  const [showUnitPicker, setShowUnitPicker] = useState(false);

  async function pickImage() {
    const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.75, allowsEditing: true, aspect: [1, 1] });
    if (!result.canceled) setImageUri(result.assets[0].uri);
  }

  function addProduct() {
    if (!name.trim() || !price) return;
    v.set({ products: [...v.products, { name: name.trim(), price: parseFloat(price), unit, image: imageUri }] });
    setName(''); setPrice(''); setImageUri('');
  }

  return (
    <View style={{ gap: 14 }}>
      <SectionCard>
        <SectionHeading text="Add Product" sub="List your first products" />
        <FieldLabel label="Product Name" />
        <FieldInput value={name} onChange={setName} placeholder="OPC 53 Grade Cement" />
        <View style={{ height: 14 }} />
        <FieldLabel label="Product Photo" />
        <Pressable style={s7.photoBox} onPress={pickImage}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={s7.photoImg} resizeMode="cover" />
          ) : (
            <View style={s7.photoPlaceholder}>
              <View style={s7.cameraIconWrap}><Camera size={20} color="#0F172A" strokeWidth={1.8} /></View>
              <Text style={s7.photoText}>Tap to add photo</Text>
            </View>
          )}
        </Pressable>
        <View style={{ height: 14 }} />
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <FieldLabel label="Price (₹)" />
            <FieldInput value={price} onChange={setPrice} placeholder="420" keyboardType="numeric" />
          </View>
          <View style={{ flex: 1 }}>
            <FieldLabel label="Unit" />
            <Pressable style={f.dropRow} onPress={() => setShowUnitPicker(true)}>
              <Text style={f.dropVal}>{unit}</Text>
              <ChevronDown size={15} color="#0F172A" strokeWidth={2} />
            </Pressable>
          </View>
        </View>
        <View style={{ height: 16 }} />
        <Pressable style={[s7.addBtn, (!name.trim() || !price) && s7.addBtnDisabled]} onPress={addProduct} disabled={!name.trim() || !price}>
          <Plus size={15} color="#FFFFFF" strokeWidth={2.5} />
          <Text style={s7.addBtnTxt}>Add Product</Text>
        </Pressable>
      </SectionCard>

      {v.products.length > 0 && (
        <SectionCard>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <Text style={sc.heading}>Added Products</Text>
            <View style={s7.countBadge}><Text style={s7.countBadgeTxt}>{v.products.length}</Text></View>
          </View>
          {v.products.map((p, i) => (
            <View key={i} style={[s7.productRow, i < v.products.length - 1 && s7.productRowBorder]}>
              <View style={s7.productIcon}><Boxes size={14} color="#0F172A" strokeWidth={2} /></View>
              <Text style={s7.pName} numberOfLines={1}>{p.name}</Text>
              <Text style={s7.pPrice}>₹{p.price}/{p.unit}</Text>
            </View>
          ))}
        </SectionCard>
      )}

      <Modal visible={showUnitPicker} transparent animationType="fade">
        <Pressable style={pick.overlay} onPress={() => setShowUnitPicker(false)}>
          <View style={pick.sheet}>
            <Text style={pick.sheetTitle}>Select Unit</Text>
            {UNIT_OPTS.map(u => (
              <Pressable key={u} style={[pick.option, unit === u && pick.optionSelected]} onPress={() => { setUnit(u); setShowUnitPicker(false); }}>
                <Text style={[pick.optionText, unit === u && pick.optionTextSelected]}>{u}</Text>
                {unit === u && <Check size={15} color="#0F172A" strokeWidth={2.5} />}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

/* ─── Step 8 — Stock Setup ───────────────────────────────────────── */
function Step8() {
  const v = useVendorOnboarding();
  const [showUnitPicker, setShowUnitPicker] = useState(false);
  const [stockUnit, setStockUnit] = useState('Bags');

  return (
    <View style={{ gap: 14 }}>
      <SectionCard>
        <SectionHeading text="Stock Information" sub="Set your current inventory levels" />
        <FieldLabel label="Total Stock Available" />
        <View style={s8.stockRow}>
          <TextInput
            style={s8.stockInput}
            value={v.totalStock?.toString() ?? ''}
            onChangeText={t => v.set({ totalStock: parseInt(t || '0') })}
            placeholder="500"
            placeholderTextColor="#9CA3AF"
            keyboardType="number-pad"
          />
          <Pressable style={s8.unitDrop} onPress={() => setShowUnitPicker(true)}>
            <Text style={s8.unitDropText}>{stockUnit}</Text>
            <ChevronDown size={14} color="#0F172A" strokeWidth={2} />
          </Pressable>
        </View>
      </SectionCard>

      <SectionCard>
        <SectionHeading text="Stock Alerts" sub="Get notified when stock runs low" />
        <View style={s8.toggleRow}>
          <View style={{ flex: 1 }}>
            <Text style={s8.toggleLabel}>Low Stock Alert</Text>
            <Text style={s8.toggleSub}>Notify when stock drops below threshold</Text>
          </View>
          <Toggle value={v.lowStockEnabled} onChange={x => v.set({ lowStockEnabled: x })} />
        </View>
        {v.lowStockEnabled && (
          <View style={{ marginTop: 14, gap: 8 }}>
            <FieldLabel label="Alert threshold" />
            <FieldInput
              value={v.lowStockThreshold?.toString() ?? ''}
              onChange={t => v.set({ lowStockThreshold: parseInt(t || '0') })}
              placeholder="50"
              keyboardType="numeric"
            />
          </View>
        )}

        <View style={[s8.toggleRow, { marginTop: 14 }]}>
          <View style={{ flex: 1 }}>
            <Text style={s8.toggleLabel}>Auto-hide Out of Stock</Text>
            <Text style={s8.toggleSub}>Hide products when stock reaches zero</Text>
          </View>
          <Toggle value={v.autoHideOos} onChange={x => v.set({ autoHideOos: x })} />
        </View>
      </SectionCard>

      <Modal visible={showUnitPicker} transparent animationType="fade">
        <Pressable style={pick.overlay} onPress={() => setShowUnitPicker(false)}>
          <View style={pick.sheet}>
            <Text style={pick.sheetTitle}>Select Unit</Text>
            {UNIT_OPTS.map(u => (
              <Pressable key={u} style={[pick.option, stockUnit === u && pick.optionSelected]} onPress={() => { setStockUnit(u); setShowUnitPicker(false); }}>
                <Text style={[pick.optionText, stockUnit === u && pick.optionTextSelected]}>{u}</Text>
                {stockUnit === u && <Check size={15} color="#0F172A" strokeWidth={2.5} />}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

/* ─── Step 9 — MOQ + Sizes ───────────────────────────────────────── */
const DEFAULT_ROWS = [
  { product: 'Sand', size: 'River', moq: '1', unit: 'Ton' },
  { product: 'Bricks', size: '9 inch', moq: '500', unit: 'Pieces' },
  { product: 'Cement', size: 'OPC 53', moq: '20', unit: 'Bags' },
];

function Step9() {
  const [rows, setRows] = useState(DEFAULT_ROWS);

  return (
    <View style={{ gap: 14 }}>
      <Text style={f.pageHint}>Set minimum order quantities and available sizes</Text>
      <SectionCard style={{ padding: 0, overflow: 'hidden' }}>
        <View style={s9.head}>
          <Text style={[s9.th, { flex: 1 }]}>Product</Text>
          <Text style={[s9.th, { flex: 1 }]}>Size / Type</Text>
          <Text style={[s9.th, { flex: 0.7 }]}>MOQ</Text>
          <Text style={[s9.th, { flex: 1 }]}>Unit</Text>
        </View>
        {rows.map((r, i) => (
          <View key={i} style={[s9.row, i < rows.length - 1 && s9.rowBorder]}>
            <TextInput style={[s9.cell, { flex: 1 }]} value={r.product} onChangeText={v => setRows(prev => prev.map((x, j) => j === i ? { ...x, product: v } : x))} />
            <TextInput style={[s9.cell, { flex: 1 }]} value={r.size}    onChangeText={v => setRows(prev => prev.map((x, j) => j === i ? { ...x, size: v } : x))} />
            <TextInput style={[s9.cell, { flex: 0.7 }]} value={r.moq} onChangeText={v => setRows(prev => prev.map((x, j) => j === i ? { ...x, moq: v } : x))} keyboardType="numeric" />
            <View style={[s9.unitCell, { flex: 1 }]}>
              <Text style={s9.unitText}>{r.unit}</Text>
              <ChevronDown size={11} color="#0F172A" strokeWidth={2} />
            </View>
          </View>
        ))}
      </SectionCard>

      <Pressable style={s9.addRowBtn} onPress={() => setRows(r => [...r, { product: '', size: '', moq: '', unit: 'Bags' }])}>
        <Plus size={14} color="#0F172A" strokeWidth={2.5} />
        <Text style={s9.addRowText}>Add Row</Text>
      </Pressable>
    </View>
  );
}

/* ─── Step 10 — Delivery Time Slots ─────────────────────────────── */
const TIME_SLOTS = [
  { value: 'Morning',   label: 'Morning',   time: '6 AM – 12 PM',  bg: '#FEF3C7', iconBg: '#FDE68A', iconColor: '#D97706' },
  { value: 'Afternoon', label: 'Afternoon', time: '12 PM – 5 PM',  bg: '#FFEDD5', iconBg: '#FED7AA', iconColor: '#EA580C' },
  { value: 'Night',     label: 'Night',     time: '5 PM – 10 PM',  bg: '#EDE9FE', iconBg: '#DDD6FE', iconColor: '#7C3AED' },
];

function SlotIcon({ value, size = 22, color }: { value: string; size?: number; color: string }) {
  if (value === 'Night') return <Moon size={size} color="#0F172A" strokeWidth={2} />;
  return <Sun size={size} color="#0F172A" strokeWidth={2} />;
}

function Step10() {
  const v = useVendorOnboarding();
  const toggle = (val: string) =>
    v.set({ slots: v.slots.includes(val) ? v.slots.filter(s => s !== val) : [...v.slots, val] });

  return (
    <View style={{ gap: 12 }}>
      <Text style={f.pageHint}>Select all time slots you can deliver in</Text>
      {TIME_SLOTS.map(s => {
        const on = v.slots.includes(s.value);
        return (
          <Pressable key={s.value} style={[s10.card, on && s10.cardActive]} onPress={() => toggle(s.value)}>
            <View style={[s10.iconBox, { backgroundColor: s.iconBg }]}>
              <SlotIcon value={s.value} color={s.iconColor} size={22} />
            </View>
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={[s10.label, on && s10.labelActive]}>{s.label}</Text>
              <Text style={s10.time}>{s.time}</Text>
            </View>
            <View style={[s10.check, on && s10.checkActive]}>
              {on && <Check size={12} color="#FFFFFF" strokeWidth={3} />}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

/* ─── Step 11 — Vehicle Types ────────────────────────────────────── */
const VEHICLE_GROUPS = [
  { heading: 'Light Vehicles',  items: ['3 Wheeler (300 kg)', 'Mini Pickup (1 Ton)', '4 Wheeler (2 Ton)', '5 Ton Truck'] },
  { heading: 'Medium Vehicles', items: ['6 Wheeler (6 to 13 Ton)'] },
  { heading: 'Heavy Vehicles',  items: ['10 Tyre Truck', '14 Tyre Truck'] },
];

function Step11() {
  const v = useVendorOnboarding();
  const toggle = (label: string) =>
    v.set({ vehicleTypes: v.vehicleTypes.includes(label) ? v.vehicleTypes.filter(x => x !== label) : [...v.vehicleTypes, label] });

  return (
    <View style={{ gap: 18 }}>
      <Text style={f.pageHint}>Select vehicle types available for delivery</Text>
      {VEHICLE_GROUPS.map(g => (
        <View key={g.heading} style={{ gap: 8 }}>
          <Text style={s11.groupHead}>{g.heading}</Text>
          {g.items.map(label => {
            const on = v.vehicleTypes.includes(label);
            return (
              <Pressable key={label} style={[s11.row, on && s11.rowActive]} onPress={() => toggle(label)}>
                <View style={[s11.truckIconBox, on && s11.truckIconBoxActive]}>
                  <Truck size={14} color="#FFFFFF" strokeWidth={2} />
                </View>
                <Text style={[s11.label, on && s11.labelActive]}>{label}</Text>
                <View style={[s11.check, on && s11.checkActive]}>
                  {on && <Check size={11} color="#FFFFFF" strokeWidth={3} />}
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

/* ─── Step 12 — Delivery Charges ─────────────────────────────────── */
const VEHICLE_RATES = [
  ['3 Wheeler (300 kg)', '₹15 /km'],
  ['Mini Pickup (1 Ton)', '₹20 /km'],
  ['4 Wheeler (2 Ton)', '₹25 /km'],
  ['5 Ton Truck', '₹30 /km'],
  ['6 Wheeler', '₹40 /km'],
  ['10 Tyre Truck', '₹45 /km'],
  ['14 Tyre Truck', '₹50 /km'],
] as const;

function Step12() {
  const v = useVendorOnboarding();
  return (
    <View style={{ gap: 16 }}>
      <View style={s12.toggle}>
        <Pressable style={[s12.toggleBtn, v.charges.mode === 'free' && s12.toggleBtnActive]} onPress={() => v.set({ charges: { ...v.charges, mode: 'free' } })}>
          <Text style={[s12.toggleText, v.charges.mode === 'free' && s12.toggleTextActive]}>Free Delivery</Text>
        </Pressable>
        <Pressable style={[s12.toggleBtn, v.charges.mode === 'paid' && s12.toggleBtnActive]} onPress={() => v.set({ charges: { ...v.charges, mode: 'paid' } })}>
          <Text style={[s12.toggleText, v.charges.mode === 'paid' && s12.toggleTextActive]}>Paid Delivery</Text>
        </Pressable>
      </View>

      {v.charges.mode === 'paid' ? (
        <>
          <SectionCard>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <View style={s12.refIconBox}><TrendingUp size={14} color="#0F172A" strokeWidth={2} /></View>
              <Text style={sc.heading}>Admin Reference Rates</Text>
            </View>
            <View style={s12.refRow}>
              <Text style={s12.refLabel}>Base Price</Text>
              <Text style={s12.refVal}>₹200</Text>
            </View>
            <View style={s12.refRow}>
              <Text style={s12.refLabel}>Price per KM</Text>
              <Text style={s12.refVal}>₹25</Text>
            </View>
          </SectionCard>

          <SectionCard style={{ padding: 0, overflow: 'hidden' }}>
            <View style={s12.tableHead}>
              <Text style={s12.tableHeadTxt}>Vehicle-wise Pricing</Text>
            </View>
            {VEHICLE_RATES.map(([label, rate], i) => (
              <View key={label} style={[s12.rateRow, i < VEHICLE_RATES.length - 1 && s12.rateRowBorder]}>
                <Text style={s12.rateLabel}>{label}</Text>
                <Text style={s12.rateVal}>{rate}</Text>
              </View>
            ))}
          </SectionCard>
        </>
      ) : (
        <SectionCard>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
            <View style={s12.freeIconBox}><Check size={16} color="#0F172A" strokeWidth={2.5} /></View>
            <View style={{ flex: 1 }}>
              <Text style={s12.freeTxt}>Free delivery selected</Text>
              <Text style={s12.freeSub}>Buyers will see no delivery charge at checkout.</Text>
            </View>
          </View>
        </SectionCard>
      )}
    </View>
  );
}

/* ─── Step 13 — Service Area ─────────────────────────────────────── */
function Step13() {
  const v = useVendorOnboarding();
  const pct = ((v.radiusKm - 1) / 49) * 100;

  return (
    <View style={{ gap: 20 }}>
      <Text style={f.pageHint}>Pin your warehouse location and set delivery coverage</Text>
      <SectionCard>
        <MapPicker
          label="Your Base / Warehouse Location"
          value={v.baseLocation ?? undefined}
          placeholder="Search your city, area or warehouse…"
          onSelect={loc => v.set({ baseLocation: loc })}
        />
      </SectionCard>

      <SectionCard>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <Text style={sc.heading}>Delivery Radius</Text>
          <View style={s13.kmBadge}>
            <Text style={s13.kmText}>{v.radiusKm} KM</Text>
          </View>
        </View>

        <View style={{ gap: 8 }}>
          <View style={s13.track}>
            <View style={[s13.fill, { width: `${pct}%` as any }]} />
            <View style={[s13.thumb, { left: `${Math.max(0, pct - 2)}%` as any }]} />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={f.hint}>1 km</Text>
            <Text style={f.hint}>50 km</Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
          {[-10, -5, 5, 10].map(d => (
            <Pressable key={d} style={s13.adjBtn} onPress={() => v.set({ radiusKm: Math.min(50, Math.max(1, v.radiusKm + d)) })}>
              <Text style={s13.adjText}>{d > 0 ? `+${d}` : d} km</Text>
            </Pressable>
          ))}
        </View>

        {v.baseLocation && (
          <View style={s13.coverChip}>
            <MapPin size={12} color="#0F172A" strokeWidth={2} />
            <Text style={s13.coverText} numberOfLines={1}>
              Covering {v.radiusKm} km around {v.baseLocation.address.split(',')[0]}
            </Text>
          </View>
        )}
      </SectionCard>
    </View>
  );
}

/* ─── Step 14 — Final Review ─────────────────────────────────────── */
function Step14() {
  const v = useVendorOnboarding();
  const router = useRouter();
  const ROWS = [
    { label: 'Vendor Info',       value: `${v.shopName || '—'}${v.ownerName ? ', ' + v.ownerName : ''}`, step: 4 },
    { label: 'Products',          value: `${v.products.length} Product${v.products.length !== 1 ? 's' : ''} Added`, step: 7 },
    { label: 'Stock',             value: v.totalStock ? `${v.totalStock} Items` : 'Not set', step: 8 },
    { label: 'Time Slots',        value: v.slots.join(', ') || '—', step: 10 },
    { label: 'Vehicles',          value: `${v.vehicleTypes.length} Vehicle Type${v.vehicleTypes.length !== 1 ? 's' : ''}`, step: 11 },
    { label: 'Delivery Charges',  value: v.charges.mode === 'paid' ? 'Paid Delivery' : 'Free Delivery', step: 12 },
    { label: 'Delivery Radius',   value: `${v.radiusKm} KM`, step: 13 },
  ];

  return (
    <View style={{ gap: 10 }}>
      <Text style={f.pageHint}>Review your information before submitting</Text>
      <SectionCard style={{ padding: 0, overflow: 'hidden' }}>
        {ROWS.map((r, i) => (
          <View key={r.label} style={[s14.row, i < ROWS.length - 1 && s14.rowBorder]}>
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={s14.rowLabel}>{r.label}</Text>
              <Text style={s14.rowValue} numberOfLines={2}>{r.value}</Text>
            </View>
            <Pressable style={s14.editBtn} onPress={() => router.push(`/vendor/onboarding/${r.step}` as never)}>
              <Text style={s14.editTxt}>Edit</Text>
            </Pressable>
          </View>
        ))}
      </SectionCard>

      <View style={s14.disclaimer}>
        <Shield size={14} color="#0F172A" strokeWidth={1.8} />
        <Text style={s14.disclaimerTxt}>Your information is encrypted and shared only with verified buyers on the platform.</Text>
      </View>
    </View>
  );
}

/* ─── Step 15 — Submitted ────────────────────────────────────────── */
function Step15() {
  const NEXT_STEPS = [
    { step: '1', text: 'Admin reviews your documents (24–48 hrs)' },
    { step: '2', text: 'KYC verification call from our team' },
    { step: '3', text: 'Your store goes live for buyers' },
  ];

  return (
    <View style={{ alignItems: 'center', gap: 24, paddingTop: 12 }}>
      {/* Success icon */}
      <View style={s15.outerCircle}>
        <View style={s15.innerCircle}>
          <CheckCircle2 size={52} color="#0F172A" strokeWidth={2} />
        </View>
      </View>

      {/* Heading */}
      <View style={{ gap: 8, alignItems: 'center' }}>
        <Text style={s15.title}>Application Submitted!</Text>
        <Text style={s15.sub}>
          We've received your registration. Our team will review your details and get back to you within 24–48 hours.
        </Text>
      </View>

      {/* What's next */}
      <SectionCard style={{ width: '100%' }}>
        <Text style={[sc.heading, { marginBottom: 14 }]}>What happens next?</Text>
        {NEXT_STEPS.map((item, i) => (
          <View key={i} style={[s15.nextRow, i < NEXT_STEPS.length - 1 && { marginBottom: 16 }]}>
            <View style={s15.stepNum}><Text style={s15.stepNumTxt}>{item.step}</Text></View>
            <Text style={s15.nextTxt}>{item.text}</Text>
          </View>
        ))}
      </SectionCard>

      {/* Status pill */}
      <View style={s15.statusPill}>
        <View style={s15.statusDot} />
        <Text style={s15.statusTxt}>Verification in Progress</Text>
      </View>
    </View>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   STYLES
═══════════════════════════════════════════════════════════════════ */

const ss = StyleSheet.create({
  root:    { backgroundColor: '#F8FAFC' },
  scroll:  { padding: 16, paddingBottom: 32 },
  cta: {
    backgroundColor: G, borderRadius: 12, paddingVertical: 15,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  ctaText: { fontFamily: FontFamily.semiBold, fontSize: 15, color: '#fff' },
});

const sc = StyleSheet.create({
  card: {
    backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#E5E7EB',
    padding: 18,
    shadowColor: '#0F172A', shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  heading: { fontFamily: FontFamily.semiBold, fontSize: 14, color: '#111827' },
  sub:     { fontFamily: FontFamily.regular, fontSize: 12, color: '#6B7280', lineHeight: 18 },
});

const f = StyleSheet.create({
  label:   { fontFamily: FontFamily.medium, fontSize: 13, color: '#374151' },
  optional:{ fontFamily: FontFamily.regular, fontSize: 11, color: '#9CA3AF', marginLeft: 2 },
  hint:    { fontFamily: FontFamily.regular, fontSize: 12, color: '#9CA3AF' },
  pageHint:{ fontFamily: FontFamily.regular, fontSize: 13, color: '#6B7280', marginBottom: 4 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center', height: 48,
    borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 10,
    paddingHorizontal: 14, backgroundColor: '#F9FAFB',
  },
  inputWrapMulti: { height: 92, alignItems: 'flex-start', paddingTop: 12 },
  prefix:  { fontFamily: FontFamily.medium, fontSize: 14, color: '#374151', marginRight: 6 },
  input:   { flex: 1, fontFamily: FontFamily.regular, fontSize: 14, color: '#111827' },
  inputMulti: { height: 70, textAlignVertical: 'top' },
  dropRow: {
    flexDirection: 'row', alignItems: 'center', height: 48,
    borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 10,
    paddingHorizontal: 14, backgroundColor: '#F9FAFB',
  },
  dropVal: { flex: 1, fontFamily: FontFamily.medium, fontSize: 14, color: '#111827' },
});

/* Step 1 */
const s1 = StyleSheet.create({
  root:     { alignItems: 'center', gap: 0, paddingTop: 20 },
  brand:    { alignItems: 'center', gap: 10, marginBottom: 28 },
  brandLogo: { width: 220, height: 96 },
  logoCircle: { width: 52, height: 52, borderRadius: 13, backgroundColor: G, alignItems: 'center', justifyContent: 'center' },
  brandName: { fontFamily: FontFamily.bold, fontSize: 26, color: '#111827', letterSpacing: -0.3 },
  vendorBadge: { backgroundColor: '#DCFCE7', borderRadius: 99, paddingHorizontal: 8, paddingVertical: 3 },
  vendorBadgeTxt: { fontFamily: FontFamily.semiBold, fontSize: 10, color: GD },
  heroBlock: { alignItems: 'center', gap: 8, marginBottom: 28 },
  heading:  { fontFamily: FontFamily.bold, fontSize: 26, color: '#111827', textAlign: 'center', lineHeight: 36, letterSpacing: -0.3 },
  sub:      { fontFamily: FontFamily.regular, fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 22 },
  uspList:  { width: '100%', gap: 10, marginBottom: 28 },
  uspRow:   { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 4 },
  uspIconBox: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#DCFCE7', alignItems: 'center', justifyContent: 'center' },
  uspText:  { fontFamily: FontFamily.medium, fontSize: 14, color: '#374151', flex: 1 },
  ctaBlock: { width: '100%', gap: 10, marginBottom: 28 },
  registerBtn: {
    width: '100%', paddingVertical: 15, borderRadius: 12, backgroundColor: G,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  registerBtnTxt: { fontFamily: FontFamily.semiBold, fontSize: 15, color: '#fff' },
  loginBtn: { width: '100%', paddingVertical: 14, borderRadius: 12, borderWidth: 2, borderColor: G, alignItems: 'center' },
  loginBtnTxt: { fontFamily: FontFamily.semiBold, fontSize: 15, color: G },
  langRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  langTxt:  { fontFamily: FontFamily.regular, fontSize: 13, color: '#6B7280' },
  langDrop: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, backgroundColor: '#F9FAFB' },
  langDropTxt: { fontFamily: FontFamily.medium, fontSize: 13, color: '#374151' },
});

/* Step 2 */
const s2 = StyleSheet.create({
  phoneRow: { flexDirection: 'row', borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 10, overflow: 'hidden', backgroundColor: '#F9FAFB' },
  prefixBox: { paddingHorizontal: 14, justifyContent: 'center', borderRightWidth: 1.5, borderRightColor: '#E5E7EB', backgroundColor: '#F3F4F6' },
  prefix: { fontFamily: FontFamily.semiBold, fontSize: 14, color: '#374151' },
  phoneInput: { flex: 1, paddingHorizontal: 14, height: 48, fontFamily: FontFamily.regular, fontSize: 14, color: '#111827' },
  sendOtpBtn: { backgroundColor: G, borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  sendOtpBtnDisabled: { opacity: 0.4 },
  sendOtpTxt: { fontFamily: FontFamily.semiBold, fontSize: 15, color: '#fff' },
  otpRow: { flexDirection: 'row', gap: 12, justifyContent: 'center' },
  otpBox: { width: 58, height: 58, borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 12, backgroundColor: '#F9FAFB', fontFamily: FontFamily.bold, fontSize: 24, color: '#111827', textAlign: 'center' },
  pcRow:  { flexDirection: 'row', gap: 20, justifyContent: 'center' },
  pcBox:  { width: 52, height: 52, borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 12, backgroundColor: '#F9FAFB', fontFamily: FontFamily.bold, fontSize: 22, color: '#111827', textAlign: 'center' },
});

/* Step 3 */
const s3 = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1.5, borderColor: '#E5E7EB' },
  cardSelected: { borderColor: G, backgroundColor: '#F0FDF4' },
  iconWrap: { width: 44, height: 44, borderRadius: 10, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  iconWrapSelected: { backgroundColor: '#DCFCE7' },
  title: { fontFamily: FontFamily.semiBold, fontSize: 14, color: '#374151' },
  titleSelected: { color: '#111827' },
  sub:   { fontFamily: FontFamily.regular, fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#D1D5DB', alignItems: 'center', justifyContent: 'center' },
  radioSelected: { borderColor: G },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: G },
});

/* Step 4 */
const s4 = StyleSheet.create({
  mapRow: { flexDirection: 'row', alignItems: 'center', height: 48, borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 14, backgroundColor: '#F9FAFB', gap: 8 },
  mapLink: { fontFamily: FontFamily.semiBold, fontSize: 13, color: '#2563EB' },
});

/* Step 5 */
const s5 = StyleSheet.create({
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  progressBar: { flex: 1, height: 4, backgroundColor: '#E5E7EB', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: G, borderRadius: 2 },
  progressTxt: { fontFamily: FontFamily.medium, fontSize: 12, color: GD },
});

/* Step 6 */
const s6 = StyleSheet.create({
  countChip: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: '#DCFCE7', borderRadius: 99, paddingHorizontal: 10, paddingVertical: 5 },
  countChipTxt: { fontFamily: FontFamily.semiBold, fontSize: 11, color: GD },
});

/* Category tiles */
const ct = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: { width: '47.5%', backgroundColor: '#fff', borderRadius: 12, borderWidth: 1.5, borderColor: '#E5E7EB', padding: 14, alignItems: 'center', gap: 8, position: 'relative', shadowColor: '#0F172A', shadowOpacity: 0.03, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  tileSelected: { borderColor: G, backgroundColor: '#F0FDF4' },
  checkBadge: { position: 'absolute', top: 8, right: 8, width: 20, height: 20, borderRadius: 10, backgroundColor: G, alignItems: 'center', justifyContent: 'center' },
  iconBox: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center' },
  label: { fontFamily: FontFamily.medium, fontSize: 12, color: '#374151', textAlign: 'center' },
  labelSelected: { color: GD, fontFamily: FontFamily.semiBold },
});

/* Doc upload row */
const dr = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  rowDone: { borderColor: '#BBF7D0', backgroundColor: '#F0FDF4' },
  iconBox: { width: 36, height: 36, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  iconBoxPending: { backgroundColor: '#F0FDF4' },
  iconBoxDone: { backgroundColor: G },
  label: { fontFamily: FontFamily.medium, fontSize: 14, color: '#111827' },
  optional: { fontFamily: FontFamily.regular, fontSize: 12, color: '#9CA3AF' },
  statusPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  statusPillPending: { backgroundColor: '#F0FDF4', borderWidth: 1, borderColor: G },
  statusPillDone: { backgroundColor: G },
  statusTxt: { fontFamily: FontFamily.semiBold, fontSize: 12 },
  statusTxtPending: { color: G },
  statusTxtDone: { color: '#fff' },
});

/* Step 7 */
const s7 = StyleSheet.create({
  photoBox: { width: '100%', aspectRatio: 16 / 9, borderRadius: 12, borderWidth: 1.5, borderColor: '#E5E7EB', borderStyle: 'dashed', backgroundColor: '#F9FAFB', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  photoImg: { width: '100%', height: '100%' },
  photoPlaceholder: { alignItems: 'center', gap: 8 },
  cameraIconWrap: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' },
  photoText: { fontFamily: FontFamily.regular, fontSize: 13, color: '#9CA3AF' },
  addBtn: { backgroundColor: G, borderRadius: 10, paddingVertical: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  addBtnDisabled: { opacity: 0.4 },
  addBtnTxt: { fontFamily: FontFamily.semiBold, fontSize: 14, color: '#fff' },
  productRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11 },
  productRowBorder: { borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  productIcon: { width: 28, height: 28, borderRadius: 7, backgroundColor: '#F0FDF4', alignItems: 'center', justifyContent: 'center' },
  pName: { flex: 1, fontFamily: FontFamily.regular, fontSize: 13, color: '#374151' },
  pPrice: { fontFamily: FontFamily.semiBold, fontSize: 13, color: '#111827' },
  countBadge: { backgroundColor: G, borderRadius: 99, width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  countBadgeTxt: { fontFamily: FontFamily.bold, fontSize: 11, color: '#fff' },
});

/* Step 8 */
const s8 = StyleSheet.create({
  stockRow: { flexDirection: 'row', borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 10, overflow: 'hidden', backgroundColor: '#F9FAFB' },
  stockInput: { flex: 1, height: 48, paddingHorizontal: 14, fontFamily: FontFamily.regular, fontSize: 14, color: '#111827' },
  unitDrop: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 14, borderLeftWidth: 1.5, borderLeftColor: '#E5E7EB', backgroundColor: '#F3F4F6' },
  unitDropText: { fontFamily: FontFamily.medium, fontSize: 13, color: '#374151' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  toggleLabel: { fontFamily: FontFamily.medium, fontSize: 14, color: '#111827' },
  toggleSub:   { fontFamily: FontFamily.regular, fontSize: 12, color: '#9CA3AF', marginTop: 2 },
});

/* Toggle */
const tog = StyleSheet.create({
  track: { width: 48, height: 28, borderRadius: 14, backgroundColor: '#E5E7EB', justifyContent: 'center', paddingHorizontal: 3 },
  trackOn: { backgroundColor: G },
  thumb: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff', alignSelf: 'flex-start' },
  thumbOn: { alignSelf: 'flex-end' },
});

/* Step 9 */
const s9 = StyleSheet.create({
  head: { flexDirection: 'row', backgroundColor: '#F9FAFB', paddingHorizontal: 12, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  th: { fontFamily: FontFamily.semiBold, fontSize: 10, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.4 },
  row: { flexDirection: 'row', paddingVertical: 8, paddingHorizontal: 4, alignItems: 'center' },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  cell: { fontFamily: FontFamily.regular, fontSize: 13, color: '#374151', paddingHorizontal: 8, paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  unitCell: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, gap: 4 },
  unitText: { fontFamily: FontFamily.regular, fontSize: 13, color: '#374151' },
  addRowBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 10, borderWidth: 1.5, borderColor: G, backgroundColor: '#F0FDF4' },
  addRowText: { fontFamily: FontFamily.semiBold, fontSize: 13, color: G },
});

/* Step 10 */
const s10 = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1.5, borderColor: '#E5E7EB', shadowColor: '#0F172A', shadowOpacity: 0.03, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  cardActive: { borderColor: G, backgroundColor: '#F0FDF4' },
  iconBox: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  label: { fontFamily: FontFamily.semiBold, fontSize: 15, color: '#374151' },
  labelActive: { color: '#111827' },
  time: { fontFamily: FontFamily.regular, fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  check: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#D1D5DB', alignItems: 'center', justifyContent: 'center' },
  checkActive: { backgroundColor: G, borderColor: G },
});

/* Step 11 */
const s11 = StyleSheet.create({
  groupHead: { fontFamily: FontFamily.semiBold, fontSize: 11, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  rowActive: { borderColor: G, backgroundColor: '#F0FDF4' },
  truckIconBox: { width: 34, height: 34, borderRadius: 8, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  truckIconBoxActive: { backgroundColor: G },
  label: { flex: 1, fontFamily: FontFamily.medium, fontSize: 14, color: '#374151' },
  labelActive: { fontFamily: FontFamily.semiBold, color: '#111827' },
  check: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#D1D5DB', alignItems: 'center', justifyContent: 'center' },
  checkActive: { backgroundColor: G, borderColor: G },
});

/* Step 12 */
const s12 = StyleSheet.create({
  toggle: { flexDirection: 'row', backgroundColor: '#F3F4F6', borderRadius: 12, padding: 4 },
  toggleBtn: { flex: 1, paddingVertical: 11, alignItems: 'center', borderRadius: 10 },
  toggleBtnActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 2 },
  toggleText: { fontFamily: FontFamily.medium, fontSize: 14, color: '#9CA3AF' },
  toggleTextActive: { fontFamily: FontFamily.semiBold, color: '#111827' },
  refIconBox: { width: 28, height: 28, borderRadius: 7, backgroundColor: '#DCFCE7', alignItems: 'center', justifyContent: 'center' },
  refRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  refLabel: { fontFamily: FontFamily.regular, fontSize: 13, color: '#6B7280' },
  refVal: { fontFamily: FontFamily.bold, fontSize: 14, color: '#111827' },
  tableHead: { backgroundColor: '#F9FAFB', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  tableHeadTxt: { fontFamily: FontFamily.semiBold, fontSize: 12, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.4 },
  rateRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 13 },
  rateRowBorder: { borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  rateLabel: { fontFamily: FontFamily.regular, fontSize: 13, color: '#374151' },
  rateVal: { fontFamily: FontFamily.semiBold, fontSize: 13, color: '#111827' },
  freeIconBox: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#DCFCE7', alignItems: 'center', justifyContent: 'center' },
  freeTxt: { fontFamily: FontFamily.semiBold, fontSize: 14, color: GD },
  freeSub: { fontFamily: FontFamily.regular, fontSize: 13, color: '#6B7280', marginTop: 3, lineHeight: 19 },
});

/* Step 13 */
const s13 = StyleSheet.create({
  kmBadge: { backgroundColor: G, borderRadius: 99, paddingHorizontal: 12, paddingVertical: 5 },
  kmText: { fontFamily: FontFamily.bold, fontSize: 16, color: '#fff' },
  track: { height: 6, backgroundColor: '#E5E7EB', borderRadius: 3 },
  fill: { height: 6, backgroundColor: G, borderRadius: 3 },
  thumb: { position: 'absolute', top: -9, width: 24, height: 24, borderRadius: 12, backgroundColor: '#fff', borderWidth: 3, borderColor: G },
  adjBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center', borderWidth: 1.5, borderColor: '#E5E7EB', backgroundColor: '#fff' },
  adjText: { fontFamily: FontFamily.semiBold, fontSize: 13, color: '#374151' },
  coverChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F0FDF4', borderRadius: 8, borderWidth: 1, borderColor: '#BBF7D0', paddingHorizontal: 10, paddingVertical: 8, marginTop: 4 },
  coverText: { flex: 1, fontFamily: FontFamily.medium, fontSize: 12, color: GD },
});

/* Step 14 */
const s14 = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  rowLabel: { fontFamily: FontFamily.regular, fontSize: 12, color: '#9CA3AF' },
  rowValue: { fontFamily: FontFamily.semiBold, fontSize: 14, color: '#111827', marginTop: 2 },
  editBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1.5, borderColor: G },
  editTxt: { fontFamily: FontFamily.semiBold, fontSize: 12, color: G },
  disclaimer: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 12, backgroundColor: '#F9FAFB', borderRadius: 10 },
  disclaimerTxt: { flex: 1, fontFamily: FontFamily.regular, fontSize: 12, color: '#6B7280', lineHeight: 18 },
});

/* Step 15 */
const s15 = StyleSheet.create({
  outerCircle: { width: 140, height: 140, borderRadius: 70, backgroundColor: '#DCFCE7', alignItems: 'center', justifyContent: 'center' },
  innerCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#BBF7D0', alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: FontFamily.bold, fontSize: 24, color: '#111827', textAlign: 'center', letterSpacing: -0.3 },
  sub:   { fontFamily: FontFamily.regular, fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 22, paddingHorizontal: 8 },
  nextRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  stepNum: { width: 26, height: 26, borderRadius: 13, backgroundColor: G, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  stepNumTxt: { fontFamily: FontFamily.bold, fontSize: 12, color: '#fff' },
  nextTxt: { flex: 1, fontFamily: FontFamily.regular, fontSize: 13, color: '#374151', lineHeight: 20, paddingTop: 3 },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#DCFCE7', borderRadius: 99, paddingHorizontal: 16, paddingVertical: 8, borderWidth: 1, borderColor: '#BBF7D0' },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: G },
  statusTxt: { fontFamily: FontFamily.semiBold, fontSize: 13, color: GD },
});

/* Unit picker modal */
const pick = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', paddingHorizontal: 40 },
  sheet: { backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden' },
  sheetTitle: { fontFamily: FontFamily.semiBold, fontSize: 14, color: '#111827', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  option: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  optionSelected: { backgroundColor: '#F0FDF4' },
  optionText: { fontFamily: FontFamily.regular, fontSize: 15, color: '#374151' },
  optionTextSelected: { fontFamily: FontFamily.semiBold, color: G },
});
