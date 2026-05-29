import React, { useRef, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet,
  useWindowDimensions, StatusBar, Platform, StyleProp, ViewStyle,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import {
  MapPin, ChevronDown, Bell, Search, Truck,
  ChevronRight, ShieldCheck, Clock, Tag,
  Package2, Layers, Hexagon, Mountain, PaintBucket,
  Grid3x3, Droplets, Zap, MoreHorizontal,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FontFamily } from '@/constants/theme';
import { useCategories, useBrands, useFeaturedProducts } from '@/hooks/useCatalog';
import { useGoogleImage } from '@/hooks/useGoogleImage';
import { useCart } from '@/stores/cart';

// ── Design tokens ─────────────────────────────────────────────────────────
const BG      = '#F8FAFC';
const SURFACE = '#FFFFFF';
const BORDER  = '#E2E8F0';
const TEXT    = '#0F172A';
const TEXTSUB = '#334155';
const MUTED   = '#64748B';
const HINT    = '#94A3B8';
const PRIMARY = '#1D4ED8';
const PRIMLT  = '#EFF6FF';
const ORANGE  = '#F97316';
const ORANGLT = '#FFF7ED';

const PT: number =
  Platform.OS === 'ios'  ? 56 :
  Platform.OS === 'web'  ? 0  : 36;

// ── Static data ───────────────────────────────────────────────────────────
// Real product photography — high-res CDN URLs (Unsplash). Replace with backend URLs when ready.
// Best-effort photo URLs — if any fails to load, the tile falls back to a
// category-specific Lucide icon on a tinted background (see CategoryTile below).
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
  {
    id: '1', name: 'OPC 53 Grade Cement', brand: 'UltraTech', category: 'Cement',
    price: 350, unit: 'bag', discount: 8, slug: 'cement',
    img: 'https://images.unsplash.com/photo-1590725175114-f9d8e62e2ed3?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: '2', name: 'Fe500D TMT Bar 12mm', brand: 'JSW Steel', category: 'Steel',
    price: 72000, unit: 'MT', discount: 5, slug: 'steel',
    img: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: '3', name: 'Red Clay Bricks', brand: 'Ambuja', category: 'Bricks',
    price: 8, unit: 'pc', discount: 0, slug: 'bricks',
    img: 'https://images.unsplash.com/photo-1575487870-7000b8c9c22a?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: '4', name: 'River Sand M-Grade', brand: 'Certified', category: 'Sand',
    price: 2800, unit: 'MT', discount: 10, slug: 'sand',
    img: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: '5', name: 'Interior Emulsion Paint', brand: 'Asian Paints', category: 'Paints',
    price: 420, unit: 'L', discount: 15, slug: 'paints',
    img: 'https://images.unsplash.com/photo-1562259929-b4e1fd3aef09?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: '6', name: '20mm Crushed Aggregate', brand: 'Certified', category: 'Aggregate',
    price: 1650, unit: 'MT', discount: 0, slug: 'aggregate',
    img: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=400&q=80',
  },
];

const HERO_BANNERS = [
  {
    id: '1',
    image: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=800&q=80',
    title: 'All Your Construction\nMaterials',
    highlight: 'One Click Away',
    cta: 'Order Now',
    route: '/category/cement',
  },
  {
    id: '2',
    image: 'https://images.unsplash.com/photo-1590725175114-f9d8e62e2ed3?auto=format&fit=crop&w=800&q=80',
    title: 'Premium Cement &\nConcrete',
    highlight: 'Best Prices Guaranteed',
    cta: 'Shop Cement',
    route: '/category/cement',
  },
  {
    id: '3',
    image: 'https://images.unsplash.com/photo-1565008447742-97f6f38c985c?auto=format&fit=crop&w=800&q=80',
    title: 'TMT Bars &\nStructural Steel',
    highlight: 'From Top Manufacturers',
    cta: 'Shop Steel',
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

// ── BannerCarousel ────────────────────────────────────────────────────────
// Uses expo-image + LinearGradient overlay (works on both native & web)
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
    <View style={[bs.wrap, { borderRadius: 16, overflow: 'hidden' }]}>
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
          <View key={b.id} style={{ width: bannerWidth, height: 218 }}>
            {/* Background photo via expo-image — works on web */}
            <Image
              source={{ uri: b.image }}
              style={StyleSheet.absoluteFillObject}
              contentFit="cover"
              transition={300}
            />
            {/* Gradient overlay */}
            <LinearGradient
              colors={['rgba(0,0,0,0.82)', 'rgba(0,0,0,0.28)', 'transparent']}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={bs.overlay}
            >
              <View style={bs.dealBadge}>
                <Tag size={10} color={ORANGE} strokeWidth={2.5} />
                <Text style={bs.dealBadgeTxt}>Best Deals</Text>
              </View>
              <Text style={bs.title}>{b.title}</Text>
              <Text style={bs.highlight}>{b.highlight}</Text>
              <Pressable style={bs.cta} onPress={() => router.push(b.route as never)}>
                <Text style={bs.ctaTxt}>{b.cta}</Text>
                <ChevronRight size={14} color={SURFACE} strokeWidth={2.5} />
              </Pressable>
            </LinearGradient>
          </View>
        ))}
      </ScrollView>
      {/* Dots */}
      <View style={bs.dotsRow}>
        {HERO_BANNERS.map((_, i) => (
          <View key={i} style={[bs.dot, i === activeIdx && bs.dotActive]} />
        ))}
      </View>
    </View>
  );
}

