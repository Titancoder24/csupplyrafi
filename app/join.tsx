/**
 * /join — C-Supply role selection.
 * Editorial enterprise aesthetic: Stripe / Linear / Mercury / Vercel.
 * Monochrome system, deep navy + warm white, Inter editorial typography.
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, Image,
  Platform, ScrollView, useWindowDimensions, StatusBar, Animated, Easing,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowRight, ArrowUpRight,
  ShoppingBag, Store, Truck,
  ShieldCheck, Activity, MapPin, LifeBuoy,
  BadgeCheck, Package, TrendingUp, Clock,
} from 'lucide-react-native';
import { supabase } from '@/services/supabase';
import { FontFamily } from '@/constants/theme';

/* ─── Palette — restrained, monochrome ────────────────────────────────────── */
const INK       = '#0A0F1A';   // deep navy / near-black
const INK_2     = '#111827';
const INK_LINE  = '#1F2937';   // dark hairline
const SLATE_400 = '#9CA3AF';
const SLATE_500 = '#6B7280';
const SLATE_300 = '#D1D5DB';
const PAPER     = '#FAFAF7';   // warm white
const SURFACE   = '#FFFFFF';
const BORDER    = '#ECECE8';
const BORDER_2  = '#E5E5E0';
const TEXT      = '#0A0F1A';
const TEXT_MUTE = '#5B6472';

const TOP    = Platform.OS === 'ios' ? 0 : Platform.OS === 'web' ? 0 : 24;
const IS_WEB = Platform.OS === 'web';

/* ─── Types ───────────────────────────────────────────────────────────────── */
type Role = {
  key: string;
  label: string;
  tagline: string;
  description: string;
  bullets: string[];
  Icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  route: string;
};

const ROLES: Role[] = [
  {
    key: 'customer',
    label: 'Customer',
    tagline: 'Builders & contractors',
    description:
      'Source materials from verified vendors, compare prices and coordinate doorstep delivery — in one workspace.',
    bullets: [
      'Verified vendor catalog',
      'Live order tracking',
      'GST invoicing & billing',
      'Multiple payment options',
    ],
    Icon: ShoppingBag,
    route: '/customer/welcome',
  },
  {
    key: 'vendor',
    label: 'Vendor',
    tagline: 'Dealers & manufacturers',
    description:
      'List inventory, fulfil large orders and grow revenue with verified buyers across India.',
    bullets: [
      'Unlimited SKUs',
      'Verified badge',
      'Secure escrow payments',
      'Settlement in 2 days',
    ],
    Icon: Store,
    route: '/vendor/welcome',
  },
  {
    key: 'transporter',
    label: 'Transporter',
    tagline: 'Fleet owners & drivers',
    description:
      'Pick the trips you want, get GPS-routed jobs and receive instant payouts on completion.',
    bullets: [
      'Choose your trips',
      'Instant payouts',
      'GPS-tracked routes',
      'Trip history & analytics',
    ],
    Icon: Truck,
    route: '/transporter/welcome',
  },
];

/* ─── Fade-up wrapper ─────────────────────────────────────────────────────── */
function FadeUp({
  delay = 0, children, style,
}: { delay?: number; children: React.ReactNode; style?: any }) {
  const opacity     = useRef(new Animated.Value(0)).current;
  const translateY  = useRef(new Animated.Value(10)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity,    { toValue: 1, duration: 600, delay, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
      Animated.timing(translateY, { toValue: 0, duration: 600, delay, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
    ]).start();
  }, [delay, opacity, translateY]);
  return (
    <Animated.View style={[{ opacity, transform: [{ translateY }] }, style]}>
      {children}
    </Animated.View>
  );
}

