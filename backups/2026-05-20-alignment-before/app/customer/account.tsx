import React, { useState } from 'react';
import {
  View, Text, Pressable, ScrollView, StyleSheet, Platform, StatusBar, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ChevronRight, LogOut, User, MapPin, Bell,
  ShieldCheck, FileText, HelpCircle,
} from 'lucide-react-native';
import { FontFamily } from '@/constants/theme';
import { useAuth } from '@/services/auth/AuthProvider';

// ── Design tokens ─────────────────────────────────────────────────────────
const BG      = '#F8FAFC';
const SURFACE = '#FFFFFF';
const BORDER  = '#E2E8F0';
const TEXT    = '#0F172A';
const TEXTSUB = '#334155';
const MUTED   = '#64748B';
const PRIMARY = '#1D4ED8';
const PRIMLT  = '#EFF6FF';

const PT = Platform.OS === 'ios' ? 56 : 36;

// ── Menu config ───────────────────────────────────────────────────────────
const MENU_GROUPS = [
  {
    title: 'Account',
    rows: [
      { key: 'profile',   label: 'My Profile',       sub: 'Name, phone, email',        Icon: User,      color: PRIMARY,   colorLt: PRIMLT    },
      { key: 'addresses', label: 'Saved Addresses',   sub: 'Manage delivery locations', Icon: MapPin,    color: '#15803D', colorLt: '#F0FDF4' },
    ],
  },
  {
    title: 'Preferences',
    rows: [
      { key: 'notifications', label: 'Notifications',      sub: 'Order updates & alerts', Icon: Bell,       color: '#7C3AED', colorLt: '#F5F3FF' },
      { key: 'security',      label: 'Security & Passcode', sub: 'PIN, biometrics',        Icon: ShieldCheck,color: '#B45309', colorLt: '#FFFBEB' },
    ],
  },
  {
    title: 'Business',
    rows: [
      { key: 'invoices', label: 'Invoices & GST', sub: 'Download tax invoices', Icon: FileText,  color: '#0F766E', colorLt: '#F0FDFA' },
      { key: 'support',  label: 'Help & Support', sub: '24/7 customer support', Icon: HelpCircle,color: '#475569', colorLt: BG        },
    ],
  },
];

// ── Screen ────────────────────────────────────────────────────────────────
export default function Account() {
  const router = useRouter();
  const { profile, signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await signOut();
    } catch {
      /* still navigate away */
    }
    // Force a hard navigation on web — Expo Router's router.replace from a
    // Tabs screen to an outside route can no-op silently on web.
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.location.replace('/auth/login');
      return;
    }
    router.replace('/auth/login' as never);
  }

  const name     = profile?.full_name ?? 'C-Supply Customer';
  const phone    = profile?.phone ?? '—';
  const initials = name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor={SURFACE} />

      {/* ── Header ── */}
      <View style={s.header}>
        <Text style={s.headerTitle}>Account</Text>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Profile card ── */}
        <View style={s.profileCard}>
          <View style={s.avatarBox}>
            <Text style={s.avatarTxt}>{initials}</Text>
          </View>
          <View style={{ flex: 1, gap: 3 }}>
            <Text style={s.profileName}>{name}</Text>
            <Text style={s.profilePhone}>{phone}</Text>
          </View>
          <Pressable style={s.editBtn} onPress={() => router.push('/customer/profile')}>
            <Text style={s.editBtnTxt}>Edit</Text>
          </Pressable>
        </View>

        {/* ── Menu groups ── */}
        {MENU_GROUPS.map((group) => (
          <View key={group.title} style={s.group}>
            <Text style={s.groupLabel}>{group.title}</Text>
            <View style={s.groupCard}>
              {group.rows.map((row, idx) => (
                <Pressable
                  key={row.key}
                  style={[s.menuRow, idx < group.rows.length - 1 && s.menuRowBorder]}
                  onPress={() => router.push(`/customer/${row.key}` as never)}
                >
                  <View style={[s.menuIconBox, { backgroundColor: row.colorLt }]}>
                    <row.Icon size={18} color="#0F172A" strokeWidth={1.8} />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={s.menuLabel}>{row.label}</Text>
                    <Text style={s.menuSub}>{row.sub}</Text>
                  </View>
                  <ChevronRight size={16} color="#0F172A" strokeWidth={2} />
                </Pressable>
              ))}
            </View>
          </View>
        ))}

        {/* ── Sign out ── */}
        <Pressable
          style={({ pressed }) => [s.logoutBtn, pressed && { opacity: 0.85 }]}
          onPress={handleSignOut}
          disabled={signingOut}
          hitSlop={8}
        >
          {signingOut
            ? <ActivityIndicator size="small" color="#B91C1C" />
            : <LogOut size={17} color="#0F172A" strokeWidth={1.8} />}
          <Text style={s.logoutTxt}>{signingOut ? 'Signing out…' : 'Sign Out'}</Text>
        </Pressable>

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  header: {
    paddingHorizontal: 20, paddingTop: PT, paddingBottom: 14,
    backgroundColor: SURFACE, borderBottomWidth: 1, borderBottomColor: BORDER,
  },
  headerTitle: { fontFamily: FontFamily.bold, fontSize: 22, color: TEXT, letterSpacing: -0.4 },

  scroll: { padding: 16, gap: 16, paddingBottom: 120 },

  profileCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: SURFACE, borderRadius: 14,
    borderWidth: 1, borderColor: BORDER, padding: 16,
    shadowColor: TEXT, shadowOpacity: 0.05, shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  avatarBox: {
    width: 58, height: 58, borderRadius: 29,
    backgroundColor: PRIMARY, alignItems: 'center', justifyContent: 'center',
  },
  avatarTxt:    { fontFamily: FontFamily.bold, fontSize: 20, color: '#FFFFFF' },
  profileName:  { fontFamily: FontFamily.bold, fontSize: 16.5, color: TEXT },
  profilePhone: { fontFamily: FontFamily.regular, fontSize: 13, color: MUTED },
  editBtn: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 99, borderWidth: 1, borderColor: BORDER, backgroundColor: BG,
  },
  editBtnTxt: { fontFamily: FontFamily.semiBold, fontSize: 12.5, color: TEXTSUB },

  group:      { gap: 8 },
  groupLabel: {
    fontFamily: FontFamily.semiBold, fontSize: 11, color: MUTED,
    textTransform: 'uppercase', letterSpacing: 0.9, marginLeft: 4,
  },
  groupCard: {
    backgroundColor: SURFACE, borderRadius: 14,
    borderWidth: 1, borderColor: BORDER, overflow: 'hidden',
    shadowColor: TEXT, shadowOpacity: 0.04, shadowRadius: 8,
    shadowOffset: { width: 0, height: 1 }, elevation: 1,
  },
  menuRow:       { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 },
  menuRowBorder: { borderBottomWidth: 1, borderBottomColor: BORDER },
  menuIconBox:   { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  menuLabel:     { fontFamily: FontFamily.semiBold, fontSize: 14.5, color: TEXT },
  menuSub:       { fontFamily: FontFamily.regular, fontSize: 11.5, color: MUTED },

  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 14,
    backgroundColor: '#FEF2F2', borderRadius: 12,
    borderWidth: 1, borderColor: '#FECACA',
  },
  logoutTxt: { fontFamily: FontFamily.semiBold, fontSize: 14, color: '#B91C1C' },
});
