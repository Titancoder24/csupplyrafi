import React, { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { ShoppingCart, Home, FileText, Boxes, IndianRupee, User, type LucideIcon } from 'lucide-react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useTheme } from '@/theme/ThemeProvider';
import { useVendorPopups } from '@/hooks/useVendorPopups';
import { useKycGate } from '@/hooks/useKycGate';
import { ActionPopup } from '@/components/ui/ActionPopup';
import { FontFamily } from '@/constants/theme';

const ORANGE_DK = '#EA580C';
const SURFACE   = '#FFFFFF';
const BORDER    = '#EDE6DC';
const INK_500   = '#64748B';

/** Routes where the tab bar should NOT render — setup / blocked states. */
const HIDE_TAB_ON = new Set(['welcome', 'onboarding', 'pending', 'rejected']);

export default function VendorLayout() {
  const { setSurface } = useTheme();
  useEffect(() => {
    setSurface('vendor');
  }, [setSurface]);
  useKycGate('vendor');

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1 }}>
        <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }} />
      </View>
      <VendorTabBar />
      <VendorActionPopupQueue />
    </View>
  );
}

/* ─── Persistent tab bar ──────────────────────────────────────────────────── */
type Tab = { key: string; label: string; Icon: LucideIcon; route: string };
const TABS: Tab[] = [
  { key: 'dashboard', label: 'Home',     Icon: Home,        route: '/vendor/dashboard' },
  { key: 'orders',    label: 'Orders',   Icon: FileText,    route: '/vendor/orders' },
  { key: 'products',  label: 'Stock',    Icon: Boxes,       route: '/vendor/products' },
  { key: 'earnings',  label: 'Earnings', Icon: IndianRupee, route: '/vendor/earnings' },
  { key: 'account',   label: 'Account',  Icon: User,        route: '/vendor/account' },
];

function VendorTabBar() {
  const router = useRouter();
  const segments = useSegments() as string[];
  const current = segments[1] ?? 'dashboard';

  if (HIDE_TAB_ON.has(current)) return null;

  return (
    <View style={s.bar}>
      {TABS.map(t => {
        const Icon   = t.Icon;
        const active = current === t.key;
        return (
          <Pressable
            key={t.key}
            onPress={() => router.push(t.route as never)}
            style={({ pressed }) => [s.itemOuter, pressed && { opacity: 0.7 }]}
            hitSlop={6}
          >
            <View style={[s.itemInner, active && s.itemActive]}>
              <Icon size={17} color={active ? ORANGE_DK : INK_500} strokeWidth={1.8} />
              <Text style={[s.label, active && s.labelActive]}>{t.label}</Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: SURFACE,
    borderTopWidth: 1, borderTopColor: BORDER,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 22 : 10,
    paddingHorizontal: 6,
    /* Soft floating shadow above the bar */
    shadowColor: '#0F172A',
    shadowOpacity: 0.04,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: -2 },
    elevation: 8,
  },
  itemOuter: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 2,
  },
  itemInner: {
    alignItems: 'center', justifyContent: 'center',
    gap: 3,
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1, borderColor: 'transparent',
  },
  itemActive: {
    backgroundColor: 'rgba(249,115,22,0.08)',
    borderColor: 'rgba(249,115,22,0.12)',
  },
  label:       { fontFamily: FontFamily.medium, fontSize: 10.5, color: INK_500, letterSpacing: 0.1 },
  labelActive: { fontFamily: FontFamily.semiBold, color: ORANGE_DK },
});

/* Mounted at layout level so popups fire on any vendor screen */
function VendorActionPopupQueue() {
  const { current, loading, approve, reject, later } = useVendorPopups();
  if (!current) return null;
  return (
    <ActionPopup
      visible
      icon={<ShoppingCart size={28} color="#1D4ED8" strokeWidth={2.2} />}
      iconBg="#EFF6FF"
      title="New Order Received"
      message={`Order #${current.orderNumber}${current.amount ? ` · ₹${current.amount.toLocaleString('en-IN')}` : ''} is awaiting your acceptance.`}
      primaryLabel="Accept & Broadcast"
      primaryColor="#15803D"
      secondaryLabel="Reject"
      onPrimary={approve}
      onSecondary={reject}
      onLater={later}
      loading={loading}
    />
  );
}
