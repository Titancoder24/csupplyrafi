import React from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Platform } from 'react-native';
import { Clock, AlertTriangle, RotateCcw, LogOut, FileText, CheckCircle2 } from 'lucide-react-native';
import { FontFamily } from '@/constants/theme';

const BG      = '#F8FAFC';
const SURFACE = '#FFFFFF';
const BORDER  = '#E2E8F0';
const INK_900 = '#0F172A';
const INK_700 = '#334155';
const INK_500 = '#64748B';

const GREEN_BG = '#F0FDF4';
const GREEN_BORDER = '#86EFAC';
const GREEN_DARK = '#15803D';

const AMBER_BG = '#FFFBEB';
const AMBER_BORDER = '#FCD34D';
const AMBER_DARK = '#B45309';

const RED_BG = '#FEF2F2';
const RED_BORDER = '#FECACA';
const RED_DARK  = '#B91C1C';

const PT = Platform.OS === 'ios' ? 56 : Platform.OS === 'web' ? 16 : 28;

export type KycDocItem = { label: string; provided: boolean; value?: string };

type Props = {
  variant: 'pending' | 'rejected';
  roleLabel: string;             // "Vendor" / "Transporter"
  submittedAt?: string | null;
  rejectionReason?: string | null;
  docs?: KycDocItem[];
  onRetry?: () => void;          // shown on rejected
  onSignOut?: () => void;
};

export function KycStatusScreen({
  variant, roleLabel, submittedAt, rejectionReason, docs, onRetry, onSignOut,
}: Props) {
  const isPending = variant === 'pending';
  const headerBg = isPending ? AMBER_BG : RED_BG;
  const headerBorder = isPending ? AMBER_BORDER : RED_BORDER;
  const headerInk = isPending ? AMBER_DARK : RED_DARK;
  const title = isPending ? `${roleLabel} application submitted` : `${roleLabel} application not approved`;
  const sub = isPending
    ? "We're reviewing your documents. You'll be notified within 24 hours."
    : 'Please review the reason below, re-upload the corrected documents and resubmit.';

  return (
    <View style={s.root}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: PT + 20, paddingBottom: 32, gap: 16 }}>
        <View style={[s.headerCard, { backgroundColor: headerBg, borderColor: headerBorder }]}>
          <View style={[s.headerIcon, { backgroundColor: SURFACE }]}>
            {isPending
              ? <Clock          size={24} color="#0F172A" strokeWidth={2.2} />
              : <AlertTriangle  size={24} color="#0F172A"   strokeWidth={2.2} />
            }
          </View>
          <Text style={[s.statusPill, { color: headerInk }]}>
            {isPending ? 'Under Review' : 'Rejected'}
          </Text>
          <Text style={s.title}>{title}</Text>
          <Text style={s.sub}>{sub}</Text>
          {submittedAt ? (
            <Text style={s.metaLine}>
              Submitted: <Text style={s.metaStrong}>{new Date(submittedAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</Text>
            </Text>
          ) : null}
        </View>

        {!isPending && rejectionReason ? (
          <View style={s.reasonCard}>
            <Text style={s.reasonLabel}>Reason from reviewer</Text>
            <Text style={s.reasonText}>{rejectionReason}</Text>
          </View>
        ) : null}

        {docs && docs.length > 0 ? (
          <View style={s.docsCard}>
            <View style={s.docsHead}>
              <FileText size={14} color="#0F172A" strokeWidth={2} />
              <Text style={s.docsTitle}>Documents you submitted</Text>
            </View>
            {docs.map((d, i) => (
              <View key={i} style={s.docRow}>
                {d.provided
                  ? <CheckCircle2 size={14} color="#0F172A" strokeWidth={2.4} />
                  : <View style={s.docDot} />
                }
                <Text style={[s.docLabel, !d.provided && { color: INK_500 }]}>{d.label}</Text>
                <Text style={s.docVal} numberOfLines={1}>
                  {d.provided ? (d.value ?? 'Uploaded') : 'Not provided'}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>

      <View style={s.stickyBar}>
        {!isPending && onRetry && (
          <Pressable style={s.retryBtn} onPress={onRetry}>
            <RotateCcw size={15} color="#FFFFFF" strokeWidth={2.5} />
            <Text style={s.retryTxt}>Re-upload Documents</Text>
          </Pressable>
        )}
        {onSignOut && (
          <Pressable style={s.signOutBtn} onPress={onSignOut}>
            <LogOut size={15} color="#0F172A" strokeWidth={2.2} />
            <Text style={s.signOutTxt}>Sign out</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  headerCard: {
    borderWidth: 1, borderRadius: 16, padding: 22,
    alignItems: 'center', gap: 8,
  },
  headerIcon: {
    width: 56, height: 56, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },
  statusPill: {
    fontFamily: FontFamily.bold,
    fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase',
  },
  title: {
    fontFamily: FontFamily.bold,
    fontSize: 18, color: INK_900,
    textAlign: 'center', marginTop: 2,
  },
  sub: {
    fontFamily: FontFamily.regular,
    fontSize: 13, color: INK_500,
    textAlign: 'center', lineHeight: 20,
    marginTop: 4,
  },
  metaLine: {
    fontFamily: FontFamily.regular,
    fontSize: 12, color: INK_500,
    marginTop: 8,
  },
  metaStrong: {
    fontFamily: FontFamily.semiBold, color: INK_900,
  },

  reasonCard: {
    backgroundColor: SURFACE,
    borderWidth: 1, borderLeftWidth: 4, borderColor: BORDER, borderLeftColor: RED_DARK,
    borderRadius: 12, padding: 16, gap: 6,
  },
  reasonLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: 11, letterSpacing: 1, textTransform: 'uppercase',
    color: RED_DARK,
  },
  reasonText: {
    fontFamily: FontFamily.medium,
    fontSize: 14, color: INK_900, lineHeight: 21,
  },

  docsCard: {
    backgroundColor: SURFACE,
    borderWidth: 1, borderColor: BORDER, borderRadius: 12,
    padding: 16, gap: 10,
  },
  docsHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  docsTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: 12, color: INK_500, letterSpacing: 0.4, textTransform: 'uppercase',
  },
  docRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  docDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#CBD5E1', marginHorizontal: 4 },
  docLabel: {
    fontFamily: FontFamily.medium,
    fontSize: 13, color: INK_900, flex: 1,
  },
  docVal: {
    fontFamily: FontFamily.regular,
    fontSize: 12, color: INK_500, maxWidth: 140,
  },

  stickyBar: {
    backgroundColor: SURFACE,
    borderTopWidth: 1, borderTopColor: BORDER,
    padding: 14, paddingBottom: Platform.OS === 'ios' ? 28 : 14,
    flexDirection: 'row', gap: 10,
  },
  retryBtn: {
    flex: 1, height: 50, borderRadius: 12,
    backgroundColor: GREEN_DARK,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  retryTxt: { fontFamily: FontFamily.bold, fontSize: 14, color: '#fff' },
  signOutBtn: {
    height: 50, paddingHorizontal: 18, borderRadius: 12,
    backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: BORDER,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  signOutTxt: { fontFamily: FontFamily.semiBold, fontSize: 13, color: INK_700 },
});
