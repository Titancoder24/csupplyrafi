import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet, Modal,
  SafeAreaView, StatusBar, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Bell, ChevronDown, ChevronRight,
  Plus, ListChecks, FileText, IndianRupee, ShieldCheck,
  Home, Boxes, User, X, LogOut, History,
  ShoppingCart, Package2, AlertTriangle, TrendingUp,
} from 'lucide-react-native';
import { supabase } from '@/services/supabase';
import { useAuth } from '@/services/auth/AuthProvider';
import { useNotifications } from '@/hooks/useNotifications';
import { FontFamily, Shadow } from '@/constants/theme';

/* ─── Palette (orange brand) ──────────────────────────────────────────────── */
const ORANGE     = '#F97316';
const ORANGE_DK  = '#EA580C';
const ORANGE_LT  = '#FFEDD5';
const ORANGE_BG  = '#FFF7ED';
const ORANGE_BR  = '#FED7AA';
const BG         = '#F8FAFC';
const SURFACE    = '#FFFFFF';
const BORDER     = '#E2E8F0';
const INK_900    = '#0F172A';
const INK_700    = '#334155';
const INK_500    = '#64748B';
const INK_400    = '#94A3B8';

type Stats = {
  newOrders:    number;
  todaySales:   number;
  itemsSold:    number;
  lowStock:     number;
};

const ZERO: Stats = { newOrders: 0, todaySales: 0, itemsSold: 0, lowStock: 0 };

type RecentOrder = {
  id:            string;
  order_number:  string;
  status:        string;
  total_amount:  number;
  created_at:    string;
  customer_name: string | null;
  items_summary: string;
};

