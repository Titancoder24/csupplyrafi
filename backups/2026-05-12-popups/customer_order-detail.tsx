import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  ActivityIndicator, Platform, RefreshControl, TextInput, Modal,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import {
  ArrowLeft, CheckCircle2, MapPin, MessageCircle,
  Package, Phone, Truck, AlertCircle, Star,
} from 'lucide-react-native';
import { supabase } from '@/services/supabase';
import { useAuth } from '@/services/auth/AuthProvider';
import { FontFamily } from '@/constants/theme';
import { getProductImage } from '@/lib/productImage';

const BG      = '#F8FAFC';
const SURFACE = '#FFFFFF';
const BORDER  = '#E2E8F0';
const TEXT    = '#0F172A';
const MUTED   = '#64748B';
const PRIMARY = '#1D4ED8';
const GREEN   = '#15803D';
const HINT    = '#94A3B8';
const STAR    = '#F59E0B';
const PT      = Platform.OS === 'ios' ? 56 : Platform.OS === 'web' ? 0 : 36;

type OrderItem     = { id: string; product_name: string; quantity: number; unit: string; unit_price: number; line_total: number };
type Transporter   = { id: string; name: string; phone?: string };
type OrderDetail   = {
  id: string; order_number: string; status: string; total_amount: number;
  created_at: string; delivery_address?: string;
  items: OrderItem[]; transporter?: Transporter;
};

const STEPS = [
  { key: 'placed',               label: 'Order Placed',         sub: 'Waiting for admin review' },
  { key: 'vendor_pending',       label: 'Admin Approved',       sub: 'Sent to vendor for acceptance' },
  { key: 'vendor_accepted',      label: 'Vendor Accepted',      sub: 'Vendor is preparing your order' },
  { key: 'transporter_accepted', label: 'Transporter Assigned', sub: 'Delivery partner on the way' },
  { key: 'in_transit',           label: 'In Transit',           sub: 'Your order is on the way' },
  { key: 'delivered',            label: 'Delivered',            sub: 'Order successfully delivered' },
];

function getStepIndex(status: string): number {
  if (status === 'placed')                                                                         return 0;
  if (status === 'vendor_pending')                                                                 return 1;
  if (status === 'vendor_accepted')                                                                return 2;
  if (['transporter_pending', 'transporter_accepted'].includes(status))                           return 3;
  if (['out_for_pickup', 'pending_admin_pickup_confirmation', 'picked_up', 'in_transit', 'out_for_delivery'].includes(status)) return 4;
  if (['pending_admin_confirmation', 'delivered'].includes(status))                               return 5;
  return 0;
}

const RATING_PILLS = [
  { value: 1, label: 'Very Bad',  color: '#DC2626' },
  { value: 2, label: 'Bad',       color: '#EA580C' },
  { value: 3, label: 'Ok-Ok',     color: '#CA8A04' },
  { value: 4, label: 'Good',      color: '#16A34A' },
  { value: 5, label: 'Very Good', color: '#15803D' },
];

const FEEDBACK_TAGS = [
  'Packaging',
  'Delivery Speed',
  'Timely status updates',
  'Delivery Agent Behavior',
  'Product Quality',
];

