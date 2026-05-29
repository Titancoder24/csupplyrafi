import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, Pressable, ActivityIndicator,
  StyleSheet, RefreshControl, Modal, TextInput,
  SafeAreaView, StatusBar, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  CheckCircle2, XCircle, Package, Truck, ChevronDown,
  MapPin, Phone, Inbox, type LucideIcon,
} from 'lucide-react-native';
import { supabase } from '@/services/supabase';
import { useAuth } from '@/services/auth/AuthProvider';
import { toast } from '@/services/toast';
import { formatINR } from '@/lib/format';
import { FontFamily } from '@/constants/theme';

/* ─── Palette ─────────────────────────────────────────────────────────────── */
const ORANGE_TOP   = '#FF6B00';
const ORANGE       = '#F97316';
const ORANGE_DK    = '#EA580C';
const CREAM        = '#FAF7F3';
const SURFACE      = '#FFFFFF';
const BORDER       = '#EAE3D8';
const HAIRLINE     = '#F1EBE0';
const INK_900      = '#0F172A';
const INK_700      = '#334155';
const INK_500      = '#64748B';
const INK_400      = '#94A3B8';
const RED          = '#DC2626';
const RED_DARK     = '#B91C1C';

/* Per-tab card surface tints */
const TINT_NEW       = SURFACE;
const TINT_ACTIVE    = '#FFFCF8';
const TINT_DONE      = '#FFFDF9';
const TINT_REJECTED  = '#FFF7F7';

/* Status chip palette (4 categorical groups only) */
const CHIP_DELIVERED = { bg: '#ECFDF3', fg: '#16A34A' };
const CHIP_REJECTED  = { bg: '#FEF2F2', fg: '#DC2626' };
const CHIP_VERIFY    = { bg: '#FFF7ED', fg: '#EA580C' };
const CHIP_PROGRESS  = { bg: '#FFF8E7', fg: '#D97706' };
const CHIP_NEUTRAL   = { bg: '#F1F5F9', fg: '#64748B' };

/* ─── Types ───────────────────────────────────────────────────────────────── */
type OrderItem = {
  id: string; product_name: string; quantity: number; unit: string; unit_price: number; line_total: number;
};
type Order = {
  id: string; order_number: string; status: string; payment_status: string;
  total_amount: number; created_at: string; delivery_date?: string; delivery_slot?: string;
  delivery_mode?: string;
  customer_name?: string; customer_phone?: string;
  delivery_address?: string;
  delivery_lat?: number; delivery_lng?: number;
  items?: OrderItem[];
  transporter_id?: string;
  transporter_name?: string;
  transporter_phone?: string;
};

const TABS = [
  // `placed` is excluded — those orders are awaiting super-admin approval and aren't visible to vendors yet
  { key: 'new',       label: 'New',      statuses: ['vendor_pending'] },
  { key: 'active',    label: 'Active',   statuses: ['vendor_accepted', 'transporter_pending', 'transporter_accepted', 'out_for_pickup', 'pending_admin_pickup_confirmation', 'picked_up', 'in_transit', 'out_for_delivery', 'pending_admin_confirmation'] },
  { key: 'completed', label: 'Done',     statuses: ['delivered'] },
  { key: 'cancelled', label: 'Rejected', statuses: ['vendor_rejected', 'cancelled'] },
] as const;

/* Short labels for the status pill. Mapped to exactly 4 chip styles + neutral. */
type Chip = { label: string; fg: string; bg: string };
const PILL: Record<string, Chip> = {
  placed:                            { label: 'New',          ...CHIP_VERIFY    },
  vendor_pending:                    { label: 'Pending',      ...CHIP_VERIFY    },
  vendor_accepted:                   { label: 'Accepted',     ...CHIP_PROGRESS  },
  transporter_pending:               { label: 'Finding',      ...CHIP_PROGRESS  },
  transporter_accepted:              { label: 'Pickup soon',  ...CHIP_PROGRESS  },
  out_for_pickup:                    { label: 'Out for pkp',  ...CHIP_PROGRESS  },
  pending_admin_pickup_confirmation: { label: 'Verifying',    ...CHIP_VERIFY    },
  picked_up:                         { label: 'Picked up',    ...CHIP_PROGRESS  },
  in_transit:                        { label: 'In transit',   ...CHIP_PROGRESS  },
  out_for_delivery:                  { label: 'Out for del.', ...CHIP_PROGRESS  },
  pending_admin_confirmation:        { label: 'Verifying',    ...CHIP_VERIFY    },
  delivered:                         { label: 'Delivered',    ...CHIP_DELIVERED },
  vendor_rejected:                   { label: 'Rejected',     ...CHIP_REJECTED  },
  cancelled:                         { label: 'Cancelled',    ...CHIP_NEUTRAL   },
};

