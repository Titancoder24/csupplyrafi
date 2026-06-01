import React, { useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, ScrollView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Bell, Package, Truck, CheckCircle2, Clock, AlertCircle } from 'lucide-react-native';
import { FontFamily } from '@/constants/theme';

const BG      = '#F8FAFC';
const SURFACE = '#FFFFFF';
const BORDER  = '#E2E8F0';
const TEXT    = '#0F172A';
const TEXTSUB = '#334155';
const MUTED   = '#64748B';
const PRIMARY = '#1D4ED8';
const GREEN   = '#15803D';
const PT      = Platform.OS === 'ios' ? 56 : Platform.OS === 'web' ? 0 : 36;

type NType = 'order' | 'delivery' | 'status' | 'alert';

const NOTIFS: Array<{
  id: string; type: NType; title: string; body: string; when: string; read: boolean;
}> = [
  { id: '1', type: 'order',    title: 'Order Confirmed',     body: 'Order #CS123456789 has been placed. Waiting for vendor review.',          when: 'Just now',   read: false },
  { id: '2', type: 'status',   title: 'Vendor Accepted',      body: 'Sri Balaji Building Materials accepted your order and is preparing it.',  when: '5 min ago',  read: false },
  { id: '3', type: 'delivery', title: 'Vehicle Assigned',     body: 'A 6-wheeler (TN 38 AB 1234) has been assigned and is heading to pickup.', when: '18 min ago', read: true  },
  { id: '4', type: 'delivery', title: 'Out for Delivery',     body: 'Your order is on the way! Expected by 4 PM today.',                       when: '1 hr ago',   read: true  },
  { id: '5', type: 'order',    title: 'Order Delivered',      body: 'Order #CS987654321 was delivered successfully. Rate your experience.',    when: 'Yesterday',  read: true  },
  { id: '6', type: 'alert',    title: 'Price Drop Alert',     body: 'OPC Cement prices dropped by 8% — reorder now for your next project.',    when: '2 days ago', read: true  },
];

const ICON_MAP: Record<NType, { Icon: any; color: string; bg: string }> = {
  order:    { Icon: Package,      color: PRIMARY, bg: '#EFF6FF' },
  delivery: { Icon: Truck,        color: '#7C3AED', bg: '#F5F3FF' },
  status:   { Icon: CheckCircle2, color: GREEN,   bg: '#F0FDF4' },
  alert:    { Icon: AlertCircle,  color: '#D97706', bg: '#FFFBEB' },
};

export default function Notifications() {
  const router = useRouter();
  const [items, setItems] = useState(NOTIFS);

  const unreadCount = items.filter(n => !n.read).length;

  const markAllRead = () => setItems(prev => prev.map(n => ({ ...n, read: true })));

  return (
    <View style={s.root}>
      <View style={[s.header, { paddingTop: PT > 0 ? PT : 14 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={s.backBtn}>
          <ArrowLeft size={20} color="#0F172A" strokeWidth={2} />
        </Pressable>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>Notifications</Text>
          {unreadCount > 0 && (
            <View style={s.badge}><Text style={s.badgeTxt}>{unreadCount}</Text></View>
          )}
        </View>
        {unreadCount > 0 ? (
          <Pressable onPress={markAllRead} style={s.markBtn} hitSlop={8}>
            <Text style={s.markTxt}>Mark read</Text>
          </Pressable>
        ) : (
          <View style={{ width: 72 }} />
        )}
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {items.map((notif, idx) => {
          const { Icon, color, bg } = ICON_MAP[notif.type];
          return (
            <Pressable
              key={notif.id}
              style={[s.card, !notif.read && s.cardUnread]}
              onPress={() => setItems(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n))}
            >
              <View style={[s.iconBox, { backgroundColor: bg }]}>
                <Icon size={18} color={color} strokeWidth={2} />
              </View>
              <View style={s.body}>
                <View style={s.bodyTop}>
                  <Text style={[s.title, !notif.read && s.titleBold]} numberOfLines={1}>
                    {notif.title}
                  </Text>
                  {!notif.read && <View style={s.unreadDot} />}
                </View>
                <Text style={s.bodyTxt} numberOfLines={2}>{notif.body}</Text>
                <View style={s.timeRow}>
                  <Clock size={11} color={MUTED} strokeWidth={2} />
                  <Text style={s.time}>{notif.when}</Text>
                </View>
              </View>
            </Pressable>
          );
        })}

        {items.length === 0 && (
          <View style={s.empty}>
            <View style={s.emptyBox}>
              <Bell size={36} color={PRIMARY} strokeWidth={1.4} />
            </View>
            <Text style={s.emptyTitle}>No notifications</Text>
            <Text style={s.emptySub}>We'll notify you when something needs your attention.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingBottom: 14,
    backgroundColor: SURFACE, borderBottomWidth: 1, borderBottomColor: BORDER,
    /* Subtler modern header shadow */
    shadowColor: TEXT, shadowOpacity: 0.02, shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  backBtn: { 
    width: 36, height: 36, borderRadius: 18, 
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  headerTitle:  { fontFamily: FontFamily.bold, fontSize: 16, color: TEXT, letterSpacing: -0.2 },
  badge: {
    backgroundColor: '#EF4444', borderRadius: 99,
    paddingHorizontal: 7, paddingVertical: 2, minWidth: 18, 
    alignItems: 'center', justifyContent: 'center',
  },
  badgeTxt: { fontFamily: FontFamily.bold, fontSize: 9.5, color: SURFACE, lineHeight: 11 },
  markBtn: { 
    width: 72, paddingVertical: 6, borderRadius: 8, 
    backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center',
  },
  markTxt: { fontFamily: FontFamily.semiBold, fontSize: 11.5, color: PRIMARY },

  scroll: { padding: 16, gap: 12, paddingBottom: 32 },

  card: {
    flexDirection: 'row', gap: 12,
    backgroundColor: SURFACE, borderRadius: 14, borderWidth: 1, borderColor: BORDER, padding: 14,
    shadowColor: TEXT, shadowOpacity: 0.02, shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 }, elevation: 1,
  },
  cardUnread: { 
    backgroundColor: '#F5F9FF', 
    borderColor: '#BFDBFE',
  },

  iconBox: { width: 42, height: 42, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },

  body:    { flex: 1, gap: 4 },
  bodyTop: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title:   { flex: 1, fontFamily: FontFamily.semiBold, fontSize: 14, color: TEXT, lineHeight: 18, letterSpacing: -0.1 },
  titleBold: { fontFamily: FontFamily.bold, color: '#0F172A' },
  unreadDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: PRIMARY },
  bodyTxt: { fontFamily: FontFamily.regular, fontSize: 12.5, color: TEXTSUB, lineHeight: 18 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  time:    { fontFamily: FontFamily.regular, fontSize: 11, color: MUTED },

  empty: { alignItems: 'center', paddingTop: 80, gap: 16 },
  emptyBox: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontFamily: FontFamily.bold, fontSize: 16, color: TEXT, letterSpacing: -0.2 },
  emptySub: { fontFamily: FontFamily.regular, fontSize: 13, color: MUTED, textAlign: 'center', paddingHorizontal: 32, lineHeight: 18 },
});
