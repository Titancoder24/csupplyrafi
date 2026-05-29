import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, Image,
  Platform, ScrollView, useWindowDimensions, StatusBar, Animated, Easing,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
// All decorative icons removed from the join page — text-driven only.
import { supabase } from '@/services/supabase';
import { FontFamily } from '@/constants/theme';

/* ─── Palette ─────────────────────────────────────────────────────────────── */
const NAVY      = '#071120';
const NAVY_2    = '#0B1A2E';
const NAVY_LINE = '#1E2D45';
const STEEL     = '#475569';
const STEEL_LT  = '#94A3B8';
const STEEL_300 = '#CBD5E1';
const PAGE_BG   = '#F8FAFC';
const WHITE     = '#FFFFFF';
const BORDER    = '#E2E8F0';
const INK_900   = '#0F172A';
const INK_700   = '#334155';
const INK_500   = '#64748B';
const ACCENT      = '#F4B400';
const ACCENT_DARK = '#B07D00';
const ACCENT_GLOW = 'rgba(244,180,0,0.18)';

const TOP = Platform.OS === 'ios' ? 0 : Platform.OS === 'web' ? 0 : 28;
const IS_WEB = Platform.OS === 'web';

/* ─── Types ───────────────────────────────────────────────────────────────── */
type Role = {
  key: string;
  label: string;
  tagline: string;
  description: string;
  bullets: string[];
  route: string;
  popular?: boolean;
};

const ROLES: Role[] = [
  {
    key: 'customer',
    label: 'Customer',
    tagline: 'For builders & contractors',
    description: 'Source materials from verified vendors, compare prices and get doorstep delivery.',
    bullets: ['500+ products', 'Live order tracking', 'GST invoicing & billing', 'Multiple payment options'],
    route: '/customer/welcome',
    popular: true,
  },
  {
    key: 'vendor',
    label: 'Vendor',
    tagline: 'For dealers & manufacturers',
    description: 'List your inventory, accept large orders and grow revenue with verified buyers.',
    bullets: ['Unlimited SKUs', 'Verified badge', 'Secure payments', 'Settlement in 2 days'],
    route: '/vendor/welcome',
  },
  {
    key: 'transporter',
    label: 'Transporter',
    tagline: 'For fleet owners & drivers',
    description: 'Choose the trips you want, get GPS-routed jobs and receive instant payouts.',
    bullets: ['Choose your trips', 'Instant payouts', 'GPS-tracked routes', 'Trip history & analytics'],
    route: '/transporter/welcome',
  },
];

/* ─── Blueprint grid overlay ──────────────────────────────────────────────── */
function BlueprintGrid() {
  const cols = 12;
  const rows = 5;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {Array.from({ length: cols }).map((_, i) => (
        <View
          key={`v-${i}`}
          style={{
            position: 'absolute',
            top: 0, bottom: 0,
            left: `${((i + 1) / (cols + 1)) * 100}%`,
            width: 1,
            backgroundColor: 'rgba(148,163,184,0.06)',
          }}
        />
      ))}
      {Array.from({ length: rows }).map((_, i) => (
        <View
          key={`h-${i}`}
          style={{
            position: 'absolute',
            left: 0, right: 0,
            top: `${((i + 1) / (rows + 1)) * 100}%`,
            height: 1,
            backgroundColor: 'rgba(148,163,184,0.06)',
          }}
        />
      ))}
    </View>
  );
}

/* ─── Animated stat card (text-only, no decorative icon) ─────────────────── */
function StatCard({
  value, label, delay,
}: {
  value: string; label: string; delay: number;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(14)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1, duration: 520, delay, useNativeDriver: true, easing: Easing.out(Easing.cubic),
      }),
      Animated.timing(translateY, {
        toValue: 0, duration: 520, delay, useNativeDriver: true, easing: Easing.out(Easing.cubic),
      }),
    ]).start();
  }, [delay, opacity, translateY]);

  return (
    <Animated.View style={[stat.card, { opacity, transform: [{ translateY }] }]}>
      <Text style={stat.value}>{value}</Text>
      <Text style={stat.label}>{label}</Text>
    </Animated.View>
  );
}

