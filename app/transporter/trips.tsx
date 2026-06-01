import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Image, Modal, Pressable, ScrollView,
  StyleSheet, Text, TextInput, View,
} from 'react-native';
import {
  AlertCircle, Bell, CheckCircle2, Flag, IndianRupee, MapPin,
  MessageCircle, Package, Phone, Play, Star, Truck, Weight, X, UserCheck, LogOut,
  ChevronRight, Clock,
} from 'lucide-react-native';
import { useNotifications } from '@/hooks/useNotifications';
import { useRouter } from 'expo-router';
import { Colors, FontFamily, Shadow } from '@/constants/theme';
import { supabase } from '@/services/supabase';
import { RouteMap } from '@/components/ui/RouteMap';
import { useAuth } from '@/services/auth/AuthProvider';
import { toast } from '@/services/toast';

// ── types ──────────────────────────────────────────────────────────────────────

type AddrLite = { line1: string; city: string; state?: string; pincode?: string; lat?: number; lng?: number };
type OrderItem = { product_name: string; quantity: number; unit: string };
type Job = {
  id: string;
  order_number: string;
  status: string;
  total_amount: number;
  created_at: string;
  customer_name?: string;
  customer_phone?: string;
  total_weight_kg?: number;
  pickup?: AddrLite;
  drop?: AddrLite;
  items?: OrderItem[];
};

type VehicleClass = 'mini' | 'medium' | 'heavy' | 'x_heavy';

type TransportRequest = {
  id: string;
  order_id: string | null;
  pickup_address: string;
  pickup_lat: number | null;
  pickup_lng: number | null;
  dropoff_address: string;
  dropoff_lat: number | null;
  dropoff_lng: number | null;
  distance_km: number | null;
  weight_kg: number | null;
  vehicle_class: VehicleClass;
  status: string;
  offered_price: number | null;
  assigned_transporter_id: string | null;
  created_at: string;
  requester_id: string;
  requester_role: string;
};

type ContactInfo = { full_name: string | null; phone: string | null };
type TodayStats = { trips: number; earned: number };
type Tab = 'deliveries' | 'transport' | 'current' | 'history';

type HistoryItem = {
  id: string;
  order_number: string;
  customer_id: string;
  customer_name: string;
  total_amount: number;
  delivered_at: string | null;
  myRating: number | null;      // what I gave the customer
  theirRating: number | null;   // what the customer gave me
  theirComment: string | null;
};

const DISTANCE_PRESETS = ['2 km away', '1 km away', '500 m away', '200 m away', 'At your door', 'Delivered to address'];

// ── helpers ────────────────────────────────────────────────────────────────────

const VEHICLE_LABELS: Record<VehicleClass, string> = {
  mini: 'Mini (≤1 t)',
  medium: 'Medium (1–5 t)',
  heavy: 'Heavy (5–15 t)',
  x_heavy: 'X-Heavy (15+ t)',
};

const VEHICLE_COLORS: Record<VehicleClass, string> = {
  mini: '#0EA5E9', medium: '#F59E0B', heavy: '#EF4444', x_heavy: '#7C3AED',
};

