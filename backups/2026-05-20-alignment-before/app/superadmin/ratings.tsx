import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, TextInput, ActivityIndicator,
} from 'react-native';
import { Star, Search, User, Truck } from 'lucide-react-native';
import { Colors, FontFamily, Radius, Shadow, Semantic, Ink } from '@/constants/theme';
import { supabase } from '@/services/supabase';

type Review = {
  id: string;
  order_id: string;
  order_number?: string;
  reviewer_id: string;
  reviewer_role: string;
  reviewer_name: string;
  reviewee_id: string;
  reviewee_name: string;
  rating: number;
  comment: string | null;
  created_at: string;
};

const FILTERS = ['all', 'customer', 'transporter'] as const;
type FilterKey = typeof FILTERS[number];

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function rolePill(role: string): { fg: string; bg: string; label: string } {
  if (role === 'customer')    return { fg: Semantic.successFg, bg: Semantic.successBg, label: 'Customer' };
  if (role === 'transporter') return { fg: '#C2410C',           bg: '#FFF7ED',          label: 'Transporter' };
  return { fg: Ink[500], bg: Ink[100], label: role };
}

export default function RatingsScreen() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [filter, setFilter]   = useState<FilterKey>('all');

  useEffect(() => {
    fetchReviews();
    const channel = supabase
      .channel('sa-ratings-rt')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'transport_reviews' }, () => fetchReviews())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  async function fetchReviews() {
    setLoading(true);
    const { data } = await supabase
      .from('transport_reviews')
      .select('id, order_id, reviewer_id, reviewer_role, reviewee_id, rating, comment, created_at')
      .order('created_at', { ascending: false })
      .limit(300);

    const list = (data ?? []) as any[];
    if (list.length === 0) { setReviews([]); setLoading(false); return; }

    // Fetch profiles + orders in parallel
    const userIds = new Set<string>();
    const orderIds = new Set<string>();
    for (const r of list) {
      userIds.add(r.reviewer_id);
      userIds.add(r.reviewee_id);
      orderIds.add(r.order_id);
    }
    const [{ data: profiles }, { data: orders }] = await Promise.all([
      supabase.from('profiles').select('id, full_name').in('id', Array.from(userIds)),
      supabase.from('orders').select('id, order_number').in('id', Array.from(orderIds)),
    ]);
    const pmap: Record<string, string> = {};
    for (const p of profiles ?? []) pmap[p.id] = p.full_name ?? '—';
    const omap: Record<string, string> = {};
    for (const o of orders ?? []) omap[o.id] = o.order_number;

    setReviews(list.map(r => ({
      id:             r.id,
      order_id:       r.order_id,
      order_number:   omap[r.order_id],
      reviewer_id:    r.reviewer_id,
      reviewer_role:  r.reviewer_role,
      reviewer_name:  pmap[r.reviewer_id] ?? '—',
      reviewee_id:    r.reviewee_id,
      reviewee_name:  pmap[r.reviewee_id] ?? '—',
      rating:         r.rating,
      comment:        r.comment,
      created_at:     r.created_at,
    })));
    setLoading(false);
  }

  const filtered = reviews.filter(r => {
    if (filter !== 'all' && r.reviewer_role !== filter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return r.reviewer_name?.toLowerCase().includes(q)
        || r.reviewee_name?.toLowerCase().includes(q)
        || r.order_number?.toLowerCase().includes(q)
        || r.comment?.toLowerCase().includes(q);
  });

  // Aggregate stats
  const fromCustomers = reviews.filter(r => r.reviewer_role === 'customer');
  const fromTransporters = reviews.filter(r => r.reviewer_role === 'transporter');
  const avgFromCustomers   = fromCustomers.length ? (fromCustomers.reduce((s, r) => s + r.rating, 0) / fromCustomers.length).toFixed(2) : '—';
  const avgFromTransporters = fromTransporters.length ? (fromTransporters.reduce((s, r) => s + r.rating, 0) / fromTransporters.length).toFixed(2) : '—';

  return (
    <ScrollView style={s.root} contentContainerStyle={s.scroll}>
      {/* Stats strip */}
      <View style={s.statRow}>
        <View style={[s.statCard, { borderLeftColor: Semantic.successFg }]}>
          <Text style={s.statLabel}>Avg from customers</Text>
          <View style={s.statValRow}>
            <Text style={s.statVal}>{avgFromCustomers}</Text>
            <Star size={16} color="#0F172A" fill="#0F172A" strokeWidth={1.5} />
          </View>
          <Text style={s.statSub}>{fromCustomers.length} review{fromCustomers.length === 1 ? '' : 's'}</Text>
        </View>
        <View style={[s.statCard, { borderLeftColor: '#C2410C' }]}>
          <Text style={s.statLabel}>Avg from transporters</Text>
          <View style={s.statValRow}>
            <Text style={s.statVal}>{avgFromTransporters}</Text>
            <Star size={16} color="#0F172A" fill="#0F172A" strokeWidth={1.5} />
          </View>
          <Text style={s.statSub}>{fromTransporters.length} review{fromTransporters.length === 1 ? '' : 's'}</Text>
        </View>
        <View style={[s.statCard, { borderLeftColor: Colors.primary }]}>
          <Text style={s.statLabel}>Total ratings</Text>
          <Text style={s.statVal}>{reviews.length}</Text>
          <Text style={s.statSub}>All time</Text>
        </View>
      </View>

      {/* Filter chips */}
      <View style={s.filterRow}>
        {FILTERS.map(f => (
          <Pressable
            key={f}
            style={[s.chip, filter === f && s.chipActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[s.chipTxt, filter === f && s.chipTxtActive]}>
              {f === 'all' ? 'All Ratings' : f === 'customer' ? 'By Customers' : 'By Transporters'}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Search */}
      <View style={s.searchBox}>
        <Search size={16} color="#0F172A" />
        <TextInput
          style={s.searchInput}
          placeholder="Search by reviewer, reviewee, order or comment..."
          placeholderTextColor={Colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
        <Text style={s.count}>{filtered.length} {filtered.length === 1 ? 'review' : 'reviews'}</Text>
      </View>

      {/* List */}
      {loading ? (
        <View style={s.loader}><ActivityIndicator size="large" color={Colors.primary} /></View>
      ) : filtered.length === 0 ? (
        <View style={s.empty}>
          <View style={s.emptyIconBox}>
            <Star size={28} color="#0F172A" strokeWidth={1.5} />
          </View>
          <Text style={s.emptyTitle}>No ratings yet</Text>
          <Text style={s.emptyText}>Ratings will appear here as customers and transporters review each other.</Text>
        </View>
      ) : (
        <View style={{ gap: 10 }}>
          {filtered.map(r => {
            const reviewerPill = rolePill(r.reviewer_role);
            const RIcon = r.reviewer_role === 'transporter' ? Truck : User;
            return (
              <View key={r.id} style={s.card}>
                <View style={s.cardTop}>
                  <View style={s.who}>
                    <View style={[s.avatar, { backgroundColor: reviewerPill.bg }]}>
                      <RIcon size={16} color={reviewerPill.fg} strokeWidth={2} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.reviewerName} numberOfLines={1}>{r.reviewer_name}</Text>
                      <View style={s.reviewerMeta}>
                        <View style={[s.miniPill, { backgroundColor: reviewerPill.bg }]}>
                          <Text style={[s.miniPillTxt, { color: reviewerPill.fg }]}>{reviewerPill.label}</Text>
                        </View>
                        <Text style={s.metaSep}>·</Text>
                        <Text style={s.metaTxt}>rated</Text>
                        <Text style={[s.metaTxt, { color: Ink[800], fontFamily: FontFamily.semiBold }]}>{r.reviewee_name}</Text>
                      </View>
                    </View>
                    <View style={s.starsRow}>
                      {[1, 2, 3, 4, 5].map(n => (
                        <Star
                          key={n}
                          size={14}
                          color="#0F172A"
                          fill={n <= r.rating ? '#0F172A' : 'transparent'}
                          strokeWidth={1.5}
                        />
                      ))}
                    </View>
                  </View>
                </View>

                {r.comment ? (
                  <View style={s.comment}>
                    <Text style={s.commentTxt}>“{r.comment}”</Text>
                  </View>
                ) : null}

                <View style={s.cardBottom}>
                  <Text style={s.orderRef}>Order #{r.order_number ?? r.order_id.slice(0, 8)}</Text>
                  <Text style={s.dateTxt}>{fmtDate(r.created_at)}</Text>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: Ink[100] },
  scroll: { padding: 24, gap: 16, paddingBottom: 40 },

  /* Stats */
  statRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statCard: {
    flex: 1, minWidth: 180,
    backgroundColor: Colors.white, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.border, borderLeftWidth: 3,
    padding: 14, gap: 4,
    ...Shadow.sm,
  },
  statLabel: { fontFamily: FontFamily.regular, fontSize: 11, color: Colors.textMuted, textTransform: 'uppercase' as const, letterSpacing: 0.4 },
  statValRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statVal:   { fontFamily: FontFamily.bold, fontSize: 22, color: Ink[900], letterSpacing: -0.4 },
  statSub:   { fontFamily: FontFamily.regular, fontSize: 11, color: Colors.textMuted },

  /* Filter chips */
  filterRow: { flexDirection: 'row', gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: Radius.full, backgroundColor: Colors.white,
    borderWidth: 1, borderColor: Colors.border,
  },
  chipActive:    { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipTxt:       { fontFamily: FontFamily.semiBold, fontSize: 12, color: Colors.textSecondary },
  chipTxtActive: { color: Colors.white },

  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.white, borderRadius: Radius.md,
    paddingHorizontal: 14, height: 44,
    borderWidth: 1, borderColor: Colors.border, ...Shadow.sm,
  },
  searchInput: { flex: 1, fontFamily: FontFamily.regular, fontSize: 14, color: Colors.textPrimary, ...(({ outlineStyle: 'none' }) as any) },
  count:       { fontFamily: FontFamily.semiBold, fontSize: 12, color: Colors.textMuted },

  /* Card */
  card: {
    backgroundColor: Colors.white, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.border,
    padding: 14, gap: 10,
    ...Shadow.card,
  },
  cardTop:  {},
  who:      { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar:   {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  reviewerName: { fontFamily: FontFamily.bold, fontSize: 13.5, color: Ink[900] },
  reviewerMeta: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2, flexWrap: 'wrap' },
  miniPill:     { paddingHorizontal: 7, paddingVertical: 2, borderRadius: Radius.full },
  miniPillTxt:  { fontFamily: FontFamily.semiBold, fontSize: 10 },
  metaSep:      { fontFamily: FontFamily.regular, fontSize: 11, color: Colors.textMuted },
  metaTxt:      { fontFamily: FontFamily.regular, fontSize: 11, color: Colors.textMuted },
  starsRow:     { flexDirection: 'row', alignItems: 'center', gap: 2 },

  comment: {
    backgroundColor: Ink[50], borderRadius: Radius.sm,
    padding: 10, borderLeftWidth: 3, borderLeftColor: Ink[200],
  },
  commentTxt: { fontFamily: FontFamily.regular, fontSize: 13, color: Ink[700], lineHeight: 19, fontStyle: 'italic' as const },

  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderRef:   { fontFamily: FontFamily.semiBold, fontSize: 11, color: Colors.primary },
  dateTxt:    { fontFamily: FontFamily.regular, fontSize: 11, color: Colors.textMuted },

  loader: { padding: 60, alignItems: 'center' },
  empty: {
    padding: 40, alignItems: 'center', gap: 8,
    backgroundColor: Colors.white, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.border,
  },
  emptyIconBox: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: Ink[50], borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  emptyTitle: { fontFamily: FontFamily.bold, fontSize: 14, color: Ink[900] },
  emptyText:  { fontFamily: FontFamily.regular, fontSize: 12, color: Colors.textMuted, textAlign: 'center', maxWidth: 320 },
});