const stat = StyleSheet.create({
  card: {
    flex: 1, minWidth: 160,
    backgroundColor: 'rgba(255,255,255,0.025)',
    borderWidth: 1, borderColor: NAVY_LINE,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, gap: 2,
  },
  value: { fontFamily: FontFamily.bold, fontSize: 16, color: WHITE, letterSpacing: -0.4, lineHeight: 19 },
  label: { fontFamily: FontFamily.regular, fontSize: 10.5, color: STEEL_LT, letterSpacing: 0.2 },
});

/* ─── Trust badge (text-only chip) ────────────────────────────────────────── */
function TrustBadge({ label }: { label: string }) {
  return (
    <View style={tb.wrap}>
      <Text style={tb.txt}>{label}</Text>
    </View>
  );
}
const tb = StyleSheet.create({
  wrap: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderWidth: 1, borderColor: NAVY_LINE,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 99, paddingHorizontal: 9, paddingVertical: 3.5,
  },
  txt: { fontFamily: FontFamily.medium, fontSize: 10.5, color: STEEL_300, letterSpacing: 0.2 },
});

/* ─── Role card ───────────────────────────────────────────────────────────── */
function RoleCard({
  role, wide, onSelect,
}: {
  role: Role; wide: boolean; onSelect: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);
  const active = hovered || pressed;

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
        role.popular && rc.cardPopular,
        active && rc.cardActive,
        active && { transform: [{ translateY: -6 }] },
      ]}
    >
      <LinearGradient
        colors={
          role.popular
            ? ['#FFFEF7', '#FEF9C3']
            : active
              ? ['#FFFFFF', '#F8FAFC']
              : ['#FFFFFF', '#FFFFFF']
        }
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {role.popular && (
        <View style={rc.popularBadge}>
          <Text style={rc.popularTxt}>MOST POPULAR</Text>
        </View>
      )}

      <Text style={rc.label}>{role.label}</Text>
      <Text style={rc.tagline}>{role.tagline}</Text>
      <Text style={rc.desc}>{role.description}</Text>

      <View style={rc.divider} />

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
      </View>
    </Pressable>
  );
}

const rc = StyleSheet.create({
  card: {
    position: 'relative',
    backgroundColor: WHITE,
    borderWidth: 1, borderColor: BORDER,
    borderRadius: 12, padding: 16, gap: 4,
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
    ...(IS_WEB ? { transition: 'transform 220ms cubic-bezier(.2,.7,.2,1), border-color 180ms ease, box-shadow 220ms ease' as any } : null),
  },
  cardPopular: {
    borderColor: 'rgba(244,180,0,0.55)',
    shadowColor: ACCENT,
    shadowOpacity: 0.10,
    shadowRadius: 14,
  },
  cardActive: {
    borderColor: ACCENT,
    shadowColor: ACCENT,
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  popularBadge: {
    position: 'absolute', top: 11, right: 11,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: ACCENT, borderRadius: 5,
    paddingHorizontal: 7, paddingVertical: 3,
  },
  popularTxt: { fontFamily: FontFamily.bold, fontSize: 8.5, color: NAVY, letterSpacing: 0.8 },

  label:   { fontFamily: FontFamily.bold, fontSize: 17, color: INK_900, letterSpacing: -0.4 },
  tagline: { fontFamily: FontFamily.semiBold, fontSize: 10.5, color: ACCENT_DARK, letterSpacing: 0.4, textTransform: 'uppercase' as const, marginTop: 2 },
  desc:    { fontFamily: FontFamily.regular, fontSize: 12.5, color: INK_700, lineHeight: 18, marginTop: 4 },

  divider: { height: 1, backgroundColor: BORDER, marginVertical: 10 },

  bullets:   { gap: 6 },
  bulletRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bulletDot: {
    width: 4, height: 4, borderRadius: 2,
    backgroundColor: ACCENT,
  },
  bulletTxt: { fontFamily: FontFamily.medium, fontSize: 12, color: INK_700 },

  ctaRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1, borderTopColor: 'rgba(15,23,42,0.06)',
  },
  ctaTxt: { fontFamily: FontFamily.semiBold, fontSize: 12.5, color: INK_900, letterSpacing: -0.15 },
});

