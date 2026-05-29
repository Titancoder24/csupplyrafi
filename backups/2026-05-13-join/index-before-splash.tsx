import React, { useEffect } from 'react';
import {
  View, Text, Pressable, StyleSheet,
  Dimensions, SafeAreaView, Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowRight, User, Shield, Zap, Headphones, CheckCircle2 } from 'lucide-react-native';
import { useAuth } from '@/services/auth/AuthProvider';
import { Colors, FontFamily, Radius } from '@/constants/theme';

const { height } = Dimensions.get('window');

export default function SplashScreen() {
  const router = useRouter();
  const { session, profile, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
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
  }, [loading, session, profile, router]);

  return (
    <View style={styles.root}>
      {/* Full-screen background image */}
      <Image
        source={require('../assets/bg.png')}
        style={styles.bgImage}
        resizeMode="cover"
      />

      {/* Dark gradient overlay */}
      <LinearGradient
        colors={[
          'rgba(10,30,70,0.78)',
          'rgba(10,30,70,0.45)',
          'rgba(10,30,70,0.62)',
          'rgba(10,30,70,0.92)',
        ]}
        locations={[0, 0.35, 0.65, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Logo pinned near top */}
      <View style={styles.logoBlock}>
        <Image
          source={require('../assets/Logo_Ui.png')}
          style={styles.brandLogo}
          resizeMode="contain"
        />
      </View>

      {/* Tagline sits just below the logo */}
      <View style={styles.taglineBlock}>
        <Text style={styles.taglineBig}>Build Faster.{'\n'}Build Better.</Text>
        <Text style={styles.taglineSub}>
          Your trusted construction supply{'\n'}partner, anytime, anywhere.
        </Text>
      </View>

      <SafeAreaView style={styles.bottomSafe}>
        {/* CTAs */}
        <View style={styles.buttons}>
          <Pressable
            style={({ pressed }) => [styles.btnPrimary, pressed && { opacity: 0.88 }]}
            onPress={() => router.push('/join' as never)}
          >
            <View style={styles.btnIconCircle}>
              <ArrowRight size={16} color={Colors.white} strokeWidth={2.5} />
            </View>
            <Text style={styles.btnPrimaryText}>Get Started</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.btnSecondary, pressed && { opacity: 0.88 }]}
            onPress={() => router.push('/auth/login')}
          >
            <View style={styles.btnIconCircleOutline}>
              <User size={15} color={Colors.white} strokeWidth={2.2} />
            </View>
            <Text style={styles.btnSecondaryText}>Login / Sign Up</Text>
          </Pressable>
        </View>

        {/* Feature pills */}
        <View style={styles.featureRow}>
          <View style={styles.featureCard}>
            <View style={[styles.featureIcon, { backgroundColor: '#1E3A8A' }]}>
              <Shield size={18} color="#60A5FA" strokeWidth={1.9} />
            </View>
            <Text style={styles.featureLabel}>Secure & Safe</Text>
            <Text style={styles.featureSub}>100% secure{'\n'}transactions</Text>
          </View>
          <View style={styles.featureCard}>
            <View style={[styles.featureIcon, { backgroundColor: '#7C2D12' }]}>
              <Zap size={18} color="#FB923C" strokeWidth={1.9} />
            </View>
            <Text style={styles.featureLabel}>Quick & Easy</Text>
            <Text style={styles.featureSub}>Simple ordering{'\n'}system</Text>
          </View>
          <View style={styles.featureCard}>
            <View style={[styles.featureIcon, { backgroundColor: '#4C1D95' }]}>
              <Headphones size={18} color="#C084FC" strokeWidth={1.9} />
            </View>
            <Text style={styles.featureLabel}>24/7 Support</Text>
            <Text style={styles.featureSub}>We're here to{'\n'}help you</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <CheckCircle2 size={12} color="#22C55E" strokeWidth={2} />
          <Text style={styles.footerText}>You are on a 100% secure website</Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.primary },

  bgImage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    top: 0,
    left: 0,
  },

  logoBlock: {
    alignItems: 'center',
    paddingTop: height * 0.06,
  },
  taglineBlock: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 6,
    gap: 8,
  },

  brandLogo: {
    width: 320,
    height: 170,
  },

  taglineBig: {
    fontFamily: FontFamily.bold,
    fontSize: 32,
    lineHeight: 38,
    color: Colors.white,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  taglineSub: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    color: 'rgba(255,255,255,0.70)',
    textAlign: 'center',
    lineHeight: 20,
  },

  bottomSafe: { backgroundColor: 'transparent', marginTop: 'auto' },

  buttons: {
    paddingHorizontal: 24,
    paddingTop: 22,
    paddingBottom: 6,
    gap: 12,
    width: '100%',
  },

  btnPrimary: {
    height: 54,
    backgroundColor: Colors.orange,
    borderRadius: Radius.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  btnIconCircle: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: '#EA580C',
    alignItems: 'center', justifyContent: 'center',
  },
  btnPrimaryText: {
    fontFamily: FontFamily.bold,
    fontSize: 16,
    color: Colors.white,
    letterSpacing: 0.3,
  },

  btnSecondary: {
    height: 54,
    backgroundColor: '#0F2447',
    borderRadius: Radius.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#1E3A5F',
  },
  btnIconCircleOutline: {
    width: 26, height: 26, borderRadius: 13,
    borderWidth: 1, borderColor: '#3B5680',
    alignItems: 'center', justifyContent: 'center',
  },
  btnSecondaryText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 16,
    color: Colors.white,
    letterSpacing: 0.3,
  },

  featureRow: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    gap: 10,
    marginTop: 14,
    marginBottom: 12,
  },
  featureCard: {
    flex: 1,
    backgroundColor: '#0F2447',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: '#1E3A5F',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 6,
    gap: 6,
  },
  featureIcon: {
    width: 34, height: 34, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  featureLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: 12,
    color: Colors.white,
    textAlign: 'center',
  },
  featureSub: {
    fontFamily: FontFamily.regular,
    fontSize: 10,
    color: 'rgba(255,255,255,0.55)',
    textAlign: 'center',
    lineHeight: 13,
  },

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingBottom: 24,
  },
  footerText: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    color: 'rgba(255,255,255,0.50)',
  },
});