function fmtINR(n: number) {
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)}L`;
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
}


const STATUS_PILL: Record<string, { label: string; bg: string; fg: string }> = {
  placed:                            { label: 'New',          bg: '#FEF3C7', fg: '#B45309' },
  vendor_pending:                    { label: 'Pending',      bg: '#FEF3C7', fg: '#B45309' },
  vendor_accepted:                   { label: 'Accepted',     bg: '#DCFCE7', fg: '#15803D' },
  transporter_pending:               { label: 'Finding T.',   bg: '#FFEDD5', fg: '#C2410C' },
  transporter_accepted:              { label: 'Pickup soon',  bg: '#FFEDD5', fg: '#C2410C' },
  out_for_pickup:                    { label: 'Out for Pkp',  bg: '#FFEDD5', fg: '#C2410C' },
  pending_admin_pickup_confirmation: { label: 'Pickup',       bg: '#FFEDD5', fg: '#C2410C' },
  picked_up:                         { label: 'Picked up',    bg: '#DBEAFE', fg: '#1D4ED8' },
  in_transit:                        { label: 'In Transit',   bg: '#DBEAFE', fg: '#1D4ED8' },
  out_for_delivery:                  { label: 'Out for Delivery', bg: '#FFEDD5', fg: '#C2410C' },
  pending_admin_confirmation:        { label: 'Delivered ✓',  bg: '#DCFCE7', fg: '#15803D' },
  delivered:                         { label: 'Delivered',    bg: '#DCFCE7', fg: '#15803D' },
  vendor_rejected:                   { label: 'Rejected',     bg: '#FEE2E2', fg: '#B91C1C' },
  cancelled:                         { label: 'Cancelled',    bg: '#F1F5F9', fg: '#475569' },
};

const QUICK = [
  { route: '/vendor/products', label: 'Add Stock',  Icon: Plus,        primary: true,  tint: '#FFF7ED', fg: '#EA580C' },
  { route: '/vendor/products', label: 'Stock List', Icon: ListChecks,  primary: false, tint: '#EFF6FF', fg: '#1D4ED8' },
  { route: '/vendor/orders',   label: 'Orders',     Icon: FileText,    primary: false, tint: '#F5F3FF', fg: '#7C3AED' },
  { route: '/vendor/orders',   label: 'Earnings',   Icon: IndianRupee, primary: false, tint: '#F0FDF4', fg: '#15803D' },
];

const TABS = [
  { key: 'home',     label: 'Dashboard', Icon: Home,        route: '/vendor/dashboard' },
  { key: 'orders',   label: 'Orders',    Icon: FileText,    route: '/vendor/orders' },
  { key: 'stock',    label: 'Stock',     Icon: Boxes,       route: '/vendor/products' },
  { key: 'earnings', label: 'Earnings',  Icon: IndianRupee, route: '/vendor/orders' },
  { key: 'account',  label: 'Account',   Icon: User,        route: '/vendor/pending' },
];

export default function VendorDashboard() {
  const router  = useRouter();
  const { profile, signOut } = useAuth();
  const { unreadCount } = useNotifications();

  const [stats, setStats]               = useState<Stats>(ZERO);
  const [recent, setRecent]             = useState<RecentOrder[]>([]);
  const [shopName, setShopName]         = useState('');
  const [menuOpen, setMenuOpen]         = useState(false);

  async function handleSignOut() {
    setMenuOpen(false);
    await signOut();
    router.replace('/auth/login' as never);
  }

  const fetchAll = useCallback(async () => {
    if (!profile?.id) return;

    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);

    const [vp, newOrd, salesRes, recentRes, lowStockRes, itemsRes] = await Promise.all([
      supabase.from('vendor_profiles').select('business_name, shop_name').eq('id', profile.id).maybeSingle(),
      supabase.from('orders').select('id', { count: 'exact', head: true })
        .eq('vendor_id', profile.id).gte('created_at', todayStart.toISOString()),
      supabase.from('orders').select('total_amount')
        .eq('vendor_id', profile.id).eq('status', 'delivered')
        .gte('delivered_at', todayStart.toISOString()),
      supabase.from('orders')
        .select(`id, order_number, status, total_amount, created_at,
                 customer:profiles!orders_customer_id_fkey(full_name),
                 order_items(quantity, unit, product_name)`)
        .eq('vendor_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(5),
      supabase.from('products').select('id', { count: 'exact', head: true })
        .eq('vendor_id', profile.id)
        .not('low_stock_threshold', 'is', null)
        .filter('stock_qty', 'lte', 'low_stock_threshold'),
      supabase.from('order_items')
        .select('quantity, order:orders!inner(vendor_id, created_at)')
        .eq('order.vendor_id', profile.id)
        .gte('order.created_at', todayStart.toISOString()),
    ]);

    if (vp.data?.business_name || vp.data?.shop_name) {
      setShopName(vp.data.business_name ?? vp.data.shop_name ?? '');
    }

    const sales = (salesRes.data ?? []).reduce((s, o: any) => s + (o.total_amount ?? 0), 0);
    const itemsSold = (itemsRes.data ?? []).reduce((s, r: any) => s + (r.quantity ?? 0), 0);

    setStats({
      newOrders:  newOrd.count ?? 0,
      todaySales: sales,
      itemsSold,
      lowStock:   lowStockRes.count ?? 0,
    });

    const list: RecentOrder[] = ((recentRes.data ?? []) as any[]).map(r => {
      const itemsArr = (r.order_items ?? []) as any[];
      const first = itemsArr[0];
      const summary = first
        ? `${first.quantity} ${first.unit ?? ''} · ${first.product_name ?? 'Item'}${itemsArr.length > 1 ? ` +${itemsArr.length - 1} more` : ''}`
        : 'No items';
      return {
        id:            r.id,
        order_number:  r.order_number,
        status:        r.status,
        total_amount:  r.total_amount ?? 0,
        created_at:    r.created_at,
        customer_name: r.customer?.full_name ?? null,
        items_summary: summary,
      };
    });
    setRecent(list);
  }, [profile?.id]);

  useEffect(() => {
    fetchAll();
    if (!profile?.id) return;
    const suffix = Math.random().toString(36).slice(2, 10);
    const ch = supabase.channel(`vd-rt:${profile.id}:${suffix}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders',   filter: `vendor_id=eq.${profile.id}` }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products', filter: `vendor_id=eq.${profile.id}` }, fetchAll)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [profile?.id, fetchAll]);

  const displayName = shopName || profile?.full_name || 'Vendor';
  const vendorId    = `VB${String(profile?.id ?? '00000').replace(/[^0-9]/g, '').slice(-5).padStart(5, '0') || '12345'}`;

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={ORANGE_DK} />

      {/* ── Orange header ────────────────────────────────────── */}
      <SafeAreaView style={s.headerArea}>
        <View style={s.headerRow}>
          <Pressable style={s.headerLeft} onPress={() => setMenuOpen(true)}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={s.hello} numberOfLines={1}>Hello, {displayName}</Text>
                <ChevronDown size={16} color="#fff" strokeWidth={2.4} />
              </View>
              <View style={s.idRow}>
                <Text style={s.vendorId}>Vendor ID: {vendorId}</Text>
                <View style={s.verifyPill}>
                  <ShieldCheck size={9} color="#fff" strokeWidth={2.4} />
                  <Text style={s.verifyTxt}>Verified</Text>
                </View>
              </View>
            </View>
          </Pressable>

          <Pressable
            style={s.bellBtn}
            onPress={() => router.push('/vendor/notifications' as never)}
            hitSlop={6}
          >
            <Bell size={20} color="#fff" strokeWidth={2} />
            {unreadCount > 0 && (
              <View style={s.bellBadge}>
                <Text style={s.bellBadgeTxt}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            )}
          </Pressable>
        </View>
      </SafeAreaView>

      {/* ── Body ─────────────────────────────────────────────── */}
      <ScrollView
        style={s.body}
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Today's Overview */}
        <View style={s.card}>
          <View style={s.cardHead}>
            <Text style={s.cardTitle}>Today's Overview</Text>
            <Pressable onPress={() => router.push('/vendor/orders' as never)}>
              <Text style={s.linkTxt}>View Details</Text>
            </Pressable>
          </View>

          <View style={s.kpiGrid}>
            <KpiTile value={String(stats.newOrders)}  label="New Orders"    Icon={ShoppingCart}  accent="#EA580C" tint="#FFF7ED" />
            <KpiTile value={fmtINR(stats.todaySales)} label="Today's Sales" Icon={TrendingUp}    accent="#15803D" tint="#F0FDF4" />
            <KpiTile value={String(stats.itemsSold)}  label="Items Sold"    Icon={Package2}      accent="#1D4ED8" tint="#EFF6FF" />
            <KpiTile value={String(stats.lowStock)}   label="Low Stock"     Icon={AlertTriangle} accent={stats.lowStock > 0 ? '#B91C1C' : '#64748B'} tint={stats.lowStock > 0 ? '#FEF2F2' : '#F1F5F9'} />
          </View>
        </View>

        {/* Recent Orders */}
        <View style={s.card}>
          <View style={s.cardHead}>
            <Text style={s.cardTitle}>Recent Orders</Text>
            <Pressable onPress={() => router.push('/vendor/orders' as never)}>
              <Text style={s.linkTxt}>View All</Text>
            </Pressable>
          </View>

          {recent.length === 0 ? (
            <View style={s.emptyBox}>
              <Text style={s.emptyTxt}>No orders yet</Text>
            </View>
          ) : (
            recent.map((o, i) => {
              const pill = STATUS_PILL[o.status] ?? { label: o.status, bg: '#F1F5F9', fg: '#475569' };
              const isPlaced = o.status === 'placed' || o.status === 'vendor_pending';
              const initials = (o.customer_name ?? 'C').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
              return (
                <Pressable
                  key={o.id}
                  onPress={() => router.push(`/vendor/orders?id=${o.id}` as never)}
                  style={({ pressed }) => [
                    s.orderRow,
                    i < recent.length - 1 && s.orderRowDivider,
                    pressed && { backgroundColor: '#FAFBFC' },
                  ]}
                >
                  <View style={[s.avatar, { backgroundColor: pill.bg }]}>
                    <Text style={[s.avatarTxt, { color: pill.fg }]}>{initials}</Text>
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <View style={s.orderTopRow}>
                      <Text style={s.orderTitle} numberOfLines={1}>
                        {o.customer_name ?? 'Customer'}
                      </Text>
                      <Text style={s.orderAmt}>{fmtINR(o.total_amount)}</Text>
                    </View>
                    <View style={s.orderBottomRow}>
                      <View style={[s.statusDot, { backgroundColor: pill.fg }]} />
                      <Text style={[s.statusInlineTxt, { color: pill.fg }]} numberOfLines={1}>
                        {isPlaced ? `#${o.order_number.replace(/^CS/, '')}` : pill.label}
                      </Text>
                      <Text style={s.dotSep}>·</Text>
                      <Text style={s.orderSub} numberOfLines={1}>{o.items_summary}</Text>
                    </View>
                  </View>
                  <ChevronRight size={14} color={INK_400} strokeWidth={2} />
                </Pressable>
              );
            })
          )}
        </View>

        {/* Quick actions row */}
        <View style={s.quickRow}>
          {QUICK.map(q => {
            const Icon = q.Icon;
            return (
              <Pressable
                key={q.label}
                onPress={() => router.push(q.route as never)}
                style={({ pressed }) => [s.quickCard, pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] }]}
              >
                <View style={[s.quickIcon, { backgroundColor: q.primary ? ORANGE : q.tint }]}>
                  <Icon size={17} color={q.primary ? '#fff' : q.fg} strokeWidth={2.2} />
                </View>
                <Text style={s.quickLabel} numberOfLines={1}>{q.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={{ height: 14 }} />
      </ScrollView>

      {/* ── Menu drawer ──────────────────────────────────────── */}
      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <Pressable style={menu.backdrop} onPress={() => setMenuOpen(false)}>
          <Pressable style={menu.sheet} onPress={() => {}}>
            <View style={menu.head}>
              <View>
                <Text style={menu.title}>{displayName}</Text>
                <Text style={menu.sub}>{profile?.phone || profile?.email}</Text>
              </View>
              <Pressable onPress={() => setMenuOpen(false)} hitSlop={10}>
                <X size={18} color={INK_500} strokeWidth={2} />
              </Pressable>
            </View>

            <Pressable style={menu.item} onPress={() => { setMenuOpen(false); router.push('/vendor/orders?tab=delivered' as never); }}>
              <View style={[menu.itemIcon, { backgroundColor: '#EFF6FF' }]}>
                <History size={16} color="#1D4ED8" strokeWidth={2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={menu.itemLabel}>Order History</Text>
                <Text style={menu.itemSub}>View delivered orders and earnings</Text>
              </View>
              <ChevronRight size={14} color={INK_400} strokeWidth={2} />
            </Pressable>

            <Pressable style={menu.item} onPress={() => { setMenuOpen(false); router.push('/vendor/notifications' as never); }}>
              <View style={[menu.itemIcon, { backgroundColor: ORANGE_BG }]}>
                <Bell size={16} color={ORANGE_DK} strokeWidth={2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={menu.itemLabel}>Notifications</Text>
                <Text style={menu.itemSub}>{unreadCount > 0 ? `${unreadCount} unread` : 'View all notifications'}</Text>
              </View>
              <ChevronRight size={14} color={INK_400} strokeWidth={2} />
            </Pressable>

            <Pressable style={menu.itemDanger} onPress={handleSignOut}>
              <View style={[menu.itemIcon, { backgroundColor: '#FEF2F2' }]}>
                <LogOut size={16} color="#B91C1C" strokeWidth={2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[menu.itemLabel, { color: '#B91C1C' }]}>Sign Out</Text>
                <Text style={menu.itemSub}>End your session on this device</Text>
              </View>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Bottom tab bar ───────────────────────────────────── */}
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
              <View style={[s.tabIndicator, active && s.tabIndicatorActive]} />
              <Icon size={20} color={active ? ORANGE : INK_400} strokeWidth={active ? 2.2 : 1.8} />
              <Text style={[s.tabLabel, active && s.tabLabelActive]}>{t.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/* ─── KPI tile ────────────────────────────────────────────────────────────── */
function KpiTile({ value, label, Icon, accent, tint }: {
  value: string; label: string; Icon: any; accent: string; tint: string;
}) {
  return (
    <View style={kpi.tile}>
      <View style={[kpi.iconBox, { backgroundColor: tint }]}>
        <Icon size={14} color={accent} strokeWidth={2.2} />
      </View>
      <Text style={[kpi.value, { color: accent }]} numberOfLines={1}>{value}</Text>
      <Text style={kpi.label} numberOfLines={1}>{label}</Text>
    </View>
  );
}

/* ─── Styles ──────────────────────────────────────────────────────────────── */
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  /* Header */
  headerArea: { backgroundColor: ORANGE },
  headerRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 18, paddingTop: Platform.OS === 'web' ? 14 : 8,
    paddingBottom: 16, gap: 10,
  },
  headerLeft: { flex: 1 },
  hello: { fontFamily: FontFamily.bold, fontSize: 18.5, color: '#fff', letterSpacing: -0.2, maxWidth: '90%' },
  idRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  vendorId: { fontFamily: FontFamily.regular, fontSize: 12, color: 'rgba(255,255,255,0.78)' },
  verifyPill: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 99,
  },
  verifyTxt: { fontFamily: FontFamily.semiBold, fontSize: 9.5, color: '#fff', letterSpacing: 0.3 },

  bellBtn: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center', justifyContent: 'center',
    position: 'relative' as const,
  },
  bellBadge: {
    position: 'absolute' as const, top: -3, right: -3,
    minWidth: 18, height: 18, paddingHorizontal: 4, borderRadius: 9,
    backgroundColor: '#DC2626', borderWidth: 2, borderColor: ORANGE,
    alignItems: 'center', justifyContent: 'center',
  },
  bellBadgeTxt: { fontFamily: FontFamily.bold, fontSize: 9.5, color: '#fff', lineHeight: 11 },

  /* Body */
  body: {
    flex: 1, backgroundColor: BG,
    borderTopLeftRadius: 22, borderTopRightRadius: 22,
    marginTop: -14,
  },
  scroll: { padding: 14, paddingTop: 18, gap: 12, paddingBottom: 18 },

  card: {
    backgroundColor: SURFACE,
    borderRadius: 14,
    borderWidth: 1, borderColor: BORDER,
    padding: 14, gap: 12,
    ...Shadow.sm,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { fontFamily: FontFamily.semiBold, fontSize: 15, color: INK_900, letterSpacing: -0.1 },
  linkTxt:   { fontFamily: FontFamily.semiBold, fontSize: 12.5, color: ORANGE_DK },

  /* KPI grid */
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },

  /* Recent orders */
  emptyBox: { alignItems: 'center', paddingVertical: 18 },
  emptyTxt: { fontFamily: FontFamily.regular, fontSize: 12.5, color: INK_400 },
  orderRow: {
    flexDirection: 'row', alignItems: 'center', gap: 11,
    paddingVertical: 11, paddingHorizontal: 4,
    borderRadius: 8,
  },
  orderRowDivider: { borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  avatar: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarTxt: { fontFamily: FontFamily.bold, fontSize: 12, letterSpacing: 0.3 },
  orderTopRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  orderBottomRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  statusDot: { width: 5, height: 5, borderRadius: 3 },
  statusInlineTxt: { fontFamily: FontFamily.semiBold, fontSize: 10.5, letterSpacing: 0.2 },
  dotSep: { fontFamily: FontFamily.regular, fontSize: 11, color: INK_400, marginHorizontal: 1 },
  statusPill: {
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 6, alignItems: 'center' as const, justifyContent: 'center' as const,
    minWidth: 78,
  },
  statusPillTxt: { fontFamily: FontFamily.semiBold, fontSize: 10, letterSpacing: 0.1 },
  orderTitle: { fontFamily: FontFamily.semiBold, fontSize: 13.5, color: INK_900, letterSpacing: -0.1, flex: 1 },
  orderSub:   { fontFamily: FontFamily.regular,  fontSize: 11, color: INK_500, flex: 1 },
  orderAmt:   { fontFamily: FontFamily.bold, fontSize: 14, color: INK_900, letterSpacing: -0.2 },
  orderTime:  { fontFamily: FontFamily.regular, fontSize: 10.5, color: INK_400, marginTop: 2 },

  /* Quick actions */
  quickRow: { flexDirection: 'row', gap: 10 },
  quickCard: {
    flex: 1,
    backgroundColor: SURFACE,
    borderRadius: 12,
    borderWidth: 1, borderColor: BORDER,
    paddingVertical: 14, gap: 6,
    alignItems: 'center',
    ...Shadow.sm,
  },
  quickIcon: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: ORANGE_BG,
    alignItems: 'center', justifyContent: 'center',
  },
  quickLabel: { fontFamily: FontFamily.semiBold, fontSize: 11.5, color: INK_700 },

  /* Tab bar */
  tabBar: {
    flexDirection: 'row',
    backgroundColor: SURFACE,
    borderTopWidth: 1, borderTopColor: BORDER,
    paddingBottom: Platform.OS === 'ios' ? 20 : 8,
    paddingTop: 8,
  },
  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'flex-start', gap: 3, paddingTop: 4 },
  tabIndicator: {
    width: 22, height: 3, borderRadius: 2,
    backgroundColor: 'transparent',
    marginBottom: 4,
  },
  tabIndicatorActive: { backgroundColor: ORANGE },
  tabLabel: { fontFamily: FontFamily.regular, fontSize: 10.5, color: INK_400 },
  tabLabelActive: { fontFamily: FontFamily.semiBold, color: ORANGE },
});

