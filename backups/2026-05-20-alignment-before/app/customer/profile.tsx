import React, { useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet, ScrollView, Platform, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, User, Mail, Phone, CheckCircle2 } from 'lucide-react-native';
import { useAuth } from '@/services/auth/AuthProvider';
import { supabase } from '@/services/supabase';
import { FontFamily } from '@/constants/theme';

const BG      = '#F8FAFC';
const SURFACE = '#FFFFFF';
const BORDER  = '#E2E8F0';
const TEXT    = '#0F172A';
const TEXTSUB = '#334155';
const MUTED   = '#64748B';
const PRIMARY = '#1D4ED8';
const GREEN   = '#15803D';
const GREENLT = '#F0FDF4';
const PT      = Platform.OS === 'ios' ? 56 : Platform.OS === 'web' ? 0 : 36;

function Field({
  label, value, onChange, placeholder, keyboardType = 'default',
  autoCapitalize = 'none', editable = true,
  icon: Icon, iconColor,
}: {
  label: string; value: string; onChange?: (v: string) => void;
  placeholder: string; keyboardType?: any; autoCapitalize?: any; editable?: boolean;
  icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  iconColor: string;
}) {
  return (
    <View style={f.wrap}>
      <Text style={f.label}>{label}</Text>
      <View style={[f.row, !editable && f.rowDisabled]}>
        <View style={[f.iconBox, { backgroundColor: iconColor + '18' }]}>
          <Icon size={15} color="#0F172A" strokeWidth={2} />
        </View>
        <TextInput
          style={f.input}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={MUTED}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          editable={editable}
        />
      </View>
    </View>
  );
}

const f = StyleSheet.create({
  wrap:  { gap: 6 },
  label: { fontFamily: FontFamily.semiBold, fontSize: 13, color: TEXTSUB },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: SURFACE, borderRadius: 10, borderWidth: 1.5, borderColor: BORDER,
    paddingHorizontal: 12, paddingVertical: 12,
  },
  rowDisabled: { backgroundColor: BG, borderColor: BORDER },
  iconBox: { width: 28, height: 28, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  input: { flex: 1, fontFamily: FontFamily.regular, fontSize: 14, color: TEXT },
});

export default function Profile() {
  const router = useRouter();
  const { profile } = useAuth();
  const [name,    setName]    = useState(profile?.full_name ?? '');
  const [email,   setEmail]   = useState(profile?.email ?? '');
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);

  const initials = name.trim().split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || 'U';

  const save = async () => {
    if (!profile?.id) return;
    setSaving(true);
    await supabase.from('profiles').update({ full_name: name }).eq('id', profile.id);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <View style={s.root}>
      {/* Header */}
      <View style={[s.header, { paddingTop: PT > 0 ? PT : 14 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={s.backBtn}>
          <ArrowLeft size={20} color="#0F172A" strokeWidth={2} />
        </Pressable>
        <Text style={s.headerTitle}>My Profile</Text>
        <View style={s.backBtn} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Avatar */}
        <View style={s.avatarSection}>
          <View style={s.avatarCircle}>
            <Text style={s.avatarTxt}>{initials}</Text>
          </View>
          <Text style={s.avatarName}>{name || 'Your Name'}</Text>
          <Text style={s.avatarPhone}>+91 {profile?.phone ?? '—'}</Text>
        </View>

        {/* Form */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Personal Information</Text>
          <View style={s.fields}>
            <Field
              label="Full Name"
              value={name}
              onChange={setName}
              placeholder="Your full name"
              autoCapitalize="words"
              icon={User}
              iconColor={PRIMARY}
            />
            <Field
              label="Email Address"
              value={email}
              onChange={setEmail}
              placeholder="you@example.com"
              keyboardType="email-address"
              icon={Mail}
              iconColor="#7C3AED"
            />
            <Field
              label="Phone Number"
              value={`+91 ${profile?.phone ?? ''}`}
              placeholder="+91 9876543210"
              editable={false}
              icon={Phone}
              iconColor={MUTED}
            />
          </View>
        </View>

        {saved && (
          <View style={s.savedBanner}>
            <CheckCircle2 size={16} color="#0F172A" strokeWidth={2} />
            <Text style={s.savedTxt}>Profile saved successfully</Text>
          </View>
        )}
      </ScrollView>

      <View style={s.stickyBar}>
        <Pressable style={[s.btn, saving && s.btnDis]} disabled={saving} onPress={save}>
          {saving
            ? <ActivityIndicator color={SURFACE} size="small" />
            : <Text style={s.btnTxt}>Save Changes</Text>
          }
        </Pressable>
      </View>
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
  backBtn:     { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22 },
  headerTitle: { flex: 1, textAlign: 'center', fontFamily: FontFamily.bold, fontSize: 16, color: TEXT },

  scroll: { padding: 16, gap: 16, paddingBottom: 32 },

  avatarSection: { alignItems: 'center', gap: 8, paddingVertical: 20 },
  avatarCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: PRIMARY, alignItems: 'center', justifyContent: 'center',
  },
  avatarTxt:   { fontFamily: FontFamily.bold, fontSize: 26, color: SURFACE },
  avatarName:  { fontFamily: FontFamily.bold, fontSize: 18, color: TEXT },
  avatarPhone: { fontFamily: FontFamily.regular, fontSize: 13, color: MUTED },

  card: {
    backgroundColor: SURFACE, borderRadius: 14, borderWidth: 1, borderColor: BORDER,
    padding: 16, gap: 14,
    shadowColor: TEXT, shadowOpacity: 0.04, shadowRadius: 8,
    shadowOffset: { width: 0, height: 1 }, elevation: 1,
  },
  cardTitle: { fontFamily: FontFamily.semiBold, fontSize: 14, color: TEXTSUB },
  fields:    { gap: 12 },

  savedBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: GREENLT, borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: '#BBF7D0',
  },
  savedTxt: { fontFamily: FontFamily.semiBold, fontSize: 13, color: GREEN },

  stickyBar: {
    paddingHorizontal: 16, paddingVertical: 12, paddingBottom: 28,
    backgroundColor: SURFACE, borderTopWidth: 1, borderTopColor: BORDER,
  },
  btn: {
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: PRIMARY, borderRadius: 12, paddingVertical: 15,
  },
  btnDis: { opacity: 0.5 },
  btnTxt: { fontFamily: FontFamily.bold, fontSize: 15, color: SURFACE },
});
