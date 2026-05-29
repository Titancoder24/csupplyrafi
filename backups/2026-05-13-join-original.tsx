import React, { useEffect, useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, Image,
  Platform, ScrollView, useWindowDimensions, StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  User2, Store, Truck, ArrowRight, Check,
  ShieldCheck, Zap, Headphones, MapPin,
  Globe,
} from 'lucide-react-native';
import { supabase } from '@/services/supabase';
import { FontFamily } from '@/constants/theme';

/* ─── Palette ─────────────────────────────────────────────────────────────── */
const DARK         = '#0B0F19';
const DARK_2       = '#11151F';
const DARK_BORDER  = '#1F2535';
const PAGE_BG      = '#F8FAFC';   // cool light gray (slate-50)
const SUBTLE_BG    = '#F1F5F9';   // slate-100
const WHITE        = '#FFFFFF';
const LIGHT_BORDER = '#E2E8F0';   // slate-200
const INK_900_LT   = '#0F172A';
const INK_700_LT   = '#334155';
const INK_500_LT   = '#64748B';
const INK_400_LT   = '#94A3B8';
const INK_900_DK   = '#F1F5F9';
const INK_500_DK   = '#94A3B8';
const INK_400_DK   = '#64748B';
const ACCENT       = '#F4C430';   // mustard yellow (kept)
const ACCENT_HOVER = '#CA8A04';   // darker mustard for links

const TOP = Platform.OS === 'ios' ? 0 : Platform.OS === 'web' ? 0 : 28;

type Role = {
  key: string;
  label: string;
  tagline: string;
  description: string;
  bullets: string[];
  Icon: any;
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
    Icon: User2,
    route: '/customer/welcome',
    popular: true,
  },
  {
    key: 'vendor',
    label: 'Vendor',
    tagline: 'For dealers & manufacturers',
    description: 'List your inventory, accept large orders and grow revenue with verified buyers.',
    bullets: ['Unlimited SKUs', 'Verified badge', 'Secure payments', 'Settlement in 2 days'],
    Icon: Store,
    route: '/vendor/welcome',
  },
  {
    key: 'transporter',
    label: 'Transporter',
    tagline: 'For fleet owners & drivers',
    description: 'Choose the trips you want, get GPS-routed jobs and receive instant payouts.',
    bullets: ['Choose your trips', 'Instant payouts', 'GPS-tracked routes', 'Trip history & analytics'],
    Icon: Truck,
    route: '/transporter/welcome',
  },
];

