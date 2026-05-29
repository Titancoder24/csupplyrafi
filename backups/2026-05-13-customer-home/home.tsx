import React, { useRef, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet,
  useWindowDimensions, StatusBar, Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import {
  MapPin, ChevronDown, Bell, Search, Truck,
  ChevronRight, ShieldCheck, Clock, Tag,
  Package2, Layers, Hexagon, Mountain, PaintBucket,
  Grid3x3, Droplets, Zap, MoreHorizontal,
  type LucideIcon,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FontFamily } from '@/constants/theme';
import { useCategories, useBrands, useFeaturedProducts } from '@/hooks/useCatalog';
import { useGoogleImage } from '@/hooks/useGoogleImage';
import { useCart } from '@/stores/cart';

/* ─── Refined design tokens — warm off-white, blue + orange retained ─────── */
const BG       = '#FAFAF7';   // warm light gray page bg
const SURFACE  = '#FFFFFF';
const CARD     = '#FFFCF8';   // soft warm card tint (matches Inventory/Orders)
const BORDER   = '#EBEAE5';   // warm neutral border
const HAIRLINE = '#F2EFE9';
const TEXT     = '#0F172A';
const TEXTSUB  = '#374151';
const MUTED    = '#7C7C7C';   // warm muted gray (per spec)
const HINT     = '#A6A6A2';
const PRIMARY    = '#1D4ED8';
const PRIMARY_DK = '#1E40AF';
const PRIMLT     = '#EFF6FF';
const ORANGE   = '#F97316';
const ORANGE_DK = '#EA580C';
const ORANGLT  = '#FFF7ED';

const PT: number =
  Platform.OS === 'ios'  ? 56 :
  Platform.OS === 'web'  ? 0  : 36;

/* ─── Static fallback data (unchanged) ───────────────────────────────────── */
const CATEGORY_IMAGES: Record<string, string> = {
  cement:     'https://images.unsplash.com/photo-1590725175114-f9d8e62e2ed3?auto=format&fit=crop&w=400&q=85',
  steel:      'https://images.unsplash.com/photo-1565008447742-97f6f38c985c?auto=format&fit=crop&w=400&q=85',
  bricks:     'https://images.unsplash.com/photo-1568376794508-ae52c6ab3929?auto=format&fit=crop&w=400&q=85',
  sand:       'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=400&q=85',
  aggregate:  'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=400&q=85',
  paints:     'https://images.unsplash.com/photo-1562259929-b4e1fd3aef09?auto=format&fit=crop&w=400&q=85',
  'tmt-bars': 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=400&q=85',
  tiles:      'https://images.unsplash.com/photo-1615874959474-d609969a20ed?auto=format&fit=crop&w=400&q=85',
  plumbing:   'https://images.unsplash.com/photo-1542013936693-884638332954?auto=format&fit=crop&w=400&q=85',
  electrical: 'https://images.unsplash.com/photo-1565608087341-404b25492f2c?auto=format&fit=crop&w=400&q=85',
  more:       'https://images.unsplash.com/photo-1581094488379-12e0d04bbf76?auto=format&fit=crop&w=400&q=85',
};

const BRAND_LOGO_URLS: Record<string, string> = {
  UltraTech:    'https://logo.clearbit.com/ultratechcement.com',
  JSW:          'https://logo.clearbit.com/jsw.in',
  ACC:          'https://logo.clearbit.com/acclimited.com',
  Ambuja:       'https://logo.clearbit.com/ambujacement.com',
  'Tata Steel': 'https://logo.clearbit.com/tatasteel.com',
};

const BRAND_COLORS: Record<string, string> = {
  UltraTech: '#1E40AF', JSW: '#0F766E', ACC: '#B91C1C',
  Ambuja: '#1D4ED8', Tata: '#CC0000',
};

const FEATURED_PRODUCTS = [
  { id: '1', name: 'OPC 53 Grade Cement',     brand: 'UltraTech',    category: 'Cement',    price: 350,   unit: 'bag', discount: 8,  slug: 'cement',    img: 'https://images.unsplash.com/photo-1590725175114-f9d8e62e2ed3?auto=format&fit=crop&w=400&q=80' },
  { id: '2', name: 'Fe500D TMT Bar 12mm',     brand: 'JSW Steel',    category: 'Steel',     price: 72000, unit: 'MT',  discount: 5,  slug: 'steel',     img: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=400&q=80' },
  { id: '3', name: 'Red Clay Bricks',         brand: 'Ambuja',       category: 'Bricks',    price: 8,     unit: 'pc',  discount: 0,  slug: 'bricks',    img: 'https://images.unsplash.com/photo-1575487870-7000b8c9c22a?auto=format&fit=crop&w=400&q=80' },
  { id: '4', name: 'River Sand M-Grade',      brand: 'Certified',    category: 'Sand',      price: 2800,  unit: 'MT',  discount: 10, slug: 'sand',      img: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=400&q=80' },
  { id: '5', name: 'Interior Emulsion Paint', brand: 'Asian Paints', category: 'Paints',    price: 420,   unit: 'L',   discount: 15, slug: 'paints',    img: 'https://images.unsplash.com/photo-1562259929-b4e1fd3aef09?auto=format&fit=crop&w=400&q=80' },
  { id: '6', name: '20mm Crushed Aggregate',  brand: 'Certified',    category: 'Aggregate', price: 1650,  unit: 'MT',  discount: 0,  slug: 'aggregate', img: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=400&q=80' },
];

const HERO_BANNERS = [
  {
    id: '1',
    image: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=800&q=80',
    title: 'All your construction materials',
    highlight: 'one click away',
    cta: 'Browse marketplace',
    route: '/category/cement',
  },
  {
    id: '2',
    image: 'https://images.unsplash.com/photo-1590725175114-f9d8e62e2ed3?auto=format&fit=crop&w=800&q=80',
    title: 'Premium cement & concrete',
    highlight: 'best prices guaranteed',
    cta: 'Shop cement',
    route: '/category/cement',
  },
  {
    id: '3',
    image: 'https://images.unsplash.com/photo-1565008447742-97f6f38c985c?auto=format&fit=crop&w=800&q=80',
    title: 'TMT bars & structural steel',
    highlight: 'from top manufacturers',
    cta: 'Shop steel',
    route: '/category/steel',
  },
];

const FALLBACK_CATS = [
  { id: '1', slug: 'cement',    name: 'Cement' },
  { id: '2', slug: 'steel',     name: 'Steel' },
  { id: '3', slug: 'bricks',    name: 'Bricks' },
  { id: '4', slug: 'sand',      name: 'Sand' },
  { id: '5', slug: 'aggregate', name: 'Aggregate' },
  { id: '6', slug: 'paints',    name: 'Paints' },
  { id: '7', slug: 'tmt-bars',  name: 'TMT Bars' },
  { id: '8', slug: 'more',      name: 'More' },
];

const FALLBACK_BRANDS = [
  { id: '1', name: 'UltraTech' },
  { id: '2', name: 'JSW' },
  { id: '3', name: 'ACC' },
  { id: '4', name: 'Ambuja' },
  { id: '5', name: 'Tata Steel' },
];

/* Web-only soft photo filter — softens harsh stock photos without affecting native */
const IMG_FILTER = (Platform.OS === 'web'
  ? ({ filter: 'saturate(0.92) contrast(0.96)' } as any)
  : null);

/* ─── BannerCarousel — refined typography + soft image ───────────────────── */
function BannerCarousel({ bannerWidth }: { bannerWidth: number }) {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIdx((prev) => {
        const next = (prev + 1) % HERO_BANNERS.length;
        scrollRef.current?.scrollTo({ x: next * bannerWidth, animated: true });
        return next;
      });
    }, 4500);
    return () => clearInterval(timer);
  }, [bannerWidth]);

  return (
    <View style={bs.wrap}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={(e) => {
          const idx = Math.round(e.nativeEvent.contentOffset.x / bannerWidth);
          setActiveIdx(idx);
        }}
      >
        {HERO_BANNERS.map((b) => (
          <View key={b.id} style={{ width: bannerWidth, height: 200 }}>
            <Image
              source={{ uri: b.image }}
              style={[StyleSheet.absoluteFillObject, IMG_FILTER]}
              contentFit="cover"
              transition={300}
            />
            <LinearGradient
              colors={['rgba(15,23,42,0.78)', 'rgba(15,23,42,0.30)', 'transparent']}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={bs.overlay}
            >
              <View style={bs.dealBadge}>
                <Tag size={10} color="#FBBF24" strokeWidth={2.4} />
                <Text style={bs.dealBadgeTxt}>Featured</Text>
              </View>
              <Text style={bs.title}>{b.title}</Text>
              <Text style={bs.highlight}>{b.highlight}</Text>
              <Pressable
                style={({ pressed }) => [bs.cta, pressed && { opacity: 0.92 }]}
                onPress={() => router.push(b.route as never)}
              >
                <Text style={bs.ctaTxt}>{b.cta}</Text>
                <ChevronRight size={13} color="#fff" strokeWidth={2.4} />
              </Pressable>
            </LinearGradient>
          </View>
        ))}
      </ScrollView>
      <View style={bs.dotsRow}>
        {HERO_BANNERS.map((_, i) => (
          <View key={i} style={[bs.dot, i === activeIdx && bs.dotActive]} />
        ))}
      </View>
    </View>
  );
}

