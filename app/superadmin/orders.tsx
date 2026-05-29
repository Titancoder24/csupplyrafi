import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, ActivityIndicator } from 'react-native';
import { Search, CheckCircle, XCircle, CreditCard, Calendar, Clock, FileText, Store } from 'lucide-react-native';
import { Colors, FontFamily, Radius, Shadow } from '@/constants/theme';
import { supabase } from '@/services/supabase';

type CustomerGst = {
  hasGst?: boolean;
  gstNumber?: string;
  businessName?: string;
  fullName?: string;
} | null;

type Vendor = { id: string; shop_name?: string; full_name?: string; phone?: string };

type Order = {
  id: string;
  order_number: string;
  customer_name?: string;
  customer_phone?: string;
  customer_gst?: CustomerGst;
  vendors?: Vendor[];
  total_amount: number;
  status: string;
  payment_status: string;
  payment_method?: string;
  created_at: string;
  updated_at?: string;
  delivered_at?: string;
  delivery_date?: string;
};

const STATUS_TABS = [
  'placed',
  'vendor_pending',
  'vendor_accepted',
  'pending_admin_pickup_confirmation',
  'in_transit',
  'pending_admin_confirmation',
  'delivered',
  'cancelled',
  'all',
];

const STATUS_LABELS: Record<string, string> = {
  placed:                            'New (Awaiting Approval)',
  vendor_pending:                    'Approved → Vendor',
  vendor_accepted:                   'Vendor Accepted',
  vendor_rejected:                   'Vendor Rejected',
  transporter_pending:               'Finding Transporter',
  transporter_accepted:              'Transporter Assigned',
  out_for_pickup:                    'Out for Pickup',
  pending_admin_pickup_confirmation: 'Pickup — Awaiting Confirm',
  picked_up:                         'Picked Up',
  in_transit:                        'In Transit',
  out_for_delivery:                  'Out for Delivery',
  pending_admin_confirmation:        'Delivery — Awaiting Confirm',
  delivered:                         'Delivered',
  cancelled:                         'Cancelled',
};

function tabLabel(t: string) {
  if (t === 'all') return 'All Orders';
  if (t === 'placed') return 'Pending Approval';
  if (t === 'vendor_pending') return 'Sent to Vendor';
  if (t === 'pending_admin_pickup_confirmation') return 'Confirm Pickup';
  if (t === 'pending_admin_confirmation') return 'Confirm Delivery';
  return t.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
}

function statusColor(s: string): { fg: string; bg: string } {
  if (s === 'placed')                      return { fg: '#B45309', bg: '#FFFBEB' };
  if (s === 'vendor_pending')              return { fg: '#1D4ED8', bg: '#EFF6FF' };
  if (s === 'vendor_accepted')             return { fg: '#15803D', bg: '#F0FDF4' };
  if (s === 'vendor_rejected')             return { fg: '#B91C1C', bg: '#FEF2F2' };
  if (['transporter_pending', 'transporter_accepted'].includes(s)) return { fg: '#6D28D9', bg: '#F5F3FF' };
  if (['out_for_pickup', 'picked_up', 'in_transit', 'out_for_delivery'].includes(s))
    return { fg: '#C2410C', bg: '#FFF7ED' };
  if (s === 'pending_admin_confirmation')  return { fg: '#15803D', bg: '#F0FDF4' };
  if (s === 'delivered')                   return { fg: '#15803D', bg: '#DCFCE7' };
  if (s === 'cancelled')                   return { fg: '#B91C1C', bg: '#FEF2F2' };
  return { fg: '#64748B', bg: '#F1F5F9' };
}

function paymentColor(p: string): { fg: string; bg: string; label: string } {
  if (p === 'paid')      return { fg: '#15803D', bg: '#DCFCE7', label: 'Paid' };
  if (p === 'pending')   return { fg: '#B45309', bg: '#FFFBEB', label: 'Pending' };
  if (p === 'failed')    return { fg: '#B91C1C', bg: '#FEF2F2', label: 'Failed' };
  if (p === 'refunded')  return { fg: '#6D28D9', bg: '#F5F3FF', label: 'Refunded' };
  return { fg: '#64748B', bg: '#F1F5F9', label: p || '—' };
}