const STATUS_LABELS: Record<string, string> = {
  placed:                            'Order Placed',
  vendor_pending:                    'Admin Approved',
  vendor_accepted:                   'Vendor Accepted',
  vendor_rejected:                   'Vendor Rejected',
  transporter_pending:               'Finding Transporter',
  transporter_accepted:              'Transporter Assigned',
  out_for_pickup:                    'Out for Pickup',
  pending_admin_pickup_confirmation: 'Pickup Reported',
  picked_up:                         'Picked Up',
  in_transit:                        'In Transit',
  out_for_delivery:                  'Out for Delivery',
  pending_admin_confirmation:        'Awaiting Confirmation',
  delivered:                         'Delivered',
  cancelled:                         'Cancelled',
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  placed:                    { bg: '#EFF6FF', text: PRIMARY },
  vendor_pending:            { bg: '#FFFBEB', text: '#B45309' },
  vendor_accepted:           { bg: '#F0FDF4', text: GREEN },
  transporter_pending:       { bg: '#FFFBEB', text: '#B45309' },
  transporter_accepted:      { bg: '#EEF2FF', text: '#4338CA' },
  out_for_pickup:            { bg: '#EEF2FF', text: '#4338CA' },
  picked_up:                 { bg: '#FFF7ED', text: '#C2410C' },
  in_transit:                { bg: '#FFF7ED', text: '#C2410C' },
  out_for_delivery:                 { bg: '#FFF7ED', text: '#C2410C' },
  pending_admin_pickup_confirmation:{ bg: '#FFFBEB', text: '#B45309' },
  pending_admin_confirmation:       { bg: '#F0FDF4', text: '#15803D' },
  delivered:                 { bg: '#F0FDF4', text: GREEN },
  cancelled:                 { bg: '#FEF2F2', text: '#DC2626' },
  vendor_rejected:           { bg: '#FEF2F2', text: '#DC2626' },
};

function StepRow({ step, isActive, isDone, isLast }: {
  step: typeof STEPS[0]; isActive: boolean; isDone: boolean; isLast: boolean;
}) {
  const dotColor  = isDone || isActive ? PRIMARY : BORDER;
  const lineColor = isDone ? PRIMARY : BORDER;
  return (
    <View style={st.row}>
      <View style={st.left}>
        <View style={[st.dot, { borderColor: dotColor, backgroundColor: isDone ? PRIMARY : isActive ? '#EFF6FF' : SURFACE }]}>
          {isDone
            ? <CheckCircle2 size={12} color="#fff" strokeWidth={3} />
            : <View style={[st.dotInner, { backgroundColor: isActive ? PRIMARY : BORDER }]} />
          }
        </View>
        {!isLast && <View style={[st.connector, { backgroundColor: lineColor }]} />}
      </View>
      <View style={[st.content, isLast && { paddingBottom: 0 }]}>
        <Text style={[st.label, (isDone || isActive) && { color: TEXT }]}>{step.label}</Text>
        <Text style={st.sub}>{step.sub}</Text>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  row:       { flexDirection: 'row', gap: 14 },
  left:      { alignItems: 'center', width: 24 },
  dot:       { width: 24, height: 24, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  dotInner:  { width: 8, height: 8, borderRadius: 4 },
  connector: { width: 2, flex: 1, minHeight: 28, marginVertical: 2 },
  content:   { flex: 1, paddingBottom: 20, paddingTop: 2 },
  label:     { fontFamily: FontFamily.semiBold, fontSize: 13.5, color: MUTED },
  sub:       { fontFamily: FontFamily.regular,  fontSize: 12,   color: HINT, marginTop: 2 },
});

function StarRow({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'center', paddingVertical: 8 }}>
      {[1, 2, 3, 4, 5].map(n => (
        <Pressable key={n} onPress={() => onChange(n)} hitSlop={6}>
          <Star
            size={36}
            color={n <= value ? STAR : BORDER}
            fill={n <= value ? STAR : 'transparent'}
            strokeWidth={1.5}
          />
        </Pressable>
      ))}
    </View>
  );
}

