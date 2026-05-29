import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet, Platform, SafeAreaView, StatusBar, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  User, Phone, ShieldCheck, Truck as TruckIcon, FileText, LogOut, ChevronRight,
  Bell, AlertTriangle, CheckCircle2, Clock,
} from 'lucide-react-native';
import { supabase } from '@/services/supabase';
import { useAuth } from '@/services/auth/AuthProvider';
import { useNotifications } from '@/hooks/useNotifications';
import { FontFamily, Shadow } from '@/constants/theme';

const HEADER = '#1A5C30';

type TpProfile = {
  transporter_type: string | null;
  gst_number: string | null;
  driving_license_url: string | null;
  rc_url: string | null;
  insurance_url: string | null;
  aadhaar_url: string | null;
  kyc_status: string;
  rejection_reason: string | null;
};

export default function TransporterAccount() {
  const router = useRouter();
  const { profile, signOut } = useAuth();
  const { unreadCount } = useNotifications();

  const [tp, setTp]       = useState<TpProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    if (!profile?.id) return;
    setLoading(true);
    const { data } = await supabase
      .from('transporter_profiles')
      .select('transporter_type, gst_number, driving_license_url, rc_url, insurance_url, aadhaar_url, kyc_status, rejection_reason')
      .eq('id', profile.id)
      .maybeSingle();
    setTp((data ?? null) as any);
    setLoading(false);
  }, [profile?.id]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  const initials = (profile?.full_name ?? '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

  const kycStatus = tp?.kyc_status ?? 'draft';
  const kyc = kycStatus === 'approved'
    ? { label: 'Verified',    bg: '#DCFCE7', fg: '#15803D', Icon: CheckCircle2 }
    : kycStatus === 'rejected'
    ? { label: 'Rejected',    bg: '#FEF2F2', fg: '#B91C1C', Icon: AlertTriangle }
    : kycStatus === 'submitted' || kycStatus === 'under_review'
    ? { label: 'Under Review',bg: '#FFFBEB', fg: '#B45309', Icon: Clock }
    : { label: 'Draft',       bg: '#F1F5F9', fg: '#475569', Icon: FileText };

  async function handleSignOut() {
    await signOut();
    router.replace('/auth/login' as never);
  }

  const docs = [
    { label: 'Driving licence', present: !!tp?.driving_license_url },
    { label: 'RC',              present: !!tp?.rc_url },
    { label: 'Insurance',       present: !!tp?.insurance_url },
    { label: 'Aadhaar',         present: !!tp?.aadhaar_url },
  ];

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={HEADER} />

      <SafeAreaView style={s.header}>
        <View style={s.profileRow}>
          <View style={s.avatar}>
            <Text style={s.avatarTxt}>{initials}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.name} numberOfLines={1}>{profile?.full_name ?? 'Transporter'}</Text>
            <Text style={s.subline}>{profile?.phone ?? '—'}</Text>
          </View>
          <View style={[s.kycPill, { backgroundColor: kyc.bg }]}>
            <kyc.Icon size={11} color={kyc.fg} strokeWidth={2.2} />
            <Text style={[s.kycTxt, { color: kyc.fg }]}>{kyc.label}</Text>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Account section */}
        <Text style={s.sectionTitle}>Account</Text>
        <View style={s.card}>
          <Row icon={User}   label="Full name"  value={profile?.full_name ?? '—'} />
          <Row icon={Phone}  label="Phone"      value={profile?.phone ?? '—'} />
          <Row
            icon={Bell}
            label="Notifications"
            value={unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
            onPress={() => router.push('/transporter/notifications' as never)}
            chevron
          />
        </View>

        {/* Vehicle / KYC */}
        <Text style={[s.sectionTitle, { marginTop: 8 }]}>Vehicle & KYC</Text>
        <View style={s.card}>
          <Row
            icon={TruckIcon}
            label="Transporter type"
            value={tp?.transporter_type ?? (loading ? '…' : 'Not set')}
          />
          <Row
            icon={FileText}
            label="GST number"
            value={tp?.gst_number ?? (loading ? '…' : 'Not provided')}
          />
          <Row
            icon={ShieldCheck}
            label="KYC status"
            value={kyc.label}
            valueColor={kyc.fg}
          />
        </View>

        {/* Documents */}
        <Text style={[s.sectionTitle, { marginTop: 8 }]}>Documents</Text>
        <View style={s.card}>
          {docs.map((d, i) => (
            <View key={d.label} style={[s.docRow, i < docs.length - 1 && s.docRowDivider]}>
              <View style={s.docLeft}>
                {d.present
                  ? <CheckCircle2 size={14} color="#15803D" strokeWidth={2.2} />
                  : <View style={s.docDot} />
                }
                <Text style={[s.docLabel, !d.present && { color: '#94A3B8' }]}>{d.label}</Text>
              </View>
              <Text style={[s.docState, d.present && { color: '#15803D' }]}>
                {d.present ? 'Uploaded' : 'Missing'}
              </Text>
            </View>
          ))}
          {!loading && kycStatus !== 'approved' && (
            <Pressable
              style={s.docCta}
              onPress={() => router.push((kycStatus === 'rejected' ? '/transporter/rejected' : '/transporter/pending') as never)}
            >
              <Text style={s.docCtaTxt}>
                {kycStatus === 'rejected' ? 'View rejection reason →' : 'View approval status →'}
              </Text>
            </Pressable>
          )}
        </View>

        {/* Sign out */}
        <View style={{ marginTop: 12 }}>
          <Pressable style={s.signOutBtn} onPress={handleSignOut}>
            <LogOut size={15} color="#B91C1C" strokeWidth={2} />
            <Text style={s.signOutTxt}>Sign out</Text>
          </Pressable>
        </View>

        {loading && (
          <View style={{ alignItems: 'center', paddingTop: 18 }}>
            <ActivityIndicator color={HEADER} size="small" />
          </View>
        )}

        <View style={{ height: 16 }} />
      </ScrollView>
    </View>
  );
}

