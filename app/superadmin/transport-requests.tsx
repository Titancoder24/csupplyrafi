import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, TextInput, ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { Search, CheckCircle, XCircle, MapPin, Truck, Phone } from 'lucide-react-native';
import { Colors, FontFamily, Radius, Shadow, Semantic, Ink } from '@/constants/theme';
import { supabase } from '@/services/supabase';

type TransportRequest = {
  id: string;
  requester_name?: string;
  requester_phone?: string;
  requester_role: string;
  pickup_address: string;
  dropoff_address: string;
  distance_km: number | null;
  weight_kg: number | null;
  vehicle_class: string;
  offered_price: number | null;
  status: string;
  created_at: string;
};

const STATUS_TABS = ['pending_approval', 'open', 'accepted', 'completed', 'rejected', 'all'];

function statusPill(s: string): { fg: string; bg: string } {
  if (s === 'pending_approval') return { fg: Semantic.warningFg, bg: Semantic.warningBg };
  if (s === 'open')             return { fg: Semantic.infoFg,    bg: Semantic.infoBg };
  if (s === 'accepted')         return { fg: Semantic.successFg, bg: Semantic.successBg };
  if (s === 'in_progress')      return { fg: Semantic.purpleFg,  bg: Semantic.purpleBg };
  if (s === 'rejected')         return { fg: Semantic.dangerFg,  bg: Semantic.dangerBg };
  return { fg: Ink[500], bg: Ink[100] };
}

function statusLabel(s: string) {
  const map: Record<string, string> = {
    pending_approval: 'Pending Approval',
    open:             'Open',
    accepted:         'Accepted',
    in_progress:      'In Progress',
    completed:        'Completed',
    rejected:         'Rejected',
    cancelled:        'Cancelled',
  };
  return map[s] ?? s;
}

function vehicleIcon(v: string) {
  const m: Record<string, string> = { mini: '🚐', medium: '🚛', heavy: '🚚', x_heavy: '🏗️' };
  return m[v] ?? '🚛';
}

