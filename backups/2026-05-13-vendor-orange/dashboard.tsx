import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet, Modal,
  SafeAreaView, StatusBar, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Bell, Menu, ShieldCheck, ChevronRight,
  ShoppingCart, Tag, Package2, ClipboardList,
  CheckCircle2, BarChart2, MoreHorizontal,
  Home, ListOrdered, Boxes, LayoutGrid, TrendingUp, TrendingDown,
  IndianRupee, Truck, LogOut, History, X, AlertTriangle,
} from 'lucide-react-native';
import { supabase } from '@/services/supabase';
import { useAuth } from '@/services/auth/AuthProvider';
import { formatINR } from '@/lib/format';
import { useNotifications } from '@/hooks/useNotifications';
import { FontFamily, Radius, Shadow, Semantic, Ink } from '@/constants/theme';

/* ─── Palette ─────────────────────────────────────────────────────────────── */
const GREEN     = '#15803D';
const GREEN_DK  = '#166534';
const GREEN_LT  = '#F0FDF4';
const BG        = '#F8FAFC';
const SURFACE   = '#FFFFFF';
const BORDER    = '#E2E8F0';
const INK_900   = '#0F172A';
const INK_700   = '#334155';
const INK_500   = '#64748B';
const INK_400   = '#94A3B8';

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
  { route: '/vendor/products',  label: 'Add Product',     Icon: ShoppingCart },
  { route: '/vendor/products',  label: 'Update Price',    Icon: Tag },
  { route: '/vendor/products',  label: 'Update Stock',    Icon: Package2 },
  { route: '/vendor/orders',    label: 'Orders',          Icon: ClipboardList },
  { route: '/vendor/transport', label: 'Book Transport',  Icon: Truck },
  { route: '/vendor/orders',    label: 'Accept Orders',   Icon: CheckCircle2 },
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
  return Math.round(((today - yesterday) / yesterday) * 100);
}

