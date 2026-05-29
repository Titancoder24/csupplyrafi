import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Animated, KeyboardAvoidingView,
  Platform, Pressable, StyleSheet, Text, TextInput, View, Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Eye, EyeOff, Shield } from 'lucide-react-native';
import { supabase } from '@/services/supabase';
import { FontFamily } from '@/constants/theme';

const NAVY = '#0F172A';
const BLUE = '#0F4C81';

export default function SuperAdminLogin() {
  const router = useRouter();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [focused, setFocused]   = useState<'email' | 'pw' | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return;
      const { data: p } = await supabase
        .from('profiles').select('role').eq('id', session.user.id).maybeSingle();
      if (p?.role === 'super_admin') router.replace('/superadmin/dashboard' as never);
    });
  }, []);

  const shake = useRef(new Animated.Value(0)).current;
  function triggerShake() {
    Animated.sequence([
      Animated.timing(shake, { toValue: 8,  duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 6,  duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -6, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0,  duration: 60, useNativeDriver: true }),
    ]).start();
  }

  async function handleLogin() {
    setError('');
    if (!email.trim()) { setError('Email address is required.'); triggerShake(); return; }
    if (!password)     { setError('Password is required.');      triggerShake(); return; }

    setLoading(true);
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(), password,
      });
      if (authError) { setError(authError.message); triggerShake(); return; }

      const { data: profile } = await supabase
        .from('profiles').select('role').eq('id', data.user!.id).maybeSingle();
      if (profile?.role !== 'super_admin') {
        await supabase.auth.signOut();
        setError('Access denied. Super Admin credentials required.');
        triggerShake();
        return;
      }
      router.replace('/superadmin/dashboard' as never);
    } catch {
      setError('An unexpected error occurred. Please try again.');
      triggerShake();
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={s.root}>

      {/* ── Left brand panel ── */}
      <View style={s.left}>
        <View style={s.leftInner}>
          {/* Logo */}
          <View style={s.logoRow}>
            <View style={s.logoMark}>
              <Image
                source={require('../../assets/Logo_Ui.png')}
                style={s.logoImage}
                resizeMode="contain"
              />
            </View>
            <View style={s.logoText}>
              <Text style={s.logoName}>C-Supply</Text>
              <Text style={s.logoSub}>Administrator Portal</Text>
            </View>
          </View>

          <View style={s.divider} />

          <Text style={s.pitch}>
            Secure access for authorized administrators only.{'\n'}
            All sessions are monitored and logged.
          </Text>

          <View style={s.bullets}>
            {[
              'Real-time platform oversight',
              'Vendor & transporter management',
              'Order and logistics control',
              'User roles & access control',
            ].map(item => (
              <View key={item} style={s.bulletRow}>
                <View style={s.bulletDot} />
                <Text style={s.bulletText}>{item}</Text>
              </View>
            ))}
          </View>
        </View>

        <Text style={s.leftFooter}>C-Supply · Admin Portal · Restricted Access</Text>
      </View>

      {/* ── Right form panel ── */}
      <KeyboardAvoidingView
        style={s.right}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={s.rightInner}>
          <Animated.View style={[s.form, { transform: [{ translateX: shake }] }]}>

            {/* Form heading */}
            <View style={s.formHead}>
              <Shield size={20} color="#0F172A" strokeWidth={2} />
              <Text style={s.formTitle}>Sign in</Text>
            </View>
            <Text style={s.formSub}>
              Enter your administrator credentials to continue.
            </Text>

            {/* Email */}
            <View style={s.fieldGroup}>
              <Text style={s.fieldLabel}>Email address</Text>
              <TextInput
                style={[s.input, focused === 'email' && s.inputFocused]}
                value={email}
                onChangeText={v => { setEmail(v); setError(''); }}
                placeholder="admin@csupply.in"
                placeholderTextColor="#9CA3AF"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
                onFocus={() => setFocused('email')}
                onBlur={() => setFocused(null)}
              />
            </View>

            {/* Password */}
            <View style={s.fieldGroup}>
              <Text style={s.fieldLabel}>Password</Text>
              <View style={[s.inputRow, focused === 'pw' && s.inputFocused]}>
                <TextInput
                  style={s.inputInner}
                  value={password}
                  onChangeText={v => { setPassword(v); setError(''); }}
                  placeholder="Enter your password"
                  placeholderTextColor="#9CA3AF"
                  secureTextEntry={!showPw}
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                  onFocus={() => setFocused('pw')}
                  onBlur={() => setFocused(null)}
                />
                <Pressable onPress={() => setShowPw(p => !p)} hitSlop={8}>
                  {showPw
                    ? <EyeOff size={16} color="#0F172A" strokeWidth={2} />
                    : <Eye    size={16} color="#0F172A" strokeWidth={2} />
                  }
                </Pressable>
              </View>
            </View>

            {/* Error banner */}
            {error ? (
              <View style={s.errorBox}>
                <Text style={s.errorTxt}>{error}</Text>
              </View>
            ) : null}

            {/* Submit */}
            <Pressable
              onPress={handleLogin}
              disabled={loading}
              style={({ pressed }) => [s.btn, loading && s.btnDisabled, pressed && !loading && s.btnPressed]}
            >
              {loading
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={s.btnTxt}>Sign In</Text>
              }
            </Pressable>

            <View style={s.sep} />

            <Pressable onPress={() => router.replace('/' as never)} style={s.back}>
              <Text style={s.backTxt}>← Return to main application</Text>
            </Pressable>

          </Animated.View>
        </View>

        <Text style={s.rightFooter}>© 2024 C-Supply. All rights reserved.</Text>
      </KeyboardAvoidingView>

    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, flexDirection: 'row', backgroundColor: '#fff' },

  /* Left panel */
  left: {
    width: 400,
    backgroundColor: NAVY,
    paddingVertical: 48,
    paddingHorizontal: 40,
    justifyContent: 'space-between',
  },
  leftInner: { gap: 28 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 14, maxWidth: '100%' },
  logoMark: {
    width: 108, height: 76, borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
    overflow: 'hidden',
  },
  logoImage: { width: 88, height: 58 },
  logoText: { flex: 1, minWidth: 0 },
  logoLetter: { fontFamily: FontFamily.bold, fontSize: 22, color: '#fff' },
  logoName:   { fontFamily: FontFamily.bold, fontSize: 20, color: '#fff' },
  logoSub:    { fontFamily: FontFamily.regular, fontSize: 11, color: '#64748B', letterSpacing: 0.4 },
  divider:    { height: 1, backgroundColor: '#1E293B' },
  pitch: {
    fontFamily: FontFamily.regular, fontSize: 14,
    color: '#94A3B8', lineHeight: 22,
  },
  bullets: { gap: 12 },
  bulletRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bulletDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: BLUE, flexShrink: 0 },
  bulletText: { fontFamily: FontFamily.regular, fontSize: 13, color: '#94A3B8' },
  leftFooter: { fontFamily: FontFamily.regular, fontSize: 11, color: '#334155' },

  /* Right panel */
  right: {
    flex: 1, backgroundColor: '#F8FAFC',
    alignItems: 'center', justifyContent: 'center',
  },
  rightInner: { width: '100%', maxWidth: 420, paddingHorizontal: 40 },
  form: { gap: 0 },
  formHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  formTitle: { fontFamily: FontFamily.bold, fontSize: 22, color: '#111827' },
  formSub: {
    fontFamily: FontFamily.regular, fontSize: 14,
    color: '#6B7280', marginBottom: 28, lineHeight: 20,
  },

  /* Fields */
  fieldGroup: { marginBottom: 16 },
  fieldLabel: { fontFamily: FontFamily.medium, fontSize: 13, color: '#374151', marginBottom: 6 },
  input: {
    height: 44, backgroundColor: '#fff',
    borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8,
    paddingHorizontal: 12,
    fontFamily: FontFamily.regular, fontSize: 14, color: '#111827',
    // @ts-ignore web
    outlineStyle: 'none',
  },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    height: 44, backgroundColor: '#fff',
    borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8,
    paddingHorizontal: 12, gap: 8,
  },
  inputInner: {
    flex: 1, fontFamily: FontFamily.regular,
    fontSize: 14, color: '#111827',
    // @ts-ignore web
    outlineStyle: 'none',
  },
  inputFocused: {
    borderColor: BLUE,
    // @ts-ignore web
    boxShadow: '0 0 0 3px rgba(15,76,129,0.12)',
  },

  /* Error */
  errorBox: {
    backgroundColor: '#FEF2F2', borderWidth: 1,
    borderColor: '#FECACA', borderRadius: 6,
    paddingHorizontal: 12, paddingVertical: 10,
    marginBottom: 14,
  },
  errorTxt: { fontFamily: FontFamily.medium, fontSize: 13, color: '#DC2626' },

  /* Button */
  btn: {
    height: 44, borderRadius: 8,
    backgroundColor: BLUE,
    alignItems: 'center', justifyContent: 'center',
    marginTop: 4,
  },
  btnDisabled: { opacity: 0.6 },
  btnPressed:  { opacity: 0.85 },
  btnTxt: { fontFamily: FontFamily.semiBold, fontSize: 15, color: '#fff' },

  sep:     { height: 1, backgroundColor: '#E5E7EB', marginVertical: 20 },
  back:    { alignItems: 'center' },
  backTxt: { fontFamily: FontFamily.medium, fontSize: 13, color: '#6B7280' },

  rightFooter: {
    position: 'absolute' as never,
    bottom: 20, alignSelf: 'center',
    fontFamily: FontFamily.regular, fontSize: 11, color: '#9CA3AF',
  },
});