function fmtDate(iso?: string) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function fmtDateTime(iso?: string) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('en-IN', {
    day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function OrdersScreen() {
  const [orders, setOrders]       = useState<Order[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [tab, setTab]             = useState<string>('placed');
  const [acting, setActing]       = useState<string | null>(null);
  const [toast, setToast]         = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null);

  useEffect(() => {
    fetchOrders();
    const channel = supabase
      .channel('sa-orders-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => fetchOrders())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [tab]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  async function fetchOrders() {
    setLoading(true);
    try {
      let q = supabase
        .from('orders')
        .select('id, order_number, total_amount, status, payment_status, payment_method, created_at, updated_at, delivered_at, delivery_date, customer_gst, profiles!orders_customer_id_fkey(full_name, phone), order_items(products(vendor_id))')
        .order('created_at', { ascending: false })
        .limit(200);
      if (tab !== 'all') q = q.eq('status', tab);
      const { data, error } = await q;
      if (error) throw error;

      const raw = (data ?? []) as any[];

      // Collect unique vendor ids across all orders
      const vendorIds = Array.from(new Set(
        raw.flatMap((d: any) =>
          (d.order_items ?? [])
            .map((it: any) => it.products?.vendor_id)
            .filter(Boolean)
        )
      ));

      let vendorMap: Record<string, Vendor> = {};
      if (vendorIds.length) {
        const [vpRes, prRes] = await Promise.all([
          supabase.from('vendor_profiles').select('id, shop_name').in('id', vendorIds),
          supabase.from('profiles').select('id, full_name, phone').in('id', vendorIds),
        ]);
        const vps = (vpRes.data ?? []) as any[];
        const prs = (prRes.data ?? []) as any[];
        vendorMap = vendorIds.reduce<Record<string, Vendor>>((acc, id) => {
          const vp = vps.find((v: any) => v.id === id);
          const pr = prs.find((p: any) => p.id === id);
          acc[id] = { id, shop_name: vp?.shop_name, full_name: pr?.full_name, phone: pr?.phone };
          return acc;
        }, {});
      }

      setOrders(raw.map((d: any) => {
        const vIds: string[] = Array.from(new Set(
          (d.order_items ?? [])
            .map((it: any) => it.products?.vendor_id)
            .filter(Boolean)
        ));
        return {
          id:             d.id,
          order_number:   d.order_number,
          customer_name:  d.profiles?.full_name,
          customer_phone: d.profiles?.phone,
          customer_gst:   d.customer_gst ?? null,
          vendors:        vIds.map(id => vendorMap[id]).filter(Boolean),
          total_amount:   d.total_amount ?? 0,
          status:         d.status,
          payment_status: d.payment_status,
          payment_method: d.payment_method,
          created_at:     d.created_at,
          updated_at:     d.updated_at,
          delivered_at:   d.delivered_at,
          delivery_date:  d.delivery_date,
        };
      }));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function approveOrder(id: string, orderNumber?: string) {
    setActing(id);
    const { error } = await supabase
      .from('orders')
      .update({ status: 'vendor_pending', updated_at: new Date().toISOString() })
      .eq('id', id);
    setActing(null);
    if (error) {
      setToast({ kind: 'err', msg: `Failed to approve #${orderNumber}: ${error.message}` });
      return;
    }
    setToast({ kind: 'ok', msg: `Order #${orderNumber} approved — sent to vendor` });
    setTab('vendor_pending');
  }

  async function rejectOrder(id: string, orderNumber?: string) {
    setActing(id);
    const { error } = await supabase
      .from('orders')
      .update({ status: 'cancelled', cancelled_reason: 'Rejected by super admin', updated_at: new Date().toISOString() })
      .eq('id', id);
    setActing(null);
    if (error) {
      setToast({ kind: 'err', msg: `Failed to reject #${orderNumber}: ${error.message}` });
      return;
    }
    setToast({ kind: 'ok', msg: `Order #${orderNumber} rejected` });
    setTab('cancelled');
  }

  async function confirmDelivery(id: string, orderNumber?: string) {
    setActing(id);
    const { error } = await supabase
      .from('orders')
      .update({ status: 'delivered', delivered_at: new Date().toISOString() })
      .eq('id', id);
    setActing(null);
    if (error) {
      setToast({ kind: 'err', msg: `Failed: ${error.message}` });
      return;
    }
    setToast({ kind: 'ok', msg: `Order #${orderNumber} marked delivered` });
    setTab('delivered');
  }

  async function confirmPickup(id: string, orderNumber?: string) {
    setActing(id);
    const { error } = await supabase
      .from('orders')
      .update({ status: 'picked_up' })
      .eq('id', id);
    setActing(null);
    if (error) {
      setToast({ kind: 'err', msg: `Failed: ${error.message}` });
      return;
    }
    setToast({ kind: 'ok', msg: `Order #${orderNumber} pickup confirmed — transporter can proceed` });
    setTab('in_transit');
  }

  const filtered = orders.filter(o =>
    o.order_number?.toLowerCase().includes(search.toLowerCase()) ||
    o.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
    o.customer_phone?.includes(search)
  );

  const showApproveActions  = tab === 'placed';
  const showPickupConfirm   = tab === 'pending_admin_pickup_confirmation';
  const showDeliveryConfirm = tab === 'pending_admin_confirmation';

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.scroll}>
      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.tabs}>
          {STATUS_TABS.map(t => (
            <Pressable key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
              <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
                {tabLabel(t)}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      {/* Search */}
      <View style={styles.searchBox}>
        <Search size={16} color="#0F172A" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by order ID, customer name or phone..."
          placeholderTextColor={Colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
        <Text style={styles.count}>{filtered.length} {filtered.length === 1 ? 'order' : 'orders'}</Text>
      </View>

      {/* Toast */}
      {toast && (
        <View style={[styles.toast, toast.kind === 'ok' ? styles.toastOk : styles.toastErr]}>
          {toast.kind === 'ok'
            ? <CheckCircle size={16} color="#0F172A" />
            : <XCircle size={16} color="#0F172A" />}
          <Text style={[styles.toastTxt, { color: toast.kind === 'ok' ? '#15803D' : '#B91C1C' }]}>
            {toast.msg}
          </Text>
        </View>
      )}

      {/* List */}
      {loading ? (
        <View style={styles.loader}><ActivityIndicator color={Colors.primary} size="large" /></View>
      ) : filtered.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No orders in this tab</Text>
          <Text style={styles.emptyText}>
            {tab === 'placed'
              ? 'New orders awaiting your approval will appear here.'
              : `No orders currently have status "${tabLabel(tab)}".`}
          </Text>
        </View>
      ) : (
        <View style={{ gap: 12 }}>
          {filtered.map(o => {
            const sc  = statusColor(o.status);
            const pc  = paymentColor(o.payment_status);
            return (
              <View key={o.id} style={styles.card}>
                {/* Top row: order # + status + amount */}
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1, gap: 4 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={styles.orderNum}>#{o.order_number}</Text>
                      <View style={[styles.pill, { backgroundColor: sc.bg }]}>
                        <Text style={[styles.pillTxt, { color: sc.fg }]}>{STATUS_LABELS[o.status] ?? o.status}</Text>
                      </View>
                    </View>
                    <Text style={styles.customer}>{o.customer_name || 'Unknown Customer'} · {o.customer_phone || 'No phone'}</Text>
                  </View>
                  <Text style={styles.amount}>₹{o.total_amount.toLocaleString('en-IN')}</Text>
                </View>

                {/* GST / business info */}
                {o.customer_gst ? (
                  <View style={styles.infoBlock}>
                    <FileText size={13} color="#0F172A" strokeWidth={2} />
                    {o.customer_gst.hasGst ? (
                      <Text style={styles.infoTxt}>
                        GST <Text style={styles.infoStrong}>{o.customer_gst.gstNumber || '—'}</Text>
                        {o.customer_gst.businessName ? ` · ${o.customer_gst.businessName}` : ''}
                      </Text>
                    ) : (
                      <Text style={styles.infoTxt}>
                        GST: <Text style={styles.infoStrong}>Not registered</Text>
                        {o.customer_gst.fullName ? ` · ${o.customer_gst.fullName}` : ''}
                      </Text>
                    )}
                  </View>
                ) : null}

                {/* Vendor(s) */}
                {o.vendors && o.vendors.length > 0 ? (
                  <View style={styles.infoBlock}>
                    <Store size={13} color="#0F172A" strokeWidth={2} />
                    <Text style={styles.infoTxt}>
                      Vendor: <Text style={styles.infoStrong}>{o.vendors.map(v => v.shop_name || v.full_name || 'Unknown').join(', ')}</Text>
                      {o.vendors.length === 1 && o.vendors[0].phone ? ` · ${o.vendors[0].phone}` : ''}
                    </Text>
                  </View>
                ) : null}

                {/* Meta row: payment, dates */}
                <View style={styles.metaRow}>
                  <View style={styles.metaItem}>
                    <CreditCard size={13} color="#0F172A" strokeWidth={2} />
                    <Text style={styles.metaLabel}>Payment</Text>
                    <View style={[styles.miniPill, { backgroundColor: pc.bg }]}>
                      <Text style={[styles.miniPillTxt, { color: pc.fg }]}>{pc.label}</Text>
                    </View>
                    {o.payment_method ? (
                      <Text style={styles.metaSub}>· {o.payment_method.toUpperCase()}</Text>
                    ) : null}
                  </View>

                  <View style={styles.metaItem}>
                    <Calendar size={13} color="#0F172A" strokeWidth={2} />
                    <Text style={styles.metaLabel}>Placed</Text>
                    <Text style={styles.metaVal}>{fmtDateTime(o.created_at)}</Text>
                  </View>

                  {o.status !== 'placed' && o.updated_at && (
                    <View style={styles.metaItem}>
                      <Clock size={13} color="#0F172A" strokeWidth={2} />
                      <Text style={styles.metaLabel}>Last update</Text>
                      <Text style={styles.metaVal}>{fmtDateTime(o.updated_at)}</Text>
                    </View>
                  )}

                  {o.delivery_date && (
                    <View style={styles.metaItem}>
                      <Calendar size={13} color="#0F172A" strokeWidth={2} />
                      <Text style={styles.metaLabel}>Delivery</Text>
                      <Text style={styles.metaVal}>{fmtDate(o.delivery_date)}</Text>
                    </View>
                  )}

                  {o.delivered_at && (
                    <View style={styles.metaItem}>
                      <CheckCircle size={13} color="#0F172A" strokeWidth={2} />
                      <Text style={styles.metaLabel}>Delivered</Text>
                      <Text style={[styles.metaVal, { color: '#15803D' }]}>{fmtDateTime(o.delivered_at)}</Text>
                    </View>
                  )}
                </View>

                {/* Actions */}
                {(showApproveActions || showPickupConfirm || showDeliveryConfirm) && (
                  <View style={styles.actionRow}>
                    {showApproveActions && (
                      <>
                        <Pressable
                          style={[styles.btn, styles.approveBtn, acting === o.id && { opacity: 0.6 }]}
                          onPress={() => approveOrder(o.id, o.order_number)}
                          disabled={acting === o.id}
                        >
                          {acting === o.id
                            ? <ActivityIndicator size="small" color="#fff" />
                            : <><CheckCircle size={14} color="#FFFFFF" /><Text style={styles.btnText}>Approve & Send to Vendor</Text></>}
                        </Pressable>
                        <Pressable
                          style={[styles.btn, styles.rejectBtn, acting === o.id && { opacity: 0.6 }]}
                          onPress={() => rejectOrder(o.id, o.order_number)}
                          disabled={acting === o.id}
                        >
                          <XCircle size={14} color="#FFFFFF" />
                          <Text style={styles.btnText}>Reject</Text>
                        </Pressable>
                      </>
                    )}
                    {showPickupConfirm && (
                      <Pressable
                        style={[styles.btn, styles.approveBtn, acting === o.id && { opacity: 0.6 }]}
                        onPress={() => confirmPickup(o.id, o.order_number)}
                        disabled={acting === o.id}
                      >
                        {acting === o.id
                          ? <ActivityIndicator size="small" color="#fff" />
                          : <><CheckCircle size={14} color="#FFFFFF" /><Text style={styles.btnText}>Confirm Pickup</Text></>}
                      </Pressable>
                    )}
                    {showDeliveryConfirm && (
                      <Pressable
                        style={[styles.btn, styles.approveBtn, acting === o.id && { opacity: 0.6 }]}
                        onPress={() => confirmDelivery(o.id, o.order_number)}
                        disabled={acting === o.id}
                      >
                        {acting === o.id
                          ? <ActivityIndicator size="small" color="#fff" />
                          : <><CheckCircle size={14} color="#FFFFFF" /><Text style={styles.btnText}>Confirm Delivery</Text></>}
                      </Pressable>
                    )}
                  </View>
                )}
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: '#F1F5F9' },
  scroll: { padding: 24, gap: 16, paddingBottom: 40 },

  /* Tabs */
  tabs: { flexDirection: 'row', gap: 8 },
  tab: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: Radius.full, backgroundColor: Colors.white,
    borderWidth: 1, borderColor: Colors.border,
  },
  tabActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  tabText: { fontFamily: FontFamily.semiBold, fontSize: 12, color: Colors.textSecondary },
  tabTextActive: { color: Colors.white },

  /* Search */
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.white, borderRadius: Radius.md,
    paddingHorizontal: 14, height: 44,
    borderWidth: 1, borderColor: Colors.border, ...Shadow.sm,
  },
  searchInput: { flex: 1, fontFamily: FontFamily.regular, fontSize: 14, color: Colors.textPrimary },
  count:       { fontFamily: FontFamily.semiBold, fontSize: 12, color: Colors.textMuted },

  /* Toast */
  toast: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    borderRadius: Radius.md, borderWidth: 1,
  },
  toastOk:  { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' },
  toastErr: { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
  toastTxt: { fontFamily: FontFamily.semiBold, fontSize: 13, flex: 1 },

  /* Card */
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.border,
    padding: 16, gap: 12,
    ...Shadow.card,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  orderNum:   { fontFamily: FontFamily.bold, fontSize: 15, color: Colors.primary },
  customer:   { fontFamily: FontFamily.regular, fontSize: 12, color: Colors.textMuted },
  amount:     { fontFamily: FontFamily.bold, fontSize: 17, color: Colors.textPrimary },

  infoBlock:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  infoTxt:    { fontFamily: FontFamily.regular, fontSize: 12, color: Colors.textMuted, flex: 1 },
  infoStrong: { fontFamily: FontFamily.semiBold, color: Colors.textPrimary },

  pill: {
    paddingHorizontal: 9, paddingVertical: 4,
    borderRadius: Radius.full,
  },
  pillTxt: { fontFamily: FontFamily.semiBold, fontSize: 11 },

  /* Meta row */
  metaRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 14,
    paddingTop: 12, borderTopWidth: 1, borderTopColor: Colors.border,
  },
  metaItem:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaLabel: { fontFamily: FontFamily.regular, fontSize: 11, color: Colors.textMuted },
  metaVal:   { fontFamily: FontFamily.semiBold, fontSize: 12, color: Colors.textPrimary },
  metaSub:   { fontFamily: FontFamily.regular, fontSize: 11, color: Colors.textMuted },
  miniPill:  { paddingHorizontal: 7, paddingVertical: 2, borderRadius: Radius.full },
  miniPillTxt: { fontFamily: FontFamily.semiBold, fontSize: 10 },

  /* Actions */
  actionRow: { flexDirection: 'row', gap: 10 },
  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: Radius.md, flex: 1,
  },
  approveBtn: { backgroundColor: '#15803D' },
  rejectBtn:  { backgroundColor: '#B91C1C', flex: 0.6 },
  btnText:    { fontFamily: FontFamily.bold, fontSize: 13, color: Colors.white },

  /* Loader & empty */
  loader:     { padding: 60, alignItems: 'center' },
  empty:      {
    padding: 40, alignItems: 'center', gap: 6,
    backgroundColor: Colors.white, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.border,
  },
  emptyTitle: { fontFamily: FontFamily.bold, fontSize: 14, color: Colors.textPrimary },
  emptyText:  { fontFamily: FontFamily.regular, fontSize: 12, color: Colors.textMuted, textAlign: 'center' },
});
