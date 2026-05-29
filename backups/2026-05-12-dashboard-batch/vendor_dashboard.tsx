import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet, Modal,
  SafeAreaView, StatusBar, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Bell, Menu, ShieldCheck, ChevronRight,
  ShoppingCart, Tag, Package2, ClipboardList,
  CalendarClock, CheckCircle2, BarChart2, MoreHorizontal,
  Home, ListOrdered, Boxes, LayoutGrid, TrendingUp, TrendingDown,
  IndianRupee, Truck, LogOut, History, X,
} from 'lucide-react-native';
import { supabase } from '@/services/supabase';
import { useAuth } from '@/services/auth/AuthProvider';
import { formatINR } from '@/lib/format';
import { useNotifications } from '@/hooks/useNotifications';
import { FontFamily, Semantic, Ink } from '@/constants/theme';

const HEADER_GREEN = '#1A5C30';
const ICON_COLOR   = '#1A5C30';

type Stats = {
  todayOrders: number;
  yesterdayOrders: number;
  pendingOrders: number;
  yesterdayPending: number;
  todayRevenue: number;
  yesterdayRevenue: number;
  lowStockItems: number;
};

const ZERO: Stats = {
  todayOrders: 0, yesterdayOrders: 0,
  pendingOrders: 0, yesterdayPending: 0,
  todayRevenue: 0, yesterdayRevenue: 0,
  lowStockItems: 0,
};

const ACTIONS = [
  { route: '/vendor/products',  label: 'Add\nProduct',    Icon: ShoppingCart },
  { route: '/vendor/products',  label: 'Update\nPrice',   Icon: Tag },
  { route: '/vendor/products',  label: 'Update\nStock',   Icon: Package2 },
  { route: '/vendor/orders',    label: 'Orders',          Icon: ClipboardList },
  { route: '/vendor/transport', label: 'Book\nTransport', Icon: Truck },
  { route: '/vendor/orders',    label: 'Accept\nOrders',  Icon: CheckCircle2 },
  { route: '/vendor/products',  label: 'Analytics',       Icon: BarChart2 },
  { route: '/vendor/products',  label: 'More',            Icon: MoreHorizontal },
];

const TABS = [
  { key: 'home',     label: 'Home',     Icon: Home,        route: '/vendor/dashboard' },
  { key: 'orders',   label: 'Orders',   Icon: ListOrdered, route: '/vendor/orders' },
  { key: 'products', label: 'Products', Icon: Package2,    route: '/vendor/products' },
  { key: 'stock',    label: 'Stock',    Icon: Boxes,       route: '/vendor/products' },
  { key: 'more',     label: 'More',     Icon: LayoutGrid,  route: '/vendor/dashboard' },
];

function trend(today: number, yesterday: number) {
  if (yesterday === 0) return null;
  const pct = Math.round(((today - yesterday) / yesterday) * 100);
  return pct;
}

