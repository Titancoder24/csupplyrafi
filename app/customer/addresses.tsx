import React, { useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, ScrollView, TextInput, Platform, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, MapPin, Plus, CheckCircle2, Trash2, Home, Building2 } from 'lucide-react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/services/supabase';
import { useAuth } from '@/services/auth/AuthProvider';
import { FontFamily } from '@/constants/theme';

const BG      = '#F8FAFC';
const SURFACE = '#FFFFFF';
const BORDER  = '#E2E8F0';
const TEXT    = '#0F172A';
const TEXTSUB = '#334155';
const MUTED   = '#64748B';
const PRIMARY = '#1D4ED8';
const PRIMLT  = '#EFF6FF';
const PT      = Platform.OS === 'ios' ? 56 : Platform.OS === 'web' ? 0 : 36;

const DEMO = [
  { id: 'demo-home', label: 'Home', line1: '12, Green Street', city: 'Coimbatore', state: 'Tamil Nadu', pincode: '641001', is_default: true },
  { id: 'demo-site', label: 'Site Address', line1: 'Building Construction, Avinashi Road', city: 'Coimbatore', state: 'Tamil Nadu', pincode: '641037', is_default: false },
];

export default function Addresses() {
  const router = useRouter();
  const { profile } = useAuth();
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [label, setLabel] = useState('');
  const [line1, setLine1] = useState('');
  const [city,  setCity]  = useState('');
  const [state, setState] = useState('Tamil Nadu');
  const [pin,   setPin]   = useState('');
  const [saving, setSaving] = useState(false);

  const { data: saved = [], isLoading } = useQuery({
    queryKey: ['addresses', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const { data } = await supabase
        .from('addresses')
        .select('id, label, line1, city, state, pincode, is_default')
        .eq('profile_id', profile.id);
      return data ?? [];
    },
    enabled: Boolean(profile?.id),
  });

  const addresses = saved.length > 0 ? saved : DEMO;

  const addAddress = async () => {
    if (!label.trim() || !line1.trim() || !city.trim() || pin.length < 6) return;
    setSaving(true);
    if (profile?.id) {
      await supabase.from('addresses').insert({
        profile_id: profile.id, label, line1, city, state, pincode: pin,
        is_default: addresses.length === 0,
      });
      qc.invalidateQueries({ queryKey: ['addresses', profile.id] });
    }
    setSaving(false);
    setShowAdd(false);
    setLabel(''); setLine1(''); setCity(''); setPin('');
  };

  const LabelIcon = (lbl: string) => {
    const l = (lbl ?? '').toLowerCase();
    if (l.includes('home')) return Home;
    return Building2;
  };

  return (
    <View style={s.root}>
      <View style={[s.header, { paddingTop: PT > 0 ? PT : 14 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={s.backBtn}>
          <ArrowLeft size={20} color="#0F172A" strokeWidth={2} />
        </Pressable>
        <Text style={s.headerTitle}>Saved Addresses</Text>
        <View style={s.backBtn} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <ActivityIndicator color={PRIMARY} style={{ marginTop: 40 }} />
        ) : (
          addresses.map(a => {
            const Icon = LabelIcon(a.label);
            return (
              <View key={a.id} style={[s.card, a.is_default && s.cardDefault]}>
                <View style={[s.iconBox, { backgroundColor: a.is_default ? '#EFF6FF' : BG }]}>
                  <Icon size={18} color="#0F172A" strokeWidth={1.8} />
                </View>
                <View style={s.cardBody}>
                  <View style={s.cardTopRow}>
                    <Text style={s.cardLabel}>{a.label}</Text>
                    {a.is_default && (
                      <View style={s.defaultBadge}>
                        <CheckCircle2 size={10} color="#0F172A" strokeWidth={2.5} />
                        <Text style={s.defaultBadgeTxt}>Default</Text>
                      </View>
                    )}
                  </View>
                  <Text style={s.cardAddr}>{a.line1}, {a.city}, {a.state} — {a.pincode}</Text>
                </View>
                {!a.id.startsWith('demo-') && (
                  <Pressable style={s.deleteBtn} hitSlop={8}>
                    <Trash2 size={15} color="#0F172A" strokeWidth={2} />
                  </Pressable>
                )}
              </View>
            );
          })
        )}

        {/* Add Address Form */}
        {showAdd ? (
          <View style={s.addForm}>
            <Text style={s.addFormTitle}>New Address</Text>
            {[
              { label: 'Label', value: label, set: setLabel, placeholder: 'Home / Site / Office', cap: 'words' as any },
              { label: 'Address Line', value: line1, set: setLine1, placeholder: '123, Street Name', cap: 'sentences' as any },
              { label: 'City', value: city, set: setCity, placeholder: 'Coimbatore', cap: 'words' as any },
              { label: 'State', value: state, set: setState, placeholder: 'Tamil Nadu', cap: 'words' as any },
              { label: 'Pincode', value: pin, set: setPin, placeholder: '641001', cap: 'none' as any },
            ].map(field => (
              <View key={field.label} style={s.fieldWrap}>
                <Text style={s.fieldLabel}>{field.label}</Text>
                <TextInput
                  style={s.fieldInput}
                  value={field.value}
                  onChangeText={field.set}
                  placeholder={field.placeholder}
                  placeholderTextColor={MUTED}
                  autoCapitalize={field.cap}
                  keyboardType={field.label === 'Pincode' ? 'number-pad' : 'default'}
                />
              </View>
            ))}
            <View style={s.addFormActions}>
              <Pressable style={s.cancelBtn} onPress={() => setShowAdd(false)}>
                <Text style={s.cancelTxt}>Cancel</Text>
              </Pressable>
              <Pressable style={[s.saveBtn, saving && { opacity: 0.6 }]} onPress={addAddress} disabled={saving}>
                {saving
                  ? <ActivityIndicator color={SURFACE} size="small" />
                  : <Text style={s.saveTxt}>Save Address</Text>
                }
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable style={s.addRow} onPress={() => setShowAdd(true)}>
            <View style={s.addIconBox}>
              <Plus size={16} color="#0F172A" strokeWidth={2.5} />
            </View>
            <Text style={s.addTxt}>Add New Address</Text>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 4, paddingBottom: 12,
    backgroundColor: SURFACE, borderBottomWidth: 1, borderBottomColor: BORDER,
  },
  backBtn:     { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontFamily: FontFamily.bold, fontSize: 16, color: TEXT },

  scroll: { padding: 16, gap: 10, paddingBottom: 40 },

  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: SURFACE, borderRadius: 14, borderWidth: 1.5, borderColor: BORDER, padding: 14,
    shadowColor: TEXT, shadowOpacity: 0.04, shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 }, elevation: 1,
  },
  cardDefault: { borderColor: PRIMARY, backgroundColor: '#FAFCFF' },
  iconBox:     { width: 42, height: 42, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  cardBody:    { flex: 1, gap: 4 },
  cardTopRow:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardLabel:   { fontFamily: FontFamily.semiBold, fontSize: 15, color: TEXT },
  defaultBadge:{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#EFF6FF', borderRadius: 99, paddingHorizontal: 7, paddingVertical: 2 },
  defaultBadgeTxt: { fontFamily: FontFamily.semiBold, fontSize: 9.5, color: PRIMARY },
  cardAddr:    { fontFamily: FontFamily.regular, fontSize: 12.5, color: MUTED, lineHeight: 18 },
  deleteBtn:   { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },

  addRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 14, paddingHorizontal: 4,
  },
  addIconBox: {
    width: 36, height: 36, borderRadius: 9,
    backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center',
  },
  addTxt: { fontFamily: FontFamily.semiBold, fontSize: 14, color: PRIMARY },

  addForm: {
    backgroundColor: SURFACE, borderRadius: 14, borderWidth: 1, borderColor: BORDER, padding: 16, gap: 12,
    shadowColor: TEXT, shadowOpacity: 0.04, shadowRadius: 8,
    shadowOffset: { width: 0, height: 1 }, elevation: 1,
  },
  addFormTitle: { fontFamily: FontFamily.bold, fontSize: 15, color: TEXT },
  fieldWrap:    { gap: 5 },
  fieldLabel:   { fontFamily: FontFamily.semiBold, fontSize: 13, color: TEXTSUB },
  fieldInput: {
    backgroundColor: BG, borderRadius: 9, borderWidth: 1.5, borderColor: BORDER,
    paddingHorizontal: 12, paddingVertical: 11,
    fontFamily: FontFamily.regular, fontSize: 14, color: TEXT,
  },
  addFormActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  cancelBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 13, borderRadius: 10,
    borderWidth: 1.5, borderColor: BORDER, backgroundColor: SURFACE,
  },
  cancelTxt: { fontFamily: FontFamily.semiBold, fontSize: 14, color: TEXTSUB },
  saveBtn:   {
    flex: 2, alignItems: 'center', justifyContent: 'center', paddingVertical: 13,
    borderRadius: 10, backgroundColor: PRIMARY,
  },
  saveTxt: { fontFamily: FontFamily.bold, fontSize: 14, color: SURFACE },
});
