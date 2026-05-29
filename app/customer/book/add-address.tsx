import React, { useState } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet,
  TextInput, ActivityIndicator, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, CheckCircle2, Home, Briefcase, MapPin, Link2 } from 'lucide-react-native';
import { MapPicker, MapLocation } from '@/components/ui/MapPicker';
import { supabase } from '@/services/supabase';
import { useAuth } from '@/services/auth/AuthProvider';
import { useBooking } from '@/stores/booking';
import { useQueryClient } from '@tanstack/react-query';
import { FontFamily } from '@/constants/theme';

const BG      = '#F8FAFC';
const SURFACE = '#FFFFFF';
const BORDER  = '#E2E8F0';
const TEXT    = '#0F172A';
const MUTED   = '#64748B';
const PRIMARY = '#15803D';
const PRIMLT  = '#F0FDF4';
const PT      = Platform.OS === 'ios' ? 56 : Platform.OS === 'web' ? 16 : 28;

const LABEL_PRESETS: Array<{ key: string; icon: any }> = [
  { key: 'Home',   icon: Home },
  { key: 'Office', icon: Briefcase },
  { key: 'Other',  icon: MapPin },
];

export default function AddAddress() {
  const router      = useRouter();
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const setBooking  = useBooking(s => s.set);

  const [label, setLabel]           = useState('Home');
  const [customLabel, setCustomLabel] = useState('');
  const [instructions, setInstructions] = useState('');
  const [loc, setLoc]               = useState<MapLocation | undefined>(undefined);
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState<string | null>(null);

  // Google Maps URL parsing
  const [gmapsUrl, setGmapsUrl]     = useState('');
  const [parsing, setParsing]       = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsedAddress, setParsedAddress] = useState<string | null>(null);

  async function useGmapsUrl() {
    setParseError(null);
    setParsedAddress(null);
    const url = gmapsUrl.trim();
    if (!url) { setParseError('Paste a Google Maps URL first.'); return; }

    // Match patterns like:
    //  …/@12.9716,77.5946,17z…
    //  ?q=12.9716,77.5946
    //  /place/Name/@lat,lng,zoom/…
    //  /@lat,lng,zoom
    let lat: number | null = null;
    let lng: number | null = null;

    const atMatch = url.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
    if (atMatch) {
      lat = parseFloat(atMatch[1]);
      lng = parseFloat(atMatch[2]);
    } else {
      const qMatch = url.match(/[?&]q=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
      if (qMatch) {
        lat = parseFloat(qMatch[1]);
        lng = parseFloat(qMatch[2]);
      }
    }

    if (lat === null || lng === null) {
      if (/maps\.app\.goo\.gl|goo\.gl\/maps/i.test(url)) {
        setParseError("This is a shortened link. Open it in Google Maps → tap Share → Copy link, then paste the long URL here.");
      } else {
        setParseError("Couldn't read coordinates from this URL. Paste a full Google Maps link (with @lat,lng) or pin the location manually below.");
      }
      return;
    }

    setParsing(true);
    try {
      const r = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
        { headers: { 'User-Agent': 'CSupply/1.0 (csupply-app)' } },
      );
      const j = (await r.json()) as { display_name?: string };
      const addressText = j?.display_name ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
      setLoc({ lat, lng, address: addressText });
      setParsedAddress(addressText);
    } catch {
      const fallback = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
      setLoc({ lat, lng, address: fallback });
      setParsedAddress(fallback);
    } finally {
      setParsing(false);
    }
  }

  const finalLabel = label === 'Other' ? customLabel.trim() : label;
  const canSave    = finalLabel.length > 0 && !!loc?.address;

  async function save() {
    if (!profile?.id) { setError('Sign in required'); return; }
    if (!canSave)     { setError('Pick a location on the map and choose a label.'); return; }
    setSaving(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('addresses')
        .insert({
          profile_id: profile.id,
          label:   finalLabel,
          line1:   loc!.address,
          line2:   instructions.trim() || null,
          lat:     loc!.lat,
          lng:     loc!.lng,
        })
        .select('id')
        .single();
      if (error) throw error;
      setBooking({ addressId: data.id });
      queryClient.invalidateQueries({ queryKey: ['addresses', profile.id] });
      router.back();
    } catch (e: any) {
      setError(e?.message ?? 'Could not save address.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={s.root}>
      <View style={s.header}>
        <View style={[s.headerRow, { paddingTop: PT > 0 ? PT : 14 }]}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={s.backBtn}>
            <ArrowLeft size={20} color="#0F172A" strokeWidth={2} />
          </Pressable>
          <Text style={s.headerTitle}>Add New Address</Text>
          <View style={s.backBtn} />
        </View>
      </View>

      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <Text style={s.sectionLabel}>Paste a Google Maps URL (optional)</Text>
        <View style={s.gmapsRow}>
          <View style={s.gmapsInputWrap}>
            <Link2 size={14} color="#0F172A" strokeWidth={2} />
            <TextInput
              style={s.gmapsInput}
              value={gmapsUrl}
              onChangeText={(t) => { setGmapsUrl(t); setParseError(null); setParsedAddress(null); }}
              placeholder="https://maps.google.com/?q=..."
              placeholderTextColor="#94A3B8"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          <Pressable
            style={[s.gmapsBtn, (parsing || !gmapsUrl.trim()) && s.gmapsBtnDis]}
            disabled={parsing || !gmapsUrl.trim()}
            onPress={useGmapsUrl}
          >
            {parsing ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.gmapsBtnTxt}>Use</Text>}
          </Pressable>
        </View>
        {parseError ? <Text style={s.gmapsErr}>{parseError}</Text> : null}
        {parsedAddress ? (
          <View style={s.gmapsOkBox}>
            <CheckCircle2 size={14} color="#0F172A" strokeWidth={2.2} />
            <Text style={s.gmapsOkTxt} numberOfLines={2}>{parsedAddress}</Text>
          </View>
        ) : (
          <Text style={s.gmapsHint}>We'll extract the address from the URL. You can still refine the pin on the map below.</Text>
        )}

        <Text style={[s.sectionLabel, { marginTop: 18 }]}>Pin your delivery location</Text>
        <MapPicker
          label="Delivery location"
          value={loc}
          onSelect={(picked) => setLoc(picked)}
          placeholder="Search a street, building or landmark…"
        />

        <Text style={[s.sectionLabel, { marginTop: 20 }]}>Save this address as</Text>
        <View style={s.labelRow}>
          {LABEL_PRESETS.map(({ key, icon: Icon }) => {
            const active = label === key;
            return (
              <Pressable
                key={key}
                style={[s.labelChip, active && s.labelChipActive]}
                onPress={() => setLabel(key)}
              >
                <Icon size={14} color="#0F172A" strokeWidth={2.2} />
                <Text style={[s.labelChipTxt, active && s.labelChipTxtActive]}>{key}</Text>
              </Pressable>
            );
          })}
        </View>
        {label === 'Other' ? (
          <TextInput
            style={[s.input, { marginTop: 10 }]}
            value={customLabel}
            onChangeText={setCustomLabel}
            placeholder="e.g. Warehouse, Site A"
            placeholderTextColor="#94A3B8"
          />
        ) : null}

        <Text style={[s.sectionLabel, { marginTop: 20 }]}>Delivery instructions (optional)</Text>
        <TextInput
          style={[s.input, s.textarea]}
          value={instructions}
          onChangeText={setInstructions}
          placeholder="e.g. Gate 2, ring the bell, call before arrival…"
          placeholderTextColor="#94A3B8"
          multiline
          numberOfLines={4}
        />

        {error ? <Text style={s.err}>{error}</Text> : null}
      </ScrollView>

      <View style={s.stickyBar}>
        <Pressable
          style={[s.btn, (!canSave || saving) && s.btnDis]}
          disabled={!canSave || saving}
          onPress={save}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <CheckCircle2 size={16} color="#FFFFFF" strokeWidth={2.5} />
              <Text style={s.btnTxt}>Save & Use This Address</Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  header: { backgroundColor: SURFACE, borderBottomWidth: 1, borderBottomColor: BORDER },
  headerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4, paddingBottom: 12 },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22 },
  headerTitle: { flex: 1, textAlign: 'center', fontFamily: FontFamily.bold, fontSize: 16, color: TEXT },

  scroll: { padding: 16, paddingBottom: 140 },

  sectionLabel: { fontFamily: FontFamily.semiBold, fontSize: 13, color: TEXT, marginBottom: 8, letterSpacing: 0.2 },

  /* Google Maps URL input */
  gmapsRow: { flexDirection: 'row', gap: 8, alignItems: 'stretch' },
  gmapsInputWrap: {
    flex: 1,
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: SURFACE,
    borderWidth: 1, borderColor: BORDER, borderRadius: 10,
    paddingHorizontal: 12, height: 44,
  },
  gmapsInput: {
    flex: 1, fontFamily: FontFamily.regular, fontSize: 13, color: TEXT,
    // @ts-ignore web
    outlineStyle: 'none',
  },
  gmapsBtn: {
    height: 44, paddingHorizontal: 16, borderRadius: 10,
    backgroundColor: PRIMARY,
    alignItems: 'center', justifyContent: 'center', minWidth: 64,
  },
  gmapsBtnDis: { opacity: 0.5 },
  gmapsBtnTxt: { fontFamily: FontFamily.semiBold, fontSize: 13, color: '#fff' },
  gmapsErr: {
    fontFamily: FontFamily.medium, fontSize: 12, color: '#DC2626',
    marginTop: 8, lineHeight: 17,
  },
  gmapsHint: {
    fontFamily: FontFamily.regular, fontSize: 11.5, color: MUTED,
    marginTop: 8, lineHeight: 16,
  },
  gmapsOkBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    marginTop: 8, padding: 10,
    backgroundColor: PRIMLT,
    borderRadius: 8, borderWidth: 1, borderColor: '#BBF7D0',
  },
  gmapsOkTxt: {
    flex: 1, fontFamily: FontFamily.medium, fontSize: 12.5, color: PRIMARY,
    lineHeight: 17,
  },

  labelRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  labelChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: SURFACE, borderWidth: 1, borderColor: BORDER,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10,
  },
  labelChipActive: { backgroundColor: PRIMLT, borderColor: PRIMARY },
  labelChipTxt: { fontFamily: FontFamily.semiBold, fontSize: 13, color: MUTED },
  labelChipTxtActive: { color: PRIMARY },

  input: {
    backgroundColor: SURFACE,
    borderWidth: 1, borderColor: BORDER, borderRadius: 10,
    paddingHorizontal: 14, height: 46,
    fontFamily: FontFamily.regular, fontSize: 14, color: TEXT,
    // @ts-ignore web
    outlineStyle: 'none',
  },
  textarea: {
    height: 100, paddingTop: 12, paddingBottom: 12,
    textAlignVertical: 'top',
  },

  err: {
    fontFamily: FontFamily.medium, fontSize: 12, color: '#DC2626',
    marginTop: 12,
  },

  stickyBar: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    backgroundColor: SURFACE,
    borderTopWidth: 1, borderTopColor: BORDER,
    paddingHorizontal: 16, paddingVertical: 14,
    paddingBottom: Platform.OS === 'ios' ? 28 : 14,
  },
  btn: {
    height: 50, borderRadius: 12, backgroundColor: PRIMARY,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  btnDis: { opacity: 0.5 },
  btnTxt: { fontFamily: FontFamily.bold, fontSize: 15, color: '#fff' },
});
