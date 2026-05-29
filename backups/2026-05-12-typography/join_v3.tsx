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
import { FontFamily } from '@/constants/theme';

/* ─── Palette ─────────────────────────────────────────────────────────────── */
const BG          = '#0B1220';
const SURFACE     = '#101828';
const SURFACE_2   = '#0E1626';
const BORDER      = '#1F2A40';
const BORDER_2    = '#2A3955';
const INK_900     = '#F1F5F9';
const INK_700     = '#CBD5E1';
const INK_500     = '#94A3B8';
const INK_400     = '#64748B';
const PRIMARY     = '#3B82F6';
const PRIMARY_DK  = '#1D4ED8';
const SUCCESS     = '#22C55E';
const SUCCESS_BG  = '#0D2517';

const TOP = Platform.OS === 'ios' ? 56 : Platform.OS === 'web' ? 20 : 28;

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
    tagline: 'Builders & contractors',
    description: 'Source verified materials, compare prices, get doorstep delivery.',
    bullets: ['500+ products', 'Live order tracking', 'GST invoicing'],
    Icon: User2, iconBg: '#1A2E4E', iconFg: '#60A5FA',
    route: '/customer/welcome',
  },
  {
    key: 'vendor',
    label: 'Vendor',
    tagline: 'Dealers & manufacturers',
    description: 'List inventory, accept large orders, grow with verified buyers.',
    bullets: ['Unlimited SKUs', 'Verified badge', 'Settlement in 2 days'],
    Icon: Store, iconBg: '#0E2B1A', iconFg: '#4ADE80',
    route: '/vendor/welcome',
  },
  {
    key: 'transporter',
    label: 'Transporter',
    tagline: 'Fleet owners & drivers',
    description: 'Choose trips, get GPS-routed jobs, receive instant payouts.',
    bullets: ['Choose your trips', 'Instant payouts', 'GPS routes'],
    Icon: Truck, iconBg: '#2E1A0E', iconFg: '#FB923C',
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
      {/* Flatter dark overlay — operational feel, not cinematic */}
      <LinearGradient
        colors={['rgba(11,18,32,0.86)', 'rgba(11,18,32,0.94)', 'rgba(11,18,32,0.98)']}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView
        contentContainerStyle={{ paddingTop: TOP, paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Top bar — compact ─────────────────────────────── */}
        <View style={[s.topbar, isWide && { paddingHorizontal: 40 }]}>
          <Image source={require('../assets/Logo_Ui.png')} style={s.logo} resizeMode="contain" />
          <Text style={s.brandTag}>Construction materials platform</Text>
        </View>

        <View style={s.topDivider} />

        {/* ── Hero — denser ─────────────────────────────────── */}
        <View style={[s.hero, isWide && { paddingHorizontal: 40 }]}>
          <View style={s.heroBadge}>
            <View style={s.heroBadgeDot} />
            <Text style={s.heroBadgeTxt}>India's #1 construction B2B network</Text>
          </View>

          <Text style={[s.heroTitle, isWide && { fontSize: 30 }]}>
            One platform. Every material.
          </Text>

          <Text style={s.heroSub}>
            Source, sell, and move construction materials with verified vendors,
            transporters and customers across India.
          </Text>

          {/* Trust strip — tighter */}
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

        {/* ── Section title ─────────────────────────────────── */}
        <View style={[s.sectionHead, isWide && { paddingHorizontal: 40 }]}>
          <Text style={s.sectionLabel}>GET STARTED</Text>
          <Text style={s.sectionTitle}>Choose your account type</Text>
          <Text style={s.sectionSub}>Select the role that fits your business. You can change it later from settings.</Text>
        </View>

        {/* ── Role cards ────────────────────────────────────── */}
        <View style={[s.cardsWrap, isWide && { paddingHorizontal: 40, flexDirection: 'row', gap: 12 }]}>
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
                <View style={s.cardHead}>
                  <View style={[s.iconWrap, { backgroundColor: r.iconBg }]}>
                    <Icon size={18} color={r.iconFg} strokeWidth={1.75} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.cardLabel}>{r.label}</Text>
                    <Text style={s.cardTagline}>{r.tagline}</Text>
                  </View>
                </View>

                <Text style={s.cardDesc}>{r.description}</Text>

                <View style={s.bullets}>
                  {r.bullets.map(b => (
                    <View key={b} style={s.bulletRow}>
                      <View style={[s.bulletDot, { backgroundColor: r.iconFg }]} />
                      <Text style={s.bulletTxt}>{b}</Text>
                    </View>
                  ))}
                </View>

                <View style={s.cardCta}>
                  <Text style={s.cardCtaTxt}>Continue as {r.label}</Text>
                  <ArrowRight size={14} color={INK_700} strokeWidth={1.75} />
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* ── Why C-Supply — single dense row ───────────────── */}
        <View style={[s.whyWrap, isWide && { paddingHorizontal: 40 }]}>
          <Text style={s.whyTitle}>Why C-Supply</Text>
          <View style={[s.whyGrid, isWide && { flexDirection: 'row' }]}>
            {[
              { Icon: ShieldCheck, title: 'Verified network',    sub: 'KYC-verified vendors, transporters and customers. No middlemen.' },
              { Icon: Zap,         title: 'Instant fulfilment',  sub: 'Live order tracking, transporter assignment, and chat from pickup to drop.' },
              { Icon: MapPin,      title: 'Pan-India coverage',  sub: 'Active across 28 states with route-optimised logistics and local pricing.' },
              { Icon: Headphones,  title: '24/7 support',        sub: 'Dedicated help desk for orders, payments, and dispute resolution.' },
            ].map(item => {
              const Icon = item.Icon;
              return (
                <View key={item.title} style={[s.whyCard, isWide && { flex: 1 }]}>
                  <Icon size={16} color={INK_700} strokeWidth={1.75} />
                  <Text style={s.whyCardTitle}>{item.title}</Text>
                  <Text style={s.whyCardSub}>{item.sub}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* ── Footer ────────────────────────────────────────── */}
        <View style={[s.footer, isWide && { paddingHorizontal: 40 }]}>
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
    paddingHorizontal: 20, paddingBottom: 12,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  logo:     { width: 120, height: 60 },
  brandTag: {
    fontFamily: FontFamily.regular, fontSize: 12, color: INK_500,
    letterSpacing: 0.05,
  },
  topDivider: {
    height: 1, backgroundColor: BORDER, marginHorizontal: 20,
  },

  /* Hero */
  hero: { paddingHorizontal: 20, paddingTop: 28, paddingBottom: 28, gap: 14 },
  heroBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: SUCCESS_BG, borderRadius: 6,
    paddingHorizontal: 9, paddingVertical: 4,
    borderWidth: 1, borderColor: '#15401E',
  },
  heroBadgeDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: SUCCESS },
  heroBadgeTxt: { fontFamily: FontFamily.medium, fontSize: 11, color: SUCCESS, letterSpacing: 0.1 },

  heroTitle: {
    fontFamily: FontFamily.bold, fontSize: 26, color: INK_900,
    lineHeight: 32, letterSpacing: -0.5,
  },
  heroSub: {
    fontFamily: FontFamily.regular, fontSize: 13.5, color: INK_500,
    lineHeight: 20, maxWidth: 560,
  },

  trustStrip: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: SURFACE, borderRadius: 8,
    borderWidth: 1, borderColor: BORDER,
    paddingVertical: 12, paddingHorizontal: 4,
    marginTop: 6,
  },
  trustItem: { flex: 1, alignItems: 'center', gap: 1 },
  trustVal:  { fontFamily: FontFamily.bold, fontSize: 16, color: INK_900, letterSpacing: -0.3 },
  trustLbl:  { fontFamily: FontFamily.regular, fontSize: 11, color: INK_500 },
  trustSep:  { width: 1, height: 24, backgroundColor: BORDER },

  /* Section header */
  sectionHead: { paddingHorizontal: 20, gap: 3, marginBottom: 12, marginTop: 8 },
  sectionLabel: {
    fontFamily: FontFamily.medium, fontSize: 11, color: INK_500,
    letterSpacing: 1, textTransform: 'uppercase' as const,
  },
  sectionTitle: { fontFamily: FontFamily.bold, fontSize: 20, color: INK_900, letterSpacing: -0.3 },
  sectionSub:   { fontFamily: FontFamily.regular, fontSize: 13, color: INK_500, lineHeight: 18 },

  /* Cards */
  cardsWrap: { paddingHorizontal: 20, gap: 10 },
  card: {
    backgroundColor: SURFACE,
    borderWidth: 1, borderColor: BORDER,
    borderRadius: 10, padding: 14, gap: 10,
  },
  cardHover:   { borderColor: BORDER_2 },
  cardPressed: { opacity: 0.94 },

  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 2 },
  iconWrap: {
    width: 32, height: 32, borderRadius: 7,
    alignItems: 'center', justifyContent: 'center',
  },
  cardLabel:   { fontFamily: FontFamily.semiBold, fontSize: 15, color: INK_900, letterSpacing: -0.1 },
  cardTagline: { fontFamily: FontFamily.regular, fontSize: 11.5, color: INK_500, marginTop: 1 },
  cardDesc:    { fontFamily: FontFamily.regular, fontSize: 12.5, color: INK_500, lineHeight: 18 },

  bullets: { gap: 5, marginTop: 2 },
  bulletRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  bulletDot: { width: 4, height: 4, borderRadius: 2 },
  bulletTxt: { fontFamily: FontFamily.regular, fontSize: 12, color: INK_700 },

  cardCta: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    marginTop: 6, paddingTop: 10,
    borderTopWidth: 1, borderTopColor: BORDER,
  },
  cardCtaTxt: { fontFamily: FontFamily.semiBold, fontSize: 12.5, color: INK_700, letterSpacing: -0.05, flex: 1 },

  /* Why C-Supply */
  whyWrap: { paddingHorizontal: 20, marginTop: 36, gap: 12 },
  whyTitle: { fontFamily: FontFamily.semiBold, fontSize: 14, color: INK_700, letterSpacing: 0.05, textTransform: 'uppercase' as const },
  whyGrid: { gap: 1, backgroundColor: BORDER, borderRadius: 8, borderWidth: 1, borderColor: BORDER, overflow: 'hidden' },
  whyCard: {
    backgroundColor: SURFACE_2,
    padding: 14, gap: 6,
  },
  whyCardTitle: { fontFamily: FontFamily.semiBold, fontSize: 13, color: INK_900, marginTop: 2 },
  whyCardSub:   { fontFamily: FontFamily.regular,  fontSize: 12, color: INK_500, lineHeight: 17 },

  /* Footer */
  footer: {
    paddingHorizontal: 20, paddingTop: 28,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    flexWrap: 'wrap', gap: 8,
  },
  footerTxt: { fontFamily: FontFamily.regular, fontSize: 11, color: INK_400 },
  footerLinks: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  footerLink:  { fontFamily: FontFamily.medium, fontSize: 11, color: INK_500 },
  footerSep:   { fontFamily: FontFamily.regular, fontSize: 11, color: INK_400 },
});
