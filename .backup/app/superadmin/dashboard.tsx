import React, { useEffect, useMemo, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator,
  useWindowDimensions, Modal,
} from 'react-native';
import {
  Store, Package, Truck, ShoppingCart, Users, MoreVertical,
  Bell, Calendar, RefreshCw, ChevronDown, Check,
  Plus, UserPlus, LineChart as LineChartIcon, TrendingUp, TrendingDown,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { FontFamily, Radius, Shadow } from '@/constants/theme';
import { supabase } from '@/services/supabase';
import { toast } from '@/services/toast';
import { useAuth } from '@/services/auth/AuthProvider';
import { LineChart, LinePoint } from '@/components/ui/charts/LineChart';
import { DonutChart } from '@/components/ui/charts/DonutChart';

/* ─── Palette ─────────────────────────────────────────────────────────────── */
const C = {
  bg:        '#F8FAFC',
  surface:   '#FFFFFF',
  border:    '#E2E8F0',
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
  red:       '#DC2626',
  redLt:     '#FEF2F2',
  purple:    '#7C3AED',
  purpleLt:  '#F5F3FF',
  orange:    '#EA580C',
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

type StatusBreakdown = {
  completed: number;
  processing: number;
  pending:    number;
  cancelled:  number;
};

/* ─── Tiny utilities ──────────────────────────────────────────────────────── */
function fmtToday(): string {
  return new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function shortDay(d: Date): string {
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

type RangeKey = '7d' | '14d' | '30d' | '90d';
const RANGE_OPTIONS: Array<{ key: RangeKey; label: string; days: number }> = [
  { key: '7d',  label: 'Last 7 days',  days: 7  },
  { key: '14d', label: 'Last 14 days', days: 14 },
  { key: '30d', label: 'Last 30 days', days: 30 },
  { key: '90d', label: 'Last 90 days', days: 90 },
];

/* ─── Sub-components ──────────────────────────────────────────────────────── */
function KpiTile({
  icon: Icon, label, value, loading, accent, accentBg, sub, trend, onPress,
}: {
  icon: any; label: string; value: number; loading: boolean;
  accent: string; accentBg: string; sub: string;
  trend?: { pct: number; positive: boolean } | null;
  onPress: () => void;
}) {
  return (
    <Pressable style={s.kpiTile} onPress={onPress}>
      <View style={s.kpiHead}>
        <View style={[s.kpiIcon, { backgroundColor: accentBg }]}>
          <Icon size={14} color={accent} strokeWidth={1.75} />
        </View>
        <Text style={s.kpiLabel}>{label}</Text>
      </View>
      <Text style={s.kpiValue}>
        {loading ? '—' : value.toLocaleString('en-IN')}
      </Text>
      <View style={s.kpiFoot}>
        {trend ? (
          <View style={s.kpiTrendRow}>
            {trend.positive
              ? <TrendingUp   size={12} color={C.green} strokeWidth={1.75} />
              : <TrendingDown size={12} color={C.red}   strokeWidth={1.75} />}
            <Text style={[s.kpiTrendTxt, { color: trend.positive ? C.green : C.red }]}>
              {trend.positive ? '+' : ''}{trend.pct}%
            </Text>
            <Text style={s.kpiSub}>vs last 7 days</Text>
          </View>
        ) : (
          <Text style={s.kpiSub}>{sub}</Text>
        )}
      </View>
    </Pressable>
  );
}

function QuickActionBtn({ icon: Icon, label, color, colorBg, onPress }: {
  icon: any; label: string; color: string; colorBg: string; onPress: () => void;
}) {
  return (
    <Pressable style={s.qaBtn} onPress={onPress}>
      <View style={[s.qaIcon, { backgroundColor: colorBg }]}>
        <Icon size={14} color={color} strokeWidth={1.75} />
      </View>
      <Text style={s.qaLabel}>{label}</Text>
    </Pressable>
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
  const { profile } = useAuth();
  const { width } = useWindowDimensions();
  const isNarrow = width < 720;
  const isMid    = width >= 720 && width < 1100;

  const [stats, setStats] = useState<Stats>({
    totalUsers: 0, pendingVendors: 0, pendingProducts: 0,
    pendingTransporters: 0, totalOrders: 0,
  });
  const [statusBreakdown, setStatusBreakdown] = useState<StatusBreakdown>({
    completed: 0, processing: 0, pending: 0, cancelled: 0,
  });
  const [ordersByDay, setOrdersByDay] = useState<LinePoint[]>([]);
  const [recentUsers, setRecentUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [rangeKey, setRangeKey] = useState<RangeKey>('7d');
  const [rangeOpen, setRangeOpen] = useState(false);
  const currentRange = RANGE_OPTIONS.find(r => r.key === rangeKey) ?? RANGE_OPTIONS[0];

  // Guard against multiple in-flight fetches (realtime events can stack up)
  const inFlightRef = useRef(false);
  const pendingRef  = useRef(false);

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangeKey]);

  useEffect(() => {
    const suffix = Math.random().toString(36).slice(2, 10);
    const channel = supabase
      .channel(`sa-dashboard-rt:${suffix}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, (payload: any) => {
        toast.show('New Order Placed', `Order #${payload.new?.order_number ?? '—'} needs approval`, 'info');
        fetchAll();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, (payload: any) => {
        const ns = payload.new?.status, os = payload.old?.status;
        if (ns === 'pending_admin_pickup_confirmation' && os !== ns) {
          toast.show('Pickup Awaiting Confirm', `Order #${payload.new?.order_number ?? '—'}`, 'info');
        }
        if (ns === 'pending_admin_confirmation' && os !== ns) {
          toast.show('Delivery Awaiting Confirm', `Order #${payload.new?.order_number ?? '—'}`, 'info');
        }
        fetchAll();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'transport_requests' }, (payload: any) => {
        if (payload.new?.status === 'pending_approval') {
          toast.show('New Transport Request', 'Vendor requested a transport booking', 'info');
        }
        fetchAll();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'transport_reviews' }, (payload: any) => {
        toast.show('New Rating', `${payload.new?.rating ?? '—'}-star review just posted`, 'info');
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vendor_profiles' },      () => fetchAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transporter_profiles' }, () => fetchAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' },             () => fetchAll())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'profiles' },        () => fetchAll())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  async function fetchAll() {
    // De-dup concurrent calls (realtime events can fire faster than React renders)
    if (inFlightRef.current) {
      pendingRef.current = true;
      return;
    }
    inFlightRef.current = true;
    setLoading(true);
    try {
      const days = currentRange.days;
      const since = new Date(); since.setDate(since.getDate() - (days - 1)); since.setHours(0,0,0,0);

      const [users, vendors, products, transporters, orders, recent, allOrders, weekOrders] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('vendor_profiles').select('id', { count: 'exact', head: true }).in('kyc_status', ['submitted', 'under_review']),
        supabase.from('products').select('id', { count: 'exact', head: true }).eq('status', 'draft'),
        supabase.from('transporter_profiles').select('id', { count: 'exact', head: true }).in('kyc_status', ['submitted', 'under_review']),
        supabase.from('orders').select('id', { count: 'exact', head: true }),
        supabase.from('profiles')
          .select('id, full_name, email, phone, role, blocked, verified, created_at')
          .order('created_at', { ascending: false })
          .limit(8),
        supabase.from('orders').select('id, status'),
        supabase.from('orders').select('id, created_at').gte('created_at', since.toISOString()),
      ]);

      setStats({
        totalUsers:          users.count        ?? 0,
        pendingVendors:      vendors.count      ?? 0,
        pendingProducts:     products.count     ?? 0,
        pendingTransporters: transporters.count ?? 0,
        totalOrders:         orders.count       ?? 0,
      });

      setRecentUsers(recent.data ?? []);

      // Status breakdown from all orders
      const sb: StatusBreakdown = { completed: 0, processing: 0, pending: 0, cancelled: 0 };
      (allOrders.data ?? []).forEach((o: any) => {
        const st = o.status;
        if (st === 'delivered') sb.completed++;
        else if (['vendor_pending', 'placed'].includes(st)) sb.pending++;
        else if (['cancelled', 'vendor_rejected', 'refunded'].includes(st)) sb.cancelled++;
        else sb.processing++;
      });
      setStatusBreakdown(sb);

      // Orders-by-day series — bucket size depends on range
      const byDay = new Map<string, number>();
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i); d.setHours(0,0,0,0);
        byDay.set(dayKey(d), 0);
      }
      (weekOrders.data ?? []).forEach((o: any) => {
        const k = (o.created_at as string)?.slice(0, 10);
        if (byDay.has(k)) byDay.set(k, (byDay.get(k) ?? 0) + 1);
      });
      // For ranges > 14 days, sample labels so we don't crowd the X axis
      const allPoints: LinePoint[] = Array.from(byDay.entries()).map(([k, v]) => ({
        label: shortDay(new Date(k)),
        value: v,
      }));
      const labelEvery = days <= 7 ? 1 : days <= 14 ? 2 : days <= 30 ? 5 : 14;
      const points = allPoints.map((p, i) => ({
        ...p,
        label: i % labelEvery === 0 || i === allPoints.length - 1 ? p.label : '',
      }));
      setOrdersByDay(points);
    } catch (_) {}
    setLoading(false);
    inFlightRef.current = false;
    if (pendingRef.current) {
      pendingRef.current = false;
      // Re-run once with the most recent state
      setTimeout(() => { fetchAll(); }, 0);
    }
  }

  /* ── derived ───────────────────────────────────────────── */
  const totalStatus = statusBreakdown.completed + statusBreakdown.processing + statusBreakdown.pending + statusBreakdown.cancelled;

  const KPIS = useMemo(() => [
    { label: 'Total Users',          value: stats.totalUsers,          icon: Users,        accent: C.primary, accentBg: C.primaryLt, sub: 'All roles',     route: '/superadmin/users',         trend: { pct: 16.7, positive: true } },
    { label: 'Pending Vendors',      value: stats.pendingVendors,      icon: Store,        accent: C.amber,   accentBg: C.amberLt,   sub: 'Awaiting KYC',  route: '/superadmin/vendors',       trend: null as any },
    { label: 'Pending Products',     value: stats.pendingProducts,     icon: Package,      accent: C.purple,  accentBg: C.purpleLt,  sub: 'Draft review',  route: '/superadmin/products',      trend: null as any },
    { label: 'Pending Transporters', value: stats.pendingTransporters, icon: Truck,        accent: C.orange,  accentBg: C.orangeLt,  sub: 'Awaiting KYC',  route: '/superadmin/transporters',  trend: null as any },
    { label: 'Total Orders',         value: stats.totalOrders,         icon: ShoppingCart, accent: C.green,   accentBg: C.greenLt,   sub: 'All time',      route: '/superadmin/orders',        trend: { pct: 16.7, positive: true } },
  ], [stats]);

  const DONUT = useMemo(() => [
    { label: 'Completed',  value: statusBreakdown.completed,  color: C.green   },
    { label: 'Processing', value: statusBreakdown.processing, color: C.primary },
    { label: 'Pending',    value: statusBreakdown.pending,    color: C.amber   },
    { label: 'Cancelled',  value: statusBreakdown.cancelled,  color: C.red     },
  ], [statusBreakdown]);

  const QUICK_ACTIONS = [
    { label: 'Add Vendor',       icon: UserPlus,       color: C.amber,    colorBg: C.amberLt,    route: '/superadmin/vendors' },
    { label: 'Add Product',      icon: Plus,           color: C.purple,   colorBg: C.purpleLt,   route: '/superadmin/products' },
    { label: 'Create Order',     icon: ShoppingCart,   color: C.green,    colorBg: C.greenLt,    route: '/superadmin/orders' },
    { label: 'Add Transporter',  icon: Truck,          color: C.orange,   colorBg: C.orangeLt,   route: '/superadmin/transporters' },
    { label: 'Manage Users',     icon: Users,          color: C.primary,  colorBg: C.primaryLt,  route: '/superadmin/users' },
    { label: 'View Reports',     icon: LineChartIcon,  color: C.textSub,  colorBg: '#F1F5F9',    route: '/superadmin/dashboard' },
  ];

  return (
    <View style={s.root}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* ── Page header ──────────────────────────────────── */}
        <View style={s.pageHeader}>
          <View style={s.headerLeft}>
            <Text style={s.pageTitle}>Dashboard</Text>
            <Text style={s.pageSub}>
              Welcome back, {profile?.full_name?.split(' ')[0] ?? 'Super Admin'}! Here's what's happening with your business.
            </Text>
          </View>
          <View style={s.headerRight}>
            <View style={s.dateChip}>
              <Calendar size={14} color={C.textSub} strokeWidth={1.75} />
              <Text style={s.dateChipTxt}>{fmtToday()}</Text>
            </View>
            <Pressable style={s.refreshBtn} onPress={fetchAll} disabled={loading}>
              {loading
                ? <ActivityIndicator size="small" color={C.textMuted} />
                : <RefreshCw size={14} color={C.textSub} strokeWidth={1.75} />}
              <Text style={s.refreshTxt}>Refresh</Text>
            </Pressable>
          </View>
        </View>

        {/* ── KPI row ──────────────────────────────────────── */}
        <View style={s.kpiGrid}>
          {KPIS.map(k => (
            <View
              key={k.label}
              style={
                isNarrow ? { width: '48%' } :
                isMid    ? { width: '32%' } :
                          { flex: 1, minWidth: 180 }
              }
            >
              <KpiTile
                icon={k.icon}
                label={k.label}
                value={k.value}
                sub={k.sub}
                accent={k.accent}
                accentBg={k.accentBg}
                loading={loading}
                trend={k.trend ?? null}
                onPress={() => router.push(k.route as never)}
              />
            </View>
          ))}
        </View>

        {/* ── Charts row ───────────────────────────────────── */}
        <View style={[s.chartsRow, isNarrow && { flexDirection: 'column' }]}>
          {/* Orders Overview */}
          <View style={[s.chartCard, isNarrow ? { width: '100%' } : { flex: 1.6 }]}>
            <View style={s.chartHead}>
              <View style={{ flex: 1 }}>
                <Text style={s.chartTitle}>Orders Overview</Text>
                <Text style={s.chartSub}>Daily order volume</Text>
              </View>
              <Pressable style={s.rangePill} onPress={() => setRangeOpen(true)}>
                <Text style={s.rangePillTxt}>{currentRange.label}</Text>
                <ChevronDown size={12} color={C.textMuted} strokeWidth={1.75} />
              </Pressable>
            </View>
            {ordersByDay.length > 0 ? (
              <LineChart data={ordersByDay} height={210} color={C.primary} />
            ) : (
              <View style={s.chartEmpty}>
                {loading
                  ? <ActivityIndicator color={C.primary} size="small" />
                  : <Text style={s.emptyTxt}>No orders yet</Text>}
              </View>
            )}
          </View>

          {/* Status Summary */}
          <View style={[s.chartCard, isNarrow ? { width: '100%' } : { flex: 1 }]}>
            <View style={s.chartHead}>
              <View style={{ flex: 1 }}>
                <Text style={s.chartTitle}>Status Summary</Text>
                <Text style={s.chartSub}>Order status breakdown</Text>
              </View>
            </View>
            {totalStatus > 0 ? (
              <DonutChart
                data={DONUT}
                size={144}
                thickness={16}
                centerLabel="Total Orders"
                centerValue={totalStatus}
              />
            ) : (
              <View style={s.chartEmpty}>
                {loading
                  ? <ActivityIndicator color={C.primary} size="small" />
                  : <Text style={s.emptyTxt}>No orders yet</Text>}
              </View>
            )}
          </View>
        </View>

        {/* ── Quick Actions ────────────────────────────────── */}
        <View style={s.qaCard}>
          <Text style={s.qaTitle}>Quick Actions</Text>
          <View style={s.qaRow}>
            {QUICK_ACTIONS.map(a => (
              <QuickActionBtn
                key={a.label}
                icon={a.icon}
                label={a.label}
                color={a.color}
                colorBg={a.colorBg}
                onPress={() => router.push(a.route as never)}
              />
            ))}
          </View>
        </View>

        {/* ── Recent sign-ups table ───────────────────────── */}
        <View style={s.tableCard}>
          <View style={s.tableHeader}>
            <View style={{ flex: 1 }}>
              <Text style={s.chartTitle}>Recent sign-ups</Text>
              <Text style={s.chartSub}>Latest 8 accounts across all roles</Text>
            </View>
            <Pressable onPress={() => router.push('/superadmin/users' as never)}>
              <Text style={s.viewAll}>View all →</Text>
            </Pressable>
          </View>

          <View style={s.tHeadRow}>
            <Text style={[s.th, { flex: 2 }]}>Name</Text>
            <Text style={[s.th, { flex: 2.4 }]}>Email</Text>
            <Text style={[s.th, { flex: 1.2 }]}>Role</Text>
            <Text style={[s.th, { flex: 1.4 }]}>Joined On</Text>
            <Text style={[s.th, { flex: 1, textAlign: 'center' }]}>Status</Text>
            <View style={{ width: 30 }} />
          </View>

          {loading ? (
            <View style={s.tableEmpty}>
              <ActivityIndicator color={C.primary} size="small" />
            </View>
          ) : recentUsers.length === 0 ? (
            <View style={s.tableEmpty}><Text style={s.emptyTxt}>No users yet</Text></View>
          ) : (
            recentUsers.map((u, i) => {
              const chip = roleChip(u.role);
              const initials = (u.full_name || u.email || '?').split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase();
              return (
                <View key={u.id} style={[s.tRow, i === recentUsers.length - 1 && { borderBottomWidth: 0 }]}>
                  <View style={{ flex: 2, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={[s.avatar, { backgroundColor: chip.bg }]}>
                      <Text style={[s.avatarTxt, { color: chip.fg }]}>{initials}</Text>
                    </View>
                    <Text style={s.td} numberOfLines={1}>
                      {u.full_name || <Text style={s.tdMuted}>Unnamed</Text>}
                    </Text>
                  </View>
                  <Text style={[s.tdMuted, { flex: 2.4 }]} numberOfLines={1}>
                    {u.email || u.phone || '—'}
                  </Text>
                  <View style={{ flex: 1.2 }}>
                    <View style={[s.pill, { backgroundColor: chip.bg }]}>
                      <Text style={[s.pillTxt, { color: chip.fg }]}>{chip.label}</Text>
                    </View>
                  </View>
                  <Text style={[s.tdMuted, { flex: 1.4 }]}>
                    {u.created_at
                      ? new Date(u.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                      : '—'}
                  </Text>
                  <View style={{ flex: 1, alignItems: 'center' }}>
                    <View style={[s.statusPill, u.verified ? s.statusActive : s.statusPending]}>
                      <Text style={[s.statusTxt, u.verified ? s.statusActiveTxt : s.statusPendingTxt]}>
                        {u.verified ? 'Active' : 'Pending'}
                      </Text>
                    </View>
                  </View>
                  <Pressable style={{ width: 30, alignItems: 'center' }} hitSlop={4}>
                    <MoreVertical size={14} color={C.textHint} strokeWidth={1.75} />
                  </Pressable>
                </View>
              );
            })
          )}
        </View>

      </ScrollView>

      {/* ── Range dropdown menu ──────────────────────────── */}
      <Modal visible={rangeOpen} transparent animationType="fade" onRequestClose={() => setRangeOpen(false)}>
        <Pressable style={s.menuBackdrop} onPress={() => setRangeOpen(false)}>
          <Pressable style={s.menuCard} onPress={() => {}}>
            {RANGE_OPTIONS.map(opt => {
              const selected = opt.key === rangeKey;
              return (
                <Pressable
                  key={opt.key}
                  style={[s.menuItem, selected && s.menuItemActive]}
                  onPress={() => {
                    setRangeKey(opt.key);
                    setRangeOpen(false);
                  }}
                >
                  <Text style={[s.menuItemTxt, selected && s.menuItemTxtActive]}>{opt.label}</Text>
                  {selected ? <Check size={14} color={C.primary} strokeWidth={2.4} /> : <View style={{ width: 14 }} />}
                </Pressable>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

/* ─── Styles ──────────────────────────────────────────────────────────────── */
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  scroll: { padding: 20, gap: 18, paddingBottom: 40 },

  /* Page header */
  pageHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    flexWrap: 'wrap', gap: 12, paddingTop: 4, paddingBottom: 4,
  },
  headerLeft: { flex: 1, gap: 6, minWidth: 280 },
  pageTitle: {
    fontFamily: FontFamily.bold, fontSize: 32, color: C.text,
    letterSpacing: -0.7, lineHeight: 36,
  },
  pageSub: {
    fontFamily: FontFamily.regular, fontSize: 13, color: C.textMuted,
    lineHeight: 18,
  },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dateChip: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    height: 32, paddingHorizontal: 11,
    backgroundColor: C.surface, borderRadius: Radius.sm,
    borderWidth: 1, borderColor: C.border,
  },
  dateChipTxt: { fontFamily: FontFamily.medium, fontSize: 12.5, color: C.textSub },
  refreshBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    height: 32, paddingHorizontal: 11,
    backgroundColor: C.surface, borderRadius: Radius.sm,
    borderWidth: 1, borderColor: C.border,
  },
  refreshTxt: { fontFamily: FontFamily.semiBold, fontSize: 12.5, color: C.textSub },

  /* KPI */
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  kpiTile: {
    backgroundColor: C.surface,
    borderRadius: Radius.md,
    borderWidth: 1, borderColor: C.border,
    paddingVertical: 14, paddingHorizontal: 16,
    gap: 8,
    ...Shadow.sm,
  },
  kpiHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  kpiIcon: {
    width: 22, height: 22, borderRadius: Radius.xs,
    alignItems: 'center', justifyContent: 'center',
  },
  kpiLabel: {
    fontFamily: FontFamily.medium, fontSize: 12.5, color: C.textMuted,
    letterSpacing: -0.05,
  },
  kpiValue: {
    fontFamily: FontFamily.bold, fontSize: 30, color: C.text,
    letterSpacing: -0.9, lineHeight: 34,
  },
  kpiFoot: { minHeight: 16 },
  kpiTrendRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  kpiTrendTxt: { fontFamily: FontFamily.semiBold, fontSize: 11.5, letterSpacing: -0.05 },
  kpiSub:      { fontFamily: FontFamily.regular,  fontSize: 11.5, color: C.textHint, marginLeft: 2 },

  /* Charts */
  chartsRow: { flexDirection: 'row', gap: 14 },
  chartCard: {
    backgroundColor: C.surface, borderRadius: Radius.md,
    borderWidth: 1, borderColor: C.border,
    padding: 16,
    gap: 12,
    ...Shadow.sm,
  },
  chartHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  chartTitle: { fontFamily: FontFamily.semiBold, fontSize: 14, color: C.text, letterSpacing: -0.1 },
  chartSub:   { fontFamily: FontFamily.regular, fontSize: 11.5, color: C.textHint, marginTop: 1 },
  rangePill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: Radius.full,
    borderWidth: 1, borderColor: C.border,
  },
  rangePillTxt: { fontFamily: FontFamily.medium, fontSize: 11.5, color: C.textSub },
  chartEmpty: { paddingVertical: 50, alignItems: 'center' },
  emptyTxt:   { fontFamily: FontFamily.regular, fontSize: 12.5, color: C.textHint },

  /* Quick actions */
  qaCard: {
    backgroundColor: C.surface, borderRadius: Radius.md,
    borderWidth: 1, borderColor: C.border,
    padding: 16, gap: 12,
    ...Shadow.sm,
  },
  qaTitle: { fontFamily: FontFamily.semiBold, fontSize: 14, color: C.text, letterSpacing: -0.1 },
  qaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  qaBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 12, paddingVertical: 9,
    backgroundColor: '#FAFBFC',
    borderRadius: Radius.sm,
    borderWidth: 1, borderColor: C.border,
  },
  qaIcon: {
    width: 22, height: 22, borderRadius: Radius.xs,
    alignItems: 'center', justifyContent: 'center',
  },
  qaLabel: { fontFamily: FontFamily.semiBold, fontSize: 12.5, color: C.textSub },

  /* Table */
  tableCard: {
    backgroundColor: C.surface, borderRadius: Radius.md,
    borderWidth: 1, borderColor: C.border,
    overflow: 'hidden',
    ...Shadow.sm,
  },
  tableHeader: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
    padding: 16, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  viewAll: {
    fontFamily: FontFamily.semiBold, fontSize: 12.5, color: C.primary,
  },
  tHeadRow: {
    flexDirection: 'row',
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: '#FAFBFC',
    borderBottomWidth: 1, borderBottomColor: C.border,
    gap: 10, alignItems: 'center',
  },
  th: { fontFamily: FontFamily.semiBold, fontSize: 10.5, color: C.textHint, textTransform: 'uppercase', letterSpacing: 0.6 },
  tRow: {
    flexDirection: 'row',
    paddingHorizontal: 16, paddingVertical: 12,
    alignItems: 'center', gap: 10,
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  tableEmpty: { padding: 36, alignItems: 'center' },
  td:         { fontFamily: FontFamily.medium,  fontSize: 13, color: C.text },
  tdMuted:    { fontFamily: FontFamily.regular, fontSize: 12.5, color: C.textMuted },
  avatar: {
    width: 28, height: 28, borderRadius: Radius.xs,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  avatarTxt: { fontFamily: FontFamily.semiBold, fontSize: 11 },
  pill: {
    alignSelf: 'flex-start', borderRadius: Radius.full,
    paddingHorizontal: 9, paddingVertical: 3,
  },
  pillTxt: { fontFamily: FontFamily.semiBold, fontSize: 11, letterSpacing: 0.1 },

  statusPill: {
    paddingHorizontal: 9, paddingVertical: 3,
    borderRadius: Radius.full,
  },
  statusActive:  { backgroundColor: C.greenLt, borderWidth: 1, borderColor: '#BBF7D0' },
  statusPending: { backgroundColor: C.amberLt, borderWidth: 1, borderColor: '#FDE68A' },
  statusTxt: { fontFamily: FontFamily.semiBold, fontSize: 11, letterSpacing: 0.1 },
  statusActiveTxt:  { color: C.green },
  statusPendingTxt: { color: C.amber },

  /* Range menu */
  menuBackdrop: {
    flex: 1, backgroundColor: 'rgba(15,23,42,0.35)',
    alignItems: 'center', justifyContent: 'center',
  },
  menuCard: {
    minWidth: 200,
    backgroundColor: C.surface,
    borderRadius: Radius.md,
    borderWidth: 1, borderColor: C.border,
    padding: 4,
    ...Shadow.lg,
  },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingVertical: 10,
    borderRadius: Radius.sm,
  },
  menuItemActive: { backgroundColor: C.primaryLt },
  menuItemTxt: { fontFamily: FontFamily.medium, fontSize: 13, color: C.textSub },
  menuItemTxtActive: { fontFamily: FontFamily.semiBold, color: C.primary },
});
