import React, { useEffect, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Screen } from '@/components/ui/Screen';
import { Header } from '@/components/ui/Header';
import { Card } from '@/components/ui/Card';
import { useTheme } from '@/theme/ThemeProvider';
import { supabase } from '@/services/supabase';

type Flag = { key: string; enabled: boolean; description: string | null };

export default function Flags() {
  const { tokens } = useTheme();
  const [flags, setFlags] = useState<Flag[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .schema('cms')
        .from('feature_flags')
        .select('key, enabled, description');
      setFlags((data as Flag[]) ?? []);
    })();
  }, []);

  const toggle = async (key: string, current: boolean) => {
    setFlags((f) => f.map((x) => (x.key === key ? { ...x, enabled: !current } : x)));
    await supabase.schema('cms').from('feature_flags').update({ enabled: !current }).eq('key', key);
  };

  return (
    <Screen>
      <Header title="Feature Flags" />
      <View style={{ padding: 16, gap: 12 }}>
        {flags.map((f) => (
          <Card key={f.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: tokens.color.textPrimary }}>{f.key}</Text>
              <Text style={{ fontSize: 12, color: tokens.color.textMuted }}>{f.description}</Text>
            </View>
            <Pressable
              onPress={() => toggle(f.key, f.enabled)}
              style={{
                width: 44,
                height: 26,
                borderRadius: 13,
                backgroundColor: f.enabled ? tokens.color.primary : '#CBD5E1',
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
                  alignSelf: f.enabled ? 'flex-end' : 'flex-start',
                }}
              />
            </Pressable>
          </Card>
        ))}
      </View>
    </Screen>
  );
}
