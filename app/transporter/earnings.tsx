import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Platform, SafeAreaView, StatusBar, ActivityIndicator,
} from 'react-native';
import { IndianRupee, TrendingUp, TrendingDown, Calendar } from 'lucide-react-native';
import { supabase } from '@/services/supabase';
import { useAuth } from '@/services/auth/AuthProvider';
import { FontFamily, Shadow } from '@/constants/theme';
import { LineChart, LinePoint } from '@/components/ui/charts/LineChart';

const HEADER = '#1A5C30';

function fmtINR(n: number) {
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)}L`;
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
}

type Buckets = {
  today: number;
  yesterday: number;
  thisWeek: number;
  thisMonth: number;
  lastMonth: number;
  allTime: number;
};

export default function TransporterEarnings() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [b, setB] = useState<Buckets>({ today: 0, yesterday: 0, thisWeek: 0, thisMonth: 0, lastMonth: 0, allTime: 0 });
  const [trend, setTrend] = useState<LinePoint[]>([]);

  const fetchAll = useCallback(async () => {
    if (!profile?.id) return;
    setLoading(true);

    try {
      const now = new Date();
      const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
      const yestStart  = new Date(todayStart); yestStart.setDate(yestStart.getDate() - 1);
      const weekStart  = new Date(todayStart); weekStart.setDate(weekStart.getDate() - 6);
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const sixMonthsBack  = new Date(now.getFullYear(), now.getMonth() - 5, 1);

      const { data, error } = await supabase
        .from('orders')
        .select('total_amount, delivered_at')
        .eq('transporter_id', profile.id)
        .eq('status', 'delivered')
        .order('delivered_at', { ascending: false });

      if (error) throw error;

      const rows = (data ?? []) as { total_amount: number | null; delivered_at: string | null }[];

      let today = 0, yesterday = 0, thisWeek = 0, thisMonth = 0, lastMonth = 0, allTime = 0;
      const monthly = new Map<string, number>();

      for (const r of rows) {
        if (!r.delivered_at) continue;
        const d = new Date(r.delivered_at);
        const earned = (r.total_amount ?? 0) * 0.08;
        allTime += earned;
        if (d >= todayStart) today += earned;
        else if (d >= yestStart && d < todayStart) yesterday += earned;
        if (d >= weekStart) thisWeek += earned;
        if (d >= monthStart) thisMonth += earned;
        else if (d >= lastMonthStart && d < monthStart) lastMonth += earned;

        if (d >= sixMonthsBack) {
          const key = `${d.getFullYear()}-${d.getMonth()}`;
          monthly.set(key, (monthly.get(key) ?? 0) + earned);
        }
      }

      setB({ today, yesterday, thisWeek, thisMonth, lastMonth, allTime });

      // Last 6 months for the chart
      const points: LinePoint[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        points.push({
          label: d.toLocaleDateString('en-IN', { month: 'short' }),
          value: Math.round(monthly.get(key) ?? 0),
        });
      }
      setTrend(points);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [profile?.id]);

  useEffect(() => {
    fetchAll();
    if (!profile?.id) return;
    const suffix = Math.random().toString(36).slice(2, 10);
    const ch = supabase.channel(`tp-earnings:${profile.id}:${suffix}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `transporter_id=eq.${profile.id}` }, () => fetchAll())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [profile?.id, fetchAll]);

  const todayTrend = b.yesterday > 0 ? Math.round(((b.today - b.yesterday) / b.yesterday) * 1000) / 10 : null;
  const monthTrend = b.lastMonth > 0 ? Math.round(((b.thisMonth - b.lastMonth) / b.lastMonth) * 1000) / 10 : null;

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={HEADER} />

      <SafeAreaView style={s.header}>
        <View style={s.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.headerLbl}>Total Earnings</Text>
            <Text style={s.headerVal}>{loading ? '—' : fmtINR(b.allTime)}</Text>
          </View>
          <View style={s.headerIconBox}>
            <IndianRupee size={20} color="#FFFFFF" strokeWidth={1.75} />
          </View>
        </View>
        <Text style={s.headerSub}>8% per delivered order · auto-credited</Text>
      </SafeAreaView>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Buckets grid */}
        <Text style={s.sectionTitle}>Snapshot</Text>
        <View style={s.gridRow}>
          <View style={s.bucket}>
            <Text style={s.bucketLbl}>Today</Text>
            <Text style={s.bucketVal}>{fmtINR(b.today)}</Text>
            {todayTrend !== null ? <TrendChip pct={todayTrend} suffix="vs yesterday" /> : <Text style={s.bucketSub}>vs yesterday —</Text>}
          </View>
          <View style={s.bucket}>
            <Text style={s.bucketLbl}>This Week</Text>
            <Text style={s.bucketVal}>{fmtINR(b.thisWeek)}</Text>
            <Text style={s.bucketSub}>last 7 days</Text>
          </View>
        </View>
        <View style={s.gridRow}>
          <View style={s.bucket}>
            <Text style={s.bucketLbl}>This Month</Text>
            <Text style={s.bucketVal}>{fmtINR(b.thisMonth)}</Text>
            {monthTrend !== null ? <TrendChip pct={monthTrend} suffix="vs last month" /> : <Text style={s.bucketSub}>vs last month —</Text>}
          </View>
          <View style={s.bucket}>
            <Text style={s.bucketLbl}>Last Month</Text>
            <Text style={s.bucketVal}>{fmtINR(b.lastMonth)}</Text>
            <Text style={s.bucketSub}>previous cycle</Text>
          </View>
        </View>

        {/* Trend chart */}
        <View style={s.chartCard}>
          <View style={s.chartHead}>
            <View style={{ flex: 1 }}>
              <Text style={s.chartTitle}>Last 6 months</Text>
              <Text style={s.chartSub}>Monthly earnings trend</Text>
            </View>
            <View style={s.rangeChip}>
              <Calendar size={11} color="#0F172A" strokeWidth={1.75} />
              <Text style={s.rangeChipTxt}>6M</Text>
            </View>
          </View>
          {loading ? (
            <View style={s.chartEmpty}><ActivityIndicator color={HEADER} size="small" /></View>
          ) : trend.some(p => p.value > 0) ? (
            <LineChart data={trend} height={200} color={HEADER} />
          ) : (
            <View style={s.chartEmpty}>
              <Text style={s.emptyTxt}>No earnings in the last 6 months</Text>
            </View>
          )}
        </View>

        <View style={{ height: 12 }} />
      </ScrollView>
    </View>
  );
}

