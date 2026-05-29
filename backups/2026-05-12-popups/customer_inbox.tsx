import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator,
  Platform, StatusBar, RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Truck, MessageCircle, ChevronRight, Inbox as InboxIcon } from 'lucide-react-native';
import { supabase } from '@/services/supabase';
import { useAuth } from '@/services/auth/AuthProvider';
import { FontFamily } from '@/constants/theme';

const BG      = '#F8FAFC';
const SURFACE = '#FFFFFF';
const BORDER  = '#E2E8F0';
const TEXT    = '#0F172A';
const MUTED   = '#64748B';
const HINT    = '#94A3B8';
const PRIMARY = '#1D4ED8';

type Thread = {
  order_id: string;
  order_number: string;
  status: string;
  transporter_name: string;
  last_message: string;
  last_sender_role: string;
  last_at: string;
  unread: number;
};

function relativeTime(iso: string) {
  const t = new Date(iso).getTime();
  const diff = Date.now() - t;
  if (diff < 60_000)          return 'just now';
  if (diff < 3_600_000)       return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000)      return `${Math.floor(diff / 3_600_000)}h ago`;
  if (diff < 7 * 86_400_000)  return `${Math.floor(diff / 86_400_000)}d ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export default function InboxScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [threads,    setThreads]    = useState<Thread[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!user?.id) return;
    if (!silent) setLoading(true);

    // 1. Fetch my orders that have a transporter assigned OR linked transport_request
    const { data: orders } = await supabase
      .from('orders')
      .select('id, order_number, status, transporter_id')
      .eq('customer_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (!orders || orders.length === 0) { setThreads([]); setLoading(false); return; }

    const orderIds = orders.map(o => o.id);

    // 2. Get messages for those orders
    const { data: msgs } = await supabase
      .from('order_messages')
      .select('order_id, sender_id, sender_role, content, created_at')
      .in('order_id', orderIds)
      .order('created_at', { ascending: false });

    // 3. Resolve transporter names (from orders.transporter_id OR transport_requests.assigned_transporter_id)
    const transporterIds = new Set<string>();
    for (const o of orders) if (o.transporter_id) transporterIds.add(o.transporter_id);

    // Also check transport_requests for orders without direct transporter_id
    const ordersWithoutTransporter = orders.filter(o => !o.transporter_id).map(o => o.id);
    let trMap: Record<string, string> = {};
    if (ordersWithoutTransporter.length > 0) {
      const { data: trs } = await supabase
        .from('transport_requests')
        .select('order_id, assigned_transporter_id')
        .in('order_id', ordersWithoutTransporter)
        .not('assigned_transporter_id', 'is', null);
      for (const tr of trs ?? []) {
        if (tr.assigned_transporter_id) {
          trMap[tr.order_id] = tr.assigned_transporter_id;
          transporterIds.add(tr.assigned_transporter_id);
        }
      }
    }

    // Fetch transporter profiles
    const profilesMap: Record<string, string> = {};
    if (transporterIds.size > 0) {
      const { data: profs } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', Array.from(transporterIds));
      for (const p of profs ?? []) profilesMap[p.id] = p.full_name ?? 'Transporter';
    }

    // 4. Build threads from latest message per order
    const seen = new Set<string>();
    const result: Thread[] = [];
    for (const m of msgs ?? []) {
      if (seen.has(m.order_id)) continue;
      seen.add(m.order_id);
      const order = orders.find(o => o.id === m.order_id);
      if (!order) continue;
      const transporterId = order.transporter_id ?? trMap[order.id];
      const name = transporterId ? (profilesMap[transporterId] ?? 'Transporter') : 'Transporter';
      result.push({
        order_id: order.id,
        order_number: order.order_number,
        status: order.status,
        transporter_name: name,
        last_message: m.content,
        last_sender_role: m.sender_role,
        last_at: m.created_at,
        unread: 0, // TODO: track read receipts
      });
    }

    setThreads(result);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    load();
    if (!user?.id) return;
    const ch = supabase
      .channel('customer-inbox-rt')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'order_messages' },
        () => load(true))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load, user?.id]);

  const onRefresh = async () => { setRefreshing(true); await load(true); setRefreshing(false); };

  function openThread(t: Thread) {
    router.push({
      pathname: '/customer/chat',
      params: { orderId: t.order_id, transporterName: t.transporter_name },
    } as never);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: SURFACE }} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={SURFACE} />

      {/* Header */}
      <View style={s.header}>
        <View style={s.headerIcon}>
          <InboxIcon size={20} color={PRIMARY} strokeWidth={2} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Inbox</Text>
          <Text style={s.headerSub}>
            {threads.length === 0
              ? 'No conversations yet'
              : `${threads.length} conversation${threads.length === 1 ? '' : 's'}`}
          </Text>
        </View>
      </View>

      {loading ? (
        <View style={s.loadingBox}>
          <ActivityIndicator color={PRIMARY} size="large" />
        </View>
      ) : threads.length === 0 ? (
        <View style={s.emptyBox}>
          <View style={s.emptyIcon}>
            <MessageCircle size={36} color={HINT} strokeWidth={1.5} />
          </View>
          <Text style={s.emptyTitle}>No messages yet</Text>
          <Text style={s.emptySub}>
            When a transporter is assigned to your order, your chat with them will appear here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={threads}
          keyExtractor={t => t.order_id}
          contentContainerStyle={{ paddingBottom: 80 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ItemSeparatorComponent={() => <View style={s.sep} />}
          renderItem={({ item }) => {
            const isMe = item.last_sender_role === 'customer';
            return (
              <Pressable
                style={({ pressed }) => [s.row, pressed && { backgroundColor: BG }]}
                onPress={() => openThread(item)}
              >
                <View style={s.avatar}>
                  <Truck size={20} color="#fff" strokeWidth={2} />
                </View>

                <View style={{ flex: 1, gap: 4 }}>
                  <View style={s.rowTop}>
                    <Text style={s.name} numberOfLines={1}>{item.transporter_name}</Text>
                    <Text style={s.time}>{relativeTime(item.last_at)}</Text>
                  </View>
                  <View style={s.rowMid}>
                    <Text style={s.orderRef}>#{item.order_number}</Text>
                    <View style={s.dot} />
                    <Text style={s.statusTxt}>{item.status.replace(/_/g, ' ')}</Text>
                  </View>
                  <Text style={s.preview} numberOfLines={1}>
                    {isMe ? 'You: ' : ''}{item.last_message}
                  </Text>
                </View>

                <ChevronRight size={18} color={HINT} strokeWidth={2} />
              </Pressable>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: BORDER, backgroundColor: SURFACE,
  },
  headerIcon: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontFamily: FontFamily.bold, fontSize: 19, color: TEXT, letterSpacing: -0.3 },
  headerSub:   { fontFamily: FontFamily.regular, fontSize: 12, color: MUTED, marginTop: 1 },

  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  emptyBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 10 },
  emptyIcon: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: BG, borderWidth: 1, borderColor: BORDER,
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  emptyTitle: { fontFamily: FontFamily.bold, fontSize: 17, color: TEXT },
  emptySub:   { fontFamily: FontFamily.regular, fontSize: 13, color: MUTED, textAlign: 'center', maxWidth: 280, lineHeight: 19 },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 14, backgroundColor: SURFACE,
  },
  avatar: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: PRIMARY,
    alignItems: 'center', justifyContent: 'center',
  },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  name:   { fontFamily: FontFamily.bold, fontSize: 14, color: TEXT, flex: 1 },
  time:   { fontFamily: FontFamily.regular, fontSize: 11, color: HINT },
  rowMid: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  orderRef:  { fontFamily: FontFamily.semiBold, fontSize: 11, color: PRIMARY },
  dot:       { width: 3, height: 3, borderRadius: 1.5, backgroundColor: HINT },
  statusTxt: { fontFamily: FontFamily.regular, fontSize: 11, color: MUTED, textTransform: 'capitalize' },
  preview:   { fontFamily: FontFamily.regular, fontSize: 13, color: MUTED, marginTop: 2 },

  sep: { height: 1, backgroundColor: BORDER, marginLeft: 72 },
});
