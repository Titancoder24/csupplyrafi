import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator,
  SafeAreaView, StatusBar, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft, Bell, Truck, CheckCircle2, AlertCircle,
  ShoppingCart, AlertTriangle, XCircle, Inbox as InboxIcon,
  type LucideIcon,
} from 'lucide-react-native';
import { FontFamily } from '@/constants/theme';
import { useNotifications, type AppNotification } from '@/hooks/useNotifications';

/* ─── Shared palette (matches Dashboard / Orders / Inventory) ─────────────── */
const ORANGE_TOP = '#FF6B00';
const ORANGE     = '#F97316';
const ORANGE_DK  = '#EA580C';
const CREAM      = '#FAF8F5';
const CARD_TINT  = '#FFFCF8';
const ICON_BG    = '#F6F6F4';     // neutral icon container background (spec)
const SURFACE    = '#FFFFFF';
const BORDER     = '#EAE3D8';
const HAIRLINE   = '#F1EBE0';
const INK_900    = '#0F172A';
const INK_700    = '#334155';
const INK_500    = '#64748B';
const INK_400    = '#94A3B8';
const GREEN      = '#15803D';
const AMBER      = '#D97706';
const RED        = '#DC2626';

type IconStyle = { Icon: LucideIcon; tint: string };

/** Monochrome icon + a subtle type accent color (the icon stroke).
 *  Container is always neutral — spec says no colorful icon boxes. */