const bs = StyleSheet.create({
  wrap: { backgroundColor: TEXT },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    paddingHorizontal: 22, paddingBottom: 24, paddingTop: 20,
    justifyContent: 'flex-end',
  },
  dealBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(249,115,22,0.2)',
    borderRadius: 99, paddingHorizontal: 9, paddingVertical: 4,
    borderWidth: 1, borderColor: 'rgba(249,115,22,0.4)',
    marginBottom: 10,
  },
  dealBadgeTxt: { fontFamily: FontFamily.semiBold, fontSize: 10, color: ORANGE },
  title: {
    fontFamily: FontFamily.bold, fontSize: 24, color: SURFACE,
    lineHeight: 32, letterSpacing: -0.5, marginBottom: 4,
  },
  highlight: {
    fontFamily: FontFamily.semiBold, fontSize: 13.5, color: ORANGE,
    marginBottom: 18, letterSpacing: 0.1,
  },
  cta: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: PRIMARY, paddingHorizontal: 16, paddingVertical: 9,
    borderRadius: 8, alignSelf: 'flex-start',
  },
  ctaTxt:    { fontFamily: FontFamily.bold, fontSize: 13, color: SURFACE },
  dotsRow:   { flexDirection: 'row', justifyContent: 'center', gap: 5, paddingVertical: 10, backgroundColor: SURFACE },
  dot:       { width: 6, height: 6, borderRadius: 3, backgroundColor: BORDER },
  dotActive: { width: 20, height: 6, borderRadius: 3, backgroundColor: PRIMARY },
});

// ── BrandCard ─────────────────────────────────────────────────────────────
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
        <View style={[brd.iconWrap, { backgroundColor: color + '12', borderColor: color + '33' }]}>
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
    backgroundColor: SURFACE, borderRadius: 12,
    paddingHorizontal: 18, paddingVertical: 14,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: BORDER, minWidth: 108, gap: 6,
    shadowColor: TEXT, shadowOpacity: 0.04, shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 }, elevation: 1,
  },
  logo:    { width: 72, height: 34 },
  iconWrap: {
    width: 38, height: 38, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
  },
  letterMark: { fontFamily: FontFamily.bold, fontSize: 14, letterSpacing: 0.3 },
  name:    { fontFamily: FontFamily.medium, fontSize: 10.5, color: MUTED },
});

// ── FeaturedProductCard ───────────────────────────────────────────────────
const CARD_W = 170;
const CARD_IMG_H = 130;

type FeaturedCardProps = {
  name: string;
  brand: string;
  category: string;
  price: number;
  unit: string;
  discount: number;
  img: string;        // fallback image
  slug: string;
  uploadedImg?: string | null; // uploaded image from DB (vendor / admin) — wins over Google + fallback
};

