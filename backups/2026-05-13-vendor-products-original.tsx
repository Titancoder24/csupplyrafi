import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, Pressable, ActivityIndicator,
  Modal, TextInput, StyleSheet, RefreshControl, Alert, Image,
} from 'react-native';
import { toast } from '@/services/toast';
import {
  Plus, Pencil, Trash2, X, Camera, Package,
  TrendingDown, Archive, CheckCircle2, AlertCircle,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { Screen } from '@/components/ui/Screen';
import { Header } from '@/components/ui/Header';
import { supabase } from '@/services/supabase';
import { useAuth } from '@/services/auth/AuthProvider';
import { formatINR } from '@/lib/format';
import { FontFamily, Semantic } from '@/constants/theme';

const G = Semantic.successFg;
const UNITS = ['bag', 'ton', 'kg', 'piece', 'sqft', 'rft', 'cum', 'litre'];

type Product = {
  id: string; name: string; slug: string;
  base_price: number; unit: string; stock_qty: number;
  status: string; category_id?: string; category_name?: string;
  low_stock_threshold?: number;
  images?: string[] | null;
};
type Category = { id: string; name: string };

/* ── Status badge ─────────────────────────────────────────────────── */
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; bg: string; fg: string }> = {
    active:   { label: 'Live',           bg: '#DCFCE7', fg: '#16A34A' },
    draft:    { label: 'Pending Review', bg: '#FEF3C7', fg: '#D97706' },
    inactive: { label: 'Rejected',       bg: '#FEE2E2', fg: '#DC2626' },
  };
  const c = map[status] ?? { label: status, bg: '#F3F4F6', fg: '#6B7280' };
  return (
    <View style={[b.badge, { backgroundColor: c.bg }]}>
      <Text style={[b.text, { color: c.fg }]}>{c.label}</Text>
    </View>
  );
}

/* ── Product image thumbnail ──────────────────────────────────────── */
function ProductThumb({ images }: { images?: string[] | null }) {
  const url = images?.[0];
  return url ? (
    <Image source={{ uri: url }} style={th.img} resizeMode="cover" />
  ) : (
    <View style={[th.img, th.placeholder]}>
      <Package size={24} color="#9CA3AF" strokeWidth={1.5} />
    </View>
  );
}

