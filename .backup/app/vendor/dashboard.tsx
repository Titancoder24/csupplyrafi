import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet, Modal,
  SafeAreaView, StatusBar, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Bell, ChevronDown, ChevronRight,
  X, LogOut,
  AlertTriangle, Check,
} from 'lucide-react-native';
import { supabase } from '@/services/supabase';
import { useAuth } from '@/services/auth/AuthProvider';
import { useNotifications } from '@/hooks/useNotifications';
import { FontFamily, Shadow } from '@/constants/theme';

/* ─── Palette ─────────────────────────────────────────────────────────────── */
const ORANGE     = '#F97316';
const ORANGE_DK  = '#EA580C';
const ORANGE_BG  = '#FFF7ED';
const ORANGE_BR  = '#FED7AA';
const CREAM      = '#FAF7F3';
const SURFACE    = '#FFFFFF';
const BORDER     = '#EAE3D8';
const HAIRLINE   = '#F1EBE0';
const INK_900    = '#0F172A';
const INK_700    = '#334155';
const INK_500    = '#64748B';
const INK_400    = '#94A3B8';
const GREEN      = '#15803D';
const RED        = '#B91C1C';

/* ─── Types ───────────────────────────────────────────────────────────────── */
type Stats = {
  newOrders:     number;
  todaySales:    number;
  yesterdaySales:number;
  itemsSold:     number;
  itemsSoldYest: number;
  lowStock:      number;
  sales7d:       number[];
};
const ZERO: Stats = {
  newOrders: 0, todaySales: 0, yesterdaySales: 0,
  itemsSold: 0, itemsSoldYest: 0, lowStock: 0,
  sales7d: [0, 0, 0, 0, 0, 0, 0],
};

type RecentOrder = {
  id:            string;
  order_number:  string;
  status:        string;
  total_amount:  number;
  created_at:    string;
  customer_name: string | null;
  items_summary: string;
};

/* ─── Helpers ─────────────────────────────────────────────────────────────── */
function fmtINR(n: number) {
  if (n >= 100_000) return `₹${(n / 100_000).toFixed(2)}L`;
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
}