/* ─── Role card — ultra minimal, monochrome ───────────────────────────────── */
function RoleCard({
  role, wide, onSelect,
}: { role: Role; wide: boolean; onSelect: () => void }) {
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);
  const active = hovered || pressed;
  const RoleIcon = role.Icon;

  return (
    <Pressable
      onPress={onSelect}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={[
        rc.card,
        wide && { flex: 1 },
        active && rc.cardActive,
        active && IS_WEB && { transform: [{ translateY: -2 }] as any },
      ]}
    >
      <View style={rc.iconWrap}>
        <RoleIcon size={20} color="#0F172A" strokeWidth={1.5} />
      </View>

      <View style={{ gap: 4 }}>
        <Text style={rc.label}>{role.label}</Text>
        <Text style={rc.tagline}>{role.tagline}</Text>
      </View>

      <Text style={rc.desc}>{role.description}</Text>

      <View style={rc.bullets}>
        {role.bullets.map(b => (
          <View key={b} style={rc.bulletRow}>
            <View style={rc.bulletDot} />
            <Text style={rc.bulletTxt}>{b}</Text>
          </View>
        ))}
      </View>

      <View style={rc.ctaRow}>
        <Text style={rc.ctaTxt}>Continue as {role.label}</Text>
        <ArrowRight size={14} color="#0F172A" strokeWidth={1.75} />
      </View>
    </Pressable>
  );
}

const rc = StyleSheet.create({
  card: {
    position: 'relative',
    backgroundColor: SURFACE,
    borderWidth: 1, borderColor: BORDER,
    borderRadius: 20,
    padding: 28,
    gap: 18,
    overflow: 'hidden',
    ...(IS_WEB ? {
      transition: 'transform 280ms cubic-bezier(.2,.7,.2,1), border-color 200ms ease' as any,
    } : null),
  },
  cardActive: {
    borderColor: '#1F2937',
  },
  iconWrap: {
    width: 40, height: 40, borderRadius: 10,
    borderWidth: 1, borderColor: BORDER_2,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: PAPER,
  },
  label:   { fontFamily: FontFamily.semiBold, fontSize: 18, color: TEXT, letterSpacing: -0.4, lineHeight: 22 },
  tagline: { fontFamily: FontFamily.regular,  fontSize: 13, color: TEXT_MUTE, lineHeight: 18 },

  desc:    { fontFamily: FontFamily.regular,  fontSize: 13.5, color: TEXT_MUTE, lineHeight: 20, marginTop: -4 },

  bullets:   { gap: 10, marginTop: 4 },
  bulletRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bulletDot: {
    width: 3, height: 3, borderRadius: 1.5, backgroundColor: SLATE_400,
  },
  bulletTxt: { fontFamily: FontFamily.regular, fontSize: 13, color: TEXT, letterSpacing: -0.1 },

  ctaRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 8, paddingTop: 18,
    borderTopWidth: 1, borderTopColor: BORDER,
  },
  ctaTxt: { fontFamily: FontFamily.semiBold, fontSize: 13.5, color: TEXT, letterSpacing: -0.15 },
});