function iconFor(type: string): IconStyle {
  if (type === 'new_order' || type === 'order_status')
    return { Icon: ShoppingCart, tint: ORANGE_DK };
  if (type === 'out_of_stock')
    return { Icon: AlertTriangle, tint: RED };
  if (type === 'low_stock')
    return { Icon: AlertCircle, tint: AMBER };
  if (type === 'order_accepted' || type === 'order_delivered')
    return { Icon: CheckCircle2, tint: GREEN };
  if (type === 'order_out_for_delivery' || type === 'transport_accepted')
    return { Icon: Truck, tint: AMBER };
  if (type === 'order_rejected' || type === 'order_cancelled')
    return { Icon: XCircle, tint: RED };
  return { Icon: Bell, tint: INK_500 };
}

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000)         return 'just now';
  if (diff < 3_600_000)      return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000)     return `${Math.floor(diff / 3_600_000)}h ago`;
  if (diff < 7 * 86_400_000) return `${Math.floor(diff / 86_400_000)}d ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

/** Strip emojis + ZWJ + variation selector + keycap from notification
 *  content stored upstream, so the screen stays enterprise-clean regardless
 *  of how a row was inserted (old toast titles, server triggers, etc.). */
const EMOJI_RE = /\p{Extended_Pictographic}/gu;
function cleanText(input?: string | null): string {
  if (!input) return '';
  return input.replace(EMOJI_RE, '').replace(/\s+/g, ' ').trim();
}

export default function VendorNotifications() {
  const router = useRouter();
  const { notifications, unreadCount, loading, markRead, markAllRead } = useNotifications();

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={ORANGE_DK} />

      {/* Compact gradient header with back + Mark all read */}
      <SafeAreaView style={s.headerArea}>
        <LinearGradient
          colors={[ORANGE_TOP, ORANGE]}
          start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={s.headerInner}>
          <Pressable
            onPress={() => router.canGoBack() ? router.back() : router.replace('/vendor/dashboard' as never)}
            style={({ pressed }) => [s.backBtn, pressed && { opacity: 0.8 }]}
            hitSlop={10}
          >
            <ArrowLeft size={18} color="#FFFFFF" strokeWidth={2.2} />
          </Pressable>

          <View style={{ flex: 1 }}>
            <Text style={s.headerTitle}>Notifications</Text>
            <Text style={s.headerSub}>
              {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
            </Text>
          </View>

          {unreadCount > 0 && (
            <Pressable
              onPress={markAllRead}
              style={({ pressed }) => [s.markAllBtn, pressed && { opacity: 0.9 }]}
              hitSlop={6}
            >
              <Text style={s.markAllTxt}>Mark all read</Text>
            </Pressable>
          )}
        </View>
      </SafeAreaView>

      {/* Body */}
      {loading ? (
        <View style={s.center}>
          <ActivityIndicator color={ORANGE_DK} />
        </View>
      ) : notifications.length === 0 ? (
        <EmptyState />
      ) : (
        <ScrollView
          style={s.body}
          contentContainerStyle={s.scroll}
          showsVerticalScrollIndicator={false}
        >
          {notifications.map((n: AppNotification) => {
            const it = iconFor(n.type);
            const Icon = it.Icon;
            return (
              <Pressable
                key={n.id}
                style={({ pressed }) => [s.card, pressed && { opacity: 0.96 }]}
                onPress={() => !n.read && markRead(n.id)}
              >
                <View style={s.iconBox}>
                  <Icon size={18} color="#0F172A" strokeWidth={1.9} />
                </View>

                <View style={{ flex: 1, gap: 3 }}>
                  <View style={s.titleRow}>
                    <Text style={s.title} numberOfLines={2}>{cleanText(n.title)}</Text>
                    {!n.read && <View style={s.unreadDot} />}
                  </View>
                  {n.body ? (
                    <Text style={s.cardBody} numberOfLines={3}>{cleanText(n.body)}</Text>
                  ) : null}
                  <Text style={s.time}>{relativeTime(n.created_at)}</Text>
                </View>
              </Pressable>
            );
          })}

          <View style={{ height: 12 }} />
        </ScrollView>
      )}
    </View>
  );
}

/* ─── Empty state (matches Orders / Inventory pattern) ────────────────────── */
function EmptyState() {
  return (
    <View style={emp.wrap}>
      <View style={emp.iconRing}>
        <InboxIcon size={22} color="#0F172A" strokeWidth={1.6} />
      </View>
      <Text style={emp.title}>You're all caught up</Text>
      <Text style={emp.body}>
        New orders, stock alerts, and platform updates will appear here in real time.
      </Text>
    </View>
  );
}
const emp = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 6 },
  iconRing: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: HAIRLINE,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 8,
  },
  title: { fontFamily: FontFamily.semiBold, fontSize: 14, color: INK_700, letterSpacing: -0.1 },
  body:  { fontFamily: FontFamily.regular, fontSize: 12, lineHeight: 17, color: INK_500, textAlign: 'center', maxWidth: 280 },
});

/* ─── Styles ──────────────────────────────────────────────────────────────── */
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: CREAM },

  /* Header */
  headerArea: { backgroundColor: ORANGE, paddingBottom: 16 },
  headerInner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 14,
    paddingTop: Platform.OS === 'web' ? 12 : 6,
    paddingBottom: 2,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontFamily: FontFamily.bold, fontSize: 21, color: '#fff', letterSpacing: -0.5 },
  headerSub:   { fontFamily: FontFamily.regular, fontSize: 11.5, color: 'rgba(255,255,255,0.80)', letterSpacing: 0.05, marginTop: 2 },
  markAllBtn: {
    backgroundColor: '#fff',
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 10,
  },
  markAllTxt: { fontFamily: FontFamily.semiBold, fontSize: 12, color: ORANGE_DK, letterSpacing: 0.05 },

  /* Body */
  body:   { flex: 1, backgroundColor: CREAM },
  scroll: { padding: 14, paddingTop: 18, gap: 12, paddingBottom: 18 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  /* Notification card */
  card: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: CARD_TINT,
    borderRadius: 14,
    borderWidth: 1, borderColor: BORDER,
    paddingHorizontal: 14, paddingVertical: 13,
    /* layered shadow approximation */
    shadowColor: '#0F172A',
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },

  /* Icon container — neutral surface, monochrome icon with subtle accent */
  iconBox: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: ICON_BG,
    borderWidth: 1, borderColor: HAIRLINE,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },

  /* Title row + unread dot */
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title:    { fontFamily: FontFamily.bold, fontSize: 14, color: INK_900, letterSpacing: -0.2, lineHeight: 19, flex: 1 },
  unreadDot:{
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: ORANGE,
    opacity: 0.8,
  },

  /* Body + timestamp */
  cardBody: { fontFamily: FontFamily.medium, fontSize: 12.5, lineHeight: 18, color: INK_700, letterSpacing: 0.05 },
  time:     { fontFamily: FontFamily.medium, fontSize: 11, color: INK_500, opacity: 0.7, marginTop: 4 },
});
