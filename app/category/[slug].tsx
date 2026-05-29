import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, Pressable, StyleSheet, FlatList, TextInput, ActivityIndicator, Platform,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Search, ShoppingCart, SlidersHorizontal, Package, X } from 'lucide-react-native';
import { supabase } from '@/services/supabase';
import { useCart } from '@/stores/cart';
import { formatINR } from '@/lib/format';
import { getProductImage } from '@/lib/productImage';
import { FontFamily } from '@/constants/theme';

const BG      = '#F8FAFC';
const SURFACE = '#FFFFFF';
const BORDER  = '#E2E8F0';
const TEXT    = '#0F172A';
const TEXTSUB = '#334155';
const MUTED   = '#64748B';
const PRIMARY = '#1D4ED8';
const PRIMLT  = '#EFF6FF';
const ORANGE  = '#F97316';
const PT      = Platform.OS === 'ios' ? 56 : Platform.OS === 'web' ? 0 : 36;


type Product = {
  id: string; name: string; base_price: number; unit: string;
  images?: string[] | null; vendor_name?: string; vendor_id?: string;
  min_order_qty?: number; slug?: string; stock_qty?: number;
};

const SORT_OPTS = [
  { key: 'newest' as const,     label: 'Newest First' },
  { key: 'price_asc' as const,  label: 'Price: Low → High' },
  { key: 'price_desc' as const, label: 'Price: High → Low' },
];

