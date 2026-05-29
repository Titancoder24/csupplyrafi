import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Header } from '@/components/ui/Header';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useTheme } from '@/theme/ThemeProvider';
import { supabase } from '@/services/supabase';

export default function CityPage() {
  const { tokens } = useTheme();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const [city, setCity] = useState<{ name: string; state: string } | null>(null);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      const { data } = await supabase
        .schema('geography')
        .from('cities')
        .select('name, state')
        .eq('slug', slug)
        .maybeSingle();
      if (data) setCity(data as never);
    })();
  }, [slug]);

  return (
    <Screen>
      <Stack.Screen options={{ title: city ? `${city.name} | C-Supply` : 'City | C-Supply' }} />
      <Header title={city?.name ?? 'City'} />
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16, maxWidth: 800, alignSelf: 'center' }}>
        <Text style={{ fontSize: 28, fontWeight: '800', color: tokens.color.textPrimary }}>
          Construction materials in {city?.name ?? '—'}
        </Text>
        <Text style={{ fontSize: 14, lineHeight: 22, color: tokens.color.textSecondary }}>
          C-Supply delivers cement, steel, sand, aggregate, bricks, paints and TMT bars across {city?.name},{' '}
          {city?.state}. Same-day for instant orders, scheduled slots for site planning. Verified vendors,
          GST invoicing, live tracking from pickup to drop.
        </Text>
        <Card>
          <Text style={{ fontSize: 16, fontWeight: '700', color: tokens.color.textPrimary }}>
            Top materials in {city?.name}
          </Text>
          {['cement', 'steel', 'bricks', 'sand', 'aggregate'].map((s) => (
            <Pressable key={s} onPress={() => router.push(`/category/${s}` as never)}>
              <Text style={{ paddingVertical: 8, fontSize: 14, color: tokens.color.primary, fontWeight: '600' }}>
                {s.charAt(0).toUpperCase() + s.slice(1)} in {city?.name}
              </Text>
            </Pressable>
          ))}
        </Card>
        <Button label="Place an order" onPress={() => router.push('/auth/login')} />
      </ScrollView>
    </Screen>
  );
}
