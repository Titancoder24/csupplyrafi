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

/* ─── Premium SaaS tokens (cool palette, blue brand) ──────────────────────── */
const BG         = '#F8FAFC';
const SURFACE    = '#FFFFFF';
const SURFACE_2  = '#F9FAFB';
const BORDER     = '#E5E7EB';
const HAIRLINE   = '#F3F4F6';
const INK_900    = '#0F172A';
const INK_700    = '#334155';
const INK_500    = '#64748B';
const INK_400    = '#94A3B8';
const INK_300    = '#CBD5E1';

const PRIMARY    = '#2563EB';
const PRIMARY_DK = '#1D4ED8';
const PRIMARY_LT = '#EFF6FF';

const ACCENT     = '#F59E0B'; // for "Featured" badge highlights
const ACCENT_RED = '#DC2626';

const PT: number =
  Platform.OS === 'ios'  ? 56 :
  Platform.OS === 'web'  ? 0  : 36;

const IS_WEB = Platform.OS === 'web';

/* Web-only soft photo filter — keeps stock photos cinematic, no native impact */
const IMG_FILTER = (IS_WEB
  ? ({ filter: 'saturate(0.92) contrast(1.02)' } as any)
  : null);

/* ─── Premium shadow system (3 elevations) ────────────────────────────────── */
const Shadow1 = {
  shadowColor: '#0F172A', shadowOpacity: 0.04, shadowRadius: 8,
  shadowOffset: { width: 0, height: 2 }, elevation: 1,
};
const Shadow2 = {
  shadowColor: '#0F172A', shadowOpacity: 0.06, shadowRadius: 14,
  shadowOffset: { width: 0, height: 4 }, elevation: 2,
};
const Shadow3 = {
  shadowColor: '#0F172A', shadowOpacity: 0.10, shadowRadius: 24,
  shadowOffset: { width: 0, height: 8 }, elevation: 6,
};

/* ─── Static fallback data ───────────────────────────────────────────────── */
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
    image: 'https://images.unsplash.com/photo-1581094288338-2314dddb7ece?auto=format&fit=crop&w=1200&q=85',
    eyebrow: 'Marketplace',
    title: 'Construction materials,\ndelivered to site.',
    sub: '500+ verified vendors · doorstep delivery',
    cta: 'Browse marketplace',
    route: '/category/cement',
  },
  {
    id: '2',
    image: 'https://images.unsplash.com/photo-1590725175114-f9d8e62e2ed3?auto=format&fit=crop&w=1200&q=85',
    eyebrow: 'Best Prices',
    title: 'Cement & concrete\nat factory rates.',
    sub: 'OPC, PPC, ready-mix · 15% bulk discounts',
    cta: 'Shop cement',
    route: '/category/cement',
  },
  {
    id: '3',
    image: 'https://images.unsplash.com/photo-1565008447742-97f6f38c985c?auto=format&fit=crop&w=1200&q=85',
    eyebrow: 'Structural Steel',
    title: 'TMT bars from\ntrusted mills.',
    sub: 'Fe500D · IS 1786 certified · live prices',
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

/* ─── HERO — cinematic carousel with rich hierarchy ───────────────────────── */
function HeroCarousel({ bannerWidth }: { bannerWidth: number }) {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const HERO_H = 256;

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIdx((prev) => {
        const next = (prev + 1) % HERO_BANNERS.length;
        scrollRef.current?.scrollTo({ x: next * bannerWidth, animated: true });
        return next;
      });
    }, 5000);
    return () => clearInterval(timer);
  }, [bannerWidth]);

  return (
    <View style={[hero.wrap, { height: HERO_H }]}>
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
          <View key={b.id} style={{ width: bannerWidth, height: HERO_H }}>
            <Image
              source={{ uri: b.image }}
              style={[StyleSheet.absoluteFillObject, IMG_FILTER]}
              contentFit="cover"
              transition={300}
            />
            {/* Layered dark→transparent gradient for cinematic feel */}
            <LinearGradient
              colors={['rgba(7,17,32,0.88)', 'rgba(7,17,32,0.55)', 'rgba(7,17,32,0.15)']}
              start={{ x: 0, y: 0.85 }} end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFillObject}
            />
            {/* Subtle bottom vignette */}
            <LinearGradient
              colors={['transparent', 'rgba(7,17,32,0.40)']}
              start={{ x: 0.5, y: 0.6 }} end={{ x: 0.5, y: 1 }}
              style={StyleSheet.absoluteFillObject}
            />

            <View style={hero.content}>
              <View style={hero.eyebrowWrap}>
                <View style={hero.eyebrowDot} />
                <Text style={hero.eyebrow}>{b.eyebrow}</Text>
              </View>
              <Text style={hero.title}>{b.title}</Text>
              <Text style={hero.sub} numberOfLines={1}>{b.sub}</Text>
              <Pressable
                style={({ pressed }) => [hero.cta, pressed && { opacity: 0.92, transform: [{ scale: 0.98 }] }]}
                onPress={() => router.push(b.route as never)}
              >
                <Text style={hero.ctaTxt}>{b.cta}</Text>
                <View style={hero.ctaArrow}>
                  <ChevronRight size={12} color={PRIMARY} strokeWidth={2.6} />
                </View>
              </Pressable>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Premium dot indicators — active slide stretches */}
      <View style={hero.dotsRow}>
        {HERO_BANNERS.map((_, i) => (
          <View key={i} style={[hero.dot, i === activeIdx && hero.dotActive]} />
        ))}
      </View>
    </View>
  );
}