export default function TransportRequestsScreen() {
  const { width } = useWindowDimensions();
  const isNarrow = width < 700;

  const [requests, setRequests] = useState<TransportRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('pending_approval');
  const [acting, setActing] = useState<string | null>(null);

  useEffect(() => {
    fetchRequests();

    const channel = supabase
      .channel('sa-transport-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transport_requests' }, () => fetchRequests())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [tab]);

  async function fetchRequests() {
    setLoading(true);
    try {
      let q = supabase
        .from('transport_requests')
        .select('id, requester_role, pickup_address, dropoff_address, distance_km, weight_kg, vehicle_class, offered_price, status, created_at, profiles!requester_id(full_name, phone)')
        .order('created_at', { ascending: false })
        .limit(200);
      if (tab !== 'all') q = q.eq('status', tab);
      const { data, error } = await q;
      if (error) throw error;
      setRequests((data ?? []).map((d: any) => ({
        id: d.id,
        requester_name:  d.profiles?.full_name,
        requester_phone: d.profiles?.phone,
        requester_role:  d.requester_role,
        pickup_address:  d.pickup_address,
        dropoff_address: d.dropoff_address,
        distance_km:     d.distance_km,
        weight_kg:       d.weight_kg,
        vehicle_class:   d.vehicle_class,
        offered_price:   d.offered_price,
        status:          d.status,
        created_at:      d.created_at,
      })));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function approveRequest(id: string) {
    setActing(id);
    await supabase.rpc('admin_approve_transport_request', { p_request_id: id });
    setRequests(v => v.filter(r => r.id !== id));
    setActing(null);
  }

  async function rejectRequest(id: string) {
    setActing(id);
    await supabase.rpc('admin_reject_transport_request', { p_request_id: id });
    setRequests(v => v.filter(r => r.id !== id));
    setActing(null);
  }

  const filtered = requests.filter(r =>
    r.requester_name?.toLowerCase().includes(search.toLowerCase()) ||
    r.requester_phone?.includes(search) ||
    r.pickup_address?.toLowerCase().includes(search.toLowerCase()) ||
    r.dropoff_address?.toLowerCase().includes(search.toLowerCase())
  );

  const showActions = tab === 'pending_approval';

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.scroll}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.tabs}>
          {STATUS_TABS.map(t => (
            <Pressable key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
              <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
                {t === 'all' ? 'All' : statusLabel(t)}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <View style={styles.searchBox}>
        <Search size={16} color="#0F172A" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by requester or address..."
          placeholderTextColor={Colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
        <Text style={styles.count}>{filtered.length} requests</Text>
      </View>

      {loading ? (
        <View style={styles.loader}><ActivityIndicator color={Colors.primary} /></View>
      ) : filtered.length === 0 ? (
        <View style={styles.empty}>
          <Truck size={32} color="#0F172A" strokeWidth={1.5} />
          <Text style={styles.emptyText}>No {statusLabel(tab)} transport requests</Text>
        </View>
      ) : (
        <View style={styles.cards}>
          {filtered.map(r => (
            <View key={r.id} style={styles.card}>
              {/* Header row */}
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  <Text style={styles.requesterName}>{r.requester_name || 'Unknown'}</Text>
                  <View style={styles.roleChip}>
                    <Text style={styles.roleChipText}>{r.requester_role}</Text>
                  </View>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  {(() => {
                    const p = statusPill(r.status);
                    return (
                      <Text style={[styles.statusPill, { color: p.fg, backgroundColor: p.bg }]}>
                        {statusLabel(r.status)}
                      </Text>
                    );
                  })()}
                  <Text style={styles.dateText}>
                    {r.created_at ? new Date(r.created_at).toLocaleDateString('en-IN') : '—'}
                  </Text>
                </View>
              </View>

              {/* Route */}
              <View style={styles.route}>
                <View style={styles.routeRow}>
                  <MapPin size={13} color="#0F172A" strokeWidth={2} />
                  <Text style={styles.routeText} numberOfLines={1}>{r.pickup_address}</Text>
                </View>
                <View style={styles.routeDivider} />
                <View style={styles.routeRow}>
                  <MapPin size={13} color="#0F172A" strokeWidth={2} />
                  <Text style={styles.routeText} numberOfLines={1}>{r.dropoff_address}</Text>
                </View>
              </View>

              {/* Meta chips */}
              <View style={styles.chips}>
                <View style={styles.chip}>
                  <Text style={styles.chipText}>{vehicleIcon(r.vehicle_class)} {r.vehicle_class?.replace('_', ' ')}</Text>
                </View>
                {r.distance_km != null && (
                  <View style={styles.chip}>
                    <Text style={styles.chipText}>📍 {r.distance_km} km</Text>
                  </View>
                )}
                {r.weight_kg != null && (
                  <View style={styles.chip}>
                    <Text style={styles.chipText}>⚖️ {r.weight_kg} kg</Text>
                  </View>
                )}
                {r.offered_price != null && (
                  <View style={[styles.chip, styles.priceChip]}>
                    <Text style={styles.priceChipText}>₹{r.offered_price.toLocaleString('en-IN')}</Text>
                  </View>
                )}
              </View>

              {/* Phone */}
              {r.requester_phone && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Phone size={12} color="#0F172A" strokeWidth={2} />
                  <Text style={styles.phone}>{r.requester_phone}</Text>
                </View>
              )}

              {/* Actions */}
              {showActions && (
                <View style={[styles.actionRow, isNarrow && { flexDirection: 'column' }]}>
                  <Pressable
                    style={[styles.actionBtn, styles.approveBtn, acting === r.id && { opacity: 0.6 }]}
                    onPress={() => approveRequest(r.id)}
                    disabled={acting === r.id}
                  >
                    {acting === r.id
                      ? <ActivityIndicator size="small" color="#fff" />
                      : <><CheckCircle size={15} color="#FFFFFF" /><Text style={styles.actionBtnText}>Approve</Text></>}
                  </Pressable>
                  <Pressable
                    style={[styles.actionBtn, styles.rejectBtn, acting === r.id && { opacity: 0.6 }]}
                    onPress={() => rejectRequest(r.id)}
                    disabled={acting === r.id}
                  >
                    <XCircle size={15} color="#FFFFFF" />
                    <Text style={styles.actionBtnText}>Reject</Text>
                  </Pressable>
                </View>
              )}
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F1F5F9' },
  scroll: { padding: 24, gap: 16 },
  tabs: { flexDirection: 'row', gap: 8 },
  tab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: Radius.full, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border },
  tabActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  tabText: { fontFamily: FontFamily.semiBold, fontSize: 12, color: Colors.textSecondary },
  tabTextActive: { color: Colors.white },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.white, borderRadius: Radius.md, paddingHorizontal: 14, height: 42, borderWidth: 1, borderColor: Colors.border, ...Shadow.sm },
  searchInput: { flex: 1, fontFamily: FontFamily.regular, fontSize: 14, color: Colors.textPrimary },
  count: { fontFamily: FontFamily.semiBold, fontSize: 12, color: Colors.textMuted },
  loader: { padding: 60, alignItems: 'center' },
  empty: { padding: 60, alignItems: 'center', gap: 12 },
  emptyText: { fontFamily: FontFamily.regular, fontSize: 14, color: Colors.textMuted },
  cards: { gap: 12 },
  card: { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: 16, gap: 12, ...Shadow.card },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  requesterName: { fontFamily: FontFamily.semiBold, fontSize: 14, color: Colors.textPrimary },
  roleChip: { backgroundColor: Colors.primary + '18', borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 2 },
  roleChipText: { fontFamily: FontFamily.semiBold, fontSize: 10, color: Colors.primary, textTransform: 'capitalize' },
  statusPill: { fontFamily: FontFamily.semiBold, fontSize: 10, paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full, textTransform: 'capitalize' },
  dateText: { fontFamily: FontFamily.regular, fontSize: 11, color: Colors.textMuted },
  route: { gap: 6 },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  routeText: { flex: 1, fontFamily: FontFamily.regular, fontSize: 12, color: Colors.textSecondary },
  routeDivider: { height: 1, backgroundColor: Colors.border, marginLeft: 19 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { backgroundColor: Colors.muted, borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 4 },
  chipText: { fontFamily: FontFamily.medium, fontSize: 11, color: Colors.textSecondary },
  priceChip: { backgroundColor: Colors.green + '18' },
  priceChipText: { fontFamily: FontFamily.bold, fontSize: 12, color: Colors.green },
  phone: { fontFamily: FontFamily.regular, fontSize: 12, color: Colors.textSecondary },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: Radius.md },
  approveBtn: { backgroundColor: Semantic.successFg },
  rejectBtn:  { backgroundColor: Semantic.dangerFg },
  actionBtnText: { fontFamily: FontFamily.bold, fontSize: 13, color: Colors.white },
});