function TrendChip({ pct, suffix }: { pct: number; suffix: string }) {
  const up = pct >= 0;
  return (
    <View style={s.trendRow}>
      {up ? <TrendingUp size={11} color="#0F172A" strokeWidth={2} /> : <TrendingDown size={11} color="#0F172A" strokeWidth={2} />}
      <Text style={[s.trendTxt, { color: up ? '#15803D' : '#DC2626' }]}>{up ? '+' : ''}{pct}%</Text>
      <Text style={s.bucketSub}>{suffix}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAFC' },

  header: { backgroundColor: HEADER, paddingLeft: 32, paddingRight: 28, paddingTop: Platform.OS === 'web' ? 26 : 22, paddingBottom: 24 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerLbl: { fontFamily: FontFamily.regular, fontSize: 11.5, color: 'rgba(255,255,255,0.78)', letterSpacing: 0.1 },
  headerVal: { fontFamily: FontFamily.bold, fontSize: 30, color: '#fff', letterSpacing: -0.6, lineHeight: 34, marginTop: 2 },
  headerSub: { fontFamily: FontFamily.regular, fontSize: 11.5, color: 'rgba(255,255,255,0.72)', marginTop: 6 },
  headerIconBox: {
    width: 40, height: 40, borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center', justifyContent: 'center',
  },

  scroll: { padding: 16, gap: 12 },
  sectionTitle: { fontFamily: FontFamily.semiBold, fontSize: 13, color: '#0F172A', letterSpacing: -0.05, marginBottom: 2 },

  gridRow: { flexDirection: 'row', gap: 10 },
  bucket: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1, borderColor: '#E2E8F0',
    padding: 14, gap: 5,
    ...Shadow.sm,
  },
  bucketLbl: { fontFamily: FontFamily.medium, fontSize: 12, color: '#64748B' },
  bucketVal: { fontFamily: FontFamily.bold, fontSize: 22, color: '#0F172A', letterSpacing: -0.5, lineHeight: 26 },
  bucketSub: { fontFamily: FontFamily.regular, fontSize: 11, color: '#94A3B8' },
  trendRow:  { flexDirection: 'row', alignItems: 'center', gap: 4 },
  trendTxt:  { fontFamily: FontFamily.semiBold, fontSize: 11 },

  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0',
    padding: 14, gap: 8,
    ...Shadow.sm,
  },
  chartHead: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  chartTitle: { fontFamily: FontFamily.semiBold, fontSize: 13.5, color: '#0F172A' },
  chartSub: { fontFamily: FontFamily.regular, fontSize: 11, color: '#94A3B8', marginTop: 1 },
  rangeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 99, backgroundColor: '#F1F5F9',
  },
  rangeChipTxt: { fontFamily: FontFamily.semiBold, fontSize: 10.5, color: '#475569' },
  chartEmpty: { paddingVertical: 40, alignItems: 'center' },
  emptyTxt: { fontFamily: FontFamily.regular, fontSize: 12, color: '#94A3B8' },
});
