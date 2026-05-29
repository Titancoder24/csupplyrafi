import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet, SafeAreaView, StatusBar, Platform,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  IndianRupee, TrendingUp, Package2, ChevronRight, Calendar, ArrowUpRight,
} from 'lucide-react-native';
import { supabase } from '@/services/supabase';
import { useAuth } from '@/services/auth/AuthProvider';
import { FontFamily, Shadow } from '@/constants/theme';

/* ─── Palette (matches dashboard) ─────────────────────────────────────────── */
const ORANGE     = '#F97316';
const ORANGE_DK  = '#EA580C';
const CREAM      = '#FAF7F3';
const SURFACE    = '#FFFFFF';
const BORDER     = '#EDE6DC';
const HAIRLINE   = '#F4ECE0';
const INK_900    = '#0F172A';
const INK_700    = '#334155';
const INK_500    = '#64748B';
const INK_400    = '#94A3B8';
const GREEN      = '#15803D';
const GREEN_BG   = '#F0FDF4';

type Payout = {
  id:            string;
  order_number:  string;
  customer_name: string | null;
  total_amount:  number;
  delivered_at:  string;
  item_count:    number;
};

function fmtINR(n: number) {
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(2)}Cr`;
  if (n >= 100_000)    return `₹${(n / 100_000).toFixed(2)}L`;
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
}

export default function VendorEarnings() {
  const router = useRouter();
  const { profile } = useAuth();

  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [payouts,    setPayouts]    = useState<Payout[]>([]);
  const [totals,     setTotals]     = useState({
    lifetime: 0,
    month:    0,
    today:    0,
    ordersThisMonth: 0,
    avgOrder: 0,
  });

  const load = useCallback(async () => {
    if (!profile?.id) return;
    setLoading(true);
    const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);

    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`id, order_number, total_amount, delivered_at,
                 customer:profiles!orders_customer_id_fkey(full_name),
                 order_items(quantity)`)
        .eq('vendor_id', profile.id)
        .eq('status', 'delivered')
        .not('delivered_at', 'is', null)
        .order('delivered_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      const rows = (data ?? []) as any[];
      let lifetime = 0;
      let month = 0;
      let today = 0;
      let ordersThisMonth = 0;
      const monthMs = monthStart.getTime();
      const todayMs = todayStart.getTime();

      const list: Payout[] = rows.map(r => {
        const amt = r.total_amount ?? 0;
        const dAt = r.delivered_at as string;
        const t   = new Date(dAt).getTime();
        lifetime += amt;
        if (t >= monthMs) { month += amt; ordersThisMonth++; }
        if (t >= todayMs) { today += amt; }
        return {
          id:            r.id,
          order_number:  r.order_number,
          customer_name: r.customer?.full_name ?? null,
          total_amount:  amt,
          delivered_at:  dAt,
          item_count:    (r.order_items ?? []).reduce((s: number, i: any) => s + (i.quantity ?? 0), 0),
        };
      });

      setPayouts(list);
      setTotals({
        lifetime, month, today,
        ordersThisMonth,
        avgOrder: ordersThisMonth > 0 ? month / ordersThisMonth : 0,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [profile?.id]);

  useEffect(() => {
    load();
    if (!profile?.id) return;
    const suffix = Math.random().toString(36).slice(2, 10);
    const ch = supabase.channel(`vendor-earnings-rt:${profile.id}:${suffix}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `vendor_id=eq.${profile.id}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [profile?.id, load]);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={ORANGE_DK} />

      {/* Gradient header with total lifetime earnings */}
      <SafeAreaView style={s.headerArea}>
        <LinearGradient
          colors={[ORANGE, ORANGE_DK]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={s.headerInner}>
          <Text style={s.headerTitle}>Earnings</Text>
          <Text style={s.headerEyebrow}>LIFETIME PAYOUT</Text>
          <Text style={s.headerAmount}>{fmtINR(totals.lifetime)}</Text>
          <View style={s.headerRow}>
            <View style={s.headerChip}>
              <Calendar size={11} color="#FFFFFF" strokeWidth={2.2} />
              <Text style={s.headerChipTxt}>
                {totals.ordersThisMonth} {totals.ordersThisMonth === 1 ? 'order' : 'orders'} this month
              </Text>
            </View>
            <View style={s.headerChip}>
              <ArrowUpRight size={11} color="#FFFFFF" strokeWidth={2.4} />
              <Text style={s.headerChipTxt}>Avg {fmtINR(totals.avgOrder)} / order</Text>
            </View>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView
        style={s.body}
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ORANGE_DK} />}
      >
        {/* Period summary */}
        <View style={s.summaryRow}>
          <SummaryTile label="Today"      value={fmtINR(totals.today)} accent={GREEN}    tint={GREEN_BG}   Icon={TrendingUp} />
          <SummaryTile label="This Month" value={fmtINR(totals.month)} accent={ORANGE_DK} tint="#FFF7ED"    Icon={IndianRupee} />
        </View>

        {/* Per-order payouts */}
        <View style={s.section}>
          <View style={s.sectionHead}>
            <Text style={s.sectionEyebrow}>PAYOUTS</Text>
            <Text style={s.sectionTitle}>Recent delivered orders</Text>
          </View>

          <View style={s.list}>
            {loading ? (
              <View style={s.center}><ActivityIndicator color={ORANGE_DK} /></View>
            ) : payouts.length === 0 ? (
              <View style={s.empty}>
                <View style={s.emptyIcon}>
                  <Package2 size={22} color="#0F172A" strokeWidth={1.6} />
                </View>
                <Text style={s.emptyTitle}>No payouts yet</Text>
                <Text style={s.emptyTxt}>Earnings appear here once orders are marked delivered.</Text>
              </View>
            ) : payouts.map((p, i) => {
              const orderShort = p.order_number.replace(/^CS/, '').slice(-5);
              const customer   = p.customer_name ?? `Customer #${orderShort}`;
              return (
                <Pressable
                  key={p.id}
                  onPress={() => router.push(`/vendor/orders?id=${p.id}` as never)}
                  style={({ pressed }) => [
                    s.row,
                    i < payouts.length - 1 && s.rowDivider,
                    pressed && { backgroundColor: HAIRLINE },
                  ]}
                >
                  <View style={s.amountWrap}>
                    <Text style={s.amount}>{fmtINR(p.total_amount)}</Text>
                  </View>
                  <View style={{ flex: 1, gap: 3 }}>
                    <Text style={s.rowTitle} numberOfLines={1}>{customer}</Text>
                    <Text style={s.rowSub} numberOfLines={1}>
                      #{orderShort} · {p.item_count} {p.item_count === 1 ? 'item' : 'items'}
                    </Text>
                    <Text style={s.rowMeta}>
                      Delivered · {fmtDate(p.delivered_at)} · {fmtTime(p.delivered_at)}
                    </Text>
                  </View>
                  <ChevronRight size={15} color="#0F172A" strokeWidth={2} />
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={{ height: 12 }} />
      </ScrollView>
    </View>
  );
}