const hero = StyleSheet.create({
  wrap: {
    backgroundColor: '#071120',
    borderRadius: 20, overflow: 'hidden',
    ...Shadow3,
  },
  content: {
    ...StyleSheet.absoluteFillObject,
    paddingHorizontal: 22, paddingVertical: 22,
    justifyContent: 'flex-end',
  },
  eyebrowWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderRadius: 99, paddingHorizontal: 9, paddingVertical: 4,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)',
    marginBottom: 14,
    ...(IS_WEB ? { backdropFilter: 'blur(8px)' as any } : null),
  },
  eyebrowDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: ACCENT },
  eyebrow: {
    fontFamily: FontFamily.semiBold, fontSize: 10.5, color: '#fff',
    letterSpacing: 0.8, textTransform: 'uppercase' as const,
  },
  title: {
    fontFamily: FontFamily.bold, fontSize: 25, color: '#fff',
    lineHeight: 30, letterSpacing: -0.7,
    maxWidth: '90%',
  },
  sub: {
    fontFamily: FontFamily.medium, fontSize: 12.5,
    color: 'rgba(255,255,255,0.84)',
    marginTop: 6, lineHeight: 17, letterSpacing: 0,
    maxWidth: '92%',
  },
  cta: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fff',
    paddingHorizontal: 14, paddingVertical: 10, paddingRight: 6,
    borderRadius: 99,
    alignSelf: 'flex-start', marginTop: 16,
    ...Shadow2,
  },
  ctaTxt: {
    fontFamily: FontFamily.semiBold, fontSize: 12.5, color: INK_900,
    letterSpacing: -0.1,
  },
  ctaArrow: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: PRIMARY_LT,
    alignItems: 'center', justifyContent: 'center',
  },
  dotsRow: {
    position: 'absolute', bottom: 14, right: 18,
    flexDirection: 'row', gap: 5, alignItems: 'center',
  },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.42)' },
  dotActive: { width: 18, height: 5, borderRadius: 3, backgroundColor: '#fff' },
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
    backgroundColor: SURFACE,
    borderRadius: 14,
    paddingHorizontal: 18, paddingVertical: 14,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: BORDER,
    minWidth: 110, gap: 8,
    ...Shadow1,
  },
  logo:    { width: 68, height: 32 },
  iconWrap: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
  },
  letterMark: { fontFamily: FontFamily.bold, fontSize: 13.5, letterSpacing: 0.3 },
  name:    { fontFamily: FontFamily.medium, fontSize: 11, color: INK_500, letterSpacing: 0.1 },
});