function fmtINR(n: number) {
  return '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

function fmtDist(km: number | null) {
  if (!km) return '—';
  return km >= 1 ? `${km.toFixed(1)} km` : `${Math.round(km * 1000)} m`;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ── Main component ─────────────────────────────────────────────────────────────

/* ─── EmptyTruckState — friendly empty state with big truck illustration ── */
function EmptyTruckState({ title, sub, online }: { title: string; sub?: string; online?: boolean }) {
  return (
    <View style={s.emptyTruckCard}>
      <Image
        source={require('../../assets/truck.png')}
        style={s.emptyTruckImg}
        resizeMode="contain"
      />
      {online !== undefined && (
        <View style={[s.emptyStatusPill, online && s.emptyStatusPillOn]}>
          <View style={[s.emptyStatusDot, online && s.emptyStatusDotOn]} />
          <Text style={[s.emptyStatusTxt, online && s.emptyStatusTxtOn]}>
            {online ? 'Online - Receiving jobs' : 'Offline - Toggle online above'}
          </Text>
        </View>
      )}
      <Text style={s.emptyTruckTitle}>{title}</Text>
      {sub ? <Text style={s.emptyTruckSub}>{sub}</Text> : null}
    </View>
  );
}

/* ─── HomeStack — top summary cards (matches the screenshot) ────────────── */
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

function HomeStack({
  activeJobs, todayStats, monthly, onViewAll,
}: {
  activeJobs: Job[];
  todayStats: TodayStats;
  monthly: { thisMonth: number; lastMonth: number; trend: number[] };
  onViewAll: () => void;
}) {
  // Today's trip counts — derived from active jobs + today's delivered
  const assignedCount  = activeJobs.filter(j => j.status === 'transporter_accepted').length;
  const inTransitCount = activeJobs.filter(j => ['out_for_pickup', 'picked_up', 'in_transit', 'out_for_delivery'].includes(j.status)).length;
  const deliveredCount = todayStats.trips;

  const activeTrip = activeJobs[0];
  const stepIdx    = currentStepIndex(activeTrip?.status);

  // Earnings change %
  const change = monthly.lastMonth > 0
    ? Math.round(((monthly.thisMonth - monthly.lastMonth) / monthly.lastMonth) * 1000) / 10
    : null;
  const trendUp = (change ?? 0) >= 0;

  return (
    <View style={{ gap: 12, marginBottom: 8 }}>
      {/* Today's Trips */}
      <View style={s.homeCard}>
        <View style={s.homeCardHead}>
          <Text style={s.homeCardTitle}>Today's Trips</Text>
          <Pressable onPress={onViewAll} style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
            <Text style={s.homeCardLink}>View All</Text>
            <ChevronRight size={13} color="#0F172A" strokeWidth={2.2} />
          </Pressable>
        </View>
        <View style={s.tripsStatsRow}>
          <View style={s.tripsStat}>
            <Text style={s.tripsStatVal}>{assignedCount}</Text>
            <Text style={s.tripsStatLbl}>Assigned</Text>
          </View>
          <View style={s.tripsStatDiv} />
          <View style={s.tripsStat}>
            <Text style={s.tripsStatVal}>{inTransitCount}</Text>
            <Text style={s.tripsStatLbl}>In Transit</Text>
          </View>
          <View style={s.tripsStatDiv} />
          <View style={s.tripsStat}>
            <Text style={s.tripsStatVal}>{deliveredCount}</Text>
            <Text style={s.tripsStatLbl}>Delivered</Text>
          </View>
        </View>
      </View>

      {/* Active Trip card with mini map */}
      {activeTrip ? (
        <View style={s.homeCard}>
          <View style={s.activeTripHead}>
            <Text style={s.activeTripNum}>Trip #{activeTrip.order_number}</Text>
            <View style={s.activeTripBadge}>
              <Text style={s.activeTripBadgeTxt}>
                {activeTrip.status === 'transporter_accepted' ? 'Starting'
                  : activeTrip.status === 'delivered' ? 'Completed'
                  : activeTrip.status.includes('pending_admin') ? 'Awaiting Admin'
                  : 'In Transit'}
              </Text>
            </View>
          </View>

          <View style={s.activeTripBody}>
            <View style={{ flex: 1, gap: 10 }}>
              <View style={s.tripAddrRow}>
                <View style={[s.tripAddrDot, { backgroundColor: '#16A34A' }]} />
                <View style={{ flex: 1 }}>
                  <Text style={s.tripAddrLbl}>Pickup</Text>
                  <Text style={s.tripAddrTxt} numberOfLines={2}>
                    {activeTrip.pickup
                      ? [activeTrip.pickup.line1, activeTrip.pickup.city].filter(Boolean).join(', ')
                      : 'Pickup address pending'}
                  </Text>
                </View>
              </View>
              <View style={s.tripAddrRow}>
                <View style={[s.tripAddrDot, { backgroundColor: '#DC2626' }]} />
                <View style={{ flex: 1 }}>
                  <Text style={s.tripAddrLbl}>Drop</Text>
                  <Text style={s.tripAddrTxt} numberOfLines={2}>
                    {activeTrip.drop
                      ? [activeTrip.drop.line1, activeTrip.drop.city].filter(Boolean).join(', ')
                      : 'Drop address pending'}
                  </Text>
                </View>
              </View>
              <View style={s.tripEtaRow}>
                <Clock size={12} color="#0F172A" strokeWidth={1.75} />
                <Text style={s.tripEtaTxt}>
                  Created {new Date(activeTrip.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            </View>

            {/* Mini route map */}
            {activeTrip.pickup?.lat && activeTrip.drop?.lat ? (
              <View style={s.miniMap}>
                <RouteMap
                  from={{ lat: activeTrip.pickup.lat, lng: activeTrip.pickup.lng!, label: 'Pickup' }}
                  to={{   lat: activeTrip.drop.lat,   lng: activeTrip.drop.lng!,   label: 'Drop' }}
                  height={140}
                />
              </View>
            ) : (
              <View style={[s.miniMap, { alignItems: 'center', justifyContent: 'center', backgroundColor: '#F1F5F9' }]}>
                <MapPin size={18} color="#0F172A" strokeWidth={1.75} />
                <Text style={{ fontFamily: FontFamily.regular, fontSize: 10, color: '#94A3B8', marginTop: 4 }}>
                  Map unavailable
                </Text>
              </View>
            )}
          </View>
        </View>
      ) : (
        <View style={[s.homeCard, { alignItems: 'center', paddingVertical: 18 }]}>
          <Truck size={20} color="#0F172A" strokeWidth={1.75} />
          <Text style={[s.homeCardTitle, { marginTop: 6 }]}>No active trip</Text>
          <Text style={s.tripEtaTxt}>Accept a job to start delivering</Text>
        </View>
      )}

      {/* Live Tracking 5-step */}
      <View style={s.homeCard}>
        <View style={s.homeCardHead}>
          <Text style={s.homeCardTitle}>Live Tracking</Text>
          <Text style={s.liveUpdated}>Realtime</Text>
        </View>
        <View style={s.trackingRow}>
          {TRACKING_STEPS.map((step, i) => {
            const isActive   = i === stepIdx;
            const isDone     = i < stepIdx;
            const accent     = step.key === 'pickup' ? '#D97706'
                              : step.key === 'delivery' ? '#DC2626'
                              : '#16A34A';
            return (
              <View key={step.key} style={s.trackingStep}>
                <View style={[
                  s.trackingChip,
                  isActive && { backgroundColor: accent, borderColor: accent },
                  isDone && { backgroundColor: '#15803D', borderColor: '#15803D' },
                ]}>
                  {isDone
                    ? <CheckCircle2 size={14} color="#FFFFFF" strokeWidth={2.4} />
                    : <Text style={[s.trackingChipTxt, isActive && { color: '#fff' }]}>{i + 1}</Text>
                  }
                </View>
                <Text style={[s.trackingLbl, (isActive || isDone) && { color: '#0F172A', fontFamily: FontFamily.semiBold }]} numberOfLines={1}>
                  {step.label}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* This Month Earnings */}
      <View style={s.homeCard}>
        <Text style={s.homeCardTitle}>This Month Earnings</Text>
        <Text style={s.earnVal}>{fmtINR(monthly.thisMonth)}</Text>
        {change !== null ? (
          <View style={s.earnTrendRow}>
            <Text style={[s.earnTrendTxt, { color: trendUp ? '#15803D' : '#DC2626' }]}>
              {trendUp ? '+' : ''}{change}%
            </Text>
            <Text style={s.earnTrendSub}>vs Last Month</Text>
          </View>
        ) : (
          <Text style={s.earnTrendSub}>{fmtINR(monthly.lastMonth)} last month</Text>
        )}
        {/* Mini bar sparkline (6 months) */}
        <View style={s.sparkRow}>
          {monthly.trend.map((v, i) => {
            const max = Math.max(...monthly.trend, 1);
            const h = Math.max(4, (v / max) * 36);
            return (
              <View key={i} style={[s.sparkBar, { height: h, backgroundColor: i === 5 ? '#15803D' : '#86EFAC' }]} />
            );
          })}
        </View>
      </View>
    </View>
  );
}

export default function TransporterTrips() {
  const { profile, signOut } = useAuth();
  const router = useRouter();
  const { unreadCount } = useNotifications();
  const [online, setOnline] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('transport');

  // Deliveries state
  const [pendingJobs, setPendingJobs] = useState<Job[]>([]);
  const [activeJobs, setActiveJobs] = useState<Job[]>([]);
  const [toRateJobs, setToRateJobs] = useState<Array<{ id: string; order_number: string; customer_id: string; customer_name: string }>>([]);
  const [autoShownFor, setAutoShownFor] = useState<Set<string>>(new Set());
  const [newJobAlert, setNewJobAlert] = useState<{ orderId: string; orderNumber: string } | null>(null);
  const [history,      setHistory]      = useState<HistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [todayStats, setTodayStats] = useState<TodayStats>({ trips: 0, earned: 0 });
  const [monthly, setMonthly] = useState<{ thisMonth: number; lastMonth: number; trend: number[] }>({
    thisMonth: 0, lastMonth: 0, trend: [0, 0, 0, 0, 0, 0],
  });
  const [rateModal, setRateModal] = useState<{ orderId: string; customerId: string; customerName: string } | null>(null);
  const [rateStars, setRateStars] = useState(0);
  const [rateComment, setRateComment] = useState('');
  const [submittingRate, setSubmittingRate] = useState(false);
  const [loadingDeliveries, setLoadingDeliveries] = useState(true);

  // Auto-open the rate-customer modal when a new delivered/unrated job appears
  useEffect(() => {
    if (rateModal) return;
    const next = toRateJobs.find(j => !autoShownFor.has(j.id));
    if (next) {
      setRateModal({ orderId: next.id, customerId: next.customer_id, customerName: next.customer_name });
      setRateStars(0);
      setRateComment('');
      setAutoShownFor(s => new Set(s).add(next.id));
    }
  }, [toRateJobs, rateModal, autoShownFor]);


  // Transport state
  const [openRequests, setOpenRequests] = useState<TransportRequest[]>([]);
  const [myActiveJobs, setMyActiveJobs] = useState<TransportRequest[]>([]);
  const [contacts, setContacts] = useState<Record<string, ContactInfo | null>>({});
  const [loadingTransport, setLoadingTransport] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  // ── Fetch deliveries ────────────────────────────────────────────────────────

  const fetchDeliveries = useCallback(async () => {
    if (!profile?.id) return;
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);

    const ORDER_SELECT = `
      id, order_number, status, total_amount, created_at, total_weight_kg,
      profiles!orders_customer_id_fkey(full_name, phone),
      pickup:addresses!orders_pickup_address_id_fkey(line1, city, state, pincode, lat, lng),
      drop:addresses!orders_delivery_address_id_fkey(line1, city, state, pincode, lat, lng),
      order_items(product_name, quantity, unit)
    `;

    const [pending, active, delivered, deliveredAll] = await Promise.all([
      supabase.from('orders').select(ORDER_SELECT)
        .eq('status', 'transporter_pending').is('transporter_id', null)
        .order('created_at', { ascending: false }).limit(20),
      supabase.from('orders').select(ORDER_SELECT)
        .eq('transporter_id', profile.id)
        .in('status', ['transporter_accepted', 'out_for_pickup', 'pending_admin_pickup_confirmation', 'picked_up', 'in_transit', 'out_for_delivery', 'pending_admin_confirmation'])
        .order('created_at', { ascending: false }),
      supabase.from('orders').select('total_amount')
        .eq('transporter_id', profile.id).eq('status', 'delivered')
        .gte('created_at', todayStart.toISOString()),
      supabase.from('orders').select('id, order_number, customer_id, profiles!orders_customer_id_fkey(full_name)')
        .eq('transporter_id', profile.id).eq('status', 'delivered')
        .order('delivered_at', { ascending: false }).limit(20),
    ]);

    function mapJob(d: any): Job {
      return {
        id: d.id, order_number: d.order_number, status: d.status,
        total_amount: d.total_amount ?? 0, created_at: d.created_at,
        total_weight_kg: d.total_weight_kg ?? undefined,
        customer_name: d.profiles?.full_name ?? undefined,
        customer_phone: d.profiles?.phone ?? undefined,
        pickup: d.pickup ?? undefined,
        drop: d.drop ?? undefined,
        items: d.order_items ?? [],
      };
    }

    setPendingJobs((pending.data ?? []).map(mapJob));
    setActiveJobs((active.data ?? []).map(mapJob));
    const earned = (delivered.data ?? []).reduce((s: number, o: any) => s + (o.total_amount ?? 0) * 0.08, 0);
    setTodayStats({ trips: delivered.data?.length ?? 0, earned });

    // Compute "to-rate" — delivered orders without an existing transport_reviews row by this transporter
    const deliveredList = (deliveredAll.data ?? []) as any[];
    if (deliveredList.length > 0) {
      const ids = deliveredList.map(d => d.id);
      const { data: reviewed } = await supabase
        .from('transport_reviews')
        .select('order_id')
        .eq('reviewer_id', profile.id)
        .in('order_id', ids);
      const reviewedSet = new Set((reviewed ?? []).map(r => r.order_id));
      setToRateJobs(
        deliveredList
          .filter(d => !reviewedSet.has(d.id) && d.customer_id)
          .slice(0, 5)
          .map(d => ({
            id: d.id,
            order_number: d.order_number,
            customer_id: d.customer_id,
            customer_name: d.profiles?.full_name ?? 'Customer',
          })),
      );
    } else {
      setToRateJobs([]);
    }
    setLoadingDeliveries(false);
  }, [profile?.id]);

  // ── Fetch monthly earnings (current + last + 6-month trend) ────────────────
  const fetchMonthly = useCallback(async () => {
    if (!profile?.id) return;

    const now = new Date();
    const monthStart = (d: Date) => {
      const x = new Date(d.getFullYear(), d.getMonth(), 1);
      x.setHours(0, 0, 0, 0);
      return x;
    };

    const thisMonthStart = monthStart(now);
    const lastMonthStart = monthStart(new Date(now.getFullYear(), now.getMonth() - 1, 1));
    const sixMonthsBack  = monthStart(new Date(now.getFullYear(), now.getMonth() - 5, 1));

    const { data } = await supabase
      .from('orders')
      .select('total_amount, delivered_at')
      .eq('transporter_id', profile.id)
      .eq('status', 'delivered')
      .gte('delivered_at', sixMonthsBack.toISOString());

    const rows = (data ?? []) as { total_amount: number | null; delivered_at: string | null }[];

    let thisMonth = 0;
    let lastMonth = 0;
    const trend: number[] = [0, 0, 0, 0, 0, 0];

    for (const r of rows) {
      if (!r.delivered_at) continue;
      const d = new Date(r.delivered_at);
      const earned = (r.total_amount ?? 0) * 0.08;
      const monthsAgo = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
      if (monthsAgo === 0) thisMonth += earned;
      else if (monthsAgo === 1) lastMonth += earned;
      const idx = 5 - monthsAgo;
      if (idx >= 0 && idx <= 5) trend[idx] += earned;
    }
    void thisMonthStart; void lastMonthStart;
    setMonthly({ thisMonth, lastMonth, trend });
  }, [profile?.id]);

  // ── Fetch history (delivered orders + ratings) ─────────────────────────────
  const fetchHistory = useCallback(async () => {
    if (!profile?.id) return;
    setLoadingHistory(true);
    const { data: delivered } = await supabase
      .from('orders')
      .select('id, order_number, customer_id, total_amount, delivered_at, profiles!orders_customer_id_fkey(full_name)')
      .eq('transporter_id', profile.id)
      .eq('status', 'delivered')
      .order('delivered_at', { ascending: false })
      .limit(50);

    const list = (delivered ?? []) as any[];
    if (list.length === 0) { setHistory([]); setLoadingHistory(false); return; }

    const ids = list.map(d => d.id);
    const { data: reviews } = await supabase
      .from('transport_reviews')
      .select('order_id, reviewer_id, reviewer_role, reviewee_id, rating, comment')
      .in('order_id', ids);

    const mine: Record<string, number> = {};
    const theirs: Record<string, { rating: number; comment: string | null }> = {};
    for (const r of reviews ?? []) {
      if (r.reviewer_id === profile.id) mine[r.order_id] = r.rating;
      else if (r.reviewee_id === profile.id) theirs[r.order_id] = { rating: r.rating, comment: r.comment };
    }

    setHistory(list.map(d => ({
      id:           d.id,
      order_number: d.order_number,
      customer_id:  d.customer_id,
      customer_name:d.profiles?.full_name ?? 'Customer',
      total_amount: d.total_amount ?? 0,
      delivered_at: d.delivered_at,
      myRating:     mine[d.id] ?? null,
      theirRating:  theirs[d.id]?.rating ?? null,
      theirComment: theirs[d.id]?.comment ?? null,
    })));
    setLoadingHistory(false);
  }, [profile?.id]);

  useEffect(() => {
    if (activeTab === 'history' || activeTab === 'deliveries') fetchHistory();
  }, [activeTab, fetchHistory]);

  async function submitCustomerRating() {
    if (!rateModal || !rateStars || !profile?.id) return;
    setSubmittingRate(true);
    const { error } = await supabase.from('transport_reviews').insert({
      order_id:      rateModal.orderId,
      reviewer_id:   profile.id,
      reviewer_role: 'transporter',
      reviewee_id:   rateModal.customerId,
      rating:        rateStars,
      comment:       rateComment.trim() || null,
    });
    setSubmittingRate(false);
    if (error) {
      toast.error('Failed to submit', error.message);
      return;
    }
    toast.success('Rating submitted', `You rated ${rateModal.customerName} ${rateStars} star${rateStars === 1 ? '' : 's'}`);
    setToRateJobs(prev => prev.filter(j => j.id !== rateModal.orderId));
    setRateModal(null);
    setRateStars(0);
    setRateComment('');
  }

  // ── Fetch transport ─────────────────────────────────────────────────────────

  const fetchTransport = useCallback(async (silent = false) => {
    if (!silent) setLoadingTransport(true);
    try {
      // Use getUser() directly — doesn't depend on profile context timing
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoadingTransport(false); return; }

      const [openRes, activeRes] = await Promise.all([
        supabase.from('transport_requests')
          .select('*')
          .eq('status', 'open')
          .order('created_at', { ascending: false })
          .limit(30),
        supabase.from('transport_requests')
          .select('*')
          .eq('assigned_transporter_id', user.id)
          .in('status', ['accepted', 'in_progress'])
          .order('created_at', { ascending: false }),
      ]);

      const opens = (openRes.data ?? []) as TransportRequest[];
      setOpenRequests(opens);
      setMyActiveJobs((activeRes.data ?? []) as TransportRequest[]);

      // Fetch requester contact info for each open request
      if (opens.length > 0) {
        const entries = await Promise.all(
          opens.map(async req => {
            try {
              const { data } = await supabase.rpc('get_requester_contact', { p_request_id: req.id });
              const d = Array.isArray(data) ? data[0] : data;
              return [req.id, (d as ContactInfo) ?? null] as const;
            } catch {
              return [req.id, null] as const;
            }
          })
        );
        const cm: Record<string, ContactInfo | null> = {};
        entries.forEach(([id, c]) => { cm[id] = c; });
        setContacts(cm);
      }
    } finally {
      setLoadingTransport(false);
    }
  }, []);

  // ── Actions — deliveries ────────────────────────────────────────────────────

  async function acceptJob(orderId: string) {
    if (!profile?.id) return;
    setActing(orderId);
    await supabase.from('orders').update({ status: 'transporter_accepted', transporter_id: profile.id }).eq('id', orderId);
    await supabase.from('order_events').insert({
      order_id: orderId, event_type: 'transporter_accepted',
      actor_id: profile.id, actor_role: 'transporter', payload: {},
    });
    toast.success('Job Accepted', 'Navigate to pickup location');
    setActing(null);
    fetchDeliveries();
  }

  async function declineJob(orderId: string) {
    setActing(orderId);
    setPendingJobs(p => p.filter(j => j.id !== orderId));
    setActing(null);
  }

  async function sendDistanceUpdate(orderId: string, message: string) {
    if (!profile?.id) return;
    setActing(orderId);
    const { error } = await supabase.from('order_messages').insert({
      order_id: orderId,
      sender_id: profile.id,
      sender_role: 'transporter',
      content: message,
    });
    setActing(null);
    if (error) toast.error('Failed to send', error.message);
    else toast.success('Update sent', `"${message}" delivered to customer`);
  }

  async function markPickedUp(orderId: string) {
    setActing(orderId);
    await supabase.from('orders').update({ status: 'pending_admin_pickup_confirmation' }).eq('id', orderId);
    await supabase.from('order_events').insert({
      order_id: orderId, event_type: 'pending_admin_pickup_confirmation',
      actor_id: profile!.id, actor_role: 'transporter', payload: {},
    });
    toast.success('Pickup Reported', 'Waiting for admin to confirm pickup');
    setActing(null);
    fetchDeliveries();
  }

  async function markDelivered(orderId: string) {
    setActing(orderId);
    await supabase.from('orders').update({ status: 'pending_admin_confirmation' }).eq('id', orderId);
    await supabase.from('order_events').insert({
      order_id: orderId, event_type: 'pending_admin_confirmation',
      actor_id: profile!.id, actor_role: 'transporter', payload: {},
    });
    toast.success('Delivery Reported', 'Waiting for admin to confirm delivery');
    setActing(null);
    fetchDeliveries();
  }

  // ── Actions — transport ─────────────────────────────────────────────────────

  async function acceptRequest(id: string) {
    setActing(id);
    const { error } = await supabase.rpc('accept_transport_request', { p_request_id: id });
    if (error) {
      toast.error('Failed to accept', error.message);
      fetchTransport(true);
    } else {
      toast.success('Job Accepted!', 'Navigate to pickup location');
      // Move from open to active instantly
      const req = openRequests.find(r => r.id === id);
      if (req) {
        setOpenRequests(prev => prev.filter(r => r.id !== id));
        setMyActiveJobs(prev => [{ ...req, status: 'accepted' }, ...prev]);
      }
    }
    setActing(null);
  }

  async function rejectRequest(id: string) {
    setActing(id);
    setOpenRequests(prev => prev.filter(r => r.id !== id));
    const { error } = await supabase.rpc('reject_transport_request', { p_request_id: id });
    if (error) {
      toast.error('Failed', error.message);
      fetchTransport(true);
    }
    setActing(null);
  }

  async function startTransport(requestId: string) {
    setActing(requestId);
    await supabase.from('transport_requests').update({ status: 'in_progress' }).eq('id', requestId);
    toast.success('Transport Started', 'Drive safe!');
    setActing(null);
    fetchTransport();
  }

  async function completeTransport(requestId: string) {
    setActing(requestId);
    await supabase.from('transport_requests').update({ status: 'completed' }).eq('id', requestId);
    toast.success('Transport Completed', 'Payment will be processed');
    setActing(null);
    fetchTransport();
  }

  // ── Effects ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    fetchDeliveries();
    fetchTransport();
    fetchMonthly();

    const suffix = Math.random().toString(36).slice(2, 10);
    const channel = supabase.channel(`transporter-rt:${suffix}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, (payload: any) => {
        const newStatus = payload.new?.status;
        const oldStatus = payload.old?.status;
        // New broadcast just became available
        if (newStatus === 'transporter_pending' && oldStatus !== 'transporter_pending' && !payload.new?.transporter_id) {
          toast.success('New Delivery Job', `Order #${payload.new?.order_number ?? '—'} is open for pickup`);
          setNewJobAlert({ orderId: payload.new?.id, orderNumber: payload.new?.order_number ?? '—' });
        }
        // This transporter's own job hit admin-confirmed delivered
        if (newStatus === 'delivered' && payload.new?.transporter_id === profile?.id) {
          toast.success('Delivery Confirmed!', `Order #${payload.new?.order_number ?? '—'} marked delivered by admin`);
        }
        fetchDeliveries();
        fetchMonthly();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, (payload: any) => {
        if (payload.new?.status === 'transporter_pending' && !payload.new?.transporter_id) {
          toast.success('New Delivery Job', `Order #${payload.new?.order_number ?? '—'} is open for pickup`);
          setNewJobAlert({ orderId: payload.new?.id, orderNumber: payload.new?.order_number ?? '—' });
        }
        fetchDeliveries();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'transport_requests' },
        (payload: any) => {
          if (payload.new?.status === 'open') {
            toast.success('New Transport Job!', 'A new delivery request is available — check it out.');
          }
          fetchTransport(true);
        })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'transport_requests' },
        (payload: any) => {
          const newStatus = payload.new?.status;
          const oldStatus = payload.old?.status;
          if (newStatus === 'open' && oldStatus !== 'open') {
            toast.success('New Transport Job!', 'A transport request is now available.');
          }
          fetchTransport(true);
        })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchDeliveries, fetchTransport, fetchMonthly]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Status helpers ───────────────────────────────────────────────────────────

  function jobStatusLabel(s: string) {
    const m: Record<string, string> = {
      transporter_accepted:             'Accepted',
      out_for_pickup:                   'Going to Pickup',
      pending_admin_pickup_confirmation:'Pickup — Awaiting Admin',
      picked_up:                        'Picked Up',
      in_transit:                       'In Transit',
      out_for_delivery:                 'Out for Delivery',
      pending_admin_confirmation:       'Delivery — Awaiting Admin',
    };
    return m[s] ?? s.replace(/_/g, ' ');
  }

  // ── Render helpers ───────────────────────────────────────────────────────────

  function renderOpenRequest(req: TransportRequest) {
    const contact = contacts[req.id];
    const isActing = acting === req.id;

    return (
      <View key={req.id} style={s.card}>
        {/* Route */}
        <View style={s.routeBlock}>
          <View style={s.routeRow}>
            <View style={[s.routeDot, { backgroundColor: '#16A34A' }]} />
            <Text style={s.routeText} numberOfLines={2}>{req.pickup_address}</Text>
          </View>
          <View style={s.routeConnector} />
          <View style={s.routeRow}>
            <View style={[s.routeDot, { backgroundColor: '#EF4444' }]} />
            <Text style={s.routeText} numberOfLines={2}>{req.dropoff_address}</Text>
          </View>
        </View>

        {/* Meta chips */}
        <View style={s.chipRow}>
          {req.distance_km ? (
            <View style={s.chip}><Text style={s.chipTxt}>{fmtDist(req.distance_km)}</Text></View>
          ) : null}
          {req.weight_kg ? (
            <View style={s.chip}><Text style={s.chipTxt}>{req.weight_kg} kg</Text></View>
          ) : null}
          <View style={[s.chip, { backgroundColor: VEHICLE_COLORS[req.vehicle_class] + '22' }]}>
            <Text style={[s.chipTxt, { color: VEHICLE_COLORS[req.vehicle_class] }]}>
              {VEHICLE_LABELS[req.vehicle_class]}
            </Text>
          </View>
          <Text style={s.timeAgo}>{timeAgo(req.created_at)}</Text>
        </View>

        {/* Offered price */}
        <View style={s.priceRow}>
          <Text style={s.priceLabel}>Offered Price</Text>
          <View style={s.priceAmount}>
            <IndianRupee size={20} color="#0F172A" strokeWidth={2.5} />
            <Text style={s.priceValue}>
              {req.offered_price != null
                ? req.offered_price.toLocaleString('en-IN', { maximumFractionDigits: 0 })
                : 'TBD'}
            </Text>
          </View>
        </View>

        {/* Requester contact */}
        {contact ? (
          <View style={s.contactRow}>
            <UserCheck size={13} color="#0F172A" strokeWidth={2} />
            <Text style={s.contactName} numberOfLines={1}>
              {contact.full_name ?? req.requester_role}
            </Text>
            {contact.phone ? (
              <>
                <View style={s.contactSep} />
                <Phone size={12} color="#0F172A" strokeWidth={2} />
                <Text style={s.contactPhone}>{contact.phone}</Text>
              </>
            ) : null}
          </View>
        ) : null}

        {/* Actions */}
        <View style={s.actionRow}>
          <Pressable
            onPress={() => acceptRequest(req.id)}
            disabled={isActing}
            style={({ pressed }) => [s.acceptBtn, pressed && { opacity: 0.85 }]}
          >
            {isActing
              ? <ActivityIndicator size="small" color="#fff" />
              : <>
                <CheckCircle2 size={15} color="#FFFFFF" strokeWidth={2.5} />
                <Text style={s.acceptBtnTxt}>Accept</Text>
              </>
            }
          </Pressable>
          <Pressable
            onPress={() => rejectRequest(req.id)}
            disabled={isActing}
            style={s.declineBtn}
          >
            <X size={15} color="#0F172A" strokeWidth={2.5} />
            <Text style={s.declineBtnTxt}>Skip</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  function renderActiveTransport(req: TransportRequest) {
    const isInProgress = req.status === 'in_progress';
    const hasCoords = !!(req.pickup_lat && req.pickup_lng && req.dropoff_lat && req.dropoff_lng);
    return (
      <View key={req.id} style={[s.card, { borderLeftWidth: 3, borderLeftColor: '#F97316' }]}>
        <View style={[s.badge, {
          backgroundColor: isInProgress ? '#FFF7ED' : '#DCFCE7',
          alignSelf: 'flex-start' as const, marginBottom: 10,
        }]}>
          <Text style={[s.badgeTxt, { color: isInProgress ? '#C2410C' : '#16A34A' }]}>
            {isInProgress ? 'In Progress' : 'Accepted — Start when ready'}
          </Text>
        </View>

        {/* OSM Route Map */}
        {hasCoords && (
          <View style={{ marginBottom: 12 }}>
            <RouteMap
              height={220}
              from={{ lat: req.pickup_lat!,  lng: req.pickup_lng!,  label: req.pickup_address }}
              to={{   lat: req.dropoff_lat!, lng: req.dropoff_lng!, label: req.dropoff_address }}
            />
          </View>
        )}

        <View style={s.routeBlock}>
          <View style={s.routeRow}>
            <View style={[s.routeDot, { backgroundColor: '#16A34A' }]} />
            <Text style={s.routeText} numberOfLines={2}>{req.pickup_address}</Text>
          </View>
          <View style={s.routeConnector} />
          <View style={s.routeRow}>
            <View style={[s.routeDot, { backgroundColor: '#EF4444' }]} />
            <Text style={s.routeText} numberOfLines={2}>{req.dropoff_address}</Text>
          </View>
        </View>

        <View style={s.chipRow}>
          {req.distance_km ? (
            <View style={s.chip}><Text style={s.chipTxt}>{fmtDist(req.distance_km)}</Text></View>
          ) : null}
          {req.offered_price != null ? (
            <View style={[s.chip, { backgroundColor: '#DCFCE7' }]}>
              <Text style={[s.chipTxt, { color: '#16A34A' }]}>{fmtINR(req.offered_price)}</Text>
            </View>
          ) : null}
        </View>

        {/* Chat button — only if this request is linked to an order */}
        {req.order_id && (
          <Pressable
            style={s.chatBtn}
            onPress={() => router.push({
              pathname: '/transporter/chat',
              params: { orderId: req.order_id!, customerName: 'Customer' },
            } as never)}
          >
            <MessageCircle size={14} color="#0F172A" strokeWidth={2} />
            <Text style={s.chatBtnTxt}>Message Customer</Text>
          </Pressable>
        )}

        <View style={s.actionRow}>
          {!isInProgress && (
            <Pressable
              onPress={() => startTransport(req.id)}
              disabled={acting === req.id}
              style={({ pressed }) => [s.startBtn, pressed && { opacity: 0.85 }]}
            >
              {acting === req.id
                ? <ActivityIndicator size="small" color="#fff" />
                : <><Play size={14} color="#FFFFFF" fill="#FFFFFF" /><Text style={s.startBtnTxt}>Start Transport</Text></>
              }
            </Pressable>
          )}
          {isInProgress && (
            <Pressable
              onPress={() => completeTransport(req.id)}
              disabled={acting === req.id}
              style={({ pressed }) => [s.completeBtn, pressed && { opacity: 0.85 }]}
            >
              {acting === req.id
                ? <ActivityIndicator size="small" color="#fff" />
                : <><Flag size={14} color="#FFFFFF" fill="#FFFFFF" /><Text style={s.startBtnTxt}>Mark Completed</Text></>
              }
            </Pressable>
          )}
        </View>
      </View>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <View style={s.root}>
      {/* ── Dark header ── */}
      <View style={s.header}>
        <View style={s.headerTop}>
          <View style={{ flex: 1 }}>
            <Text style={s.headerGreet}>Transporter</Text>
            <Text style={s.headerName}>{profile?.full_name ?? 'Dashboard'}</Text>
          </View>
          <Pressable
            style={s.bellBtn}
            onPress={() => router.push('/transporter/notifications' as never)}
            hitSlop={8}
          >
            <Bell size={20} color="#FFFFFF" strokeWidth={1.8} />
            {unreadCount > 0 && (
              <View style={s.bellDot}>
                <Text style={s.bellDotTxt}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            )}
          </Pressable>
          <Pressable
            style={s.bellBtn}
            onPress={async () => {
              await signOut();
              router.replace('/auth/login' as never);
            }}
            hitSlop={8}
          >
            <LogOut size={18} color="#FFFFFF" strokeWidth={1.8} />
          </Pressable>
          <Pressable onPress={() => setOnline(o => !o)} style={[s.toggle, online && s.toggleOn]}>
            <View style={[s.toggleKnob, online && s.toggleKnobOn]} />
          </Pressable>
        </View>

        <View style={[s.statusPill, online && s.statusPillOn]}>
          <View style={[s.statusDot, online && s.statusDotOn]} />
          <Text style={[s.statusTxt, online && s.statusTxtOn]}>
            {online ? 'Online - Receiving jobs' : 'Offline - Go online to accept jobs'}
          </Text>
        </View>

        <View style={s.statsRow}>
          {[
            { label: 'Today Trips', value: String(todayStats.trips) },
            { label: 'Earned', value: fmtINR(todayStats.earned) },
            { label: 'Rating', value: '4.8 ★' },
          ].map(({ label, value }) => (
            <View key={label} style={s.statCard}>
              <Text style={s.statValue}>{value}</Text>
              <Text style={s.statLabel}>{label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* ── Tabs ── */}
      <View style={s.tabBar}>
        {([
          { key: 'transport', label: 'Transport Requests' },
          { key: 'deliveries', label: 'Order Deliveries' },
          { key: 'current', label: `Current Orders${activeJobs.length ? ` (${activeJobs.length})` : ''}` },
          { key: 'history', label: 'History' },
        ] as { key: Tab; label: string }[]).map(t => (
          <Pressable
            key={t.key}
            onPress={() => setActiveTab(t.key)}
            style={[s.tab, activeTab === t.key && s.tabActive]}
          >
            <Text style={[s.tabTxt, activeTab === t.key && s.tabTxtActive]}>{t.label}</Text>
          </Pressable>
        ))}
      </View>

      {/* ── Content ── */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* TRANSPORT TAB */}
        {activeTab === 'transport' && (
          <>
            {/* Active jobs first */}
            {myActiveJobs.length > 0 && (
              <View style={s.section}>
                <Text style={s.sectionTitle}>Active Jobs ({myActiveJobs.length})</Text>
                {myActiveJobs.map(renderActiveTransport)}
              </View>
            )}

            {/* Broadcast pickups — orders the vendor accepted and broadcast to all transporters */}
            {pendingJobs.length > 0 && (
              <View style={s.section}>
                <Text style={s.sectionTitle}>Order Pickups ({pendingJobs.length})</Text>
                {pendingJobs.map(job => {
                  const itemsTxt = (job.items ?? [])
                    .map(it => `${it.quantity} ${it.unit} ${it.product_name}`)
                    .join(', ') || '—';
                  return (
                    <View key={job.id} style={[s.card, { borderLeftWidth: 3, borderLeftColor: '#1D4ED8' }]}>
                      <View style={s.deliveryHeader}>
                        <Text style={s.deliveryNum}>#{job.order_number}</Text>
                        <Text style={s.deliveryEarning}>
                          Est. {fmtINR((job.total_amount ?? 0) * 0.08)}
                        </Text>
                      </View>

                      <View style={s.routeBox}>
                        <View style={s.routeRow}>
                          <View style={[s.routeDot, { backgroundColor: '#1D4ED8' }]} />
                          <View style={{ flex: 1 }}>
                            <Text style={s.routeLabel}>Pickup</Text>
                            <Text style={s.routeAddr} numberOfLines={2}>
                              {job.pickup
                                ? [job.pickup.line1, job.pickup.city].filter(Boolean).join(', ')
                                : 'Vendor location'}
                            </Text>
                          </View>
                        </View>
                        <View style={s.routeLine} />
                        <View style={s.routeRow}>
                          <View style={[s.routeDot, { backgroundColor: '#15803D' }]} />
                          <View style={{ flex: 1 }}>
                            <Text style={s.routeLabel}>Drop</Text>
                            <Text style={s.routeAddr} numberOfLines={2}>
                              {job.drop
                                ? [job.drop.line1, job.drop.city].filter(Boolean).join(', ')
                                : 'Customer address'}
                            </Text>
                          </View>
                        </View>
                      </View>

                      <View style={s.metaRow}>
                        <View style={s.metaItem}>
                          <Weight size={13} color="#0F172A" strokeWidth={2} />
                          <Text style={s.metaTxt}>
                            {job.total_weight_kg ? `${job.total_weight_kg} kg` : 'Weight n/a'}
                          </Text>
                        </View>
                        <View style={[s.metaItem, { flex: 1 }]}>
                          <Package size={13} color="#0F172A" strokeWidth={2} />
                          <Text style={s.metaTxt} numberOfLines={1}>{itemsTxt}</Text>
                        </View>
                      </View>

                      <View style={s.actionRow}>
                        <Pressable
                          onPress={() => acceptJob(job.id)}
                          disabled={acting === job.id}
                          style={({ pressed }) => [s.acceptBtn, pressed && { opacity: 0.85 }]}
                        >
                          {acting === job.id
                            ? <ActivityIndicator size="small" color="#fff" />
                            : <Text style={s.acceptBtnTxt}>Accept</Text>
                          }
                        </Pressable>
                        <Pressable
                          onPress={() => declineJob(job.id)}
                          disabled={acting === job.id}
                          style={s.declineBtn}
                        >
                          <Text style={s.declineBtnTxt}>Decline</Text>
                        </Pressable>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Open vendor-initiated transport requests */}
            <View style={s.section}>
              <Text style={s.sectionTitle}>
                Available Requests ({openRequests.length})
              </Text>
              {loadingTransport ? (
                <View style={s.emptyBox}>
                  <ActivityIndicator color={Colors.primary} size="large" />
                </View>
              ) : openRequests.length === 0 ? (
                <EmptyTruckState
                  title="No open transport requests right now"
                  sub="You'll be notified when a new request matches your vehicle"
                  online={online}
                />
              ) : (
                openRequests.map(renderOpenRequest)
              )}
            </View>
          </>
        )}

        {/* DELIVERIES TAB */}
        {activeTab === 'deliveries' && (
          <>
            {/* Current delivery reports */}
            {activeJobs.length > 0 && (
              <View style={s.section}>
                <Text style={s.sectionTitle}>Delivery Reports — Current ({activeJobs.length})</Text>
                {activeJobs.map(job => {
                  const itemsTxt = (job.items ?? [])
                    .map(it => `${it.quantity} ${it.unit} ${it.product_name}`)
                    .join(', ') || '—';
                  const hasCoords = !!(job.pickup?.lat && job.pickup?.lng && job.drop?.lat && job.drop?.lng);
                  return (
                    <View key={job.id} style={[s.card, { borderLeftWidth: 3, borderLeftColor: '#F97316' }]}>
                      <View style={s.deliveryHeader}>
                        <View style={{ flex: 1 }}>
                          <Text style={s.deliveryNum}>#{job.order_number}</Text>
                          {job.customer_name ? (
                            <Text style={{ fontFamily: FontFamily.regular, fontSize: 12, color: Colors.textMuted, marginTop: 1 }}>
                              {job.customer_name}{job.customer_phone ? ` · ${job.customer_phone}` : ''}
                            </Text>
                          ) : null}
                        </View>
                        <View style={[s.badge, { backgroundColor: job.status === 'pending_admin_confirmation' ? '#DCFCE7' : '#DBEAFE' }]}>
                          <Text style={[s.badgeTxt, { color: job.status === 'pending_admin_confirmation' ? '#16A34A' : '#1D4ED8' }]}>
                            {jobStatusLabel(job.status)}
                          </Text>
                        </View>
                      </View>

                      {/* OSM Route Map */}
                      {hasCoords && job.status !== 'pending_admin_confirmation' && (
                        <View style={{ marginTop: 12 }}>
                          <RouteMap
                            height={220}
                            from={{
                              lat: job.pickup!.lat!, lng: job.pickup!.lng!,
                              label: [job.pickup!.line1, job.pickup!.city].filter(Boolean).join(', '),
                            }}
                            to={{
                              lat: job.drop!.lat!, lng: job.drop!.lng!,
                              label: [job.drop!.line1, job.drop!.city].filter(Boolean).join(', '),
                            }}
                          />
                        </View>
                      )}

                      {/* Pickup → Drop block */}
                      <View style={[s.routeBox, { marginTop: 12 }]}>
                        <View style={s.routeRow}>
                          <View style={[s.routeDot, { backgroundColor: '#1D4ED8' }]} />
                          <View style={{ flex: 1 }}>
                            <Text style={s.routeLabel}>Pickup (Vendor)</Text>
                            <Text style={s.routeAddr} numberOfLines={2}>
                              {job.pickup
                                ? [job.pickup.line1, job.pickup.city, job.pickup.pincode].filter(Boolean).join(', ')
                                : 'Vendor location'}
                            </Text>
                          </View>
                        </View>
                        <View style={s.routeLine} />
                        <View style={s.routeRow}>
                          <View style={[s.routeDot, { backgroundColor: '#15803D' }]} />
                          <View style={{ flex: 1 }}>
                            <Text style={s.routeLabel}>Drop (Customer)</Text>
                            <Text style={s.routeAddr} numberOfLines={2}>
                              {job.drop
                                ? [job.drop.line1, job.drop.city, job.drop.pincode].filter(Boolean).join(', ')
                                : 'Customer address'}
                            </Text>
                          </View>
                        </View>
                      </View>

                      {/* Weight + items */}
                      <View style={s.metaRow}>
                        <View style={s.metaItem}>
                          <Weight size={13} color="#0F172A" strokeWidth={2} />
                          <Text style={s.metaTxt}>
                            {job.total_weight_kg ? `${job.total_weight_kg} kg` : 'Weight n/a'}
                          </Text>
                        </View>
                        <View style={[s.metaItem, { flex: 1 }]}>
                          <Package size={13} color="#0F172A" strokeWidth={2} />
                          <Text style={s.metaTxt} numberOfLines={1}>{itemsTxt}</Text>
                        </View>
                      </View>

                      {/* Chat button for active deliveries */}
                      {job.status !== 'pending_admin_confirmation' && (
                        <Pressable
                          style={s.chatBtn}
                          onPress={() => router.push({
                            pathname: '/transporter/chat',
                            params: { orderId: job.id, customerName: job.customer_name ?? 'Customer' },
                          } as never)}
                        >
                          <MessageCircle size={14} color="#0F172A" strokeWidth={2} />
                          <Text style={s.chatBtnTxt}>Message Customer</Text>
                        </Pressable>
                      )}

                      {job.status === 'transporter_accepted' && (
                        <Pressable
                          onPress={() => markPickedUp(job.id)}
                          disabled={acting === job.id}
                          style={[s.startBtn, { backgroundColor: '#F97316', marginTop: 8 }]}
                        >
                          {acting === job.id
                            ? <ActivityIndicator size="small" color="#fff" />
                            : <Text style={s.startBtnTxt}>Mark Picked Up</Text>
                          }
                        </Pressable>
                      )}
                      {['picked_up', 'in_transit', 'out_for_delivery'].includes(job.status) && (
                        <Pressable
                          onPress={() => markDelivered(job.id)}
                          disabled={acting === job.id}
                          style={[s.completeBtn, { marginTop: 8 }]}
                        >
                          {acting === job.id
                            ? <ActivityIndicator size="small" color="#fff" />
                            : <Text style={s.startBtnTxt}>Mark as Delivered</Text>
                          }
                        </Pressable>
                      )}
                      {job.status === 'pending_admin_pickup_confirmation' && (
                        <View style={{ marginTop: 8, backgroundColor: '#FFFBEB', borderRadius: 8, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <CheckCircle2 size={15} color="#0F172A" strokeWidth={2} />
                          <Text style={{ fontFamily: FontFamily.regular, fontSize: 12, color: '#92400E', flex: 1 }}>
                            Pickup reported — waiting for admin to confirm before you proceed
                          </Text>
                        </View>
                      )}
                      {job.status === 'pending_admin_confirmation' && (
                        <View style={{ marginTop: 8, backgroundColor: '#F0FDF4', borderRadius: 8, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <CheckCircle2 size={15} color="#0F172A" strokeWidth={2} />
                          <Text style={{ fontFamily: FontFamily.regular, fontSize: 12, color: '#15803D', flex: 1 }}>
                            Delivery reported — waiting for admin confirmation
                          </Text>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            )}

            {/* Past Deliveries — compact list of completed orders */}
            <View style={s.section}>
              <Text style={s.sectionTitle}>Past Deliveries ({history.length})</Text>
              {loadingHistory ? (
                <View style={{ padding: 24, alignItems: 'center' }}>
                  <ActivityIndicator color="#1A5C30" />
                </View>
              ) : history.length === 0 ? (
                <EmptyTruckState
                  title={activeJobs.length > 0 ? 'No past deliveries yet' : 'No deliveries yet'}
                  sub="Completed orders will appear here with your earnings & ratings"
                />
              ) : (
                history.slice(0, 10).map(h => {
                  const earned = (h.total_amount ?? 0) * 0.08;
                  return (
                    <View key={h.id} style={[s.card, { borderLeftWidth: 3, borderLeftColor: '#15803D' }]}>
                      <View style={s.deliveryHeader}>
                        <View style={{ flex: 1 }}>
                          <Text style={s.deliveryNum}>#{h.order_number}</Text>
                          <Text style={{ fontFamily: FontFamily.regular, fontSize: 12, color: Colors.textMuted, marginTop: 1 }}>
                            {h.customer_name} · Delivered {h.delivered_at ? new Date(h.delivered_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'}
                          </Text>
                        </View>
                        <Text style={s.deliveryEarning}>+{fmtINR(earned)}</Text>
                      </View>
                      {h.theirRating ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 }}>
                          {[1, 2, 3, 4, 5].map(n => (
                            <Star key={n} size={11} color="#0F172A" fill={n <= h.theirRating! ? '#0F172A' : 'transparent'} strokeWidth={1.5} />
                          ))}
                          <Text style={{ fontFamily: FontFamily.regular, fontSize: 11.5, color: Colors.textMuted, marginLeft: 4 }}>
                            Customer rating
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  );
                })
              )}
              {history.length > 10 ? (
                <Pressable onPress={() => setActiveTab('history')} style={{ alignSelf: 'center', paddingVertical: 8 }}>
                  <Text style={{ fontFamily: FontFamily.semiBold, fontSize: 12.5, color: '#1A5C30' }}>
                    View all {history.length} in History →
                  </Text>
                </Pressable>
              ) : null}
            </View>

            {/* Rate customers — appears in the deliveries tab so transporters can rate after delivery */}
            {toRateJobs.length > 0 && (
              <View style={s.section}>
                <Text style={s.sectionTitle}>Rate Your Customers</Text>
                <Text style={[s.emptySubTxt, { marginBottom: 12 }]}>
                  Quick feedback helps build trust on the platform.
                </Text>
                {toRateJobs.map(j => (
                  <View key={j.id} style={[s.card, { borderLeftWidth: 3, borderLeftColor: '#F59E0B' }]}>
                    <View style={s.deliveryHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={s.deliveryNum}>#{j.order_number}</Text>
                        <Text style={{ fontFamily: FontFamily.regular, fontSize: 12, color: Colors.textMuted, marginTop: 1 }}>
                          {j.customer_name}
                        </Text>
                      </View>
                      <Pressable
                        style={s.rateBtn}
                        onPress={() => {
                          setRateModal({ orderId: j.id, customerId: j.customer_id, customerName: j.customer_name });
                          setRateStars(0);
                          setRateComment('');
                        }}
                      >
                        <Star size={13} color="#FFFFFF" fill="#FFFFFF" strokeWidth={2} />
                        <Text style={s.rateBtnTxt}>Rate Customer</Text>
                      </Pressable>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </>
        )}

        {/* ── Current Orders tab ─────────────────────────────────────────────── */}
        {activeTab === 'current' && (
          <>
            {activeJobs.length === 0 ? (
              <EmptyTruckState
                title="No current orders"
                sub='Accept a job from "Order Deliveries" to start delivering'
              />
            ) : (
              <View style={s.section}>
                <Text style={s.sectionTitle}>Current Orders ({activeJobs.length})</Text>
                <Text style={[s.emptySubTxt, { marginBottom: 12 }]}>
                  Keep your customer updated with quick distance pings while you drive.
                </Text>

                {activeJobs.map(job => {
                  const customerLine = [job.customer_name, job.customer_phone].filter(Boolean).join(' · ') || 'Customer';
                  return (
                    <View key={job.id} style={[s.card, { borderLeftWidth: 3, borderLeftColor: '#1D4ED8' }]}>
                      {/* Header */}
                      <View style={s.deliveryHeader}>
                        <View style={{ flex: 1 }}>
                          <Text style={s.deliveryNum}>#{job.order_number}</Text>
                          <Text style={{ fontFamily: FontFamily.regular, fontSize: 12, color: Colors.textMuted, marginTop: 1 }}>
                            {customerLine}
                          </Text>
                        </View>
                        <View style={[s.badge, { backgroundColor: '#DBEAFE' }]}>
                          <Text style={[s.badgeTxt, { color: '#1D4ED8' }]}>{jobStatusLabel(job.status)}</Text>
                        </View>
                      </View>

                      {/* Drop address strip */}
                      {job.drop && (
                        <View style={[s.routeBox, { marginTop: 10 }]}>
                          <View style={s.routeRow}>
                            <MapPin size={14} color="#0F172A" strokeWidth={2} style={{ marginTop: 2 }} />
                            <View style={{ flex: 1 }}>
                              <Text style={s.routeLabel}>Heading to</Text>
                              <Text style={s.routeAddr} numberOfLines={2}>
                                {[job.drop.line1, job.drop.city, job.drop.pincode].filter(Boolean).join(', ')}
                              </Text>
                            </View>
                          </View>
                        </View>
                      )}

                      {/* Distance ping chips */}
                      <Text style={{ fontFamily: FontFamily.semiBold, fontSize: 12, color: Colors.textPrimary, marginTop: 12, marginBottom: 6 }}>
                        Quick Distance Ping
                      </Text>
                      <View style={s.pingRow}>
                        {DISTANCE_PRESETS.map(preset => (
                          <Pressable
                            key={preset}
                            style={({ pressed }) => [s.pingChip, pressed && { opacity: 0.7 }]}
                            onPress={() => sendDistanceUpdate(job.id, preset)}
                            disabled={acting === job.id}
                          >
                            <Text style={s.pingChipTxt}>{preset}</Text>
                          </Pressable>
                        ))}
                      </View>

                      {/* Action row */}
                      <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                        <Pressable
                          style={[s.chatBtn, { flex: 1, justifyContent: 'center', alignSelf: 'auto' }]}
                          onPress={() => router.push({
                            pathname: '/transporter/chat',
                            params: { orderId: job.id, customerName: job.customer_name ?? 'Customer' },
                          } as never)}
                        >
                          <MessageCircle size={14} color="#0F172A" strokeWidth={2} />
                          <Text style={s.chatBtnTxt}>Open Full Chat</Text>
                        </Pressable>

                        {job.status === 'transporter_accepted' && (
                          <Pressable
                            onPress={() => markPickedUp(job.id)}
                            disabled={acting === job.id}
                            style={[s.startBtn, { flex: 1, backgroundColor: '#F97316', marginTop: 0 }]}
                          >
                            {acting === job.id
                              ? <ActivityIndicator size="small" color="#fff" />
                              : <Text style={s.startBtnTxt}>Mark Picked Up</Text>}
                          </Pressable>
                        )}
                        {['picked_up', 'in_transit', 'out_for_delivery'].includes(job.status) && (
                          <Pressable
                            onPress={() => markDelivered(job.id)}
                            disabled={acting === job.id}
                            style={[s.completeBtn, { flex: 1, marginTop: 0 }]}
                          >
                            {acting === job.id
                              ? <ActivityIndicator size="small" color="#fff" />
                              : <Text style={s.startBtnTxt}>Mark Delivered</Text>}
                          </Pressable>
                        )}
                      </View>

                      {job.status === 'pending_admin_pickup_confirmation' && (
                        <View style={{ marginTop: 10, backgroundColor: '#FFFBEB', borderRadius: 8, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <CheckCircle2 size={15} color="#0F172A" strokeWidth={2} />
                          <Text style={{ fontFamily: FontFamily.regular, fontSize: 12, color: '#92400E', flex: 1 }}>
                            Pickup reported — waiting for admin to confirm
                          </Text>
                        </View>
                      )}
                      {job.status === 'pending_admin_confirmation' && (
                        <View style={{ marginTop: 10, backgroundColor: '#F0FDF4', borderRadius: 8, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <CheckCircle2 size={15} color="#0F172A" strokeWidth={2} />
                          <Text style={{ fontFamily: FontFamily.regular, fontSize: 12, color: '#15803D', flex: 1 }}>
                            Delivery reported — waiting for admin confirmation
                          </Text>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            )}
          </>
        )}

        {/* ── History tab ────────────────────────────────────────────────────── */}
        {activeTab === 'history' && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Delivery History ({history.length})</Text>
            {loadingHistory ? (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <ActivityIndicator color="#1A5C30" />
              </View>
            ) : history.length === 0 ? (
              <EmptyTruckState
                title="No delivered orders yet"
                sub="Your completed jobs will appear here"
              />
            ) : (
              history.map(h => {
                const earned = (h.total_amount ?? 0) * 0.08;
                return (
                  <View key={h.id} style={[s.card, { borderLeftWidth: 3, borderLeftColor: '#15803D' }]}>
                    <View style={s.deliveryHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={s.deliveryNum}>#{h.order_number}</Text>
                        <Text style={{ fontFamily: FontFamily.regular, fontSize: 12, color: Colors.textMuted, marginTop: 1 }}>
                          {h.customer_name} · Delivered {h.delivered_at ? new Date(h.delivered_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'}
                        </Text>
                      </View>
                      <Text style={s.deliveryEarning}>+{fmtINR(earned)}</Text>
                    </View>

                    {/* Their rating of me */}
                    {h.theirRating ? (
                      <View style={[s.histChip, { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          {[1, 2, 3, 4, 5].map(n => (
                            <Star key={n} size={12} color="#0F172A" fill={n <= h.theirRating! ? '#0F172A' : 'transparent'} strokeWidth={1.5} />
                          ))}
                        </View>
                        <Text style={s.histChipTxt}>Customer rated you {h.theirRating}/5</Text>
                        {h.theirComment ? <Text style={s.histComment} numberOfLines={2}>“{h.theirComment}”</Text> : null}
                      </View>
                    ) : (
                      <View style={[s.histChip, { backgroundColor: '#F1F5F9', borderColor: '#E2E8F0' }]}>
                        <Text style={s.histChipTxt}>Awaiting customer rating</Text>
                      </View>
                    )}

                    {/* My rating of them */}
                    {h.myRating ? (
                      <View style={[s.histChip, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          {[1, 2, 3, 4, 5].map(n => (
                            <Star key={n} size={12} color="#0F172A" fill={n <= h.myRating! ? '#0F172A' : 'transparent'} strokeWidth={1.5} />
                          ))}
                        </View>
                        <Text style={[s.histChipTxt, { color: '#15803D' }]}>You rated this customer {h.myRating}/5</Text>
                      </View>
                    ) : (
                      <Pressable
                        style={[s.rateBtn, { alignSelf: 'flex-start' }]}
                        onPress={() => {
                          setRateModal({ orderId: h.id, customerId: h.customer_id, customerName: h.customer_name });
                          setRateStars(0);
                          setRateComment('');
                        }}
                      >
                        <Star size={13} color="#FFFFFF" fill="#FFFFFF" strokeWidth={2} />
                        <Text style={s.rateBtnTxt}>Rate Customer</Text>
                      </Pressable>
                    )}
                  </View>
                );
              })
            )}
          </View>
        )}
      </ScrollView>

      {/* Info footer — slim status strip */}
      <View style={s.infoFooter}>
        <View style={[s.infoFooterDot, online && s.infoFooterDotOn]} />
        <Text style={s.infoFooterTxt}>
          {online
            ? 'You are online and will receive job requests'
            : 'You are offline - toggle online above to receive jobs'}
        </Text>
      </View>

      {/* New job alert — pops when a fresh broadcast lands */}
      <Modal
        visible={!!newJobAlert}
        transparent
        animationType="fade"
        onRequestClose={() => setNewJobAlert(null)}
      >
        <Pressable style={s.alertBackdrop} onPress={() => setNewJobAlert(null)}>
          <Pressable style={s.alertCard} onPress={() => {}}>
            <View style={s.alertIconWrap}>
              <Truck size={28} color="#FFFFFF" strokeWidth={2.2} />
            </View>
            <Text style={s.alertTitle}>New Delivery Job!</Text>
            <Text style={s.alertSub}>
              Order <Text style={{ fontFamily: FontFamily.bold, color: '#0F172A' }}>#{newJobAlert?.orderNumber}</Text> is open for pickup. Be the first to accept it.
            </Text>
            <View style={s.alertActions}>
              <Pressable style={s.alertLater} onPress={() => setNewJobAlert(null)}>
                <Text style={s.alertLaterTxt}>Later</Text>
              </Pressable>
              <Pressable
                style={s.alertGo}
                onPress={() => {
                  setActiveTab('deliveries');
                  setNewJobAlert(null);
                }}
              >
                <Text style={s.alertGoTxt}>View Job</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Rate customer modal */}
      <Modal
        visible={!!rateModal}
        animationType="fade"
        transparent
        onRequestClose={() => setRateModal(null)}
      >
        <Pressable style={s.modalBackdrop} onPress={() => setRateModal(null)}>
          <Pressable style={s.modalCard} onPress={() => {}}>
            <View style={{ alignItems: 'center', marginBottom: 4 }}>
              <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: '#DCFCE7', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                <CheckCircle2 size={28} color="#0F172A" strokeWidth={2} />
              </View>
              <Text style={s.modalTitle}>Delivery Confirmed!</Text>
              <Text style={s.modalSub}>Rate your experience with {rateModal?.customerName ?? 'the customer'}</Text>
            </View>

            <View style={s.starsRow}>
              {[1, 2, 3, 4, 5].map(n => (
                <Pressable key={n} onPress={() => setRateStars(n)} hitSlop={6}>
                  <Star
                    size={36}
                    color="#0F172A"
                    fill={n <= rateStars ? '#0F172A' : 'transparent'}
                    strokeWidth={1.5}
                  />
                </Pressable>
              ))}
            </View>

            <TextInput
              style={s.modalInput}
              placeholder="Add a comment (optional)"
              placeholderTextColor={Colors.textMuted}
              value={rateComment}
              onChangeText={setRateComment}
              multiline
              maxLength={300}
            />

            <View style={s.modalActions}>
              <Pressable style={s.modalCancel} onPress={() => setRateModal(null)}>
                <Text style={s.modalCancelTxt}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[s.modalSubmit, (!rateStars || submittingRate) && { opacity: 0.5 }]}
                onPress={submitCustomerRating}
                disabled={!rateStars || submittingRate}
              >
                {submittingRate
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={s.modalSubmitTxt}>Submit Rating</Text>}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const HEADER = '#1A5C30';

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAFC' },

  header: {
    backgroundColor: HEADER,
    paddingTop: 36,
    paddingLeft: 32, paddingRight: 28,
    paddingBottom: 20,
    gap: 12,
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  headerGreet: { fontFamily: FontFamily.regular, fontSize: 11, color: 'rgba(255,255,255,0.72)', letterSpacing: 0.1 },
  headerName: { fontFamily: FontFamily.semiBold, fontSize: 16, color: '#fff', marginTop: 1 },

  bellBtn: {
    width: 34, height: 34, borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center',
    position: 'relative' as const,
  },
  bellDot: {
    position: 'absolute' as const, top: -2, right: -2,
    minWidth: 16, height: 16, paddingHorizontal: 3, borderRadius: 8,
    backgroundColor: '#F97316', borderWidth: 1.5, borderColor: '#1A5C30',
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
    borderRadius: 99, paddingHorizontal: 11, paddingVertical: 5,
    alignSelf: 'flex-start' as const,
  },
  statusPillOn: { backgroundColor: 'rgba(74,222,128,0.22)' },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#94A3B8' },
  statusDotOn: { backgroundColor: '#4ADE80' },
  statusTxt: { fontFamily: FontFamily.semiBold, fontSize: 11, color: 'rgba(255,255,255,0.78)', letterSpacing: 0.1 },
  statusTxtOn: { color: '#4ADE80' },

  statsRow: {
    flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.10)',
    borderRadius: 10, paddingVertical: 10,
  },
  statCard: {
    flex: 1, alignItems: 'center',
    borderRightWidth: 1, borderRightColor: 'rgba(255,255,255,0.14)',
  },
  statValue: { fontFamily: FontFamily.bold, fontSize: 16, color: '#fff', letterSpacing: -0.2 },
  statLabel: { fontFamily: FontFamily.regular, fontSize: 10.5, color: 'rgba(255,255,255,0.72)', marginTop: 2, letterSpacing: 0.2 },

  tabBar: {
    flexDirection: 'row', backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#E2E8F0',
  },
  tab: {
    flex: 1, paddingVertical: 11, alignItems: 'center',
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: HEADER },
  tabTxt: { fontFamily: FontFamily.medium, fontSize: 12, color: '#64748B', letterSpacing: 0.05 },
  tabTxtActive: { fontFamily: FontFamily.semiBold, color: HEADER },

  section: { gap: 8 },
  sectionTitle: { fontFamily: FontFamily.semiBold, fontSize: 13, color: Colors.textPrimary, marginBottom: 2, letterSpacing: -0.05 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 8, padding: 14,
    borderWidth: 1, borderColor: '#E2E8F0',
    ...Shadow.sm,
  },

  routeBlock: { gap: 0 },
  routeConnector: { width: 1, height: 16, backgroundColor: '#CBD5E1', marginLeft: 4.5, marginVertical: 1 },
  routeText: { flex: 1, fontFamily: FontFamily.regular, fontSize: 12.5, color: Colors.textPrimary, lineHeight: 18 },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10, alignItems: 'center' },
  chip: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 99, backgroundColor: '#F1F5F9' },
  chipTxt: { fontFamily: FontFamily.medium, fontSize: 11, color: '#475569' },
  timeAgo: { fontFamily: FontFamily.regular, fontSize: 11, color: '#94A3B8', marginLeft: 'auto' as never },

  // Price display
  priceRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 12, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: '#F1F5F9',
  },
  priceLabel: { fontFamily: FontFamily.medium, fontSize: 12, color: '#64748B' },
  priceAmount: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  priceValue: { fontFamily: FontFamily.bold, fontSize: 22, color: HEADER },

  // Contact row
  contactRow: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    marginTop: 8, paddingHorizontal: 2,
  },
  contactName: { fontFamily: FontFamily.medium, fontSize: 12, color: '#475569', flex: 1 },
  contactSep: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#CBD5E1' },
  contactPhone: { fontFamily: FontFamily.semiBold, fontSize: 13, color: '#1E293B' },

  // Buttons
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  acceptBtn: {
    flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 11, borderRadius: 10, backgroundColor: HEADER,
  },
  acceptBtnTxt: { fontFamily: FontFamily.semiBold, fontSize: 13, color: '#fff' },
  declineBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 4, paddingVertical: 11, borderRadius: 10, backgroundColor: '#F1F5F9',
  },
  declineBtnTxt: { fontFamily: FontFamily.semiBold, fontSize: 13, color: '#64748B' },

  startBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, backgroundColor: '#F97316', borderRadius: 10, paddingVertical: 11, flex: 1,
  },
  completeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, backgroundColor: '#16A34A', borderRadius: 10, paddingVertical: 11, flex: 1,
  },
  startBtnTxt: { fontFamily: FontFamily.semiBold, fontSize: 13, color: '#fff' },

  goOnlineBtn: {
    marginTop: 8, backgroundColor: HEADER,
    paddingHorizontal: 24, paddingVertical: 10, borderRadius: 99,
  },
  goOnlineTxt: { fontFamily: FontFamily.semiBold, fontSize: 13, color: '#fff' },

  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99 },
  badgeTxt: { fontFamily: FontFamily.semiBold, fontSize: 11 },

  deliveryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  deliveryNum: { fontFamily: FontFamily.bold, fontSize: 14, color: Colors.textPrimary },
  deliveryEarning: { fontFamily: FontFamily.semiBold, fontSize: 13, color: HEADER },
  chatBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8,
    backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE',
    marginTop: 8, alignSelf: 'flex-start' as const,
  },
  chatBtnTxt: { fontFamily: FontFamily.semiBold, fontSize: 12, color: '#1D4ED8' },

  routeBox: {
    backgroundColor: '#F8FAFC', borderRadius: 10,
    padding: 12, gap: 8, borderWidth: 1, borderColor: '#E2E8F0',
  },
  routeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  routeDot: {
    width: 10, height: 10, borderRadius: 5, marginTop: 5,
    borderWidth: 2, borderColor: '#fff',
    shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 2,
  },
  routeLine: { width: 2, height: 12, backgroundColor: '#CBD5E1', marginLeft: 4 },
  routeLabel: { fontFamily: FontFamily.semiBold, fontSize: 10, color: Colors.textMuted, textTransform: 'uppercase' as const, letterSpacing: 0.3 },
  routeAddr:  { fontFamily: FontFamily.regular, fontSize: 12, color: Colors.textPrimary, marginTop: 1, lineHeight: 16 },

  metaRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#E2E8F0',
  },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaTxt:  { fontFamily: FontFamily.regular, fontSize: 12, color: Colors.textSecondary },

  pingRow:    { flexDirection: 'row', flexWrap: 'wrap' as const, gap: 6 },
  pingChip: {
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 99,
    backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE',
  },
  pingChipTxt:{ fontFamily: FontFamily.semiBold, fontSize: 12, color: '#1D4ED8' },

  rateBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8,
    backgroundColor: '#F59E0B',
  },
  rateBtnTxt: { fontFamily: FontFamily.semiBold, fontSize: 12, color: '#fff' },

  histChip: {
    marginTop: 8, paddingVertical: 8, paddingHorizontal: 10,
    borderRadius: 8, borderWidth: 1, gap: 4,
  },
  histChipTxt: { fontFamily: FontFamily.semiBold, fontSize: 12, color: '#B45309' },
  histComment: { fontFamily: FontFamily.regular, fontSize: 12, color: '#92400E', marginTop: 2, fontStyle: 'italic' as const },

  modalBackdrop: {
    flex: 1, backgroundColor: 'rgba(15,23,42,0.55)',
    alignItems: 'center', justifyContent: 'center', padding: 20,
  },
  modalCard: {
    width: '100%', maxWidth: 420, backgroundColor: '#fff',
    borderRadius: 16, padding: 22, gap: 14,
  },
  modalTitle: { fontFamily: FontFamily.bold, fontSize: 18, color: Colors.textPrimary },
  modalSub:   { fontFamily: FontFamily.regular, fontSize: 13, color: Colors.textMuted },
  starsRow:   { flexDirection: 'row', justifyContent: 'center', gap: 10, paddingVertical: 8 },
  modalInput: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: 10,
    padding: 12, fontFamily: FontFamily.regular, fontSize: 13,
    color: Colors.textPrimary, minHeight: 72,
    textAlignVertical: 'top' as const,
  },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  modalCancel: {
    flex: 1, paddingVertical: 12, borderRadius: 10,
    backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center',
  },
  modalCancelTxt: { fontFamily: FontFamily.semiBold, fontSize: 14, color: Colors.textSecondary },
  modalSubmit: {
    flex: 1, paddingVertical: 12, borderRadius: 10,
    backgroundColor: '#F59E0B', alignItems: 'center', justifyContent: 'center',
  },
  modalSubmitTxt: { fontFamily: FontFamily.bold, fontSize: 14, color: '#fff' },

  /* New-job alert modal */
  alertBackdrop: {
    flex: 1, backgroundColor: 'rgba(15,23,42,0.6)',
    alignItems: 'center', justifyContent: 'center', padding: 20,
  },
  alertCard: {
    width: '100%', maxWidth: 380, backgroundColor: '#fff',
    borderRadius: 16, padding: 24, alignItems: 'center', gap: 6,
  },
  alertIconWrap: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: '#1A5C30',
    alignItems: 'center', justifyContent: 'center', marginBottom: 6,
  },
  alertTitle: { fontFamily: FontFamily.bold, fontSize: 19, color: '#0F172A', letterSpacing: -0.3 },
  alertSub:   { fontFamily: FontFamily.regular, fontSize: 13, color: '#64748B', textAlign: 'center', lineHeight: 19, marginBottom: 12 },
  alertActions: { flexDirection: 'row', gap: 10, width: '100%', marginTop: 4 },
  alertLater: {
    flex: 1, paddingVertical: 12, borderRadius: 10,
    backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center',
  },
  alertLaterTxt: { fontFamily: FontFamily.semiBold, fontSize: 14, color: '#475569' },
  alertGo: {
    flex: 1.3, paddingVertical: 12, borderRadius: 10,
    backgroundColor: '#1A5C30', alignItems: 'center', justifyContent: 'center',
  },
  alertGoTxt: { fontFamily: FontFamily.bold, fontSize: 14, color: '#fff' },

  emptyBox: {
    backgroundColor: '#fff', borderRadius: 14, padding: 32,
    alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#E2E8F0',
  },
  emptyTxt: { fontFamily: FontFamily.semiBold, fontSize: 14, color: '#374151' },
  emptySubTxt: { fontFamily: FontFamily.regular, fontSize: 12, color: '#94A3B8' },

  /* Big truck empty state */
  emptyTruckCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1, borderColor: '#E2E8F0',
    paddingVertical: 32, paddingHorizontal: 20,
    alignItems: 'center', gap: 14,
    marginVertical: 4,
  },
  emptyTruckImg: { width: 260, height: 180 },
  emptyStatusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#F1F5F9', borderRadius: 99,
    paddingHorizontal: 11, paddingVertical: 5,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  emptyStatusPillOn: { backgroundColor: '#DCFCE7', borderColor: '#86EFAC' },
  emptyStatusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#94A3B8' },
  emptyStatusDotOn: { backgroundColor: '#16A34A' },
  emptyStatusTxt: { fontFamily: FontFamily.semiBold, fontSize: 11.5, color: '#64748B', letterSpacing: 0.1 },
  emptyStatusTxtOn: { color: '#15803D' },
  emptyTruckTitle: {
    fontFamily: FontFamily.semiBold, fontSize: 15, color: '#0F172A',
    letterSpacing: -0.1, textAlign: 'center', marginTop: 2,
  },
  emptyTruckSub: {
    fontFamily: FontFamily.regular, fontSize: 13, color: '#64748B',
    textAlign: 'center', maxWidth: 320, lineHeight: 18,
  },

  /* HomeStack */
  homeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1, borderColor: '#E2E8F0',
    padding: 14, gap: 10,
    ...Shadow.sm,
  },
  homeCardHead: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  homeCardTitle: {
    fontFamily: FontFamily.semiBold, fontSize: 14, color: '#0F172A', letterSpacing: -0.1,
  },
  homeCardLink: {
    fontFamily: FontFamily.semiBold, fontSize: 12, color: '#1A5C30', letterSpacing: -0.05,
  },

  /* Today's Trips */
  tripsStatsRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 4,
  },
  tripsStat: { flex: 1, alignItems: 'center', gap: 2 },
  tripsStatVal: {
    fontFamily: FontFamily.bold, fontSize: 26, color: '#0F172A',
    letterSpacing: -0.6, lineHeight: 30,
  },
  tripsStatLbl: { fontFamily: FontFamily.regular, fontSize: 11.5, color: '#64748B' },
  tripsStatDiv: { width: 1, height: 36, backgroundColor: '#E2E8F0' },

  /* Active Trip */
  activeTripHead: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  activeTripNum: {
    fontFamily: FontFamily.semiBold, fontSize: 13.5, color: '#0F172A', letterSpacing: -0.1,
  },
  activeTripBadge: {
    backgroundColor: '#DCFCE7',
    borderRadius: 99,
    paddingHorizontal: 9, paddingVertical: 3,
    borderWidth: 1, borderColor: '#86EFAC',
  },
  activeTripBadgeTxt: {
    fontFamily: FontFamily.semiBold, fontSize: 10.5, color: '#15803D', letterSpacing: 0.2,
  },
  activeTripBody: {
    flexDirection: 'row', gap: 12, alignItems: 'flex-start',
  },
  tripAddrRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  tripAddrDot: { width: 8, height: 8, borderRadius: 4, marginTop: 4 },
  tripAddrLbl: { fontFamily: FontFamily.medium, fontSize: 10.5, color: '#64748B', letterSpacing: 0.4, textTransform: 'uppercase' as const },
  tripAddrTxt: { fontFamily: FontFamily.medium, fontSize: 12.5, color: '#0F172A', lineHeight: 17, marginTop: 1 },
  tripEtaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  tripEtaTxt: { fontFamily: FontFamily.regular, fontSize: 11.5, color: '#64748B' },
  miniMap: {
    width: 140, height: 140,
    borderRadius: 8, overflow: 'hidden' as const,
    borderWidth: 1, borderColor: '#E2E8F0',
  },

  /* Live Tracking */
  trackingRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingTop: 4 },
  trackingStep: { flex: 1, alignItems: 'center', gap: 6 },
  trackingChip: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5, borderColor: '#E2E8F0',
    alignItems: 'center', justifyContent: 'center',
  },
  trackingChipTxt: {
    fontFamily: FontFamily.semiBold, fontSize: 12, color: '#94A3B8',
  },
  trackingLbl: {
    fontFamily: FontFamily.regular, fontSize: 10.5, color: '#94A3B8',
    textAlign: 'center', maxWidth: 70,
  },
  liveUpdated: { fontFamily: FontFamily.regular, fontSize: 11, color: '#16A34A' },

  /* Earnings */
  earnVal: {
    fontFamily: FontFamily.bold, fontSize: 28, color: '#0F172A',
    letterSpacing: -0.7, lineHeight: 32,
  },
  earnTrendRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  earnTrendTxt: { fontFamily: FontFamily.semiBold, fontSize: 12 },
  earnTrendSub: { fontFamily: FontFamily.regular, fontSize: 11.5, color: '#94A3B8' },
  sparkRow: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 6,
    height: 40, marginTop: 6,
  },
  sparkBar: {
    flex: 1, minWidth: 8, borderRadius: 2,
  },

  /* Info footer */
  infoFooter: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1, borderTopColor: '#E2E8F0',
  },
  infoFooterDot: {
    width: 7, height: 7, borderRadius: 4,
    backgroundColor: '#CBD5E1',
  },
  infoFooterDotOn: { backgroundColor: '#16A34A' },
  infoFooterTxt: { fontFamily: FontFamily.medium, fontSize: 12, color: '#64748B', letterSpacing: 0.05 },
});
