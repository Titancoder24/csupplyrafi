/**
 * ActionPopup — a soft, dismissable modal for action-required events.
 * Used by realtime-driven approval flows (new order, new product, pickup/delivery confirm).
 *
 * Three CTAs: primary accept, secondary reject (optional), tertiary "Later" (always).
 */
import React from 'react';
import {
  View, Text, Pressable, Modal, StyleSheet, ActivityIndicator,
} from 'react-native';
import { CheckCircle2, XCircle, Clock } from 'lucide-react-native';
import { FontFamily } from '@/constants/theme';

export type ActionPopupDetail = { label: string; value: string };

export type ActionPopupProps = {
  visible: boolean;
  icon?: React.ReactNode;
  iconBg?: string;
  title: string;
  message: string;
  details?: ActionPopupDetail[];
  // Primary action (e.g. "Approve")
  primaryLabel: string;
  primaryColor?: string;       // bg color of the primary button
  onPrimary: () => Promise<void> | void;
  // Optional secondary action (e.g. "Reject")
  secondaryLabel?: string;
  onSecondary?: () => Promise<void> | void;
  // Tertiary action (always "Later")
  onLater: () => void;
  loading?: boolean;
};

const INK_900 = '#0F172A';
const INK_500 = '#64748B';
const INK_100 = '#F1F5F9';
const BORDER  = '#E2E8F0';

export function ActionPopup({
  visible,
  icon,
  iconBg = '#EFF6FF',
  title,
  message,
  details,
  primaryLabel,
  primaryColor = '#15803D',
  onPrimary,
  secondaryLabel,
  onSecondary,
  onLater,
  loading = false,
}: ActionPopupProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onLater}>
      <Pressable style={s.backdrop} onPress={onLater}>
        <Pressable style={s.card} onPress={() => {}}>
          {icon && (
            <View style={[s.iconBox, { backgroundColor: iconBg }]}>
              {icon}
            </View>
          )}
          <Text style={s.title}>{title}</Text>
          <Text style={s.message}>{message}</Text>

          {details && details.length > 0 && (
            <View style={s.details}>
              {details.map((d, i) => (
                <View key={i} style={s.detailRow}>
                  <Text style={s.detailLabel}>{d.label}</Text>
                  <Text style={s.detailValue}>{d.value}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={s.actions}>
            <Pressable style={s.laterBtn} onPress={onLater} disabled={loading}>
              <Clock size={14} color={INK_500} strokeWidth={2} />
              <Text style={s.laterTxt}>Later</Text>
            </Pressable>

            {secondaryLabel && onSecondary && (
              <Pressable
                style={[s.rejectBtn, loading && { opacity: 0.5 }]}
                onPress={onSecondary}
                disabled={loading}
              >
                <XCircle size={15} color="#fff" strokeWidth={2.2} />
                <Text style={s.rejectTxt}>{secondaryLabel}</Text>
              </Pressable>
            )}

            <Pressable
              style={[s.primaryBtn, { backgroundColor: primaryColor }, loading && { opacity: 0.5 }]}
              onPress={onPrimary}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <CheckCircle2 size={15} color="#fff" strokeWidth={2.4} />
                  <Text style={s.primaryTxt}>{primaryLabel}</Text>
                </>
              )}
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: {
    flex: 1, backgroundColor: 'rgba(15,23,42,0.55)',
    alignItems: 'center', justifyContent: 'center', padding: 20,
  },
  card: {
    width: '100%', maxWidth: 440, backgroundColor: '#fff',
    borderRadius: 16, padding: 24, alignItems: 'center', gap: 8,
  },
  iconBox: {
    width: 60, height: 60, borderRadius: 30,
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  title:   { fontFamily: FontFamily.bold, fontSize: 18, color: INK_900, textAlign: 'center', letterSpacing: -0.3 },
  message: { fontFamily: FontFamily.regular, fontSize: 13, color: INK_500, textAlign: 'center', lineHeight: 19, marginBottom: 14 },

  details: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1, borderColor: BORDER,
    paddingVertical: 10, paddingHorizontal: 14,
    gap: 7,
    marginBottom: 14,
  },
  detailRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    gap: 10,
  },
  detailLabel: {
    fontFamily: FontFamily.regular,
    fontSize: 12, color: INK_500,
    minWidth: 78,
  },
  detailValue: {
    flex: 1,
    fontFamily: FontFamily.semiBold,
    fontSize: 12.5, color: INK_900,
  },

  actions: { flexDirection: 'row', flexWrap: 'wrap' as const, gap: 8, width: '100%', justifyContent: 'flex-end' },
  laterBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 14, paddingVertical: 11, borderRadius: 10,
    backgroundColor: INK_100,
  },
  laterTxt: { fontFamily: FontFamily.semiBold, fontSize: 13, color: INK_500 },

  rejectBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 14, paddingVertical: 11, borderRadius: 10,
    backgroundColor: '#B91C1C',
  },
  rejectTxt: { fontFamily: FontFamily.bold, fontSize: 13, color: '#fff' },

  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 16, paddingVertical: 11, borderRadius: 10,
    flexShrink: 1,
  },
  primaryTxt: { fontFamily: FontFamily.bold, fontSize: 13, color: '#fff' },
});