const kpi = StyleSheet.create({
  tile: {
    width: '48%',
    backgroundColor: '#FAFBFC',
    borderRadius: 12,
    borderWidth: 1, borderColor: '#EEF2F6',
    paddingVertical: 13, paddingHorizontal: 13,
    gap: 6,
  },
  iconBox: {
    width: 28, height: 28, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  value: { fontFamily: FontFamily.bold, fontSize: 21, letterSpacing: -0.5, lineHeight: 24, marginTop: 2 },
  label: { fontFamily: FontFamily.medium, fontSize: 11.5, color: INK_500, letterSpacing: 0.1 },
});

const menu = StyleSheet.create({
  backdrop: {
    flex: 1, backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'flex-end' as const,
  },
  sheet: {
    backgroundColor: SURFACE,
    borderTopLeftRadius: 16, borderTopRightRadius: 16,
    paddingTop: 12, paddingBottom: Platform.OS === 'ios' ? 28 : 16,
  },
  head: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 18, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  title: { fontFamily: FontFamily.semiBold, fontSize: 15, color: INK_900 },
  sub:   { fontFamily: FontFamily.regular,  fontSize: 12, color: INK_500, marginTop: 2 },
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
    width: 32, height: 32, borderRadius: 6,
    alignItems: 'center', justifyContent: 'center',
  },
  itemLabel: { fontFamily: FontFamily.semiBold, fontSize: 13.5, color: INK_900 },
  itemSub:   { fontFamily: FontFamily.regular,  fontSize: 11, color: INK_400, marginTop: 1 },
});