const bs = StyleSheet.create({
  wrap: {
    backgroundColor: TEXT,
    borderRadius: 18, overflow: 'hidden',
    shadowColor: '#0F172A', shadowOpacity: 0.06, shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 }, elevation: 3,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    paddingHorizontal: 22, paddingBottom: 22, paddingTop: 22,
    justifyContent: 'flex-end',
  },
  dealBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: 99, paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
    marginBottom: 12,
  },
  dealBadgeTxt: { fontFamily: FontFamily.semiBold, fontSize: 10.5, color: '#FBBF24', letterSpacing: 0.3 },
  title: {
    fontFamily: FontFamily.bold, fontSize: 26, color: '#fff',
    lineHeight: 28, letterSpacing: -0.8, marginBottom: 4,
    maxWidth: '88%',
  },
  highlight: {
    fontFamily: FontFamily.medium, fontSize: 12, color: 'rgba(255,255,255,0.78)',
    marginBottom: 16, letterSpacing: 0,
    lineHeight: 16,
  },
  cta: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: PRIMARY,
    paddingHorizontal: 18, paddingVertical: 12,
    borderRadius: 14,
    alignSelf: 'flex-start',
  },
  ctaTxt:   { fontFamily: FontFamily.semiBold, fontSize: 13, color: '#fff', letterSpacing: 0.05 },
  dotsRow:  {
    position: 'absolute', bottom: 12, right: 14,
    flexDirection: 'row', gap: 4,
  },
  dot:       { width: 5, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.4)' },
  dotActive: { width: 16, height: 5, borderRadius: 3, backgroundColor: '#fff' },
});

