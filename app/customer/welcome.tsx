/**
 * /customer/welcome — C-Supply customer onboarding gate.
 * Light editorial card with crane watermark. Matches /auth/login.
 */
import React from 'react';
import {
  View, Text, Pressable, StyleSheet,
  ScrollView, StatusBar, Image, SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowRight, ArrowLeft, Package, Truck, ShieldCheck } from 'lucide-react-native';
import { FontFamily } from '@/constants/theme';

/* ─── Palette ─────────────────────────────────────────────────────────────── */
const TEAL_LINE   = '#22535A';
const CARD_BG     = '#FFFFFF';
const INK         = '#0E1422';
const TEXT_MUTED  = '#6B7280';
const TEXT_FAINT  = '#9CA3AF';
const BORDER      = '#E5E7EB';
const ACCENT      = '#15803D';
const ACCENT_DK   = '#166534';
const ACCENT_LT   = '#F0FDF4';
const ACCENT_BD   = '#BBF7D0';

export default function CustomerWelcome() {
  const router = useRouter();

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor={CARD_BG} />
      <View style={s.topLine} />

      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={s.scroll}
          showsVerticalScrollIndicator={false}
        >
          <View style={s.card}>
            <Image
              source={require('../../assets/ng_real4.png')}
              style={s.watermark}
              resizeMode="cover"
            />
            <View style={s.watermarkFade} />

            <View style={s.cardInner}>
              {/* Top — back + logo */}
              <View style={s.topRow}>
                <Pressable onPress={() => router.back()} hitSlop={12} style={s.backBtn}>
                  <ArrowLeft size={18} color="#0F172A" strokeWidth={1.75} />
                </Pressable>
                <View style={s.logoWrap}>
                  <Image
                    source={require('../../assets/Logo final.png')}
                    style={s.logo}
                    resizeMode="contain"
                  />
                </View>
                <View style={{ width: 38 }} />
              </View>

              {/* Eyebrow pill */}
              <View style={s.eyebrowWrap}>
                <View style={s.eyebrow}>
                  <View style={s.eyebrowDot} />
                  <Text style={s.eyebrowTxt}>JOIN AS CUSTOMER</Text>
                </View>
              </View>

              {/* Heading */}
              <Text style={s.heading}>
                Build smarter with{'\n'}
                <Text style={s.headingAccent}>verified materials.</Text>
              </Text>

              <Text style={s.subhead}>
                Source cement, steel, bricks, sand and 500+ construction materials
                directly from verified vendors. Delivered to your site.
              </Text>

              {/* Stats card */}
              <View style={s.statsCard}>
                <View style={s.statCell}>
                  <View style={s.statIcon}>
                    <Package size={18} color="#0F172A" strokeWidth={1.75} />
                  </View>
                  <Text style={s.statValue}>1,200+</Text>
                  <Text style={s.statLabel}>Verified vendors</Text>
                </View>
                <View style={s.statDivider} />
                <View style={s.statCell}>
                  <View style={s.statIcon}>
                    <Truck size={18} color="#0F172A" strokeWidth={1.75} />
                  </View>
                  <Text style={s.statValue}>50K+</Text>
                  <Text style={s.statLabel}>Orders delivered</Text>
                </View>
                <View style={s.statDivider} />
                <View style={s.statCell}>
                  <View style={s.statIcon}>
                    <ShieldCheck size={18} color="#0F172A" strokeWidth={1.75} />
                  </View>
                  <Text style={s.statValue}>28</Text>
                  <Text style={s.statLabel}>States served</Text>
                </View>
              </View>

              {/* CTAs */}
              <View style={s.ctaRow}>
                <Pressable
                  style={({ pressed }) => [s.signinBtn, pressed && { opacity: 0.92 }]}
                  onPress={() => router.push('/auth/login' as never)}
                >
                  <Text style={s.signinBtnTxt}>Sign in</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [s.registerBtn, pressed && { opacity: 0.92 }]}
                  onPress={() => router.push('/customer/onboarding/1' as never)}
                >
                  <Text style={s.registerBtnTxt}>New Registration</Text>
                  <ArrowRight size={16} color="#FFFFFF" strokeWidth={2} />
                </Pressable>
              </View>
            </View>
          </View>
        </ScrollView>
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
    maxWidth: 520,
    backgroundColor: CARD_BG,
    overflow: 'hidden',
  },

  watermark: {
    position: 'absolute',
    top: 0, right: -40,
    width: '90%', height: 380,
    opacity: 0.10,
  },
  watermarkFade: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 380,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },

  cardInner: {
    paddingHorizontal: 4,
    paddingTop: 8,
    paddingBottom: 16,
  },

  /* Top row */
  topRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 28,
    minHeight: 44,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 10,
    borderWidth: 1, borderColor: BORDER,
    backgroundColor: '#FFFFFF',
    alignItems: 'center', justifyContent: 'center',
  },
  logoWrap: {
    width: 154,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  logo: {
    width: '100%',
    height: '100%',
  },

  /* Eyebrow */
  eyebrowWrap: { marginBottom: 18 },
  eyebrow: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    alignSelf: 'flex-start',
    backgroundColor: ACCENT_LT, borderRadius: 99,
    paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: ACCENT_BD,
  },
  eyebrowDot: {
    width: 6, height: 6, borderRadius: 3, backgroundColor: ACCENT,
  },
  eyebrowTxt: {
    fontFamily: FontFamily.semiBold, fontSize: 10.5,
    color: ACCENT, letterSpacing: 1.2,
  },

  /* Heading */
  heading: {
    fontFamily: FontFamily.bold,
    fontSize: 30, lineHeight: 36,
    color: INK,
    letterSpacing: -1,
    marginBottom: 14,
  },
  headingAccent: {
    color: ACCENT,
  },
  subhead: {
    fontFamily: FontFamily.regular,
    fontSize: 14, color: TEXT_MUTED,
    lineHeight: 22,
    maxWidth: 460,
    marginBottom: 24,
  },

  /* Stats card */
  statsCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderWidth: 1, borderColor: BORDER,
    borderRadius: 14,
    paddingVertical: 18,
    marginBottom: 28,
  },
  statCell: {
    flex: 1, alignItems: 'center', gap: 8,
    paddingHorizontal: 8,
  },
  statIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: ACCENT_LT,
    alignItems: 'center', justifyContent: 'center',
  },
  statValue: {
    fontFamily: FontFamily.bold, fontSize: 17, color: INK,
    letterSpacing: -0.3,
  },
  statLabel: {
    fontFamily: FontFamily.regular, fontSize: 11, color: TEXT_FAINT,
    textAlign: 'center', lineHeight: 14,
  },
  statDivider: {
    width: 1, alignSelf: 'stretch',
    backgroundColor: BORDER,
    marginVertical: 4,
  },

  /* CTAs */
  ctaRow: {
    flexDirection: 'row', gap: 10,
  },
  signinBtn: {
    paddingHorizontal: 24, paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1, borderColor: BORDER,
    alignItems: 'center', justifyContent: 'center',
  },
  signinBtnTxt: {
    fontFamily: FontFamily.semiBold, fontSize: 14, color: INK,
  },
  registerBtn: {
    flex: 1,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: ACCENT_DK,
  },
  registerBtnTxt: {
    fontFamily: FontFamily.semiBold, fontSize: 14.5, color: '#FFFFFF',
    letterSpacing: -0.1,
  },
});