/* ─── FeaturedProductCard ────────────────────────────────────────────────── */
const CARD_W = 168;
const CARD_IMG_H = 132;

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
      style={({ pressed }) => [pc.card, pressed && { opacity: 0.97, transform: [{ scale: 0.99 }] }]}
      onPress={() => router.push(`/category/${slug}` as never)}
    >
      <View style={pc.imgWrap}>
        <Image
          source={{ uri: finalImg }}
          style={[pc.img, IMG_FILTER]}
          contentFit="cover"
          transition={200}
        />
        {discount > 0 && (
          <View style={pc.discBadge}>
            <Text style={pc.discTxt}>{discount}% OFF</Text>
          </View>
        )}
        <View style={pc.catBadge}>
          <Text style={pc.catBadgeTxt}>{category}</Text>
        </View>
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
    backgroundColor: SURFACE,
    borderRadius: 16,
    borderWidth: 1, borderColor: BORDER,
    overflow: 'hidden',
    ...Shadow2,
  },
  imgWrap: { width: CARD_W, height: CARD_IMG_H, backgroundColor: HAIRLINE },
  img:     { width: CARD_W, height: CARD_IMG_H },
  catBadge: {
    position: 'absolute', bottom: 8, left: 8,
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3.5,
    ...(IS_WEB ? { backdropFilter: 'blur(8px)' as any } : null),
  },
  catBadgeTxt: { fontFamily: FontFamily.semiBold, fontSize: 9.5, color: INK_700, letterSpacing: 0.4, textTransform: 'uppercase' as const },
  discBadge: {
    position: 'absolute', top: 8, right: 8,
    backgroundColor: ACCENT_RED,
    borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3.5,
  },
  discTxt:  { fontFamily: FontFamily.bold, fontSize: 9, color: '#fff', letterSpacing: 0.4 },
  info:     { padding: 12, gap: 2 },
  name: {
    fontFamily: FontFamily.semiBold, fontSize: 13,
    color: INK_900, lineHeight: 18, letterSpacing: -0.15,
  },
  brand:    { fontFamily: FontFamily.medium, fontSize: 11, color: INK_500, letterSpacing: 0.05 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 2, marginTop: 8 },
  price:    { fontFamily: FontFamily.bold, fontSize: 15.5, color: INK_900, letterSpacing: -0.3 },
  unit:     { fontFamily: FontFamily.medium, fontSize: 11, color: INK_500 },
});

/* ─── CategoryTile ───────────────────────────────────────────────────────── */
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
      style={({ pressed }) => [ct.tile, { width: tileW }, pressed && { opacity: 0.96, transform: [{ scale: 0.97 }] }]}
      onPress={() => router.push(`/category/${slug}` as never)}
    >
      <View style={[ct.imgWrap, { width: tileW, height: imgH, backgroundColor: tint.bg }]}>
        {photoUri && !err ? (
          <Image
            source={{ uri: photoUri }}
            style={[{ width: tileW, height: imgH }, IMG_FILTER]}
            contentFit="cover"
            transition={200}
            onError={() => setErr(true)}
          />
        ) : (
          <View style={ct.iconFallback}>
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
    backgroundColor: SURFACE,
    borderRadius: 14,
    alignItems: 'center', paddingBottom: 10,
    overflow: 'hidden',
    borderWidth: 1, borderColor: BORDER,
    ...Shadow1,
  },
  imgWrap: { overflow: 'hidden', backgroundColor: HAIRLINE },
  iconFallback: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center', justifyContent: 'center',
  },
  label: {
    fontFamily: FontFamily.semiBold, fontSize: 11,
    color: INK_900, textAlign: 'center',
    paddingHorizontal: 4, marginTop: 8, lineHeight: 14,
    letterSpacing: -0.05,
  },
});

/* ─── SectionHeader ──────────────────────────────────────────────────────── */
function SectionHeader({ title, sub, onViewAll }: { title: string; sub?: string; onViewAll?: () => void }) {
  return (
    <View style={sh.row}>
      <View style={{ flex: 1 }}>
        <Text style={sh.title}>{title}</Text>
        {sub ? <Text style={sh.sub}>{sub}</Text> : null}
      </View>
      {onViewAll && (
        <Pressable onPress={onViewAll} style={({ pressed }) => [sh.btn, pressed && { opacity: 0.7 }]}>
          <Text style={sh.btnTxt}>View all</Text>
          <ChevronRight size={13} color={PRIMARY} strokeWidth={2.4} />
        </Pressable>
      )}
    </View>
  );
}