/* ─── Screen ──────────────────────────────────────────────────────────────── */
export default function JoinScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWide = width >= 900;
  const isMid  = width >= 720;

  const [_counts, setCounts] = useState<{ vendors: number; orders: number }>({ vendors: 0, orders: 0 });

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

  const padH = isWide ? 56 : 20;

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={DARK} />

      <ScrollView
        contentContainerStyle={{ paddingTop: TOP }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Top announcement strip ─────────────────────── */}
        <View style={s.topStrip}>
          <View style={[s.contentBound, { paddingHorizontal: padH }]}>
            <View style={s.topLeft}>
              <Globe size={12} color={INK_500_DK} strokeWidth={1.75} />
              <Text style={s.topStripTxt}>India's #1 Construction B2B Network</Text>
            </View>
          </View>
        </View>

        {/* ── Navbar (light, logo only) ──────────────────── */}
        <View style={s.navbar}>
          <Image source={require('../assets/Logo_Ui.png')} style={s.navbarLogo} resizeMode="contain" />
        </View>

        {/* ── Hero (cool light gray) ──────────────────────── */}
        <View style={s.heroSection}>
          {/* Subtle faded construction bg right side */}
          <Image
            source={require('../assets/BG_2.png')}
            style={s.heroBgImage}
            resizeMode="cover"
          />

          <View style={[s.contentBound, { paddingHorizontal: padH }]}>
            <View style={s.hero}>
              <Text style={s.heroLabel}>GET STARTED</Text>
              <Text style={s.heroTitle}>Choose your role</Text>
              <Text style={s.heroSub}>
                Select how you'll use C-Supply to continue. Each role is designed
                to streamline your construction supply operations with trusted partners.
              </Text>
            </View>

            {/* Role cards */}
            <View style={[
              s.cardsWrap,
              isWide && { flexDirection: 'row', gap: 14 },
            ]}>
            {ROLES.map(r => {
              const Icon = r.Icon;
              return (
                <Pressable
                  key={r.key}
                  onPress={() => router.push(r.route as never)}
                  style={[
                    s.card,
                    isWide && { flex: 1 },
                    r.popular && s.cardPopular,
                  ]}
                >
                  {r.popular && (
                    <View style={s.popularBadge}>
                      <Text style={s.popularTxt}>MOST POPULAR</Text>
                    </View>
                  )}

                  <View style={s.cardIconBox}>
                    <Icon size={18} color={DARK} strokeWidth={1.75} />
                  </View>

                  <Text style={s.cardLabel}>{r.label}</Text>
                  <Text style={s.cardTagline}>{r.tagline}</Text>
                  <Text style={s.cardDesc}>{r.description}</Text>

                  <View style={s.divider} />

                  <View style={s.bullets}>
                    {r.bullets.map(b => (
                      <View key={b} style={s.bulletRow}>
                        <View style={s.checkChip}>
                          <Check size={9} color={DARK} strokeWidth={3} />
                        </View>
                        <Text style={s.bulletTxt}>{b}</Text>
                      </View>
                    ))}
                  </View>

                  <View style={s.cardCta}>
                    <Text style={s.cardCtaTxt}>Continue as {r.label}</Text>
                    <ArrowRight size={13} color={ACCENT_HOVER} strokeWidth={2} />
                  </View>
                </Pressable>
              );
            })}
            </View>
          </View>
        </View>

        {/* ── Why C-Supply (dark section) ────────────────── */}
        <View style={s.darkSection}>
          <View style={[s.contentBound, { paddingHorizontal: padH }]}>
            <View style={s.whyHead}>
              <Text style={s.whyTitle}>Why C-Supply</Text>
              <Pressable>
                <Text style={s.exploreLink}>Explore all features →</Text>
              </Pressable>
            </View>

            <View style={[s.whyGrid, isWide && { flexDirection: 'row' }]}>
              {[
                { Icon: ShieldCheck, title: 'Verified network',    sub: 'KYC-verified vendors, transporters and customers. No middlemen, no surprises.' },
                { Icon: Zap,         title: 'Instant fulfilment',  sub: 'Real-time order tracking, transporter assignment and live chat from pickup to drop.' },
                { Icon: MapPin,      title: 'Pan-India coverage',  sub: 'Active across 28 states with route-optimised logistics and local pricing.' },
                { Icon: Headphones,  title: '24/7 support',        sub: 'Dedicated help desk for orders, payments and dispute resolution.' },
              ].map(item => {
                const Icon = item.Icon;
                return (
                  <View key={item.title} style={[s.whyCard, isWide && { flex: 1 }]}>
                    <View style={s.whyIcon}>
                      <Icon size={16} color={ACCENT} strokeWidth={1.75} />
                    </View>
                    <Text style={s.whyCardTitle}>{item.title}</Text>
                    <Text style={s.whyCardSub}>{item.sub}</Text>
                  </View>
                );
              })}
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
  root: { flex: 1, backgroundColor: DARK },

  /* Content max-width container for 1920+ screens */
  contentBound: {
    width: '100%',
    maxWidth: 1280,
    alignSelf: 'center',
  },

  /* Top strip */
  topStrip: {
    height: 32, backgroundColor: DARK,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderBottomWidth: 1, borderBottomColor: DARK_BORDER,
  },
  topLeft:  { flexDirection: 'row', alignItems: 'center', gap: 7 },
  topRight: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  topRightItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  topStripTxt: { fontFamily: FontFamily.regular, fontSize: 11, color: INK_500_DK, letterSpacing: 0.1 },

  /* Navbar */
  navbar: {
    height: 128,
    backgroundColor: WHITE,
    borderBottomWidth: 1, borderBottomColor: LIGHT_BORDER,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
  },
  navbarLogo: { width: 380, height: 112 },

  /* Hero section */
  heroSection: {
    backgroundColor: PAGE_BG,
    paddingBottom: 20,
    position: 'relative' as const,
    overflow: 'hidden' as const,
  },
  heroBgImage: {
    position: 'absolute' as const,
    right: 0, top: 0,
    height: 280,
    width: '55%',
    opacity: 0.18,
  },
  hero: { paddingTop: 28, paddingBottom: 20, gap: 6, maxWidth: 720 },
  heroLabel: { fontFamily: FontFamily.bold, fontSize: 11, color: ACCENT_HOVER, letterSpacing: 1.4 },
  heroTitle: {
    fontFamily: FontFamily.bold, fontSize: 28, color: INK_900_LT,
    letterSpacing: -0.6, lineHeight: 32, marginTop: 2,
  },
  heroSub: {
    fontFamily: FontFamily.regular, fontSize: 13.5, color: INK_700_LT,
    lineHeight: 20, maxWidth: 560,
  },

  /* Cards */
  cardsWrap: { gap: 10, paddingBottom: 28 },
  card: {
    backgroundColor: WHITE,
    borderWidth: 1, borderColor: LIGHT_BORDER,
    borderRadius: 10, padding: 14, gap: 5,
    position: 'relative' as never,
    shadowColor: '#0F172A',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  cardPopular: {
    backgroundColor: '#FEFCE8',
    borderColor: ACCENT,
  },
  popularBadge: {
    position: 'absolute', top: 12, right: 12,
    backgroundColor: ACCENT, borderRadius: 4,
    paddingHorizontal: 7, paddingVertical: 3,
  },
  popularTxt: { fontFamily: FontFamily.bold, fontSize: 9, color: DARK, letterSpacing: 0.8 },

  cardIconBox: {
    width: 36, height: 36, borderRadius: 8,
    backgroundColor: SUBTLE_BG,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 6,
  },
  cardLabel:   { fontFamily: FontFamily.bold, fontSize: 16, color: INK_900_LT, letterSpacing: -0.2 },
  cardTagline: { fontFamily: FontFamily.medium, fontSize: 12, color: INK_500_LT, marginBottom: 6 },
  cardDesc:    { fontFamily: FontFamily.regular, fontSize: 12.5, color: INK_500_LT, lineHeight: 18 },

  divider: { height: 1, backgroundColor: LIGHT_BORDER, marginVertical: 10 },

  bullets: { gap: 7 },
  bulletRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  checkChip: {
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: ACCENT,
    alignItems: 'center', justifyContent: 'center',
  },
  bulletTxt: { fontFamily: FontFamily.regular, fontSize: 12.5, color: INK_700_LT },

  cardCta: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    marginTop: 12,
  },
  cardCtaTxt: { fontFamily: FontFamily.semiBold, fontSize: 12.5, color: ACCENT_HOVER, letterSpacing: -0.05 },

  /* Dark section */
  darkSection: { backgroundColor: DARK, paddingTop: 28, paddingBottom: 24 },
  whyHead: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 14,
  },
  whyTitle:    { fontFamily: FontFamily.bold, fontSize: 16, color: INK_900_DK, letterSpacing: -0.2 },
  exploreLink: { fontFamily: FontFamily.semiBold, fontSize: 12, color: ACCENT, letterSpacing: -0.05 },
  whyGrid: { gap: 10 },
  whyCard: {
    backgroundColor: DARK_2, borderRadius: 8, borderWidth: 1, borderColor: DARK_BORDER,
    padding: 14, gap: 8,
  },
  whyIcon: {
    width: 28, height: 28, borderRadius: 6,
    backgroundColor: 'rgba(244,196,48,0.10)',
    alignItems: 'center', justifyContent: 'center',
  },
  whyCardTitle: { fontFamily: FontFamily.semiBold, fontSize: 13, color: INK_900_DK },
  whyCardSub:   { fontFamily: FontFamily.regular, fontSize: 11.5, color: INK_500_DK, lineHeight: 16 },

  /* Footer */
  footer: {
    paddingVertical: 18, backgroundColor: DARK,
    borderTopWidth: 1, borderTopColor: DARK_BORDER,
  },
  footerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    flexWrap: 'wrap', gap: 10,
  },
  footerTxt: { fontFamily: FontFamily.regular, fontSize: 11, color: INK_400_DK },
  footerLinks: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  footerLink:  { fontFamily: FontFamily.medium, fontSize: 11, color: INK_500_DK },
});
