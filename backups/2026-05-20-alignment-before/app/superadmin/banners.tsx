import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  TextInput, ActivityIndicator, Modal, Switch,
} from 'react-native';
import { Plus, Pencil, Trash2, X, Check, Image as ImageIcon, MoveUp, MoveDown } from 'lucide-react-native';
import { Colors, FontFamily, Radius, Shadow } from '@/constants/theme';
import { supabase } from '@/services/supabase';

type Banner = {
  id: string;
  title?: string;
  subtitle?: string;
  image_url: string;
  link_type: string;
  link_value?: string;
  sort_order: number;
  is_active: boolean;
};

const LINK_TYPES = ['none', 'category', 'product', 'url'];

export default function BannersScreen() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Banner | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: '', subtitle: '', image_url: '',
    link_type: 'none', link_value: '',
    sort_order: '0', is_active: true,
  });

  useEffect(() => { fetchBanners(); }, []);

  async function fetchBanners() {
    setLoading(true);
    const { data } = await supabase
      .from('banners')
      .select('*')
      .order('sort_order')
      .order('created_at');
    setBanners(data ?? []);
    setLoading(false);
  }

  function openCreate() {
    setEditing(null);
    setForm({
      title: '', subtitle: '', image_url: '',
      link_type: 'none', link_value: '',
      sort_order: String(banners.length),
      is_active: true,
    });
    setModal(true);
  }

  function openEdit(b: Banner) {
    setEditing(b);
    setForm({
      title: b.title ?? '',
      subtitle: b.subtitle ?? '',
      image_url: b.image_url,
      link_type: b.link_type ?? 'none',
      link_value: b.link_value ?? '',
      sort_order: String(b.sort_order),
      is_active: b.is_active,
    });
    setModal(true);
  }

  async function save() {
    if (!form.image_url.trim()) return;
    setSaving(true);
    const payload = {
      title: form.title || null,
      subtitle: form.subtitle || null,
      image_url: form.image_url.trim(),
      link_type: form.link_type,
      link_value: form.link_value || null,
      sort_order: parseInt(form.sort_order || '0'),
      is_active: form.is_active,
    };
    if (editing) {
      await supabase.from('banners').update(payload).eq('id', editing.id);
    } else {
      await supabase.from('banners').insert(payload);
    }
    setSaving(false);
    setModal(false);
    fetchBanners();
  }

  async function deleteBanner(id: string) {
    await supabase.from('banners').delete().eq('id', id);
    setBanners((b) => b.filter((x) => x.id !== id));
  }

  async function toggleActive(b: Banner) {
    await supabase.from('banners').update({ is_active: !b.is_active }).eq('id', b.id);
    setBanners((list) => list.map((x) => x.id === b.id ? { ...x, is_active: !x.is_active } : x));
  }

  async function moveOrder(b: Banner, dir: 'up' | 'down') {
    const idx = banners.indexOf(b);
    const swapIdx = dir === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= banners.length) return;
    const swap = banners[swapIdx];
    await supabase.from('banners').update({ sort_order: swap.sort_order }).eq('id', b.id);
    await supabase.from('banners').update({ sort_order: b.sort_order }).eq('id', swap.id);
    fetchBanners();
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.scroll}>
      {/* Toolbar */}
      <View style={styles.toolbar}>
        <Text style={styles.count}>{banners.length} banners</Text>
        <Pressable style={styles.addBtn} onPress={openCreate}>
          <Plus size={16} color="#FFFFFF" />
          <Text style={styles.addBtnText}>Add Banner</Text>
        </Pressable>
      </View>

      {/* Banner cards */}
      {loading ? (
        <View style={styles.loader}><ActivityIndicator color={Colors.primary} /></View>
      ) : banners.length === 0 ? (
        <View style={styles.empty}>
          <ImageIcon size={48} color="#0F172A" />
          <Text style={styles.emptyText}>No banners yet. Add your first banner.</Text>
        </View>
      ) : (
        <View style={styles.cardGrid}>
          {banners.map((b, i) => (
            <View key={b.id} style={[styles.bannerCard, !b.is_active && styles.bannerInactive]}>
              {/* Preview area */}
              <View style={styles.previewArea}>
                <ImageIcon size={28} color="#0F172A" />
                <Text style={styles.previewUrl} numberOfLines={1}>{b.image_url}</Text>
              </View>

              {/* Content */}
              <View style={styles.bannerContent}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.bannerTitle}>{b.title || '(No title)'}</Text>
                  {b.subtitle ? <Text style={styles.bannerSub}>{b.subtitle}</Text> : null}
                  <View style={styles.bannerMeta}>
                    <View style={[styles.pill, {
                      backgroundColor: b.is_active ? Colors.green + '18' : Colors.muted,
                    }]}>
                      <Text style={[styles.pillText, { color: b.is_active ? Colors.green : Colors.textMuted }]}>
                        {b.is_active ? 'Active' : 'Hidden'}
                      </Text>
                    </View>
                    {b.link_type !== 'none' && (
                      <View style={[styles.pill, { backgroundColor: Colors.primary + '18' }]}>
                        <Text style={[styles.pillText, { color: Colors.primary }]}>
                          {b.link_type}: {b.link_value}
                        </Text>
                      </View>
                    )}
                    <Text style={styles.sortText}>#{b.sort_order + 1}</Text>
                  </View>
                </View>

                {/* Actions */}
                <View style={styles.actions}>
                  <Pressable
                    style={[styles.iconBtn, { backgroundColor: '#F1F5F9' }]}
                    onPress={() => moveOrder(b, 'up')}
                    disabled={i === 0}
                  >
                    <MoveUp size={14} color="#0F172A" />
                  </Pressable>
                  <Pressable
                    style={[styles.iconBtn, { backgroundColor: '#F1F5F9' }]}
                    onPress={() => moveOrder(b, 'down')}
                    disabled={i === banners.length - 1}
                  >
                    <MoveDown size={14} color="#0F172A" />
                  </Pressable>
                  <Pressable
                    style={[styles.iconBtn, { backgroundColor: b.is_active ? Colors.green + '18' : Colors.muted }]}
                    onPress={() => toggleActive(b)}
                  >
                    <Check size={14} color="#0F172A" />
                  </Pressable>
                  <Pressable
                    style={[styles.iconBtn, { backgroundColor: Colors.primary + '18' }]}
                    onPress={() => openEdit(b)}
                  >
                    <Pencil size={14} color="#0F172A" />
                  </Pressable>
                  <Pressable
                    style={[styles.iconBtn, { backgroundColor: Colors.red + '18' }]}
                    onPress={() => deleteBanner(b.id)}
                  >
                    <Trash2 size={14} color="#0F172A" />
                  </Pressable>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Add/Edit Modal */}
      <Modal visible={modal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editing ? 'Edit Banner' : 'New Banner'}</Text>
              <Pressable onPress={() => setModal(false)}><X size={20} color="#0F172A" /></Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.modalBody}>
              <Text style={styles.fieldLabel}>Image URL *</Text>
              <TextInput
                style={styles.input}
                placeholder="https://cdn.example.com/banner.jpg"
                placeholderTextColor={Colors.textMuted}
                value={form.image_url}
                onChangeText={(v) => setForm((f) => ({ ...f, image_url: v }))}
                autoCapitalize="none"
              />

              <Text style={styles.fieldLabel}>Title</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Monsoon Sale — 20% Off"
                placeholderTextColor={Colors.textMuted}
                value={form.title}
                onChangeText={(v) => setForm((f) => ({ ...f, title: v }))}
              />

              <Text style={styles.fieldLabel}>Subtitle</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Limited period offer on cement"
                placeholderTextColor={Colors.textMuted}
                value={form.subtitle}
                onChangeText={(v) => setForm((f) => ({ ...f, subtitle: v }))}
              />

              <Text style={styles.fieldLabel}>Link Type</Text>
              <View style={styles.linkTypeRow}>
                {LINK_TYPES.map((lt) => (
                  <Pressable
                    key={lt}
                    onPress={() => setForm((f) => ({ ...f, link_type: lt }))}
                    style={[styles.linkChip,
                      form.link_type === lt && { backgroundColor: Colors.primary, borderColor: Colors.primary }
                    ]}
                  >
                    <Text style={[styles.linkChipText,
                      form.link_type === lt && { color: Colors.white }
                    ]}>
                      {lt}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {form.link_type !== 'none' && (
                <>
                  <Text style={styles.fieldLabel}>Link Value</Text>
                  <TextInput
                    style={styles.input}
                    placeholder={
                      form.link_type === 'category' ? 'cement' :
                      form.link_type === 'product' ? 'product-slug' :
                      'https://...'
                    }
                    placeholderTextColor={Colors.textMuted}
                    value={form.link_value}
                    onChangeText={(v) => setForm((f) => ({ ...f, link_value: v }))}
                    autoCapitalize="none"
                  />
                </>
              )}

              <Text style={styles.fieldLabel}>Sort Order</Text>
              <TextInput
                style={styles.input}
                placeholder="0"
                placeholderTextColor={Colors.textMuted}
                value={form.sort_order}
                onChangeText={(v) => setForm((f) => ({ ...f, sort_order: v }))}
                keyboardType="number-pad"
              />

              <View style={styles.toggleRow}>
                <Text style={styles.fieldLabel}>Active (visible to customers)</Text>
                <Switch
                  value={form.is_active}
                  onValueChange={(v) => setForm((f) => ({ ...f, is_active: v }))}
                  trackColor={{ true: Colors.green, false: Colors.border }}
                  thumbColor={Colors.white}
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <Pressable style={styles.cancelBtn} onPress={() => setModal(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.saveBtn, !form.image_url.trim() && { opacity: 0.5 }]}
                onPress={save}
                disabled={saving || !form.image_url.trim()}
              >
                {saving ? (
                  <ActivityIndicator color={Colors.white} size="small" />
                ) : (
                  <><Check size={15} color="#FFFFFF" /><Text style={styles.saveText}>Save Banner</Text></>
                )}
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
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.primary, borderRadius: Radius.md,
    paddingHorizontal: 16, paddingVertical: 10,
  },
  addBtnText: { fontFamily: FontFamily.semiBold, fontSize: 14, color: Colors.white },
  loader: { padding: 60, alignItems: 'center' },
  empty: { padding: 60, alignItems: 'center', gap: 12 },
  emptyText: { fontFamily: FontFamily.regular, fontSize: 14, color: Colors.textMuted, textAlign: 'center' },
  cardGrid: { gap: 12 },
  bannerCard: {
    backgroundColor: Colors.white, borderRadius: Radius.lg,
    overflow: 'hidden', ...Shadow.card,
  },
  bannerInactive: { opacity: 0.6 },
  previewArea: {
    height: 64, backgroundColor: Colors.muted,
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 10, paddingHorizontal: 16,
  },
  previewUrl: {
    fontFamily: FontFamily.regular, fontSize: 11,
    color: Colors.textMuted, flex: 1,
  },
  bannerContent: {
    flexDirection: 'row', alignItems: 'flex-start',
    padding: 14, gap: 12,
  },
  bannerTitle: { fontFamily: FontFamily.bold, fontSize: 14, color: Colors.textPrimary },
  bannerSub: { fontFamily: FontFamily.regular, fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  bannerMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8, alignItems: 'center' },
  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full },
  pillText: { fontFamily: FontFamily.semiBold, fontSize: 10 },
  sortText: { fontFamily: FontFamily.regular, fontSize: 11, color: Colors.textMuted },
  actions: { flexDirection: 'column', gap: 6 },
  iconBtn: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center', justifyContent: 'center',
  },
  modalBox: {
    width: 480, maxWidth: '92%', maxHeight: '90%',
    backgroundColor: Colors.white, borderRadius: Radius.xl,
    overflow: 'hidden', ...Shadow.card,
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 20, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  modalTitle: { fontFamily: FontFamily.bold, fontSize: 18, color: Colors.textPrimary },
  modalBody: { padding: 20, gap: 10 },
  fieldLabel: { fontFamily: FontFamily.semiBold, fontSize: 12, color: Colors.textSecondary },
  input: {
    height: 44, borderWidth: 1.5, borderColor: Colors.border,
    borderRadius: Radius.md, paddingHorizontal: 14,
    fontFamily: FontFamily.regular, fontSize: 14,
    color: Colors.textPrimary, backgroundColor: Colors.muted,
  },
  linkTypeRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  linkChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.full,
    borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.white,
  },
  linkChipText: { fontFamily: FontFamily.semiBold, fontSize: 13, color: Colors.textSecondary },
  toggleRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingVertical: 6,
  },
  modalFooter: {
    flexDirection: 'row', gap: 10, padding: 20,
    justifyContent: 'flex-end', borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  cancelBtn: {
    paddingHorizontal: 18, paddingVertical: 10,
    borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border,
  },
  cancelText: { fontFamily: FontFamily.semiBold, fontSize: 14, color: Colors.textSecondary },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 20, paddingVertical: 10,
    borderRadius: Radius.md, backgroundColor: Colors.primary,
  },
  saveText: { fontFamily: FontFamily.semiBold, fontSize: 14, color: Colors.white },
});