/* ─── Screen ──────────────────────────────────────────────────────────────── */
export default function JoinScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWide = width >= 980;

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

  const padH = isWide ? 64 : 20;

  const vendorCount = counts.vendors ? `${counts.vendors.toLocaleString('en-IN')}+` : '2,400+';
  const orderCount  = counts.orders  ? `${counts.orders.toLocaleString('en-IN')}+`  : '48,000+';

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={NAVY} />

      <ScrollView
        contentContainerStyle={{ paddingTop: TOP }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Top announcement strip ─────────────────────── */}
        <View style={s.topStrip}>
          <View style={[s.contentBound, s.topStripRow, { paddingHorizontal: padH }]}>
            <View style={s.topLeft}>
              <Text style={s.topStripTxt}>India's #1 ConstructionTech Network</Text>
            </View>
            <View style={s.topRight}>
              <View style={s.livePulse} />
              <Text style={s.topStripTxt}>Live across 28 states</Text>
            </View>
          </View>
        </View>

        {/* ── Navbar ──────────────────────────────────────── */}
        <View style={s.navbar}>
          <View style={s.navbarLogoBox}>
            <Image source={require('../assets/Logo_Ui.png')} style={s.navbarLogo} resizeMode="contain" />
          </View>
        </View>

        {/* ── HERO ────────────────────────────────────────── */}
        <View style={s.heroSection}>
          {/* Background image — construction scene, low opacity */}
          <Image
            source={require('../assets/construction-bg.jpg')}
            style={s.heroBgImage}
            resizeMode="cover"
          />
          {/* Dark navy gradient overlay */}
          <LinearGradient
            colors={['rgba(7,17,32,0.92)', 'rgba(7,17,32,0.86)', 'rgba(7,17,32,0.98)']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          {/* Yellow soft glow top-right */}
          <View style={s.glowWrap} pointerEvents="none">
            <LinearGradient
              colors={[ACCENT_GLOW, 'transparent']}
              start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }}
              style={s.glow}
            />
          </View>
          {/* Blueprint grid */}
          <BlueprintGrid />

          <View style={[s.contentBound, { paddingHorizontal: padH, position: 'relative' }]}>
            <View style={s.hero}>
              <View style={s.eyebrow}>
                <Text style={s.eyebrowTxt}>GET STARTED · 2 MIN ONBOARDING</Text>
              </View>

              <Text style={[s.heroTitle, isWide && { fontSize: 44, lineHeight: 50 }]}>
                India's Smart{'\n'}
                <Text style={s.heroTitleAccent}>Construction Supply</Text> Network
              </Text>

              <Text style={s.heroSub}>
                One platform connecting verified vendors, contractors, and fleet operators —
                with real-time logistics, GST-grade billing, and same-day settlements built in.
              </Text>

              {/* Trust badges */}
              <View style={s.trustRow}>
                <TrustBadge label="GST verified vendors" />
                <TrustBadge label="ISO 27001 secure" />
                <TrustBadge label="2-day settlements" />
              </View>

              {/* Floating stats */}
              <View style={[s.statsRow, isWide ? { flexDirection: 'row' } : { flexDirection: 'column' }]}>
                <StatCard value={vendorCount} label="Verified vendors"       delay={120} />
                <StatCard value={orderCount}  label="Orders delivered"       delay={220} />
                <StatCard value="₹240Cr+"     label="GMV transacted in 2025" delay={320} />
              </View>
            </View>
          </View>
        </View>

        {/* ── Role selection section ─────────────────────── */}
        <View style={s.rolesSection}>
          <LinearGradient
            colors={[PAGE_BG, WHITE]}
            start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
            style={StyleSheet.absoluteFill}
          />

          <View style={[s.contentBound, { paddingHorizontal: padH }]}>
            <View style={s.rolesHead}>
              <Text style={s.rolesHeadEyebrow}>STEP 1 OF 2</Text>
              <Text style={s.rolesHeadTitle}>Choose your role to continue</Text>
              <Text style={s.rolesHeadSub}>
                Each workspace is purpose-built for the job. Pick the one that matches you —
                you can always switch later from settings.
              </Text>
            </View>

            <View style={[s.cardsWrap, isWide && { flexDirection: 'row', gap: 18 }]}>
              {ROLES.map(r => (
                <RoleCard
                  key={r.key}
                  role={r}
                  wide={isWide}
                  onSelect={() => router.push(r.route as never)}
                />
              ))}
            </View>
          </View>
        </View>

        {/* ── Why C-Supply (dark section) ────────────────── */}
        <View style={s.darkSection}>
          <LinearGradient
            colors={[NAVY_2, NAVY]}
            start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <BlueprintGrid />

          <View style={[s.contentBound, { paddingHorizontal: padH, position: 'relative' }]}>
            <View style={s.whyHead}>
              <View>
                <Text style={s.whyEyebrow}>WHY C-SUPPLY</Text>
                <Text style={s.whyTitle}>Built for India's construction stack</Text>
              </View>
              <Pressable style={s.exploreBtn}>
                <Text style={s.exploreBtnTxt}>Explore all features</Text>
              </Pressable>
            </View>

            <View style={[s.whyGrid, isWide && { flexDirection: 'row' }]}>
              {[
                { title: 'Verified network',    sub: 'KYC-verified vendors, transporters and customers. No middlemen, no surprises.' },
                { title: 'Instant fulfilment',  sub: 'Real-time order tracking, transporter assignment and live chat from pickup to drop.' },
                { title: 'Pan-India coverage',  sub: 'Active across 28 states with route-optimised logistics and local pricing.' },
                { title: '24/7 support',        sub: 'Dedicated help desk for orders, payments and dispute resolution.' },
              ].map(item => (
                <View key={item.title} style={[s.whyCard, isWide && { flex: 1 }]}>
                  <Text style={s.whyCardTitle}>{item.title}</Text>
                  <Text style={s.whyCardSub}>{item.sub}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* ── Footer ─────────────────────────────────────── */}
        <View style={s.footer}>
          <View style={[s.contentBound, s.footerRow, { paddingHorizontal: padH }]}>
            <Text style={s.footerTxt}>© 2026 C-Supply. All rights reserved.</Text>
            <View style={s.footerLinks}>
              <Pressable><Text style={s.footerLink}>Privacy Policy</Text></Pressable>
              <Pressable><Text style={s.footerLink}>Terms of Service</Text></Pressable>
              <Pressable><Text style={s.footerLink}>Contact Us</Text></Pressable>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

/* ─── Styles ─────────────────────────────────────────────────────────────── */
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: NAVY },

  contentBound: { width: '100%', maxWidth: 1280, alignSelf: 'center' },

  /* Top strip */
  topStrip: { backgroundColor: NAVY, borderBottomWidth: 1, borderBottomColor: NAVY_LINE },
  topStripRow: {
    height: 34, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  topLeft:     { flexDirection: 'row', alignItems: 'center', gap: 7 },
  topRight:    { flexDirection: 'row', alignItems: 'center', gap: 7 },
  topStripTxt: { fontFamily: FontFamily.medium, fontSize: 11, color: STEEL_LT, letterSpacing: 0.2 },
  livePulse: {
    width: 6, height: 6, borderRadius: 3, backgroundColor: '#22C55E',
    shadowColor: '#22C55E', shadowOpacity: 0.9, shadowRadius: 5,
  },

  /* Navbar — navy, with the logo in a white card so it stays brand-visible */
  navbar: {
    height: 180, backgroundColor: NAVY,
    borderBottomWidth: 1, borderBottomColor: NAVY_LINE,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
  },
  navbarLogoBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 36, paddingVertical: 20,
    shadowColor: '#000', shadowOpacity: 0.22, shadowRadius: 22,
    shadowOffset: { width: 0, height: 8 },
    borderWidth: 1, borderColor: NAVY_LINE,
  },
  navbarLogo: { width: 560, height: 112 },

  /* Hero */
  heroSection: {
    backgroundColor: NAVY,
    position: 'relative', overflow: 'hidden',
    paddingTop: 36, paddingBottom: 48,
  },
  heroBgImage: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.32 },
  glowWrap: { position: 'absolute', top: -120, right: -120, width: 520, height: 520 },
  glow:     { width: '100%', height: '100%', borderRadius: 260 },

  hero: { gap: 14, maxWidth: 880 },
  eyebrow: {
    alignSelf: 'flex-start',
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, borderColor: 'rgba(244,180,0,0.22)',
    backgroundColor: 'rgba(244,180,0,0.06)',
    borderRadius: 99, paddingHorizontal: 10, paddingVertical: 4,
  },
  eyebrowTxt: { fontFamily: FontFamily.semiBold, fontSize: 10, color: ACCENT, letterSpacing: 1.4 },

  heroTitle: {
    fontFamily: FontFamily.bold, fontSize: 30, color: WHITE,
    letterSpacing: -0.9, lineHeight: 36,
  },
  heroTitleAccent: { color: ACCENT },
  heroSub: {
    fontFamily: FontFamily.regular, fontSize: 13.5, color: STEEL_300,
    lineHeight: 20, maxWidth: 600,
  },

  trustRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 2,
  },

  statsRow: { gap: 10, marginTop: 12 },

  /* Roles */
  rolesSection: { position: 'relative', paddingTop: 40, paddingBottom: 48 },
  rolesHead:    { gap: 6, marginBottom: 24, maxWidth: 720 },
  rolesHeadEyebrow: { fontFamily: FontFamily.semiBold, fontSize: 10, color: ACCENT_DARK, letterSpacing: 1.4 },
  rolesHeadTitle: {
    fontFamily: FontFamily.bold, fontSize: 24, color: INK_900,
    letterSpacing: -0.6, lineHeight: 30,
  },
  rolesHeadSub: {
    fontFamily: FontFamily.regular, fontSize: 13, color: INK_500,
    lineHeight: 19, maxWidth: 560,
  },
  cardsWrap: { gap: 12 },

  /* Dark section */
  darkSection: {
    position: 'relative', overflow: 'hidden',
    paddingTop: 36, paddingBottom: 36,
  },
  whyHead: {
    flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between',
    marginBottom: 20, gap: 12, flexWrap: 'wrap',
  },
  whyEyebrow: { fontFamily: FontFamily.semiBold, fontSize: 10, color: ACCENT, letterSpacing: 1.4, marginBottom: 4 },
  whyTitle:   { fontFamily: FontFamily.bold, fontSize: 22, color: WHITE, letterSpacing: -0.5, lineHeight: 28, maxWidth: 600 },
  exploreBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, borderColor: 'rgba(244,180,0,0.22)',
    backgroundColor: 'rgba(244,180,0,0.04)',
    borderRadius: 7, paddingHorizontal: 11, paddingVertical: 7,
  },
  exploreBtnTxt: { fontFamily: FontFamily.semiBold, fontSize: 11.5, color: ACCENT, letterSpacing: 0.1 },

  whyGrid: { gap: 10 },
  whyCard: {
    backgroundColor: NAVY_2,
    borderRadius: 10, borderWidth: 1, borderColor: NAVY_LINE,
    padding: 14, gap: 6,
  },
  whyCardTitle: { fontFamily: FontFamily.semiBold, fontSize: 13.5, color: WHITE, letterSpacing: -0.2 },
  whyCardSub:   { fontFamily: FontFamily.regular, fontSize: 11.5, color: STEEL_LT, lineHeight: 16 },

  /* Footer */
  footer: {
    paddingVertical: 22, backgroundColor: NAVY,
    borderTopWidth: 1, borderTopColor: NAVY_LINE,
  },
  footerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    flexWrap: 'wrap', gap: 10,
  },
  footerTxt:   { fontFamily: FontFamily.regular, fontSize: 11, color: STEEL },
  footerLinks: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  footerLink:  { fontFamily: FontFamily.medium, fontSize: 11.5, color: STEEL_LT },
});
