import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, TextInput, ActivityIndicator,
  useWindowDimensions, Modal, Linking,
} from 'react-native';
import { Search, CheckCircle, XCircle, Truck, Phone, FileText, Calendar, ExternalLink, AlertTriangle, X } from 'lucide-react-native';
import { Colors, FontFamily, Radius, Shadow, Semantic, Ink } from '@/constants/theme';
import { supabase } from '@/services/supabase';

type Transporter = {
  id: string; full_name: string; phone: string;
  gst_number?: string; kyc_status: string; created_at: string;
  vehicle_count?: number;
  rejection_reason?: string | null;
  driving_license_url?: string | null;
  rc_url?: string | null;
  insurance_url?: string | null;
  aadhaar_url?: string | null;
  bank_account?: string | null;
  bank_ifsc?: string | null;
  transporter_type?: string | null;
};

const KYC_TABS = ['submitted', 'under_review', 'approved', 'rejected'] as const;

function statusPill(s: string): { fg: string; bg: string; label: string } {
  if (s === 'submitted')     return { fg: Semantic.warningFg, bg: Semantic.warningBg, label: 'Submitted' };
  if (s === 'under_review')  return { fg: Semantic.infoFg,    bg: Semantic.infoBg,    label: 'Under Review' };
  if (s === 'approved')      return { fg: Semantic.successFg, bg: Semantic.successBg, label: 'Approved' };
  if (s === 'rejected')      return { fg: Semantic.dangerFg,  bg: Semantic.dangerBg,  label: 'Rejected' };
  return { fg: Ink[500], bg: Ink[100], label: s };
}

