/**
 * SplashScreen — C-Supply onboarding (root /).
 * Truck/warehouse fully owns the screen as the background layer.
 * Text and CTAs float on top with soft readability washes only at the edges.
 */
import React, { useEffect } from 'react';
import {
  View, Text, Pressable, StyleSheet, Image,
  SafeAreaView, StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, usePathname } from 'expo-router';
import { ArrowRight, User } from 'lucide-react-native';
import { useAuth } from '@/services/auth/AuthProvider';
import { FontFamily } from '@/constants/theme';

const BG     = '#F5F6F8';
const NAVY   = '#0D1B2A';
const SUB    = '#3F4A57';
const WHITE  = '#FFFFFF';
const BORDER = '#D9DDE2';

export default function SplashScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const { session, profile, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    // Only allow redirection if the splash screen is the active screen
    if (pathname !== '/') return;
    if (session && !profile) return;
    if (session && profile) {
      const role = profile.role ?? 'customer';
      switch (role) {
        case 'vendor':        router.replace('/vendor/dashboard' as never); break;
        case 'transporter':   router.replace('/transporter/dashboard' as never); break;
        case 'admin':         router.replace('/admin/dashboard' as never); break;
        case 'super_admin':   router.replace('/superadmin/dashboard' as never); break;
        default:              router.replace('/customer/home' as never);
      }
    }
  }, [loading, session, profile, router, pathname]);

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* ── LAYER 1: truck background — sits lower, ends before the CTA band ── */}
      <View style={s.bgWrap} pointerEvents="none">
        <Image
          source={require('../assets/ng_real4.png')}
          style={s.bgImage}
          resizeMode="cover"
        />
        {/* Refined fade — truck stays recognizable, transition still smooth */}
        <LinearGradient
          colors={['rgba(245,246,248,0)', 'rgba(245,246,248,0.25)', 'rgba(245,246,248,0.65)', 'rgba(245,246,248,0.92)']}
          locations={[0, 0.4, 0.78, 1]}
          style={s.bgFadeBottom}
          pointerEvents="none"
        />
      </View>

      {/* ── LAYER 2: top wash — supports text, lets truck breathe ── */}
      <LinearGradient
        colors={['rgba(245,246,248,0.94)', 'rgba(245,246,248,0.68)', 'rgba(245,246,248,0.18)', 'rgba(245,246,248,0)']}
        locations={[0, 0.45, 0.80, 1]}
        style={s.washTop}
        pointerEvents="none"
      />

      {/* ── LAYER 3: solid CTA band — clean separation, no truck behind buttons ── */}
      <View style={s.ctaBand} pointerEvents="none" />

      {/* ── LAYER 3: UI floats above the background ── */}
      <SafeAreaView style={s.ui}>
        {/* Text floats at the top */}
        <View style={s.topContent}>
          <View style={s.logoWrap}>
            <Image
              source={require('../assets/Logo final.png')}
              style={s.logo}
              resizeMode="contain"
            />
          </View>
          <Text style={s.headline}>Supply made{'\n'}simple.</Text>
          <Text style={s.subtitle}>
            Order construction materials from trusted vendors and book reliable transport — all in one place.
          </Text>
        </View>

        {/* CTAs float at the bottom */}
        <View style={s.bottomContent}>
          <Pressable
            onPress={() => router.push('/join' as never)}
            style={({ pressed }) => [s.primaryBtn, pressed && { opacity: 0.94 }]}
          >
            <View style={{ width: 24 }} />
            <Text style={s.primaryTxt}>Get Started</Text>
            <ArrowRight size={22} color="#FFFFFF" strokeWidth={2.2} />
          </Pressable>

          <Pressable
            onPress={() => router.push('/auth/login' as never)}
            style={({ pressed }) => [s.secondaryBtn, pressed && { opacity: 0.95 }]}
          >
            <User size={18} color="#0F172A" strokeWidth={2} />
            <Text style={s.secondaryTxt}>Log In</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  /* Layer 1 — truck background, with a long graceful fade into the page */
  bgWrap: {
    position: 'absolute' as const,
    top: 200, left: 0, right: 0,
    bottom: 160, // truck extends further down — fade closes the rest of the gap
    overflow: 'hidden' as const,
  },
  bgImage: {
    width: '100%',
    height: '100%',
  },
  bgFadeBottom: {
    position: 'absolute' as const,
    bottom: 0, left: 0, right: 0,
    height: 180, // long, gentle dissolve — no more empty gray block
  },

  /* Layer 2 — top wash (text-first hierarchy) */
  washTop: {
    position: 'absolute' as const,
    top: 0, left: 0, right: 0,
    height: '52%',
  },

  /* Layer 3 — solid clean band for the CTAs, no truck behind */
  ctaBand: {
    position: 'absolute' as const,
    bottom: 0, left: 0, right: 0,
    height: 150,
    backgroundColor: BG,
  },

  /* Layer 3 — UI */
  ui: { flex: 1 },

  topContent: {
    paddingTop: 24,
    paddingHorizontal: 24,
  },
  logoWrap: {
    width: 190,
    height: 76,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  headline: {
    fontFamily: FontFamily.bold,
    fontSize: 44,
    fontWeight: '900',
    color: NAVY,
    lineHeight: 52,
    letterSpacing: -1.2,
    marginTop: 40,
  },
  subtitle: {
    fontFamily: FontFamily.regular,
    fontSize: 15,
    color: SUB,
    lineHeight: 23,
    marginTop: 14,
    maxWidth: 460,
  },

  bottomContent: {
    marginTop: 'auto',
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 36,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: NAVY,
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 24,
  },
  primaryTxt: {
    fontFamily: FontFamily.semiBold,
    fontSize: 17,
    fontWeight: '700',
    color: WHITE,
    letterSpacing: -0.2,
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: WHITE,
    borderRadius: 16,
    paddingVertical: 20,
    marginTop: 12,
    borderWidth: 1, borderColor: BORDER,
  },
  secondaryTxt: {
    fontFamily: FontFamily.semiBold,
    fontSize: 17,
    fontWeight: '600',
    color: NAVY,
    letterSpacing: -0.2,
  },
});
