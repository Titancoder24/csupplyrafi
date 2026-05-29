import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, TextInput, ActivityIndicator,
  useWindowDimensions, Modal, Linking,
} from 'react-native';
import { Search, CheckCircle, XCircle, Store, Phone, FileText, Calendar, Eye, ExternalLink, AlertTriangle, X } from 'lucide-react-native';
import { Colors, FontFamily, Radius, Shadow, Semantic, Ink } from '@/constants/theme';
import { supabase } from '@/services/supabase';

type Vendor = {
  id: string; full_name: string; phone: string; business_name?: string;
  shop_name?: string;
  gst_number?: string; kyc_status: string; created_at: string;
  rejection_reason?: string | null;
  gst_certificate_url?: string | null;
  pan_number?: string | null;
  aadhaar_url?: string | null;
  selfie_url?: string | null;
  bank_account?: string | null;
  bank_ifsc?: string | null;
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

export default function VendorsScreen() {
  const { width } = useWindowDimensions();
  const isNarrow = width < 700;

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<typeof KYC_TABS[number]>('submitted');
  const [acting, setActing] = useState<string | null>(null);

  // Rejection modal
  const [rejectFor, setRejectFor]   = useState<Vendor | null>(null);
  const [rejectText, setRejectText] = useState('');
  const [rejectErr,  setRejectErr]  = useState<string | null>(null);

  useEffect(() => {
    fetchVendors();
    const channel = supabase
      .channel('sa-vendors-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vendor_profiles' }, () => fetchVendors())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [tab]);

  async function fetchVendors() {
    setLoading(true);
    const { data } = await supabase
      .from('vendor_profiles')
      .select('id, business_name, shop_name, gst_number, gst_certificate_url, pan_number, aadhaar_url, selfie_url, bank_account, bank_ifsc, rejection_reason, kyc_status, created_at, profiles!vendor_profiles_id_fkey(full_name, phone)')
      .eq('kyc_status', tab)
      .order('created_at', { ascending: false });
    setVendors((data ?? []).map((d: any) => ({
      id: d.id,
      full_name: d.profiles?.full_name ?? '—',
      phone: d.profiles?.phone ?? '—',
      business_name: d.business_name,
      shop_name: d.shop_name,
      gst_number: d.gst_number,
      kyc_status: d.kyc_status,
      created_at: d.created_at,
      rejection_reason: d.rejection_reason,
      gst_certificate_url: d.gst_certificate_url,
      pan_number: d.pan_number,
      aadhaar_url: d.aadhaar_url,
      selfie_url: d.selfie_url,
      bank_account: d.bank_account,
      bank_ifsc: d.bank_ifsc,
    })));
    setLoading(false);
  }

  async function approve(id: string) {
    setActing(id);
    const { data: u } = await supabase.auth.getUser();
    await supabase.from('vendor_profiles').update({
      kyc_status: 'approved',
      approved_at: new Date().toISOString(),
      approved_by: u.user?.id ?? null,
      rejection_reason: null,
    }).eq('id', id);
    setVendors(v => v.filter(x => x.id !== id));
    setActing(null);
  }
  function openReject(v: Vendor) {
    setRejectFor(v);
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
    const { data: u } = await supabase.auth.getUser();
    await supabase.from('vendor_profiles').update({
      kyc_status: 'rejected',
      rejection_reason: rejectText.trim(),
      approved_by: u.user?.id ?? null,
    }).eq('id', rejectFor.id);
    setVendors(v => v.filter(x => x.id !== rejectFor.id));
    setActing(null);
    setRejectFor(null);
  }
  async function review(id: string) {
    setActing(id);
    await supabase.from('vendor_profiles').update({ kyc_status: 'under_review' }).eq('id', id);
    setVendors(v => v.filter(x => x.id !== id));
    setActing(null);
  }

  const filtered = vendors.filter(v =>
    v.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    v.business_name?.toLowerCase().includes(search.toLowerCase()) ||
    v.phone?.includes(search)
  );

  const tabLabel = (t: string) => ({ submitted: 'Submitted', under_review: 'Under Review', approved: 'Approved', rejected: 'Rejected' }[t] ?? t);
  const showActions = tab === 'submitted' || tab === 'under_review';

  return (
    <ScrollView style={s.root} contentContainerStyle={s.scroll}>
      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={s.tabs}>
          {KYC_TABS.map(t => (
            <Pressable key={t} style={[s.tab, tab === t && s.tabActive]} onPress={() => setTab(t)}>
              <Text style={[s.tabText, tab === t && s.tabTextActive]}>{tabLabel(t)}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      {/* Search */}
      <View style={s.searchBox}>
        <Search size={16} color="#0F172A" />
        <TextInput
          style={s.searchInput}
          placeholder="Search by name, business or phone..."
          placeholderTextColor={Colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
        <Text style={s.count}>{filtered.length} {filtered.length === 1 ? 'vendor' : 'vendors'}</Text>
      </View>

      {/* List */}
      {loading ? (
        <View style={s.loader}><ActivityIndicator color={Colors.primary} size="large" /></View>
      ) : filtered.length === 0 ? (
        <View style={s.empty}>
          <View style={s.emptyIconBox}>
            <Store size={28} color="#0F172A" strokeWidth={1.5} />
          </View>
          <Text style={s.emptyTitle}>No "{tabLabel(tab)}" vendors</Text>
          <Text style={s.emptyText}>
            {tab === 'submitted' ? 'New vendor signups awaiting review will appear here.' : `No vendors currently in ${tabLabel(tab)} status.`}
          </Text>
        </View>
      ) : (
        <View style={{ gap: 12 }}>
          {filtered.map(v => {
            const pill = statusPill(v.kyc_status);
            return (
              <View key={v.id} style={s.card}>
                {/* Header */}
                <View style={s.cardHeader}>
                  <View style={s.avatar}>
                    <Store size={18} color="#0F172A" strokeWidth={2} />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={s.name} numberOfLines={1}>{v.full_name}</Text>
                    <Text style={s.business} numberOfLines={1}>
                      {v.business_name || 'No business name'}
                    </Text>
                  </View>
                  <View style={[s.pill, { backgroundColor: pill.bg }]}>
                    <Text style={[s.pillTxt, { color: pill.fg }]}>{pill.label}</Text>
                  </View>
                </View>

                {/* Meta strip */}
                <View style={s.metaRow}>
                  <View style={s.metaItem}>
                    <Phone size={13} color="#0F172A" strokeWidth={2} />
                    <Text style={s.metaVal}>{v.phone}</Text>
                  </View>
                  <View style={s.metaItem}>
                    <FileText size={13} color="#0F172A" strokeWidth={2} />
                    <Text style={s.metaVal} numberOfLines={1}>{v.gst_number || 'No GST'}</Text>
                  </View>
                  <View style={s.metaItem}>
                    <Calendar size={13} color="#0F172A" strokeWidth={2} />
                    <Text style={s.metaVal}>{fmtDate(v.created_at)}</Text>
                  </View>
                </View>

                {/* Documents */}
                <View style={s.docsBox}>
                  <Text style={s.docsLabel}>Uploaded documents</Text>
                  <View style={s.docsList}>
                    <DocChip label="GST cert"   url={v.gst_certificate_url} />
                    <DocChip label="Aadhaar"    url={v.aadhaar_url} />
                    <DocChip label="Selfie"     url={v.selfie_url} />
                    <ValueChip label="PAN"      value={v.pan_number} />
                    <ValueChip label="Shop"     value={v.shop_name} />
                    <ValueChip label="Bank A/C" value={v.bank_account} />
                    <ValueChip label="IFSC"     value={v.bank_ifsc} />
                  </View>
                </View>

                {tab === 'rejected' && v.rejection_reason ? (
                  <View style={s.reasonBox}>
                    <AlertTriangle size={13} color="#0F172A" strokeWidth={2} />
                    <Text style={s.reasonTxt}>{v.rejection_reason}</Text>
                  </View>
                ) : null}

                {/* Actions */}
                {showActions && (
                  <View style={[s.actionRow, isNarrow && { flexDirection: 'column' }]}>
                    {tab === 'submitted' && (
                      <Pressable
                        style={[s.btn, s.reviewBtn, acting === v.id && { opacity: 0.6 }]}
                        onPress={() => review(v.id)}
                        disabled={acting === v.id}
                      >
                        <Eye size={14} color="#FFFFFF" strokeWidth={2.2} />
                        <Text style={s.btnText}>Mark Under Review</Text>
                      </Pressable>
                    )}
                    <Pressable
                      style={[s.btn, s.approveBtn, acting === v.id && { opacity: 0.6 }]}
                      onPress={() => approve(v.id)}
                      disabled={acting === v.id}
                    >
                      {acting === v.id
                        ? <ActivityIndicator size="small" color="#fff" />
                        : <><CheckCircle size={14} color="#FFFFFF" strokeWidth={2.2} /><Text style={s.btnText}>Approve</Text></>}
                    </Pressable>
                    <Pressable
                      style={[s.btn, s.rejectBtn, acting === v.id && { opacity: 0.6 }]}
                      onPress={() => openReject(v)}
                      disabled={acting === v.id}
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
              <Text style={s.modalTitle}>Reject vendor</Text>
              <Pressable onPress={() => setRejectFor(null)} hitSlop={8}>
                <X size={18} color="#0F172A" strokeWidth={2} />
              </Pressable>
            </View>
            <Text style={s.modalSub}>
              Give a clear reason — the vendor will see this on their dashboard and can re-upload documents.
            </Text>
            <TextInput
              style={s.modalInput}
              value={rejectText}
              onChangeText={(t) => { setRejectText(t); setRejectErr(null); }}
              placeholder="e.g. GST certificate image is blurred. Please re-upload a clearer copy."
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
                  : <Text style={s.modalRejectTxt}>Reject vendor</Text>}
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
    backgroundColor: '#EFF6FF',
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

  actionRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: Radius.md, flex: 1,
  },
  reviewBtn:  { backgroundColor: Colors.primary },
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

  /* Docs row */
  docsBox: { gap: 6 },
  docsLabel: {
    fontFamily: FontFamily.semiBold, fontSize: 11,
    color: Ink[500], letterSpacing: 0.6, textTransform: 'uppercase',
  },
  docsList: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },

  /* Rejection reason inline (on rejected tab) */
  reasonBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: Semantic.dangerBg,
    borderWidth: 1, borderColor: Semantic.dangerBorder ?? '#FECACA',
    borderRadius: 10, padding: 10,
  },
  reasonTxt: {
    flex: 1,
    fontFamily: FontFamily.medium, fontSize: 12, color: Semantic.dangerFg,
    lineHeight: 18,
  },

  /* Reject modal */
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
