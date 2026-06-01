import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet, SafeAreaView, StatusBar, Platform,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Bell, ChevronRight, History, LogOut,
  Phone, Mail, Store, ShieldCheck, HelpCircle, FileText,
  type LucideIcon,
} from 'lucide-react-native';
import { supabase } from '@/services/supabase';
import { useAuth } from '@/services/auth/AuthProvider';
import { FontFamily, Shadow } from '@/constants/theme';

/* ─── Palette (matches dashboard) ─────────────────────────────────────────── */
const ORANGE     = '#F97316';
const ORANGE_DK  = '#EA580C';
const ORANGE_BG  = '#FFF7ED';
const ORANGE_BR  = '#FED7AA';
const CREAM      = '#FAF7F3';
const SURFACE    = '#FFFFFF';
const BORDER     = '#EDE6DC';
const HAIRLINE   = '#F4ECE0';
const INK_900    = '#0F172A';
const INK_700    = '#334155';
const INK_500    = '#64748B';
const INK_400    = '#94A3B8';
const RED        = '#B91C1C';
const RED_BG     = '#FEF2F2';

type Counts = { products: number; ordersTotal: number; delivered: number };

export default function VendorAccount() {
  const router = useRouter();
  const { profile, signOut } = useAuth();

  const [shopName,    setShopName]    = useState('');
  const [businessGst, setBusinessGst] = useState<string | null>(null);
  const [city,        setCity]        = useState<string | null>(null);
  const [memberSince, setMemberSince] = useState<string | null>(null);
  const [counts,      setCounts]      = useState<Counts>({ products: 0, ordersTotal: 0, delivered: 0 });

  const load = useCallback(async () => {
    if (!profile?.id) return;
    const [vp, pCount, oCount, dCount] = await Promise.all([
      supabase.from('vendor_profiles')
        .select('business_name, shop_name, gst_number, city, created_at')
        .eq('id', profile.id).maybeSingle(),
      supabase.from('products').select('id', { count: 'exact', head: true })
        .eq('vendor_id', profile.id).is('deleted_at', null),
      supabase.from('orders').select('id', { count: 'exact', head: true })
        .eq('vendor_id', profile.id),
      supabase.from('orders').select('id', { count: 'exact', head: true })
        .eq('vendor_id', profile.id).eq('status', 'delivered'),
    ]);
    if (vp.data) {
      setShopName(vp.data.business_name ?? vp.data.shop_name ?? '');
      setBusinessGst(vp.data.gst_number ?? null);
      setCity(vp.data.city ?? null);
      setMemberSince(vp.data.created_at ?? null);
    }
    setCounts({
      products:    pCount.count ?? 0,
      ordersTotal: oCount.count ?? 0,
      delivered:   dCount.count ?? 0,
    });
  }, [profile?.id]);

  useEffect(() => { load(); }, [load]);

  const displayName = shopName || profile?.full_name || 'Vendor';
  const initial = (displayName || 'V').trim().charAt(0).toUpperCase();
  const vendorId = `VB${String(profile?.id ?? '00000').replace(/[^0-9]/g, '').slice(-5).padStart(5, '0') || '12345'}`;
  const memberLabel = memberSince
    ? new Date(memberSince).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
    : null;

  const handleSignOut = () => {
    const doIt = async () => {
      await signOut();
      router.replace('/auth/login' as never);
    };
    if (Platform.OS === 'web') {
      // RN's Alert is a no-op on web; use confirm() instead.
      // eslint-disable-next-line no-alert
      if (typeof window !== 'undefined' && window.confirm('Sign out of this device?')) doIt();
    } else {
      Alert.alert('Sign out?', 'You will need to log in again to access this account.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign out', style: 'destructive', onPress: doIt },
      ]);
    }
  };

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={ORANGE_DK} />

      {/* Gradient header */}
      <SafeAreaView style={s.headerArea}>
        <LinearGradient
          colors={[ORANGE, ORANGE_DK]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={s.headerInner}>
          <Text style={s.headerTitle}>Account</Text>
        </View>
      </SafeAreaView>

      <ScrollView
        style={s.body}
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile card */}
        <View style={s.profileCard}>
          <View style={s.avatar}>
            <Text style={s.avatarTxt}>{initial}</Text>
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={s.displayName} numberOfLines={1}>{displayName}</Text>
            <View style={s.idRow}>
              <Text style={s.vendorId}>ID · {vendorId}</Text>
              {profile?.verified !== false && (
                <View style={s.verifyPill}>
                  <Text style={s.verifyTxt}>Verified</Text>
                </View>
              )}
            </View>
            {memberLabel && <Text style={s.memberSince}>Member since {memberLabel}</Text>}
          </View>
        </View>

        {/* Quick stats */}
        <View style={s.statRow}>
          <StatTile value={String(counts.products)}    label="Products" />
          <StatTile value={String(counts.ordersTotal)} label="Orders" />
          <StatTile value={String(counts.delivered)}   label="Delivered" />
        </View>

        {/* Contact info */}
        <Section title="Contact">
          {profile?.phone ? (
            <InfoRow Icon={Phone} label="Phone" value={profile.phone} />
          ) : null}
          {profile?.email ? (
            <InfoRow Icon={Mail}  label="Email" value={profile.email} />
          ) : null}
          {city ? (
            <InfoRow Icon={Store} label="City"  value={city} last={!businessGst} />
          ) : null}
          {businessGst ? (
            <InfoRow Icon={ShieldCheck} label="GSTIN" value={businessGst} last />
          ) : null}
        </Section>

        {/* Activity */}
        <Section title="Activity">
          <LinkRow
            Icon={History}
            label="Order History"
            sub="Delivered orders and payouts"
            onPress={() => router.push('/vendor/orders?tab=delivered' as never)}
          />
          <LinkRow
            Icon={Bell}
            label="Notifications"
            sub="In-app and SMS alerts"
            onPress={() => router.push('/vendor/notifications' as never)}
            last
          />
        </Section>

        {/* Help */}
        <Section title="Help">
          <LinkRow
            Icon={HelpCircle}
            label="Support & Help"
            sub="Raise a ticket — orders, payouts, KYC"
            onPress={() => router.push('/vendor/support' as never)}
          />
          <LinkRow
            Icon={FileText}
            label="Terms & Privacy"
            sub="Read the legal docs"
            onPress={() => {}}
            last
          />
        </Section>

        {/* Sign out */}
        <Pressable
          onPress={handleSignOut}
          style={({ pressed }) => [s.signOutBtn, pressed && { opacity: 0.85 }]}
        >
          <View style={s.signOutIcon}>
            <LogOut size={16} color="#0F172A" strokeWidth={2.2} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.signOutLabel}>Sign out</Text>
            <Text style={s.signOutSub}>End your session on this device</Text>
          </View>
          <ChevronRight size={16} color="#0F172A" strokeWidth={2} />
        </Pressable>

        <Text style={s.versionTxt}>C-Supply Vendor · v1.0</Text>
        <View style={{ height: 12 }} />
      </ScrollView>
    </View>
  );
}

