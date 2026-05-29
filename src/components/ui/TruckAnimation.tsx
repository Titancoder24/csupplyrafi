/**
 * TruckAnimation — a moving truck across a dashed route line.
 * Used on the customer order-detail screen when status is picked_up,
 * in_transit, or out_for_delivery to convey progress.
 *
 * Pure RN Animated — no external dependencies.
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet, Easing } from 'react-native';
import { Truck, MapPin, Building2 } from 'lucide-react-native';
import { FontFamily } from '@/constants/theme';

type Stage =
  | 'transporter_accepted'
  | 'out_for_pickup'
  | 'pending_admin_pickup_confirmation'
  | 'picked_up'
  | 'in_transit'
  | 'out_for_delivery'
  | 'pending_admin_confirmation';

const STAGE_PROGRESS: Record<Stage, number> = {
  transporter_accepted:              0.05,
  out_for_pickup:                    0.10,
  pending_admin_pickup_confirmation: 0.25,
  picked_up:                         0.40,
  in_transit:                        0.65,
  out_for_delivery:                  0.85,
  pending_admin_confirmation:        1.0,
};

const STAGE_LABEL: Record<Stage, { title: string; sub: string }> = {
  transporter_accepted:              { title: 'Transporter Assigned', sub: 'On the way to pick up your order' },
  out_for_pickup:                    { title: 'Going to Vendor',      sub: 'Transporter heading to pickup' },
  pending_admin_pickup_confirmation: { title: 'Pickup Reported',      sub: 'Admin verifying pickup' },
  picked_up:                         { title: 'Picked Up',            sub: 'Your order is with the transporter' },
  in_transit:                        { title: 'In Transit',           sub: 'On the way to your address' },
  out_for_delivery:                  { title: 'Out for Delivery',     sub: 'Almost there!' },
  pending_admin_confirmation:        { title: 'Awaiting Confirm',     sub: 'Delivery reported — admin verifying' },
};

interface Props {
  status: string;
  width?: number;
}

export function TruckAnimation({ status, width = 320 }: Props) {
  const stage = (Object.keys(STAGE_PROGRESS) as Stage[]).includes(status as Stage)
    ? (status as Stage)
    : null;

  if (!stage) return null;

  const TRACK_PADDING = 32;          // space inside the card for pickup/drop pins
  const trackW = width - TRACK_PADDING * 2;
  const targetProgress = STAGE_PROGRESS[stage];

  const progressX = useRef(new Animated.Value(0)).current;
  const wiggle    = useRef(new Animated.Value(0)).current;

  // Animate to the stage's target position
  useEffect(() => {
    Animated.timing(progressX, {
      toValue: targetProgress * trackW,
      duration: 1200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [targetProgress, trackW, progressX]);

  // Subtle wiggle to convey motion (loop)
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(wiggle, { toValue: 1, duration: 600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(wiggle, { toValue: 0, duration: 600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [wiggle]);

  const wiggleY = wiggle.interpolate({ inputRange: [0, 1], outputRange: [0, -2] });

  const label = STAGE_LABEL[stage];

  return (
    <View style={[s.wrap, { width }]}>
      {/* Header label */}
      <View style={s.headerRow}>
        <View style={s.pulseDot} />
        <Text style={s.headerTitle}>{label.title}</Text>
      </View>
      <Text style={s.headerSub}>{label.sub}</Text>

      {/* Route track */}
      <View style={[s.track, { width: trackW, marginHorizontal: TRACK_PADDING / 2 }]}>
        {/* Dashed background line */}
        <View style={s.dashLine} />

        {/* Filled portion (progress) */}
        <Animated.View
          style={[
            s.fillLine,
            {
              width: progressX,
            },
          ]}
        />

        {/* Pickup pin (left) */}
        <View style={[s.pin, { left: -14 }]}>
          <View style={[s.pinDot, { backgroundColor: '#1D4ED8' }]}>
            <Building2 size={10} color="#FFFFFF" strokeWidth={2.4} />
          </View>
        </View>

        {/* Drop pin (right) */}
        <View style={[s.pin, { right: -14 }]}>
          <View style={[s.pinDot, { backgroundColor: '#15803D' }]}>
            <MapPin size={10} color="#FFFFFF" strokeWidth={2.4} />
          </View>
        </View>

        {/* Moving truck */}
        <Animated.View
          style={[
            s.truckWrap,
            {
              transform: [
                { translateX: progressX },
                { translateY: wiggleY },
              ],
            },
          ]}
        >
          <View style={s.truckCircle}>
            <Truck size={16} color="#FFFFFF" strokeWidth={2.2} />
          </View>
        </Animated.View>
      </View>

      {/* Pickup / Drop labels under the track */}
      <View style={s.labelRow}>
        <Text style={s.labelTxt}>Pickup</Text>
        <Text style={s.labelTxt}>Your address</Text>
      </View>
    </View>
  );
}

const PRIMARY = '#1D4ED8';

const s = StyleSheet.create({
  wrap: {
    backgroundColor: '#fff',
    borderRadius: 14, borderWidth: 1, borderColor: '#E2E8F0',
    padding: 16, gap: 8,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  pulseDot:  {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: '#F97316',
  },
  headerTitle: { fontFamily: FontFamily.bold, fontSize: 14.5, color: '#0F172A', letterSpacing: -0.2 },
  headerSub:   { fontFamily: FontFamily.regular, fontSize: 12, color: '#64748B' },

  /* Track */
  track: {
    height: 50,
    marginTop: 22,
    justifyContent: 'center',
    position: 'relative' as const,
  },
  dashLine: {
    position: 'absolute' as const, left: 0, right: 0, top: 23,
    height: 4, borderRadius: 2,
    backgroundColor: '#E2E8F0',
    borderStyle: 'dashed',
  },
  fillLine: {
    position: 'absolute' as const, left: 0, top: 23,
    height: 4, borderRadius: 2,
    backgroundColor: PRIMARY,
  },
  pin: {
    position: 'absolute' as const, top: 13,
    width: 28, height: 28,
    alignItems: 'center', justifyContent: 'center',
  },
  pinDot: {
    width: 22, height: 22, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#fff',
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 3, shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  truckWrap: {
    position: 'absolute' as const, top: 8, left: -16,
  },
  truckCircle: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: PRIMARY,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#fff',
    shadowColor: PRIMARY, shadowOpacity: 0.4, shadowRadius: 8, shadowOffset: { width: 0, height: 3 },
    elevation: 6,
  },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4, marginTop: 2 },
  labelTxt: { fontFamily: FontFamily.semiBold, fontSize: 11, color: '#64748B' },
});
