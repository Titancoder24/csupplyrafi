import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ArrowLeft, Bell, Truck, CheckCircle2, AlertCircle,
  Package, Inbox as InboxIcon, Star,
} from 'lucide-react-native';
import { FontFamily, Semantic, Ink } from '@/constants/theme';
import { useNotifications, AppNotification } from '@/hooks/useNotifications';

const BG      = '#F8FAFC';
const SURFACE = '#FFFFFF';
const BORDER  = '#E2E8F0';
const TEXT    = '#0F172A';
const MUTED   = '#64748B';
const HINT    = '#94A3B8';
const PRIMARY = '#1A5C30'; // transporter green
const PT      = Platform.OS === 'ios' ? 56 : Platform.OS === 'web' ? 0 : 36;

function iconFor(type: string): { Icon: any; color: string; bg: string } {
  if (type === 'new_order' || type === 'new_delivery_job')
    return { Icon: Truck,         color: PRIMARY,            bg: '#DCFCE7' };
  if (type === 'order_status')
    return { Icon: Package,       color: '#1D4ED8',          bg: '#EFF6FF' };
  if (type === 'transport_accepted' || type === 'order_delivered' || type === 'order_accepted')
    return { Icon: CheckCircle2,  color: Semantic.successFg, bg: Semantic.successBg };
  if (type === 'rating')
    return { Icon: Star,          color: '#F59E0B',          bg: '#FFFBEB' };
  if (type === 'order_rejected')
    return { Icon: AlertCircle,   color: Semantic.dangerFg,  bg: Semantic.dangerBg };
  return { Icon: Bell,            color: HINT,               bg: Ink[100] };
}

function relativeTime(iso: string) {
  const t = new Date(iso).getTime();
  const diff = Date.now() - t;
  if (diff < 60_000)          return 'just now';
  if (diff < 3_600_000)       return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000)      return `${Math.floor(diff / 3_600_000)}h ago`;
  if (diff < 7 * 86_400_000)  return `${Math.floor(diff / 86_400_000)}d ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export default function TransporterNotifications() {
  const router = useRouter();
  const { notifications, unreadCount, loading, markRead, markAllRead } = useNotifications();

  return (
    <View style={s.root}>
      <View style={[s.header, { paddingTop: PT > 0 ? PT : 14 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={s.backBtn}>
          <ArrowLeft size={20} color="#0F172A" strokeWidth={2} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Notifications</Text>
          <Text style={s.headerSub}>
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
          </Text>
        </View>
        {unreadCount > 0 && (
          <Pressable onPress={markAllRead} style={s.markAllBtn}>
            <Text style={s.markAllTxt}>Mark all read</Text>
          </Pressable>
        )}
      </View>

      {loading ? (
        <View style={s.loadingBox}>
          <ActivityIndicator color={PRIMARY} size="large" />
        </View>
      ) : notifications.length === 0 ? (
        <View style={s.emptyBox}>
          <View style={s.emptyIconBox}>
            <InboxIcon size={32} color="#0F172A" strokeWidth={1.5} />
          </View>
          <Text style={s.emptyTitle}>You're all caught up</Text>
          <Text style={s.emptySub}>
            New delivery jobs, ratings, and platform updates will appear here in real-time.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          {notifications.map((n: AppNotification) => {
            const it = iconFor(n.type);
            const Icon = it.Icon;
            return (
              <Pressable
                key={n.id}
                style={[s.card, !n.read && s.cardUnread]}
                onPress={() => !n.read && markRead(n.id)}
              >
                <View style={[s.iconBox, { backgroundColor: it.bg }]}>
                  <Icon size={18} color="#0F172A" strokeWidth={2} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <View style={s.titleRow}>
                    <Text style={s.title} numberOfLines={1}>{n.title}</Text>
                    {!n.read && <View style={s.unreadDot} />}
                  </View>
                  {n.body ? <Text style={s.body} numberOfLines={3}>{n.body}</Text> : null}
                  <Text style={s.time}>{relativeTime(n.created_at)}</Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 14, paddingBottom: 14,
    backgroundColor: SURFACE, borderBottomWidth: 1, borderBottomColor: BORDER,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: BG, alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontFamily: FontFamily.bold, fontSize: 17, color: TEXT },
  headerSub:   { fontFamily: FontFamily.regular, fontSize: 11, color: MUTED, marginTop: 1 },
  markAllBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: '#DCFCE7' },
  markAllTxt: { fontFamily: FontFamily.semiBold, fontSize: 12, color: PRIMARY },

  scroll: { padding: 14, gap: 10, paddingBottom: 32 },
  card: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: SURFACE, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: BORDER,
  },
  cardUnread: { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' },

  iconBox: {
    width: 38, height: 38, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title:    { fontFamily: FontFamily.bold, fontSize: 14, color: TEXT, flex: 1 },
  body:     { fontFamily: FontFamily.regular, fontSize: 13, color: MUTED, lineHeight: 18 },
  time:     { fontFamily: FontFamily.regular, fontSize: 11, color: HINT, marginTop: 4 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: PRIMARY },

  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyBox:   { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 10 },
  emptyIconBox: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: SURFACE, borderWidth: 1, borderColor: BORDER,
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  emptyTitle: { fontFamily: FontFamily.bold, fontSize: 17, color: TEXT },
  emptySub:   { fontFamily: FontFamily.regular, fontSize: 13, color: MUTED, textAlign: 'center', maxWidth: 280, lineHeight: 19 },
});
