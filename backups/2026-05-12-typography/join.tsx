import React, { useEffect, useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, Image,
  Platform, ScrollView, useWindowDimensions, StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
  User2, Store, Truck, ArrowRight,
  ShieldCheck, Zap, Headphones, MapPin,
} from 'lucide-react-native';
import { supabase } from '@/services/supabase';

/* ─── Tokens (dark theme over bg.png) ──────────────────────────────────────── */
const BG          = '#060D18';
const SURFACE     = '#0D1624';   // solid dark — no transparency
const SURFACE_DEEP= '#081020';
const BORDER      = '#1A2840';
const BORDER_2    = '#28406A';
const INK_900     = '#F1F5F9';
const INK_700     = '#CBD5E1';
const INK_500     = '#94A3B8';
const INK_400     = '#64748B';
const PRIMARY     = '#3B82F6';
const PRIMARY_DK  = '#1D4ED8';
const PRIMARY_LT  = '#1A2E4E';
const ACCENT      = '#F97316';
const SUCCESS     = '#22C55E';
const SUCCESS_BG  = '#0D2E14';

const R = {
  reg:  'Roboto_400Regular',
  med:  'Roboto_500Medium',
  bold: 'Roboto_700Bold',
};

const TOP = Platform.OS === 'ios' ? 56 : Platform.OS === 'web' ? 24 : 28;

type Role = {
  key: string;
  label: string;
  tagline: string;
  description: string;
  bullets: string[];
  Icon: any;
  iconBg: string;
  iconFg: string;
  route: string;
};

const ROLES: Role[] = [
  {
    key: 'customer',
    label: 'Customer',
    tagline: 'For builders & contractors',
    description: 'Source materials from verified vendors, compare prices and get doorstep delivery.',
    bullets: ['500+ products', 'Live order tracking', 'GST invoicing'],
    Icon: User2, iconBg: '#EFF6FF', iconFg: '#1D4ED8',
    route: '/customer/welcome',
  },
  {
    key: 'vendor',
    label: 'Vendor',
    tagline: 'For dealers & manufacturers',
    description: 'List your inventory, accept large orders and grow revenue with verified buyers.',
    bullets: ['Unlimited SKUs', 'Verified badge', 'Settlement in 2 days'],
    Icon: Store, iconBg: '#F0FDF4', iconFg: '#15803D',
    route: '/vendor/welcome',
  },
  {
    key: 'transporter',
    label: 'Transporter',
    tagline: 'For fleet owners & drivers',
    description: 'Choose the trips you want, get GPS-routed jobs and receive instant payouts.',
    bullets: ['Choose your trips', 'Instant payouts', 'GPS-tracked routes'],
    Icon: Truck, iconBg: '#FFF7ED', iconFg: '#C2410C',
    route: '/transporter/welcome',
  },
];