/* ─── Summary tile ────────────────────────────────────────────────────────── */
function SummaryTile({ label, value, accent, tint, Icon }: {
  label: string; value: string; accent: string; tint: string;
  Icon: typeof IndianRupee;
}) {
  return (
    <View style={st.tile}>
      <View style={[st.iconBox, { backgroundColor: tint }]}>
        <Icon size={12} color="#0F172A" strokeWidth={2} />
      </View>
      <Text style={[st.value, { color: accent }]} numberOfLines={1}>{value}</Text>
      <Text style={st.label}>{label}</Text>
    </View>
  );
}
const st = StyleSheet.create({
  tile: {
    flex: 1,
    backgroundColor: SURFACE,
    borderRadius: 14,
    borderWidth: 1, borderColor: BORDER,
    paddingVertical: 14, paddingHorizontal: 14,
    gap: 2,
    ...Shadow.sm,
  },
  iconBox: {
    width: 24, height: 24, borderRadius: 7,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 6,
  },
  value: { fontFamily: FontFamily.bold, fontSize: 19, letterSpacing: -0.4 },
  label: { fontFamily: FontFamily.medium, fontSize: 11.5, color: INK_500, marginTop: 4 },
});

/* ─── Styles ──────────────────────────────────────────────────────────────── */
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: CREAM },

  /* Header */
  headerArea: { backgroundColor: ORANGE, paddingBottom: 28 },
  headerInner: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'web' ? 14 : 8,
    paddingBottom: 4,
    gap: 4,
  },
  headerTitle: { fontFamily: FontFamily.semiBold, fontSize: 19, color: '#fff', letterSpacing: -0.3 },
  headerEyebrow: { fontFamily: FontFamily.medium, fontSize: 10, color: 'rgba(255,255,255,0.78)', letterSpacing: 1.6, marginTop: 12 },
  headerAmount:  { fontFamily: FontFamily.bold, fontSize: 36, color: '#fff', letterSpacing: -1.2, marginTop: 2, lineHeight: 42 },
  headerRow: { flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' },
  headerChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)',
    borderRadius: 99, paddingHorizontal: 10, paddingVertical: 5,
  },
  headerChipTxt: { fontFamily: FontFamily.medium, fontSize: 11, color: '#fff', letterSpacing: 0.1 },

  /* Body */
  body: {
    flex: 1, backgroundColor: CREAM,
    borderTopLeftRadius: 22, borderTopRightRadius: 22,
    marginTop: -20,
  },
  scroll: { padding: 14, paddingTop: 18, gap: 18, paddingBottom: 28 },

  /* Period summary */
  summaryRow: { flexDirection: 'row', gap: 10 },

  /* Section */
  section: { gap: 10 },
  sectionHead: { paddingHorizontal: 2, gap: 4 },
  sectionEyebrow: { fontFamily: FontFamily.medium, fontSize: 10, color: ORANGE_DK, letterSpacing: 1.6 },
  sectionTitle:   { fontFamily: FontFamily.semiBold, fontSize: 16, color: INK_900, letterSpacing: -0.2 },

  /* List */
  list: {
    backgroundColor: SURFACE,
    borderRadius: 14,
    borderWidth: 1, borderColor: BORDER,
    ...Shadow.sm,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 14 },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: HAIRLINE },
  amountWrap: {
    minWidth: 78, paddingHorizontal: 12, paddingVertical: 8,
    backgroundColor: GREEN_BG, borderRadius: 10,
    borderWidth: 1, borderColor: '#BBF7D0',
    alignItems: 'center',
  },
  amount:    { fontFamily: FontFamily.bold, fontSize: 13.5, color: GREEN, letterSpacing: -0.2 },
  rowTitle:  { fontFamily: FontFamily.semiBold, fontSize: 13.5, color: INK_900, letterSpacing: -0.1 },
  rowSub:    { fontFamily: FontFamily.regular,  fontSize: 12, color: INK_700 },
  rowMeta:   { fontFamily: FontFamily.regular,  fontSize: 10.5, color: INK_400, letterSpacing: 0.1, marginTop: 1 },

  /* Empty / loading */
  center: { padding: 40, alignItems: 'center' },
  empty:  { padding: 36, alignItems: 'center', gap: 6 },
  emptyIcon: {
    width: 46, height: 46, borderRadius: 14,
    backgroundColor: HAIRLINE, alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  emptyTitle: { fontFamily: FontFamily.semiBold, fontSize: 14, color: INK_700, letterSpacing: -0.1 },
  emptyTxt:   { fontFamily: FontFamily.regular,  fontSize: 12, lineHeight: 17, color: INK_500, textAlign: 'center' },
});