function timeAgo(iso: string) {
  const t = Date.now() - new Date(iso).getTime();
  const m = Math.floor(t / 60000);
  if (m < 1)   return 'just now';
  if (m < 60)  return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function pctChange(curr: number, prev: number): number | null {
  if (curr === 0 && prev === 0) return null;
  if (prev === 0) return curr > 0 ? 100 : null;
  const v = ((curr - prev) / prev) * 100;
  if (!Number.isFinite(v)) return null;
  return Math.max(-999, Math.min(999, Math.round(v)));
}

const STATUS_PILL: Record<string, { label: string; bg: string; fg: string }> = {
  placed:                            { label: 'New',          bg: '#FEF3C7', fg: '#B45309' },
  vendor_pending:                    { label: 'Pending',      bg: '#FEF3C7', fg: '#B45309' },
  vendor_accepted:                   { label: 'Accepted',     bg: '#DCFCE7', fg: '#15803D' },
  transporter_pending:               { label: 'Finding T.',   bg: '#FFEDD5', fg: '#C2410C' },
  transporter_accepted:              { label: 'Pickup soon',  bg: '#FFEDD5', fg: '#C2410C' },
  out_for_pickup:                    { label: 'Out for pkp',  bg: '#FFEDD5', fg: '#C2410C' },
  pending_admin_pickup_confirmation: { label: 'Pickup',       bg: '#FFEDD5', fg: '#C2410C' },
  picked_up:                         { label: 'Picked up',    bg: '#DBEAFE', fg: '#1D4ED8' },
  in_transit:                        { label: 'In transit',   bg: '#DBEAFE', fg: '#1D4ED8' },
  out_for_delivery:                  { label: 'Out for del.', bg: '#FFEDD5', fg: '#C2410C' },
  pending_admin_confirmation:        { label: 'Delivered',    bg: '#DCFCE7', fg: '#15803D' },
  delivered:                         { label: 'Delivered',    bg: '#DCFCE7', fg: '#15803D' },
  vendor_rejected:                   { label: 'Rejected',     bg: '#FEE2E2', fg: '#B91C1C' },
  cancelled:                         { label: 'Cancelled',    bg: '#F1F5F9', fg: '#475569' },
};

/* ─── Screen ──────────────────────────────────────────────────────────────── */
export default function VendorDashboard() {
  const router  = useRouter();
  const { profile, signOut } = useAuth();
  const { unreadCount } = useNotifications();

  const [stats, setStats]               = useState<Stats>(ZERO);
  const [recent, setRecent]             = useState<RecentOrder[]>([]);
  const [shopName, setShopName]         = useState('');
  const [menuOpen, setMenuOpen]         = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  async function handleSignOut() {
    setMenuOpen(false);
    await signOut();
    router.replace('/auth/login' as never);
  }

  const fetchAll = useCallback(async () => {
    if (!profile?.id) return;

    const now = new Date();
    const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
    const yesterdayStart = new Date(todayStart); yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    const weekStart = new Date(todayStart); weekStart.setDate(weekStart.getDate() - 6);

    const [vp, actionReq, sales7Res, recentRes, lowStockRes, itemsTodayRes, itemsYestRes] = await Promise.all([
      supabase.from('vendor_profiles').select('business_name, shop_name').eq('id', profile.id).maybeSingle(),
      // `placed` orders are pre super-admin approval — vendor only sees `vendor_pending` onwards
      supabase.from('orders').select('id', { count: 'exact', head: true })
        .eq('vendor_id', profile.id)
        .eq('status', 'vendor_pending'),
      supabase.from('orders').select('total_amount, delivered_at')
        .eq('vendor_id', profile.id).eq('status', 'delivered')
        .gte('delivered_at', weekStart.toISOString()),
      supabase.from('orders')
        .select(`id, order_number, status, total_amount, created_at,
                 customer:profiles!orders_customer_id_fkey(full_name),
                 order_items(quantity, unit, product_name)`)
        .eq('vendor_id', profile.id)
        .neq('status', 'placed')
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
      supabase.from('order_items')
        .select('quantity, order:orders!inner(vendor_id, created_at)')
        .eq('order.vendor_id', profile.id)
        .gte('order.created_at', yesterdayStart.toISOString())
        .lt('order.created_at', todayStart.toISOString()),
    ]);

    if (vp.data?.business_name || vp.data?.shop_name) {
      setShopName(vp.data.business_name ?? vp.data.shop_name ?? '');
    }

    const sales7d = [0, 0, 0, 0, 0, 0, 0];
    for (const row of (sales7Res.data ?? []) as { total_amount: number; delivered_at: string | null }[]) {
      if (!row.delivered_at) continue;
      const d = new Date(row.delivered_at); d.setHours(0, 0, 0, 0);
      const idx = Math.round((d.getTime() - weekStart.getTime()) / 86_400_000);
      if (idx >= 0 && idx < 7) sales7d[idx] += row.total_amount ?? 0;
    }
    const todaySales     = sales7d[6];
    const yesterdaySales = sales7d[5];

    const itemsSold     = (itemsTodayRes.data ?? []).reduce((s, r: any) => s + (r.quantity ?? 0), 0);
    const itemsSoldYest = (itemsYestRes.data  ?? []).reduce((s, r: any) => s + (r.quantity ?? 0), 0);

    setStats({
      newOrders:      actionReq.count ?? 0,
      todaySales,
      yesterdaySales,
      itemsSold,
      itemsSoldYest,
      lowStock:       lowStockRes.count ?? 0,
      sales7d,
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
    setLastSyncedAt(new Date());
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
  const initial = (displayName || 'V').trim().charAt(0).toUpperCase();
  const vendorId = `VB${String(profile?.id ?? '00000').replace(/[^0-9]/g, '').slice(-5).padStart(5, '0') || '12345'}`;

  const todayLabel = new Date().toLocaleDateString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short',
  });
  const syncedLabel = lastSyncedAt
    ? `Updated ${timeAgo(lastSyncedAt.toISOString())}`
    : 'Syncing…';

  const salesDelta  = pctChange(stats.todaySales, stats.yesterdaySales);
  const itemsDelta  = pctChange(stats.itemsSold,  stats.itemsSoldYest);

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={ORANGE_DK} />

      {/* ── Orange gradient header ──────────────────────────── */}
      <SafeAreaView style={s.headerArea}>
        <LinearGradient
          colors={[ORANGE, ORANGE_DK]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={s.headerInner}>
          <Pressable style={s.headerLeft} onPress={() => setMenuOpen(true)}>
            <View style={s.avatar}>
              <Text style={s.avatarTxt}>{initial}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.headerDate}>{todayLabel}</Text>
              <View style={s.helloRow}>
                <Text style={s.hello} numberOfLines={1}>{displayName}</Text>
                <ChevronDown size={15} color="rgba(255,255,255,0.92)" strokeWidth={2.2} />
              </View>
              <View style={s.idRow}>
                <Text style={s.vendorId}>ID · {vendorId}</Text>
                <View style={s.verifyPill}>
                  <Check size={10} color="#A7F3D0" strokeWidth={3} />
                  <Text style={s.verifyTxt}>Verified</Text>
                </View>
              </View>
            </View>
          </Pressable>

          <Pressable
            style={s.bellBtn}
            onPress={() => router.push('/vendor/notifications' as never)}
            hitSlop={10}
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
        {/* HERO — Today's Sales (today-only, no analytics chart) */}
        <Pressable
          onPress={() => router.push('/vendor/earnings' as never)}
          style={({ pressed }) => [s.salesHero, pressed && { opacity: 0.96 }]}
        >
          <Text style={s.salesHeroLabel}>Today's sales</Text>
          <Text style={s.salesHeroValue}>{fmtINR(stats.todaySales)}</Text>
          {salesDelta !== null && (
            <Text style={[s.salesDelta, salesDelta >= 0 ? s.deltaUp : s.deltaDown]}>
              {salesDelta >= 0 ? '+' : '−'}{Math.abs(salesDelta)}% vs yesterday
            </Text>
          )}
          <View style={s.salesHeroFooter}>
            <Text style={s.salesHeroMeta}>{syncedLabel}</Text>
            <Text style={s.salesHeroLink}>View earnings</Text>
          </View>
        </Pressable>

        {/* 3-column secondary stats */}
        <View style={s.statRow}>
          <SmallStat
            value={String(stats.newOrders)}
            label="New orders"
            hint={stats.newOrders > 0 ? 'awaiting you' : 'all caught up'}
            valueColor={stats.newOrders > 0 ? ORANGE_DK : INK_900}
            badge={stats.newOrders > 0 ? 'Action' : undefined}
            onPress={stats.newOrders > 0 ? () => router.push('/vendor/orders' as never) : undefined}
          />
          <SmallStat
            value={String(stats.itemsSold)}
            label="Items sold"
            hint="vs yesterday"
            delta={itemsDelta}
          />
          <SmallStat
            value={String(stats.lowStock)}
            label="Low stock"
            hint={stats.lowStock > 0 ? 'restock soon' : 'all healthy'}
            valueColor={stats.lowStock > 0 ? RED : INK_900}
            warning={stats.lowStock > 0}
            onPress={stats.lowStock > 0 ? () => router.push('/vendor/products' as never) : undefined}
          />
        </View>

        {/* Recent orders */}
        <View style={s.section}>
          <View style={s.sectionHead}>
            <Text style={s.sectionTitle}>Recent orders</Text>
            <Pressable
              onPress={() => router.push('/vendor/orders' as never)}
              hitSlop={6}
            >
              <Text style={s.linkTxt}>View all</Text>
            </Pressable>
          </View>

          <View style={s.ordersCard}>
            {recent.length === 0 ? (
              <View style={s.emptyBox}>
                <Text style={s.emptyTitle}>No orders yet</Text>
                <Text style={s.emptyTxt}>New orders will appear here in real time.</Text>
              </View>
            ) : (
              recent.map((o, i) => {
                const pill = STATUS_PILL[o.status] ?? { label: o.status, bg: '#F1F5F9', fg: '#475569' };
                const orderShort = o.order_number.replace(/^CS/, '').slice(-5);
                const displayCustomer = o.customer_name ?? `Customer #${orderShort}`;
                const initials = o.customer_name
                  ? o.customer_name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
                  : 'C';
                return (
                  <Pressable
                    key={o.id}
                    onPress={() => router.push(`/vendor/orders?id=${o.id}` as never)}
                    style={({ pressed }) => [
                      s.orderRow,
                      i < recent.length - 1 && s.orderRowDivider,
                      pressed && { backgroundColor: HAIRLINE },
                    ]}
                  >
                    <View style={s.orderAvatar}>
                      <Text style={s.orderAvatarTxt}>{initials}</Text>
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <View style={s.orderTopRow}>
                        <Text style={s.orderTitle} numberOfLines={1}>{displayCustomer}</Text>
                        <Text style={s.orderAmt}>{fmtINR(o.total_amount)}</Text>
                      </View>
                      <Text style={s.orderSub} numberOfLines={1}>{o.items_summary}</Text>
                      <View style={s.orderMetaRow}>
                        <View style={[s.statusDot, { backgroundColor: pill.fg }]} />
                        <Text style={[s.statusInline, { color: pill.fg }]}>{pill.label}</Text>
                        <Text style={s.metaSep}>·</Text>
                        <Text style={s.orderMeta}>#{orderShort}</Text>
                        <Text style={s.metaSep}>·</Text>
                        <Text style={s.orderMeta}>{timeAgo(o.created_at)}</Text>
                      </View>
                    </View>
                  </Pressable>
                );
              })
            )}
          </View>
        </View>

        <View style={{ height: 8 }} />
      </ScrollView>

      {/* ── Menu drawer ──────────────────────────────────────── */}
      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <Pressable style={menu.backdrop} onPress={() => setMenuOpen(false)}>
          <Pressable style={menu.sheet} onPress={() => {}}>
            <View style={menu.handle} />
            <View style={menu.head}>
              <View style={menu.headAvatar}>
                <Text style={menu.headAvatarTxt}>{initial}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={menu.title}>{displayName}</Text>
                <Text style={menu.sub}>{profile?.phone || profile?.email}</Text>
              </View>
              <Pressable onPress={() => setMenuOpen(false)} hitSlop={10} style={menu.closeBtn}>
                <X size={16} color={INK_500} strokeWidth={2.2} />
              </Pressable>
            </View>

            <Pressable style={menu.item} onPress={() => { setMenuOpen(false); router.push('/vendor/account' as never); }}>
              <View style={{ flex: 1 }}>
                <Text style={menu.itemLabel}>Account</Text>
                <Text style={menu.itemSub}>Profile, contact, GST</Text>
              </View>
              <ChevronRight size={15} color={INK_400} strokeWidth={2} />
            </Pressable>

            <Pressable style={menu.item} onPress={() => { setMenuOpen(false); router.push('/vendor/orders?tab=delivered' as never); }}>
              <View style={{ flex: 1 }}>
                <Text style={menu.itemLabel}>Order history</Text>
                <Text style={menu.itemSub}>Delivered orders and payouts</Text>
              </View>
              <ChevronRight size={15} color={INK_400} strokeWidth={2} />
            </Pressable>

            <Pressable style={menu.item} onPress={() => { setMenuOpen(false); router.push('/vendor/notifications' as never); }}>
              <View style={{ flex: 1 }}>
                <Text style={menu.itemLabel}>Notifications</Text>
                <Text style={menu.itemSub}>{unreadCount > 0 ? `${unreadCount} unread` : 'View all notifications'}</Text>
              </View>
              <ChevronRight size={15} color={INK_400} strokeWidth={2} />
            </Pressable>

            <Pressable style={menu.itemDanger} onPress={handleSignOut}>
              <LogOut size={16} color={RED} strokeWidth={2} />
              <View style={{ flex: 1 }}>
                <Text style={[menu.itemLabel, { color: RED }]}>Sign out</Text>
                <Text style={menu.itemSub}>End your session on this device</Text>
              </View>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

/* ─── Small secondary stat (3-col row) ────────────────────────────────────── */
function SmallStat({
  value, label, hint, valueColor, badge, delta, warning, onPress,
}: {
  value: string; label: string; hint?: string;
  valueColor?: string;
  badge?: string;
  delta?: number | null;
  warning?: boolean;
  onPress?: () => void;
}) {
  const content = (
    <>
      <View style={ss.topRow}>
        <Text style={[ss.value, valueColor && { color: valueColor }]} numberOfLines={1}>
          {value}
        </Text>
        {warning ? (
          <AlertTriangle size={11} color={RED} strokeWidth={2.2} />
        ) : null}
      </View>
      <Text style={ss.label} numberOfLines={1}>{label}</Text>
      <View style={ss.hintRow}>
        {badge ? (
          <Text style={ss.badge}>{badge}</Text>
        ) : delta !== undefined && delta !== null ? (
          <Text style={[ss.delta, delta >= 0 ? s.deltaUp : s.deltaDown]}>
            {delta >= 0 ? '+' : '−'}{Math.abs(delta)}%
          </Text>
        ) : null}
        <Text style={ss.hint} numberOfLines={1}>{hint ?? ' '}</Text>
      </View>
    </>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [ss.tile, pressed && { opacity: 0.85 }]}
      >
        {content}
      </Pressable>
    );
  }
  return <View style={ss.tile}>{content}</View>;
}
const ss = StyleSheet.create({
  tile: {
    flex: 1,
    backgroundColor: SURFACE,
    borderRadius: 12,
    borderWidth: 1, borderColor: BORDER,
    paddingVertical: 14, paddingHorizontal: 14,
    minHeight: 96,
  },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  value: { fontFamily: FontFamily.bold, fontSize: 22, lineHeight: 26, color: INK_900, letterSpacing: -0.6 },
  label: { fontFamily: FontFamily.medium, fontSize: 12, lineHeight: 16, color: INK_700, marginTop: 4 },
  hintRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6, flexWrap: 'wrap' },
  hint:  { fontFamily: FontFamily.regular, fontSize: 11, color: INK_400 },
  badge: { fontFamily: FontFamily.semiBold, fontSize: 10.5, color: ORANGE_DK, letterSpacing: 0.1 },
  delta: { fontFamily: FontFamily.semiBold, fontSize: 11, letterSpacing: 0.1 },
});

/* ─── Styles ──────────────────────────────────────────────────────────────── */
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: CREAM },

  /* Header */
  headerArea: { backgroundColor: ORANGE, paddingBottom: 26 },
  headerInner: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'web' ? 12 : 6,
    paddingBottom: 4,
    gap: 12, position: 'relative',
  },
  headerLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 42, height: 42, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.32)',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarTxt:  { fontFamily: FontFamily.bold, fontSize: 17, color: '#fff', letterSpacing: -0.3 },
  headerDate: { fontFamily: FontFamily.medium, fontSize: 11, color: 'rgba(255,255,255,0.78)', letterSpacing: 0.2 },
  helloRow:   { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 1 },
  hello:      { fontFamily: FontFamily.semiBold, fontSize: 17, color: '#fff', letterSpacing: -0.3, maxWidth: '88%' },
  idRow:      { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  vendorId:   { fontFamily: FontFamily.regular, fontSize: 11.5, color: 'rgba(255,255,255,0.82)', letterSpacing: 0.1 },
  verifyPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.20)',
    paddingHorizontal: 8, paddingVertical: 2.5, borderRadius: 99,
  },
  verifyTxt: { fontFamily: FontFamily.medium, fontSize: 10, color: '#fff', letterSpacing: 0.3 },

  bellBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center', justifyContent: 'center',
    position: 'relative',
  },
  bellBadge: {
    position: 'absolute', top: -4, right: -4,
    minWidth: 18, height: 18, paddingHorizontal: 4, borderRadius: 9,
    backgroundColor: '#DC2626', borderWidth: 2, borderColor: ORANGE_DK,
    alignItems: 'center', justifyContent: 'center',
  },
  bellBadgeTxt: { fontFamily: FontFamily.bold, fontSize: 9.5, color: '#fff', lineHeight: 11 },

  /* Body */
  body: {
    flex: 1, backgroundColor: CREAM,
    borderTopLeftRadius: 22, borderTopRightRadius: 22,
    marginTop: -20,
  },
  scroll: { padding: 14, paddingTop: 20, gap: 18, paddingBottom: 14 },

  /* HERO — Today's Sales (today-only, typography-driven) */
  salesHero: {
    backgroundColor: SURFACE,
    borderRadius: 14,
    borderWidth: 1, borderColor: BORDER,
    paddingVertical: 22, paddingHorizontal: 20,
    ...Shadow.sm,
  },
  salesHeroLabel:  { fontFamily: FontFamily.medium, fontSize: 13, color: INK_500, letterSpacing: -0.05 },
  salesHeroValue:  { fontFamily: FontFamily.bold, fontSize: 38, lineHeight: 44, color: INK_900, letterSpacing: -1.4, marginTop: 6 },
  salesDelta:      { fontFamily: FontFamily.semiBold, fontSize: 12.5, letterSpacing: 0.1, marginTop: 6 },
  deltaUp:         { color: GREEN },
  deltaDown:       { color: RED },
  salesHeroFooter: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1, borderTopColor: HAIRLINE,
  },
  salesHeroMeta:   { fontFamily: FontFamily.regular, fontSize: 11.5, color: INK_400, letterSpacing: 0.1 },
  salesHeroLink:   { fontFamily: FontFamily.medium, fontSize: 11.5, color: ORANGE_DK },

  /* Secondary 3-col row */
  statRow: { flexDirection: 'row', gap: 10 },

  /* Section */
  section: { gap: 10 },
  sectionHead: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  sectionTitle: { fontFamily: FontFamily.semiBold, fontSize: 16, color: INK_900, letterSpacing: -0.3 },
  linkTxt:      { fontFamily: FontFamily.medium, fontSize: 12, color: ORANGE_DK, letterSpacing: -0.05 },

  /* Orders card */
  ordersCard: {
    backgroundColor: SURFACE,
    borderRadius: 14,
    borderWidth: 1, borderColor: BORDER,
    ...Shadow.sm,
  },
  emptyBox:   { alignItems: 'center', paddingVertical: 26, paddingHorizontal: 24, gap: 4 },
  emptyTitle: { fontFamily: FontFamily.semiBold, fontSize: 14, color: INK_700, letterSpacing: -0.1 },
  emptyTxt:   { fontFamily: FontFamily.regular, fontSize: 12, lineHeight: 17, color: INK_500, textAlign: 'center' },

  orderRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 13, paddingHorizontal: 14,
  },
  orderRowDivider: { borderBottomWidth: 1, borderBottomColor: HAIRLINE },
  orderAvatar: {
    width: 36, height: 36, borderRadius: 11,
    backgroundColor: HAIRLINE,
    alignItems: 'center', justifyContent: 'center',
  },
  orderAvatarTxt: { fontFamily: FontFamily.semiBold, fontSize: 12, color: INK_700, letterSpacing: 0.2 },

  orderTopRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  orderTitle:   { fontFamily: FontFamily.semiBold, fontSize: 13.5, color: INK_900, letterSpacing: -0.1, flex: 1 },
  orderSub:     { fontFamily: FontFamily.regular, fontSize: 11.5, lineHeight: 16, color: INK_500 },
  orderMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
  statusDot:    { width: 5, height: 5, borderRadius: 3 },
  statusInline: { fontFamily: FontFamily.semiBold, fontSize: 10.5, letterSpacing: 0.1 },
  metaSep:      { fontFamily: FontFamily.regular, fontSize: 10.5, color: INK_400 },
  orderMeta:    { fontFamily: FontFamily.regular, fontSize: 10.5, color: INK_400, letterSpacing: 0.1 },
  orderAmt:     { fontFamily: FontFamily.bold, fontSize: 13.5, color: INK_900, letterSpacing: -0.2 },
});