export default function VendorProducts() {
  const { profile } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [form, setForm] = useState({
    name: '', base_price: '', unit: 'bag',
    stock_qty: '', category_id: '', description: '',
    low_stock_threshold: '10', imageUri: '', imageUrl: '',
  });

  const load = useCallback(async (silent = false) => {
    if (!profile?.id) return;
    if (!silent) setLoading(true);
    const { data } = await supabase
      .from('products')
      .select('id, name, slug, base_price, unit, stock_qty, status, category_id, low_stock_threshold, images, categories(name)')
      .eq('vendor_id', profile.id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });
    setProducts((data ?? []).map((d: any) => ({
      id: d.id, name: d.name, slug: d.slug,
      base_price: d.base_price, unit: d.unit,
      stock_qty: d.stock_qty, status: d.status,
      low_stock_threshold: d.low_stock_threshold,
      images: d.images,
      category_id:   d.category_id,
      category_name: d.categories?.name,
    })));
    setLoading(false);
  }, [profile?.id]);

  useEffect(() => {
    load();
    loadCategories();
    if (!profile?.id) return;

    const channel = supabase
      .channel(`vendor-products-rt:${profile.id}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'products',
        filter: `vendor_id=eq.${profile.id}`,
      }, (payload: any) => {
        const oldStatus = payload.old?.status;
        const newStatus = payload.new?.status;
        if (newStatus !== oldStatus) {
          if (newStatus === 'active') {
            toast.success('Product Approved! 🎉', `"${payload.new?.name}" is now live for customers.`);
          } else if (newStatus === 'inactive') {
            toast.error('Product Rejected', `"${payload.new?.name}" was not approved. Update and resubmit.`);
          }
        }
        load(true);
      })
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'products',
        filter: `vendor_id=eq.${profile.id}`,
      }, () => load(true))
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [profile?.id, load]);

  async function loadCategories() {
    const { data } = await supabase.from('categories').select('id, name').eq('is_active', true).order('name');
    setCategories(data ?? []);
  }

  function openCreate() {
    setEditing(null);
    setSaveError('');
    setForm({ name: '', base_price: '', unit: 'bag', stock_qty: '0', category_id: '', description: '', low_stock_threshold: '10', imageUri: '', imageUrl: '' });
    setModal(true);
  }

  function openEdit(p: Product) {
    setEditing(p);
    setForm({
      name: p.name, base_price: String(p.base_price),
      unit: p.unit, stock_qty: String(p.stock_qty),
      category_id: p.category_id ?? '', description: '',
      low_stock_threshold: String(p.low_stock_threshold ?? 10),
      imageUri: '', imageUrl: p.images?.[0] ?? '',
    });
    setModal(true);
  }

  async function pickImage() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission Required', 'Allow photo access to add product images.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.75,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!result.canceled) {
      setForm(f => ({ ...f, imageUri: result.assets[0].uri, imageUrl: '' }));
    }
  }

  async function uploadImage(uri: string): Promise<string | null> {
    // Use auth.uid() so the path matches the storage RLS policy exactly
    const { data: { user } } = await supabase.auth.getUser();
    const uid = user?.id ?? profile?.id;
    if (!uid) return null;
    setUploading(true);
    try {
      // Fetch the blob first so we can read its actual MIME type
      const response = await fetch(uri);
      const blob = await response.blob();
      const mime = blob.type || 'image/jpeg';
      const ext  = mime.split('/').pop()?.replace('jpeg', 'jpg') || 'jpg';

      const path = `products/${uid}/${Date.now()}.${ext}`;
      const { data, error } = await supabase.storage
        .from('product-images')
        .upload(path, blob, { contentType: mime, upsert: false });
      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(data.path);
      return publicUrl;
    } catch (err: any) {
      console.error('[uploadImage] failed:', err);
      toast.error('Image upload failed', err?.message ?? 'Try again or use a smaller image');
      return null;
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    setSaveError('');
    if (!form.name.trim()) { setSaveError('Product name is required.'); return; }
    if (!form.base_price)  { setSaveError('Price is required.'); return; }
    if (categories.length > 0 && !form.category_id) {
      setSaveError('Please select a category for your product.');
      return;
    }

    // Use auth session as the source of truth for vendor_id
    const { data: { user } } = await supabase.auth.getUser();
    const vendorId = profile?.id ?? user?.id;
    if (!vendorId) {
      setSaveError('Session expired — please sign out and sign in again.');
      return;
    }

    setSaving(true);
    try {
      let finalImageUrl = form.imageUrl;
      if (form.imageUri) {
        const uploaded = await uploadImage(form.imageUri);
        if (uploaded) finalImageUrl = uploaded;
      }

      const payload: any = {
        name:                 form.name.trim(),
        base_price:           parseFloat(form.base_price),
        unit:                 form.unit,
        stock_qty:            parseInt(form.stock_qty || '0'),
        low_stock_threshold:  parseInt(form.low_stock_threshold || '10'),
        status:               'draft',
        images:               finalImageUrl ? [finalImageUrl] : (editing?.images ?? null),
      };
      if (form.category_id) payload.category_id = form.category_id;

      const SELECT_COLS = 'id, name, slug, base_price, unit, stock_qty, status, category_id, low_stock_threshold, images, categories(name)';

      let result;
      if (!editing) {
        // Ensure vendor_profiles row exists (FK requirement) — no-op if already there
        await supabase.from('vendor_profiles').upsert({ id: vendorId }, { onConflict: 'id', ignoreDuplicates: true });

        payload.slug      = form.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-' + Date.now();
        payload.vendor_id = vendorId;
        result = await supabase.from('products').insert(payload).select(SELECT_COLS).single();
      } else {
        result = await supabase.from('products').update(payload).eq('id', editing.id).select(SELECT_COLS).single();
      }

      if (result.error) {
        const msg = result.error.message ?? '';
        if (msg.includes('vendor_id') || msg.includes('vendor_profiles')) {
          setSaveError('Account setup incomplete. Please complete vendor onboarding first.');
        } else if (msg.includes('category_id') || msg.includes('not-null')) {
          setSaveError('Please select a category for your product.');
        } else {
          setSaveError(msg || 'Save failed. Please try again.');
        }
        return;
      }

      // Add / update in list instantly — no waiting for a refetch
      const row = result.data as any;
      const mapped: Product = {
        id: row.id, name: row.name, slug: row.slug,
        base_price: row.base_price, unit: row.unit,
        stock_qty: row.stock_qty, status: row.status,
        low_stock_threshold: row.low_stock_threshold,
        images: row.images,
        category_id:   row.category_id,
        category_name: row.categories?.name,
      };

      if (!editing) {
        setProducts(prev => [mapped, ...prev]);
        toast.success('Submitted for Review', 'Product sent to admin for approval.');
      } else {
        setProducts(prev => prev.map(p => p.id === mapped.id ? mapped : p));
        toast.success('Product Updated', 'Your changes have been saved.');
      }

      setModal(false);
      load(true); // silent background sync — realtime is already subscribed
    } catch (e: any) {
      setSaveError(e?.message ?? 'Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function deleteProduct(id: string) {
    Alert.alert('Delete Product', 'Remove this product?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          await supabase.from('products').update({ deleted_at: new Date().toISOString() }).eq('id', id);
          setProducts(prev => prev.filter(x => x.id !== id));
        },
      },
    ]);
  }

  async function updateStock(p: Product, delta: number) {
    const next = Math.max(0, p.stock_qty + delta);
    await supabase.from('products').update({ stock_qty: next }).eq('id', p.id);
    setProducts(prev => prev.map(x => x.id === p.id ? { ...x, stock_qty: next } : x));
  }

  const previewUri = form.imageUri || form.imageUrl;

  return (
    <Screen padding={0} style={s.root}>
      <Header
        title="My Products"
        showBack={false}
        trailing={
          <Pressable style={s.addBtn} onPress={openCreate}>
            <Plus size={16} color="#fff" strokeWidth={2.5} />
            <Text style={s.addBtnText}>Add</Text>
          </Pressable>
        }
      />

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator color={G} size="large" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={s.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(true); setRefreshing(false); }} />}
        >
          {products.length === 0 && (
            <View style={s.empty}>
              <View style={s.emptyIcon}>
                <Archive size={36} color="#9CA3AF" strokeWidth={1.5} />
              </View>
              <Text style={s.emptyTitle}>No products yet</Text>
              <Text style={s.emptySub}>
                Tap "+ Add" to list your first product.{'\n'}Products are reviewed before going live.
              </Text>
              <Pressable style={s.emptyBtn} onPress={openCreate}>
                <Plus size={16} color="#fff" strokeWidth={2.5} />
                <Text style={s.emptyBtnText}>Add First Product</Text>
              </Pressable>
            </View>
          )}

          {products.map(p => (
            <View key={p.id} style={s.card}>
              <ProductThumb images={p.images} />

              <View style={s.cardBody}>
                <View style={s.cardTop}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={s.productName} numberOfLines={2}>{p.name}</Text>
                    {p.category_name ? (
                      <Text style={s.productCat}>{p.category_name}</Text>
                    ) : null}
                  </View>
                  <StatusBadge status={p.status} />
                </View>

                <View style={s.cardMid}>
                  <Text style={s.price}>
                    {formatINR(p.base_price)}
                    <Text style={s.priceUnit}>/{p.unit}</Text>
                  </Text>
                  <View style={s.stockRow}>
                    {p.stock_qty === 0
                      ? <AlertCircle size={12} color="#DC2626" strokeWidth={2} />
                      : p.stock_qty <= (p.low_stock_threshold ?? 10)
                      ? <TrendingDown size={12} color="#D97706" strokeWidth={2} />
                      : <CheckCircle2 size={12} color="#16A34A" strokeWidth={2} />
                    }
                    <Text style={[s.stockText, {
                      color: p.stock_qty === 0 ? '#DC2626'
                        : p.stock_qty <= (p.low_stock_threshold ?? 10) ? '#D97706'
                        : '#16A34A',
                    }]}>
                      {p.stock_qty} {p.unit}s
                    </Text>
                  </View>
                </View>

                <View style={s.cardActions}>
                  <Pressable style={[s.stockBtn, s.stockMinus]} onPress={() => updateStock(p, -1)}>
                    <Text style={[s.stockBtnText, { color: '#DC2626' }]}>−1</Text>
                  </Pressable>
                  <Pressable style={[s.stockBtn, s.stockPlus]} onPress={() => updateStock(p, 1)}>
                    <Text style={[s.stockBtnText, { color: '#16A34A' }]}>+1</Text>
                  </Pressable>
                  <Pressable style={[s.stockBtn, s.stockPlus]} onPress={() => updateStock(p, 10)}>
                    <Text style={[s.stockBtnText, { color: '#16A34A' }]}>+10</Text>
                  </Pressable>
                  <View style={{ flex: 1 }} />
                  <Pressable style={[s.iconBtn, { backgroundColor: '#EFF6FF' }]} onPress={() => openEdit(p)}>
                    <Pencil size={15} color="#3B82F6" strokeWidth={2} />
                  </Pressable>
                  <Pressable style={[s.iconBtn, { backgroundColor: '#FEF2F2' }]} onPress={() => deleteProduct(p.id)}>
                    <Trash2 size={15} color="#EF4444" strokeWidth={2} />
                  </Pressable>
                </View>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Add / Edit Modal */}
      <Modal visible={modal} transparent animationType="slide">
        <View style={m.overlay}>
          <View style={m.sheet}>
            <View style={m.handle} />
            <View style={m.header}>
              <Text style={m.title}>{editing ? 'Edit Product' : 'New Product'}</Text>
              <Pressable onPress={() => setModal(false)} hitSlop={8}>
                <X size={22} color="#6B7280" strokeWidth={2} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={m.body}>

              {/* Image picker */}
              <Text style={m.label}>Product Photo</Text>
              <Pressable style={[m.imagePicker, previewUri && m.imagePickerFilled]} onPress={pickImage}>
                {previewUri ? (
                  <Image source={{ uri: previewUri }} style={m.imagePreview} resizeMode="cover" />
                ) : (
                  <View style={m.imagePlaceholder}>
                    <Camera size={26} color="#9CA3AF" strokeWidth={1.8} />
                    <Text style={m.imagePickerText}>Tap to add photo</Text>
                  </View>
                )}
              </Pressable>

              <FormField label="Product Name *">
                <TextInput
                  style={m.input}
                  value={form.name}
                  onChangeText={v => setForm(f => ({ ...f, name: v }))}
                  placeholder="OPC 53 Grade Cement"
                  placeholderTextColor="#9CA3AF"
                />
              </FormField>

              <View style={m.row}>
                <View style={{ flex: 1 }}>
                  <FormField label="Price (₹) *">
                    <TextInput
                      style={m.input}
                      value={form.base_price}
                      onChangeText={v => setForm(f => ({ ...f, base_price: v }))}
                      keyboardType="numeric"
                      placeholder="420"
                      placeholderTextColor="#9CA3AF"
                    />
                  </FormField>
                </View>
                <View style={{ flex: 1 }}>
                  <FormField label="Stock Qty">
                    <TextInput
                      style={m.input}
                      value={form.stock_qty}
                      onChangeText={v => setForm(f => ({ ...f, stock_qty: v }))}
                      keyboardType="numeric"
                      placeholder="500"
                      placeholderTextColor="#9CA3AF"
                    />
                  </FormField>
                </View>
              </View>

              <FormField label="Unit">
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
                  {UNITS.map(u => (
                    <Pressable
                      key={u}
                      onPress={() => setForm(f => ({ ...f, unit: u }))}
                      style={[m.chip, form.unit === u && m.chipActive]}
                    >
                      <Text style={[m.chipText, form.unit === u && m.chipTextActive]}>{u}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </FormField>

              <FormField label={`Category${categories.length > 0 ? ' *' : ''}`}>
                {categories.length === 0 ? (
                  <Text style={{ fontFamily: FontFamily.regular, fontSize: 12, color: '#9CA3AF', paddingVertical: 6 }}>
                    No categories yet — admin will assign one.
                  </Text>
                ) : (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
                    {categories.map(c => (
                      <Pressable
                        key={c.id}
                        onPress={() => { setForm(f => ({ ...f, category_id: c.id })); setSaveError(''); }}
                        style={[m.chip, form.category_id === c.id && m.chipActive]}
                      >
                        <Text style={[m.chipText, form.category_id === c.id && m.chipTextActive]}>{c.name}</Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                )}
              </FormField>

              {saveError ? (
                <View style={m.errorBox}>
                  <Text style={m.errorText}>{saveError}</Text>
                </View>
              ) : null}

              <View style={m.actions}>
                <Pressable style={m.cancelBtn} onPress={() => { setModal(false); setSaveError(''); }}>
                  <Text style={m.cancelText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[m.saveBtn, (saving || uploading) && m.saveBtnDisabled]}
                  onPress={save}
                  disabled={saving || uploading}
                >
                  {saving || uploading
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={m.saveText}>{editing ? 'Save Changes' : 'Submit for Review'}</Text>
                  }
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 6, marginBottom: 14 }}>
      <Text style={m.label}>{label}</Text>
      {children}
    </View>
  );
}

/* ── Styles ───────────────────────────────────────────────────────── */
const s = StyleSheet.create({
  root: { backgroundColor: '#F9FAFB' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: G, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
  },
  addBtnText: { fontFamily: FontFamily.bold, fontSize: 13, color: '#fff' },
  list: { padding: 16, gap: 12, paddingBottom: 32 },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyIcon: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center',
  },
  emptyTitle: { fontFamily: FontFamily.semiBold, fontSize: 17, color: '#111827' },
  emptySub: { fontFamily: FontFamily.regular, fontSize: 13, color: '#9CA3AF', textAlign: 'center', lineHeight: 20 },
  emptyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: G, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12,
  },
  emptyBtnText: { fontFamily: FontFamily.semiBold, fontSize: 14, color: '#fff' },

  card: {
    flexDirection: 'row', backgroundColor: '#fff', borderRadius: 14,
    borderWidth: 1, borderColor: '#E5E7EB', overflow: 'hidden',
  },
  cardBody: { flex: 1, padding: 12, gap: 8 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start' },
  cardMid: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  productName: { fontFamily: FontFamily.semiBold, fontSize: 14, color: '#111827', lineHeight: 20 },
  productCat: { fontFamily: FontFamily.regular, fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  price: { fontFamily: FontFamily.bold, fontSize: 16, color: '#111827' },
  priceUnit: { fontFamily: FontFamily.regular, fontSize: 11, color: '#6B7280' },
  stockRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  stockText: { fontFamily: FontFamily.semiBold, fontSize: 12 },
  stockBtn: {
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1,
  },
  stockMinus: { borderColor: '#FCA5A5', backgroundColor: '#FEF2F2' },
  stockPlus: { borderColor: '#BBF7D0', backgroundColor: '#F0FDF4' },
  stockBtnText: { fontFamily: FontFamily.bold, fontSize: 12 },
  iconBtn: {
    width: 34, height: 34, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center',
  },
});

const b = StyleSheet.create({
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99 },
  text: { fontFamily: FontFamily.semiBold, fontSize: 10 },
});

const th = StyleSheet.create({
  img: { width: 90, height: '100%' as any, minHeight: 110 },
  placeholder: { backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
});

const m = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingBottom: 32, maxHeight: '92%',
  },
  handle: {
    width: 36, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB',
    alignSelf: 'center', marginTop: 12, marginBottom: 16,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontFamily: FontFamily.bold, fontSize: 18, color: '#111827' },
  body: { paddingBottom: 20 },
  label: { fontFamily: FontFamily.medium, fontSize: 13, color: '#374151' },
  input: {
    height: 46, borderWidth: 1.5, borderColor: '#E5E7EB',
    borderRadius: 10, paddingHorizontal: 14,
    fontFamily: FontFamily.regular, fontSize: 14, color: '#111827',
    backgroundColor: '#F9FAFB',
  },
  row: { flexDirection: 'row', gap: 12 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 99,
    borderWidth: 1.5, borderColor: '#E5E7EB', backgroundColor: '#F9FAFB',
  },
  chipActive: { backgroundColor: '#F0FDF4', borderColor: G },
  chipText: { fontFamily: FontFamily.medium, fontSize: 12, color: '#6B7280' },
  chipTextActive: { color: G },
  imagePicker: {
    width: '100%', height: 120, borderRadius: 12,
    borderWidth: 1.5, borderColor: '#E5E7EB', borderStyle: 'dashed',
    marginBottom: 16, overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#F9FAFB',
  },
  imagePickerFilled: { borderStyle: 'solid', borderColor: G },
  imagePlaceholder: { alignItems: 'center', gap: 8 },
  imagePickerText: { fontFamily: FontFamily.regular, fontSize: 13, color: '#9CA3AF' },
  imagePreview: { width: '100%', height: '100%' },
  errorBox: {
    backgroundColor: '#FEF2F2', borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: '#FECACA', marginBottom: 4,
  },
  errorText: { fontFamily: FontFamily.regular, fontSize: 13, color: '#DC2626', lineHeight: 18 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  cancelBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 12,
    alignItems: 'center', backgroundColor: '#F3F4F6',
  },
  cancelText: { fontFamily: FontFamily.semiBold, fontSize: 15, color: '#374151' },
  saveBtn: {
    flex: 2, paddingVertical: 14, borderRadius: 12,
    alignItems: 'center', backgroundColor: G,
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveText: { fontFamily: FontFamily.semiBold, fontSize: 15, color: '#fff' },
});
