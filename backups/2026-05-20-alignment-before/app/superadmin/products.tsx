import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  TextInput, ActivityIndicator, Image, Modal, Alert,
} from 'react-native';
import {
  Search, CheckCircle2, XCircle, Package, Clock, User,
  Plus, Camera, X,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { Colors, FontFamily, Radius, Shadow, Semantic } from '@/constants/theme';
import { supabase } from '@/services/supabase';
import { useAuth } from '@/services/auth/AuthProvider';
import { toast } from '@/services/toast';

const G = Semantic.successFg;
const UNITS = ['bag', 'ton', 'kg', 'piece', 'sqft', 'rft', 'cum', 'litre'];

type Product = {
  id: string;
  name: string;
  category?: string;
  base_price?: number;
  unit?: string;
  vendor_name?: string;
  status: string;
  created_at: string;
  images?: string[] | null;
};
type Category = { id: string; name: string };

const TABS = [
  { key: 'draft',    label: 'Pending',  color: Semantic.warningFg, bg: Semantic.warningBg },
  { key: 'active',   label: 'Approved', color: Semantic.successFg, bg: Semantic.successBg },
  { key: 'inactive', label: 'Rejected', color: Semantic.dangerFg,  bg: Semantic.dangerBg  },
];

function ProductImage({ images }: { images?: string[] | null }) {
  const url = images?.[0];
  if (url) {
    return <Image source={{ uri: url }} style={s.productImg} resizeMode="cover" />;
  }
  return (
    <View style={[s.productImg, s.productImgFallback]}>
      <Package size={28} color="#0F172A" strokeWidth={1.5} />
    </View>
  );
}

export default function ProductsScreen() {
  const { profile } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('draft');
  const [acting, setActing] = useState<string | null>(null);

  // Create-product modal state
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [form, setForm] = useState({
    name: '', base_price: '', unit: 'bag',
    stock_qty: '0', category_id: '',
    imageUri: '', imageUrl: '',
  });

  useEffect(() => {
    fetchProducts();
    loadCategories();

    const channel = supabase
      .channel('sa-products-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => fetchProducts())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [tab]);

  async function loadCategories() {
    const { data } = await supabase
      .from('categories')
      .select('id, name')
      .eq('is_active', true)
      .order('name');
    setCategories(data ?? []);
  }

  async function fetchProducts() {
    setLoading(true);
    const { data, error } = await supabase
      .from('products')
      .select('id, name, base_price, unit, status, created_at, images, vendor_id, categories(name), profiles!products_vendor_id_fkey(full_name)')
      .eq('status', tab)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) {
      console.warn('fetchProducts error:', error.message);
      setProducts([]);
      setLoading(false);
      return;
    }

    // Pull shop names from vendor_profiles separately (no direct FK to products anymore)
    const ids = Array.from(new Set((data ?? []).map((d: any) => d.vendor_id).filter(Boolean)));
    const shopMap: Record<string, string> = {};
    if (ids.length) {
      const { data: vps } = await supabase
        .from('vendor_profiles')
        .select('id, shop_name')
        .in('id', ids);
      (vps ?? []).forEach((v: any) => { if (v.shop_name) shopMap[v.id] = v.shop_name; });
    }

    setProducts((data ?? []).map((d: any) => ({
      id: d.id, name: d.name, base_price: d.base_price, unit: d.unit,
      status: d.status, created_at: d.created_at, images: d.images,
      category: d.categories?.name,
      vendor_name: shopMap[d.vendor_id]
        ?? d.profiles?.full_name
        ?? `Vendor (${d.vendor_id?.slice(0, 8)})`,
    })));
    setLoading(false);
  }

  async function approve(id: string) {
    setActing(id);
    const { error } = await supabase.rpc('approve_product', { product_id: id });
    if (error) {
      await supabase.from('products').update({ status: 'active' }).eq('id', id);
    }
    setProducts(p => p.filter(x => x.id !== id));
    setActing(null);
  }

  async function reject(id: string) {
    setActing(id);
    const { error } = await supabase.rpc('reject_product', { product_id: id, reason: 'Does not meet listing standards' });
    if (error) {
      await supabase.from('products').update({ status: 'inactive' }).eq('id', id);
    }
    setProducts(p => p.filter(x => x.id !== id));
    setActing(null);
  }

  function openCreate() {
    setSaveError('');
    setForm({
      name: '', base_price: '', unit: 'bag',
      stock_qty: '0', category_id: '',
      imageUri: '', imageUrl: '',
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
    const { data: { user } } = await supabase.auth.getUser();
    const uid = user?.id ?? profile?.id;
    if (!uid) return null;
    setUploading(true);
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const mime = blob.type || 'image/jpeg';
      const ext  = mime.split('/').pop()?.replace('jpeg', 'jpg') || 'jpg';

      const path = `products/admin/${uid}/${Date.now()}.${ext}`;
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

  async function saveProduct() {
    setSaveError('');
    if (!form.name.trim()) { setSaveError('Product name is required.'); return; }
    if (!form.base_price)  { setSaveError('Price is required.'); return; }
    if (categories.length > 0 && !form.category_id) {
      setSaveError('Please select a category.');
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    const adminId = profile?.id ?? user?.id;
    if (!adminId) {
      setSaveError('Session expired — please sign in again.');
      return;
    }

    setSaving(true);
    try {
      let finalImageUrl = form.imageUrl;
      if (form.imageUri) {
        const uploaded = await uploadImage(form.imageUri);
        if (uploaded) finalImageUrl = uploaded;
      }

      // Admin-listed products are attributed to a house vendor profile under
      // the admin's id. Upserting keeps the FK satisfied without a schema change.
      await supabase.from('vendor_profiles').upsert(
        { id: adminId, shop_name: 'C-Supply' },
        { onConflict: 'id', ignoreDuplicates: true },
      );

      const slug = form.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-' + Date.now();

      const payload: any = {
        vendor_id:  adminId,
        name:       form.name.trim(),
        slug,
        base_price: parseFloat(form.base_price),
        unit:       form.unit,
        stock_qty:  parseInt(form.stock_qty || '0'),
        status:     'active',
        images:     finalImageUrl ? [finalImageUrl] : null,
      };
      if (form.category_id) payload.category_id = form.category_id;

      const { error } = await supabase.from('products').insert(payload);

      if (error) {
        setSaveError(error.message || 'Save failed. Please try again.');
        return;
      }

      setModal(false);
      // Jump to Approved tab so the admin sees their new product
      setTab('active');
    } catch (e: any) {
      setSaveError(e?.message ?? 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  }

  const filtered = products.filter(p =>
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.vendor_name?.toLowerCase().includes(search.toLowerCase())
  );

  const activeTab = TABS.find(t => t.key === tab)!;
  const previewUri = form.imageUri || form.imageUrl;

  return (
    <View style={s.root}>
      {/* Top action row */}
      <View style={s.topRow}>
        <Text style={s.heading}>Products</Text>
        <Pressable style={s.addBtn} onPress={openCreate}>
          <Plus size={16} color="#FFFFFF" strokeWidth={2.5} />
          <Text style={s.addBtnText}>Add Product</Text>
        </Pressable>
      </View>

      {/* Tabs */}
      <View style={s.tabRow}>
        {TABS.map(t => (
          <Pressable
            key={t.key}
            style={[s.tab, tab === t.key && { backgroundColor: t.bg, borderColor: t.color }]}
            onPress={() => setTab(t.key)}
          >
            <Text style={[s.tabText, tab === t.key && { color: t.color, fontFamily: FontFamily.semiBold }]}>
              {t.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Search */}
      <View style={s.searchRow}>
        <View style={s.searchBox}>
          <Search size={16} color="#0F172A" strokeWidth={2} />
          <TextInput
            style={s.searchInput}
            placeholder="Search product or vendor…"
            placeholderTextColor={Colors.textMuted}
            value={search}
            onChangeText={setSearch}
          />
        </View>
        <View style={[s.countBadge, { backgroundColor: activeTab.bg }]}>
          <Text style={[s.countText, { color: activeTab.color }]}>{filtered.length}</Text>
        </View>
      </View>

      {/* List */}
      <ScrollView contentContainerStyle={s.list} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={s.center}>
            <ActivityIndicator color={G} size="large" />
          </View>
        ) : filtered.length === 0 ? (
          <View style={s.center}>
            <Package size={48} color="#0F172A" strokeWidth={1.5} />
            <Text style={s.emptyText}>
              No {tab === 'draft' ? 'pending' : tab === 'active' ? 'approved' : 'rejected'} products
            </Text>
          </View>
        ) : (
          filtered.map(p => (
            <View key={p.id} style={s.card}>
              <ProductImage images={p.images} />

              <View style={s.cardContent}>
                <Text style={s.productName} numberOfLines={2}>{p.name}</Text>
                {p.category && (
                  <Text style={s.productCat}>{p.category}</Text>
                )}

                {p.vendor_name && (
                  <View style={s.metaRow}>
                    <User size={11} color="#0F172A" strokeWidth={2} />
                    <Text style={s.metaText}>{p.vendor_name}</Text>
                  </View>
                )}

                <View style={s.priceRow}>
                  {p.base_price ? (
                    <Text style={s.price}>
                      ₹{p.base_price}
                      {p.unit ? <Text style={s.priceUnit}>/{p.unit}</Text> : null}
                    </Text>
                  ) : null}
                  <View style={s.metaRow}>
                    <Clock size={11} color="#0F172A" strokeWidth={2} />
                    <Text style={s.metaText}>
                      {p.created_at ? new Date(p.created_at).toLocaleDateString('en-IN') : '—'}
                    </Text>
                  </View>
                </View>

                {tab === 'draft' && (
                  <View style={s.actionRow}>
                    <Pressable
                      style={[s.actionBtn, s.approveBtn, acting === p.id && { opacity: 0.6 }]}
                      onPress={() => approve(p.id)}
                      disabled={acting === p.id}
                    >
                      {acting === p.id
                        ? <ActivityIndicator size="small" color="#fff" />
                        : <><CheckCircle2 size={14} color="#FFFFFF" strokeWidth={2.5} /><Text style={s.actionText}>Approve</Text></>}
                    </Pressable>
                    <Pressable
                      style={[s.actionBtn, s.rejectBtn, acting === p.id && { opacity: 0.6 }]}
                      onPress={() => reject(p.id)}
                      disabled={acting === p.id}
                    >
                      <XCircle size={14} color="#FFFFFF" strokeWidth={2.5} />
                      <Text style={s.actionText}>Reject</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Create Product Modal */}
      <Modal visible={modal} transparent animationType="slide">
        <View style={m.overlay}>
          <View style={m.sheet}>
            <View style={m.handle} />
            <View style={m.header}>
              <Text style={m.title}>New Product</Text>
              <Pressable onPress={() => setModal(false)} hitSlop={8}>
                <X size={22} color="#0F172A" strokeWidth={2} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={m.body}>
              <Text style={m.label}>Product Photo</Text>
              <Pressable
                style={[m.imagePicker, previewUri && m.imagePickerFilled]}
                onPress={pickImage}
              >
                {previewUri ? (
                  <Image source={{ uri: previewUri }} style={m.imagePreview} resizeMode="cover" />
                ) : (
                  <View style={m.imagePlaceholder}>
                    <Camera size={26} color="#0F172A" strokeWidth={1.8} />
                    <Text style={m.imagePickerText}>Tap to upload photo</Text>
                    <Text style={m.imagePickerHint}>Visible to customers on home</Text>
                  </View>
                )}
              </Pressable>

              <View style={{ gap: 6, marginBottom: 14 }}>
                <Text style={m.label}>Product Name *</Text>
                <TextInput
                  style={m.input}
                  value={form.name}
                  onChangeText={v => setForm(f => ({ ...f, name: v }))}
                  placeholder="OPC 53 Grade Cement"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <View style={m.row}>
                <View style={{ flex: 1, gap: 6, marginBottom: 14 }}>
                  <Text style={m.label}>Price (₹) *</Text>
                  <TextInput
                    style={m.input}
                    value={form.base_price}
                    onChangeText={v => setForm(f => ({ ...f, base_price: v }))}
                    keyboardType="numeric"
                    placeholder="420"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
                <View style={{ flex: 1, gap: 6, marginBottom: 14 }}>
                  <Text style={m.label}>Stock Qty</Text>
                  <TextInput
                    style={m.input}
                    value={form.stock_qty}
                    onChangeText={v => setForm(f => ({ ...f, stock_qty: v }))}
                    keyboardType="numeric"
                    placeholder="500"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              </View>

              <View style={{ gap: 6, marginBottom: 14 }}>
                <Text style={m.label}>Unit</Text>
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
              </View>

              <View style={{ gap: 6, marginBottom: 14 }}>
                <Text style={m.label}>Category{categories.length > 0 ? ' *' : ''}</Text>
                {categories.length === 0 ? (
                  <Text style={{ fontFamily: FontFamily.regular, fontSize: 12, color: '#9CA3AF', paddingVertical: 6 }}>
                    No categories yet — create one first.
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
              </View>

              {saveError ? (
                <View style={m.errorBox}>
                  <Text style={m.errorText}>{saveError}</Text>
                </View>
              ) : null}

              <View style={m.actions}>
                <Pressable
                  style={m.cancelBtn}
                  onPress={() => { setModal(false); setSaveError(''); }}
                >
                  <Text style={m.cancelText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[m.saveBtn, (saving || uploading) && m.saveBtnDisabled]}
                  onPress={saveProduct}
                  disabled={saving || uploading}
                >
                  {saving || uploading
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={m.saveText}>Publish</Text>}
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F1F5F9' },

  topRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 4,
  },
  heading: { fontFamily: FontFamily.bold, fontSize: 20, color: Colors.textPrimary, letterSpacing: -0.3 },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Semantic.successFg, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10,
  },
  addBtnText: { fontFamily: FontFamily.bold, fontSize: 13, color: '#fff' },

  tabRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  tab: {
    flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: Radius.full,
    backgroundColor: Colors.white, borderWidth: 1.5, borderColor: Colors.border,
  },
  tabText: { fontFamily: FontFamily.regular, fontSize: 13, color: Colors.textSecondary },

  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingBottom: 12 },
  searchBox: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.white, borderRadius: Radius.md,
    paddingHorizontal: 14, height: 42,
    borderWidth: 1, borderColor: Colors.border, ...Shadow.sm,
  },
  searchInput: { flex: 1, fontFamily: FontFamily.regular, fontSize: 14, color: Colors.textPrimary },
  countBadge: {
    minWidth: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8,
  },
  countText: { fontFamily: FontFamily.semiBold, fontSize: 13 },

  list: { paddingHorizontal: 20, paddingBottom: 32, gap: 12 },
  center: { paddingTop: 60, alignItems: 'center', gap: 12 },
  emptyText: { fontFamily: FontFamily.regular, fontSize: 14, color: Colors.textMuted, marginTop: 4 },

  card: {
    flexDirection: 'row', backgroundColor: Colors.white,
    borderRadius: 14, overflow: 'hidden',
    borderWidth: 1, borderColor: Colors.border, ...Shadow.card,
  },
  productImg: { width: 100, minHeight: 110 },
  productImgFallback: { backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  cardContent: { flex: 1, padding: 14, gap: 4 },
  productName: { fontFamily: FontFamily.semiBold, fontSize: 14, color: Colors.textPrimary, lineHeight: 20 },
  productCat: { fontFamily: FontFamily.regular, fontSize: 12, color: Colors.textMuted },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  metaText: { fontFamily: FontFamily.regular, fontSize: 12, color: Colors.textMuted },
  priceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  price: { fontFamily: FontFamily.bold, fontSize: 15, color: Colors.textPrimary },
  priceUnit: { fontFamily: FontFamily.regular, fontSize: 11, color: Colors.textMuted },

  actionRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, paddingVertical: 8, borderRadius: 9,
  },
  approveBtn: { backgroundColor: Semantic.successFg },
  rejectBtn:  { backgroundColor: Semantic.dangerFg },
  actionText: { fontFamily: FontFamily.bold, fontSize: 12, color: '#fff' },
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
  chipActive: { backgroundColor: '#F0FDF4', borderColor: Semantic.successFg },
  chipText: { fontFamily: FontFamily.medium, fontSize: 12, color: '#6B7280' },
  chipTextActive: { color: Semantic.successFg },
  imagePicker: {
    width: '100%', height: 140, borderRadius: 12,
    borderWidth: 1.5, borderColor: '#E5E7EB', borderStyle: 'dashed',
    marginBottom: 16, overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#F9FAFB',
  },
  imagePickerFilled: { borderStyle: 'solid', borderColor: Semantic.successFg },
  imagePlaceholder: { alignItems: 'center', gap: 6 },
  imagePickerText: { fontFamily: FontFamily.semiBold, fontSize: 13, color: '#6B7280' },
  imagePickerHint: { fontFamily: FontFamily.regular, fontSize: 11, color: '#9CA3AF' },
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
    alignItems: 'center', backgroundColor: Semantic.successFg,
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveText: { fontFamily: FontFamily.semiBold, fontSize: 15, color: '#fff' },
});
