import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, Pressable, ActivityIndicator,
  StyleSheet, RefreshControl, Modal, TextInput,
} from 'react-native';
import { CheckCircle2, XCircle, Package, Clock, Truck, ChevronRight, MapPin, Phone } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Header } from '@/components/ui/Header';
import { Card } from '@/components/ui/Card';
import { useTheme } from '@/theme/ThemeProvider';
import { supabase } from '@/services/supabase';
import { useAuth } from '@/services/auth/AuthProvider';
import { toast } from '@/services/toast';
import { formatINR } from '@/lib/format';

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
  { key: 'new',       label: 'New',      statuses: ['placed', 'vendor_pending'] },
  { key: 'active',    label: 'Active',   statuses: ['vendor_accepted', 'transporter_pending', 'transporter_accepted', 'out_for_pickup', 'pending_admin_pickup_confirmation', 'picked_up', 'in_transit', 'out_for_delivery', 'pending_admin_confirmation'] },
  { key: 'completed', label: 'Done',     statuses: ['delivered'] },
  { key: 'cancelled', label: 'Rejected', statuses: ['vendor_rejected', 'cancelled'] },
];

function statusLabel(s: string): string {
  const m: Record<string, string> = {
    placed:                            'Awaiting Admin Approval',
    vendor_pending:                    'New Order — Action Required',
    vendor_accepted:                   'You Accepted — Awaiting Pickup',
    transporter_pending:               'Broadcast to Transporters',
    transporter_accepted:              'Taken by Transporter',
    out_for_pickup:                    'Transporter Heading to You',
    pending_admin_pickup_confirmation: 'Pickup — Admin Verifying',
    picked_up:                         'Picked Up — On the Way',
    in_transit:                        'In Transit',
    out_for_delivery:                  'Out for Delivery',
    pending_admin_confirmation:        'Delivery — Admin Verifying',
    delivered:                         'Delivered to Client',
    vendor_rejected:                   'Rejected by You',
    cancelled:                         'Cancelled',
  };
  return m[s] ?? s.replace(/_/g, ' ');
}

function statusColor(s: string): { color: string; bg: string } {
  if (['placed', 'vendor_pending'].includes(s)) return { color: '#D97706', bg: '#FEF3C7' };
  if (['vendor_accepted', 'transporter_pending'].includes(s)) return { color: '#2563EB', bg: '#DBEAFE' };
  if (s === 'transporter_accepted') return { color: '#15803D', bg: '#DCFCE7' };
  if (['out_for_pickup', 'picked_up', 'in_transit', 'out_for_delivery'].includes(s)) return { color: '#7C3AED', bg: '#EDE9FE' };
  if (['pending_admin_pickup_confirmation', 'pending_admin_confirmation'].includes(s)) return { color: '#B45309', bg: '#FFFBEB' };
  if (s === 'delivered') return { color: '#16A34A', bg: '#DCFCE7' };
  return { color: '#64748B', bg: '#F1F5F9' };
}

