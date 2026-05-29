/**
 * Transporter Home — top-of-funnel summary.
 * Greeting + online toggle + Today's Trips + Active Trip with mini map +
 * Live Tracking 5-step + This Month Earnings.
 *
 * All operational job acceptance / pickup / delivery / rating workflows
 * live in app/transporter/trips.tsx — wired identically to before.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, SafeAreaView, StatusBar, Platform, Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Bell, Truck, ChevronRight, ChevronDown, Clock, CheckCircle2, TrendingUp, TrendingDown,
} from 'lucide-react-native';
import { supabase } from '@/services/supabase';
import { useAuth } from '@/services/auth/AuthProvider';
import { useNotifications } from '@/hooks/useNotifications';
import { FontFamily, Shadow } from '@/constants/theme';
import { RouteMap } from '@/components/ui/RouteMap';

const HEADER     = '#1A5C30';
const HEADER_DK  = '#15803D';

/* ─── Types ──────────────────────────────────────────────────────────────── */
type AddrLite = { line1: string; city: string; state?: string; pincode?: string; lat?: number; lng?: number };
type ActiveTrip = {
  id: string;
  order_number: string;
  status: string;
  created_at: string;
  pickup?: AddrLite;
  drop?: AddrLite;
};

/* ─── Helpers ────────────────────────────────────────────────────────────── */
function fmtINR(n: number) {
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)}L`;
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
}

const TRACKING_STEPS = [
  { key: 'starting',   label: 'Starting',   match: ['transporter_accepted'] },
  { key: 'in_transit', label: 'In Transit', match: ['out_for_pickup', 'picked_up', 'in_transit'] },
  { key: 'pickup',     label: 'Pickup',     match: ['pending_admin_pickup_confirmation'] },
  { key: 'delivery',   label: 'Delivery',   match: ['out_for_delivery', 'pending_admin_confirmation'] },
  { key: 'completed',  label: 'Completed',  match: ['delivered'] },
] as const;

function currentStepIndex(status?: string): number {
  if (!status) return -1;
  return TRACKING_STEPS.findIndex(s => (s.match as readonly string[]).includes(status));
}

function truckPositionForStatus(status?: string): number {
  switch (status) {
    case 'transporter_accepted':                return 0.10;
    case 'out_for_pickup':                      return 0.30;
    case 'pending_admin_pickup_confirmation':   return 0.45;
    case 'picked_up':
    case 'in_transit':                          return 0.70;
    case 'out_for_delivery':                    return 0.90;
    case 'pending_admin_confirmation':
    case 'delivered':                           return 1.00;
    default:                                    return 0.10;
  }
}

function addrTitle(a?: AddrLite): string {
  if (!a) return '';
  if (a.line1) return a.line1.split(',')[0].trim();
  return '';
}
function addrSubtitle(a?: AddrLite): string {
  if (!a) return '';
  // Prefer city, state if we have them
  const cs = [a.city, a.state].filter(s => !!s && s !== '').join(', ');
  if (cs) return cs;
  // Otherwise pull a sensible 2nd segment from line1
  if (a.line1) {
    const parts = a.line1.split(',').map(s => s.trim()).filter(Boolean);
    if (parts.length >= 2) return parts.slice(1, 3).join(', ');
  }
  return '';
}

function stageLabelForStatus(status?: string): string {
  switch (status) {
    case 'transporter_accepted':                return 'Heading to pickup';
    case 'out_for_pickup':                      return 'En route to pickup';
    case 'pending_admin_pickup_confirmation':   return 'Pickup — awaiting admin';
    case 'picked_up':
    case 'in_transit':                          return 'In transit to drop';
    case 'out_for_delivery':                    return 'Out for delivery';
    case 'pending_admin_confirmation':          return 'Delivery — awaiting admin';
    case 'delivered':                           return 'Delivered';
    default:                                    return 'On the way';
  }
}

/* ─── Screen ─────────────────────────────────────────────────────────────── */
export default function TransporterHome() {
  const router = useRouter();
  const { profile } = useAuth();
  const { unreadCount } = useNotifications();

  const [online, setOnline] = useState(false);
  const [activeJobs, setActiveJobs] = useState<ActiveTrip[]>([]);
  const [stats, setStats] = useState({ assigned: 0, inTransit: 0, deliveredToday: 0 });
  const [monthly, setMonthly] = useState<{ thisMonth: number; lastMonth: number; trend: number[] }>({
    thisMonth: 0, lastMonth: 0, trend: [0, 0, 0, 0, 0, 0],
  });

  const fetchHome = useCallback(async () => {
    if (!profile?.id) return;

    const now = new Date();
    const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);

    const ACTIVE_STATUSES = [
      'transporter_accepted', 'out_for_pickup', 'pending_admin_pickup_confirmation',
      'picked_up', 'in_transit', 'out_for_delivery', 'pending_admin_confirmation',
    ];

    const [activeRes, deliveredTodayRes] = await Promise.all([
      supabase
        .from('orders')
        .select(`id, order_number, status, created_at,
                 pickup:addresses!orders_pickup_address_id_fkey(line1, city, state, pincode, lat, lng),
                 drop:addresses!orders_delivery_address_id_fkey(line1, city, state, pincode, lat, lng)`)
        .eq('transporter_id', profile.id)
        .in('status', ACTIVE_STATUSES)
        .order('created_at', { ascending: false }),
      supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('transporter_id', profile.id)
        .eq('status', 'delivered')
        .gte('delivered_at', todayStart.toISOString()),
    ]);

    const list = ((activeRes.data ?? []) as any[]).map((d: any) => ({
      id: d.id, order_number: d.order_number, status: d.status, created_at: d.created_at,
      pickup: d.pickup as AddrLite | undefined,
      drop:   d.drop   as AddrLite | undefined,
    }));
    setActiveJobs(list);

    setStats({
      assigned:        list.filter(j => j.status === 'transporter_accepted').length,
      inTransit:       list.filter(j => ['out_for_pickup', 'picked_up', 'in_transit', 'out_for_delivery'].includes(j.status)).length,
      deliveredToday:  deliveredTodayRes.count ?? 0,
    });
  }, [profile?.id]);

  const fetchMonthly = useCallback(async () => {
    if (!profile?.id) return;
    const now = new Date();
    const sixMonthsBack = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    const { data } = await supabase
      .from('orders')
      .select('total_amount, delivered_at')
      .eq('transporter_id', profile.id)
      .eq('status', 'delivered')
      .gte('delivered_at', sixMonthsBack.toISOString());

    let thisMonth = 0, lastMonth = 0;
    const trend = [0, 0, 0, 0, 0, 0];
    for (const r of (data ?? []) as { total_amount: number | null; delivered_at: string | null }[]) {
      if (!r.delivered_at) continue;
      const d = new Date(r.delivered_at);
      const earned = (r.total_amount ?? 0) * 0.08;
      const monthsAgo = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
      if (monthsAgo === 0) thisMonth += earned;
      else if (monthsAgo === 1) lastMonth += earned;
      const idx = 5 - monthsAgo;
      if (idx >= 0 && idx <= 5) trend[idx] += earned;
    }
    setMonthly({ thisMonth, lastMonth, trend });
  }, [profile?.id]);

  useEffect(() => {
    fetchHome();
    fetchMonthly();
    if (!profile?.id) return;

    const suffix = Math.random().toString(36).slice(2, 10);
    const ch = supabase.channel(`tp-home:${profile.id}:${suffix}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `transporter_id=eq.${profile.id}` }, () => {
        fetchHome();
        fetchMonthly();
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [profile?.id, fetchHome, fetchMonthly]);

  const activeTrip = activeJobs[0];
  const stepIdx    = currentStepIndex(activeTrip?.status);
  const monthChange = monthly.lastMonth > 0
    ? Math.round(((monthly.thisMonth - monthly.lastMonth) / monthly.lastMonth) * 1000) / 10
    : null;
  const monthUp = (monthChange ?? 0) >= 0;

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={HEADER_DK} />

      {/* ── Header ─────────────────────────────────────── */}
      <SafeAreaView style={s.header}>
        <View style={s.headerTop}>
          <View style={{ flex: 1, gap: 6 }}>
            <View style={s.helloRow}>
              <Text style={s.headerName} numberOfLines={1}>
                Hello, {profile?.full_name ?? 'Transporter'}
              </Text>
              <ChevronDown size={15} color="#FFFFFF" strokeWidth={2.2} />
            </View>
            <View style={[s.statusPill, online && s.statusPillOn]}>
              <View style={[s.statusDot, online && s.statusDotOn]} />
              <Text style={[s.statusTxt, online && s.statusTxtOn]}>
                {online ? 'Online — Receiving jobs' : 'Offline — Go online to accept jobs'}
              </Text>
            </View>
          </View>
          <Pressable
            style={s.bellBtn}
            onPress={() => router.push('/transporter/notifications' as never)}
          >
            <Bell size={18} color="#FFFFFF" strokeWidth={1.75} />
            {unreadCount > 0 && (
              <View style={s.bellDot}>
                <Text style={s.bellDotTxt}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            )}
          </Pressable>
          <Pressable onPress={() => setOnline(o => !o)} style={[s.toggle, online && s.toggleOn]}>
            <View style={[s.toggleKnob, online && s.toggleKnobOn]} />
          </Pressable>
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Today's Trips */}
        <View style={s.card}>
          <View style={s.cardHead}>
            <Text style={s.cardTitle}>Today's Trips</Text>
            <Pressable onPress={() => router.push('/transporter/trips' as never)} style={s.linkRow}>
              <Text style={s.linkTxt}>View All</Text>
              <ChevronRight size={13} color="#0F172A" strokeWidth={2.2} />
            </Pressable>
          </View>
          <View style={s.tripsRow}>
            <View style={s.tripsStat}>
              <Text style={s.tripsVal}>{stats.assigned}</Text>
              <Text style={s.tripsLbl}>Assigned</Text>
            </View>
            <View style={s.tripsDiv} />
            <View style={s.tripsStat}>
              <Text style={s.tripsVal}>{stats.inTransit}</Text>
              <Text style={s.tripsLbl}>In Transit</Text>
            </View>
            <View style={s.tripsDiv} />
            <View style={s.tripsStat}>
              <Text style={s.tripsVal}>{stats.deliveredToday}</Text>
              <Text style={s.tripsLbl}>Delivered</Text>
            </View>
          </View>
        </View>

        {/* Active Trip + mini map */}
        {activeTrip ? (
          <View style={s.card}>
            <View style={s.activeHead}>
              <Text style={s.activeNum}>Trip #{activeTrip.order_number}</Text>
              <View style={s.activeBadge}>
                <Text style={s.activeBadgeTxt}>
                  {activeTrip.status === 'transporter_accepted' ? 'Starting'
                    : activeTrip.status === 'delivered' ? 'Completed'
                    : activeTrip.status.includes('pending_admin') ? 'Awaiting Admin'
                    : 'In Transit'}
                </Text>
              </View>
            </View>

            <View style={s.activeBody}>
              <View style={{ flex: 1, gap: 12 }}>
                <View style={s.addrRow}>
                  <View style={[s.addrDot, { backgroundColor: '#16A34A' }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.addrTitle} numberOfLines={1}>
                      {addrTitle(activeTrip.pickup) || 'Vendor pickup'}
                    </Text>
                    <Text style={s.addrSub} numberOfLines={1}>
                      {addrSubtitle(activeTrip.pickup) || '—'}
                    </Text>
                  </View>
                </View>
                <View style={s.addrRow}>
                  <View style={[s.addrDot, { backgroundColor: '#F97316' }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.addrTitle} numberOfLines={1}>
                      {addrTitle(activeTrip.drop) || 'Customer drop'}
                    </Text>
                    <Text style={s.addrSub} numberOfLines={1}>
                      {addrSubtitle(activeTrip.drop) || '—'}
                    </Text>
                  </View>
                </View>
                <View style={s.etaRow}>
                  <Clock size={12} color="#0F172A" strokeWidth={1.75} />
                  <Text style={s.etaTxt}>
                    Created {new Date(activeTrip.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              </View>

              <View style={s.miniMap}>
                <RouteMap
                  from={{
                    lat: activeTrip.pickup?.lat ?? 0,
                    lng: activeTrip.pickup?.lng ?? 0,
                    label: activeTrip.pickup?.city ?? 'Pickup',
                  }}
                  to={{
                    lat: activeTrip.drop?.lat ?? 0,
                    lng: activeTrip.drop?.lng ?? 0,
                    label: activeTrip.drop?.city ?? 'Drop',
                  }}
                  height={140}
                  truckPosition={truckPositionForStatus(activeTrip.status)}
                  stageLabel={stageLabelForStatus(activeTrip.status)}
                />
              </View>
            </View>
          </View>
        ) : (
          <View style={s.emptyCard}>
            <Image source={require('../../assets/truck.png')} style={s.emptyImg} resizeMode="contain" />
            <Text style={s.emptyTitle}>No active trip</Text>
            <Text style={s.emptySub}>Open the Trips tab to accept new jobs</Text>
            <Pressable style={s.emptyBtn} onPress={() => router.push('/transporter/trips' as never)}>
              <Text style={s.emptyBtnTxt}>Browse Trips</Text>
              <ChevronRight size={13} color="#FFFFFF" strokeWidth={2.2} />
            </Pressable>
          </View>
        )}

        {/* Live Tracking */}
        <View style={s.card}>
          <View style={s.cardHead}>
            <Text style={s.cardTitle}>Live Tracking</Text>
            <Text style={s.liveUpd}>Realtime</Text>
          </View>
          <View style={s.trackRow}>
            {TRACKING_STEPS.map((step, i) => {
              const isActive = i === stepIdx;
              const isDone   = i < stepIdx;
              const accent   = step.key === 'pickup' ? '#D97706'
                              : step.key === 'delivery' ? '#DC2626'
                              : '#16A34A';
              return (
                <View key={step.key} style={s.trackStep}>
                  <View style={[
                    s.trackChip,
                    isActive && { backgroundColor: accent, borderColor: accent },
                    isDone   && { backgroundColor: '#15803D', borderColor: '#15803D' },
                  ]}>
                    {isDone
                      ? <CheckCircle2 size={14} color="#FFFFFF" strokeWidth={2.4} />
                      : <Text style={[s.trackChipTxt, isActive && { color: '#fff' }]}>{i + 1}</Text>}
                  </View>
                  <Text
                    style={[s.trackLbl, (isActive || isDone) && { color: '#0F172A', fontFamily: FontFamily.semiBold }]}
                    numberOfLines={1}
                  >
                    {step.label}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* This Month Earnings */}
        <View style={s.card}>
          <Text style={s.cardTitle}>This Month Earnings</Text>
          <Text style={s.earnVal}>{fmtINR(monthly.thisMonth)}</Text>
          {monthChange !== null ? (
            <View style={s.earnTrendRow}>
              {monthUp
                ? <TrendingUp size={11} color="#0F172A" strokeWidth={2} />
                : <TrendingDown size={11} color="#0F172A" strokeWidth={2} />}
              <Text style={[s.earnTrendTxt, { color: monthUp ? '#15803D' : '#DC2626' }]}>
                {monthUp ? '+' : ''}{monthChange}%
              </Text>
              <Text style={s.earnTrendSub}>vs last month</Text>
            </View>
          ) : (
            <Text style={s.earnTrendSub}>{fmtINR(monthly.lastMonth)} last month</Text>
          )}
          <View style={s.sparkRow}>
            {monthly.trend.map((v, i) => {
              const max = Math.max(...monthly.trend, 1);
              const h = Math.max(4, (v / max) * 36);
              return (
                <View key={i} style={[s.sparkBar, { height: h, backgroundColor: i === 5 ? HEADER : '#86EFAC' }]} />
              );
            })}
          </View>
        </View>

        <View style={{ height: 12 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAFC' },

  /* Header */
  header: {
    backgroundColor: HEADER,
    paddingLeft: 32, paddingRight: 28,
    paddingTop: Platform.OS === 'web' ? 26 : 22,
    paddingBottom: 24,
    gap: 14,
  },
  headerTop: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  headerAvatar: {
    width: 42, height: 42, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.32)',
    alignItems: 'center', justifyContent: 'center',
    position: 'relative' as const,
  },
  headerAvatarTxt: {
    fontFamily: FontFamily.bold, fontSize: 14, color: '#fff', letterSpacing: 0.4,
  },
  headerAvatarDot: {
    position: 'absolute' as const, right: -2, bottom: -2,
    width: 12, height: 12, borderRadius: 7,
    backgroundColor: '#94A3B8',
    borderWidth: 2, borderColor: HEADER,
  },
  headerAvatarDotOn: { backgroundColor: '#4ADE80' },
  headerGreet: { fontFamily: FontFamily.regular, fontSize: 11.5, color: 'rgba(255,255,255,0.78)', letterSpacing: 0.2 },
  headerName: { fontFamily: FontFamily.bold, fontSize: 16, color: '#fff', letterSpacing: -0.2, lineHeight: 20, flexShrink: 1 },
  helloRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  truckRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  truckTxt: { fontFamily: FontFamily.medium, fontSize: 11.5, color: 'rgba(255,255,255,0.78)', letterSpacing: 0.1, flexShrink: 1 },
  bellBtn: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center', justifyContent: 'center',
    position: 'relative' as const,
  },
  bellDot: {
    position: 'absolute' as const, top: -2, right: -2,
    minWidth: 16, height: 16, paddingHorizontal: 3, borderRadius: 8,
    backgroundColor: '#F97316', borderWidth: 1.5, borderColor: HEADER,
    alignItems: 'center', justifyContent: 'center',
  },
  bellDotTxt: { fontFamily: FontFamily.bold, fontSize: 9, color: '#fff' },
  toggle: {
    width: 46, height: 26, borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.22)',
    justifyContent: 'center', paddingHorizontal: 2,
  },
  toggleOn: { backgroundColor: '#4ADE80' },
  toggleKnob: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff', alignSelf: 'flex-start' },
  toggleKnobOn: { alignSelf: 'flex-end' },

  statusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(0,0,0,0.22)',
    borderRadius: 99, paddingHorizontal: 12, paddingVertical: 6,
    alignSelf: 'flex-start' as const,
  },
  statusPillOn: { backgroundColor: 'rgba(74,222,128,0.22)' },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#94A3B8' },
  statusDotOn: { backgroundColor: '#4ADE80' },
  statusTxt: { fontFamily: FontFamily.semiBold, fontSize: 11, color: 'rgba(255,255,255,0.78)', letterSpacing: 0.1 },
  statusTxtOn: { color: '#4ADE80' },

  /* Scroll body */
  scroll: { padding: 14, gap: 12 },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0',
    padding: 14, gap: 10,
    ...Shadow.sm,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { fontFamily: FontFamily.semiBold, fontSize: 14, color: '#0F172A', letterSpacing: -0.1 },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  linkTxt: { fontFamily: FontFamily.semiBold, fontSize: 12, color: HEADER, letterSpacing: -0.05 },

  /* Today's Trips */
  tripsRow: { flexDirection: 'row', alignItems: 'center' },
  tripsStat: { flex: 1, alignItems: 'center', gap: 2 },
  tripsVal: { fontFamily: FontFamily.bold, fontSize: 26, color: '#0F172A', letterSpacing: -0.6, lineHeight: 30 },
  tripsLbl: { fontFamily: FontFamily.regular, fontSize: 11.5, color: '#64748B' },
  tripsDiv: { width: 1, height: 36, backgroundColor: '#E2E8F0' },

  /* Active trip */
  activeHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  activeNum: { fontFamily: FontFamily.semiBold, fontSize: 13.5, color: '#0F172A', letterSpacing: -0.1 },
  activeBadge: { backgroundColor: '#DCFCE7', borderRadius: 99, paddingHorizontal: 9, paddingVertical: 3, borderWidth: 1, borderColor: '#86EFAC' },
  activeBadgeTxt: { fontFamily: FontFamily.semiBold, fontSize: 10.5, color: '#15803D', letterSpacing: 0.2 },
  activeBody: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  addrRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  addrDot: { width: 8, height: 8, borderRadius: 4, marginTop: 4 },
  addrLbl: { fontFamily: FontFamily.medium, fontSize: 10.5, color: '#64748B', letterSpacing: 0.4 },
  addrTxt: { fontFamily: FontFamily.medium, fontSize: 12.5, color: '#0F172A', lineHeight: 17, marginTop: 1 },
  addrTitle: { fontFamily: FontFamily.semiBold, fontSize: 13, color: '#0F172A', letterSpacing: -0.1 },
  addrSub:   { fontFamily: FontFamily.regular, fontSize: 11.5, color: '#64748B', marginTop: 2 },
  etaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  etaTxt: { fontFamily: FontFamily.regular, fontSize: 11.5, color: '#64748B' },
  miniMap: { width: 140, height: 140, borderRadius: 8, overflow: 'hidden' as const, borderWidth: 1, borderColor: '#E2E8F0' },

  /* Empty active trip */
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0',
    padding: 18, alignItems: 'center', gap: 10,
    ...Shadow.sm,
  },
  emptyImg: { width: 220, height: 150 },
  emptyTitle: { fontFamily: FontFamily.semiBold, fontSize: 14, color: '#0F172A', marginTop: 2 },
  emptySub:   { fontFamily: FontFamily.regular, fontSize: 12.5, color: '#64748B' },
  emptyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 8,
    backgroundColor: HEADER, marginTop: 4,
  },
  emptyBtnTxt: { fontFamily: FontFamily.semiBold, fontSize: 12.5, color: '#fff' },

  /* Live Tracking */
  liveUpd: { fontFamily: FontFamily.regular, fontSize: 11, color: '#16A34A' },
  trackRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingTop: 2 },
  trackStep: { flex: 1, alignItems: 'center', gap: 6 },
  trackChip: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5, borderColor: '#E2E8F0',
    alignItems: 'center', justifyContent: 'center',
  },
  trackChipTxt: { fontFamily: FontFamily.semiBold, fontSize: 12, color: '#94A3B8' },
  trackLbl: { fontFamily: FontFamily.regular, fontSize: 10.5, color: '#94A3B8', textAlign: 'center', maxWidth: 70 },

  /* Earnings */
  earnVal: { fontFamily: FontFamily.bold, fontSize: 28, color: '#0F172A', letterSpacing: -0.7, lineHeight: 32 },
  earnTrendRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  earnTrendTxt: { fontFamily: FontFamily.semiBold, fontSize: 12 },
  earnTrendSub: { fontFamily: FontFamily.regular, fontSize: 11.5, color: '#94A3B8' },
  sparkRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 40, marginTop: 6 },
  sparkBar: { flex: 1, minWidth: 8, borderRadius: 2 },
});

// Suppress unused-import for Truck (the icon is referenced via the empty state imagery)
void Truck;