/* ─── Screen ──────────────────────────────────────────────────────────────── */
export default function JoinScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWide = width >= 900;

  const [counts, setCounts] = useState<{ vendors: number; orders: number; cities: number }>({
    vendors: 0, orders: 0, cities: 28,
  });

  useEffect(() => {
    (async () => {
      const [{ count: vendors }, { count: orders }] = await Promise.all([
        supabase.from('vendor_profiles').select('id', { count: 'exact', head: true }).eq('kyc_status', 'approved'),
        supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'delivered'),
      ]);
      setCounts({
        vendors: Math.max(vendors ?? 0, 0),
        orders:  Math.max(orders ?? 0, 0),
        cities:  28,
      });
    })();
  }, []);

  function fmtCount(n: number, fallback: string) {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M+`;
    if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K+`;
    if (n > 0)          return String(n);
    return fallback;
  }

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={BG} />

      {/* Background image */}
      <Image
        source={require('../assets/bg.png')}
        style={s.bgImage}
        resizeMode="cover"
      />
      {/* Dark gradient overlay — same as auth/login */}
      <LinearGradient
        colors={['rgba(8,24,58,0.55)', 'rgba(8,24,58,0.75)', 'rgba(8,24,58,0.96)']}
        locations={[0, 0.4, 1]}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView
        contentContainerStyle={{ paddingTop: TOP, paddingBottom: 64 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Top bar ── */}
        <View style={s.topbar}>
          <View style={s.brand}>
            <Text style={s.brandTag}>Construction Materials · Made Easy</Text>
            <Image source={require('../assets/Logo_Ui.png')} style={s.logo} resizeMode="contain" />
          </View>
        </View>

        {/* ── Hero ── */}
        <View style={[s.hero, isWide && { paddingHorizontal: 48 }]}>
          <View style={s.heroBadge}>
            <View style={s.heroBadgeDot} />
            <Text style={s.heroBadgeTxt}>India's #1 Construction B2B Network</Text>
          </View>

          <Text style={[s.heroTitle, isWide && { fontSize: 44, lineHeight: 52 }]}>
            One platform.{'\n'}<Text style={{ color: PRIMARY }}>Every material.</Text>
          </Text>

          <Text style={[s.heroSub, isWide && { maxWidth: 560, fontSize: 16 }]}>
            Source, sell, and move construction materials with verified vendors,
            transporters and customers across India.
          </Text>

          {/* Trust strip */}
          <View style={s.trustStrip}>
            <View style={s.trustItem}>
              <Text style={s.trustVal}>{fmtCount(counts.vendors, '1.2K+')}</Text>
              <Text style={s.trustLbl}>Verified vendors</Text>
            </View>
            <View style={s.trustSep} />
            <View style={s.trustItem}>
              <Text style={s.trustVal}>{fmtCount(counts.orders, '50K+')}</Text>
              <Text style={s.trustLbl}>Orders delivered</Text>
            </View>
            <View style={s.trustSep} />
            <View style={s.trustItem}>
              <Text style={s.trustVal}>{counts.cities}</Text>
              <Text style={s.trustLbl}>States covered</Text>
            </View>
          </View>
        </View>

        {/* ── Section title ── */}
        <View style={[s.sectionHead, isWide && { paddingHorizontal: 48 }]}>
          <Text style={s.sectionLabel}>GET STARTED</Text>
          <Text style={s.sectionTitle}>Choose your role</Text>
          <Text style={s.sectionSub}>Select how you'll use C-Supply to continue.</Text>
        </View>

        {/* ── Role cards ── */}
        <View style={[s.cardsWrap, isWide && { paddingHorizontal: 48, flexDirection: 'row', gap: 16 }]}>
          {ROLES.map(r => {
            const Icon = r.Icon;
            return (
              <Pressable
                key={r.key}
                onPress={() => router.push(r.route as never)}
                style={({ pressed, hovered }: any) => [
                  s.card,
                  isWide && { flex: 1 },
                  hovered && s.cardHover,
                  pressed && s.cardPressed,
                ]}
              >
                <View style={s.cardTop}>
                  <View style={[s.iconWrap, { backgroundColor: r.iconBg }]}>
                    <Icon size={22} color={r.iconFg} strokeWidth={2} />
                  </View>
                  <Text style={s.cardTagline}>{r.tagline}</Text>
                </View>

                <Text style={s.cardLabel}>{r.label}</Text>
                <Text style={s.cardDesc}>{r.description}</Text>

                <View style={s.divider} />

                <View style={s.bullets}>
                  {r.bullets.map(b => (
                    <View key={b} style={s.bulletRow}>
                      <View style={[s.bulletDot, { backgroundColor: r.iconFg }]} />
                      <Text style={s.bulletTxt}>{b}</Text>
                    </View>
                  ))}
                </View>

                <View style={s.cardCta}>
                  <Text style={[s.cardCtaTxt, { color: r.iconFg }]}>Continue as {r.label}</Text>
                  <ArrowRight size={15} color={r.iconFg} strokeWidth={2.5} />
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* ── Why C-Supply strip ── */}
        <View style={[s.whyWrap, isWide && { paddingHorizontal: 48 }]}>
          <Text style={s.whyTitle}>Why C-Supply</Text>
          <View style={[s.whyGrid, isWide && { flexDirection: 'row' }]}>
            {[
              {
                Icon: ShieldCheck,
                title: 'Verified network',
                sub: 'KYC-verified vendors, transporters and customers. No middlemen, no surprises.',
              },
              {
                Icon: Zap,
                title: 'Instant fulfilment',
                sub: 'Real-time order tracking, transporter assignment and live chat from pickup to drop.',
              },
              {
                Icon: MapPin,
                title: 'Pan-India coverage',
                sub: 'Active across 28 states with route-optimised logistics and local pricing.',
              },
              {
                Icon: Headphones,
                title: '24/7 support',
                sub: 'Dedicated help desk for orders, payments and dispute resolution.',
              },
            ].map(item => {
              const Icon = item.Icon;
              return (
                <View key={item.title} style={[s.whyCard, isWide && { flex: 1 }]}>
                  <View style={s.whyIcon}>
                    <Icon size={18} color={PRIMARY} strokeWidth={2} />
                  </View>
                  <Text style={s.whyCardTitle}>{item.title}</Text>
                  <Text style={s.whyCardSub}>{item.sub}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* ── Footer ── */}
        <View style={[s.footer, isWide && { paddingHorizontal: 48 }]}>
          <Text style={s.footerTxt}>© 2026 C-Supply · All rights reserved</Text>
          <View style={s.footerLinks}>
            <Pressable><Text style={s.footerLink}>Privacy</Text></Pressable>
            <Text style={s.footerSep}>·</Text>
            <Pressable><Text style={s.footerLink}>Terms</Text></Pressable>
            <Text style={s.footerSep}>·</Text>
            <Pressable><Text style={s.footerLink}>Contact</Text></Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

/* ─── Styles ─────────────────────────────────────────────────────────────── */
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  bgImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },

  /* Topbar */
  topbar: {
    paddingHorizontal: 20, paddingBottom: 28,
    alignItems: 'center',
  },
  brand: { alignItems: 'center', gap: 4 },
  logo:      { width: 260, height: 140 },
  brandTag:  { fontFamily: R.reg, fontSize: 12, color: INK_500, letterSpacing: 0.2, textAlign: 'center' },

  signinBtn: {
    position: 'absolute', top: 0, right: 20,
    paddingHorizontal: 16, paddingVertical: 9, borderRadius: 8,
    backgroundColor: SURFACE, borderWidth: 1, borderColor: BORDER_2,
  },
  signinTxt: { fontFamily: R.med, fontSize: 13, color: INK_700 },

  /* Hero */
  hero: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 36, gap: 16 },
  heroBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: SUCCESS_BG, borderRadius: 99,
    paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: '#BBF7D0',
  },
  heroBadgeDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: SUCCESS },
  heroBadgeTxt: { fontFamily: R.med, fontSize: 11, color: SUCCESS },

  heroTitle: {
    fontFamily: R.bold, fontSize: 34, color: INK_900,
    lineHeight: 42, letterSpacing: -0.6,
  },
  heroSub: {
    fontFamily: R.reg, fontSize: 14, color: INK_500,
    lineHeight: 22, maxWidth: 440,
  },

  trustStrip: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: SURFACE, borderRadius: 12,
    borderWidth: 1, borderColor: BORDER,
    paddingVertical: 14, paddingHorizontal: 4,
    marginTop: 8,
  },
  trustItem: { flex: 1, alignItems: 'center', gap: 2 },
  trustVal:  { fontFamily: R.bold, fontSize: 18, color: INK_900, letterSpacing: -0.3 },
  trustLbl:  { fontFamily: R.reg, fontSize: 11, color: INK_500 },
  trustSep:  { width: 1, height: 28, backgroundColor: BORDER },

  /* Section header */
  sectionHead: { paddingHorizontal: 20, gap: 4, marginBottom: 18 },
  sectionLabel: {
    fontFamily: R.bold, fontSize: 10.5, color: PRIMARY,
    letterSpacing: 1.5, textTransform: 'uppercase' as const,
  },
  sectionTitle: { fontFamily: R.bold, fontSize: 22, color: INK_900, letterSpacing: -0.4 },
  sectionSub:   { fontFamily: R.reg, fontSize: 13, color: INK_500 },

  /* Cards */
  cardsWrap: { paddingHorizontal: 20, gap: 12 },
  card: {
    backgroundColor: SURFACE,
    borderWidth: 1, borderColor: BORDER,
    borderRadius: 14, padding: 20, gap: 10,
    shadowColor: INK_900, shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardHover:   { borderColor: PRIMARY_DK, shadowOpacity: 0.08 },
  cardPressed: { transform: [{ scale: 0.99 }], opacity: 0.96 },

  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
  iconWrap: {
    width: 46, height: 46, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
  },
  cardTagline: { fontFamily: R.med, fontSize: 11.5, color: INK_500, letterSpacing: 0.1 },

  cardLabel: { fontFamily: R.bold, fontSize: 19, color: INK_900, letterSpacing: -0.3 },
  cardDesc:  { fontFamily: R.reg, fontSize: 13, color: INK_500, lineHeight: 19 },

  divider: { height: 1, backgroundColor: BORDER, marginVertical: 6 },

  bullets: { gap: 6 },
  bulletRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bulletDot: { width: 5, height: 5, borderRadius: 3 },
  bulletTxt: { fontFamily: R.reg, fontSize: 12.5, color: INK_700 },

  cardCta: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 8, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: BORDER,
  },
  cardCtaTxt: { fontFamily: R.bold, fontSize: 13, letterSpacing: -0.1 },

  /* Why C-Supply */
  whyWrap: { paddingHorizontal: 20, marginTop: 48, gap: 16 },
  whyTitle: { fontFamily: R.bold, fontSize: 18, color: INK_900, letterSpacing: -0.3 },
  whyGrid: { gap: 10 },
  whyCard: {
    backgroundColor: SURFACE, borderWidth: 1, borderColor: BORDER,
    borderRadius: 12, padding: 16, gap: 8,
  },
  whyIcon: {
    width: 36, height: 36, borderRadius: 9,
    backgroundColor: PRIMARY_LT, alignItems: 'center', justifyContent: 'center',
  },
  whyCardTitle: { fontFamily: R.bold, fontSize: 14, color: INK_900 },
  whyCardSub:   { fontFamily: R.reg, fontSize: 12.5, color: INK_500, lineHeight: 18 },

  /* Footer */
  footer: {
    paddingHorizontal: 20, paddingTop: 32,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    flexWrap: 'wrap', gap: 8,
  },
  footerTxt: { fontFamily: R.reg, fontSize: 11, color: INK_400 },
  footerLinks: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  footerLink: { fontFamily: R.med, fontSize: 11, color: INK_500 },
  footerSep:  { fontFamily: R.reg, fontSize: 11, color: INK_400 },
});