const LONG_STATUS: Record<string, string> = {
  placed:                            'Awaiting admin approval',
  vendor_pending:                    'New order — action required',
  vendor_accepted:                   'You accepted — awaiting pickup',
  transporter_pending:               'Broadcast to transporters',
  transporter_accepted:              'Taken by transporter',
  out_for_pickup:                    'Transporter heading to you',
  pending_admin_pickup_confirmation: 'Pickup — admin verifying',
  picked_up:                         'Picked up — on the way',
  in_transit:                        'In transit',
  out_for_delivery:                  'Out for delivery',
  pending_admin_confirmation:        'Delivery — admin verifying',
  delivered:                         'Delivered to client',
  vendor_rejected:                   'Rejected by you',
  cancelled:                         'Cancelled',
};

/* ─── Screen ──────────────────────────────────────────────────────────────── */
export default function VendorOrders() {
  const { profile } = useAuth();
  const router = useRouter();

  const [tab,         setTab]         = useState<typeof TABS[number]['key']>('new');
  const [orders,      setOrders]      = useState<Order[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [expandedId,  setExpandedId]  = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [acting,      setActing]      = useState<string | null>(null);

  const activeTab = TABS.find(t => t.key === tab)!;

  useEffect(() => {
    load();
    if (!profile?.id) return;

    const suffix = Math.random().toString(36).slice(2, 10);
    const channel = supabase
      .channel(`vendor-orders-rt:${profile.id}:${suffix}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders', filter: `vendor_id=eq.${profile.id}` },
        (payload) => {
          const order = payload.new as { order_number?: string };
          toast.success(
            'New order received',
            `Order #${order.order_number ?? '—'} is waiting for your acceptance`
          );
          load(true);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders', filter: `vendor_id=eq.${profile.id}` },
        () => load(true)
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [tab, profile?.id]);

  async function load(silent = false) {
    if (!profile?.id) return;
    if (!silent) setLoading(true);
    const { data } = await supabase
      .from('orders')
      .select(`
        id, order_number, status, payment_status, total_amount,
        created_at, delivery_date, delivery_slot, delivery_mode, transporter_id,
        profiles!orders_customer_id_fkey(full_name, phone),
        addresses!orders_delivery_address_id_fkey(line1, city, state, lat, lng),
        order_items(id, product_name, quantity, unit, unit_price, line_total)
      `)
      .eq('vendor_id', profile.id)
      .in('status', activeTab.statuses as unknown as string[])
      .order('created_at', { ascending: false })
      .limit(50);
    setOrders((data ?? []).map((d: any) => ({
      id: d.id,
      order_number: d.order_number,
      status: d.status,
      payment_status: d.payment_status,
      total_amount: d.total_amount,
      created_at: d.created_at,
      delivery_date: d.delivery_date,
      delivery_slot: d.delivery_slot,
      delivery_mode: d.delivery_mode,
      customer_name: d.profiles?.full_name,
      customer_phone: d.profiles?.phone,
      transporter_id: d.transporter_id,
      transporter_name: d.transporter?.full_name,
      transporter_phone: d.transporter?.phone,
      delivery_address: d.addresses
        ? [d.addresses.line1, d.addresses.city, d.addresses.state].filter(Boolean).join(', ')
        : undefined,
      delivery_lat: d.addresses?.lat ?? undefined,
      delivery_lng: d.addresses?.lng ?? undefined,
      items: d.order_items ?? [],
    })));
    setLoading(false);
  }

  async function acceptOrder(orderId: string) {
    setActing(orderId);
    const { error } = await supabase
      .from('orders')
      .update({ status: 'transporter_pending' })
      .eq('id', orderId);
    if (error) {
      toast.error('Failed to accept', error.message);
      setActing(null);
      return;
    }
    await supabase.from('order_events').insert({
      order_id: orderId,
      event_type: 'vendor_accepted_broadcast',
      actor_id: profile!.id,
      actor_role: 'vendor',
      payload: {},
    });
    toast.success('Order accepted', 'Broadcast sent to all transporters');
    setActing(null);
    setTab('active');
    setExpandedId(orderId);
    load(true);
  }

  async function rejectOrder(orderId: string) {
    setActing(orderId);
    const { error } = await supabase.from('orders').update({
      status: 'vendor_rejected',
      cancelled_reason: rejectReason || 'Vendor rejected',
    }).eq('id', orderId);
    if (error) {
      toast.error('Failed to reject', error.message);
      setActing(null);
      return;
    }
    await supabase.from('order_events').insert({
      order_id: orderId,
      event_type: 'vendor_rejected',
      actor_id: profile!.id,
      actor_role: 'vendor',
      payload: { reason: rejectReason },
    });
    toast.success('Order rejected', 'Customer has been notified');
    setActing(null);
    setRejectModal(null);
    setRejectReason('');
    setTab('cancelled');
    load(true);
  }

  async function markReadyForPickup(orderId: string) {
    setActing(orderId);
    await supabase.from('orders').update({ status: 'transporter_pending' }).eq('id', orderId);
    await supabase.from('order_events').insert({
      order_id: orderId,
      event_type: 'ready_for_pickup',
      actor_id: profile!.id,
      actor_role: 'vendor',
      payload: {},
    });
    setActing(null);
    load(true);
  }

  const onRefresh = async () => {
    setRefreshing(true);
    await load(true);
    setRefreshing(false);
  };

  const totalEarned = tab === 'completed'
    ? orders.reduce((sum, o) => sum + (o.total_amount || 0), 0)
    : 0;

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={ORANGE_DK} />

      {/* Compact gradient header */}
      <SafeAreaView style={s.headerArea}>
        <LinearGradient
          colors={[ORANGE_TOP, ORANGE]}
          start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={s.headerInner}>
          <Text style={s.headerTitle}>Orders</Text>
          <Text style={s.headerSub}>
            {orders.length > 0
              ? `${orders.length} ${tab === 'new' ? 'awaiting action' : tab === 'active' ? 'in progress' : tab === 'completed' ? 'delivered' : 'rejected'}`
              : 'Manage incoming and active orders'}
          </Text>
        </View>
      </SafeAreaView>

      {/* Segmented tabs */}
      <View style={s.tabRow}>
        {TABS.map(t => {
          const active = tab === t.key;
          return (
            <Pressable
              key={t.key}
              style={({ pressed }) => [s.tab, pressed && { opacity: 0.7 }]}
              onPress={() => { setTab(t.key); setExpandedId(null); }}
              hitSlop={6}
            >
              <Text style={[s.tabTxt, active && s.tabTxtActive]}>{t.label}</Text>
              <View style={[s.tabIndicator, active && s.tabIndicatorActive]} />
            </Pressable>
          );
        })}
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator color={ORANGE_DK} />
        </View>
      ) : (
        <ScrollView
          style={s.body}
          contentContainerStyle={s.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ORANGE_DK} />}
          showsVerticalScrollIndicator={false}
        >
          {/* Earnings summary on Done tab — softer warm-orange tint */}
          {tab === 'completed' && orders.length > 0 && (
            <Pressable
              onPress={() => router.push('/vendor/earnings' as never)}
              style={({ pressed }) => [s.earningsCard, pressed && { opacity: 0.95 }]}
            >
              <Text style={s.earningsLabel}>Total earned</Text>
              <Text style={s.earningsValue}>{formatINR(totalEarned)}</Text>
              <View style={s.earningsFooter}>
                <Text style={s.earningsMeta}>
                  from {orders.length} delivered {orders.length === 1 ? 'order' : 'orders'}
                </Text>
                <Text style={s.earningsLink}>View payouts →</Text>
              </View>
            </Pressable>
          )}

          {orders.length === 0 ? (
            <EmptyState tab={tab} />
          ) : (
            orders.map(o => {
              const expanded   = expandedId === o.id;
              const pill       = PILL[o.status] ?? { label: o.status, ...CHIP_NEUTRAL };
              const isNew      = o.status === 'vendor_pending';
              const isAccepted = o.status === 'vendor_accepted';
              const orderShort = o.order_number.replace(/^CS/, '');

              const tint =
                tab === 'completed' ? TINT_DONE :
                tab === 'active'    ? TINT_ACTIVE :
                tab === 'cancelled' ? TINT_REJECTED :
                TINT_NEW;

              const transporterLine = o.transporter_name
                ? o.status === 'delivered'
                  ? `Delivered by ${o.transporter_name}`
                  : ['picked_up', 'in_transit', 'out_for_delivery', 'pending_admin_confirmation'].includes(o.status)
                    ? `On the way · ${o.transporter_name}`
                    : `Taken by ${o.transporter_name}`
                : null;

              return (
                <View
                  key={o.id}
                  style={[
                    s.card,
                    { backgroundColor: tint },
                    tab === 'active' && s.cardActiveAccent,
                  ]}
                >
                  <Pressable
                    onPress={() => setExpandedId(expanded ? null : o.id)}
                    style={({ pressed }) => [pressed && { backgroundColor: 'rgba(15,23,42,0.025)' }]}
                  >
                    <View style={s.cardInner}>
                      {/* Top: Order ID + Amount */}
                      <View style={s.cardTop}>
                        <Text style={s.orderId}>#{orderShort}</Text>
                        <Text style={s.amount}>{formatINR(o.total_amount)}</Text>
                      </View>

                      {/* Middle: metadata */}
                      <Text style={s.cardMeta} numberOfLines={1}>
                        {new Date(o.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        {o.delivery_date ? `  ·  ${o.delivery_date}` : ''}
                        {o.delivery_slot ? `  ·  ${o.delivery_slot}` : ''}
                        {o.delivery_mode ? `  ·  ${o.delivery_mode}` : ''}
                      </Text>
                      {transporterLine && (
                        <Text style={s.cardSubMeta} numberOfLines={1}>{transporterLine}</Text>
                      )}

                      {/* Divider above the footer row */}
                      <View style={s.cardDivider} />

                      {/* Bottom: status pill + chevron */}
                      <View style={s.cardFooter}>
                        <View style={[s.pill, { backgroundColor: pill.bg }]}>
                          <Text style={[s.pillTxt, { color: pill.fg }]}>{pill.label}</Text>
                        </View>
                        <ChevronDown
                          size={15}
                          color="#0F172A"
                          strokeWidth={2}
                          style={{ transform: [{ rotate: expanded ? '180deg' : '0deg' }] }}
                        />
                      </View>
                    </View>
                  </Pressable>

                  {/* Expanded detail */}
                  {expanded && (
                    <View style={s.expandWrap}>
                      {/* Customer block */}
                      <DetailSection title="Customer">
                        <View style={s.kvRow}>
                          <Text style={s.kvLabel}>Name</Text>
                          <Text style={s.kvValue} numberOfLines={1}>
                            {o.customer_name ?? `Customer #${orderShort.slice(-5)}`}
                          </Text>
                        </View>
                        {o.customer_phone ? (
                          <View style={s.kvRow}>
                            <Text style={s.kvLabel}>Phone</Text>
                            <View style={s.iconValueRow}>
                              <Phone size={11} color="#0F172A" strokeWidth={2} />
                              <Text style={s.kvValue} numberOfLines={1}>{o.customer_phone}</Text>
                            </View>
                          </View>
                        ) : null}
                        {o.delivery_address ? (
                          <View style={s.kvRow}>
                            <Text style={s.kvLabel}>Address</Text>
                            <View style={s.iconValueRow}>
                              <MapPin size={11} color="#0F172A" strokeWidth={2} />
                              <Text style={[s.kvValue, { flex: 1 }]} numberOfLines={2}>
                                {o.delivery_address}
                              </Text>
                            </View>
                          </View>
                        ) : null}
                      </DetailSection>

                      {/* Items */}
                      {o.items && o.items.length > 0 && (
                        <DetailSection title={`Items · ${o.items.length}`}>
                          {o.items.map(item => (
                            <View key={item.id} style={s.itemRow}>
                              <Text style={s.itemName} numberOfLines={1}>{item.product_name}</Text>
                              <Text style={s.itemQty}>{item.quantity} {item.unit}</Text>
                              <Text style={s.itemTotal}>{formatINR(item.line_total)}</Text>
                            </View>
                          ))}
                        </DetailSection>
                      )}

                      {/* Action row */}
                      {(isNew || isAccepted) && (
                        <View style={s.actions}>
                          {isNew && (
                            <>
                              <Pressable
                                style={({ pressed }) => [
                                  s.actionBtn, s.actionPrimary,
                                  pressed && { opacity: 0.9 },
                                  acting === o.id && { opacity: 0.6 },
                                ]}
                                onPress={() => acceptOrder(o.id)}
                                disabled={acting === o.id}
                              >
                                {acting === o.id ? (
                                  <ActivityIndicator color="#fff" size="small" />
                                ) : (
                                  <>
                                    <CheckCircle2 size={14} color="#FFFFFF" strokeWidth={2.2} />
                                    <Text style={s.actionPrimaryTxt}>Accept</Text>
                                  </>
                                )}
                              </Pressable>
                              <Pressable
                                style={({ pressed }) => [s.actionBtn, s.actionGhost, pressed && { opacity: 0.8 }]}
                                onPress={() => setRejectModal(o.id)}
                                disabled={acting === o.id}
                              >
                                <XCircle size={14} color="#0F172A" strokeWidth={2.2} />
                                <Text style={s.actionGhostTxt}>Reject</Text>
                              </Pressable>
                            </>
                          )}
                          {isAccepted && (
                            <>
                              <Pressable
                                style={({ pressed }) => [s.actionBtn, s.actionPrimary, pressed && { opacity: 0.9 }]}
                                onPress={() => router.push({
                                  pathname: '/vendor/transport',
                                  params: {
                                    prefill_dropoff: o.delivery_address ?? '',
                                    prefill_lat: String(o.delivery_lat ?? 0),
                                    prefill_lng: String(o.delivery_lng ?? 0),
                                    prefill_order_id: o.id,
                                    prefill_order_number: o.order_number ?? '',
                                  },
                                })}
                              >
                                <Truck size={14} color="#FFFFFF" strokeWidth={2.2} />
                                <Text style={s.actionPrimaryTxt}>Book transport</Text>
                              </Pressable>
                              <Pressable
                                style={({ pressed }) => [
                                  s.actionBtn, s.actionGhost,
                                  pressed && { opacity: 0.8 },
                                  acting === o.id && { opacity: 0.6 },
                                ]}
                                onPress={() => markReadyForPickup(o.id)}
                                disabled={acting === o.id}
                              >
                                {acting === o.id ? (
                                  <ActivityIndicator color={ORANGE_DK} size="small" />
                                ) : (
                                  <>
                                    <Package size={14} color="#0F172A" strokeWidth={2.2} />
                                    <Text style={s.actionGhostTxtOrange}>Ready</Text>
                                  </>
                                )}
                              </Pressable>
                            </>
                          )}
                        </View>
                      )}
                    </View>
                  )}
                </View>
              );
            })
          )}

          <View style={{ height: 12 }} />
        </ScrollView>
      )}

      {/* Reject modal — refined */}
      <Modal visible={!!rejectModal} transparent animationType="fade" onRequestClose={() => setRejectModal(null)}>
        <Pressable style={s.modalOverlay} onPress={() => { setRejectModal(null); setRejectReason(''); }}>
          <Pressable style={s.modalBox} onPress={() => {}}>
            <Text style={s.modalTitle}>Reject this order?</Text>
            <Text style={s.modalSub}>The customer will be notified. Reason is optional.</Text>
            <TextInput
              style={s.modalInput}
              value={rejectReason}
              onChangeText={setRejectReason}
              placeholder="Out of stock, cannot fulfil, etc."
              placeholderTextColor={INK_400}
              multiline
              textAlignVertical="top"
            />
            <View style={s.modalActions}>
              <Pressable
                style={({ pressed }) => [s.modalCancel, pressed && { opacity: 0.7 }]}
                onPress={() => { setRejectModal(null); setRejectReason(''); }}
              >
                <Text style={s.modalCancelTxt}>Cancel</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [s.modalConfirm, pressed && { opacity: 0.9 }]}
                onPress={() => rejectModal && rejectOrder(rejectModal)}
              >
                <Text style={s.modalConfirmTxt}>Reject order</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

/* ─── Empty state ─────────────────────────────────────────────────────────── */
function EmptyState({ tab }: { tab: string }) {
  const copy: Record<string, { title: string; body: string; Icon: LucideIcon }> = {
    new:       { title: 'No new orders',       body: 'New orders awaiting your action will appear here.',     Icon: Inbox },
    active:    { title: 'No active orders',    body: 'Accepted orders in fulfilment will appear here.',         Icon: Truck },
    completed: { title: 'No delivered orders', body: 'Completed orders and earnings will appear here.',         Icon: CheckCircle2 },
    cancelled: { title: 'No rejected orders',  body: 'Orders you reject or that get cancelled will appear here.', Icon: XCircle },
  };
  const c = copy[tab] ?? copy.new;
  const Icon = c.Icon;
  return (
    <View style={emp.wrap}>
      <View style={emp.iconRing}>
        <Icon size={20} color="#0F172A" strokeWidth={1.6} />
      </View>
      <Text style={emp.title}>{c.title}</Text>
      <Text style={emp.body}>{c.body}</Text>
    </View>
  );
}
const emp = StyleSheet.create({
  wrap: { alignItems: 'center', paddingVertical: 52, gap: 6 },
  iconRing: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: HAIRLINE,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 8,
  },
  title:{ fontFamily: FontFamily.semiBold, fontSize: 14, color: INK_700, letterSpacing: -0.1 },
  body: { fontFamily: FontFamily.regular,  fontSize: 12, lineHeight: 17, color: INK_500, textAlign: 'center', maxWidth: 260 },
});