/* ─── Screen ──────────────────────────────────────────────────────────────── */
export default function JoinScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWide   = width >= 980;
  const isMedium = width >= 720;

  const [counts, setCounts] = useState<{ vendors: number; orders: number }>({ vendors: 0, orders: 0 });

  useEffect(() => {
    (async () => {
      try {
        const [{ count: vendors }, { count: orders }] = await Promise.all([
          supabase.from('vendor_profiles').select('id', { count: 'exact', head: true }).eq('kyc_status', 'approved'),
          supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'delivered'),
        ]);
        setCounts({ vendors: Math.max(vendors ?? 0, 0), orders: Math.max(orders ?? 0, 0) });
      } catch {}
    })();
  }, []);

  const padH = isWide ? 80 : isMedium ? 48 : 24;

  const vendorCount = counts.vendors ? `${counts.vendors.toLocaleString('en-IN')}+` : '2,400+';
  const orderCount  = counts.orders  ? `${counts.orders.toLocaleString('en-IN')}+`  : '48,000+';

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={INK} />

      <ScrollView
        contentContainerStyle={{ paddingTop: TOP }}
        showsVerticalScrollIndicator={false}
      >
        {/* ════════════════════════════════════════════════════════════════════
            HERO — full immersive cinematic dark
            ════════════════════════════════════════════════════════════════════ */}
        <View style={s.heroSection}>
          {/* Cinematic logistics background */}
          <Image
            source={require('../assets/construction-bg.jpg')}
            style={s.heroBgImage}
            resizeMode="cover"
          />
          {/* Sophisticated dark overlay — vignette + depth */}
          <LinearGradient
            colors={['rgba(10,15,26,0.72)', 'rgba(10,15,26,0.85)', 'rgba(10,15,26,0.96)']}
            locations={[0, 0.55, 1]}
            start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <LinearGradient
            colors={['rgba(10,15,26,0.45)', 'rgba(10,15,26,0)']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />

          {/* ── Top bar — minimal monochrome ── */}
          <View style={[s.contentBound, s.topBar, { paddingHorizontal: padH }]}>
            <View style={s.brandLogoWrap}>
              <Image
                source={require('../assets/Logo_Ui.png')}
                style={s.brandLogo}
                resizeMode="contain"
              />
            </View>
            <View style={s.topBarRight}>
              <View style={s.livePulse} />
              <Text style={s.topBarTxt}>Live across 28 states</Text>
            </View>
          </View>

          {/* ── Editorial hero copy ── */}
          <View style={[s.contentBound, { paddingHorizontal: padH }]}>
            <FadeUp delay={60}>
              <View style={s.eyebrow}>
                <View style={s.eyebrowDot} />
                <Text style={s.eyebrowTxt}>INDIA'S CONSTRUCTION SUPPLY NETWORK</Text>
              </View>
            </FadeUp>

            <FadeUp delay={140}>
              <Text
                style={[
                  s.heroTitle,
                  isWide   && { fontSize: 96, lineHeight: 96, letterSpacing: -4.2 },
                  !isWide && isMedium && { fontSize: 72, lineHeight: 74, letterSpacing: -3 },
                ]}
              >
                Building India,{'\n'}
                <Text style={s.heroTitleItalic}>together.</Text>
              </Text>
            </FadeUp>

            <FadeUp delay={220}>
              <Text style={[s.heroSub, isWide && { fontSize: 18, lineHeight: 28, maxWidth: 560 }]}>
                One platform connecting verified vendors, contractors and fleet operators —
                with real-time logistics, GST-grade billing and same-day settlements built in.
              </Text>
            </FadeUp>

            {/* ── Primary CTA ── */}
            <FadeUp delay={300}>
              <View style={s.heroCtas}>
                <Pressable
                  onPress={() => router.push('/auth/login' as never)}
                  style={({ pressed }) => [s.primaryBtn, pressed && { opacity: 0.94 }]}
                >
                  <Text style={s.primaryBtnTxt}>Get started</Text>
                  <ArrowRight size={16} color="#0F172A" strokeWidth={2} />
                </Pressable>

                <Pressable
                  onPress={() => router.push('/auth/login' as never)}
                  style={({ pressed }) => [s.ghostBtn, pressed && { opacity: 0.7 }]}
                >
                  <Text style={s.ghostBtnTxt}>Sign in</Text>
                </Pressable>
              </View>
            </FadeUp>

            {/* ── Hero metric strip ── */}
            <FadeUp delay={420}>
              <View style={s.metricsAnchor}>
                {/* Soft radial wash — gives the strip a quiet anchor */}
                <View pointerEvents="none" style={s.metricsGlowWrap}>
                  <LinearGradient
                    colors={['rgba(255,255,255,0.06)', 'rgba(255,255,255,0)']}
                    start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }}
                    style={s.metricsGlow}
                  />
                </View>

                {/* Eyebrow / "live" label */}
                <View style={s.metricsTopRow}>
                  <View style={s.metricsEyebrow}>
                    <View style={s.metricsEyebrowDot} />
                    <Text style={s.metricsEyebrowTxt}>NETWORK · LIVE</Text>
                  </View>
                  <Text style={s.metricsAsOf}>As of {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
                </View>

                {/* The strip — 4 cells, hairlines top + bottom, vertical separators */}
                <View style={[s.metricsStrip, isWide && { flexDirection: 'row' }]}>
                  {[
                    { Icon: BadgeCheck, value: vendorCount, label: 'Verified vendors', meta: 'Across 28 states' },
                    { Icon: Package,    value: orderCount,  label: 'Orders delivered', meta: 'Last 12 months' },
                    { Icon: TrendingUp, value: '₹240Cr+',   label: 'GMV transacted',   meta: 'Calendar year 2025' },
                    { Icon: Clock,      value: '99.2%',     label: 'On-time delivery', meta: '30-day rolling avg' },
                  ].map((m, i) => {
                    const Ic = m.Icon;
                    return (
                      <View
                        key={m.label}
                        style={[
                          s.metricCell,
                          isWide && { flex: 1 },
                          isWide && i > 0 && { borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.08)' },
                          !isWide && i > 0 && { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)' },
                        ]}
                      >
                        <View style={s.metricHead}>
                          <Ic size={14} color="#FFFFFF" strokeWidth={1.6} />
                          <Text style={s.metricLabel}>{m.label}</Text>
                        </View>
                        <Text style={s.metricValue}>{m.value}</Text>
                        <Text style={s.metricMeta}>{m.meta}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            </FadeUp>
          </View>
        </View>

        {/* ════════════════════════════════════════════════════════════════════
            ROLE SELECTION — paper, editorial
            ════════════════════════════════════════════════════════════════════ */}
        <View style={s.rolesSection}>
          <View style={[s.contentBound, { paddingHorizontal: padH }]}>
            {/* Asymmetric editorial header */}
            <View style={[s.sectionHead, isWide && { flexDirection: 'row', alignItems: 'flex-end', gap: 80 }]}>
              <View style={{ flex: 1, gap: 18 }}>
                <Text style={s.sectionEyebrow}>01 — CHOOSE YOUR WORKSPACE</Text>
                <Text style={[s.sectionTitle, isWide && { fontSize: 52, lineHeight: 56, letterSpacing: -2 }]}>
                  Pick the role{'\n'}that fits the work.
                </Text>
              </View>
              <Text style={[s.sectionLede, isWide && { maxWidth: 360, fontSize: 16, lineHeight: 26 }]}>
                Each workspace is purpose-built. You can switch roles later from settings —
                we'll port your account, not your inbox.
              </Text>
            </View>

            {/* Cards */}
            <View
              style={[
                s.cardsWrap,
                isWide && { flexDirection: 'row', gap: 20 },
              ]}
            >
              {ROLES.map((r, i) => (
                <FadeUp key={r.key} delay={120 * i} style={isWide ? { flex: 1 } : undefined}>
                  <RoleCard
                    role={r}
                    wide={isWide}
                    onSelect={() => router.push(r.route as never)}
                  />
                </FadeUp>
              ))}
            </View>

            {/* Foot — minimal note */}
            <View style={s.helpRow}>
              <Text style={s.helpTxt}>Not sure which one is right for you?</Text>
              <Pressable onPress={() => router.push('/support' as never)}>
                <View style={s.helpLinkRow}>
                  <Text style={s.helpLink}>Talk to our team</Text>
                  <ArrowUpRight size={13} color="#0F172A" strokeWidth={1.75} />
                </View>
              </Pressable>
            </View>
          </View>
        </View>

        {/* ════════════════════════════════════════════════════════════════════
            FEATURES — editorial, no widget boxes
            ════════════════════════════════════════════════════════════════════ */}
        <View style={s.featuresSection}>
          <View style={[s.contentBound, { paddingHorizontal: padH }]}>
            <View style={[s.sectionHead, isWide && { flexDirection: 'row', alignItems: 'flex-end', gap: 80 }]}>
              <View style={{ flex: 1, gap: 18 }}>
                <Text style={s.sectionEyebrow}>02 — THE SYSTEM</Text>
                <Text style={[s.sectionTitle, isWide && { fontSize: 52, lineHeight: 56, letterSpacing: -2 }]}>
                  An operating layer{'\n'}for India's build stack.
                </Text>
              </View>
              <Text style={[s.sectionLede, isWide && { maxWidth: 360, fontSize: 16, lineHeight: 26 }]}>
                Replacing fragmented WhatsApp groups, paper invoices and unverified middlemen
                with a single, accountable network.
              </Text>
            </View>

            <View style={[s.featureGrid, isWide && { flexDirection: 'row', gap: 0 }]}>
              {[
                {
                  Icon: ShieldCheck,
                  title: 'Verified network',
                  body: 'KYC-verified vendors, transporters and customers. No middlemen, no surprises.',
                },
                {
                  Icon: Activity,
                  title: 'Instant fulfilment',
                  body: 'Real-time tracking, transporter assignment and live chat from pickup to drop.',
                },
                {
                  Icon: MapPin,
                  title: 'Pan-India coverage',
                  body: 'Active across 28 states with route-optimised logistics and local pricing.',
                },
                {
                  Icon: LifeBuoy,
                  title: '24/7 support',
                  body: 'Dedicated help desk for orders, payments and dispute resolution.',
                },
              ].map((f, i) => {
                const Ic = f.Icon;
                return (
                  <View
                    key={f.title}
                    style={[
                      s.featureCell,
                      isWide && { flex: 1, paddingHorizontal: 24 },
                      isWide && i > 0 && { borderLeftWidth: 1, borderLeftColor: BORDER },
                    ]}
                  >
                    <View style={s.featureIconWrap}>
                      <Ic size={18} color="#0F172A" strokeWidth={1.5} />
                    </View>
                    <Text style={s.featureTitle}>{f.title}</Text>
                    <Text style={s.featureBody}>{f.body}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        </View>

        {/* ════════════════════════════════════════════════════════════════════
            CLOSING CTA — dark, editorial
            ════════════════════════════════════════════════════════════════════ */}
        <View style={s.closingSection}>
          <View style={[s.contentBound, { paddingHorizontal: padH }]}>
            <View style={[s.closingRow, isWide && { flexDirection: 'row', alignItems: 'flex-end', gap: 80 }]}>
              <Text style={[s.closingTitle, isWide && { fontSize: 64, lineHeight: 66, letterSpacing: -2.6 }]}>
                Ready when{'\n'}you are.
              </Text>
              <View style={{ flex: 1, gap: 24 }}>
                <Text style={[s.closingBody, isWide && { fontSize: 16, lineHeight: 26 }]}>
                  Two minutes to set up. No credit card. No commitments.
                  Built for teams that move the country, brick by brick.
                </Text>
                <View style={s.closingCtas}>
                  <Pressable
                    onPress={() => router.push('/auth/login' as never)}
                    style={({ pressed }) => [s.primaryBtnLight, pressed && { opacity: 0.94 }]}
                  >
                    <Text style={s.primaryBtnLightTxt}>Create account</Text>
                    <ArrowRight size={16} color="#FFFFFF" strokeWidth={2} />
                  </Pressable>
                  <Pressable
                    onPress={() => router.push('/auth/login' as never)}
                    style={({ pressed }) => [s.ghostBtnLight, pressed && { opacity: 0.7 }]}
                  >
                    <Text style={s.ghostBtnLightTxt}>Sign in</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* ════════════════════════════════════════════════════════════════════
            FOOTER
            ════════════════════════════════════════════════════════════════════ */}
        <View style={s.footer}>
          <View style={[s.contentBound, s.footerRow, { paddingHorizontal: padH }]}>
            <View style={s.footerLeft}>
              <View style={s.footerLogoWrap}>
                <Image
                  source={require('../assets/Logo_Ui.png')}
                  style={s.footerLogo}
                  resizeMode="contain"
                />
              </View>
              <Text style={s.footerTxt}>© 2026 C-Supply Technologies Pvt. Ltd.</Text>
            </View>
            <View style={s.footerLinks}>
              <Pressable><Text style={s.footerLink}>Privacy</Text></Pressable>
              <Pressable><Text style={s.footerLink}>Terms</Text></Pressable>
              <Pressable><Text style={s.footerLink}>Contact</Text></Pressable>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

/* ─── Styles ──────────────────────────────────────────────────────────────── */
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: PAPER },

  contentBound: { width: '100%', maxWidth: 1240, alignSelf: 'center' },

  /* ── HERO ────────────────────────────────────────────────────────────── */
  heroSection: {
    backgroundColor: INK,
    position: 'relative', overflow: 'hidden',
    paddingTop: 24,
    paddingBottom: 96,
    minHeight: 720,
  },
  heroBgImage: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    opacity: 0.38,
  },

  topBar: {
    height: 64,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 64,
  },
  brandLogoWrap: {
    width: 150,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  brandLogo: {
    width: '100%',
    height: '100%',
  },
  topBarRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  topBarTxt:   { fontFamily: FontFamily.medium, fontSize: 12, color: SLATE_300, letterSpacing: 0.1 },
  livePulse: {
    width: 6, height: 6, borderRadius: 3, backgroundColor: '#34D399',
  },

  eyebrow: {
    alignSelf: 'flex-start',
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 0, paddingVertical: 0,
    marginBottom: 28,
  },
  eyebrowDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: SLATE_400 },
  eyebrowTxt: {
    fontFamily: FontFamily.medium, fontSize: 11.5, color: SLATE_400,
    letterSpacing: 1.6,
  },

  heroTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 52, lineHeight: 56,
    color: '#FFFFFF',
    letterSpacing: -2,
  },
  heroTitleItalic: {
    fontFamily: FontFamily.bold,
    color: SLATE_300,
    fontStyle: 'italic',
  },
  heroSub: {
    fontFamily: FontFamily.regular,
    fontSize: 15, lineHeight: 24,
    color: SLATE_300,
    maxWidth: 480,
    marginTop: 28,
  },

  heroCtas: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    marginTop: 40,
    flexWrap: 'wrap',
  },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 22, paddingVertical: 14,
    borderRadius: 999,
  },
  primaryBtnTxt: {
    fontFamily: FontFamily.semiBold, fontSize: 14, color: INK,
    letterSpacing: -0.2,
  },
  ghostBtn: {
    paddingHorizontal: 18, paddingVertical: 14,
  },
  ghostBtnTxt: {
    fontFamily: FontFamily.medium, fontSize: 14, color: '#FFFFFF',
    letterSpacing: -0.1,
  },

  /* Metrics — anchored, hairline strip with soft wash */
  metricsAnchor: {
    position: 'relative',
    marginTop: 96,
    paddingTop: 22,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)',
  },
  metricsGlowWrap: {
    position: 'absolute',
    top: -40, left: '15%', right: '15%',
    height: 220,
    overflow: 'hidden',
    pointerEvents: 'none',
  },
  metricsGlow: {
    flex: 1,
    borderRadius: 200,
  },
  metricsTopRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 28,
    flexWrap: 'wrap', gap: 12,
  },
  metricsEyebrow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  metricsEyebrowDot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: '#34D399',
  },
  metricsEyebrowTxt: {
    fontFamily: FontFamily.medium, fontSize: 11, color: SLATE_400,
    letterSpacing: 1.8,
  },
  metricsAsOf: {
    fontFamily: FontFamily.regular, fontSize: 11.5, color: SLATE_500,
    letterSpacing: 0.1,
  },
  metricsStrip: {
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.10)',
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.10)',
  },
  metricCell: {
    paddingVertical: 28,
    paddingHorizontal: 4,
    gap: 14,
  },
  metricHead: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  metricLabel: {
    fontFamily: FontFamily.medium, fontSize: 11.5, color: SLATE_400,
    letterSpacing: 1.2, textTransform: 'uppercase',
  },
  metricValue: {
    fontFamily: FontFamily.bold, fontSize: 44, color: '#FFFFFF',
    letterSpacing: -2, lineHeight: 46,
  },
  metricMeta: {
    fontFamily: FontFamily.regular, fontSize: 12.5, color: SLATE_500,
    letterSpacing: 0.1, lineHeight: 18,
  },

  /* ── ROLES ───────────────────────────────────────────────────────────── */
  rolesSection: {
    backgroundColor: PAPER,
    paddingTop: 128,
    paddingBottom: 128,
  },

  sectionHead: {
    marginBottom: 64,
    gap: 24,
  },
  sectionEyebrow: {
    fontFamily: FontFamily.medium, fontSize: 11.5,
    color: SLATE_500, letterSpacing: 1.6,
  },
  sectionTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 36, lineHeight: 40,
    color: TEXT, letterSpacing: -1.2,
  },
  sectionLede: {
    fontFamily: FontFamily.regular,
    fontSize: 14, lineHeight: 22,
    color: TEXT_MUTE,
    maxWidth: 520,
  },

  cardsWrap: { gap: 16 },

  helpRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10,
    marginTop: 56,
    flexWrap: 'wrap',
  },
  helpTxt: { fontFamily: FontFamily.regular, fontSize: 13.5, color: TEXT_MUTE },
  helpLinkRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  helpLink:    { fontFamily: FontFamily.semiBold, fontSize: 13.5, color: TEXT, letterSpacing: -0.1 },

  /* ── FEATURES ────────────────────────────────────────────────────────── */
  featuresSection: {
    backgroundColor: SURFACE,
    paddingTop: 128,
    paddingBottom: 128,
    borderTopWidth: 1, borderTopColor: BORDER,
  },

  featureGrid: { gap: 48 },
  featureCell: {
    gap: 14,
    paddingVertical: 8,
  },
  featureIconWrap: {
    width: 36, height: 36, borderRadius: 9,
    borderWidth: 1, borderColor: BORDER_2,
    backgroundColor: PAPER,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 6,
  },
  featureTitle: {
    fontFamily: FontFamily.semiBold, fontSize: 16, color: TEXT,
    letterSpacing: -0.3, lineHeight: 22,
  },
  featureBody: {
    fontFamily: FontFamily.regular, fontSize: 13.5, color: TEXT_MUTE,
    lineHeight: 21,
    maxWidth: 280,
  },

  /* ── CLOSING ─────────────────────────────────────────────────────────── */
  closingSection: {
    backgroundColor: INK,
    paddingTop: 128,
    paddingBottom: 128,
  },
  closingRow: { gap: 40 },
  closingTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 44, lineHeight: 48,
    color: '#FFFFFF',
    letterSpacing: -1.6,
    flex: 1,
  },
  closingBody: {
    fontFamily: FontFamily.regular,
    fontSize: 14, lineHeight: 22,
    color: SLATE_300,
  },
  closingCtas: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    flexWrap: 'wrap',
  },
  primaryBtnLight: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)',
    paddingHorizontal: 22, paddingVertical: 14,
    borderRadius: 999,
  },
  primaryBtnLightTxt: {
    fontFamily: FontFamily.semiBold, fontSize: 14, color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  ghostBtnLight: {
    paddingHorizontal: 18, paddingVertical: 14,
  },
  ghostBtnLightTxt: {
    fontFamily: FontFamily.medium, fontSize: 14, color: SLATE_300,
    letterSpacing: -0.1,
  },

  /* ── FOOTER ──────────────────────────────────────────────────────────── */
  footer: {
    backgroundColor: INK,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)',
    paddingVertical: 28,
  },
  footerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    flexWrap: 'wrap', gap: 16,
  },
  footerLeft: { flexDirection: 'row', alignItems: 'center', gap: 16, flexWrap: 'wrap' },
  footerLogoWrap: {
    width: 110,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  footerLogo: {
    width: '100%',
    height: '100%',
  },
  footerTxt:  { fontFamily: FontFamily.regular, fontSize: 12, color: SLATE_500 },
  footerLinks: { flexDirection: 'row', alignItems: 'center', gap: 24 },
  footerLink:  { fontFamily: FontFamily.medium, fontSize: 12.5, color: SLATE_400, letterSpacing: -0.1 },
});
