import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { Bot } from 'lucide-react-native';
import { Screen } from '@/components/ui/Screen';
import { Header } from '@/components/ui/Header';
import { Card } from '@/components/ui/Card';
import { useTheme } from '@/theme/ThemeProvider';
import { supabase } from '@/services/supabase';

type Crawler = {
  id: string;
  user_agent: string;
  display_name: string;
  category: string;
  allowed: boolean;
};

export default function CrawlerPermissions() {
  const { tokens } = useTheme();
  const [crawlers, setCrawlers] = useState<Crawler[]>([]);
  const [filter, setFilter] = useState<'all' | 'ai_training' | 'ai_assistant' | 'search'>('all');

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .schema('seo')
        .from('crawler_permissions')
        .select('id, user_agent, display_name, category, allowed')
        .order('display_name');
      setCrawlers((data as Crawler[]) ?? []);
    })();
  }, []);

  const filtered = filter === 'all' ? crawlers : crawlers.filter((c) => c.category === filter);

  const toggle = async (id: string, current: boolean) => {
    setCrawlers((c) => c.map((x) => (x.id === id ? { ...x, allowed: !current } : x)));
    await supabase.schema('seo').from('crawler_permissions').update({ allowed: !current }).eq('id', id);
  };

  const TABS: Array<{ k: typeof filter; l: string }> = [
    { k: 'all', l: 'All' },
    { k: 'ai_training', l: 'AI Training' },
    { k: 'ai_assistant', l: 'AI Assistants' },
    { k: 'search', l: 'Search Engines' },
  ];

  return (
    <Screen>
      <Header title="AI Crawler Permissions" />
      <View style={{ padding: 16, gap: 12 }}>
        <Text style={{ fontSize: 13, color: tokens.color.textMuted }}>
          Control which AI assistants and search engines can index C-Supply content. Changes apply to /robots.txt and /llms.txt
          immediately.
        </Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {TABS.map((t) => {
              const active = filter === t.k;
              return (
                <Pressable
                  key={t.k}
                  onPress={() => setFilter(t.k)}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 999,
                    backgroundColor: active ? tokens.color.primary : tokens.color.muted,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '700',
                      color: active ? '#FFFFFF' : tokens.color.textPrimary,
                    }}
                  >
                    {t.l}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>

        {filtered.map((c) => (
          <Card key={c.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: tokens.color.muted,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Bot size={18} color="#0F172A" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: tokens.color.textPrimary }}>
                {c.display_name}
              </Text>
              <Text style={{ fontSize: 11, color: tokens.color.textMuted }}>
                {c.user_agent} · {c.category.replace('_', ' ')}
              </Text>
            </View>
            <Pressable
              onPress={() => toggle(c.id, c.allowed)}
              style={{
                width: 44,
                height: 26,
                borderRadius: 13,
                backgroundColor: c.allowed ? tokens.color.primary : '#CBD5E1',
                justifyContent: 'center',
                paddingHorizontal: 2,
              }}
            >
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  backgroundColor: '#FFFFFF',
                  alignSelf: c.allowed ? 'flex-end' : 'flex-start',
                }}
              />
            </Pressable>
          </Card>
        ))}
      </View>
    </Screen>
  );
}