/* ─── Sub-components ──────────────────────────────────────────────────────── */
function StatTile({ value, label }: { value: string; label: string }) {
  return (
    <View style={stat.tile}>
      <Text style={stat.value}>{value}</Text>
      <Text style={stat.label}>{label}</Text>
    </View>
  );
}
const stat = StyleSheet.create({
  tile: {
    flex: 1, alignItems: 'center',
    backgroundColor: SURFACE,
    borderRadius: 12,
    borderWidth: 1, borderColor: BORDER,
    paddingVertical: 12, gap: 2,
  },
  value: { fontFamily: FontFamily.bold, fontSize: 18, color: INK_900, letterSpacing: -0.3 },
  label: { fontFamily: FontFamily.medium, fontSize: 10.5, color: INK_500, letterSpacing: 0.2 },
});

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={sec.wrap}>
      <Text style={sec.title}>{title.toUpperCase()}</Text>
      <View style={sec.card}>{children}</View>
    </View>
  );
}
const sec = StyleSheet.create({
  wrap: { gap: 8 },
  title: { fontFamily: FontFamily.medium, fontSize: 10, color: ORANGE_DK, letterSpacing: 1.6, paddingHorizontal: 4 },
  card: {
    backgroundColor: SURFACE,
    borderRadius: 14,
    borderWidth: 1, borderColor: BORDER,
    overflow: 'hidden',
    ...Shadow.sm,
  },
});