/* ─── BrandCard ──────────────────────────────────────────────────────────── */
function BrandCard({ name, logoUrl: dbLogoUrl }: { name: string; logoUrl?: string | null }) {
  const [err, setErr] = useState(false);
  const fallbackLogoUrl = Object.entries(BRAND_LOGO_URLS).find(([k]) => name.includes(k))?.[1];
  const logoUrl = dbLogoUrl || fallbackLogoUrl;
  const colorKey = Object.keys(BRAND_COLORS).find((k) => name.includes(k)) ?? 'UltraTech';
  const color = BRAND_COLORS[colorKey];
  const hasLogo = !!logoUrl && !err;

  return (
    <Pressable style={brd.card}>
      {hasLogo ? (
        <Image
          source={{ uri: logoUrl }}
          style={brd.logo}
          contentFit="contain"
          onError={() => setErr(true)}
          transition={200}
        />
      ) : (
        <View style={[brd.iconWrap, { backgroundColor: color + '10', borderColor: color + '28' }]}>
          <Text style={[brd.letterMark, { color }]}>
            {name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()}
          </Text>
        </View>
      )}
      <Text style={brd.name} numberOfLines={1}>{name}</Text>
    </Pressable>
  );
}

const brd = StyleSheet.create({
  card: {
    backgroundColor: CARD,
    borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 14,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.04)',
    minWidth: 104, gap: 8,
    shadowColor: '#0F172A', shadowOpacity: 0.04, shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 }, elevation: 1,
  },
  logo:    { width: 64, height: 30 },
  iconWrap: {
    width: 38, height: 38, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
  },
  letterMark: { fontFamily: FontFamily.bold, fontSize: 13, letterSpacing: 0.3 },
  name:    { fontFamily: FontFamily.medium, fontSize: 10.5, color: MUTED, letterSpacing: 0.1 },
});

/* ─── FeaturedProductCard — refined surface + soft image + clean typography */
const CARD_W = 172;
const CARD_IMG_H = 134;

