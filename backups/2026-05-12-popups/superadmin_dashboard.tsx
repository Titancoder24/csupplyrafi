import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import {
  Users, Store, Package, Truck, ShoppingCart,
  Clock, CheckCircle, ArrowRight, RefreshCw,
  Tag, LayoutGrid, TrendingUp, AlertCircle,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { FontFamily } from '@/constants/theme';
import { supabase } from '@/services/supabase';
import { toast } from '@/services/toast';

const C = {
  bg:        '#F1F5F9',
  surface:   '#FFFFFF',
  border:    '#E2E8F0',
  text:      '#0F172A',
  textSub:   '#334155',
  textMuted: '#64748B',
  textHint:  '#94A3B8',
  primary:   '#1D4ED8',
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
  navy:      '#0F4C81',
};

type Stats = {
  totalUsers: number;
  pendingVendors: number;
  pendingProducts: number;
  pendingTransporters: number;
  totalOrders: number;
};

function StatCard({
  icon: Icon, label, sub, value, loading, accentColor, accentLt, route,
}: {
  icon: any; label: string; sub: string; value: number; loading: boolean;
  accentColor: string; accentLt: string; route: string;
}) {
  const router = useRouter();
  return (
    <Pressable
      style={[s.statCard, { borderLeftColor: accentColor }]}
      onPress={() => router.push(route as never)}
    >
      <View style={s.statTop}>
        <View style={[s.statIconBox, { backgroundColor: accentLt }]}>
          <Icon size={18} color={accentColor} strokeWidth={1.8} />
        </View>
        <ArrowRight size={14} color={C.textHint} strokeWidth={2} />
      </View>
      <Text style={s.statValue}>
        {loading ? '—' : value.toLocaleString('en-IN')}
      </Text>
      <Text style={s.statLabel}>{label}</Text>
      <Text style={s.statSub}>{sub}</Text>
    </Pressable>
  );
}

function ActionCard({
  icon: Icon, label, color, colorLt, route,
}: {
  icon: any; label: string; color: string; colorLt: string; route: string;
}) {
  const router = useRouter();
  return (
    <Pressable
      style={s.actionCard}
      onPress={() => router.push(route as never)}
    >
      <View style={[s.actionIconBox, { backgroundColor: colorLt }]}>
        <Icon size={20} color={color} strokeWidth={1.8} />
      </View>
      <Text style={s.actionLabel} numberOfLines={2}>{label}</Text>
    </Pressable>
  );
}

function SectionTitle({ title, actionLabel, onAction }: {
  title: string; actionLabel?: string; onAction?: () => void;
}) {
  return (
    <View style={s.sectionHead}>
      <Text style={s.sectionTitle}>{title}</Text>
      {actionLabel && (
        <Pressable onPress={onAction} style={s.seeAllRow}>
          <Text style={s.seeAllTxt}>{actionLabel}</Text>
          <ArrowRight size={13} color={C.primary} strokeWidth={2.5} />
        </Pressable>
      )}
    </View>
  );
}

function roleChip(role: string): { label: string; bg: string; fg: string } {
  const map: Record<string, { label: string; bg: string; fg: string }> = {
    vendor:      { label: 'Vendor',      bg: C.amberLt,  fg: C.amber  },
    transporter: { label: 'Transporter', bg: C.orangeLt, fg: C.orange },
    super_admin: { label: 'Super Admin', bg: C.purpleLt, fg: C.purple },
    admin:       { label: 'Admin',       bg: C.primaryLt,fg: C.primary},
    customer:    { label: 'Customer',    bg: C.greenLt,  fg: C.green  },
  };
  return map[role] ?? { label: role, bg: '#F1F5F9', fg: C.textMuted };
}

export default function SuperAdminDashboard() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isNarrow = width < 600;
  const isMid    = width >= 600 && width < 900;
  const actionWidth: any = isNarrow ? '48%' : isMid ? '31%' : '15.5%';
  const statMinWidth     = isNarrow ? 140 : 160;
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0, pendingVendors: 0, pendingProducts: 0,
    pendingTransporters: 0, totalOrders: 0,
  });
  const [recentUsers, setRecentUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  useEffect(() => {
    fetchStats();
    const channel = supabase
      .channel('sa-dashboard-rt')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, (payload: any) => {
        toast.show('New Order Placed 🛒', `Order #${payload.new?.order_number ?? '—'} needs your approval`, 'info');
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
        toast.show('New Rating ⭐', `${payload.new?.rating ?? '—'}-star review just posted`, 'info');
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

  const STAT_CARDS = [
    { label: 'Total Users',         value: stats.totalUsers,         sub: 'All roles',      accentColor: C.primary, accentLt: C.primaryLt, icon: Users,     route: '/superadmin/users' },
    { label: 'Pending Vendors',      value: stats.pendingVendors,     sub: 'Awaiting KYC',  accentColor: C.amber,   accentLt: C.amberLt,   icon: Store,     route: '/superadmin/vendors' },
    { label: 'Pending Products',     value: stats.pendingProducts,    sub: 'Draft review',  accentColor: C.purple,  accentLt: C.purpleLt,  icon: Package,   route: '/superadmin/products' },
    { label: 'Pending Transporters', value: stats.pendingTransporters,sub: 'Awaiting KYC',  accentColor: C.orange,  accentLt: C.orangeLt,  icon: Truck,     route: '/superadmin/transporters' },
    { label: 'Total Orders',         value: stats.totalOrders,        sub: 'All time',      accentColor: C.green,   accentLt: C.greenLt,   icon: ShoppingCart, route: '/superadmin/orders' },
  ];

  const ACTION_CARDS = [
    { label: 'Approve\nVendors',    icon: Store,      color: C.amber,  colorLt: C.amberLt,  route: '/superadmin/vendors' },
    { label: 'Review\nProducts',    icon: Package,    color: C.purple, colorLt: C.purpleLt, route: '/superadmin/products' },
    { label: 'Categories',          icon: LayoutGrid, color: C.primary,colorLt: C.primaryLt,route: '/superadmin/categories' },
    { label: 'Manage\nBrands',      icon: Tag,        color: C.green,  colorLt: C.greenLt,  route: '/superadmin/brands' },
    { label: 'All Orders',          icon: ShoppingCart,color: C.orange,colorLt: C.orangeLt, route: '/superadmin/orders' },
    { label: 'Transport\nRequests', icon: Truck,      color: C.navy,   colorLt: C.primaryLt,route: '/superadmin/transport-requests' },
  ];

  const pendingCount = stats.pendingVendors + stats.pendingProducts + stats.pendingTransporters;

  return (
    <ScrollView style={s.root} contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

      {/* ── Page Header ── */}
      <View style={s.pageHeader}>
        <View style={s.headerLeft}>
          <Text style={s.pageTitle}>Platform Overview</Text>
          <Text style={s.pageSubtitle}>
            Updated {lastRefresh.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
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
              : <RefreshCw size={14} color={C.textMuted} strokeWidth={2} />}
          </Pressable>
        </View>
      </View>

      {/* ── Pending Alert ── */}
      {!loading && pendingCount > 0 && (
        <View style={s.alertBanner}>
          <AlertCircle size={16} color={C.amber} strokeWidth={2} />
          <Text style={s.alertTxt}>
            <Text style={{ fontFamily: FontFamily.bold }}>{pendingCount} item{pendingCount > 1 ? 's' : ''}</Text>
            {' '}require your attention
          </Text>
          <Pressable onPress={() => router.push('/superadmin/vendors' as never)} style={s.alertCta}>
            <Text style={s.alertCtaTxt}>Review</Text>
            <ArrowRight size={12} color={C.amber} strokeWidth={2.5} />
          </Pressable>
        </View>
      )}

      {/* ── KPI Grid ── */}
      <View>
        <SectionTitle title="Key Metrics" />
        <View style={s.statsGrid}>
          {STAT_CARDS.map(card => (
            <View key={card.label} style={{ minWidth: statMinWidth, flex: 1 }}>
              <StatCard {...card} loading={loading} />
            </View>
          ))}
        </View>
      </View>

      {/* ── Quick Actions ── */}
      <View>
        <SectionTitle title="Quick Actions" />
        <View style={s.actionsGrid}>
          {ACTION_CARDS.map(a => (
            <View key={a.label} style={{ width: actionWidth }}>
              <ActionCard {...a} />
            </View>
          ))}
        </View>
      </View>

      {/* ── Recent Sign-ups ── */}
      <View>
        <SectionTitle
          title="Recent Sign-ups"
          actionLabel="View All"
          onAction={() => router.push('/superadmin/users' as never)}
        />

        <View style={s.table}>
          <View style={s.tableHead}>
            <Text style={[s.th, { flex: 2 }]}>Name</Text>
            <Text style={[s.th, { flex: 1 }]}>Role</Text>
            <Text style={[s.th, { flex: 1 }]}>Status</Text>
            <Text style={[s.th, { flex: 1.2 }]}>Joined</Text>
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
                <View key={u.id} style={[s.tableRow, i % 2 === 1 && s.tableRowAlt]}>
                  <View style={{ flex: 2, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={[s.avatar, { backgroundColor: chip.bg }]}>
                      <Text style={[s.avatarTxt, { color: chip.fg }]}>
                        {(u.full_name || '?')[0].toUpperCase()}
                      </Text>
                    </View>
                    <Text style={s.td} numberOfLines={1}>
                      {u.full_name || <Text style={s.tdMuted}>—</Text>}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={[s.pill, { backgroundColor: chip.bg }]}>
                      <Text style={[s.pillTxt, { color: chip.fg }]}>{chip.label}</Text>
                    </View>
                  </View>
                  <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    {u.verified
                      ? <CheckCircle size={12} color={C.green}  strokeWidth={2} />
                      : <Clock       size={12} color={C.amber}  strokeWidth={2} />}
                    <Text style={s.tdMuted}>{u.verified ? 'Active' : 'Pending'}</Text>
                  </View>
                  <Text style={[s.tdMuted, { flex: 1.2 }]}>
                    {u.created_at ? new Date(u.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'}
                  </Text>
                </View>
              );
            })
          )}
        </View>
      </View>

      {/* ── Platform Stats Footer ── */}
      <View style={s.footerCard}>
        <View style={[s.footerIconBox, { backgroundColor: C.primaryLt }]}>
          <TrendingUp size={18} color={C.primary} strokeWidth={1.8} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={s.footerTitle}>Platform Health</Text>
          <Text style={s.footerSub}>Real-time sync active · All systems operational</Text>
        </View>
        <View style={s.footerDot} />
      </View>

    </ScrollView>
  );
}

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: C.bg },
  scroll: { padding: 20, gap: 24, paddingBottom: 40 },

  /* Header */
  pageHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  headerLeft: { gap: 3 },
  pageTitle:  { fontFamily: FontFamily.bold, fontSize: 22, color: C.text, letterSpacing: -0.3 },
  pageSubtitle: { fontFamily: FontFamily.regular, fontSize: 12, color: C.textHint },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  livePill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#DCFCE7', borderRadius: 99,
    paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: '#BBF7D0',
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.green },
  liveTxt: { fontFamily: FontFamily.semiBold, fontSize: 11, color: C.green },
  refreshBtn: {
    width: 34, height: 34, borderRadius: 8,
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center',
  },

  /* Alert banner */
  alertBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: C.amberLt, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 1, borderColor: '#FDE68A',
  },
  alertTxt: { flex: 1, fontFamily: FontFamily.regular, fontSize: 13, color: C.amber },
  alertCta: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  alertCtaTxt: { fontFamily: FontFamily.bold, fontSize: 12, color: C.amber },

  /* Section header */
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitle: { fontFamily: FontFamily.bold, fontSize: 15, color: C.text },
  seeAllRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  seeAllTxt: { fontFamily: FontFamily.semiBold, fontSize: 13, color: C.primary },

  /* Stat cards */
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: {
    flex: 1, minWidth: 148,
    backgroundColor: C.surface,
    borderRadius: 10,
    borderWidth: 1, borderColor: C.border,
    borderLeftWidth: 4,
    padding: 14,
    shadowColor: '#0F172A', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  statTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  statIconBox: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontFamily: FontFamily.bold, fontSize: 28, color: C.text, letterSpacing: -0.5 },
  statLabel: { fontFamily: FontFamily.semiBold, fontSize: 12, color: C.textSub, marginTop: 4 },
  statSub:   { fontFamily: FontFamily.regular, fontSize: 11, color: C.textHint, marginTop: 2 },

  /* Quick actions */
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  actionCard: {
    backgroundColor: C.surface,
    borderRadius: 10,
    borderWidth: 1, borderColor: C.border,
    padding: 14,
    alignItems: 'center', gap: 8,
    shadowColor: '#0F172A', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  actionIconBox: { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { fontFamily: FontFamily.semiBold, fontSize: 11, color: C.textSub, textAlign: 'center', lineHeight: 16 },

  /* Table */
  table: {
    backgroundColor: C.surface, borderRadius: 10,
    borderWidth: 1, borderColor: C.border, overflow: 'hidden',
    shadowColor: '#0F172A', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  tableHead: {
    flexDirection: 'row', backgroundColor: C.bg,
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  th: { fontFamily: FontFamily.bold, fontSize: 10, color: C.textHint, textTransform: 'uppercase', letterSpacing: 0.5 },
  tableRow: {
    flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12,
    alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F8FAFC',
  },
  tableRowAlt: { backgroundColor: '#FAFBFC' },
  tableEmpty: { padding: 32, alignItems: 'center' },
  emptyTxt: { fontFamily: FontFamily.regular, fontSize: 13, color: C.textHint },
  td: { fontFamily: FontFamily.medium, fontSize: 13, color: C.text },
  tdMuted: { fontFamily: FontFamily.regular, fontSize: 12, color: C.textMuted },
  avatar: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  avatarTxt: { fontFamily: FontFamily.bold, fontSize: 11 },
  pill: {
    alignSelf: 'flex-start', borderRadius: 99,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  pillTxt: { fontFamily: FontFamily.bold, fontSize: 10, textTransform: 'capitalize' },

  /* Footer card */
  footerCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: C.surface, borderRadius: 10,
    borderWidth: 1, borderColor: C.border, padding: 14,
  },
  footerIconBox: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  footerTitle: { fontFamily: FontFamily.semiBold, fontSize: 13, color: C.text },
  footerSub:   { fontFamily: FontFamily.regular,  fontSize: 11, color: C.textHint },
  footerDot:   { width: 8, height: 8, borderRadius: 4, backgroundColor: C.green },
});