/* ─── DetailSection (used inside expanded card) ───────────────────────────── */
function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={ds.wrap}>
      <Text style={ds.title}>{title}</Text>
      <View style={ds.body}>{children}</View>
    </View>
  );
}
const ds = StyleSheet.create({
  wrap:  { borderTopWidth: 1, borderTopColor: HAIRLINE, paddingHorizontal: 14, paddingVertical: 12, gap: 8 },
  title: { fontFamily: FontFamily.medium, fontSize: 11, color: INK_500, letterSpacing: 0.1 },
  body:  { gap: 6 },
});

/* ─── Styles ──────────────────────────────────────────────────────────────── */
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: CREAM },

  /* Header (compact, vertical gradient) */
  headerArea: { backgroundColor: ORANGE, paddingBottom: 16 },
  headerInner: {
    paddingHorizontal: 18,
    paddingTop: Platform.OS === 'web' ? 12 : 6,
    paddingBottom: 2,
    gap: 3,
  },
  headerTitle: { fontFamily: FontFamily.bold, fontSize: 22, color: '#fff', letterSpacing: -0.6 },
  headerSub:   { fontFamily: FontFamily.regular, fontSize: 11.5, color: 'rgba(255,255,255,0.80)', letterSpacing: 0.05 },

  /* Tab bar */
  tabRow: {
    flexDirection: 'row',
    backgroundColor: SURFACE,
    borderBottomWidth: 1, borderBottomColor: BORDER,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 14,
    gap: 8,
  },
  tabTxt:         { fontFamily: FontFamily.medium, fontSize: 13, color: INK_500, letterSpacing: -0.05 },
  tabTxtActive:   { fontFamily: FontFamily.semiBold, color: ORANGE_DK },
  tabIndicator:   { height: 2, width: 22, backgroundColor: 'transparent', borderRadius: 1 },
  tabIndicatorActive: { backgroundColor: ORANGE_DK },

  /* Body */
  body:   { flex: 1, backgroundColor: CREAM },
  scroll: { padding: 14, paddingTop: 18, gap: 14, paddingBottom: 18 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  /* Earnings summary (Done tab) — softer warm tint, larger amount */
  earningsCard: {
    backgroundColor: '#FFF7ED',
    borderRadius: 12,
    borderWidth: 1, borderColor: '#FCD9B6',
    paddingHorizontal: 18, paddingVertical: 18,
    /* layered shadow approximation */
    shadowColor: '#0F172A',
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  earningsLabel: { fontFamily: FontFamily.medium, fontSize: 12, color: ORANGE_DK, letterSpacing: 0.05 },
  earningsValue: { fontFamily: FontFamily.bold, fontSize: 30, lineHeight: 36, color: INK_900, letterSpacing: -1.0, marginTop: 6 },
  earningsFooter:{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  earningsMeta:  { fontFamily: FontFamily.regular, fontSize: 11.5, color: INK_500, letterSpacing: 0.05 },
  earningsLink:  { fontFamily: FontFamily.semiBold, fontSize: 11.5, color: ORANGE_DK },

  /* Order card */
  card: {
    backgroundColor: SURFACE,
    borderRadius: 10,
    borderWidth: 1, borderColor: BORDER,
    overflow: 'hidden',
    /* layered shadow: 0 1 2 + 0 8 24 approximated */
    shadowColor: '#0F172A',
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardActiveAccent: {
    borderTopWidth: 2,
    borderTopColor: ORANGE_TOP,
  },
  cardInner: { paddingHorizontal: 14, paddingVertical: 13, gap: 4 },

  /* Top row */
  cardTop:  { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  orderId:  { fontFamily: FontFamily.bold, fontSize: 15, color: INK_900, letterSpacing: -0.3 },
  amount:   { fontFamily: FontFamily.bold, fontSize: 15.5, color: INK_900, letterSpacing: -0.35 },

  /* Middle */
  cardMeta:    { fontFamily: FontFamily.medium, fontSize: 11.5, color: INK_500, letterSpacing: 0.05, marginTop: 4 },
  cardSubMeta: { fontFamily: FontFamily.medium, fontSize: 11.5, color: INK_500, letterSpacing: 0.05, marginTop: 1 },

  /* Divider */
  cardDivider: { height: 1, backgroundColor: HAIRLINE, marginTop: 10, marginBottom: 2 },

  /* Bottom footer row */
  cardFooter: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 8,
  },

  /* Status pill — premium SaaS chip */
  pill: {
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 999,
  },
  pillTxt: { fontFamily: FontFamily.semiBold, fontSize: 11.5, letterSpacing: -0.1 },

  /* Expanded */
  expandWrap: { backgroundColor: SURFACE },

  /* Key-value rows in detail sections */
  kvRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  kvLabel: { fontFamily: FontFamily.regular, fontSize: 11.5, color: INK_500, width: 70, paddingTop: 1 },
  kvValue: { fontFamily: FontFamily.medium, fontSize: 12.5, color: INK_900, letterSpacing: -0.05, flex: 1 },
  iconValueRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },

  /* Items */
  itemRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 4,
  },
  itemName:  { flex: 1, fontFamily: FontFamily.medium, fontSize: 12.5, color: INK_900, letterSpacing: -0.05 },
  itemQty:   { fontFamily: FontFamily.regular, fontSize: 11.5, color: INK_500 },
  itemTotal: { fontFamily: FontFamily.semiBold, fontSize: 12.5, color: INK_900, minWidth: 64, textAlign: 'right' },

  /* Action row */
  actions: {
    flexDirection: 'row', gap: 10,
    borderTopWidth: 1, borderTopColor: HAIRLINE,
    paddingHorizontal: 14, paddingVertical: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8,
  },
  actionPrimary:     { backgroundColor: ORANGE_DK },
  actionPrimaryTxt:  { fontFamily: FontFamily.semiBold, fontSize: 12.5, color: '#fff', letterSpacing: 0.05 },
  actionGhost:       { backgroundColor: SURFACE, borderWidth: 1, borderColor: BORDER },
  actionGhostTxt:    { fontFamily: FontFamily.semiBold, fontSize: 12.5, color: RED, letterSpacing: 0.05 },
  actionGhostTxtOrange: { fontFamily: FontFamily.semiBold, fontSize: 12.5, color: ORANGE_DK, letterSpacing: 0.05 },

  /* Modal */
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(15,23,42,0.45)',
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalBox: {
    width: '100%', maxWidth: 380,
    backgroundColor: SURFACE,
    borderRadius: 16,
    padding: 20,
    gap: 6,
  },
  modalTitle: { fontFamily: FontFamily.semiBold, fontSize: 16, color: INK_900, letterSpacing: -0.2 },
  modalSub:   { fontFamily: FontFamily.regular, fontSize: 12.5, lineHeight: 17, color: INK_500, marginBottom: 6 },
  modalInput: {
    backgroundColor: CREAM,
    borderWidth: 1, borderColor: BORDER,
    borderRadius: 10, padding: 12,
    fontFamily: FontFamily.regular, fontSize: 13, color: INK_900,
    minHeight: 80,
  },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  modalCancel: {
    flex: 1, paddingVertical: 11, borderRadius: 10,
    backgroundColor: CREAM, borderWidth: 1, borderColor: BORDER,
    alignItems: 'center', justifyContent: 'center',
  },
  modalCancelTxt: { fontFamily: FontFamily.semiBold, fontSize: 13, color: INK_700 },
  modalConfirm: {
    flex: 1, paddingVertical: 11, borderRadius: 10,
    backgroundColor: RED,
    alignItems: 'center', justifyContent: 'center',
  },
  modalConfirmTxt: { fontFamily: FontFamily.semiBold, fontSize: 13, color: '#fff' },
});