export default function CategoryScreen() {
  const { slug }  = useLocalSearchParams<{ slug: string }>();
  const router    = useRouter();
  const addItem   = useCart(s => s.add);
  const cartItems = useCart(s => s.items);
  const { width } = useWindowDimensions();

  // Responsive grid: 2 cols on mobile, 3 on tablet, 4 on desktop
  const NUM_COLS  = width >= 1200 ? 4 : width >= 840 ? 3 : 2;
  const H_PAD     = 20;     // grid horizontal padding
  const GAP       = 12;     // gap between cards
  const CARD_W    = Math.floor((width - H_PAD * 2 - GAP * (NUM_COLS - 1)) / NUM_COLS);
  const CARD_IH   = Math.round(CARD_W * 0.75);

  const [products,  setProducts]  = useState<Product[]>([]);
  const [catName,   setCatName]   = useState('');
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState('');
  const [sortBy,    setSortBy]    = useState<'newest' | 'price_asc' | 'price_desc'>('newest');
  const [showSort,  setShowSort]  = useState(false);

  const cartCount = cartItems.reduce((sum, i) => sum + i.quantity, 0);

  const load = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    try {
      const { data: cat } = await supabase
        .from('categories').select('id, name').eq('slug', slug).maybeSingle();
      if (cat) {
        setCatName(cat.name);
        const { data } = await supabase
          .from('products')
          .select('id, name, slug, base_price, unit, images, vendor_id, stock_qty')
          .eq('status', 'active').eq('category_id', cat.id).is('deleted_at', null)
          .order('created_at', { ascending: false }).limit(100);
        setProducts((data ?? []).map((d: any) => ({
          id: d.id, name: d.name, slug: d.slug, base_price: d.base_price ?? 0,
          unit: d.unit ?? 'unit', images: d.images,
          vendor_id: d.vendor_id,
          stock_qty: d.stock_qty,
          min_order_qty: 1,
        })));
      } else {
        setCatName((slug ?? '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => { load(); }, [load]);

  const filtered = products
    .filter(p =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.vendor_name ?? '').toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) =>
      sortBy === 'price_asc'  ? a.base_price - b.base_price :
      sortBy === 'price_desc' ? b.base_price - a.base_price : 0
    );

  const handleAdd = (p: Product) => {
    addItem({
      productId: p.id, name: p.name, unit: p.unit,
      unitPrice: p.base_price, quantity: 1,
      moq: 1, vendorId: p.vendor_id,
      image: p.images?.[0] ?? undefined,
    });
  };

  return (
    <View style={s.root}>
      {/* Header */}
      <View style={[s.header, { paddingTop: PT > 0 ? PT : 14 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={s.iconBtn}>
          <ArrowLeft size={20} color="#0F172A" strokeWidth={2} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={s.headerSub}>Category</Text>
          <Text style={s.headerTitle} numberOfLines={1}>
            {catName || (slug ?? '').replace(/-/g, ' ')}
          </Text>
        </View>
        <Pressable onPress={() => router.push('/customer/cart' as never)} style={s.iconBtn} hitSlop={12}>
          <ShoppingCart size={20} color="#0F172A" strokeWidth={2} />
          {cartCount > 0 && (
            <View style={s.cartBadge}><Text style={s.cartBadgeTxt}>{cartCount}</Text></View>
          )}
        </Pressable>
      </View>

      {/* Toolbar */}
      <View style={s.toolbar}>
        <View style={s.searchWrap}>
          <Search size={14} color="#0F172A" strokeWidth={2} />
          <TextInput
            style={s.searchInput}
            placeholder="Search products…"
            placeholderTextColor={MUTED}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')} hitSlop={8}>
              <X size={14} color="#0F172A" />
            </Pressable>
          )}
        </View>
        <Pressable style={s.sortBtn} onPress={() => setShowSort(v => !v)}>
          <SlidersHorizontal size={16} color="#0F172A" strokeWidth={2} />
        </Pressable>
      </View>

      {/* Sort dropdown */}
      {showSort && (
        <View style={s.dropdown}>
          {SORT_OPTS.map(o => (
            <Pressable
              key={o.key}
              style={[s.dropOpt, sortBy === o.key && s.dropOptActive]}
              onPress={() => { setSortBy(o.key); setShowSort(false); }}
            >
              <Text style={[s.dropOptTxt, sortBy === o.key && s.dropOptTxtActive]}>{o.label}</Text>
              {sortBy === o.key && <View style={s.dropDot} />}
            </Pressable>
          ))}
        </View>
      )}

      {/* Count bar */}
      <View style={s.countBar}>
        <Text style={s.countTxt}>
          {loading ? 'Loading…' : `${filtered.length} product${filtered.length !== 1 ? 's' : ''}`}
        </Text>
        <Text style={s.sortLbl}>{SORT_OPTS.find(o => o.key === sortBy)?.label}</Text>
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator color={PRIMARY} size="large" /></View>
      ) : filtered.length === 0 ? (
        <View style={s.center}>
          <View style={s.emptyBox}><Package size={40} color="#0F172A" strokeWidth={1.4} /></View>
          <Text style={s.emptyTitle}>{search ? 'No results found' : 'No products yet'}</Text>
          <Text style={s.emptySub}>
            {search ? 'Try a different search term.' : 'More products coming soon.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={it => it.id}
          numColumns={NUM_COLS}
          key={`grid-${NUM_COLS}`}
          contentContainerStyle={[s.grid, { paddingHorizontal: H_PAD }]}
          columnWrapperStyle={{ gap: GAP, marginBottom: GAP }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const inCart = cartItems.find(c => c.productId === item.id);
            const imgUri = getProductImage({ name: item.name, images: item.images }, { size: 400 });
            const outOfStock = item.stock_qty != null && item.stock_qty <= 0;
            const lowStock   = !outOfStock && item.stock_qty != null && item.stock_qty <= 5;
            return (
              <Pressable
                style={[s.card, { width: CARD_W }]}
                onPress={() => router.push({ pathname: '/product/[id]', params: { id: item.id } } as never)}
              >
                <View style={[s.imgWrap, { width: CARD_W, height: CARD_IH }]}>
                  <Image source={{ uri: imgUri }} style={{ width: CARD_W, height: CARD_IH, opacity: outOfStock ? 0.45 : 1 }} contentFit="cover" transition={200} />
                  {outOfStock ? (
                    <View style={[s.stockBadge, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
                      <View style={[s.stockDot, { backgroundColor: '#B91C1C' }]} />
                      <Text style={[s.stockTxt, { color: '#B91C1C' }]}>Out of Stock</Text>
                    </View>
                  ) : lowStock ? (
                    <View style={[s.stockBadge, { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' }]}>
                      <View style={[s.stockDot, { backgroundColor: '#B45309' }]} />
                      <Text style={[s.stockTxt, { color: '#B45309' }]}>Only {item.stock_qty} left</Text>
                    </View>
                  ) : (
                    <View style={s.stockBadge}>
                      <View style={s.stockDot} />
                      <Text style={s.stockTxt}>In Stock</Text>
                    </View>
                  )}
                </View>
                <View style={s.info}>
                  {item.vendor_name && <Text style={s.vendor} numberOfLines={1}>{item.vendor_name}</Text>}
                  <Text style={s.name} numberOfLines={2}>{item.name}</Text>
                  <View style={s.priceRow}>
                    <Text style={s.price}>{formatINR(item.base_price)}</Text>
                    <Text style={s.unit}>/{item.unit}</Text>
                  </View>
                  <Pressable
                    style={[s.addBtn, inCart && s.addBtnActive, outOfStock && { opacity: 0.4 }]}
                    onPress={e => { e.stopPropagation(); if (!outOfStock) handleAdd(item); }}
                    disabled={outOfStock}
                  >
                    <ShoppingCart size={12} color="#0F172A" strokeWidth={2.5} />
                    <Text style={[s.addBtnTxt, inCart && s.addBtnTxtActive]}>
                      {outOfStock ? 'Unavailable' : inCart ? `In Cart (${inCart.quantity})` : 'Add to Cart'}
                    </Text>
                  </Pressable>
                </View>
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 12, paddingBottom: 12,
    backgroundColor: SURFACE, borderBottomWidth: 1, borderBottomColor: BORDER,
  },
  iconBtn:    { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  headerSub:  { fontFamily: FontFamily.regular, fontSize: 11, color: MUTED },
  headerTitle:{ fontFamily: FontFamily.bold, fontSize: 18, color: TEXT, letterSpacing: -0.3 },
  cartBadge: {
    position: 'absolute', top: 2, right: 0,
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: ORANGE, alignItems: 'center', justifyContent: 'center',
  },
  cartBadgeTxt: { fontFamily: FontFamily.bold, fontSize: 9, color: SURFACE },

  toolbar: {
    flexDirection: 'row', gap: 10, alignItems: 'center',
    backgroundColor: SURFACE, paddingHorizontal: 14, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: BORDER,
  },
  searchWrap: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: BG, borderRadius: 10, paddingHorizontal: 12, height: 42,
    borderWidth: 1, borderColor: BORDER,
  },
  searchInput: { flex: 1, fontFamily: FontFamily.regular, fontSize: 14, color: TEXT },
  sortBtn: {
    width: 42, height: 42, borderRadius: 10, backgroundColor: PRIMLT,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#BFDBFE',
  },

  dropdown: {
    position: 'absolute', top: (PT > 0 ? PT : 14) + 56 + 62, right: 14, zIndex: 200,
    backgroundColor: SURFACE, borderRadius: 12, borderWidth: 1, borderColor: BORDER,
    minWidth: 200, overflow: 'hidden',
    shadowColor: TEXT, shadowOpacity: 0.12, shadowRadius: 16, shadowOffset: { width: 0, height: 4 }, elevation: 10,
  },
  dropOpt: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 13,
    borderBottomWidth: 1, borderBottomColor: BORDER,
  },
  dropOptActive: { backgroundColor: PRIMLT },
  dropOptTxt:    { fontFamily: FontFamily.regular, fontSize: 14, color: TEXT },
  dropOptTxtActive: { fontFamily: FontFamily.semiBold, color: PRIMARY },
  dropDot:       { width: 8, height: 8, borderRadius: 4, backgroundColor: PRIMARY },

  countBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 8, backgroundColor: BG,
  },
  countTxt: { fontFamily: FontFamily.semiBold, fontSize: 12, color: MUTED },
  sortLbl:  { fontFamily: FontFamily.regular, fontSize: 11, color: MUTED },

  center:    { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  emptyBox:  { width: 80, height: 80, borderRadius: 40, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  emptyTitle:{ fontFamily: FontFamily.bold, fontSize: 16, color: TEXT },
  emptySub:  { fontFamily: FontFamily.regular, fontSize: 13, color: MUTED, textAlign: 'center' },

  grid: { paddingTop: 16, paddingBottom: 32 },

  card: {
    backgroundColor: SURFACE, borderRadius: 14,
    borderWidth: 1, borderColor: BORDER, overflow: 'hidden',
    shadowColor: TEXT, shadowOpacity: 0.05, shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 }, elevation: 2,
  },
  imgWrap:   { backgroundColor: '#F1F5F9' },
  stockBadge:{
    position: 'absolute', bottom: 7, left: 7,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(21,128,61,0.88)', borderRadius: 99,
    paddingHorizontal: 7, paddingVertical: 3,
  },
  stockDot:  { width: 5, height: 5, borderRadius: 3, backgroundColor: SURFACE },
  stockTxt:  { fontFamily: FontFamily.semiBold, fontSize: 9, color: SURFACE },

  info:     { padding: 10, gap: 3 },
  vendor:   { fontFamily: FontFamily.regular, fontSize: 10.5, color: MUTED },
  name:     { fontFamily: FontFamily.semiBold, fontSize: 13, color: TEXT, lineHeight: 18 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 2, marginTop: 2 },
  price:    { fontFamily: FontFamily.bold, fontSize: 14, color: PRIMARY },
  unit:     { fontFamily: FontFamily.regular, fontSize: 11, color: MUTED },
  addBtn: {
    marginTop: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    paddingVertical: 8, borderRadius: 8,
    backgroundColor: PRIMLT, borderWidth: 1, borderColor: '#BFDBFE',
  },
  addBtnActive:   { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' },
  addBtnTxt:      { fontFamily: FontFamily.semiBold, fontSize: 12, color: PRIMARY },
  addBtnTxtActive:{ color: '#15803D' },
});
