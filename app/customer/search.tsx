import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, Pressable, StyleSheet, TextInput, Platform, ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { ArrowLeft, Search, Package, TrendingUp, Clock } from 'lucide-react-native';
import { supabase } from '@/services/supabase';
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
const PT      = Platform.OS === 'ios' ? 56 : Platform.OS === 'web' ? 0 : 36;

const IMG_SIZE = 52;

const TRENDING = ['OPC Cement', 'TMT Steel Bar', 'River Sand', 'Red Brick', 'Granite Aggregate'];

export default function SearchScreen() {
  const router  = useRouter();
  const [query,   setQuery]   = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const t = setTimeout(async () => {
      if (!query.trim()) {
        setResults([]);
        setLoading(false);
        return;
      }
      try {
        const { data, error } = await supabase
          .from('products')
          .select('id, name, slug, brand, base_price, unit')
          .ilike('name', `%${query}%`)
          .eq('status', 'active')
          .limit(20);
        if (error) throw error;
        if (active) {
          setResults(data ?? []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (active) setLoading(false);
      }
    }, 320);
    return () => { active = false; clearTimeout(t); };
  }, [query]);

  return (
    <View style={s.root}>
      {/* Header with search input */}
      <View style={[s.header, { paddingTop: PT > 0 ? PT : 14 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={s.backBtn}>
          <ArrowLeft size={20} color="#0F172A" strokeWidth={2} />
        </Pressable>
        <View style={s.searchBox}>
          <Search size={15} color="#0F172A" strokeWidth={2} />
          <TextInput
            style={s.searchInput}
            placeholder="Search materials, brands…"
            placeholderTextColor={MUTED}
            value={query}
            onChangeText={setQuery}
            autoFocus
            returnKeyType="search"
          />
          {loading && <ActivityIndicator size="small" color={PRIMARY} />}
        </View>
      </View>

      {!query.trim() ? (
        /* Trending suggestions */
        <View style={s.trendWrap}>
          <View style={s.trendHeader}>
            <TrendingUp size={15} color="#0F172A" strokeWidth={2} />
            <Text style={s.trendTitle}>Trending Searches</Text>
          </View>
          <View style={s.chips}>
            {TRENDING.map(t => (
              <Pressable key={t} style={s.chip} onPress={() => setQuery(t)}>
                <Clock size={12} color="#0F172A" strokeWidth={2} />
                <Text style={s.chipTxt}>{t}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={it => it.id}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            !loading ? (
              <View style={s.empty}>
                <View style={s.emptyIconBox}>
                  <Package size={36} color="#0F172A" strokeWidth={1.4} />
                </View>
                <Text style={s.emptyTitle}>No results found</Text>
                <Text style={s.emptySub}>Try a different keyword or browse categories.</Text>
              </View>
            ) : null
          }
          renderItem={({ item }) => (
            <Pressable
              style={s.card}
              onPress={() => router.push({ pathname: '/product/[id]', params: { id: item.id } } as never)}
            >
              <View style={s.imgWrap}>
                <Image
                  source={{ uri: getProductImage(item.name, { size: 200 }) }}
                  style={{ width: IMG_SIZE, height: IMG_SIZE }}
                  contentFit="cover"
                  transition={150}
                />
              </View>
              <View style={s.info}>
                <Text style={s.name} numberOfLines={2}>{item.name}</Text>
                {item.brand && <Text style={s.brand}>{item.brand}</Text>}
              </View>
              <View style={s.priceCol}>
                <Text style={s.price}>{formatINR(item.base_price)}</Text>
                <Text style={s.unit}>per {item.unit}</Text>
              </View>
            </Pressable>
          )}
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
  backBtn:    { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  searchBox: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: BG, borderRadius: 10, borderWidth: 1, borderColor: BORDER,
    paddingHorizontal: 12, height: 44,
  },
  searchInput: { flex: 1, fontSize: 14, fontFamily: FontFamily.regular, color: TEXT },

  trendWrap: { padding: 16, gap: 14 },
  trendHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  trendTitle: { fontFamily: FontFamily.semiBold, fontSize: 13, color: TEXT },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: SURFACE, borderRadius: 20, borderWidth: 1, borderColor: BORDER,
    paddingHorizontal: 12, paddingVertical: 8,
  },
  chipTxt: { fontFamily: FontFamily.regular, fontSize: 13, color: TEXTSUB },

  list: { padding: 16, gap: 10, paddingBottom: 32 },

  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: SURFACE, borderRadius: 14, borderWidth: 1, borderColor: BORDER, padding: 12,
    shadowColor: TEXT, shadowOpacity: 0.04, shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 }, elevation: 1,
  },
  imgWrap: { width: IMG_SIZE, height: IMG_SIZE, borderRadius: 10, overflow: 'hidden', backgroundColor: '#F1F5F9' },
  info:    { flex: 1, gap: 3 },
  name:    { fontFamily: FontFamily.semiBold, fontSize: 13.5, color: TEXT, lineHeight: 19 },
  brand:   { fontFamily: FontFamily.regular, fontSize: 12, color: MUTED },
  priceCol:{ alignItems: 'flex-end', gap: 2 },
  price:   { fontFamily: FontFamily.bold, fontSize: 14, color: PRIMARY },
  unit:    { fontFamily: FontFamily.regular, fontSize: 11, color: MUTED },

  empty:       { alignItems: 'center', paddingTop: 56, gap: 12 },
  emptyIconBox:{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  emptyTitle:  { fontFamily: FontFamily.bold, fontSize: 16, color: TEXT },
  emptySub:    { fontFamily: FontFamily.regular, fontSize: 13, color: MUTED, textAlign: 'center' },
});
