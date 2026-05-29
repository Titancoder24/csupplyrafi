/**
 * SupportListScreen — shared list view used by all roles.
 *
 * Layout:
 *   ─ Top bar (back + title)
 *   ─ Header block (subtitle + "Create ticket" CTA)
 *   ─ Filter tabs (All / Open / In Review / Closed / High Priority)
 *   ─ Ticket list (or empty state)
 *
 * Style: Linear/Notion Inbox — minimal cards, no decoration.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, ScrollView,
  ActivityIndicator, RefreshControl, SafeAreaView, StatusBar,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { ArrowLeft, LifeBuoy, Inbox } from 'lucide-react-native';
import { useAuth } from '@/services/auth/AuthProvider';
import {
  listTickets, type Ticket, type TicketStatus, type TicketPriority,
} from '@/services/support/tickets';
import { TicketCard } from '@/components/support/TicketCard';
import { FilterTabs, type FilterTab } from '@/components/support/FilterTabs';
import { SupportTheme as T } from '@/components/support/theme';

type FilterKey = 'all' | TicketStatus | 'high_priority';

export function SupportListScreen({
  basePath, isAdmin = false, title = 'Support',
}: {
  basePath: string;      // e.g. "/customer/support"
  isAdmin?: boolean;
  title?: string;
}) {
  const router = useRouter();
  const { profile } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterKey>('all');

  const fetch = useCallback(async () => {
    try {
      const rows = await listTickets({});
      setTickets(rows);
    } catch {
      setTickets([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);
  useFocusEffect(useCallback(() => { fetch(); }, [fetch]));

  const filtered = useMemo(() => {
    if (filter === 'all')           return tickets;
    if (filter === 'high_priority') return tickets.filter(t => t.priority === 'high' || t.priority === 'critical');
    return tickets.filter(t => t.status === filter);
  }, [tickets, filter]);

  const counts = useMemo(() => ({
    all:           tickets.length,
    open:          tickets.filter(t => t.status === 'open').length,
    in_review:     tickets.filter(t => t.status === 'in_review').length,
    closed:        tickets.filter(t => t.status === 'closed' || t.status === 'resolved').length,
    high_priority: tickets.filter(t => t.priority === 'high' || t.priority === 'critical').length,
  }), [tickets]);

  const tabs: FilterTab[] = [
    { key: 'all',           label: 'All',           count: counts.all },
    { key: 'open',          label: 'Open',          count: counts.open },
    { key: 'in_review',     label: 'In Review',     count: counts.in_review },
    { key: 'closed',        label: 'Closed',        count: counts.closed },
    { key: 'high_priority', label: 'High Priority', count: counts.high_priority },
  ];

  const handleCreate = () => router.push(`${basePath}/new` as never);
  const handleOpen   = (id: string) => router.push(`${basePath}/${id}` as never);

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor={T.bg} />

      <SafeAreaView style={{ flex: 1 }}>
        {/* Top bar */}
        <View style={s.topBar}>
          <Pressable onPress={() => router.back()} hitSlop={10} style={s.backBtn}>
            <ArrowLeft size={18} color="#0F172A" strokeWidth={1.75} />
          </Pressable>
          <Text style={s.title}>{title}</Text>
          <View style={{ width: 38 }} />
        </View>

        <ScrollView
          contentContainerStyle={s.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetch(); }}
              tintColor={T.textMuted}
            />
          }
        >
          {/* Header */}
          <View style={s.header}>
            <View style={{ flex: 1 }}>
              <Text style={s.eyebrow}>{isAdmin ? 'SUPPORT DESK' : 'YOUR TICKETS'}</Text>
              <Text style={s.subhead}>
                {isAdmin
                  ? 'All tickets across customers, vendors and transporters.'
                  : 'Track and respond to your support requests.'}
              </Text>
            </View>
            {!isAdmin && (
              <Pressable
                onPress={handleCreate}
                style={({ pressed }) => [s.cta, pressed && { opacity: 0.92 }]}
              >
                <LifeBuoy size={15} color="#FFFFFF" strokeWidth={2} />
                <Text style={s.ctaTxt}>New ticket</Text>
              </Pressable>
            )}
          </View>

          {/* Filters */}
          <View style={s.filterRow}>
            <FilterTabs tabs={tabs} value={filter} onChange={(k) => setFilter(k as FilterKey)} />
          </View>

          {/* List */}
          {loading ? (
            <View style={s.loading}>
              <ActivityIndicator color={T.textMuted} />
            </View>
          ) : filtered.length === 0 ? (
            <EmptyState filter={filter} />
          ) : (
            <View style={s.list}>
              {filtered.map(t => (
                <TicketCard
                  key={t.id}
                  ticket={t}
                  onPress={() => handleOpen(t.id)}
                  showRequester={isAdmin}
                />
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function EmptyState({ filter }: { filter: FilterKey }) {
  const isAll = filter === 'all';
  return (
    <View style={s.empty}>
      <View style={s.emptyIcon}>
        <Inbox size={20} color="#0F172A" strokeWidth={1.5} />
      </View>
      <Text style={s.emptyTitle}>
        {isAll ? 'No tickets yet' : 'Nothing matches this filter'}
      </Text>
      <Text style={s.emptyBody}>
        {isAll
          ? 'When you raise a support request, it will appear here with a real-time status from our team.'
          : 'Try a different filter or create a new ticket.'}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },

  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 14, paddingBottom: 12,
    backgroundColor: T.bg,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 10,
    borderWidth: 1, borderColor: T.border,
    backgroundColor: T.card,
    alignItems: 'center', justifyContent: 'center',
  },
  title: {
    fontFamily: T.font.semiBold,
    fontSize: 16, color: T.ink,
    letterSpacing: -0.2,
  },

  scroll: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 64 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    gap: 14, marginBottom: 22,
  },
  eyebrow: {
    fontFamily: T.font.semiBold,
    fontSize: 10.5, color: T.textFaint,
    letterSpacing: 1.6, marginBottom: 6,
  },
  subhead: {
    fontFamily: T.font.regular,
    fontSize: 13.5, color: T.textMuted,
    lineHeight: 20,
  },
  cta: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: T.ink,
  },
  ctaTxt: {
    fontFamily: T.font.semiBold, fontSize: 13, color: '#FFFFFF',
    letterSpacing: -0.1,
  },

  filterRow: { marginBottom: 14 },

  list: { gap: 10 },

  loading: { paddingVertical: 60, alignItems: 'center' },

  empty: {
    alignItems: 'center',
    paddingVertical: 56, paddingHorizontal: 24,
    gap: 10,
  },
  emptyIcon: {
    width: 44, height: 44, borderRadius: 12,
    borderWidth: 1, borderColor: T.border,
    backgroundColor: T.card,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 6,
  },
  emptyTitle: {
    fontFamily: T.font.semiBold,
    fontSize: 15, color: T.ink,
    letterSpacing: -0.2,
  },
  emptyBody: {
    fontFamily: T.font.regular,
    fontSize: 13, color: T.textMuted,
    textAlign: 'center', lineHeight: 19,
    maxWidth: 320, marginBottom: 8,
  },
  emptyCta: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    paddingHorizontal: 16, paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: T.ink,
    marginTop: 4,
  },
  emptyCtaTxt: {
    fontFamily: T.font.semiBold, fontSize: 13, color: '#FFFFFF',
    letterSpacing: -0.1,
  },
});