const sh = StyleSheet.create({
  row:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, gap: 12 },
  title:  { fontFamily: FontFamily.bold, fontSize: 17, color: INK_900, letterSpacing: -0.4 },
  sub:    { fontFamily: FontFamily.regular, fontSize: 11.5, color: INK_500, marginTop: 2, letterSpacing: 0 },
  btn:    { flexDirection: 'row', alignItems: 'center', gap: 2, paddingVertical: 4 },
  btnTxt: { fontFamily: FontFamily.semiBold, fontSize: 12.5, color: PRIMARY, letterSpacing: -0.05 },
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

      {/* ── Premium blue header band ──────────────────────────── */}
      <View style={s.headerBand}>
        <LinearGradient
          colors={[PRIMARY_DK, PRIMARY, '#3B82F6']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        {/* Subtle highlight glow top-left */}
        <View pointerEvents="none" style={s.headerGlow} />
        {/* Bottom shadow seam */}
        <View pointerEvents="none" style={s.headerSeam} />

        <View style={s.headerInner}>
          <View style={s.headerTopRow}>
            <Pressable style={({ pressed }) => [s.locationRow, pressed && { opacity: 0.85 }]}>
              <View style={s.locationPin}>
                <MapPin size={12} color="#fff" strokeWidth={2.4} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.deliverTo}>Deliver to</Text>
                <View style={s.cityRow}>
                  <Text style={s.city} numberOfLines={1}>Ahmedabad, Gujarat</Text>
                  <ChevronDown size={15} color="#fff" strokeWidth={2.2} />
                </View>
              </View>
            </Pressable>

            <Pressable
              style={({ pressed }) => [s.bellWrap, pressed && { opacity: 0.85 }]}
              onPress={() => router.push('/customer/notifications')}
              hitSlop={6}
            >
              <Bell size={17} color="#fff" strokeWidth={1.85} />
              <View style={s.bellDot} />
            </Pressable>
          </View>

          {/* Floating search */}
          <Pressable
            style={({ pressed }) => [s.searchBar, pressed && { opacity: 0.98 }]}
            onPress={() => router.push('/customer/search')}
          >
            <View style={s.searchIconBox}>
              <Search size={15} color={PRIMARY} strokeWidth={2.2} />
            </View>
            <Text style={s.searchHint}>Search materials, brands, vendors</Text>
            <View style={s.searchKbd}>
              <Text style={s.searchKbdTxt}>⌘ K</Text>
            </View>
          </Pressable>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero ── */}
        <HeroCarousel bannerWidth={bannerWidth} />

        {/* ── Shop by Category ── */}
        <View>
          <SectionHeader
            title="Shop by category"
            sub="Curated for builders & contractors"
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
            sub="Today's hand-picked offers"
            onViewAll={() => router.push('/category/cement' as never)}
          />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 12, paddingRight: 8 }}
          >
            {featured.map((p, i) => (
              <FeaturedProductCard key={`${p.slug}-${i}`} {...p} />
            ))}
          </ScrollView>
        </View>

        {/* ── Top Brands ── */}
        <View>
          <SectionHeader title="Trusted brands" sub="Direct from India's leading manufacturers" />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 10, paddingRight: 8 }}
          >
            {brands.map((b: any) => <BrandCard key={b.id} name={b.name} logoUrl={b.logo_url} />)}
          </ScrollView>
        </View>

        {/* ── Transport Banner ── */}
        <Pressable
          style={({ pressed }) => [s.transportBanner, pressed && { opacity: 0.97 }]}
          onPress={() => router.push('/customer/transport' as never)}
        >
          <Image
            source={{ uri: 'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&w=1000&q=85' }}
            style={[StyleSheet.absoluteFillObject, IMG_FILTER]}
            contentFit="cover"
            transition={250}
          />
          <LinearGradient
            colors={['rgba(7,17,32,0.88)', 'rgba(7,17,32,0.40)']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFillObject}
          />
          <View style={s.transportContent}>
            <View style={s.transportTag}>
              <Truck size={11} color={ACCENT} strokeWidth={2.4} />
              <Text style={s.transportTagTxt}>LOGISTICS</Text>
            </View>
            <Text style={s.transportTitle}>Move materials anywhere</Text>
            <Text style={s.transportSub}>
              Verified drivers · instant quotes · live tracking
            </Text>
          </View>
          <View style={s.transportArrow}>
            <ChevronRight size={16} color="#fff" strokeWidth={2.6} />
          </View>
        </Pressable>

        {/* ── Why C-Supply ── */}
        <View>
          <SectionHeader title="Why C-Supply" />
          <View style={s.whyRow}>
            {[
              { Icon: ShieldCheck, label: 'Verified vendors',  sub: '500+ KYC-vetted',  color: PRIMARY,   tint: PRIMARY_LT  },
              { Icon: Clock,       label: 'On-time delivery',  sub: 'Track every step', color: '#15803D', tint: '#F0FDF4' },
              { Icon: Tag,         label: 'Best market price', sub: 'Bulk discounts',   color: '#C2410C', tint: '#FFF7ED' },
            ].map(({ Icon, label, sub, color, tint }) => (
              <View key={label} style={s.whyCard}>
                <View style={[s.whyIconBox, { backgroundColor: tint }]}>
                  <Icon size={16} color={color} strokeWidth={1.9} />
                </View>
                <Text style={s.whyLabel}>{label}</Text>
                <Text style={s.whySub}>{sub}</Text>
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

  /* Premium blue header band */
  headerBand: {
    backgroundColor: PRIMARY_DK,
    paddingBottom: 32,
    position: 'relative' as const,
  },
  headerGlow: {
    position: 'absolute' as const,
    top: -80, left: -40,
    width: 280, height: 280, borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  headerSeam: {
    position: 'absolute' as const, left: 0, right: 0, bottom: 0,
    height: 1, backgroundColor: 'rgba(0,0,0,0.08)',
  },
  headerInner: {
    paddingHorizontal: 16,
    paddingTop: PT > 0 ? PT - 4 : 12,
    paddingBottom: 0,
  },
  headerTopRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    gap: 12, marginBottom: 12,
  },
  locationRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  locationPin: {
    width: 28, height: 28, borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.20)',
    alignItems: 'center', justifyContent: 'center',
    ...(IS_WEB ? { backdropFilter: 'blur(8px)' as any } : null),
  },
  deliverTo: {
    fontFamily: FontFamily.medium, fontSize: 10, letterSpacing: 0.8,
    color: 'rgba(255,255,255,0.74)', textTransform: 'uppercase' as const,
  },
  cityRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 1 },
  city: {
    fontFamily: FontFamily.bold, fontSize: 16.5, color: '#fff',
    letterSpacing: -0.4, lineHeight: 22, maxWidth: '90%',
  },

  bellWrap: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
    position: 'relative' as const,
    ...(IS_WEB ? { backdropFilter: 'blur(10px)' as any } : null),
  },
  bellDot: {
    position: 'absolute', top: 8, right: 8,
    width: 7, height: 7, borderRadius: 4,
    backgroundColor: '#F97316', borderWidth: 1.5, borderColor: PRIMARY_DK,
  },

  /* Floating premium search */
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    height: 52,
    marginBottom: -26,
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1, borderColor: BORDER,
    paddingLeft: 8, paddingRight: 12,
    ...Shadow3,
  },
  searchIconBox: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: PRIMARY_LT,
    alignItems: 'center', justifyContent: 'center',
  },
  searchHint: {
    flex: 1,
    fontFamily: FontFamily.medium, fontSize: 13, color: INK_400,
    letterSpacing: -0.05,
  },
  searchKbd: {
    paddingHorizontal: 8, paddingVertical: 3.5,
    borderRadius: 6, borderWidth: 1, borderColor: BORDER,
    backgroundColor: SURFACE_2,
  },
  searchKbdTxt: {
    fontFamily: FontFamily.semiBold, fontSize: 10.5,
    color: INK_500, letterSpacing: 0.4,
  },

  /* Body */
  scroll: { paddingHorizontal: 16, paddingTop: 42, paddingBottom: 24, gap: 28 },

  /* Category grid */
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },

  /* Transport banner */
  transportBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 18, overflow: 'hidden',
    minHeight: 116, padding: 18,
    ...Shadow2,
  },
  transportContent: { flex: 1, gap: 4 },
  transportTag: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 99, paddingHorizontal: 9, paddingVertical: 3,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
    marginBottom: 4,
    ...(IS_WEB ? { backdropFilter: 'blur(8px)' as any } : null),
  },
  transportTagTxt: { fontFamily: FontFamily.bold, fontSize: 9.5, color: ACCENT, letterSpacing: 0.7 },
  transportTitle: { fontFamily: FontFamily.bold, fontSize: 16.5, color: '#fff', letterSpacing: -0.3 },
  transportSub:   { fontFamily: FontFamily.medium, fontSize: 11.5, color: 'rgba(255,255,255,0.86)', lineHeight: 16, letterSpacing: 0.05 },
  transportArrow: {
    width: 34, height: 34, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center', justifyContent: 'center',
    ...(IS_WEB ? { backdropFilter: 'blur(8px)' as any } : null),
  },

  /* Why row */
  whyRow: { flexDirection: 'row', gap: 10 },
  whyCard: {
    flex: 1, backgroundColor: SURFACE,
    borderRadius: 14, borderWidth: 1, borderColor: BORDER,
    paddingVertical: 16, paddingHorizontal: 12,
    alignItems: 'flex-start', gap: 9,
    ...Shadow1,
  },
  whyIconBox: {
    width: 38, height: 38, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
  },
  whyLabel: {
    fontFamily: FontFamily.semiBold, fontSize: 12.5,
    color: INK_900, lineHeight: 16, letterSpacing: -0.1,
  },
  whySub: {
    fontFamily: FontFamily.regular, fontSize: 10.5,
    color: INK_500, letterSpacing: 0,
  },
});

/* Mark INK_300, INK_700 as used to satisfy unused-import linters in some builds */
void INK_300; void INK_700;
