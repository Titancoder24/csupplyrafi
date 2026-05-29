import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, ActivityIndicator, Modal, Alert } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Plus, Pencil, Trash2, X, Check, Upload } from 'lucide-react-native';
import { Colors, FontFamily, Radius, Shadow } from '@/constants/theme';
import { supabase } from '@/services/supabase';
import { useAuth } from '@/services/auth/AuthProvider';
import { toast } from '@/services/toast';

type Brand = { id: string; name: string; slug: string; logo_url?: string; is_featured: boolean };

/** Small logo preview that falls back to letter-mark initials when no image,
 *  or when the URL fails to load (broken Google images, hot-link blocked, etc). */
function BrandLogo({ url, name, size = 32 }: { url?: string | null; name: string; size?: number }) {
  const [err, setErr] = useState(false);
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';
  const showImg = url && url.startsWith('http') && !err;
  return (
    <View style={[styles.brandDot, { width: size, height: size, borderRadius: 8 }]}>
      {showImg ? (
        <Image
          source={{ uri: url! }}
          style={{ width: size, height: size, borderRadius: 8 }}
          contentFit="contain"
          onError={() => setErr(true)}
          transition={150}
        />
      ) : (
        <Text style={{ fontFamily: FontFamily.bold, fontSize: size * 0.36, color: Colors.textSecondary }}>
          {initials}
        </Text>
      )}
    </View>
  );
}