const menu = StyleSheet.create({
  backdrop: {
    flex: 1, backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: SURFACE,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingTop: 6, paddingBottom: Platform.OS === 'ios' ? 28 : 16,
  },
  handle: {
    alignSelf: 'center',
    width: 38, height: 4, borderRadius: 2,
    backgroundColor: '#E2E8F0', marginVertical: 8,
  },
  head: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 18, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: HAIRLINE,
  },
  headAvatar: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: ORANGE_BG, borderWidth: 1, borderColor: ORANGE_BR,
    alignItems: 'center', justifyContent: 'center',
  },
  headAvatarTxt: { fontFamily: FontFamily.semiBold, fontSize: 16, color: ORANGE_DK, letterSpacing: -0.3 },
  title: { fontFamily: FontFamily.semiBold, fontSize: 15, color: INK_900, letterSpacing: -0.2 },
  sub:   { fontFamily: FontFamily.regular,  fontSize: 12, lineHeight: 16, color: INK_500, marginTop: 2 },
  closeBtn: {
    width: 30, height: 30, borderRadius: 9,
    backgroundColor: HAIRLINE, alignItems: 'center', justifyContent: 'center',
  },
  item: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 18, paddingVertical: 14,
  },
  itemDanger: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 18, paddingVertical: 14,
    borderTopWidth: 1, borderTopColor: HAIRLINE, marginTop: 4,
  },
  itemLabel: { fontFamily: FontFamily.semiBold, fontSize: 13.5, color: INK_900, letterSpacing: -0.1 },
  itemSub:   { fontFamily: FontFamily.regular,  fontSize: 11, lineHeight: 15, color: INK_400, marginTop: 2 },
});