export default function VendorDashboard() {
  const router  = useRouter();
  const { profile, signOut } = useAuth();
  const { unreadCount } = useNotifications();
  const [stats, setStats]       = useState<Stats>(ZERO);
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

    const sumRev = (arr: any[]) => (arr ?? []).reduce((s, o) => s + (o.total_amount ?? 0), 0);

    setStats({
      todayOrders:      todayOrd.count ?? 0,
      yesterdayOrders:  yestOrd.count  ?? 0,
      pendingOrders:    pendOrd.count  ?? 0,
      yesterdayPending: yestPend.count ?? 0,
      todayRevenue:     sumRev(rev.data ?? []),
      yesterdayRevenue: sumRev(yestRev.data ?? []),
      lowStockItems:    lowStock.count ?? 0,
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

  const todayTrend = trend(stats.todayOrders,   stats.yesterdayOrders);
  const pendTrend  = trend(stats.pendingOrders, stats.yesterdayPending);
  const revTrend   = trend(stats.todayRevenue,  stats.yesterdayRevenue);

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={GREEN_DK} />

      {/* ── Slim green header ─────────────────────────────── */}
      <SafeAreaView style={s.header}>
        <View style={s.headerRow}>
          <Pressable style={s.iconBtn} onPress={() => setMenuOpen(true)} hitSlop={4}>
            <Menu size={20} color="#fff" strokeWidth={2} />
          </Pressable>

          <View style={s.headerCenter}>
            <Text style={s.welcomeSub}>Welcome back</Text>
            <Text style={s.welcomeName} numberOfLines={1}>{displayName}</Text>
          </View>

          <Pressable
            style={s.iconBtn}
            onPress={() => router.push('/vendor/notifications' as never)}
            hitSlop={4}
          >
            <Bell size={20} color="#fff" strokeWidth={2} />
            {unreadCount > 0 && <View style={s.dot} />}
          </Pressable>
        </View>
        <View style={s.headerMetaRow}>
          <Text style={s.vendorId}>{vendorId}</Text>
          <View style={s.kycPill}>
            <View style={s.kycDot} />
            <Text style={s.kycTxt}>Approved</Text>
          </View>
        </View>
      </SafeAreaView>

      {/* ── Body ──────────────────────────────────────────── */}
      <ScrollView
        style={s.body}
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Section: Today */}
        <View style={s.sectionHead}>
          <View style={{ flex: 1 }}>
            <Text style={s.sectionTitle}>Today's snapshot</Text>
            <Text style={s.sectionSub}>Activity since midnight</Text>
          </View>
        </View>

        <View style={s.kpiGrid}>
          <KpiTile
            label="New orders"
            value={String(stats.todayOrders)}
            trend={todayTrend}
            icon={ShoppingCart}
          />
          <KpiTile
            label="Pending"
            value={String(stats.pendingOrders)}
            trend={pendTrend}
            icon={ClipboardList}
          />
          <KpiTile
            label="Revenue"
            value={formatINR(stats.todayRevenue)}
            trend={revTrend}
            icon={IndianRupee}
          />
          <KpiTile
            label="Low stock"
            value={String(stats.lowStockItems)}
            trend={null}
            icon={AlertTriangle}
            danger={stats.lowStockItems > 0}
            onPress={() => router.push('/vendor/products' as never)}
          />
        </View>

        {/* Section: Verification (only shows if KYC isn't approved — left visible for demo) */}
        <Pressable style={s.verifyCard} onPress={() => router.push('/vendor/pending' as never)}>
          <View style={s.verifyIcon}>
            <ShieldCheck size={16} color={GREEN} strokeWidth={2} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.verifyTitle}>Account verified</Text>
            <Text style={s.verifySub}>Your business is approved · KYC complete</Text>
          </View>
          <ChevronRight size={16} color={INK_400} strokeWidth={2} />
        </Pressable>

        {/* Section: Quick actions */}
        <View style={s.sectionHead}>
          <Text style={s.sectionTitle}>Quick actions</Text>
        </View>
        <View style={s.actionGrid}>
          {ACTIONS.map((a, i) => {
            const Icon = a.Icon;
            return (
              <Pressable
                key={i}
                style={({ pressed }) => [s.actionCard, pressed && { opacity: 0.7 }]}
                onPress={() => router.push(a.route as never)}
              >
                <View style={s.actionIconBox}>
                  <Icon size={16} color={GREEN_DK} strokeWidth={2} />
                </View>
                <Text style={s.actionLabel} numberOfLines={2}>{a.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={{ height: 12 }} />
      </ScrollView>

      {/* ── Menu drawer ───────────────────────────────────── */}
      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <Pressable style={menuStyles.backdrop} onPress={() => setMenuOpen(false)}>
          <Pressable style={menuStyles.sheet} onPress={() => {}}>
            <View style={menuStyles.header}>
              <View>
                <Text style={menuStyles.title}>{shopName || profile?.full_name || 'Vendor'}</Text>
                <Text style={menuStyles.sub}>{profile?.phone || profile?.email}</Text>
              </View>
              <Pressable onPress={() => setMenuOpen(false)} hitSlop={10}>
                <X size={18} color={Ink[500]} strokeWidth={2} />
              </Pressable>
            </View>

            <View style={menuStyles.section}>
              <Pressable
                style={menuStyles.item}
                onPress={() => { setMenuOpen(false); router.push('/vendor/orders?tab=delivered' as never); }}
              >
                <View style={[menuStyles.itemIcon, { backgroundColor: '#EFF6FF' }]}>
                  <History size={16} color="#1D4ED8" strokeWidth={2} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={menuStyles.itemLabel}>Order History</Text>
                  <Text style={menuStyles.itemSub}>View delivered orders and earnings</Text>
                </View>
                <ChevronRight size={14} color={Ink[400]} strokeWidth={2} />
              </Pressable>

              <Pressable
                style={menuStyles.item}
                onPress={() => { setMenuOpen(false); router.push('/vendor/notifications' as never); }}
              >
                <View style={[menuStyles.itemIcon, { backgroundColor: '#FFFBEB' }]}>
                  <Bell size={16} color={Semantic.warningFg} strokeWidth={2} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={menuStyles.itemLabel}>Notifications</Text>
                  <Text style={menuStyles.itemSub}>{unreadCount > 0 ? `${unreadCount} unread` : 'View all notifications'}</Text>
                </View>
                <ChevronRight size={14} color={Ink[400]} strokeWidth={2} />
              </Pressable>

              <Pressable style={menuStyles.itemDanger} onPress={handleSignOut}>
                <View style={[menuStyles.itemIcon, { backgroundColor: Semantic.dangerBg }]}>
                  <LogOut size={16} color={Semantic.dangerFg} strokeWidth={2} />
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

      {/* ── Bottom tab bar ────────────────────────────────── */}
      <View style={s.tabBar}>
        {TABS.map((t, i) => {
          const Icon   = t.Icon;
          const active = i === 0;
          return (
            <Pressable
              key={t.key}
              style={s.tabItem}
              onPress={() => router.push(t.route as never)}
            >
              <Icon size={20} color={active ? GREEN : INK_400} strokeWidth={active ? 2.2 : 1.8} />
              <Text style={[s.tabLabel, active && s.tabLabelActive]}>{t.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/* ─── KPI Tile (Linear/Stripe density) ────────────────────────────────────── */
function KpiTile({
  label, value, trend, icon: Icon, danger, onPress,
}: {
  label: string; value: string; trend: number | null; icon: any;
  danger?: boolean; onPress?: () => void;
}) {
  const up = (trend ?? 0) >= 0;
  const Wrap: any = onPress ? Pressable : View;
  return (
    <Wrap style={kpi.tile} onPress={onPress}>
      <View style={kpi.head}>
        <View style={[kpi.iconBox, danger && { backgroundColor: '#FEE2E2' }]}>
          <Icon size={13} color={danger ? '#B91C1C' : GREEN} strokeWidth={2.2} />
        </View>
        <Text style={kpi.label}>{label}</Text>
      </View>
      <Text style={[kpi.value, danger && stats_text_danger]} numberOfLines={1}>{value}</Text>
      {trend !== null ? (
        <View style={kpi.trendRow}>
          {up
            ? <TrendingUp   size={11} color="#16A34A" strokeWidth={2} />
            : <TrendingDown size={11} color="#DC2626" strokeWidth={2} />}
          <Text style={[kpi.trendTxt, { color: up ? '#16A34A' : '#DC2626' }]}>
            {up ? '+' : ''}{trend}% vs yesterday
          </Text>
        </View>
      ) : (
        <Text style={kpi.trendIdle}>vs yesterday —</Text>
      )}
    </Wrap>
  );
}

const stats_text_danger = { color: '#B91C1C' };

/* ─── Styles ──────────────────────────────────────────────────────────────── */
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: GREEN_DK },

  /* Header */
  header: { backgroundColor: GREEN_DK },
  headerRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingTop: Platform.OS === 'web' ? 12 : 6,
    paddingBottom: 10, gap: 8,
  },
  iconBtn: {
    width: 34, height: 34, borderRadius: Radius.sm,
    alignItems: 'center', justifyContent: 'center',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  welcomeSub:  { fontFamily: FontFamily.regular, fontSize: 11, color: 'rgba(255,255,255,0.72)', letterSpacing: 0.1 },
  welcomeName: { fontFamily: FontFamily.semiBold, fontSize: 15, color: '#fff', marginTop: 1 },
  dot: {
    position: 'absolute', top: 4, right: 4,
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: '#F97316', borderWidth: 1.5, borderColor: GREEN_DK,
  },
  headerMetaRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 18, paddingBottom: 14, paddingTop: 2,
  },
  vendorId: {
    fontFamily: FontFamily.regular, fontSize: 11,
    color: 'rgba(255,255,255,0.65)', letterSpacing: 0.3,
  },
  kycPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: Radius.full,
    paddingHorizontal: 9, paddingVertical: 3,
  },
  kycDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#86EFAC' },
  kycTxt: { fontFamily: FontFamily.semiBold, fontSize: 10.5, color: '#fff', letterSpacing: 0.2 },

  /* Body */
  body: {
    flex: 1, backgroundColor: BG,
    borderTopLeftRadius: 18, borderTopRightRadius: 18,
  },
  scroll: { paddingHorizontal: 16, paddingTop: 18, paddingBottom: 24, gap: 16 },

  sectionHead: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  sectionTitle: { fontFamily: FontFamily.semiBold, fontSize: 14, color: INK_900, letterSpacing: -0.1 },
  sectionSub:   { fontFamily: FontFamily.regular,  fontSize: 12, color: INK_400, marginTop: 1 },

  /* KPI */
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },

  /* Verify */
  verifyCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: GREEN_LT, borderRadius: Radius.md,
    paddingHorizontal: 12, paddingVertical: 12,
    borderWidth: 1, borderColor: '#BBF7D0',
  },
  verifyIcon: {
    width: 28, height: 28, borderRadius: Radius.xs,
    backgroundColor: '#DCFCE7',
    alignItems: 'center', justifyContent: 'center',
  },
  verifyTitle: { fontFamily: FontFamily.semiBold, fontSize: 13, color: GREEN_DK },
  verifySub:   { fontFamily: FontFamily.regular, fontSize: 11.5, color: INK_500, marginTop: 1 },

  /* Action grid */
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  actionCard: {
    width: '23.5%',
    backgroundColor: SURFACE,
    borderRadius: Radius.sm,
    borderWidth: 1, borderColor: BORDER,
    paddingVertical: 12, paddingHorizontal: 6,
    gap: 6,
    alignItems: 'center',
  },
  actionIconBox: {
    width: 30, height: 30, borderRadius: Radius.xs,
    backgroundColor: GREEN_LT,
    alignItems: 'center', justifyContent: 'center',
  },
  actionLabel: {
    fontFamily: FontFamily.medium, fontSize: 10.5,
    color: INK_700, textAlign: 'center', lineHeight: 13,
  },

  /* Tab bar */
  tabBar: {
    flexDirection: 'row',
    backgroundColor: SURFACE,
    borderTopWidth: 1, borderTopColor: BORDER,
    paddingBottom: Platform.OS === 'ios' ? 20 : 8,
    paddingTop: 8,
  },
  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2 },
  tabLabel: { fontFamily: FontFamily.regular, fontSize: 10.5, color: INK_400 },
  tabLabelActive: { fontFamily: FontFamily.semiBold, color: GREEN },
});

const kpi = StyleSheet.create({
  tile: {
    width: '48%',
    backgroundColor: SURFACE,
    borderRadius: Radius.md,
    borderWidth: 1, borderColor: BORDER,
    paddingVertical: 12, paddingHorizontal: 12,
    gap: 6,
    ...Shadow.sm,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  iconBox: {
    width: 22, height: 22, borderRadius: Radius.xs,
    backgroundColor: GREEN_LT,
    alignItems: 'center', justifyContent: 'center',
  },
  label: { fontFamily: FontFamily.medium, fontSize: 11.5, color: INK_500, letterSpacing: 0.1 },
  value: { fontFamily: FontFamily.bold, fontSize: 22, color: INK_900, letterSpacing: -0.4, lineHeight: 26 },
  trendRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  trendTxt: { fontFamily: FontFamily.semiBold, fontSize: 10.5 },
  trendIdle: { fontFamily: FontFamily.regular, fontSize: 10.5, color: INK_400 },
});

const menuStyles = StyleSheet.create({
  backdrop: {
    flex: 1, backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'flex-end' as const,
  },
  sheet: {
    backgroundColor: SURFACE,
    borderTopLeftRadius: Radius.lg, borderTopRightRadius: Radius.lg,
    paddingTop: 12, paddingBottom: Platform.OS === 'ios' ? 28 : 16,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 18, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  title: { fontFamily: FontFamily.semiBold, fontSize: 15, color: INK_900 },
  sub:   { fontFamily: FontFamily.regular,  fontSize: 12, color: INK_500, marginTop: 2 },
  section: { paddingVertical: 6 },
  item: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 18, paddingVertical: 12,
  },
  itemDanger: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 18, paddingVertical: 12,
    borderTopWidth: 1, borderTopColor: '#F1F5F9', marginTop: 4,
  },
  itemIcon: {
    width: 32, height: 32, borderRadius: Radius.xs,
    alignItems: 'center', justifyContent: 'center',
  },
  itemLabel: { fontFamily: FontFamily.semiBold, fontSize: 13.5, color: INK_900 },
  itemSub:   { fontFamily: FontFamily.regular,  fontSize: 11, color: INK_400, marginTop: 1 },
});