export default function BrandsScreen() {
  const { profile } = useAuth();
  const [brands, setBrands]   = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]     = useState(false);
  const [editing, setEditing] = useState<Brand | null>(null);
  const [form, setForm]       = useState({ name: '', slug: '', logo_url: '', is_featured: false });
  const [saving, setSaving]   = useState(false);
  const [uploading, setUploading] = useState(false);
  /** Local file URI selected from the device — uploaded on save and becomes logo_url */
  const [pickedUri, setPickedUri] = useState<string | null>(null);

  useEffect(() => { fetchBrands(); }, []);

  async function fetchBrands() {
    setLoading(true);
    try {
      const { data } = await supabase.from('brands').select('*').order('sort_order').order('name');
      setBrands(data ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditing(null);
    setForm({ name: '', slug: '', logo_url: '', is_featured: false });
    setPickedUri(null);
    setModal(true);
  }

  function openEdit(b: Brand) {
    setEditing(b);
    setForm({ name: b.name, slug: b.slug, logo_url: b.logo_url ?? '', is_featured: b.is_featured });
    setPickedUri(null);
    setModal(true);
  }

  /** Open the device gallery and stage the chosen file for upload-on-save. */
  async function pickImage() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission required', 'Allow photo access to upload a brand logo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!result.canceled && result.assets[0]) {
      setPickedUri(result.assets[0].uri);
      // Clear any pasted URL so it doesn't override the upload
      setForm(f => ({ ...f, logo_url: '' }));
    }
  }

  /** Upload the staged local image to Supabase Storage and return its public URL. */
  async function uploadLogo(uri: string): Promise<string | null> {
    const { data: { user } } = await supabase.auth.getUser();
    const uid = user?.id ?? profile?.id;
    if (!uid) return null;
    setUploading(true);
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const mime = blob.type || 'image/jpeg';
      const ext  = mime.split('/').pop()?.replace('jpeg', 'jpg') || 'jpg';

      // Stored alongside category images under a brands/ prefix so the
      // existing admin-write RLS on `category-images` covers this path too.
      const path = `brands/${uid}/${Date.now()}.${ext}`;
      const { data, error } = await supabase.storage
        .from('category-images')
        .upload(path, blob, { contentType: mime, upsert: false });
      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage.from('category-images').getPublicUrl(data.path);
      return publicUrl;
    } catch (err: any) {
      console.error('[uploadLogo] failed:', err);
      toast.error('Upload failed', err?.message ?? 'Try a smaller image');
      return null;
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      let finalLogoUrl: string | null = form.logo_url || null;

      // If the admin staged a device file, upload it first and use the resulting URL.
      if (pickedUri) {
        const uploaded = await uploadLogo(pickedUri);
        if (!uploaded) { setSaving(false); return; } // toast already fired
        finalLogoUrl = uploaded;
      }

      const slug = form.slug || form.name.toLowerCase().replace(/\s+/g, '-');
      const payload = { name: form.name, slug, logo_url: finalLogoUrl, is_featured: form.is_featured };
      if (editing) {
        await supabase.from('brands').update(payload).eq('id', editing.id);
      } else {
        await supabase.from('brands').insert(payload);
      }
      setModal(false);
      setPickedUri(null);
      fetchBrands();
    } finally {
      setSaving(false);
    }
  }

  async function deleteBrand(id: string) {
    await supabase.from('brands').delete().eq('id', id);
    setBrands(b => b.filter(x => x.id !== id));
  }

  async function toggleFeatured(b: Brand) {
    await supabase.from('brands').update({ is_featured: !b.is_featured }).eq('id', b.id);
    setBrands(list => list.map(x => x.id === b.id ? { ...x, is_featured: !x.is_featured } : x));
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.scroll}>
      <View style={styles.toolbar}>
        <Text style={styles.count}>{brands.length} brands</Text>
        <Pressable style={styles.addBtn} onPress={openCreate}>
          <Plus size={16} color="#FFFFFF" />
          <Text style={styles.addBtnText}>Add Brand</Text>
        </Pressable>
      </View>

      <View style={styles.table}>
        <View style={styles.tableHead}>
          <Text style={[styles.th, { flex: 2 }]}>Brand Name</Text>
          <Text style={[styles.th, { flex: 1.5 }]}>Slug</Text>
          <Text style={[styles.th, { flex: 1 }]}>Featured</Text>
          <Text style={[styles.th, { flex: 1.5 }]}>Logo URL</Text>
          <Text style={[styles.th, { flex: 1, textAlign: 'right' }]}>Actions</Text>
        </View>

        {loading ? (
          <View style={styles.loader}><ActivityIndicator color={Colors.primary} /></View>
        ) : brands.length === 0 ? (
          <View style={styles.empty}><Text style={styles.emptyText}>No brands yet.</Text></View>
        ) : brands.map((b, i) => (
          <View key={b.id} style={[styles.row, i % 2 === 0 && styles.rowAlt]}>
            <View style={{ flex: 2, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <BrandLogo url={b.logo_url} name={b.name} />
              <Text style={styles.td}>{b.name}</Text>
            </View>
            <Text style={[styles.td, { flex: 1.5, color: Colors.textMuted, fontSize: 11 }]}>{b.slug}</Text>
            <Pressable style={{ flex: 1 }} onPress={() => toggleFeatured(b)}>
              <Text style={[styles.pill, b.is_featured
                ? { color: Colors.green, backgroundColor: Colors.green + '18' }
                : { color: Colors.textMuted, backgroundColor: Colors.muted }
              ]}>
                {b.is_featured ? 'Featured' : 'No'}
              </Text>
            </Pressable>
            <Text
              style={[styles.td, { flex: 1.5, color: b.logo_url ? Colors.textSecondary : Colors.textMuted, fontSize: 10 }]}
              numberOfLines={1}
              ellipsizeMode="middle"
            >
              {b.logo_url || '—'}
            </Text>
            <View style={[styles.actions, { flex: 1 }]}>
              <Pressable style={[styles.iconBtn, { backgroundColor: Colors.primary + '18' }]} onPress={() => openEdit(b)}>
                <Pencil size={14} color="#0F172A" />
              </Pressable>
              <Pressable style={[styles.iconBtn, { backgroundColor: Colors.red + '18' }]} onPress={() => deleteBrand(b.id)}>
                <Trash2 size={14} color="#0F172A" />
              </Pressable>
            </View>
          </View>
        ))}
      </View>

      <Modal visible={modal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editing ? 'Edit Brand' : 'Add Brand'}</Text>
              <Pressable onPress={() => setModal(false)}><X size={20} color="#0F172A" /></Pressable>
            </View>
            <View style={styles.modalBody}>
              <Text style={styles.fieldLabel}>Brand Name *</Text>
              <TextInput style={styles.input} placeholder="e.g. UltraTech" placeholderTextColor={Colors.textMuted} value={form.name} onChangeText={v => setForm(f => ({ ...f, name: v }))} />
              <Text style={styles.fieldLabel}>Slug</Text>
              <TextInput style={styles.input} placeholder="auto-generated" placeholderTextColor={Colors.textMuted} value={form.slug} onChangeText={v => setForm(f => ({ ...f, slug: v }))} />
              <Text style={styles.fieldLabel}>Brand Logo</Text>
              <View style={styles.logoChoiceRow}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Paste image URL  or  tap Upload →"
                  placeholderTextColor={Colors.textMuted}
                  value={form.logo_url}
                  onChangeText={v => { setForm(f => ({ ...f, logo_url: v })); if (pickedUri) setPickedUri(null); }}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!pickedUri}
                />
                <Pressable
                  style={({ pressed }) => [styles.uploadBtn, pressed && { opacity: 0.85 }]}
                  onPress={pickImage}
                  disabled={uploading}
                >
                  {uploading
                    ? <ActivityIndicator color={Colors.primary} size="small" />
                    : (<><Upload size={14} color="#0F172A" strokeWidth={2.2} /><Text style={styles.uploadBtnTxt}>Upload</Text></>)
                  }
                </Pressable>
              </View>
              {pickedUri && (
                <Pressable
                  onPress={() => setPickedUri(null)}
                  style={({ pressed }) => [styles.clearPicked, pressed && { opacity: 0.7 }]}
                >
                  <X size={11} color="#0F172A" strokeWidth={2.2} />
                  <Text style={styles.clearPickedTxt}>Remove picked image · use URL instead</Text>
                </Pressable>
              )}
              <View style={styles.previewRow}>
                <Text style={styles.previewLabel}>Preview</Text>
                <BrandLogo
                  url={pickedUri || form.logo_url}
                  name={form.name || 'New brand'}
                  size={56}
                />
                <Text style={styles.previewHint}>
                  {pickedUri
                    ? 'Picked from device. Uploads on save.'
                    : form.logo_url
                      ? 'Loads as shown above; falls back to initials if blocked.'
                      : 'Paste an image URL or tap Upload to add a logo.'}
                </Text>
              </View>
              <Pressable
                style={[styles.checkRow]}
                onPress={() => setForm(f => ({ ...f, is_featured: !f.is_featured }))}
              >
                <View style={[styles.checkbox, form.is_featured && styles.checkboxChecked]}>
                  {form.is_featured && <Check size={12} color="#FFFFFF" />}
                </View>
                <Text style={styles.checkLabel}>Mark as Featured Brand</Text>
              </Pressable>
            </View>
            <View style={styles.modalFooter}>
              <Pressable style={styles.cancelBtn} onPress={() => setModal(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.saveBtn, (saving || uploading) && { opacity: 0.6 }]}
                onPress={save}
                disabled={saving || uploading}
              >
                {(saving || uploading)
                  ? <ActivityIndicator color={Colors.white} size="small" />
                  : (<><Check size={15} color="#FFFFFF" /><Text style={styles.saveText}>Save</Text></>)
                }
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F1F5F9' },
  scroll: { padding: 24, gap: 16 },
  toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  count: { fontFamily: FontFamily.semiBold, fontSize: 14, color: Colors.textSecondary },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.primary, borderRadius: Radius.md, paddingHorizontal: 16, paddingVertical: 10 },
  addBtnText: { fontFamily: FontFamily.semiBold, fontSize: 14, color: Colors.white },
  table: { backgroundColor: Colors.white, borderRadius: Radius.lg, overflow: 'hidden', ...Shadow.card },
  tableHead: { flexDirection: 'row', backgroundColor: Colors.muted, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border },
  th: { fontFamily: FontFamily.semiBold, fontSize: 11, color: Colors.textMuted, textTransform: 'uppercase' },
  row: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, alignItems: 'center' },
  rowAlt: { backgroundColor: '#FAFAFA' },
  td: { fontFamily: FontFamily.regular, fontSize: 13, color: Colors.textPrimary },
  pill: { fontFamily: FontFamily.semiBold, fontSize: 10, paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full, alignSelf: 'flex-start' },
  brandDot: { backgroundColor: Colors.muted, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  previewRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.muted, borderRadius: Radius.md,
    paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1, borderColor: Colors.border,
  },
  previewLabel: { fontFamily: FontFamily.semiBold, fontSize: 11, color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.4 },
  previewHint:  { flex: 1, fontFamily: FontFamily.regular, fontSize: 11, color: Colors.textMuted, lineHeight: 15 },

  /* Upload UI */
  logoChoiceRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  uploadBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    height: 44, paddingHorizontal: 14,
    borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.primary + '40',
    backgroundColor: Colors.primary + '12',
  },
  uploadBtnTxt: { fontFamily: FontFamily.semiBold, fontSize: 13, color: Colors.primary, letterSpacing: 0.05 },
  clearPicked: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    alignSelf: 'flex-start',
    paddingVertical: 4,
  },
  clearPickedTxt: { fontFamily: FontFamily.medium, fontSize: 11, color: Colors.red },
  actions: { flexDirection: 'row', gap: 6, justifyContent: 'flex-end' },
  iconBtn: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  loader: { padding: 40, alignItems: 'center' },
  empty: { padding: 40, alignItems: 'center' },
  emptyText: { fontFamily: FontFamily.regular, fontSize: 13, color: Colors.textMuted },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  modalBox: { width: 440, backgroundColor: Colors.white, borderRadius: Radius.xl, overflow: 'hidden', ...Shadow.card },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: Colors.border },
  modalTitle: { fontFamily: FontFamily.bold, fontSize: 17, color: Colors.textPrimary },
  modalBody: { padding: 20, gap: 12 },
  fieldLabel: { fontFamily: FontFamily.semiBold, fontSize: 12, color: Colors.textSecondary },
  input: { height: 44, borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.md, paddingHorizontal: 14, fontFamily: FontFamily.regular, fontSize: 14, color: Colors.textPrimary, backgroundColor: Colors.muted },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  checkbox: { width: 20, height: 20, borderRadius: 5, borderWidth: 2, borderColor: Colors.border, backgroundColor: Colors.muted, alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  checkLabel: { fontFamily: FontFamily.medium, fontSize: 14, color: Colors.textPrimary },
  modalFooter: { flexDirection: 'row', gap: 10, padding: 20, justifyContent: 'flex-end', borderTopWidth: 1, borderTopColor: Colors.border },
  cancelBtn: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border },
  cancelText: { fontFamily: FontFamily.semiBold, fontSize: 14, color: Colors.textSecondary },
  saveBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 18, paddingVertical: 10, borderRadius: Radius.md, backgroundColor: Colors.primary },
  saveText: { fontFamily: FontFamily.semiBold, fontSize: 14, color: Colors.white },
});