export default function OrderDetailScreen() {
  const { id }   = useLocalSearchParams<{ id: string }>();
  const router   = useRouter();
  const { user } = useAuth();

  const [order,         setOrder]         = useState<OrderDetail | null>(null);
  const [loading,       setLoading]       = useState(true);
  const [refreshing,    setRefreshing]    = useState(false);
  const [hasRated,      setHasRated]      = useState(false);
  const [rating,        setRating]        = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const [submitting,    setSubmitting]    = useState(false);
  const [ratingDone,    setRatingDone]    = useState(false);
  const [showRatingPopup, setShowRatingPopup] = useState(false);
  const [popupShownFor, setPopupShownFor]   = useState<string | null>(null);
  const [feedbackTags, setFeedbackTags]     = useState<string[]>([]);

  const load = useCallback(async (silent = false) => {
    if (!id) return;
    if (!silent) setLoading(true);

    const { data } = await supabase
      .from('orders')
      .select('id, order_number, status, total_amount, created_at, transporter_id, addresses!orders_delivery_address_id_fkey(line1, city, state), order_items(id, product_name, quantity, unit, unit_price, line_total)')
      .eq('id', id).maybeSingle();

    if (data) {
      const d = data as any;

      // Resolve transporter — prefer order's direct transporter_id (broadcast accept),
      // fall back to transport_request (vendor-booked specific transport)
      let transporter: Transporter | undefined;
      let transporterId: string | null = d.transporter_id ?? null;

      if (!transporterId) {
        const { data: tr } = await supabase
          .from('transport_requests')
          .select('assigned_transporter_id')
          .eq('order_id', id)
          .in('status', ['accepted', 'in_progress', 'completed'])
          .maybeSingle();
        transporterId = tr?.assigned_transporter_id ?? null;
      }

      if (transporterId) {
        const { data: tp } = await supabase
          .from('profiles')
          .select('id, full_name, phone')
          .eq('id', transporterId)
          .maybeSingle();
        if (tp) {
          transporter = { id: (tp as any).id, name: (tp as any).full_name ?? 'Transporter', phone: (tp as any).phone };
        } else {
          // Fallback so rating popup still opens even if transporter profile is unreadable
          transporter = { id: transporterId, name: 'Transporter' };
        }
      }

      setOrder({
        id: d.id, order_number: d.order_number, status: d.status, total_amount: d.total_amount,
        created_at: d.created_at,
        delivery_address: d.addresses
          ? [d.addresses.line1, d.addresses.city, d.addresses.state].filter(Boolean).join(', ')
          : undefined,
        items: d.order_items ?? [],
        transporter,
      });

      // Check if already rated
      if (user?.id) {
        const { data: rv } = await supabase
          .from('transport_reviews')
          .select('id')
          .eq('order_id', id)
          .eq('reviewer_id', user.id)
          .maybeSingle();
        setHasRated(!!rv);
        setRatingDone(!!rv);
      }
    }
    setLoading(false);
  }, [id, user?.id]);

  useEffect(() => {
    load();
    if (!id) return;
    const ch = supabase.channel(`order-detail-rt:${id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${id}` }, () => load(true))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load, id]);

  const onRefresh = async () => { setRefreshing(true); await load(true); setRefreshing(false); };

  // Auto-open rating popup once when the admin confirms delivery
  useEffect(() => {
    if (
      order
      && order.status === 'delivered'
      && order.transporter
      && !hasRated
      && popupShownFor !== order.id
    ) {
      setShowRatingPopup(true);
      setPopupShownFor(order.id);
    }
  }, [order?.id, order?.status, hasRated, popupShownFor]);

  async function submitRating() {
    if (!rating || !user?.id || !order?.transporter?.id || !id) return;
    setSubmitting(true);
    const tagPrefix = feedbackTags.length ? `[${feedbackTags.join(' · ')}] ` : '';
    const finalComment = (tagPrefix + ratingComment.trim()).trim();
    await supabase.from('transport_reviews').insert({
      order_id: id,
      reviewer_id: user.id,
      reviewer_role: 'customer',
      reviewee_id: order.transporter.id,
      rating,
      comment: finalComment || null,
    });
    setRatingDone(true);
    setHasRated(true);
    setSubmitting(false);
    setTimeout(() => setShowRatingPopup(false), 1500);
  }

  if (loading) return (
    <View style={{ flex: 1, backgroundColor: BG, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator color={PRIMARY} size="large" />
    </View>
  );

  if (!order) return (
    <View style={{ flex: 1, backgroundColor: BG, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
      <Package size={48} color={HINT} strokeWidth={1.4} />
      <Text style={{ fontFamily: FontFamily.bold, fontSize: 17, color: TEXT }}>Order not found</Text>
      <Pressable onPress={() => router.back()} style={{ backgroundColor: PRIMARY, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 11 }}>
        <Text style={{ fontFamily: FontFamily.bold, fontSize: 14, color: '#fff' }}>Go Back</Text>
      </Pressable>
    </View>
  );

  const stepIdx    = getStepIndex(order.status);
  const sc         = STATUS_COLORS[order.status] ?? { bg: '#F1F5F9', text: MUTED };
  const isRejected = ['vendor_rejected', 'cancelled'].includes(order.status);
  const isDelivered= ['delivered', 'pending_admin_confirmation'].includes(order.status);
  const canChat    = ['transporter_accepted', 'out_for_pickup', 'pending_admin_pickup_confirmation', 'picked_up', 'in_transit', 'out_for_delivery', 'pending_admin_confirmation'].includes(order.status);

  return (
    <View style={s.root}>
      {/* Header */}
      <View style={[s.header, { paddingTop: PT > 0 ? PT : 12 }]}>
        <Pressable onPress={() => router.back()} style={s.backBtn} hitSlop={12}>
          <ArrowLeft size={20} color={TEXT} strokeWidth={2} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={s.headerSub}>Order Tracking</Text>
          <Text style={s.headerTitle}>#{order.order_number}</Text>
        </View>
        <View style={[s.statusChip, { backgroundColor: sc.bg }]}>
          <Text style={[s.statusChipTxt, { color: sc.text }]}>
            {STATUS_LABELS[order.status] ?? order.status}
          </Text>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Status banner */}
        {isRejected ? (
          <View style={[s.banner, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
            <AlertCircle size={20} color="#DC2626" strokeWidth={2} />
            <View style={{ flex: 1 }}>
              <Text style={[s.bannerTitle, { color: '#DC2626' }]}>Order {STATUS_LABELS[order.status]}</Text>
              <Text style={s.bannerSub}>This order has been rejected or cancelled.</Text>
            </View>
          </View>
        ) : (
          <View style={[s.banner, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}>
            <CheckCircle2 size={20} color={PRIMARY} strokeWidth={2} />
            <View style={{ flex: 1 }}>
              <Text style={[s.bannerTitle, { color: PRIMARY }]}>{STATUS_LABELS[order.status] ?? order.status}</Text>
              <Text style={s.bannerSub}>
                {order.status === 'placed'                    ? 'Waiting for admin to review your order' :
                 order.status === 'vendor_pending'            ? 'Admin approved! Vendor will accept shortly' :
                 order.status === 'vendor_accepted'           ? 'Vendor is preparing — transport booking in progress' :
                 order.status === 'transporter_pending'       ? 'Finding a transporter for your delivery' :
                 order.status === 'transporter_accepted'      ? 'Transporter assigned to your delivery' :
                 order.status === 'out_for_pickup'            ? 'Transporter heading to vendor for pickup' :
                 order.status === 'pending_admin_pickup_confirmation' ? 'Transporter has picked up your order — admin verifying' :
                 order.status === 'picked_up'                 ? 'Order picked up — heading your way!' :
                 order.status === 'in_transit'                ? 'Your order is on the way!' :
                 order.status === 'out_for_delivery'          ? 'Almost there — out for delivery!' :
                 order.status === 'pending_admin_confirmation'? 'Order delivered — awaiting admin confirmation' :
                 order.status === 'delivered'                 ? 'Order successfully delivered!' : 'Order is being processed'}
              </Text>
            </View>
          </View>
        )}

        {/* Transporter card */}
        {order.transporter && (
          <View style={s.card}>
            <View style={s.transporterHeader}>
              <View style={s.transporterIconBox}>
                <Truck size={18} color={PRIMARY} strokeWidth={2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.transporterLabel}>Your Delivery Partner</Text>
                <Text style={s.transporterName}>{order.transporter.name}</Text>
              </View>
              {order.transporter.phone && (
                <View style={s.callBtn}>
                  <Phone size={14} color={GREEN} strokeWidth={2} />
                  <Text style={s.callBtnTxt}>{order.transporter.phone}</Text>
                </View>
              )}
            </View>
            {canChat && (
              <Pressable
                style={s.chatBtn}
                onPress={() => router.push({
                  pathname: '/customer/chat',
                  params: { orderId: order.id, transporterName: order.transporter?.name ?? 'Transporter' },
                } as never)}
              >
                <MessageCircle size={16} color="#fff" strokeWidth={2} />
                <Text style={s.chatBtnTxt}>Chat with {order.transporter.name.split(' ')[0]}</Text>
              </Pressable>
            )}
          </View>
        )}

        {/* Timeline */}
        {!isRejected && (
          <View style={s.card}>
            <Text style={s.cardTitle}>Order Timeline</Text>
            {STEPS.map((step, i) => (
              <StepRow key={step.key} step={step} isActive={stepIdx === i} isDone={stepIdx > i} isLast={i === STEPS.length - 1} />
            ))}
          </View>
        )}

        {/* Rating card */}
        {isDelivered && order.transporter && (
          <View style={s.card}>
            {ratingDone ? (
              <View style={{ alignItems: 'center', gap: 8, paddingVertical: 8 }}>
                <CheckCircle2 size={32} color={GREEN} strokeWidth={2} />
                <Text style={[s.cardTitle, { textAlign: 'center' }]}>Thanks for your feedback!</Text>
                <Text style={{ fontFamily: FontFamily.regular, fontSize: 13, color: MUTED, textAlign: 'center' }}>
                  Your rating has been submitted.
                </Text>
              </View>
            ) : (
              <>
                <Text style={s.cardTitle}>Rate Your Experience</Text>
                <Text style={{ fontFamily: FontFamily.regular, fontSize: 13, color: MUTED }}>
                  How was your delivery by {order.transporter.name.split(' ')[0]}?
                </Text>
                <StarRow value={rating} onChange={setRating} />
                <TextInput
                  style={s.ratingInput}
                  placeholder="Leave a comment (optional)"
                  placeholderTextColor={HINT}
                  value={ratingComment}
                  onChangeText={setRatingComment}
                  multiline
                  maxLength={300}
                />
                <Pressable
                  style={[s.ratingBtn, (!rating || submitting) && { opacity: 0.5 }]}
                  onPress={submitRating}
                  disabled={!rating || submitting}
                >
                  {submitting
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={s.ratingBtnTxt}>Submit Rating</Text>}
                </Pressable>
              </>
            )}
          </View>
        )}

        {/* Items */}
        {order.items.length > 0 && (
          <View style={s.card}>
            <View style={s.itemsHeader}>
              <Text style={s.cardTitle}>Items Ordered</Text>
              <View style={s.countChip}>
                <Text style={s.countChipTxt}>
                  {order.items.length} {order.items.length === 1 ? 'item' : 'items'}
                </Text>
              </View>
            </View>
            <View style={s.itemList}>
              {order.items.map((item, i) => (
                <View
                  key={item.id}
                  style={[s.itemRow, i < order.items.length - 1 && s.itemRowDivider]}
                >
                  <View style={s.thumbWrap}>
                    <Image
                      source={{ uri: getProductImage(item.product_name, { size: 200 }) }}
                      style={s.thumb}
                      contentFit="cover"
                      transition={150}
                    />
                  </View>
                  <View style={s.itemBody}>
                    <Text style={s.itemName} numberOfLines={2}>{item.product_name}</Text>
                    <Text style={s.itemMeta}>
                      {item.quantity} {item.unit}{'  ·  '}
                      <Text style={s.itemMetaStrong}>₹{item.unit_price.toLocaleString('en-IN')}</Text>
                      <Text style={s.itemMeta}> / {item.unit}</Text>
                    </Text>
                  </View>
                  <Text style={s.itemTotal}>₹{item.line_total.toLocaleString('en-IN')}</Text>
                </View>
              ))}
            </View>
            <View style={s.totalRow}>
              <Text style={s.totalLabel}>Total</Text>
              <Text style={s.totalVal}>₹{order.total_amount.toLocaleString('en-IN')}</Text>
            </View>
          </View>
        )}

        {/* Delivery address */}
        {order.delivery_address && (
          <View style={s.card}>
            <Text style={s.cardTitle}>Delivery Address</Text>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
              <MapPin size={16} color={PRIMARY} strokeWidth={2} style={{ marginTop: 1 }} />
              <Text style={s.addressTxt}>{order.delivery_address}</Text>
            </View>
          </View>
        )}

        {/* Order info */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Order Info</Text>
          <View style={s.infoRow}>
            <Text style={s.infoLbl}>Order ID</Text>
            <Text style={s.infoVal}>#{order.order_number}</Text>
          </View>
          <View style={s.infoRow}>
            <Text style={s.infoLbl}>Placed On</Text>
            <Text style={s.infoVal}>
              {new Date(order.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
          <View style={s.infoRow}>
            <Text style={s.infoLbl}>Status</Text>
            <View style={[s.statusPill, { backgroundColor: sc.bg }]}>
              <Text style={[s.statusPillTxt, { color: sc.text }]}>{STATUS_LABELS[order.status] ?? order.status}</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* ── Auto-popup rating when admin confirms delivery ───────────────── */}
      <Modal
        visible={showRatingPopup}
        animationType="fade"
        transparent
        onRequestClose={() => setShowRatingPopup(false)}
      >
        <Pressable style={rm.backdrop} onPress={() => setShowRatingPopup(false)}>
          <Pressable style={rm.card} onPress={() => {}}>
            {ratingDone ? (
              <View style={{ alignItems: 'center', gap: 10, paddingVertical: 28 }}>
                <View style={rm.successCircle}>
                  <CheckCircle2 size={36} color={GREEN} strokeWidth={2.2} />
                </View>
                <Text style={rm.title}>Thanks for your feedback!</Text>
                <Text style={rm.sub}>Your rating helps us improve.</Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={rm.topRow}>
                  <View style={rm.bikerIcon}>
                    <Truck size={20} color="#fff" strokeWidth={2} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={rm.title}>How was the delivery experience?</Text>
                    <Text style={rm.sub} numberOfLines={1}>
                      with {order?.transporter?.name ?? 'the delivery partner'}
                    </Text>
                  </View>
                  <Pressable hitSlop={10} onPress={() => setShowRatingPopup(false)}>
                    <Text style={{ fontSize: 22, color: MUTED, paddingHorizontal: 6 }}>×</Text>
                  </Pressable>
                </View>

                <View style={rm.hr} />

                {/* Pill rating */}
                <View style={rm.pillRow}>
                  {RATING_PILLS.map(p => {
                    const selected = rating === p.value;
                    return (
                      <Pressable
                        key={p.value}
                        style={[
                          rm.pill,
                          { borderColor: p.color },
                          selected && { backgroundColor: p.color },
                        ]}
                        onPress={() => setRating(p.value)}
                      >
                        <Text style={[rm.pillNum, { color: selected ? '#fff' : p.color }]}>
                          {p.value}
                        </Text>
                        <Text style={[rm.pillLabel, selected && { color: '#fff' }]}>
                          {p.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                {/* Feedback chips — appear after a rating is selected */}
                {rating > 0 && (
                  <>
                    <View style={rm.hr} />
                    <Text style={rm.chipsHeader}>
                      {rating <= 2 ? 'What went wrong?' : rating === 3 ? 'What was OK?' : 'Tell us what you liked?'}
                    </Text>
                    <View style={rm.chipsWrap}>
                      {FEEDBACK_TAGS.map(t => {
                        const on = feedbackTags.includes(t);
                        return (
                          <Pressable
                            key={t}
                            style={[rm.chip, on && rm.chipOn]}
                            onPress={() => setFeedbackTags(prev =>
                              prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]
                            )}
                          >
                            <Text style={[rm.chipTxt, on && rm.chipTxtOn]}>{t}</Text>
                          </Pressable>
                        );
                      })}
                    </View>

                    <Text style={rm.tellMoreLabel}>Tell us more</Text>
                    <TextInput
                      style={rm.input}
                      placeholder="Add any details (optional)"
                      placeholderTextColor={HINT}
                      value={ratingComment}
                      onChangeText={setRatingComment}
                      multiline
                      maxLength={300}
                    />
                    <Text style={rm.helper}>Your word helps us improve our delivery experience</Text>
                  </>
                )}

                <View style={rm.actions}>
                  <Pressable style={rm.laterBtn} onPress={() => setShowRatingPopup(false)}>
                    <Text style={rm.laterTxt}>Later</Text>
                  </Pressable>
                  <Pressable
                    style={[rm.submitBtn, (!rating || submitting) && { opacity: 0.5 }]}
                    onPress={submitRating}
                    disabled={!rating || submitting}
                  >
                    {submitting
                      ? <ActivityIndicator color="#fff" size="small" />
                      : <Text style={rm.submitTxt}>Submit Rating</Text>}
                  </Pressable>
                </View>
              </ScrollView>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const rm = StyleSheet.create({
  backdrop: {
    flex: 1, backgroundColor: 'rgba(15,23,42,0.55)',
    alignItems: 'center', justifyContent: 'center', padding: 20,
  },
  card: {
    width: '100%', maxWidth: 460, maxHeight: '92%',
    backgroundColor: '#fff', borderRadius: 16, padding: 22,
  },

  topRow:    { flexDirection: 'row', alignItems: 'center', gap: 12 },
  bikerIcon: {
    width: 44, height: 44, borderRadius: 10,
    backgroundColor: PRIMARY,
    alignItems: 'center', justifyContent: 'center',
  },
  title:     { fontFamily: FontFamily.bold, fontSize: 16, color: '#0F172A', letterSpacing: -0.2 },
  sub:       { fontFamily: FontFamily.regular, fontSize: 12, color: '#64748B', marginTop: 2 },

  hr:        { height: 1, backgroundColor: '#E2E8F0', marginVertical: 16 },

  pillRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 6 },
  pill: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingVertical: 8, paddingHorizontal: 4,
    borderRadius: 99, borderWidth: 1.5, backgroundColor: '#fff',
    gap: 2,
  },
  pillNum:   { fontFamily: FontFamily.bold, fontSize: 16 },
  pillLabel: { fontFamily: FontFamily.medium, fontSize: 10, color: '#475569', textAlign: 'center' },

  chipsHeader: { fontFamily: FontFamily.bold, fontSize: 14, color: '#0F172A', marginBottom: 10 },
  chipsWrap:   { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 99, backgroundColor: '#F1F5F9',
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  chipOn:     { backgroundColor: '#EFF6FF', borderColor: PRIMARY },
  chipTxt:    { fontFamily: FontFamily.medium, fontSize: 12, color: '#475569' },
  chipTxtOn:  { color: PRIMARY, fontFamily: FontFamily.semiBold },

  tellMoreLabel: { fontFamily: FontFamily.semiBold, fontSize: 13, color: '#0F172A', marginTop: 16, marginBottom: 8 },
  helper:        { fontFamily: FontFamily.regular, fontSize: 11, color: '#94A3B8', marginTop: 6 },

  successCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#DCFCE7',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },
  input: {
    borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10,
    padding: 12, fontFamily: FontFamily.regular, fontSize: 13,
    color: '#0F172A', minHeight: 72, textAlignVertical: 'top' as const,
  },
  actions:   { flexDirection: 'row', gap: 10, marginTop: 20 },
  laterBtn:  {
    flex: 1, paddingVertical: 12, borderRadius: 10,
    backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center',
  },
  laterTxt:  { fontFamily: FontFamily.semiBold, fontSize: 14, color: '#475569' },
  submitBtn: {
    flex: 1.4, paddingVertical: 12, borderRadius: 10,
    backgroundColor: '#15803D', alignItems: 'center', justifyContent: 'center',
  },
  submitTxt: { fontFamily: FontFamily.bold, fontSize: 14, color: '#fff' },
});

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
  headerSub:   { fontFamily: FontFamily.regular, fontSize: 11, color: MUTED },
  headerTitle: { fontFamily: FontFamily.bold, fontSize: 18, color: TEXT, letterSpacing: -0.3 },
  statusChip:  { borderRadius: 99, paddingHorizontal: 10, paddingVertical: 5 },
  statusChipTxt: { fontFamily: FontFamily.semiBold, fontSize: 11 },

  banner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    borderRadius: 14, padding: 14, borderWidth: 1,
  },
  bannerTitle: { fontFamily: FontFamily.bold, fontSize: 14, lineHeight: 20 },
  bannerSub:   { fontFamily: FontFamily.regular, fontSize: 12, color: MUTED, marginTop: 2, lineHeight: 17 },

  card: {
    backgroundColor: SURFACE, borderRadius: 14, padding: 16, gap: 14,
    borderWidth: 1, borderColor: BORDER,
    shadowColor: TEXT, shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 1 }, elevation: 1,
  },
  cardTitle: { fontFamily: FontFamily.bold, fontSize: 15, color: TEXT },

  transporterHeader:  { flexDirection: 'row', alignItems: 'center', gap: 12 },
  transporterIconBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center' },
  transporterLabel:   { fontFamily: FontFamily.regular, fontSize: 11, color: MUTED },
  transporterName:    { fontFamily: FontFamily.bold, fontSize: 16, color: TEXT, letterSpacing: -0.2 },
  callBtn:    { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#F0FDF4', borderRadius: 99, paddingHorizontal: 10, paddingVertical: 7, borderWidth: 1, borderColor: '#BBF7D0' },
  callBtnTxt: { fontFamily: FontFamily.semiBold, fontSize: 12, color: GREEN },
  chatBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: PRIMARY, borderRadius: 10, paddingVertical: 12, marginTop: 2 },
  chatBtnTxt: { fontFamily: FontFamily.bold, fontSize: 14, color: '#fff' },

  ratingInput: {
    borderWidth: 1, borderColor: BORDER, borderRadius: 10,
    padding: 12, fontFamily: FontFamily.regular, fontSize: 13, color: TEXT,
    minHeight: 72, textAlignVertical: 'top',
  },
  ratingBtn: {
    backgroundColor: GREEN, borderRadius: 10, paddingVertical: 13,
    alignItems: 'center', justifyContent: 'center',
  },
  ratingBtnTxt: { fontFamily: FontFamily.bold, fontSize: 14, color: '#fff' },

  itemsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  countChip: {
    backgroundColor: '#EFF6FF', borderRadius: 99,
    paddingHorizontal: 9, paddingVertical: 3,
    borderWidth: 1, borderColor: '#BFDBFE',
  },
  countChipTxt: { fontFamily: FontFamily.semiBold, fontSize: 11, color: PRIMARY, letterSpacing: 0.1 },
  itemList:  { gap: 0 },
  itemRow:   { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  itemRowDivider: { borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  thumbWrap: {
    width: 52, height: 52, borderRadius: 10, overflow: 'hidden',
    backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: BORDER,
  },
  thumb:     { width: '100%', height: '100%' },
  itemBody:  { flex: 1, gap: 3 },
  itemName:  { fontFamily: FontFamily.semiBold, fontSize: 13.5, color: TEXT, lineHeight: 18 },
  itemMeta:  { fontFamily: FontFamily.regular, fontSize: 12, color: MUTED },
  itemMetaStrong: { fontFamily: FontFamily.semiBold, color: TEXT },
  itemTotal: { fontFamily: FontFamily.bold, fontSize: 14, color: TEXT, letterSpacing: -0.1 },

  totalRow:   { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: BORDER, paddingTop: 12 },
  totalLabel: { fontFamily: FontFamily.semiBold, fontSize: 14, color: MUTED },
  totalVal:   { fontFamily: FontFamily.bold, fontSize: 17, color: PRIMARY },

  addressTxt: { flex: 1, fontFamily: FontFamily.regular, fontSize: 13, color: MUTED, lineHeight: 19 },

  infoRow:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  infoLbl:       { fontFamily: FontFamily.regular, fontSize: 13, color: MUTED },
  infoVal:       { fontFamily: FontFamily.semiBold, fontSize: 13, color: TEXT },
  statusPill:    { borderRadius: 99, paddingHorizontal: 10, paddingVertical: 4 },
  statusPillTxt: { fontFamily: FontFamily.semiBold, fontSize: 11 },
});