function FeaturedProductCard({
  name, brand, category, price, unit, discount, img, slug, uploadedImg,
}: FeaturedCardProps) {
  const router = useRouter();
  const fmt = (n: number) => '₹' + n.toLocaleString('en-IN');
  // Only fetch from Google when no uploaded image is provided
  const liveImg = useGoogleImage(uploadedImg ? '' : `${name} ${brand} product`);
  const finalImg = uploadedImg || liveImg || img;

  return (
    <Pressable
      style={pc.card}
      onPress={() => router.push(`/category/${slug}` as never)}
    >
      <View style={pc.imgWrap}>
        <Image
          source={{ uri: finalImg }}
          style={pc.img}
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
    width: CARD_W, backgroundColor: SURFACE, borderRadius: 14,
    borderWidth: 1, borderColor: BORDER, overflow: 'hidden',
    shadowColor: TEXT, shadowOpacity: 0.06, shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 }, elevation: 3,
  },
  // Explicit pixel dimensions so the image renders on web
  imgWrap: { width: CARD_W, height: CARD_IMG_H, backgroundColor: '#F1F5F9' },
  img:     { width: CARD_W, height: CARD_IMG_H },
  catBadge: {
    position: 'absolute', bottom: 8, left: 8,
    backgroundColor: 'rgba(15,23,42,0.78)',
    borderRadius: 5, paddingHorizontal: 8, paddingVertical: 3.5,
  },
  catBadgeTxt: { fontFamily: FontFamily.bold, fontSize: 9, color: SURFACE, letterSpacing: 0.7 },
  discBadge: {
    position: 'absolute', top: 8, right: 8,
    backgroundColor: '#DC2626',
    borderRadius: 5, paddingHorizontal: 7, paddingVertical: 3.5,
  },
  discTxt:  { fontFamily: FontFamily.bold, fontSize: 9, color: SURFACE, letterSpacing: 0.4 },
  info:     { padding: 12, gap: 3 },
  name: {
    fontFamily: FontFamily.semiBold, fontSize: 13.5,
    color: TEXT, lineHeight: 19, letterSpacing: -0.1,
  },
  brand:    { fontFamily: FontFamily.regular, fontSize: 11, color: MUTED },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 2, marginTop: 6 },
  price:    { fontFamily: FontFamily.bold, fontSize: 17, color: PRIMARY },
  unit:     { fontFamily: FontFamily.regular, fontSize: 11, color: MUTED },
});