type FeaturedCardProps = {
  name: string;
  brand: string;
  category: string;
  price: number;
  unit: string;
  discount: number;
  img: string;
  slug: string;
  uploadedImg?: string | null;
};

function FeaturedProductCard({
  name, brand, category, price, unit, discount, img, slug, uploadedImg,
}: FeaturedCardProps) {
  const router = useRouter();
  const fmt = (n: number) => '₹' + n.toLocaleString('en-IN');
  const liveImg = useGoogleImage(uploadedImg ? '' : `${name} ${brand} product`);
  const finalImg = uploadedImg || liveImg || img;

  return (
    <Pressable
      style={({ pressed }) => [pc.card, pressed && { opacity: 0.96 }]}
      onPress={() => router.push(`/category/${slug}` as never)}
    >
      <View style={pc.imgWrap}>
        <Image
          source={{ uri: finalImg }}
          style={[pc.img, IMG_FILTER]}
          contentFit="cover"
          transition={200}
        />
        <View style={pc.catBadge}>
          <Text style={pc.catBadgeTxt}>{category.toUpperCase()}</Text>
        </View>
        {discount > 0 && (
          <View style={pc.discBadge}>
            <Text style={pc.discTxt}>{discount}% OFF</Text>
          </View>
        )}
      </View>

      <View style={pc.info}>
        <Text style={pc.name} numberOfLines={2}>{name}</Text>
        <Text style={pc.brand} numberOfLines={1}>{brand}</Text>
        <View style={pc.priceRow}>
          <Text style={pc.price}>{fmt(price)}</Text>
          <Text style={pc.unit}>/{unit}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const pc = StyleSheet.create({
  card: {
    width: CARD_W,
    backgroundColor: CARD,
    borderRadius: 16,
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.04)',
    overflow: 'hidden',
    shadowColor: '#0F172A', shadowOpacity: 0.05, shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 }, elevation: 2,
  },
  imgWrap: { width: CARD_W, height: CARD_IMG_H, backgroundColor: HAIRLINE },
  img:     { width: CARD_W, height: CARD_IMG_H },
  catBadge: {
    position: 'absolute', bottom: 8, left: 8,
    backgroundColor: 'rgba(15,23,42,0.74)',
    borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3.5,
  },
  catBadgeTxt: { fontFamily: FontFamily.semiBold, fontSize: 9, color: '#fff', letterSpacing: 0.6 },
  discBadge: {
    position: 'absolute', top: 8, right: 8,
    backgroundColor: '#DC2626',
    borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3.5,
  },
  discTxt:  { fontFamily: FontFamily.bold, fontSize: 9, color: '#fff', letterSpacing: 0.4 },
  info:     { padding: 12, gap: 3 },
  name: {
    fontFamily: FontFamily.semiBold, fontSize: 13.5,
    color: TEXT, lineHeight: 19, letterSpacing: -0.15,
  },
  brand:    { fontFamily: FontFamily.medium, fontSize: 11, color: MUTED, letterSpacing: 0.05 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 2, marginTop: 6 },
  price:    { fontFamily: FontFamily.bold, fontSize: 16, color: PRIMARY, letterSpacing: -0.3 },
  unit:     { fontFamily: FontFamily.medium, fontSize: 11, color: MUTED },
});

/* ─── CategoryTile — photo + monochrome Lucide fallback ──────────────────── */
const CATEGORY_TINTS: Record<string, { bg: string; fg: string; Icon: LucideIcon }> = {
  cement:     { bg: '#EFF6FF', fg: '#1D4ED8', Icon: Package2  },
  steel:      { bg: '#F1F5F9', fg: '#475569', Icon: Layers    },
  bricks:     { bg: '#FEF2F2', fg: '#B91C1C', Icon: Layers    },
  sand:       { bg: '#FFFBEB', fg: '#B45309', Icon: Mountain  },
  aggregate:  { bg: '#F1F5F9', fg: '#475569', Icon: Hexagon   },
  paints:     { bg: '#FAF5FF', fg: '#6D28D9', Icon: PaintBucket },
  'tmt-bars': { bg: '#FFF7ED', fg: '#C2410C', Icon: Layers    },
  tiles:      { bg: '#EEF2FF', fg: '#4338CA', Icon: Grid3x3   },
  plumbing:   { bg: '#ECFEFF', fg: '#0E7490', Icon: Droplets  },
  electrical: { bg: '#FFFBEB', fg: '#B45309', Icon: Zap       },
  more:       { bg: '#F1F5F9', fg: '#475569', Icon: MoreHorizontal },
};

