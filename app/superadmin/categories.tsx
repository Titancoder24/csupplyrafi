import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, TextInput, ActivityIndicator,
  Modal, Image, Alert,
} from 'react-native';
import { Plus, Pencil, Trash2, X, Check, Camera, ImageOff } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { Colors, FontFamily, Radius, Shadow, Ink, Semantic } from '@/constants/theme';
import { supabase } from '@/services/supabase';
import { useAuth } from '@/services/auth/AuthProvider';
import { toast } from '@/services/toast';

type Category = {
  id: string;
  name: string;
  slug: string;
  icon_url?: string | null;
  image_url?: string | null;
  product_count?: number;
};

export default function CategoriesScreen() {
  const { profile } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState({ name: '', slug: '', imageUri: '', iconUrl: '' });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => { fetchCategories(); }, []);

  async function fetchCategories() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, slug, icon_url, image_url')
        .order('name');
      if (error) throw error;
      setCategories((data ?? []) as Category[]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditing(null);
    setForm({ name: '', slug: '', imageUri: '', iconUrl: '' });
    setModal(true);
  }

  function openEdit(c: Category) {
    setEditing(c);
    setForm({
      name: c.name,
      slug: c.slug,
      imageUri: '',
      iconUrl: c.icon_url ?? c.image_url ?? '',
    });
    setModal(true);
  }

  async function pickImage() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission Required', 'Allow photo access to add category images.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.75,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!result.canceled && result.assets[0]) {
      setForm(f => ({ ...f, imageUri: result.assets[0].uri }));
    }
  }

  async function uploadImage(uri: string): Promise<string | null> {
    const { data: { user } } = await supabase.auth.getUser();
    const uid = user?.id ?? profile?.id;
    if (!uid) return null;
    setUploading(true);
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const mime = blob.type || 'image/jpeg';
      const ext  = mime.split('/').pop()?.replace('jpeg', 'jpg') || 'jpg';

      const path = `${uid}/${Date.now()}.${ext}`;
      const { data, error } = await supabase.storage
        .from('category-images')
        .upload(path, blob, { contentType: mime, upsert: false });
      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage.from('category-images').getPublicUrl(data.path);
      return publicUrl;
    } catch (err: any) {
      console.error('[uploadImage] failed:', err);
      toast.error('Image upload failed', err?.message ?? 'Try a smaller image');
      return null;
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    if (!form.name.trim()) {
      toast.error('Name required', 'Please enter a category name');
      return;
    }
    setSaving(true);
    try {
      // Upload new image if user picked one
      let finalIconUrl = form.iconUrl;
      if (form.imageUri) {
        const uploaded = await uploadImage(form.imageUri);
        if (uploaded) finalIconUrl = uploaded;
      }

      const slug = form.slug.trim() || form.name.trim().toLowerCase().replace(/\s+/g, '-');
      const payload = {
        name: form.name.trim(),
        slug,
        icon_url:  finalIconUrl || null,
        image_url: finalIconUrl || null,  // keep both fields in sync
      };

      if (editing) {
        const { error } = await supabase.from('categories').update(payload).eq('id', editing.id);
        if (error) throw error;
        toast.success('Category updated', form.name);
      } else {
        const { error } = await supabase.from('categories').insert({ ...payload, is_active: true });
        if (error) throw error;
        toast.success('Category created', form.name);
      }
      setModal(false);
      fetchCategories();
    } catch (err: any) {
      toast.error('Save failed', err?.message ?? 'Try again');
    } finally {
      setSaving(false);
    }
  }

  async function deleteCategory(id: string, name: string) {
    await supabase.from('categories').delete().eq('id', id);
    setCategories(c => c.filter(x => x.id !== id));
    toast.success('Deleted', `${name} removed`);
  }

  const previewUri = form.imageUri || form.iconUrl || null;

  return (
    <ScrollView style={s.root} contentContainerStyle={s.scroll}>
      <View style={s.toolbar}>
        <View>
          <Text style={s.title}>Categories</Text>
          <Text style={s.count}>{categories.length} active</Text>
        </View>
        <Pressable style={s.addBtn} onPress={openCreate}>
          <Plus size={16} color="#FFFFFF" strokeWidth={2.4} />
          <Text style={s.addBtnText}>Add Category</Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={{ padding: 60, alignItems: 'center' }}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      ) : (
        <View style={s.grid}>
          {categories.map((c) => {
            const photo = c.icon_url || c.image_url;
            return (
              <View key={c.id} style={s.card}>
                <View style={s.cardImageBox}>
                  {photo ? (
                    <Image source={{ uri: photo }} style={s.cardImage} resizeMode="cover" />
                  ) : (
                    <View style={s.noImage}>
                      <ImageOff size={28} color="#0F172A" strokeWidth={1.5} />
                      <Text style={s.noImageTxt}>No photo</Text>
                    </View>
                  )}
                </View>
                <View style={s.cardInfo}>
                  <Text style={s.cardName} numberOfLines={1}>{c.name}</Text>
                  <Text style={s.cardSlug}>/{c.slug}</Text>
                </View>
                <View style={s.cardActions}>
                  <Pressable
                    style={[s.iconBtn, { backgroundColor: Semantic.infoBg }]}
                    onPress={() => openEdit(c)}
                  >
                    <Pencil size={13} color="#0F172A" strokeWidth={2.2} />
                  </Pressable>
                  <Pressable
                    style={[s.iconBtn, { backgroundColor: Semantic.dangerBg }]}
                    onPress={() => deleteCategory(c.id, c.name)}
                  >
                    <Trash2 size={13} color="#0F172A" strokeWidth={2.2} />
                  </Pressable>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Edit/Create Modal */}
      <Modal visible={modal} transparent animationType="fade" onRequestClose={() => setModal(false)}>
        <Pressable style={s.modalBackdrop} onPress={() => setModal(false)}>
          <Pressable style={s.modalBox} onPress={() => {}}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>{editing ? 'Edit Category' : 'Add Category'}</Text>
              <Pressable onPress={() => setModal(false)} hitSlop={6}>
                <X size={20} color="#0F172A" strokeWidth={2} />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={s.modalBody}>
              {/* Photo upload */}
              <Text style={s.fieldLabel}>Category Photo</Text>
              <Pressable style={s.photoBox} onPress={pickImage} disabled={uploading || saving}>
                {previewUri ? (
                  <>
                    <Image source={{ uri: previewUri }} style={s.photoPreview} resizeMode="cover" />
                    <View style={s.photoChangeBadge}>
                      <Camera size={13} color="#FFFFFF" strokeWidth={2.4} />
                      <Text style={s.photoChangeTxt}>Change Photo</Text>
                    </View>
                  </>
                ) : (
                  <View style={s.photoEmpty}>
                    <Camera size={28} color="#0F172A" strokeWidth={1.5} />
                    <Text style={s.photoEmptyTxt}>Tap to add photo</Text>
                    <Text style={s.photoEmptyHint}>JPG, PNG or WebP · up to 5 MB</Text>
                  </View>
                )}
              </Pressable>

              <Text style={s.fieldLabel}>Category Name *</Text>
              <TextInput
                style={s.input}
                placeholder="e.g. Cement"
                placeholderTextColor={Colors.textMuted}
                value={form.name}
                onChangeText={v => setForm(f => ({ ...f, name: v }))}
              />

              <Text style={s.fieldLabel}>Slug (URL)</Text>
              <TextInput
                style={s.input}
                placeholder="auto-generated from name"
                placeholderTextColor={Colors.textMuted}
                value={form.slug}
                onChangeText={v => setForm(f => ({ ...f, slug: v }))}
                autoCapitalize="none"
              />
            </ScrollView>

            <View style={s.modalFooter}>
              <Pressable style={s.cancelBtn} onPress={() => setModal(false)} disabled={saving || uploading}>
                <Text style={s.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[s.saveBtn, (saving || uploading) && { opacity: 0.6 }]}
                onPress={save}
                disabled={saving || uploading}
              >
                {(saving || uploading) ? (
                  <ActivityIndicator color={Colors.white} size="small" />
                ) : (
                  <>
                    <Check size={15} color="#FFFFFF" strokeWidth={2.4} />
                    <Text style={s.saveText}>{editing ? 'Save Changes' : 'Create Category'}</Text>
                  </>
                )}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: Ink[100] },
  scroll: { padding: 24, gap: 16 },

  toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 },
  title:   { fontFamily: FontFamily.bold, fontSize: 20, color: Ink[900], letterSpacing: -0.3 },
  count:   { fontFamily: FontFamily.regular, fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.primary, borderRadius: Radius.md,
    paddingHorizontal: 16, paddingVertical: 10,
  },
  addBtnText: { fontFamily: FontFamily.semiBold, fontSize: 13, color: Colors.white },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: {
    width: 200,
    backgroundColor: Colors.white, borderRadius: Radius.lg,
    overflow: 'hidden', borderWidth: 1, borderColor: Colors.border,
    ...Shadow.card,
  },
  cardImageBox: { height: 110, backgroundColor: Ink[100] },
  cardImage:    { width: '100%', height: '100%' },
  noImage: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4,
  },
  noImageTxt: { fontFamily: FontFamily.regular, fontSize: 11, color: Ink[400] },
  cardInfo:   { padding: 12, gap: 2 },
  cardName:   { fontFamily: FontFamily.bold, fontSize: 14, color: Ink[900] },
  cardSlug:   { fontFamily: FontFamily.regular, fontSize: 11, color: Ink[500] },
  cardActions:{ flexDirection: 'row', gap: 6, paddingHorizontal: 12, paddingBottom: 12 },
  iconBtn:    { width: 28, height: 28, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },

  /* Modal */
  modalBackdrop: {
    flex: 1, backgroundColor: 'rgba(15,23,42,0.55)',
    alignItems: 'center', justifyContent: 'center', padding: 20,
  },
  modalBox: {
    width: '100%', maxWidth: 460, maxHeight: '92%',
    backgroundColor: Colors.white, borderRadius: 16, overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 18, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  modalTitle:  { fontFamily: FontFamily.bold, fontSize: 16, color: Ink[900] },
  modalBody:   { padding: 18, gap: 12 },

  fieldLabel:  { fontFamily: FontFamily.semiBold, fontSize: 12, color: Ink[700], marginBottom: 4 },
  input: {
    height: 44, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md,
    paddingHorizontal: 14, fontFamily: FontFamily.regular, fontSize: 14,
    color: Ink[900], backgroundColor: Colors.white,
    ...(({ outlineStyle: 'none' }) as any),
  },

  photoBox: {
    height: 180, borderRadius: Radius.md,
    borderWidth: 1.5, borderColor: Colors.border, borderStyle: 'dashed',
    backgroundColor: Ink[50], overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 4, position: 'relative' as const,
  },
  photoPreview: { width: '100%', height: '100%' },
  photoChangeBadge: {
    position: 'absolute' as const, bottom: 10, right: 10,
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(15,23,42,0.78)', borderRadius: 99,
    paddingHorizontal: 10, paddingVertical: 6,
  },
  photoChangeTxt: { fontFamily: FontFamily.semiBold, fontSize: 11, color: '#fff' },
  photoEmpty: { alignItems: 'center', gap: 6, padding: 20 },
  photoEmptyTxt:  { fontFamily: FontFamily.semiBold, fontSize: 14, color: Ink[700] },
  photoEmptyHint: { fontFamily: FontFamily.regular, fontSize: 11, color: Ink[400] },

  modalFooter: {
    flexDirection: 'row', gap: 10, padding: 18, justifyContent: 'flex-end',
    borderTopWidth: 1, borderTopColor: Colors.border,
  },
  cancelBtn:  {
    paddingHorizontal: 18, paddingVertical: 10, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.white,
  },
  cancelText: { fontFamily: FontFamily.semiBold, fontSize: 13, color: Colors.textSecondary },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 18, paddingVertical: 10, borderRadius: Radius.md,
    backgroundColor: Colors.primary,
  },
  saveText: { fontFamily: FontFamily.semiBold, fontSize: 13, color: Colors.white },
});