function InfoRow({ Icon, label, value, last }: {
  Icon: LucideIcon; label: string; value: string; last?: boolean;
}) {
  return (
    <View style={[info.row, !last && info.rowDivider]}>
      <View style={info.iconWrap}>
        <Icon size={14} color="#0F172A" strokeWidth={2} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={info.label}>{label}</Text>
        <Text style={info.value} numberOfLines={1}>{value}</Text>
      </View>
    </View>
  );
}
const info = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 13 },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: HAIRLINE },
  iconWrap: {
    width: 32, height: 32, borderRadius: 9,
    backgroundColor: '#F1F5F9',
    alignItems: 'center', justifyContent: 'center',
  },
  label: { fontFamily: FontFamily.medium, fontSize: 11, color: INK_500, letterSpacing: 0.2 },
  value: { fontFamily: FontFamily.semiBold, fontSize: 13.5, color: INK_900, letterSpacing: -0.1, marginTop: 2 },
});

function LinkRow({ Icon, label, sub, onPress, last }: {
  Icon: LucideIcon; label: string; sub?: string; onPress: () => void; last?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        info.row,
        !last && info.rowDivider,
        pressed && { backgroundColor: HAIRLINE },
      ]}
    >
      <View style={[info.iconWrap, { backgroundColor: ORANGE_BG }]}>
        <Icon size={15} color="#0F172A" strokeWidth={2} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={info.value}>{label}</Text>
        {sub && <Text style={link.sub}>{sub}</Text>}
      </View>
      <ChevronRight size={15} color="#0F172A" strokeWidth={2} />
    </Pressable>
  );
}
const link = StyleSheet.create({
  sub: { fontFamily: FontFamily.regular, fontSize: 11.5, lineHeight: 15, color: INK_500, marginTop: 2 },
});

/* ─── Styles ──────────────────────────────────────────────────────────────── */
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: CREAM },

  /* Header */
  headerArea: { backgroundColor: ORANGE, paddingBottom: 26 },
  headerInner: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'web' ? 14 : 8,
    paddingBottom: 4,
  },
  headerTitle: { fontFamily: FontFamily.semiBold, fontSize: 19, color: '#fff', letterSpacing: -0.3 },

  /* Body */
  body: {
    flex: 1, backgroundColor: CREAM,
    borderTopLeftRadius: 22, borderTopRightRadius: 22,
    marginTop: -18,
  },
  scroll: { padding: 14, paddingTop: 18, gap: 18, paddingBottom: 28 },

  /* Profile card */
  profileCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: SURFACE,
    borderRadius: 16,
    borderWidth: 1, borderColor: BORDER,
    padding: 16,
    ...Shadow.sm,
  },
  avatar: {
    width: 60, height: 60, borderRadius: 18,
    backgroundColor: ORANGE_BG, borderWidth: 1.5, borderColor: ORANGE_BR,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarTxt: { fontFamily: FontFamily.bold, fontSize: 24, color: ORANGE_DK, letterSpacing: -0.5 },
  displayName: { fontFamily: FontFamily.semiBold, fontSize: 17, color: INK_900, letterSpacing: -0.3 },
  idRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  vendorId: { fontFamily: FontFamily.regular, fontSize: 11.5, color: INK_500, letterSpacing: 0.1 },
  verifyPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#F0FDF4', borderWidth: 1, borderColor: '#BBF7D0',
    borderRadius: 99, paddingHorizontal: 8, paddingVertical: 2.5,
  },
  verifyTxt: { fontFamily: FontFamily.semiBold, fontSize: 10, color: '#15803D', letterSpacing: 0.3 },
  memberSince: { fontFamily: FontFamily.regular, fontSize: 11.5, color: INK_400, marginTop: 2 },

  /* Stats row */
  statRow: { flexDirection: 'row', gap: 10 },

  /* Sign out */
  signOutBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: SURFACE,
    borderRadius: 14,
    borderWidth: 1, borderColor: '#FECACA',
    padding: 14,
  },
  signOutIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: RED_BG, alignItems: 'center', justifyContent: 'center',
  },
  signOutLabel: { fontFamily: FontFamily.semiBold, fontSize: 14, color: RED, letterSpacing: -0.1 },
  signOutSub:   { fontFamily: FontFamily.regular,  fontSize: 11.5, color: INK_500, marginTop: 2 },

  versionTxt: {
    fontFamily: FontFamily.regular, fontSize: 11, color: INK_400,
    textAlign: 'center', marginTop: 6, letterSpacing: 0.2,
  },
});