function CategoryTile({
  slug, name, iconUrl, tileW,
}: { slug: string; name: string; iconUrl?: string | null; tileW: number }) {
  const router = useRouter();
  const [err, setErr] = useState(false);
  const imgH    = Math.round(tileW * 1.0);
  const tint    = CATEGORY_TINTS[slug] ?? CATEGORY_TINTS.more;
  const Icon    = tint.Icon;
  const photoUri = iconUrl && iconUrl.startsWith('http') ? iconUrl : null;

  return (
    <Pressable
      style={({ pressed }) => [ct.tile, { width: tileW }, pressed && { opacity: 0.96 }]}
      onPress={() => router.push(`/category/${slug}` as never)}
    >
      <View style={[ct.imgWrap, { width: tileW - 2, height: imgH, backgroundColor: tint.bg }]}>
        {photoUri && !err ? (
          <Image
            source={{ uri: photoUri }}
            style={[{ width: tileW - 2, height: imgH }, IMG_FILTER]}
            contentFit="cover"
            transition={200}
            onError={() => setErr(true)}
          />
        ) : (
          <View style={[ct.iconFallback, { backgroundColor: tint.bg }]}>
            <Icon
              size={Math.round(tileW * 0.40)}
              color={tint.fg}
              strokeWidth={1.5}
            />
          </View>
        )}
      </View>
      <Text style={ct.label} numberOfLines={1}>{name}</Text>
    </Pressable>
  );
}

const ct = StyleSheet.create({
  tile: {
    backgroundColor: CARD,
    borderRadius: 12,
    alignItems: 'center', paddingBottom: 10,
    overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.04)',
    shadowColor: '#0F172A', shadowOpacity: 0.03, shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 }, elevation: 1,
  },
  imgWrap: { overflow: 'hidden', position: 'relative', backgroundColor: HAIRLINE },
  iconFallback: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center', justifyContent: 'center',
  },
  label: {
    fontFamily: FontFamily.semiBold, fontSize: 11.5,
    color: TEXT, textAlign: 'center',
    paddingHorizontal: 4, marginTop: 8, lineHeight: 14,
    letterSpacing: -0.05,
  },
});

/* ─── SectionHeader — stronger weight, tighter tracking ──────────────────── */
function SectionHeader({ title, onViewAll }: { title: string; onViewAll?: () => void }) {
  return (
    <View style={sh.row}>
      <Text style={sh.title}>{title}</Text>
      {onViewAll && (
        <Pressable onPress={onViewAll} style={({ pressed }) => [sh.btn, pressed && { opacity: 0.7 }]}>
          <Text style={sh.btnTxt}>View all</Text>
          <ChevronRight size={13} color={PRIMARY} strokeWidth={2.2} />
        </Pressable>
      )}
    </View>
  );
}

const sh = StyleSheet.create({
  row:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 },
  title:  { fontFamily: FontFamily.bold, fontSize: 18, color: TEXT, letterSpacing: -0.4 },
  btn:    { flexDirection: 'row', alignItems: 'center', gap: 2, paddingVertical: 4 },
  btnTxt: { fontFamily: FontFamily.medium, fontSize: 12.5, color: PRIMARY, letterSpacing: -0.05 },
});