// ── CategoryTile ──────────────────────────────────────────────────────────
// Photo-first tile with a material-specific Lucide icon fallback if the URL fails.
const CATEGORY_TINTS: Record<string, { bg: string; fg: string; Icon: any }> = {
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
  const imgH    = Math.round(tileW * 1.05);
  const tint    = CATEGORY_TINTS[slug] ?? CATEGORY_TINTS.more;
  const Icon    = tint.Icon;
  // Prefer admin-uploaded photo; ignore broken Unsplash IDs that load wrong content
  const photoUri = iconUrl && iconUrl.startsWith('http') ? iconUrl : null;

  return (
    <Pressable
      style={[ct.tile, { width: tileW }]}
      onPress={() => router.push(`/category/${slug}` as never)}
    >
      <View style={[ct.imgWrap, { width: tileW - 2, height: imgH, backgroundColor: tint.bg }]}>
        {photoUri && !err ? (
          <Image
            source={{ uri: photoUri }}
            style={{ width: tileW - 2, height: imgH }}
            contentFit="cover"
            transition={200}
            onError={() => setErr(true)}
          />
        ) : (
          <View style={[ct.iconFallback, { backgroundColor: tint.bg }]}>
            <Icon
              size={Math.round(tileW * 0.42)}
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
    backgroundColor: SURFACE, borderRadius: 14,
    alignItems: 'center', paddingBottom: 10,
    overflow: 'hidden', borderWidth: 1, borderColor: BORDER,
    shadowColor: TEXT, shadowOpacity: 0.05, shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  imgWrap: { overflow: 'hidden', position: 'relative', backgroundColor: '#F1F5F9' },
  scrim:   { position: 'absolute', left: 0, right: 0, bottom: 0, height: '50%' },
  iconFallback: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center', justifyContent: 'center',
  },
  label: {
    fontFamily: FontFamily.semiBold, fontSize: 11.5,
    color: TEXT, textAlign: 'center',
    paddingHorizontal: 4, marginTop: 8, lineHeight: 15,
    letterSpacing: -0.1,
  },
});

// ── SectionHeader ─────────────────────────────────────────────────────────
function SectionHeader({ title, onViewAll }: { title: string; onViewAll?: () => void }) {
  return (
    <View style={sh.row}>
      <Text style={sh.title}>{title}</Text>
      {onViewAll && (
        <Pressable onPress={onViewAll} style={sh.btn}>
          <Text style={sh.btnTxt}>View All</Text>
          <ChevronRight size={13} color={ORANGE} strokeWidth={2.5} />
        </Pressable>
      )}
    </View>
  );
}

const sh = StyleSheet.create({
  row:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title:  { fontFamily: FontFamily.bold, fontSize: 17.5, color: TEXT, letterSpacing: -0.3 },
  btn:    { flexDirection: 'row', alignItems: 'center', gap: 2 },
  btnTxt: { fontFamily: FontFamily.semiBold, fontSize: 13, color: ORANGE },
});

// ── Main Screen ───────────────────────────────────────────────────────────
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

  // Map live products (admin- or vendor-uploaded) into the card shape.
  // Their uploaded image (if any) is passed through `uploadedImg` so the
  // card prefers it over the Google fallback.
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
      <StatusBar barStyle="dark-content" backgroundColor={SURFACE} />

      {/* ── Header ── */}
      <View style={s.header}>
        <Pressable style={s.locationRow}>
          <View style={s.locationIconBox}>
            <MapPin size={14} color={PRIMARY} strokeWidth={2.5} />
          </View>
          <View>
            <Text style={s.deliverTo}>Deliver to</Text>
            <View style={s.cityRow}>
              <Text style={s.city}>Ahmedabad, Gujarat</Text>
              <ChevronDown size={12} color={PRIMARY} strokeWidth={2.5} />
            </View>
          </View>
        </Pressable>
        <Pressable
          style={s.bellWrap}
          onPress={() => router.push('/customer/notifications')}
        >
          <Bell size={20} color={TEXT} strokeWidth={1.8} />
          <View style={s.bellDot} />
        </Pressable>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Search ── */}
        <Pressable style={s.searchBar} onPress={() => router.push('/customer/search')}>
          <View style={s.searchLeft}>
            <Search size={16} color={MUTED} strokeWidth={2} />
            <Text style={s.searchHint}>Search cement, steel, bricks…</Text>
          </View>
          <View style={s.searchBtn}>
            <Text style={s.searchBtnTxt}>Search</Text>
          </View>
        </Pressable>

        {/* ── Hero Banner Carousel ── */}
        <BannerCarousel bannerWidth={bannerWidth} />

        {/* ── Shop by Category ── */}
        <View>
          <SectionHeader
            title="Shop by Category"
            onViewAll={() => router.push('/category/cement' as never)}
          />
          <View style={s.catGrid}>
            {cats.slice(0, 8).map((c) => (
              <CategoryTile key={c.id} slug={c.slug} name={c.name} iconUrl={(c as any).icon_url} tileW={tileW} />
            ))}
          </View>
        </View>

        {/* ── Featured Deals ── */}
        <View>
          <SectionHeader
            title="Featured Deals"
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
          <SectionHeader title="Top Brands" />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 10, paddingRight: 4 }}
          >
            {brands.map((b: any) => <BrandCard key={b.id} name={b.name} logoUrl={b.logo_url} />)}
          </ScrollView>
        </View>

        {/* ── Transport Banner — real logistics photography with overlay ── */}
        <Pressable
          style={s.transportBanner}
          onPress={() => router.push('/customer/transport' as never)}
        >
          <Image
            source={{ uri: 'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&w=800&q=85' }}
            style={StyleSheet.absoluteFillObject}
            contentFit="cover"
            transition={250}
          />
          <LinearGradient
            colors={['rgba(15,23,42,0.82)', 'rgba(15,23,42,0.45)']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFillObject}
          />
          <View style={s.transportContent}>
            <View style={s.transportTag}>
              <Truck size={11} color={ORANGE} strokeWidth={2.5} />
              <Text style={s.transportTagTxt}>LOGISTICS</Text>
            </View>
            <Text style={s.transportTitle}>Move materials anywhere</Text>
            <Text style={s.transportSub}>
              Verified drivers · instant quotes · live tracking
            </Text>
          </View>
          <View style={s.transportArrow}>
            <ChevronRight size={18} color={SURFACE} strokeWidth={2.5} />
          </View>
        </Pressable>

        {/* ── Why C-Supply ── */}
        <View>
          <SectionHeader title="Why C-Supply?" />
          <View style={s.whyRow}>
            {[
              { Icon: ShieldCheck, label: 'Verified\nVendors',   color: PRIMARY,   colorLt: PRIMLT    },
              { Icon: Clock,       label: 'On-time\nDelivery',   color: '#15803D', colorLt: '#F0FDF4' },
              { Icon: Tag,         label: 'Best Market\nPrices', color: ORANGE,    colorLt: ORANGLT   },
            ].map(({ Icon, label, color, colorLt }) => (
              <View key={label} style={s.whyCard}>
                <View style={[s.whyIconBox, { backgroundColor: colorLt }]}>
                  <Icon size={20} color={color} strokeWidth={1.8} />
                </View>
                <Text style={s.whyLabel}>{label}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: PT > 0 ? PT : 14,
    paddingBottom: 12,
    backgroundColor: SURFACE, borderBottomWidth: 1, borderBottomColor: BORDER,
  },
  locationRow:     { flexDirection: 'row', alignItems: 'center', gap: 8 },
  locationIconBox: { width: 32, height: 32, borderRadius: 8, backgroundColor: PRIMLT, alignItems: 'center', justifyContent: 'center' },
  deliverTo:       { fontFamily: FontFamily.regular, fontSize: 10, color: MUTED },
  cityRow:         { flexDirection: 'row', alignItems: 'center', gap: 3 },
  city:            { fontFamily: FontFamily.bold, fontSize: 14.5, color: TEXT },
  bellWrap: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: BG, borderWidth: 1, borderColor: BORDER,
    alignItems: 'center', justifyContent: 'center',
  },
  bellDot: {
    position: 'absolute', top: 8, right: 8,
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: '#EF4444', borderWidth: 1.5, borderColor: SURFACE,
  },

  scroll: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 20, gap: 26 },

  searchBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: SURFACE, borderRadius: 12,
    borderWidth: 1, borderColor: BORDER,
    paddingLeft: 14, paddingRight: 6, paddingVertical: 6,
    shadowColor: TEXT, shadowOpacity: 0.04, shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  searchLeft:   { flexDirection: 'row', alignItems: 'center', gap: 9, flex: 1 },
  searchHint:   { fontFamily: FontFamily.regular, fontSize: 13.5, color: HINT, paddingVertical: 8, flex: 1 },
  searchBtn:    { backgroundColor: PRIMARY, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 9 },
  searchBtnTxt: { fontFamily: FontFamily.bold, fontSize: 13, color: SURFACE },

  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },

  transportBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 14, overflow: 'hidden',
    minHeight: 110, padding: 18,
    shadowColor: TEXT, shadowOpacity: 0.08, shadowRadius: 12,
    shadowOffset: { width: 0, height: 3 }, elevation: 3,
  },
  transportContent: { flex: 1, gap: 4 },
  transportTag: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(249,115,22,0.18)',
    borderRadius: 99, paddingHorizontal: 9, paddingVertical: 3,
    borderWidth: 1, borderColor: 'rgba(249,115,22,0.4)',
    marginBottom: 4,
  },
  transportTagTxt: { fontFamily: FontFamily.bold, fontSize: 9.5, color: ORANGE, letterSpacing: 0.6 },
  transportTitle: { fontFamily: FontFamily.bold, fontSize: 16, color: SURFACE, letterSpacing: -0.2 },
  transportSub:   { fontFamily: FontFamily.regular, fontSize: 12, color: 'rgba(255,255,255,0.85)', lineHeight: 17 },
  transportArrow: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center', justifyContent: 'center',
  },

  whyRow: { flexDirection: 'row', gap: 10 },
  whyCard: {
    flex: 1, backgroundColor: SURFACE,
    borderRadius: 12, borderWidth: 1, borderColor: BORDER,
    paddingVertical: 18, paddingHorizontal: 10,
    alignItems: 'center', gap: 10,
    shadowColor: TEXT, shadowOpacity: 0.04, shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 }, elevation: 1,
  },
  whyIconBox: { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  whyLabel:   {
    fontFamily: FontFamily.semiBold, fontSize: 11.5,
    color: TEXTSUB, textAlign: 'center', lineHeight: 17,
  },
});
