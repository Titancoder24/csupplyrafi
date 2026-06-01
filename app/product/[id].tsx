import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  ActivityIndicator, Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft, ShoppingCart, Minus, Plus, Package,
  Store, Tag, CheckCircle2,
} from 'lucide-react-native';
import { supabase } from '@/services/supabase';
import { useCart } from '@/stores/cart';
import { toast } from '@/services/toast';
import { FontFamily } from '@/constants/theme';
import { getProductImage } from '@/lib/productImage';

const BG      = '#F8FAFC';
const SURFACE = '#FFFFFF';
const BORDER  = '#E2E8F0';
const TEXT    = '#0F172A';
const TEXTSUB = '#334155';
const MUTED   = '#64748B';
const PRIMARY = '#1D4ED8';
const ORANGE  = '#F97316';
const GREEN   = '#15803D';
const HINT    = '#94A3B8';
const PT      = Platform.OS === 'ios' ? 56 : Platform.OS === 'web' ? 0 : 36;

type Product = {
  id: string; name: string; base_price: number; unit: string;
  description?: string; images?: string[] | null;
  category_name?: string; vendor_name?: string; vendor_id?: string;
  min_order_qty?: number; status: string; stock_qty?: number;
};

export default function ProductDetail() {
  const { id }    = useLocalSearchParams<{ id: string }>();
  const router    = useRouter();
  const add       = useCart(s => s.add);
  const items     = useCart(s => s.items);

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [qty,     setQty]     = useState(1);
  const [added,   setAdded]   = useState(false);
  const [imgIdx,  setImgIdx]  = useState(0);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      try {
        const { data } = await supabase
          .from('products')
          .select('id, name, base_price, unit, description, images, status, category_id, vendor_id, stock_qty')
          .eq('id', id)
          .maybeSingle();

        if (data) {
          const p = data as any;

          // Fetch category name separately
          let category_name: string | undefined;
          if (p.category_id) {
            const { data: cat } = await supabase
              .from('categories').select('name').eq('id', p.category_id).maybeSingle();
            category_name = cat?.name;
          }

          // Fetch vendor shop name separately
          let vendor_name: string | undefined;
          let vendor_id: string | undefined;
          if (p.vendor_id) {
            const { data: vp } = await supabase
              .from('vendor_profiles').select('id, shop_name').eq('id', p.vendor_id).maybeSingle();
            vendor_name = vp?.shop_name;
            vendor_id   = vp?.id;
          }

          setProduct({
            id: p.id, name: p.name, base_price: p.base_price ?? 0,
            unit: p.unit ?? 'unit', description: p.description, images: p.images,
            category_name, vendor_name, vendor_id,
            min_order_qty: 1,
            status: p.status,
            stock_qty: p.stock_qty,
          });
          setQty(1);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const inCart = product ? items.some(i => i.productId === product.id) : false;

  function handleAddToCart() {
    if (!product) return;
    add({
      productId: product.id, name: product.name, unit: product.unit,
      unitPrice: product.base_price, quantity: qty,
      moq: product.min_order_qty ?? 1, image: product.images?.[0],
      vendorId: product.vendor_id,
    });
    setAdded(true);
    toast.success('Added to Cart!', `${qty} × ${product.name}`);
    setTimeout(() => setAdded(false), 2500);
  }

  const moq   = product?.min_order_qty ?? 1;
  const step  = moq > 1 ? moq : 1;
  const imgs = product?.images?.length
    ? product.images.map(img => getProductImage(img, { size: 600 }))
    : [getProductImage(product?.name ?? '', { size: 600 })];
  const total = product ? product.base_price * qty : 0;

  if (loading) return (
    <View style={{ flex: 1, backgroundColor: BG, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator color={PRIMARY} size="large" />
    </View>
  );

  if (!product) return (
    <View style={{ flex: 1, backgroundColor: BG, alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <Package size={52} color="#0F172A" strokeWidth={1.4} />
      <Text style={{ fontFamily: FontFamily.bold, fontSize: 17, color: TEXT }}>Product not found</Text>
      <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/customer/home' as never)} style={{ backgroundColor: PRIMARY, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 11 }}>
        <Text style={{ fontFamily: FontFamily.bold, fontSize: 14, color: '#fff' }}>Go Back</Text>
      </Pressable>
    </View>
  );

  return (
    <View style={s.root}>
      {/* Header */}
      <View style={[s.header, { paddingTop: PT > 0 ? PT : 12 }]}>
        <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/customer/home' as never)} style={s.iconBtn} hitSlop={12}>
          <ArrowLeft size={20} color="#0F172A" strokeWidth={2} />
        </Pressable>
        <Text style={s.headerTitle} numberOfLines={1}>{product.name}</Text>
        <Pressable onPress={() => router.push('/customer/cart' as never)} style={s.iconBtn} hitSlop={12}>
          <ShoppingCart size={20} color="#0F172A" strokeWidth={2} />
          {inCart && <View style={s.cartDot} />}
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero image */}
        <View style={s.imgContainer}>
          <Image
            source={{ uri: imgs[imgIdx] ?? getProductImage(product.name, { size: 600 }) }}
            style={s.img}
            contentFit="cover"
          />
          {product.category_name && (
            <View style={s.catBadge}>
              <Tag size={10} color="#0F172A" strokeWidth={2} />
              <Text style={s.catBadgeTxt}>{product.category_name}</Text>
            </View>
          )}
          {product.status !== 'active' && (
            <View style={s.outOfStockOverlay}>
              <Text style={s.outOfStockTxt}>Out of Stock</Text>
            </View>
          )}
          {imgs.length > 1 && (
            <View style={s.imgDots}>
              {imgs.map((_, i) => (
                <View key={i} style={[s.imgDot, i === imgIdx && s.imgDotActive]} />
              ))}
            </View>
          )}
        </View>

        {/* Thumbnail strip */}
        {imgs.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            style={s.thumbRow} contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingVertical: 8 }}>
            {imgs.map((uri, i) => (
              <Pressable key={i} onPress={() => setImgIdx(i)}
                style={[s.thumb, i === imgIdx && s.thumbActive]}>
                <Image source={{ uri }} style={{ width: 60, height: 60 }} contentFit="cover" />
              </Pressable>
            ))}
          </ScrollView>
        )}

        {/* Info card */}
        <View style={s.infoCard}>
          <Text style={s.productName}>{product.name}</Text>

          {product.vendor_name && (
            <View style={s.vendorRow}>
              <View style={s.vendorIconBox}>
                <Store size={13} color="#0F172A" strokeWidth={2} />
              </View>
              <Text style={s.vendorTxt}>
                Sold by <Text style={{ fontFamily: FontFamily.semiBold, color: PRIMARY }}>{product.vendor_name}</Text>
              </Text>
            </View>
          )}

          {/* Price block */}
          <View style={s.priceBlock}>
            <View>
              <Text style={s.priceLabel}>Unit Price</Text>
              <View style={s.priceRow}>
                <Text style={s.price}>₹{product.base_price.toLocaleString('en-IN')}</Text>
                <Text style={s.perUnit}>/ {product.unit}</Text>
              </View>
            </View>
            <View style={[s.stockChip, product.status !== 'active' && s.stockChipOut]}>
              <View style={[s.stockDot, product.status !== 'active' && s.stockDotOut]} />
              <Text style={[s.stockTxt, product.status !== 'active' && s.stockTxtOut]}>
                {product.status === 'active' ? 'In Stock' : 'Out of Stock'}
              </Text>
            </View>
          </View>

          {moq > 1 && (
            <View style={s.moqBox}>
              <Text style={s.moqTxt}>Min. order: {moq} {product.unit}</Text>
            </View>
          )}

          {product.description ? (
            <View style={s.descBox}>
              <Text style={s.descTitle}>Product Description</Text>
              <Text style={s.descTxt}>{product.description}</Text>
            </View>
          ) : null}
        </View>

        {/* Quantity selector */}
        {product.status === 'active' && (
          <View style={s.qtyCard}>
            <Text style={s.qtyLabel}>Select Quantity</Text>
            <View style={s.qtyRow}>
              <Pressable
                style={[s.qtyBtn, qty <= moq && s.qtyBtnDis]}
                onPress={() => setQty(q => Math.max(moq, q - step))}
                disabled={qty <= moq}
              >
                <Minus size={16} color="#0F172A" strokeWidth={2.5} />
              </Pressable>
              <View style={s.qtyDisplay}>
                <Text style={s.qtyVal}>{qty}</Text>
                <Text style={s.qtyUnit}>{product.unit}</Text>
              </View>
              <Pressable style={s.qtyBtn} onPress={() => setQty(q => q + step)}>
                <Plus size={16} color="#0F172A" strokeWidth={2.5} />
              </Pressable>
            </View>
            <View style={s.totalRow}>
              <Text style={s.totalLabel}>Total</Text>
              <Text style={s.totalVal}>₹{total.toLocaleString('en-IN')}</Text>
            </View>
          </View>
        )}

        {/* Trust features */}
        <View style={s.featureCard}>
          {[
            ['Verified Vendor',  'Quality assured supplier'],
            ['Bulk Orders',      'Discounts available on bulk'],
            ['Secure Payment',   'Pay on delivery or online'],
          ].map(([title, sub]) => (
            <View key={title} style={s.featureRow}>
              <CheckCircle2 size={16} color="#0F172A" strokeWidth={2} />
              <View style={{ flex: 1 }}>
                <Text style={s.featureTitle}>{title}</Text>
                <Text style={s.featureSub}>{sub}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom CTA */}
      <View style={s.bottomBar}>
        <View style={s.bottomPrice}>
          <Text style={s.bottomPriceLbl}>Total</Text>
          <Text style={s.bottomPriceVal}>₹{total.toLocaleString('en-IN')}</Text>
        </View>
        {(() => {
          const outOfStock = product.stock_qty != null && product.stock_qty <= 0;
          const disabled   = added || product.status !== 'active' || outOfStock;
          return (
            <Pressable
              style={[s.addCartBtn, added && s.addCartBtnAdded, disabled && s.addCartBtnDis]}
              onPress={() => { if (!outOfStock) handleAddToCart(); }}
              disabled={disabled}
            >
              {added ? (
                <>
                  <CheckCircle2 size={18} color="#FFFFFF" strokeWidth={2.5} />
                  <Text style={s.addCartTxt}>Added!</Text>
                </>
              ) : outOfStock ? (
                <Text style={s.addCartTxt}>Out of Stock</Text>
              ) : (
                <>
                  <ShoppingCart size={18} color="#FFFFFF" strokeWidth={2} />
                  <Text style={s.addCartTxt}>{inCart ? 'Update Cart' : 'Add to Cart'}</Text>
                </>
              )}
            </Pressable>
          );
        })()}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: SURFACE, paddingHorizontal: 10, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: BORDER,
  },
  iconBtn: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: BG, alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { flex: 1, fontFamily: FontFamily.semiBold, fontSize: 15, color: TEXT },
  cartDot: {
    position: 'absolute', top: 6, right: 6,
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: ORANGE, borderWidth: 1.5, borderColor: SURFACE,
  },

  imgContainer: { backgroundColor: SURFACE },
  img: { width: '100%', height: 300 },
  catBadge: {
    position: 'absolute', top: 14, right: 14,
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: SURFACE, borderRadius: 99,
    paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: BORDER,
  },
  catBadgeTxt:  { fontFamily: FontFamily.semiBold, fontSize: 11, color: PRIMARY },
  outOfStockOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.45)', paddingVertical: 10, alignItems: 'center',
  },
  outOfStockTxt: { fontFamily: FontFamily.bold, fontSize: 14, color: '#fff' },
  imgDots: { flexDirection: 'row', justifyContent: 'center', gap: 5, paddingVertical: 8 },
  imgDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: BORDER },
  imgDotActive: { width: 18, backgroundColor: PRIMARY },

  thumbRow: { maxHeight: 76, backgroundColor: SURFACE },
  thumb: {
    width: 60, height: 60, borderRadius: 8, overflow: 'hidden',
    borderWidth: 1.5, borderColor: BORDER,
  },
  thumbActive: { borderColor: PRIMARY },

  infoCard: {
    margin: 12, backgroundColor: SURFACE, borderRadius: 16,
    padding: 16, gap: 10, borderWidth: 1, borderColor: BORDER,
    shadowColor: TEXT, shadowOpacity: 0.04, shadowRadius: 8,
    shadowOffset: { width: 0, height: 1 }, elevation: 1,
  },
  productName: { fontFamily: FontFamily.bold, fontSize: 20, color: TEXT, lineHeight: 28, letterSpacing: -0.4 },

  vendorRow:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  vendorIconBox:{ width: 26, height: 26, borderRadius: 7, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center' },
  vendorTxt:    { fontFamily: FontFamily.regular, fontSize: 13, color: MUTED },

  priceBlock:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  priceLabel:   { fontFamily: FontFamily.regular, fontSize: 11, color: MUTED, marginBottom: 2 },
  priceRow:     { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  price:        { fontFamily: FontFamily.bold, fontSize: 28, color: PRIMARY, letterSpacing: -0.5 },
  perUnit:      { fontFamily: FontFamily.medium, fontSize: 13, color: MUTED },

  stockChip:    { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F0FDF4', borderRadius: 99, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: '#BBF7D0' },
  stockChipOut: { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
  stockDot:     { width: 7, height: 7, borderRadius: 4, backgroundColor: GREEN },
  stockDotOut:  { backgroundColor: '#EF4444' },
  stockTxt:     { fontFamily: FontFamily.semiBold, fontSize: 12, color: GREEN },
  stockTxtOut:  { color: '#EF4444' },

  moqBox:  { backgroundColor: '#FFFBEB', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: '#FDE68A' },
  moqTxt:  { fontFamily: FontFamily.medium, fontSize: 12, color: '#B45309' },

  descBox:   { gap: 6, borderTopWidth: 1, borderTopColor: BORDER, paddingTop: 10 },
  descTitle: { fontFamily: FontFamily.semiBold, fontSize: 13, color: TEXT },
  descTxt:   { fontFamily: FontFamily.regular, fontSize: 13, color: MUTED, lineHeight: 20 },

  qtyCard: {
    margin: 12, marginTop: 0, backgroundColor: SURFACE, borderRadius: 16,
    padding: 16, gap: 12, borderWidth: 1, borderColor: BORDER,
    shadowColor: TEXT, shadowOpacity: 0.04, shadowRadius: 8,
    shadowOffset: { width: 0, height: 1 }, elevation: 1,
  },
  qtyLabel:   { fontFamily: FontFamily.semiBold, fontSize: 13, color: TEXT },
  qtyRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  qtyBtn:     { width: 44, height: 44, borderRadius: 12, borderWidth: 1.5, borderColor: BORDER, backgroundColor: BG, alignItems: 'center', justifyContent: 'center' },
  qtyBtnDis:  { opacity: 0.4 },
  qtyDisplay: { alignItems: 'center', gap: 2 },
  qtyVal:     { fontFamily: FontFamily.bold, fontSize: 28, color: TEXT },
  qtyUnit:    { fontFamily: FontFamily.regular, fontSize: 11, color: MUTED },
  totalRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: BORDER, paddingTop: 12 },
  totalLabel: { fontFamily: FontFamily.medium, fontSize: 14, color: MUTED },
  totalVal:   { fontFamily: FontFamily.bold, fontSize: 20, color: PRIMARY },

  featureCard: {
    margin: 12, marginTop: 0, backgroundColor: SURFACE, borderRadius: 16,
    padding: 16, gap: 14, borderWidth: 1, borderColor: BORDER,
    shadowColor: TEXT, shadowOpacity: 0.04, shadowRadius: 8,
    shadowOffset: { width: 0, height: 1 }, elevation: 1,
  },
  featureRow:   { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  featureTitle: { fontFamily: FontFamily.semiBold, fontSize: 13, color: TEXT },
  featureSub:   { fontFamily: FontFamily.regular, fontSize: 12, color: MUTED, marginTop: 1 },

  bottomBar: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, paddingBottom: Platform.OS === 'ios' ? 28 : 14,
    backgroundColor: SURFACE, borderTopWidth: 1, borderTopColor: BORDER,
  },
  bottomPrice:    { gap: 1 },
  bottomPriceLbl: { fontFamily: FontFamily.regular, fontSize: 11, color: MUTED },
  bottomPriceVal: { fontFamily: FontFamily.bold, fontSize: 19, color: TEXT },
  addCartBtn: {
    flex: 1, height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: ORANGE, borderRadius: 12,
    shadowColor: ORANGE, shadowOpacity: 0.3, shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 }, elevation: 5,
  },
  addCartBtnAdded: { backgroundColor: GREEN },
  addCartBtnDis:   { backgroundColor: HINT, shadowOpacity: 0 },
  addCartTxt:      { fontFamily: FontFamily.bold, fontSize: 16, color: '#fff' },
});