export default function VendorDashboard() {
  const router  = useRouter();
  const { profile, signOut } = useAuth();
  const { unreadCount } = useNotifications();
  const [stats, setStats]   = useState<Stats>(ZERO);
  const [shopName, setShopName] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleSignOut() {
    setMenuOpen(false);
    await signOut();
    router.replace('/auth/login' as never);
  }

  const fetchStats = useCallback(async () => {
    if (!profile?.id) return;

    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const yestStart  = new Date(todayStart); yestStart.setDate(yestStart.getDate() - 1);

    const [vp, todayOrd, yestOrd, pendOrd, yestPend, rev, yestRev, lowStock] =
      await Promise.all([
        supabase.from('vendor_profiles').select('shop_name').eq('id', profile.id).maybeSingle(),

        supabase.from('orders').select('id', { count: 'exact', head: true })
          .eq('vendor_id', profile.id).gte('created_at', todayStart.toISOString()),

        supabase.from('orders').select('id', { count: 'exact', head: true })
          .eq('vendor_id', profile.id)
          .gte('created_at', yestStart.toISOString())
          .lt('created_at', todayStart.toISOString()),

        supabase.from('orders').select('id', { count: 'exact', head: true })
          .eq('vendor_id', profile.id).in('status', ['placed', 'vendor_pending']),

        supabase.from('orders').select('id', { count: 'exact', head: true })
          .eq('vendor_id', profile.id).in('status', ['placed', 'vendor_pending'])
          .gte('created_at', yestStart.toISOString())
          .lt('created_at', todayStart.toISOString()),

        supabase.from('orders').select('total_amount')
          .eq('vendor_id', profile.id).eq('status', 'delivered')
          .gte('created_at', todayStart.toISOString()),

        supabase.from('orders').select('total_amount')
          .eq('vendor_id', profile.id).eq('status', 'delivered')
          .gte('created_at', yestStart.toISOString())
          .lt('created_at', todayStart.toISOString()),

        supabase.from('products').select('id', { count: 'exact', head: true })
          .eq('vendor_id', profile.id).not('low_stock_threshold', 'is', null)
          .filter('stock_qty', 'lte', 'low_stock_threshold'),
      ]);

    if (vp.data?.shop_name) setShopName(vp.data.shop_name);

    const sumRev  = (arr: any[]) => (arr ?? []).reduce((s, o) => s + (o.total_amount ?? 0), 0);

    setStats({
      todayOrders:    todayOrd.count  ?? 0,
      yesterdayOrders: yestOrd.count  ?? 0,
      pendingOrders:  pendOrd.count   ?? 0,
      yesterdayPending: yestPend.count ?? 0,
      todayRevenue:   sumRev(rev.data  ?? []),
      yesterdayRevenue: sumRev(yestRev.data ?? []),
      lowStockItems:  lowStock.count  ?? 0,
    });
  }, [profile?.id]);

  useEffect(() => {
    fetchStats();
    if (!profile?.id) return;
    const suffix = Math.random().toString(36).slice(2, 10);
    const ch = supabase.channel(`vd-rt:${profile.id}:${suffix}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders',   filter: `vendor_id=eq.${profile.id}` }, fetchStats)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products', filter: `vendor_id=eq.${profile.id}` }, fetchStats)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [profile?.id, fetchStats]);

  const displayName = shopName || profile?.full_name || 'Vendor';
  const vendorId    = `VEN-${new Date().getFullYear()}-${String(profile?.id ?? '').slice(-5).toUpperCase() || '00000'}`;

  const todayTrend   = trend(stats.todayOrders,   stats.yesterdayOrders);
  const pendTrend    = trend(stats.pendingOrders,  stats.yesterdayPending);
  const revTrend     = trend(stats.todayRevenue,   stats.yesterdayRevenue);

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={HEADER_GREEN} />

      {/* ── Green header ── */}
      <SafeAreaView style={s.header}>
        <View style={s.headerRow}>
          <Pressable style={s.iconBtn} onPress={() => setMenuOpen(true)}>
            <Menu size={22} color="#fff" strokeWidth={2} />
          </Pressable>

          <View style={s.headerCenter}>
            <Text style={s.welcomeSub}>Welcome back,</Text>
            <Text style={s.welcomeName} numberOfLines={1}>{displayName}</Text>
            <Text style={s.vendorId}>{vendorId}</Text>
          </View>

          <Pressable style={s.iconBtn} onPress={() => router.push('/vendor/notifications' as never)}>
            <Bell size={22} color="#fff" strokeWidth={2} />
            {unreadCount > 0 && <View style={s.dot} />}
          </Pressable>
        </View>
      </SafeAreaView>

      {/* ── White body card ── */}
      <View style={s.body}>
        <ScrollView
          contentContainerStyle={s.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* Overview */}
          <Text style={s.sectionTitle}>Overview</Text>
          <View style={s.kpiGrid}>
            <KpiCard
              label="Today Orders"
              value={String(stats.todayOrders)}
              trend={todayTrend}
              bg="#EFF9F2" circleBg="#C8E6C9" iconColor="#2E7D32"
              Icon={ShoppingCart}
            />
            <KpiCard
              label="Pending Orders"
              value={String(stats.pendingOrders)}
              trend={pendTrend}
              bg="#FFF6EE" circleBg="#FFE0B2" iconColor="#E65100"
              Icon={ClipboardList}
            />
            <KpiCard
              label="Revenue (Today)"
              value={formatINR(stats.todayRevenue)}
              trend={revTrend}
              bg="#F0EEF9" circleBg="#D1C4E9" iconColor="#6A1B9A"
              Icon={IndianRupee}
            />
            <LowStockCard
              value={stats.lowStockItems}
              onPress={() => router.push('/vendor/products' as never)}
            />
          </View>

          {/* Quick Actions */}
          <Text style={[s.sectionTitle, { marginTop: 8 }]}>Quick Actions</Text>
          <View style={s.actionGrid}>
            {ACTIONS.map((a, i) => {
              const Icon = a.Icon;
              return (
                <Pressable
                  key={i}
                  style={({ pressed }) => [s.actionCard, pressed && { opacity: 0.75 }]}
                  onPress={() => router.push(a.route as never)}
                >
                  <Icon size={24} color={ICON_COLOR} strokeWidth={1.8} />
                  <Text style={s.actionLabel}>{a.label}</Text>
                </Pressable>
              );
            })}
          </View>

          {/* Verification banner */}
          <Pressable style={s.verifyCard}>
            <View style={s.verifyIconWrap}>
              <ShieldCheck size={24} color={HEADER_GREEN} strokeWidth={1.8} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.verifyTitle}>Verification in Progress</Text>
              <Text style={s.verifySub}>We will notify you once your account is verified.</Text>
            </View>
            <ChevronRight size={18} color={HEADER_GREEN} strokeWidth={2} />
          </Pressable>

          <View style={{ height: 16 }} />
        </ScrollView>
      </View>

      {/* ── Menu drawer modal ── */}
      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <Pressable style={menuStyles.backdrop} onPress={() => setMenuOpen(false)}>
          <Pressable style={menuStyles.sheet} onPress={() => {}}>
            <View style={menuStyles.header}>
              <View>
                <Text style={menuStyles.title}>{shopName || profile?.full_name || 'Vendor'}</Text>
                <Text style={menuStyles.sub}>{profile?.phone || profile?.email}</Text>
              </View>
              <Pressable onPress={() => setMenuOpen(false)} hitSlop={10}>
                <X size={20} color={Ink[500]} strokeWidth={2} />
              </Pressable>
            </View>

            <View style={menuStyles.section}>
              <Pressable
                style={menuStyles.item}
                onPress={() => { setMenuOpen(false); router.push('/vendor/orders?tab=delivered' as never); }}
              >
                <View style={[menuStyles.itemIcon, { backgroundColor: '#EFF6FF' }]}>
                  <History size={18} color="#1D4ED8" strokeWidth={2} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={menuStyles.itemLabel}>Order History</Text>
                  <Text style={menuStyles.itemSub}>View delivered orders and earnings</Text>
                </View>
                <ChevronRight size={16} color={Ink[400]} strokeWidth={2} />
              </Pressable>

              <Pressable
                style={menuStyles.item}
                onPress={() => { setMenuOpen(false); router.push('/vendor/notifications' as never); }}
              >
                <View style={[menuStyles.itemIcon, { backgroundColor: '#FFFBEB' }]}>
                  <Bell size={18} color={Semantic.warningFg} strokeWidth={2} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={menuStyles.itemLabel}>Notifications</Text>
                  <Text style={menuStyles.itemSub}>{unreadCount > 0 ? `${unreadCount} unread` : 'View all notifications'}</Text>
                </View>
                <ChevronRight size={16} color={Ink[400]} strokeWidth={2} />
              </Pressable>

              <Pressable style={menuStyles.itemDanger} onPress={handleSignOut}>
                <View style={[menuStyles.itemIcon, { backgroundColor: Semantic.dangerBg }]}>
                  <LogOut size={18} color={Semantic.dangerFg} strokeWidth={2} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[menuStyles.itemLabel, { color: Semantic.dangerFg }]}>Sign Out</Text>
                  <Text style={menuStyles.itemSub}>End your session on this device</Text>
                </View>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Bottom tab bar ── */}
      <View style={s.tabBar}>
        {TABS.map((t, i) => {
          const Icon    = t.Icon;
          const active  = i === 0;
          return (
            <Pressable
              key={t.key}
              style={s.tabItem}
              onPress={() => router.push(t.route as never)}
            >
              <Icon size={22} color={active ? HEADER_GREEN : '#9CA3AF'} strokeWidth={active ? 2.2 : 1.8} />
              <Text style={[s.tabLabel, active && s.tabLabelActive]}>{t.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// ── KPI card ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, trend, bg, circleBg, iconColor, Icon }: {
  label: string; value: string; trend: number | null;
  bg: string; circleBg: string; iconColor: string; Icon: any;
}) {
  const up = (trend ?? 0) >= 0;
  return (
    <View style={[kpi.card, { backgroundColor: bg }]}>
      <View style={[kpi.circle, { backgroundColor: circleBg }]}>
        <Icon size={20} color={iconColor} strokeWidth={1.8} />
      </View>
      <Text style={kpi.label}>{label}</Text>
      <Text style={kpi.value}>{value}</Text>
      {trend !== null && (
        <View style={kpi.trendRow}>
          {up
            ? <TrendingUp size={12} color="#16A34A" strokeWidth={2} />
            : <TrendingDown size={12} color="#EA580C" strokeWidth={2} />
          }
          <Text style={[kpi.trendText, { color: up ? '#16A34A' : '#EA580C' }]}>
            {up ? '+' : ''}{trend}% vs yesterday
          </Text>
        </View>
      )}
    </View>
  );
}

function LowStockCard({ value, onPress }: { value: number; onPress: () => void }) {
  return (
    <View style={[kpi.card, { backgroundColor: '#FFF0F0' }]}>
      <View style={[kpi.circle, { backgroundColor: '#FFCDD2' }]}>
        <Package2 size={20} color="#B71C1C" strokeWidth={1.8} />
      </View>
      <Text style={kpi.label}>Low Stock Items</Text>
      <Text style={[kpi.value, { color: '#B71C1C' }]}>{value}</Text>
      <Pressable onPress={onPress} style={kpi.trendRow}>
        <Text style={{ fontSize: 12, color: '#B71C1C', fontFamily: FontFamily.semiBold }}>
          View items
        </Text>
        <ChevronRight size={12} color="#B71C1C" strokeWidth={2.5} />
      </Pressable>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: HEADER_GREEN },

  header:     { backgroundColor: HEADER_GREEN },
  headerRow:  { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 8 },
  iconBtn:    { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, alignItems: 'center' },
  welcomeSub: { fontFamily: FontFamily.regular, fontSize: 12, color: 'rgba(255,255,255,0.80)' },
  welcomeName:{ fontFamily: FontFamily.bold, fontSize: 20, color: '#fff', marginTop: -2 },
  vendorId:   { fontFamily: FontFamily.regular, fontSize: 11, color: 'rgba(255,255,255,0.65)', marginTop: 1 },
  dot: {
    position: 'absolute', top: 6, right: 6,
    width: 9, height: 9, borderRadius: 5,
    backgroundColor: '#F97316', borderWidth: 1.5, borderColor: '#fff',
  },

  body: {
    flex: 1, backgroundColor: '#fff',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  scroll: { paddingHorizontal: 18, paddingTop: 22, paddingBottom: 24 },

  sectionTitle: { fontFamily: FontFamily.bold, fontSize: 16, color: '#111827', marginBottom: 14 },

  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 4 },

  actionGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    gap: 10, marginBottom: 20,
  },
  actionCard: {
    width: '22%', flex: 1,
    minWidth: '22%',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1, borderColor: '#E5E7EB',
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, paddingHorizontal: 4,
    gap: 8,
  },
  actionLabel: {
    fontFamily: FontFamily.medium, fontSize: 10.5,
    color: '#374151', textAlign: 'center', lineHeight: 15,
  },

  verifyCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#F0FAF4',
    borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: '#BBF7D0',
  },
  verifyIconWrap: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: '#D1FAE5',
    alignItems: 'center', justifyContent: 'center',
  },
  verifyTitle: { fontFamily: FontFamily.bold, fontSize: 14, color: HEADER_GREEN },
  verifySub:   { fontFamily: FontFamily.regular, fontSize: 12, color: '#6B7280', marginTop: 2 },

  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: 1, borderTopColor: '#F3F4F6',
    paddingBottom: Platform.OS === 'ios' ? 20 : 8,
    paddingTop: 8,
  },
  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3 },
  tabLabel: { fontFamily: FontFamily.regular, fontSize: 10.5, color: '#9CA3AF' },
  tabLabelActive: { fontFamily: FontFamily.semiBold, color: HEADER_GREEN },
});

const kpi = StyleSheet.create({
  card: { width: '47%', borderRadius: 14, padding: 14, gap: 4 },
  circle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  label: { fontFamily: FontFamily.regular, fontSize: 12, color: '#374151', marginTop: 6 },
  value: { fontFamily: FontFamily.bold, fontSize: 26, color: '#111827' },
  trendRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  trendText: { fontFamily: FontFamily.regular, fontSize: 11 },
});

const menuStyles = StyleSheet.create({
  backdrop: {
    flex: 1, backgroundColor: 'rgba(15,23,42,0.4)',
    justifyContent: 'flex-end' as const,
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingTop: 14, paddingBottom: Platform.OS === 'ios' ? 30 : 18,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  title: { fontFamily: FontFamily.bold, fontSize: 16, color: '#0F172A' },
  sub:   { fontFamily: FontFamily.regular, fontSize: 12, color: '#64748B', marginTop: 2 },
  section: { paddingVertical: 8 },
  item: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 20, paddingVertical: 14,
  },
  itemDanger: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 20, paddingVertical: 14,
    borderTopWidth: 1, borderTopColor: '#F1F5F9', marginTop: 4,
  },
  itemIcon: {
    width: 38, height: 38, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  itemLabel: { fontFamily: FontFamily.semiBold, fontSize: 14, color: '#0F172A' },
  itemSub:   { fontFamily: FontFamily.regular, fontSize: 11, color: '#94A3B8', marginTop: 2 },
});
