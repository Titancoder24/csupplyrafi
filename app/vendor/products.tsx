import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, Pressable, ActivityIndicator,
  Modal, TextInput, StyleSheet, RefreshControl, Alert,
  SafeAreaView, StatusBar, Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { toast } from '@/services/toast';
import {
  Plus, Pencil, Trash2, X, Camera, Package, PackagePlus, Minus,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/services/supabase';
import { useAuth } from '@/services/auth/AuthProvider';
import { formatINR } from '@/lib/format';
import { FontFamily } from '@/constants/theme';

/* ─── Shared palette (matches Dashboard / Orders) ─────────────────────────── */
const ORANGE_TOP = '#FF6B00';
const ORANGE     = '#F97316';
const ORANGE_DK  = '#EA580C';
const CREAM      = '#FAF8F5';
const SURFACE    = '#FFFFFF';
const CARD_TINT  = '#FFFCF8';      // soft warm card surface
const BORDER     = '#EAE3D8';
const HAIRLINE   = '#F1EBE0';
const INK_900    = '#0F172A';
const INK_700    = '#334155';
const INK_500    = '#64748B';
const INK_400    = '#94A3B8';

/* Shared chip palette (lifted from Orders) */
const CHIP_LIVE     = { bg: '#ECFDF3', fg: '#15803D' };
const CHIP_PENDING  = { bg: '#FFF7ED', fg: '#EA580C' };
const CHIP_LOW      = { bg: '#FFF7ED', fg: '#EA580C' };
const CHIP_OUT      = { bg: '#FEF2F2', fg: '#DC2626' };
const CHIP_REJECTED = { bg: '#FEF2F2', fg: '#DC2626' };

const UNITS = ['bag', 'ton', 'kg', 'piece', 'sqft', 'rft', 'cum', 'litre'];

type Product = {
  id: string; name: string; slug: string;
  base_price: number; unit: string; stock_qty: number;
  status: string; category_id?: string; category_name?: string;
  low_stock_threshold?: number;
  images?: string[] | null;
};
type Category = { id: string; name: string };

/** Compute the single status chip for a product:
 *  status takes precedence (draft / inactive), then stock_qty (0 / low / ok). */
function chipFor(p: Product): { label: string; bg: string; fg: string } {
  if (p.status === 'draft')    return { label: 'Pending review', ...CHIP_PENDING };
  if (p.status === 'inactive') return { label: 'Rejected',       ...CHIP_REJECTED };
  if (p.stock_qty === 0)       return { label: 'Out of stock',   ...CHIP_OUT };
  const thr = p.low_stock_threshold ?? 10;
  if (p.stock_qty <= thr)      return { label: 'Low stock',      ...CHIP_LOW };
  return { label: 'Live',                                         ...CHIP_LIVE };
}

/* ─── Screen ──────────────────────────────────────────────────────────────── */
export default function VendorProducts() {
  const { profile } = useAuth();
  const [products,   setProducts]   = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modal,      setModal]      = useState(false);
  const [editing,    setEditing]    = useState<Product | null>(null);
  const [saving,     setSaving]     = useState(false);
  const [uploading,  setUploading]  = useState(false);
  const [saveError,  setSaveError]  = useState('');
  const [form, setForm] = useState({
    name: '', base_price: '', unit: 'bag',
    stock_qty: '', category_id: '', description: '',
    low_stock_threshold: '10', imageUri: '', imageUrl: '',
  });

  const load = useCallback(async (silent = false) => {
    if (!profile?.id) {
      setLoading(false);
      return;
    }
    if (!silent) setLoading(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, slug, base_price, unit, stock_qty, status, category_id, low_stock_threshold, images, categories(name)')
        .eq('vendor_id', profile.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      
      if (error) throw error;

      setProducts((data ?? []).map((d: any) => ({
        id: d.id, name: d.name, slug: d.slug,
        base_price: d.base_price, unit: d.unit,
        stock_qty: d.stock_qty, status: d.status,
        low_stock_threshold: d.low_stock_threshold,
        images: d.images,
        category_id:   d.category_id,
        category_name: d.categories?.name,
      })));
    } catch (err) {
      console.error('[vendor/products] load error:', err);
    } finally {
      setLoading(false);
    }
  }, [profile?.id]);

  useEffect(() => {
    load();
    loadCategories();
    if (!profile?.id) return;

    // Unique suffix prevents Supabase from returning a cached, already-subscribed
    // channel on remount — otherwise the second `.on()` call throws
    // "cannot add postgres_changes callbacks after subscribe()".
    const suffix = Math.random().toString(36).slice(2, 10);
    const channel = supabase
      .channel(`vendor-products-rt:${profile.id}:${suffix}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'products',
        filter: `vendor_id=eq.${profile.id}`,
      }, (payload: any) => {
        const oldStatus = payload.old?.status;
        const newStatus = payload.new?.status;
        if (newStatus !== oldStatus) {
          if (newStatus === 'active') {
            toast.success('Product approved', `"${payload.new?.name}" is now live for customers.`);
          } else if (newStatus === 'inactive') {
            toast.error('Product rejected', `"${payload.new?.name}" was not approved. Update and resubmit.`);
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
    // load is memoized via useCallback([profile?.id]); depending on profile.id
    // alone is sufficient and avoids needless effect re-runs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

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
    setSaveError('');
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
      Alert.alert('Permission required', 'Allow photo access to add product images.');
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
    const { data: { user } } = await supabase.auth.getUser();
    const uid = user?.id ?? profile?.id;
    if (!uid) return null;
    setUploading(true);
    try {
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
        toast.success('Submitted for review', 'Product sent to admin for approval.');
      } else {
        setProducts(prev => prev.map(p => p.id === mapped.id ? mapped : p));
        toast.success('Product updated', 'Your changes have been saved.');
      }

      setModal(false);
      load(true);
    } catch (e: any) {
      setSaveError(e?.message ?? 'Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  function deleteProduct(id: string) {
    const doIt = async () => {
      await supabase.from('products').update({ deleted_at: new Date().toISOString() }).eq('id', id);
      setProducts(prev => prev.filter(x => x.id !== id));
    };
    if (Platform.OS === 'web') {
      // eslint-disable-next-line no-alert
      if (typeof window !== 'undefined' && window.confirm('Remove this product?')) doIt();
    } else {
      Alert.alert('Delete product', 'Remove this product?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: doIt },
      ]);
    }
  }

  async function updateStock(p: Product, delta: number) {
    const next = Math.max(0, p.stock_qty + delta);
    await supabase.from('products').update({ stock_qty: next }).eq('id', p.id);
    setProducts(prev => prev.map(x => x.id === p.id ? { ...x, stock_qty: next } : x));
  }

  const previewUri = form.imageUri || form.imageUrl;
  const liveCount = products.filter(p => p.status === 'active').length;

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={ORANGE_DK} />

      {/* Compact gradient header */}
      <SafeAreaView style={s.headerArea}>
        <LinearGradient
          colors={[ORANGE_TOP, ORANGE]}
          start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={s.headerInner}>
          <View style={{ flex: 1 }}>
            <Text style={s.headerTitle}>Inventory</Text>
            <Text style={s.headerSub}>
              {products.length > 0
                ? `${products.length} ${products.length === 1 ? 'product' : 'products'}  ·  ${liveCount} live`
                : 'Manage your product catalogue'}
            </Text>
          </View>
          <Pressable
            style={({ pressed }) => [s.addBtn, pressed && { opacity: 0.9 }]}
            onPress={openCreate}
            hitSlop={6}
          >
            <Plus size={15} color="#0F172A" strokeWidth={2.4} />
            <Text style={s.addBtnTxt}>Add</Text>
          </Pressable>
        </View>
      </SafeAreaView>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator color={ORANGE_DK} />
        </View>
      ) : (
        <ScrollView
          style={s.body}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={async () => { setRefreshing(true); await load(true); setRefreshing(false); }}
              tintColor={ORANGE_DK}
            />
          }
        >
          {products.length === 0 ? (
            <EmptyState onAdd={openCreate} />
          ) : (
            products.map(p => {
              const chip = chipFor(p);
              return (
                <View key={p.id} style={s.card}>
                  {/* Image */}
                  <View style={s.thumb}>
                    {p.images?.[0] ? (
                      <Image source={{ uri: p.images[0] }} style={s.thumbImg} contentFit="cover" transition={150} />
                    ) : (
                      <View style={s.thumbPlaceholder}>
                        <Package size={24} color="#0F172A" strokeWidth={1.5} />
                      </View>
                    )}
                  </View>

                  {/* Body */}
                  <View style={s.cardBody}>
                    <View style={s.cardTop}>
                      <View style={{ flex: 1, paddingRight: 8 }}>
                        <Text style={s.productName} numberOfLines={2}>{p.name}</Text>
                        {p.category_name ? (
                          <Text style={s.productCat} numberOfLines={1}>{p.category_name}</Text>
                        ) : null}
                      </View>
                      <View style={[s.pill, { backgroundColor: chip.bg }]}>
                        <Text style={[s.pillTxt, { color: chip.fg }]}>{chip.label}</Text>
                      </View>
                    </View>

                    <View style={s.priceRow}>
                      <Text style={s.price}>{formatINR(p.base_price)}</Text>
                      <Text style={s.priceUnit}>/{p.unit}</Text>
                      <Text style={s.metaSep}>·</Text>
                      <Text style={s.stockMeta}>{p.stock_qty} {p.unit}{p.stock_qty === 1 ? '' : 's'} in stock</Text>
                    </View>

                    <View style={s.cardDivider} />

                    {/* Footer: segmented stepper + icon actions */}
                    <View style={s.cardFooter}>
                      <View style={s.stepper}>
                        <Pressable
                          onPress={() => updateStock(p, -1)}
                          style={({ pressed }) => [s.stepBtn, pressed && { backgroundColor: HAIRLINE }]}
                          hitSlop={4}
                        >
                          <Minus size={13} color="#0F172A" strokeWidth={2.2} />
                        </Pressable>
                        <View style={s.stepDivider} />
                        <View style={s.stepValueWrap}>
                          <Text style={s.stepValue}>{p.stock_qty}</Text>
                        </View>
                        <View style={s.stepDivider} />
                        <Pressable
                          onPress={() => updateStock(p, 1)}
                          style={({ pressed }) => [s.stepBtn, pressed && { backgroundColor: HAIRLINE }]}
                          hitSlop={4}
                        >
                          <Plus size={13} color="#0F172A" strokeWidth={2.2} />
                        </Pressable>
                      </View>

                      <View style={s.iconActions}>
                        <Pressable
                          style={({ pressed }) => [s.iconBtn, s.iconBtnEdit, pressed && { opacity: 0.85 }]}
                          onPress={() => openEdit(p)}
                          hitSlop={4}
                        >
                          <Pencil size={15} color="#0F172A" strokeWidth={2} />
                        </Pressable>
                        <Pressable
                          style={({ pressed }) => [s.iconBtn, s.iconBtnDelete, pressed && { opacity: 0.85 }]}
                          onPress={() => deleteProduct(p.id)}
                          hitSlop={4}
                        >
                          <Trash2 size={15} color="#0F172A" strokeWidth={2} />
                        </Pressable>
                      </View>
                    </View>
                  </View>
                </View>
              );
            })
          )}

          <View style={{ height: 16 }} />
        </ScrollView>
      )}

      {/* Add / Edit modal */}
      <Modal visible={modal} transparent animationType="slide" onRequestClose={() => setModal(false)}>
        <View style={m.overlay}>
          <View style={m.sheet}>
            <View style={m.handle} />
            <View style={m.head}>
              <Text style={m.title}>{editing ? 'Edit product' : 'New product'}</Text>
              <Pressable onPress={() => setModal(false)} hitSlop={10} style={m.closeBtn}>
                <X size={16} color="#0F172A" strokeWidth={2.2} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={m.body}>
              {/* Image picker */}
              <Text style={m.label}>Product photo</Text>
              <Pressable style={[m.imagePicker, previewUri && m.imagePickerFilled]} onPress={pickImage}>
                {previewUri ? (
                  <Image source={{ uri: previewUri }} style={m.imagePreview} contentFit="cover" />
                ) : (
                  <View style={m.imagePlaceholder}>
                    <Camera size={22} color="#0F172A" strokeWidth={1.8} />
                    <Text style={m.imagePickerText}>Tap to add photo</Text>
                  </View>
                )}
              </Pressable>

              <FormField label="Product name *">
                <TextInput
                  style={m.input}
                  value={form.name}
                  onChangeText={v => setForm(f => ({ ...f, name: v }))}
                  placeholder="OPC 53 Grade Cement"
                  placeholderTextColor={INK_400}
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
                      placeholderTextColor={INK_400}
                    />
                  </FormField>
                </View>
                <View style={{ flex: 1 }}>
                  <FormField label="Stock qty">
                    <TextInput
                      style={m.input}
                      value={form.stock_qty}
                      onChangeText={v => setForm(f => ({ ...f, stock_qty: v }))}
                      keyboardType="numeric"
                      placeholder="500"
                      placeholderTextColor={INK_400}
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
                  <Text style={m.helper}>No categories yet — admin will assign one.</Text>
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
                    : <Text style={m.saveText}>{editing ? 'Save changes' : 'Submit for review'}</Text>
                  }
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

/* ─── Empty state (matches Orders pattern) ────────────────────────────────── */
function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <View style={emp.wrap}>
      <View style={emp.iconRing}>
        <PackagePlus size={22} color="#0F172A" strokeWidth={1.6} />
      </View>
      <Text style={emp.title}>No products yet</Text>
      <Text style={emp.body}>Add your first product. New listings are reviewed before going live.</Text>
      <Pressable style={({ pressed }) => [emp.btn, pressed && { opacity: 0.9 }]} onPress={onAdd}>
        <Plus size={14} color="#FFFFFF" strokeWidth={2.4} />
        <Text style={emp.btnTxt}>Add first product</Text>
      </Pressable>
    </View>
  );
}
const emp = StyleSheet.create({
  wrap:     { alignItems: 'center', paddingVertical: 56, gap: 6 },
  iconRing: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: HAIRLINE,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 8,
  },
  title:    { fontFamily: FontFamily.semiBold, fontSize: 14, color: INK_700, letterSpacing: -0.1 },
  body:     { fontFamily: FontFamily.regular, fontSize: 12, lineHeight: 17, color: INK_500, textAlign: 'center', maxWidth: 280 },
  btn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: ORANGE_DK,
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10,
    marginTop: 10,
  },
  btnTxt:   { fontFamily: FontFamily.semiBold, fontSize: 12.5, color: '#fff', letterSpacing: 0.05 },
});

/* ─── FormField ───────────────────────────────────────────────────────────── */
function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 6, marginBottom: 14 }}>
      <Text style={m.label}>{label}</Text>
      {children}
    </View>
  );
}

/* ─── Styles ──────────────────────────────────────────────────────────────── */
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: CREAM },

  /* Header */
  headerArea: { backgroundColor: ORANGE, paddingBottom: 16 },
  headerInner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 18,
    paddingTop: Platform.OS === 'web' ? 12 : 6,
    paddingBottom: 2,
  },
  headerTitle: { fontFamily: FontFamily.bold, fontSize: 22, color: '#fff', letterSpacing: -0.6 },
  headerSub:   { fontFamily: FontFamily.regular, fontSize: 11.5, color: 'rgba(255,255,255,0.80)', letterSpacing: 0.05, marginTop: 3 },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#fff',
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 10,
  },
  addBtnTxt: { fontFamily: FontFamily.semiBold, fontSize: 12.5, color: ORANGE_DK, letterSpacing: 0.05 },

  /* Body */
  body:   { flex: 1, backgroundColor: CREAM },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list:   { padding: 14, paddingTop: 18, gap: 18, paddingBottom: 20 },

  /* Product card — softer depth, larger radius */
  card: {
    flexDirection: 'row',
    backgroundColor: CARD_TINT,
    borderRadius: 22,
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.04)',
    overflow: 'hidden',
    /* layered shadow: 0 1 2 0.03 + 0 10 30 0.04 (approx single-layer in RN) */
    shadowColor: '#0F172A',
    shadowOpacity: 0.06,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  thumb: {
    width: 100,
    backgroundColor: HAIRLINE,
  },
  thumbImg: {
    width: '100%', height: '100%',
    ...(Platform.OS === 'web' ? ({ filter: 'saturate(0.92) contrast(0.96)' } as any) : null),
  },
  thumbPlaceholder: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
  },

  cardBody: { flex: 1, paddingHorizontal: 14, paddingVertical: 12, gap: 4 },

  cardTop: { flexDirection: 'row', alignItems: 'flex-start' },
  productName: { fontFamily: FontFamily.bold, fontSize: 14.5, color: INK_900, letterSpacing: -0.2, lineHeight: 19 },
  productCat:  { fontFamily: FontFamily.medium, fontSize: 11, color: '#7C7C7C', marginTop: 2, letterSpacing: 0.05 },

  priceRow:  { flexDirection: 'row', alignItems: 'baseline', gap: 4, flexWrap: 'wrap', marginTop: 6 },
  price:     { fontFamily: FontFamily.bold, fontSize: 15, color: INK_900, letterSpacing: -0.3 },
  priceUnit: { fontFamily: FontFamily.medium, fontSize: 11.5, color: '#7C7C7C' },
  metaSep:   { fontFamily: FontFamily.regular, fontSize: 11.5, color: '#9B9B9B', marginHorizontal: 2 },
  stockMeta: { fontFamily: FontFamily.medium, fontSize: 11.5, color: '#7C7C7C', letterSpacing: 0.05 },

  cardDivider: { height: 1, backgroundColor: HAIRLINE, marginTop: 10, marginBottom: 2 },

  cardFooter: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 8,
  },

  /* Status pill — premium SaaS chip */
  pill:    { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  pillTxt: { fontFamily: FontFamily.semiBold, fontSize: 12, letterSpacing: -0.1 },

  /* Segmented stepper — slimmer enterprise control */
  stepper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: SURFACE,
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)',
    borderRadius: 14,
    overflow: 'hidden',
    height: 42,
    paddingHorizontal: 6,
  },
  stepBtn:    { width: 30, height: 42, alignItems: 'center', justifyContent: 'center' },
  stepDivider:{ width: 1, height: 18, backgroundColor: 'rgba(0,0,0,0.05)' },
  stepValueWrap: { minWidth: 40, paddingHorizontal: 6, height: 42, alignItems: 'center', justifyContent: 'center' },
  stepValue:  { fontFamily: FontFamily.medium, fontSize: 13, color: INK_900 },

  /* Icon actions (Edit / Delete) — 42×42, radius 14 */
  iconActions: { flexDirection: 'row', gap: 8 },
  iconBtn: {
    width: 42, height: 42, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
  },
  iconBtnEdit:   { backgroundColor: SURFACE,   borderColor: 'rgba(0,0,0,0.05)' },
  iconBtnDelete: { backgroundColor: '#FFF7F7', borderColor: 'rgba(220,38,38,0.14)' },
});

/* ─── Modal styles ────────────────────────────────────────────────────────── */
const m = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: SURFACE,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingHorizontal: 20, paddingBottom: Platform.OS === 'ios' ? 32 : 20,
    maxHeight: '92%',
  },
  handle: {
    width: 38, height: 4, borderRadius: 2,
    backgroundColor: '#E2E8F0',
    alignSelf: 'center', marginTop: 10, marginBottom: 14,
  },
  head: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 16,
  },
  title: { fontFamily: FontFamily.semiBold, fontSize: 17, color: INK_900, letterSpacing: -0.2 },
  closeBtn: {
    width: 30, height: 30, borderRadius: 9,
    backgroundColor: HAIRLINE, alignItems: 'center', justifyContent: 'center',
  },
  body:  { paddingBottom: 20 },
  label: { fontFamily: FontFamily.medium, fontSize: 12.5, color: INK_700, letterSpacing: 0.05 },
  helper:{ fontFamily: FontFamily.regular, fontSize: 12, color: INK_500, paddingVertical: 4 },
  input: {
    height: 44, borderWidth: 1, borderColor: BORDER,
    borderRadius: 10, paddingHorizontal: 12,
    fontFamily: FontFamily.regular, fontSize: 13.5, color: INK_900,
    backgroundColor: CREAM,
  },
  row: { flexDirection: 'row', gap: 12 },
  chip: {
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999,
    borderWidth: 1, borderColor: BORDER, backgroundColor: SURFACE,
  },
  chipActive: { backgroundColor: '#FFF7ED', borderColor: '#FCD9B6' },
  chipText: { fontFamily: FontFamily.medium, fontSize: 12, color: INK_700 },
  chipTextActive: { color: ORANGE_DK },

  imagePicker: {
    width: '100%', height: 124, borderRadius: 12,
    borderWidth: 1, borderColor: BORDER, borderStyle: 'dashed',
    marginBottom: 16, overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center', backgroundColor: CREAM,
  },
  imagePickerFilled: { borderStyle: 'solid', borderColor: '#FCD9B6' },
  imagePlaceholder: { alignItems: 'center', gap: 8 },
  imagePickerText:  { fontFamily: FontFamily.regular, fontSize: 12.5, color: INK_500 },
  imagePreview:     { width: '100%', height: '100%' },

  errorBox: {
    backgroundColor: '#FEF2F2', borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: '#FECACA', marginBottom: 4,
  },
  errorText: { fontFamily: FontFamily.medium, fontSize: 12.5, color: '#DC2626', lineHeight: 17 },

  actions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  cancelBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: CREAM, borderWidth: 1, borderColor: BORDER,
  },
  cancelText: { fontFamily: FontFamily.semiBold, fontSize: 13.5, color: INK_700 },
  saveBtn: {
    flex: 2, paddingVertical: 12, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: ORANGE_DK,
  },
  saveBtnDisabled: { opacity: 0.55 },
  saveText: { fontFamily: FontFamily.semiBold, fontSize: 13.5, color: '#fff' },
});
