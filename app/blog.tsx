import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { Stack } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Header } from '@/components/ui/Header';
import { Card } from '@/components/ui/Card';
import { useTheme } from '@/theme/ThemeProvider';

const POSTS = [
  {
    title: 'Cement prices in Hyderabad: October 2026',
    excerpt: 'Latest OPC 53 prices, expected delivery times, and upcoming brand offers in Telangana.',
    date: '2026-04-22',
  },
  {
    title: 'How much steel does a 1000 sq ft house need?',
    excerpt: 'A breakdown of TMT bar consumption per square foot for residential builds.',
    date: '2026-04-12',
  },
  {
    title: 'M-Sand vs River sand: which is right for your project?',
    excerpt: 'Cost, availability, and how to evaluate sand quality before pouring concrete.',
    date: '2026-03-28',
  },
];

export default function Blog() {
  const { tokens } = useTheme();
  return (
    <Screen>
      <Stack.Screen options={{ title: 'C-Supply Blog' }} />
      <Header title="Blog" />
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16, maxWidth: 800, alignSelf: 'center' }}>
        <Text style={{ fontSize: 28, fontWeight: '800', color: tokens.color.textPrimary }}>
          Insights for builders
        </Text>
        <Text style={{ fontSize: 14, color: tokens.color.textSecondary }}>
          Market pricing, planning guides, and stories from the field.
        </Text>
        {POSTS.map((p) => (
          <Card key={p.title} style={{ gap: 8 }}>
            <Text style={{ fontSize: 12, color: tokens.color.textMuted }}>{p.date}</Text>
            <Text style={{ fontSize: 18, fontWeight: '700', color: tokens.color.textPrimary }}>{p.title}</Text>
            <Text style={{ fontSize: 14, lineHeight: 20, color: tokens.color.textSecondary }}>
              {p.excerpt}
            </Text>
          </Card>
        ))}
      </ScrollView>
    </Screen>
  );
}