function Row({
  icon: Icon, label, value, onPress, chevron, valueColor,
}: {
  icon: any; label: string; value: string;
  onPress?: () => void; chevron?: boolean; valueColor?: string;
}) {
  const Wrap: any = onPress ? Pressable : View;
  return (
    <Wrap style={s.row} onPress={onPress}>
      <View style={s.rowIconBox}>
        <Icon size={14} color="#475569" strokeWidth={1.75} />
      </View>
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={[s.rowValue, valueColor ? { color: valueColor } : null]} numberOfLines={1}>{value}</Text>
      {chevron ? <ChevronRight size={13} color="#94A3B8" strokeWidth={2} /> : null}
    </Wrap>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAFC' },

  header: { backgroundColor: HEADER, paddingLeft: 32, paddingRight: 28, paddingTop: Platform.OS === 'web' ? 26 : 22, paddingBottom: 24 },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.30)',
  },
  avatarTxt: { fontFamily: FontFamily.bold, fontSize: 16, color: '#fff', letterSpacing: 0.3 },
  name:    { fontFamily: FontFamily.semiBold, fontSize: 16, color: '#fff', letterSpacing: -0.1 },
  subline: { fontFamily: FontFamily.regular, fontSize: 12, color: 'rgba(255,255,255,0.78)', marginTop: 1 },
  kycPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 99,
  },
  kycTxt: { fontFamily: FontFamily.semiBold, fontSize: 11, letterSpacing: 0.1 },

  scroll: { padding: 16, gap: 8 },
  sectionTitle: { fontFamily: FontFamily.semiBold, fontSize: 12.5, color: '#64748B', letterSpacing: 0.6, textTransform: 'uppercase', marginLeft: 4, marginBottom: 6 },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0',
    overflow: 'hidden',
    ...Shadow.sm,
  },

  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  rowIconBox: {
    width: 26, height: 26, borderRadius: 6, backgroundColor: '#F1F5F9',
    alignItems: 'center', justifyContent: 'center',
  },
  rowLabel: { flex: 1, fontFamily: FontFamily.medium, fontSize: 12.5, color: '#475569' },
  rowValue: { fontFamily: FontFamily.semiBold, fontSize: 13, color: '#0F172A', maxWidth: '55%' },

  docRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 11 },
  docRowDivider: { borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  docLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  docDot: { width: 14, height: 14, borderRadius: 7, borderWidth: 1.5, borderColor: '#CBD5E1' },
  docLabel: { fontFamily: FontFamily.medium, fontSize: 13, color: '#0F172A' },
  docState: { fontFamily: FontFamily.regular, fontSize: 12, color: '#94A3B8' },
  docCta: { paddingHorizontal: 14, paddingVertical: 11, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  docCtaTxt: { fontFamily: FontFamily.semiBold, fontSize: 12.5, color: '#1D4ED8' },

  signOutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    height: 46, borderRadius: 10,
    backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA',
  },
  signOutTxt: { fontFamily: FontFamily.semiBold, fontSize: 13.5, color: '#B91C1C' },
});
