import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import {
  Users, Store, Package, Truck, ShoppingCart,
  Clock, CheckCircle2, ArrowRight, RefreshCw,
  Tag, LayoutGrid, AlertCircle, Activity,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { FontFamily, Radius, Shadow } from '@/constants/theme';
import { supabase } from '@/services/supabase';
import { toast } from '@/services/toast';

/* ─── Palette ─────────────────────────────────────────────────────────────── */
const C = {
  bg:        '#F8FAFC',
  surface:   '#FFFFFF',
  border:    '#E2E8F0',
  borderHi:  '#CBD5E1',
  text:      '#0F172A',
  textSub:   '#334155',
  textMuted: '#64748B',
  textHint:  '#94A3B8',
  primary:   '#2563EB',
  primaryLt: '#EFF6FF',
  green:     '#15803D',
  greenLt:   '#F0FDF4',
  amber:     '#B45309',
  amberLt:   '#FFFBEB',
  red:       '#B91C1C',
  redLt:     '#FEF2F2',
  purple:    '#6D28D9',
  purpleLt:  '#F5F3FF',
  orange:    '#C2410C',
  orangeLt:  '#FFF7ED',
};

/* ─── Types ───────────────────────────────────────────────────────────────── */
type Stats = {
  totalUsers: number;
  pendingVendors: number;
  pendingProducts: number;
  pendingTransporters: number;
  totalOrders: number;
};

/* ─── Sub-components ──────────────────────────────────────────────────────── */
function KpiTile({
  icon: Icon, label, value, sub, loading, accent, accentBg, onPress,
}: {
  icon: any; label: string; value: number; sub: string; loading: boolean;
  accent: string; accentBg: string; onPress: () => void;
}) {
  return (
    <Pressable style={s.kpiTile} onPress={onPress}>
      <View style={s.kpiHead}>
        <View style={[s.kpiIcon, { backgroundColor: accentBg }]}>
          <Icon size={14} color={accent} strokeWidth={2} />
        </View>
        <Text style={s.kpiLabel}>{label}</Text>
      </View>
      <Text style={s.kpiValue}>
        {loading ? '—' : value.toLocaleString('en-IN')}
      </Text>
      <Text style={s.kpiSub}>{sub}</Text>
    </Pressable>
  );
}

function ShortcutChip({ icon: Icon, label, color, onPress }: {
  icon: any; label: string; color: string; onPress: () => void;
}) {
  return (
    <Pressable style={s.shortcut} onPress={onPress}>
      <Icon size={13} color={color} strokeWidth={2} />
      <Text style={s.shortcutTxt}>{label}</Text>
    </Pressable>
  );
}

function SectionHead({ title, sub, actionLabel, onAction }: {
  title: string; sub?: string; actionLabel?: string; onAction?: () => void;
}) {
  return (
    <View style={s.sectionHead}>
      <View style={{ flex: 1, gap: 1 }}>
        <Text style={s.sectionTitle}>{title}</Text>
        {sub ? <Text style={s.sectionSub}>{sub}</Text> : null}
      </View>
      {actionLabel && (
        <Pressable onPress={onAction} style={s.seeAllRow}>
          <Text style={s.seeAllTxt}>{actionLabel}</Text>
          <ArrowRight size={12} color={C.primary} strokeWidth={2.4} />
        </Pressable>
      )}
    </View>
  );
}

function roleChip(role: string): { label: string; bg: string; fg: string } {
  const map: Record<string, { label: string; bg: string; fg: string }> = {
    vendor:      { label: 'Vendor',      bg: C.amberLt,  fg: C.amber   },
    transporter: { label: 'Transporter', bg: C.orangeLt, fg: C.orange  },
    super_admin: { label: 'Admin',       bg: C.purpleLt, fg: C.purple  },
    admin:       { label: 'Admin',       bg: C.primaryLt,fg: C.primary },
    customer:    { label: 'Customer',    bg: C.greenLt,  fg: C.green   },
  };
  return map[role] ?? { label: role, bg: '#F1F5F9', fg: C.textMuted };
}

/* ─── Screen ──────────────────────────────────────────────────────────────── */
export default function SuperAdminDashboard() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isNarrow = width < 720;

  const [stats, setStats] = useState<Stats>({
    totalUsers: 0, pendingVendors: 0, pendingProducts: 0,
    pendingTransporters: 0, totalOrders: 0,
  });
  const [recentUsers, setRecentUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  useEffect(() => {
    fetchStats();
    const suffix = Math.random().toString(36).slice(2, 10);
    const channel = supabase
      .channel(`sa-dashboard-rt:${suffix}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, (payload: any) => {
        toast.show('New Order Placed', `Order #${payload.new?.order_number ?? '—'} needs approval`, 'info');
        fetchStats();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, (payload: any) => {
        const newStatus = payload.new?.status;
        const oldStatus = payload.old?.status;
        if (newStatus === 'pending_admin_pickup_confirmation' && oldStatus !== newStatus) {
          toast.show('Pickup Awaiting Confirm', `Order #${payload.new?.order_number ?? '—'}`, 'info');
        }
        if (newStatus === 'pending_admin_confirmation' && oldStatus !== newStatus) {
          toast.show('Delivery Awaiting Confirm', `Order #${payload.new?.order_number ?? '—'}`, 'info');
        }
        fetchStats();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'transport_requests' }, (payload: any) => {
        if (payload.new?.status === 'pending_approval') {
          toast.show('New Transport Request', 'Vendor requested a transport booking', 'info');
        }
        fetchStats();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'transport_reviews' }, (payload: any) => {
        toast.show('New Rating', `${payload.new?.rating ?? '—'}-star review just posted`, 'info');
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vendor_profiles' },      () => fetchStats())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transporter_profiles' }, () => fetchStats())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' },             () => fetchStats())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'profiles' },        () => fetchStats())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  async function fetchStats() {
    setLoading(true);
    try {
      const [users, vendors, products, transporters, orders] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('vendor_profiles').select('id', { count: 'exact', head: true }).in('kyc_status', ['submitted', 'under_review']),
        supabase.from('products').select('id', { count: 'exact', head: true }).eq('status', 'draft'),
        supabase.from('transporter_profiles').select('id', { count: 'exact', head: true }).in('kyc_status', ['submitted', 'under_review']),
        supabase.from('orders').select('id', { count: 'exact', head: true }),
      ]);
      setStats({
        totalUsers:          users.count         ?? 0,
        pendingVendors:      vendors.count       ?? 0,
        pendingProducts:     products.count      ?? 0,
        pendingTransporters: transporters.count  ?? 0,
        totalOrders:         orders.count        ?? 0,
      });
      const { data: recent } = await supabase
        .from('profiles')
        .select('id, full_name, role, blocked, verified, created_at')
        .order('created_at', { ascending: false })
        .limit(8);
      setRecentUsers(recent ?? []);
      setLastRefresh(new Date());
    } catch (_) {}
    setLoading(false);
  }

  const KPIS = [
    { label: 'Total Users',          value: stats.totalUsers,         sub: 'All roles',     accent: C.primary, accentBg: C.primaryLt, icon: Users,        route: '/superadmin/users' },
    { label: 'Pending Vendors',      value: stats.pendingVendors,     sub: 'Awaiting KYC',  accent: C.amber,   accentBg: C.amberLt,   icon: Store,        route: '/superadmin/vendors' },
    { label: 'Pending Products',     value: stats.pendingProducts,    sub: 'Draft review',  accent: C.purple,  accentBg: C.purpleLt,  icon: Package,      route: '/superadmin/products' },
    { label: 'Pending Transporters', value: stats.pendingTransporters,sub: 'Awaiting KYC',  accent: C.orange,  accentBg: C.orangeLt,  icon: Truck,        route: '/superadmin/transporters' },
    { label: 'Total Orders',         value: stats.totalOrders,        sub: 'All time',      accent: C.green,   accentBg: C.greenLt,   icon: ShoppingCart, route: '/superadmin/orders' },
  ];

  const SHORTCUTS = [
    { label: 'Vendors',     icon: Store,        color: C.amber,   route: '/superadmin/vendors' },
    { label: 'Products',    icon: Package,      color: C.purple,  route: '/superadmin/products' },
    { label: 'Categories',  icon: LayoutGrid,   color: C.primary, route: '/superadmin/categories' },
    { label: 'Brands',      icon: Tag,          color: C.green,   route: '/superadmin/brands' },
    { label: 'Orders',      icon: ShoppingCart, color: C.orange,  route: '/superadmin/orders' },
    { label: 'Transport',   icon: Truck,        color: C.primary, route: '/superadmin/transport-requests' },
  ];

  const pendingCount = stats.pendingVendors + stats.pendingProducts + stats.pendingTransporters;

  return (
    <ScrollView style={s.root} contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

      {/* ── Page Header ────────────────────────────────────────── */}
      <View style={s.pageHeader}>
        <View style={s.headerLeft}>
          <Text style={s.pageTitle}>Overview</Text>
          <Text style={s.pageSubtitle}>
            Last updated {lastRefresh.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
        <View style={s.headerRight}>
          <View style={s.livePill}>
            <View style={s.liveDot} />
            <Text style={s.liveTxt}>Live</Text>
          </View>
          <Pressable style={s.refreshBtn} onPress={fetchStats} disabled={loading}>
            {loading
              ? <ActivityIndicator size="small" color={C.textMuted} />
              : <RefreshCw size={13} color={C.textMuted} strokeWidth={2} />}
            {!loading && <Text style={s.refreshTxt}>Refresh</Text>}
          </Pressable>
        </View>
      </View>

      {/* ── Pending Alert ──────────────────────────────────────── */}
      {!loading && pendingCount > 0 && (
        <Pressable
          style={s.alertBanner}
          onPress={() => router.push('/superadmin/vendors' as never)}
        >
          <View style={s.alertIcon}>
            <AlertCircle size={14} color={C.amber} strokeWidth={2.2} />
          </View>
          <Text style={s.alertTxt}>
            <Text style={s.alertStrong}>{pendingCount} item{pendingCount > 1 ? 's' : ''}</Text>
            {' '}awaiting your approval
          </Text>
          <Text style={s.alertCta}>Review →</Text>
        </Pressable>
      )}

      {/* ── KPI Row ────────────────────────────────────────────── */}
      <View style={s.kpiGrid}>
        {KPIS.map(k => (
          <View key={k.label} style={isNarrow ? { width: '48%' } : { flex: 1, minWidth: 160 }}>
            <KpiTile
              icon={k.icon}
              label={k.label}
              value={k.value}
              sub={k.sub}
              accent={k.accent}
              accentBg={k.accentBg}
              loading={loading}
              onPress={() => router.push(k.route as never)}
            />
          </View>
        ))}
      </View>

      {/* ── Shortcuts ──────────────────────────────────────────── */}
      <View style={s.section}>
        <SectionHead title="Quick access" />
        <View style={s.shortcutsRow}>
          {SHORTCUTS.map(sh => (
            <ShortcutChip
              key={sh.label}
              icon={sh.icon}
              label={sh.label}
              color={sh.color}
              onPress={() => router.push(sh.route as never)}
            />
          ))}
        </View>
      </View>

      {/* ── Recent Sign-ups Table ─────────────────────────────── */}
      <View style={s.section}>
        <SectionHead
          title="Recent sign-ups"
          sub="Latest 8 accounts across all roles"
          actionLabel="View all"
          onAction={() => router.push('/superadmin/users' as never)}
        />

        <View style={s.tableCard}>
          <View style={s.tableHead}>
            <Text style={[s.th, { flex: 2 }]}>Name</Text>
            <Text style={[s.th, { flex: 1 }]}>Role</Text>
            <Text style={[s.th, { flex: 1 }]}>Status</Text>
            <Text style={[s.th, { flex: 1.2, textAlign: 'right' }]}>Joined</Text>
          </View>

          {loading ? (
            <View style={s.tableEmpty}>
              <ActivityIndicator color={C.primary} size="small" />
            </View>
          ) : recentUsers.length === 0 ? (
            <View style={s.tableEmpty}>
              <Text style={s.emptyTxt}>No users yet</Text>
            </View>
          ) : (
            recentUsers.map((u, i) => {
              const chip = roleChip(u.role);
              return (
                <View
                  key={u.id}
                  style={[s.tableRow, i === recentUsers.length - 1 && { borderBottomWidth: 0 }]}
                >
                  <View style={{ flex: 2, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={[s.avatar, { backgroundColor: chip.bg }]}>
                      <Text style={[s.avatarTxt, { color: chip.fg }]}>
                        {(u.full_name || '?')[0].toUpperCase()}
                      </Text>
                    </View>
                    <Text style={s.td} numberOfLines={1}>
                      {u.full_name || <Text style={s.tdMuted}>Unnamed</Text>}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={[s.pill, { backgroundColor: chip.bg }]}>
                      <Text style={[s.pillTxt, { color: chip.fg }]}>{chip.label}</Text>
                    </View>
                  </View>
                  <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    {u.verified
                      ? <CheckCircle2 size={11} color={C.green}  strokeWidth={2.2} />
                      : <Clock        size={11} color={C.amber}  strokeWidth={2.2} />}
                    <Text style={[s.tdMuted, { color: u.verified ? C.green : C.amber }]}>
                      {u.verified ? 'Active' : 'Pending'}
                    </Text>
                  </View>
                  <Text style={[s.tdMuted, { flex: 1.2, textAlign: 'right' }]}>
                    {u.created_at ? new Date(u.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'}
                  </Text>
                </View>
              );
            })
          )}
        </View>
      </View>

      {/* ── Platform Health Footer ────────────────────────────── */}
      <View style={s.healthCard}>
        <View style={[s.healthIcon, { backgroundColor: C.greenLt }]}>
          <Activity size={14} color={C.green} strokeWidth={2.2} />
        </View>
        <View style={{ flex: 1, gap: 1 }}>
          <Text style={s.healthTitle}>All systems operational</Text>
          <Text style={s.healthSub}>Realtime sync active · No incidents</Text>
        </View>
        <View style={s.healthDot} />
      </View>

    </ScrollView>
  );
}

/* ─── Styles ──────────────────────────────────────────────────────────────── */
const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: C.bg },
  scroll: { padding: 20, gap: 20, paddingBottom: 40 },

  section: { gap: 12 },

  /* Page header */
  pageHeader: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
    paddingBottom: 4,
  },
  headerLeft:  { gap: 2 },
  pageTitle:   { fontFamily: FontFamily.bold, fontSize: 22, color: C.text, letterSpacing: -0.3 },
  pageSubtitle:{ fontFamily: FontFamily.regular, fontSize: 12, color: C.textHint },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  livePill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: C.greenLt, borderRadius: Radius.full,
    paddingHorizontal: 9, paddingVertical: 4,
    borderWidth: 1, borderColor: '#BBF7D0',
  },
  liveDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: C.green },
  liveTxt: { fontFamily: FontFamily.semiBold, fontSize: 11, color: C.green, letterSpacing: 0.1 },
  refreshBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    height: 32, paddingHorizontal: 12,
    borderRadius: Radius.sm,
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
  },
  refreshTxt: { fontFamily: FontFamily.semiBold, fontSize: 12, color: C.textSub },

  /* Alert banner */
  alertBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: C.amberLt, borderRadius: Radius.md,
    paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1, borderColor: '#FDE68A',
  },
  alertIcon: {
    width: 24, height: 24, borderRadius: Radius.xs,
    backgroundColor: '#FEF3C7',
    alignItems: 'center', justifyContent: 'center',
  },
  alertTxt:    { flex: 1, fontFamily: FontFamily.regular, fontSize: 13, color: C.amber, lineHeight: 18 },
  alertStrong: { fontFamily: FontFamily.semiBold, color: C.amber },
  alertCta:    { fontFamily: FontFamily.semiBold, fontSize: 12, color: C.amber },

  /* Section header */
  sectionHead: {
    flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between',
  },
  sectionTitle: { fontFamily: FontFamily.semiBold, fontSize: 14, color: C.text, letterSpacing: -0.1 },
  sectionSub:   { fontFamily: FontFamily.regular,  fontSize: 12, color: C.textHint },
  seeAllRow:    { flexDirection: 'row', alignItems: 'center', gap: 3 },
  seeAllTxt:    { fontFamily: FontFamily.semiBold, fontSize: 12, color: C.primary },

  /* KPI grid */
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  kpiTile: {
    backgroundColor: C.surface,
    borderRadius: Radius.md,
    borderWidth: 1, borderColor: C.border,
    padding: 14,
    gap: 8,
    ...Shadow.sm,
  },
  kpiHead:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  kpiIcon:  {
    width: 24, height: 24, borderRadius: Radius.xs,
    alignItems: 'center', justifyContent: 'center',
  },
  kpiLabel: {
    fontFamily: FontFamily.medium, fontSize: 12, color: C.textMuted,
    letterSpacing: 0.1,
  },
  kpiValue: {
    fontFamily: FontFamily.bold, fontSize: 24, color: C.text,
    letterSpacing: -0.5, lineHeight: 28,
  },
  kpiSub:   { fontFamily: FontFamily.regular, fontSize: 11, color: C.textHint },

  /* Shortcuts */
  shortcutsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  shortcut: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: C.surface, borderRadius: Radius.sm,
    borderWidth: 1, borderColor: C.border,
    paddingHorizontal: 12, paddingVertical: 8,
  },
  shortcutTxt: { fontFamily: FontFamily.semiBold, fontSize: 12.5, color: C.textSub },

  /* Table */
  tableCard: {
    backgroundColor: C.surface, borderRadius: Radius.md,
    borderWidth: 1, borderColor: C.border,
    overflow: 'hidden',
    ...Shadow.sm,
  },
  tableHead: {
    flexDirection: 'row',
    backgroundColor: C.bg,
    paddingHorizontal: 14, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  th: { fontFamily: FontFamily.semiBold, fontSize: 10, color: C.textHint, textTransform: 'uppercase', letterSpacing: 0.6 },
  tableRow: {
    flexDirection: 'row',
    paddingHorizontal: 14, paddingVertical: 11,
    alignItems: 'center',
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  tableEmpty: { padding: 32, alignItems: 'center' },
  emptyTxt:   { fontFamily: FontFamily.regular, fontSize: 13, color: C.textHint },
  td:         { fontFamily: FontFamily.medium,  fontSize: 13, color: C.text },
  tdMuted:    { fontFamily: FontFamily.regular, fontSize: 12, color: C.textMuted },
  avatar: {
    width: 26, height: 26, borderRadius: Radius.xs,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  avatarTxt: { fontFamily: FontFamily.semiBold, fontSize: 11 },
  pill: {
    alignSelf: 'flex-start', borderRadius: Radius.full,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  pillTxt: { fontFamily: FontFamily.semiBold, fontSize: 10.5, letterSpacing: 0.1 },

  /* Health footer */
  healthCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: C.surface, borderRadius: Radius.md,
    borderWidth: 1, borderColor: C.border,
    padding: 12,
  },
  healthIcon: {
    width: 28, height: 28, borderRadius: Radius.xs,
    alignItems: 'center', justifyContent: 'center',
  },
  healthTitle: { fontFamily: FontFamily.semiBold, fontSize: 12.5, color: C.text },
  healthSub:   { fontFamily: FontFamily.regular,  fontSize: 11.5, color: C.textHint },
  healthDot:   { width: 6, height: 6, borderRadius: 3, backgroundColor: C.green },
});