function fmtDate(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function TransportersScreen() {
  const { width } = useWindowDimensions();
  const isNarrow = width < 700;

  const [list, setList] = useState<Transporter[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<typeof KYC_TABS[number]>('submitted');
  const [acting, setActing] = useState<string | null>(null);

  const [rejectFor, setRejectFor]   = useState<Transporter | null>(null);
  const [rejectText, setRejectText] = useState('');
  const [rejectErr,  setRejectErr]  = useState<string | null>(null);

  useEffect(() => {
    fetchList();
    const suffix = Math.random().toString(36).slice(2, 10);
    const ch = supabase.channel(`sa-transporters-rt:${suffix}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transporter_profiles' }, () => fetchList())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [tab]);

  async function fetchList() {
    setLoading(true);
    const { data } = await supabase
      .from('transporter_profiles')
      .select('id, gst_number, transporter_type, driving_license_url, rc_url, insurance_url, aadhaar_url, bank_account, bank_ifsc, rejection_reason, kyc_status, created_at, profiles!transporter_profiles_id_fkey(full_name, phone), vehicles(id)')
      .eq('kyc_status', tab)
      .order('created_at', { ascending: false });
    setList((data ?? []).map((d: any) => ({
      id: d.id,
      full_name: d.profiles?.full_name ?? '—',
      phone: d.profiles?.phone ?? '—',
      gst_number: d.gst_number,
      transporter_type: d.transporter_type,
      kyc_status: d.kyc_status,
      created_at: d.created_at,
      vehicle_count: d.vehicles?.length ?? 0,
      rejection_reason: d.rejection_reason,
      driving_license_url: d.driving_license_url,
      rc_url: d.rc_url,
      insurance_url: d.insurance_url,
      aadhaar_url: d.aadhaar_url,
      bank_account: d.bank_account,
      bank_ifsc: d.bank_ifsc,
    })));
    setLoading(false);
  }

  async function approve(id: string) {
    setActing(id);
    const { data: u } = await supabase.auth.getUser();
    await supabase.from('transporter_profiles').update({
      kyc_status: 'approved',
      rejection_reason: null,
      updated_at: new Date().toISOString(),
    }).eq('id', id);
    // approved_by isn't on transporter_profiles; recorded via realtime audit elsewhere
    void u;
    setList(l => l.filter(x => x.id !== id));
    setActing(null);
  }

  function openReject(t: Transporter) {
    setRejectFor(t);
    setRejectText('');
    setRejectErr(null);
  }
  async function confirmReject() {
    if (!rejectFor) return;
    if (rejectText.trim().length < 10) {
      setRejectErr('Reason must be at least 10 characters');
      return;
    }
    setActing(rejectFor.id);
    await supabase.from('transporter_profiles').update({
      kyc_status: 'rejected',
      rejection_reason: rejectText.trim(),
      updated_at: new Date().toISOString(),
    }).eq('id', rejectFor.id);
    setList(l => l.filter(x => x.id !== rejectFor.id));
    setActing(null);
    setRejectFor(null);
  }

  const filtered = list.filter(t =>
    t.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    t.phone?.includes(search)
  );

  const tabLabel = (t: string) => ({ submitted: 'Submitted', under_review: 'Under Review', approved: 'Approved', rejected: 'Rejected' }[t] ?? t);
  const showActions = tab === 'submitted' || tab === 'under_review';

  return (
    <ScrollView style={s.root} contentContainerStyle={s.scroll}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={s.tabs}>
          {KYC_TABS.map(t => (
            <Pressable key={t} style={[s.tab, tab === t && s.tabActive]} onPress={() => setTab(t)}>
              <Text style={[s.tabText, tab === t && s.tabTextActive]}>{tabLabel(t)}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <View style={s.searchBox}>
        <Search size={16} color="#0F172A" />
        <TextInput
          style={s.searchInput}
          placeholder="Search by name or phone..."
          placeholderTextColor={Colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
        <Text style={s.count}>{filtered.length} {filtered.length === 1 ? 'transporter' : 'transporters'}</Text>
      </View>

      {loading ? (
        <View style={s.loader}><ActivityIndicator color={Colors.primary} size="large" /></View>
      ) : filtered.length === 0 ? (
        <View style={s.empty}>
          <View style={s.emptyIconBox}>
            <Truck size={28} color="#0F172A" strokeWidth={1.5} />
          </View>
          <Text style={s.emptyTitle}>No "{tabLabel(tab)}" transporters</Text>
          <Text style={s.emptyText}>
            {tab === 'submitted' ? 'New transporter signups awaiting review will appear here.' : `No transporters currently in ${tabLabel(tab)} status.`}
          </Text>
        </View>
      ) : (
        <View style={{ gap: 12 }}>
          {filtered.map(t => {
            const pill = statusPill(t.kyc_status);
            return (
              <View key={t.id} style={s.card}>
                <View style={s.cardHeader}>
                  <View style={s.avatar}>
                    <Truck size={18} color="#0F172A" strokeWidth={2} />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={s.name} numberOfLines={1}>{t.full_name}</Text>
                    <Text style={s.business}>
                      {t.vehicle_count} {t.vehicle_count === 1 ? 'vehicle' : 'vehicles'} · {t.phone}
                    </Text>
                  </View>
                  <View style={[s.pill, { backgroundColor: pill.bg }]}>
                    <Text style={[s.pillTxt, { color: pill.fg }]}>{pill.label}</Text>
                  </View>
                </View>

                <View style={s.metaRow}>
                  <View style={s.metaItem}>
                    <Phone size={13} color="#0F172A" strokeWidth={2} />
                    <Text style={s.metaVal}>{t.phone}</Text>
                  </View>
                  <View style={s.metaItem}>
                    <FileText size={13} color="#0F172A" strokeWidth={2} />
                    <Text style={s.metaVal} numberOfLines={1}>{t.gst_number || 'No GST'}</Text>
                  </View>
                  <View style={s.metaItem}>
                    <Calendar size={13} color="#0F172A" strokeWidth={2} />
                    <Text style={s.metaVal}>{fmtDate(t.created_at)}</Text>
                  </View>
                </View>

                {/* Documents */}
                <View style={s.docsBox}>
                  <Text style={s.docsLabel}>Uploaded documents</Text>
                  <View style={s.docsList}>
                    <DocChip label="Driving licence" url={t.driving_license_url} />
                    <DocChip label="RC"              url={t.rc_url} />
                    <DocChip label="Insurance"       url={t.insurance_url} />
                    <DocChip label="Aadhaar"         url={t.aadhaar_url} />
                    <ValueChip label="Type"          value={t.transporter_type} />
                    <ValueChip label="Bank A/C"      value={t.bank_account} />
                    <ValueChip label="IFSC"          value={t.bank_ifsc} />
                  </View>
                </View>

                {tab === 'rejected' && t.rejection_reason ? (
                  <View style={s.reasonBox}>
                    <AlertTriangle size={13} color="#0F172A" strokeWidth={2} />
                    <Text style={s.reasonTxt}>{t.rejection_reason}</Text>
                  </View>
                ) : null}

                {showActions && (
                  <View style={[s.actionRow, isNarrow && { flexDirection: 'column' }]}>
                    <Pressable
                      style={[s.btn, s.approveBtn, acting === t.id && { opacity: 0.6 }]}
                      onPress={() => approve(t.id)}
                      disabled={acting === t.id}
                    >
                      {acting === t.id
                        ? <ActivityIndicator size="small" color="#fff" />
                        : <><CheckCircle size={14} color="#FFFFFF" strokeWidth={2.2} /><Text style={s.btnText}>Approve</Text></>}
                    </Pressable>
                    <Pressable
                      style={[s.btn, s.rejectBtn, acting === t.id && { opacity: 0.6 }]}
                      onPress={() => openReject(t)}
                      disabled={acting === t.id}
                    >
                      <XCircle size={14} color="#FFFFFF" strokeWidth={2.2} />
                      <Text style={s.btnText}>Reject</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      )}

      {/* Reject modal */}
      <Modal visible={!!rejectFor} transparent animationType="fade" onRequestClose={() => setRejectFor(null)}>
        <View style={s.modalBackdrop}>
          <View style={s.modalCard}>
            <View style={s.modalHead}>
              <Text style={s.modalTitle}>Reject transporter</Text>
              <Pressable onPress={() => setRejectFor(null)} hitSlop={8}>
                <X size={18} color="#0F172A" strokeWidth={2} />
              </Pressable>
            </View>
            <Text style={s.modalSub}>
              Give a clear reason — the transporter will see this on their dashboard and can re-upload documents.
            </Text>
            <TextInput
              style={s.modalInput}
              value={rejectText}
              onChangeText={(t) => { setRejectText(t); setRejectErr(null); }}
              placeholder="e.g. Driving licence expired. Please upload a current one."
              placeholderTextColor={Ink[400]}
              multiline
              numberOfLines={4}
            />
            {rejectErr ? <Text style={s.modalErr}>{rejectErr}</Text> : null}
            <View style={s.modalActions}>
              <Pressable style={s.modalCancel} onPress={() => setRejectFor(null)}>
                <Text style={s.modalCancelTxt}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[s.modalReject, acting === rejectFor?.id && { opacity: 0.6 }]}
                onPress={confirmReject}
                disabled={acting === rejectFor?.id}
              >
                {acting === rejectFor?.id
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={s.modalRejectTxt}>Reject transporter</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function DocChip({ label, url }: { label: string; url?: string | null }) {
  if (!url) return (
    <View style={[ds.chip, ds.chipEmpty]}>
      <Text style={ds.chipLabel}>{label}</Text>
      <Text style={ds.chipEmptyTxt}>—</Text>
    </View>
  );
  return (
    <Pressable style={ds.chip} onPress={() => Linking.openURL(url)}>
      <Text style={ds.chipLabel}>{label}</Text>
      <ExternalLink size={12} color="#0F172A" strokeWidth={2.2} />
    </Pressable>
  );
}
function ValueChip({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <View style={ds.chip}>
      <Text style={ds.chipLabel}>{label}</Text>
      <Text style={ds.chipValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

const ds = StyleSheet.create({
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  chipEmpty: { backgroundColor: '#F8FAFC' },
  chipLabel: { fontFamily: FontFamily.semiBold, fontSize: 11, color: '#475569' },
  chipValue: { fontFamily: FontFamily.medium, fontSize: 11, color: '#0F172A', maxWidth: 140 },
  chipEmptyTxt: { fontFamily: FontFamily.regular, fontSize: 11, color: '#94A3B8' },
});

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: Ink[100] },
  scroll: { padding: 24, gap: 16, paddingBottom: 40 },

  tabs: { flexDirection: 'row', gap: 8 },
  tab: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: Radius.full, backgroundColor: Colors.white,
    borderWidth: 1, borderColor: Colors.border,
  },
  tabActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  tabText: { fontFamily: FontFamily.semiBold, fontSize: 12, color: Colors.textSecondary },
  tabTextActive: { color: Colors.white },

  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.white, borderRadius: Radius.md,
    paddingHorizontal: 14, height: 44,
    borderWidth: 1, borderColor: Colors.border, ...Shadow.sm,
  },
  searchInput: { flex: 1, fontFamily: FontFamily.regular, fontSize: 14, color: Colors.textPrimary, ...(({ outlineStyle: 'none' }) as any) },
  count:       { fontFamily: FontFamily.semiBold, fontSize: 12, color: Colors.textMuted },

  card: {
    backgroundColor: Colors.white, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.border, padding: 16, gap: 12,
    ...Shadow.card,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 44, height: 44, borderRadius: Radius.md,
    backgroundColor: '#FFF7ED',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  name:     { fontFamily: FontFamily.bold, fontSize: 15, color: Ink[900], letterSpacing: -0.2 },
  business: { fontFamily: FontFamily.regular, fontSize: 12, color: Ink[500] },

  pill:    { paddingHorizontal: 9, paddingVertical: 4, borderRadius: Radius.full },
  pillTxt: { fontFamily: FontFamily.semiBold, fontSize: 11 },

  metaRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 14,
    paddingTop: 12, borderTopWidth: 1, borderTopColor: Colors.border,
  },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaVal:  { fontFamily: FontFamily.medium, fontSize: 12, color: Ink[700] },

  docsBox: { gap: 6 },
  docsLabel: {
    fontFamily: FontFamily.semiBold, fontSize: 11,
    color: Ink[500], letterSpacing: 0.6, textTransform: 'uppercase',
  },
  docsList: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },

  reasonBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: Semantic.dangerBg,
    borderWidth: 1, borderColor: '#FECACA',
    borderRadius: 10, padding: 10,
  },
  reasonTxt: {
    flex: 1,
    fontFamily: FontFamily.medium, fontSize: 12, color: Semantic.dangerFg,
    lineHeight: 18,
  },

  actionRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: Radius.md, flex: 1,
  },
  approveBtn: { backgroundColor: Semantic.successFg },
  rejectBtn:  { backgroundColor: Semantic.dangerFg },
  btnText:    { fontFamily: FontFamily.bold, fontSize: 13, color: Colors.white },

  loader: { padding: 60, alignItems: 'center' },
  empty: {
    padding: 40, alignItems: 'center', gap: 8,
    backgroundColor: Colors.white, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.border,
  },
  emptyIconBox: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: Ink[50], borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  emptyTitle: { fontFamily: FontFamily.bold, fontSize: 14, color: Ink[900] },
  emptyText:  { fontFamily: FontFamily.regular, fontSize: 12, color: Colors.textMuted, textAlign: 'center', maxWidth: 320 },

  modalBackdrop: {
    flex: 1, backgroundColor: 'rgba(15,23,42,0.55)',
    alignItems: 'center', justifyContent: 'center', padding: 20,
  },
  modalCard: {
    width: '100%', maxWidth: 460, backgroundColor: '#fff',
    borderRadius: 16, padding: 22, gap: 10,
  },
  modalHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modalTitle: { fontFamily: FontFamily.bold, fontSize: 17, color: Ink[900] },
  modalSub: { fontFamily: FontFamily.regular, fontSize: 13, color: Ink[500], lineHeight: 20 },
  modalInput: {
    minHeight: 100,
    borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    fontFamily: FontFamily.regular, fontSize: 14, color: Ink[900],
    textAlignVertical: 'top',
    // @ts-ignore web
    outlineStyle: 'none',
  },
  modalErr: { fontFamily: FontFamily.medium, fontSize: 12, color: Semantic.dangerFg },
  modalActions: { flexDirection: 'row', gap: 10, justifyContent: 'flex-end', marginTop: 4 },
  modalCancel: {
    height: 42, paddingHorizontal: 16, borderRadius: 10,
    backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center',
  },
  modalCancelTxt: { fontFamily: FontFamily.semiBold, fontSize: 13, color: Ink[700] },
  modalReject: {
    height: 42, paddingHorizontal: 18, borderRadius: 10,
    backgroundColor: Semantic.dangerFg, alignItems: 'center', justifyContent: 'center',
  },
  modalRejectTxt: { fontFamily: FontFamily.bold, fontSize: 13, color: '#fff' },
});
