/**
 * ActionPopup — production SaaS modal for action-required events.
 * Linear/Stripe density: left-aligned title, compact icon chip, structured
 * detail rows, footer-aligned actions (Later · Reject · Primary).
 */
import React from 'react';
import {
  View, Text, Pressable, Modal, StyleSheet, ActivityIndicator,
} from 'react-native';
import { CheckCircle2, XCircle, X } from 'lucide-react-native';
import { FontFamily, Radius, Shadow } from '@/constants/theme';

export type ActionPopupDetail = { label: string; value: string };

export type ActionPopupProps = {
  visible: boolean;
  icon?: React.ReactNode;
  iconBg?: string;
  title: string;
  message: string;
  details?: ActionPopupDetail[];
  primaryLabel: string;
  primaryColor?: string;
  onPrimary: () => Promise<void> | void;
  secondaryLabel?: string;
  onSecondary?: () => Promise<void> | void;
  onLater: () => void;
  loading?: boolean;
};

const INK_900 = '#0F172A';
const INK_700 = '#334155';
const INK_500 = '#64748B';
const INK_300 = '#CBD5E1';
const INK_100 = '#F1F5F9';
const INK_50  = '#F8FAFC';
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
          {/* Header */}
          <View style={s.head}>
            <View style={s.headLeft}>
              {icon && (
                <View style={[s.iconChip, { backgroundColor: iconBg }]}>
                  {icon}
                </View>
              )}
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={s.title}>{title}</Text>
                <Text style={s.message}>{message}</Text>
              </View>
            </View>
            <Pressable onPress={onLater} hitSlop={8} disabled={loading} style={s.closeBtn}>
              <X size={16} color="#0F172A" strokeWidth={2} />
            </Pressable>
          </View>

          {/* Details */}
          {details && details.length > 0 && (
            <View style={s.details}>
              {details.map((d, i) => (
                <View key={i} style={[s.detailRow, i !== 0 && s.detailRowDivider]}>
                  <Text style={s.detailLabel}>{d.label}</Text>
                  <Text style={s.detailValue} numberOfLines={2}>{d.value}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Footer actions */}
          <View style={s.footer}>
            <Pressable style={s.laterBtn} onPress={onLater} disabled={loading}>
              <Text style={s.laterTxt}>Later</Text>
            </Pressable>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {secondaryLabel && onSecondary && (
                <Pressable
                  style={[s.rejectBtn, loading && { opacity: 0.6 }]}
                  onPress={onSecondary}
                  disabled={loading}
                >
                  <XCircle size={14} color="#FFFFFF" strokeWidth={2.2} />
                  <Text style={s.btnTxt}>{secondaryLabel}</Text>
                </Pressable>
              )}
              <Pressable
                style={[s.primaryBtn, { backgroundColor: primaryColor }, loading && { opacity: 0.6 }]}
                onPress={onPrimary}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <CheckCircle2 size={14} color="#FFFFFF" strokeWidth={2.4} />
                    <Text style={s.btnTxt}>{primaryLabel}</Text>
                  </>
                )}
              </Pressable>
            </View>
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
    width: '100%', maxWidth: 460, backgroundColor: '#fff',
    borderRadius: Radius.lg,
    borderWidth: 1, borderColor: BORDER,
    overflow: 'hidden',
    ...Shadow.lg,
  },

  /* Header */
  head: {
    flexDirection: 'row', alignItems: 'flex-start',
    paddingHorizontal: 18, paddingTop: 16, paddingBottom: 14,
  },
  headLeft: {
    flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: 12,
  },
  iconChip: {
    width: 36, height: 36, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  closeBtn: {
    width: 28, height: 28, borderRadius: 6,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  title:   {
    fontFamily: FontFamily.semiBold,
    fontSize: 15, color: INK_900, letterSpacing: -0.1,
  },
  message: {
    fontFamily: FontFamily.regular,
    fontSize: 13, color: INK_500, lineHeight: 19,
  },

  /* Details */
  details: {
    marginHorizontal: 18,
    marginBottom: 14,
    backgroundColor: INK_50,
    borderRadius: Radius.md,
    borderWidth: 1, borderColor: BORDER,
  },
  detailRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: 12, paddingVertical: 9,
  },
  detailRowDivider: {
    borderTopWidth: 1, borderTopColor: BORDER,
  },
  detailLabel: {
    fontFamily: FontFamily.medium,
    fontSize: 12, color: INK_500,
    minWidth: 76, textTransform: 'uppercase', letterSpacing: 0.4,
  },
  detailValue: {
    flex: 1,
    fontFamily: FontFamily.semiBold,
    fontSize: 13, color: INK_900,
  },

  /* Footer */
  footer: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 12,
    backgroundColor: INK_50,
    borderTopWidth: 1, borderTopColor: BORDER,
  },
  laterBtn: {
    paddingHorizontal: 12, paddingVertical: 9, borderRadius: Radius.sm,
    backgroundColor: 'transparent',
    borderWidth: 1, borderColor: INK_300,
  },
  laterTxt: {
    fontFamily: FontFamily.semiBold, fontSize: 13, color: INK_700,
  },

  rejectBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 9, borderRadius: Radius.sm,
    backgroundColor: '#B91C1C',
  },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: Radius.sm,
  },
  btnTxt: {
    fontFamily: FontFamily.semiBold, fontSize: 13, color: '#fff',
    letterSpacing: 0.1,
  },
});