/* ─── Main Screen ────────────────────────────────────────────────────────── */
export default function CustomerHome() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { data: catsData = [] } = useCategories();
  const { data: brandsData = [] } = useBrands();
  const { data: liveProducts = [] } = useFeaturedProducts(10);
  useCart((s) => s.items.length);

  const cats        = catsData.length   ? catsData   : FALLBACK_CATS;
  const brands      = brandsData.length ? brandsData : FALLBACK_BRANDS;
  const tileW       = Math.floor((width - 32 - 24) / 4);
  const bannerWidth = width - 32;

  const featured: FeaturedCardProps[] = liveProducts.length
    ? liveProducts.map((p: any) => {
        const catSlug = p.categories?.slug ?? 'more';
        const catName = p.categories?.name ?? '';
        const uploaded = Array.isArray(p.images) && p.images.length ? p.images[0] : null;
        const fallback = CATEGORY_IMAGES[catSlug] ?? CATEGORY_IMAGES.more;
        return {
          name: p.name,
          brand: p.brand ?? catName ?? '',
          category: catName || catSlug,
          price: Number(p.base_price ?? 0),
          unit: p.unit ?? 'unit',
          discount: 0,
          img: fallback,
          slug: catSlug,
          uploadedImg: uploaded,
        };
      })
    : FEATURED_PRODUCTS.map((p) => ({ ...p, uploadedImg: null }));

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={PRIMARY_DK} />

      {/* ── Compact blue header band: location + bell + search ── */}
      <View style={s.headerBand}>
        <LinearGradient
          colors={[PRIMARY, '#2563EB']}
          start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={s.headerInner}>
          <View style={s.headerTopRow}>
            <Pressable style={({ pressed }) => [s.locationRow, pressed && { opacity: 0.85 }]}>
              <View style={s.locationPin}>
                <MapPin size={11} color="#fff" strokeWidth={2.4} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.deliverTo}>Deliver to</Text>
                <View style={s.cityRow}>
                  <Text style={s.city} numberOfLines={1}>Ahmedabad, Gujarat</Text>
                  <ChevronDown size={14} color="#fff" strokeWidth={2} />
                </View>
              </View>
            </Pressable>
            <Pressable
              style={({ pressed }) => [s.bellWrap, pressed && { opacity: 0.8 }]}
              onPress={() => router.push('/customer/notifications')}
              hitSlop={6}
            >
              <Bell size={17} color="#fff" strokeWidth={1.8} />
              <View style={s.bellDot} />
            </Pressable>
          </View>

          {/* Search bar — sits inside the blue band */}
          <Pressable
            style={({ pressed }) => [s.searchBar, pressed && { opacity: 0.96 }]}
            onPress={() => router.push('/customer/search')}
          >
            <Search size={16} color="#60A5FA" strokeWidth={2} />
            <Text style={s.searchHint}>Search materials, brands…</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero Banner Carousel ── */}
        <BannerCarousel bannerWidth={bannerWidth} />

        {/* ── Shop by Category ── */}
        <View>
          <SectionHeader
            title="Shop by category"
            onViewAll={() => router.push('/category/cement' as never)}
          />
          <View style={s.catGrid}>
            {cats.slice(0, 8).map((c) => (
              <CategoryTile
                key={c.id}
                slug={c.slug}
                name={c.name}
                iconUrl={(c as any).icon_url}
                tileW={tileW}
              />
            ))}
          </View>
        </View>

        {/* ── Featured Deals ── */}
        <View>
          <SectionHeader
            title="Featured deals"
            onViewAll={() => router.push('/category/cement' as never)}
          />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 12, paddingRight: 4 }}
          >
            {featured.map((p, i) => (
              <FeaturedProductCard key={`${p.slug}-${i}`} {...p} />
            ))}
          </ScrollView>
        </View>

        {/* ── Top Brands ── */}
        <View>
          <SectionHeader title="Top brands" />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 10, paddingRight: 4 }}
          >
            {brands.map((b: any) => <BrandCard key={b.id} name={b.name} logoUrl={b.logo_url} />)}
          </ScrollView>
        </View>

        {/* ── Transport Banner — refined logistics card ── */}
        <Pressable
          style={({ pressed }) => [s.transportBanner, pressed && { opacity: 0.96 }]}
          onPress={() => router.push('/customer/transport' as never)}
        >
          <Image
            source={{ uri: 'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&w=800&q=85' }}
            style={[StyleSheet.absoluteFillObject, IMG_FILTER]}
            contentFit="cover"
            transition={250}
          />
          <LinearGradient
            colors={['rgba(15,23,42,0.82)', 'rgba(15,23,42,0.42)']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFillObject}
          />
          <View style={s.transportContent}>
            <View style={s.transportTag}>
              <Truck size={11} color="#FBBF24" strokeWidth={2.4} />
              <Text style={s.transportTagTxt}>LOGISTICS</Text>
            </View>
            <Text style={s.transportTitle}>Move materials anywhere</Text>
            <Text style={s.transportSub}>
              Verified drivers · instant quotes · live tracking
            </Text>
          </View>
          <View style={s.transportArrow}>
            <ChevronRight size={16} color="#fff" strokeWidth={2.4} />
          </View>
        </Pressable>

        {/* ── Why C-Supply ── */}
        <View>
          <SectionHeader title="Why C-Supply" />
          <View style={s.whyRow}>
            {[
              { Icon: ShieldCheck, label: 'Verified\nvendors',   color: PRIMARY,   colorLt: PRIMLT    },
              { Icon: Clock,       label: 'On-time\ndelivery',   color: '#15803D', colorLt: '#F0FDF4' },
              { Icon: Tag,         label: 'Best market\nprices', color: ORANGE_DK, colorLt: ORANGLT   },
            ].map(({ Icon, label, color, colorLt }) => (
              <View key={label} style={s.whyCard}>
                <View style={[s.whyIconBox, { backgroundColor: colorLt }]}>
                  <Icon size={15} color={color} strokeWidth={1.6} />
                </View>
                <Text style={s.whyLabel}>{label}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={{ height: 16 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  /* Blue header band — compact, search bar overlaps into body */
  headerBand: {
    backgroundColor: PRIMARY,
    paddingBottom: 28,   // extra blue so the search overlaps with -16 marginBottom
  },
  headerInner: {
    paddingHorizontal: 16,
    paddingTop: PT > 0 ? PT - 4 : 10,
    paddingBottom: 0,
  },
  headerTopRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    gap: 12,
    marginBottom: 10,
  },
  locationRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 9 },
  locationPin: {
    width: 26, height: 26, borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },
  deliverTo: {
    fontFamily: FontFamily.medium, fontSize: 10.5, letterSpacing: 0.2,
    color: '#fff', opacity: 0.7,
  },
  cityRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 1 },
  city: {
    fontFamily: FontFamily.bold, fontSize: 17, color: '#fff',
    letterSpacing: -0.5, lineHeight: 22, maxWidth: '90%',
  },

  bellWrap: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },
  bellDot: {
    position: 'absolute', top: 7, right: 7,
    width: 7, height: 7, borderRadius: 4,
    backgroundColor: '#F97316', borderWidth: 1.5, borderColor: PRIMARY,
  },

  /* Search bar — 50h, radius 16, floating overlap into body */
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    height: 50,
    marginBottom: -25,   // pulls the bar to overlap the band/body seam
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.04)',
    paddingHorizontal: 16,
    shadowColor: '#0F172A', shadowOpacity: 0.08, shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 }, elevation: 4,
  },
  searchHint: {
    flex: 1,
    fontFamily: FontFamily.regular, fontSize: 13.5, color: HINT,
    letterSpacing: -0.05,
  },

  /* Body — pulled up under the overlapping search bar */
  scroll: { paddingHorizontal: 16, paddingTop: 40, paddingBottom: 24, gap: 28 },

  /* Category grid */
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },

  /* Transport banner */
  transportBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 18, overflow: 'hidden',
    minHeight: 108, padding: 18,
    shadowColor: '#0F172A', shadowOpacity: 0.08, shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 }, elevation: 3,
  },
  transportContent: { flex: 1, gap: 4 },
  transportTag: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 99, paddingHorizontal: 9, paddingVertical: 3,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.20)',
    marginBottom: 4,
  },
  transportTagTxt: { fontFamily: FontFamily.bold, fontSize: 9.5, color: '#FBBF24', letterSpacing: 0.6 },
  transportTitle: { fontFamily: FontFamily.bold, fontSize: 16, color: '#fff', letterSpacing: -0.3 },
  transportSub:   { fontFamily: FontFamily.regular, fontSize: 11.5, color: 'rgba(255,255,255,0.85)', lineHeight: 16, letterSpacing: 0.05 },
  transportArrow: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.24)',
    alignItems: 'center', justifyContent: 'center',
  },

  /* Why row */
  whyRow: { flexDirection: 'row', gap: 10 },
  whyCard: {
    flex: 1, backgroundColor: CARD,
    borderRadius: 14, borderWidth: 1, borderColor: 'rgba(0,0,0,0.04)',
    paddingVertical: 16, paddingHorizontal: 10,
    alignItems: 'center', gap: 10,
    shadowColor: '#0F172A', shadowOpacity: 0.04, shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 }, elevation: 1,
  },
  whyIconBox: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  whyLabel:   {
    fontFamily: FontFamily.semiBold, fontSize: 11.5,
    color: TEXTSUB, textAlign: 'center', lineHeight: 16,
    letterSpacing: -0.05,
  },
});