export default function VendorOrders() {
  const { tokens } = useTheme();
  const { profile } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState('new');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [acting, setActing] = useState<string | null>(null);

  const activeTab = TABS.find((t) => t.key === tab)!;

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
            'New Order Received 🛒',
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
      .in('status', activeTab.statuses)
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
    // Mark vendor accepted, then immediately broadcast to all transporters
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
    toast.success('Order Accepted', 'Broadcast sent to all transporters');
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
    toast.success('Order Rejected', 'Customer has been notified');
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

  return (
    <Screen padding={0}>
      <Header title="Orders" showBack={false} />

      {/* Tabs */}
      <View style={styles.tabRow}>
        {TABS.map((t) => (
          <Pressable
            key={t.key}
            style={[styles.tab, tab === t.key && styles.tabActive]}
            onPress={() => setTab(t.key)}
          >
            <Text style={[styles.tabText, tab === t.key && { color: tokens.color.primary }]}>
              {t.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={tokens.color.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 32 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {/* Earnings summary on the Done tab */}
          {tab === 'completed' && orders.length > 0 && (() => {
            const totalEarned = orders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
            return (
              <View style={{
                backgroundColor: '#F0FDF4', borderRadius: 14,
                padding: 16, borderWidth: 1, borderColor: '#BBF7D0',
                flexDirection: 'row', alignItems: 'center', gap: 14,
              }}>
                <View style={{
                  width: 48, height: 48, borderRadius: 12,
                  backgroundColor: '#15803D', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Text style={{ color: '#fff', fontFamily: 'Poppins_700Bold', fontSize: 20 }}>₹</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: 'Poppins_400Regular', fontSize: 12, color: '#15803D' }}>
                    Total Earned from {orders.length} delivered {orders.length === 1 ? 'order' : 'orders'}
                  </Text>
                  <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 22, color: '#15803D', letterSpacing: -0.5 }}>
                    {formatINR(totalEarned)}
                  </Text>
                </View>
              </View>
            );
          })()}

          {orders.length === 0 && (
            <View style={{ alignItems: 'center', paddingTop: 60, gap: 8 }}>
              <Package size={48} color={tokens.color.textMuted} />
              <Text style={{ fontSize: 16, fontWeight: '700', color: tokens.color.textPrimary }}>
                No {tab} orders
              </Text>
            </View>
          )}

          {orders.map((o) => {
            const expanded = expandedId === o.id;
            const sc = statusColor(o.status);
            const isNew = ['placed', 'vendor_pending'].includes(o.status);
            const isAccepted = o.status === 'vendor_accepted';

            return (
              <Card key={o.id} padding={0}>
                {/* Header row */}
                <Pressable
                  style={{ padding: 14 }}
                  onPress={() => setExpandedId(expanded ? null : o.id)}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontSize: 15, fontWeight: '800', color: tokens.color.textPrimary }}>
                      #{o.order_number}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View style={[styles.statusPill, { backgroundColor: sc.bg }]}>
                        <Text style={[styles.statusText, { color: sc.color }]}>
                          {statusLabel(o.status)}
                        </Text>
                      </View>
                      <ChevronRight
                        size={16}
                        color={tokens.color.textMuted}
                        style={{ transform: [{ rotate: expanded ? '90deg' : '0deg' }] }}
                      />
                    </View>
                  </View>

                  {/* Transporter status sub-badge */}
                  {o.transporter_name && (
                    <View style={{
                      flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8,
                      paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
                      backgroundColor: o.status === 'delivered' ? '#DCFCE7' : '#EFF6FF',
                      borderWidth: 1, borderColor: o.status === 'delivered' ? '#BBF7D0' : '#BFDBFE',
                      alignSelf: 'flex-start',
                    }}>
                      <Truck size={12} color={o.status === 'delivered' ? '#15803D' : '#1D4ED8'} strokeWidth={2.2} />
                      <Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 11, color: o.status === 'delivered' ? '#15803D' : '#1D4ED8' }}>
                        {o.status === 'delivered'
                          ? `Delivered by ${o.transporter_name}`
                          : ['picked_up', 'in_transit', 'out_for_delivery', 'pending_admin_confirmation'].includes(o.status)
                            ? `On the way · ${o.transporter_name}`
                            : `Taken by ${o.transporter_name}`}
                      </Text>
                    </View>
                  )}

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Clock size={13} color={tokens.color.textMuted} />
                      <Text style={{ fontSize: 12, color: tokens.color.textMuted }}>
                        {new Date(o.created_at).toLocaleDateString('en-IN')}
                        {o.delivery_date ? `  •  ${o.delivery_date}` : ''}
                        {o.delivery_slot ? `  ${o.delivery_slot}` : ''}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 16, fontWeight: '700', color: tokens.color.textPrimary }}>
                      {formatINR(o.total_amount)}
                    </Text>
                  </View>
                </Pressable>

                {/* Expanded detail */}
                {expanded && (
                  <View style={{ borderTopWidth: 1, borderTopColor: tokens.color.border }}>
                    {/* Customer */}
                    <View style={{ padding: 14, gap: 6 }}>
                      <Text style={{ fontSize: 12, fontWeight: '600', color: tokens.color.textMuted, textTransform: 'uppercase' }}>
                        Customer
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Phone size={14} color={tokens.color.primary} />
                        <Text style={{ fontSize: 14, fontWeight: '600', color: tokens.color.textPrimary }}>
                          {o.customer_name ?? 'Customer'}
                        </Text>
                        <Text style={{ fontSize: 13, color: tokens.color.textMuted }}>
                          {o.customer_phone}
                        </Text>
                      </View>
                      {o.delivery_address ? (
                        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6 }}>
                          <MapPin size={14} color={tokens.color.danger} />
                          <Text style={{ fontSize: 13, color: tokens.color.textSecondary, flex: 1 }}>
                            {o.delivery_address}
                          </Text>
                        </View>
                      ) : null}
                    </View>

                    {/* Items */}
                    {o.items && o.items.length > 0 && (
                      <View style={{ paddingHorizontal: 14, paddingBottom: 14, gap: 6 }}>
                        <Text style={{ fontSize: 12, fontWeight: '600', color: tokens.color.textMuted, textTransform: 'uppercase' }}>
                          Items ({o.items.length})
                        </Text>
                        {o.items.map((item) => (
                          <View key={item.id} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Text style={{ fontSize: 13, color: tokens.color.textPrimary, flex: 1 }} numberOfLines={1}>
                              {item.product_name}
                            </Text>
                            <Text style={{ fontSize: 13, color: tokens.color.textMuted }}>
                              {item.quantity} {item.unit}
                            </Text>
                            <Text style={{ fontSize: 13, fontWeight: '700', color: tokens.color.textPrimary, marginLeft: 12 }}>
                              {formatINR(item.line_total)}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}

                    {/* Actions */}
                    {(isNew || isAccepted) && (
                      <View style={{ padding: 14, paddingTop: 0, flexDirection: 'row', gap: 10 }}>
                        {isNew && (
                          <>
                            <Pressable
                              style={[styles.actionBtn, { backgroundColor: tokens.color.success, flex: 1 }]}
                              onPress={() => acceptOrder(o.id)}
                              disabled={acting === o.id}
                            >
                              {acting === o.id ? (
                                <ActivityIndicator color="#fff" size="small" />
                              ) : (
                                <>
                                  <CheckCircle2 size={15} color="#fff" />
                                  <Text style={styles.actionBtnText}>Accept</Text>
                                </>
                              )}
                            </Pressable>
                            <Pressable
                              style={[styles.actionBtn, { backgroundColor: tokens.color.danger, flex: 1 }]}
                              onPress={() => setRejectModal(o.id)}
                              disabled={acting === o.id}
                            >
                              <XCircle size={15} color="#fff" />
                              <Text style={styles.actionBtnText}>Reject</Text>
                            </Pressable>
                          </>
                        )}
                        {isAccepted && (
                          <>
                            <Pressable
                              style={[styles.actionBtn, { backgroundColor: '#15803D', flex: 1 }]}
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
                              <Truck size={15} color="#fff" />
                              <Text style={styles.actionBtnText}>Book Transport</Text>
                            </Pressable>
                            <Pressable
                              style={[styles.actionBtn, { backgroundColor: '#7C3AED', flex: 1 }]}
                              onPress={() => markReadyForPickup(o.id)}
                              disabled={acting === o.id}
                            >
                              {acting === o.id ? (
                                <ActivityIndicator color="#fff" size="small" />
                              ) : (
                                <>
                                  <Package size={15} color="#fff" />
                                  <Text style={styles.actionBtnText}>Ready for Pickup</Text>
                                </>
                              )}
                            </Pressable>
                          </>
                        )}
                      </View>
                    )}
                  </View>
                )}
              </Card>
            );
          })}
        </ScrollView>
      )}

      {/* Reject modal */}
      <Modal visible={!!rejectModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: tokens.color.textPrimary, marginBottom: 12 }}>
              Reject Order?
            </Text>
            <Text style={{ fontSize: 14, color: tokens.color.textSecondary, marginBottom: 12 }}>
              Please provide a reason (optional):
            </Text>
            <TextInput
              style={{
                borderWidth: 1.5, borderColor: tokens.color.border,
                borderRadius: 10, padding: 12,
                fontSize: 14, color: tokens.color.textPrimary,
                minHeight: 80, textAlignVertical: 'top',
              }}
              value={rejectReason}
              onChangeText={setRejectReason}
              placeholder="Out of stock, cannot fulfill, etc."
              placeholderTextColor={tokens.color.textMuted}
              multiline
            />
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <Pressable
                style={[styles.actionBtn, { flex: 1, backgroundColor: tokens.color.muted }]}
                onPress={() => { setRejectModal(null); setRejectReason(''); }}
              >
                <Text style={{ fontWeight: '700', color: tokens.color.textSecondary }}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.actionBtn, { flex: 1, backgroundColor: tokens.color.danger }]}
                onPress={() => rejectModal && rejectOrder(rejectModal)}
              >
                <Text style={styles.actionBtnText}>Confirm Reject</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  tabRow: {
    flexDirection: 'row', borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0', backgroundColor: '#fff',
  },
  tab: {
    flex: 1, paddingVertical: 12, alignItems: 'center',
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: '#1F7A3C' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#9AA39E' },
  statusPill: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999,
  },
  statusText: { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 11, paddingHorizontal: 14, borderRadius: 10,
  },
  actionBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center', justifyContent: 'center',
  },
  modalBox: {
    width: '85%', backgroundColor: '#fff',
    borderRadius: 16, padding: 20,
    shadowColor: '#000', shadowOpacity: 0.15,
    shadowRadius: 20, elevation: 8,
  },
});
