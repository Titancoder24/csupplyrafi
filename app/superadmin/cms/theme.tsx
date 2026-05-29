import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, TextInput } from 'react-native';
import { Screen } from '@/components/ui/Screen';
import { Header } from '@/components/ui/Header';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useTheme } from '@/theme/ThemeProvider';
import { supabase } from '@/services/supabase';
import { defaultThemes, type ThemeSurface, type ThemeTokens } from '@/theme/tokens';

const SURFACES: ThemeSurface[] = ['customer', 'vendor', 'transporter', 'admin'];

export default function ThemeEditor() {
  const { tokens, surface, setSurface } = useTheme();
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<ThemeSurface>(surface);
  const [draft, setDraft] = useState<ThemeTokens>(defaultThemes[tab]);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    setDraft(defaultThemes[tab]);
    setSurface(tab);
  }, [tab, setSurface]);

  const updateColor = (k: keyof ThemeTokens['color'], v: string) =>
    setDraft((d) => ({ ...d, color: { ...d.color, [k]: v } }));

  const save = async () => {
    setSaving(true);
    setStatus(null);
    const { error } = await supabase
      .schema('cms')
      .from('theme_config')
      .upsert(
        {
          name: `${tab[0].toUpperCase()}${tab.slice(1)} Default`,
          surface: tab,
          is_active: true,
          tokens: draft,
        },
        { onConflict: 'name,surface' }
      );
    setSaving(false);
    setStatus(error ? error.message : 'Saved. New theme broadcast to all clients.');
  };

  return (
    <Screen>
      <Header title="Theme & Branding" />
      <View style={{ padding: 16, gap: 16 }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {SURFACES.map((s) => {
            const active = tab === s;
            return (
              <Pressable
                key={s}
                onPress={() => setTab(s)}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 999,
                  backgroundColor: active ? tokens.color.primary : tokens.color.muted,
                }}
              >
                <Text
                  style={{
                    color: active ? '#FFFFFF' : tokens.color.textPrimary,
                    fontSize: 13,
                    fontWeight: '700',
                    textTransform: 'capitalize',
                  }}
                >
                  {s}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Card>
          <Text style={{ fontSize: 14, fontWeight: '700', marginBottom: 8 }}>Live Preview</Text>
          <View
            style={{
              padding: 16,
              backgroundColor: draft.color.background,
              borderRadius: 12,
              borderColor: draft.color.border,
              borderWidth: 1,
              gap: 12,
            }}
          >
            <Text style={{ color: draft.color.textPrimary, fontSize: 18, fontWeight: '700' }}>Primary heading</Text>
            <Text style={{ color: draft.color.textSecondary, fontSize: 13 }}>Secondary copy looks like this.</Text>
            <View
              style={{
                paddingHorizontal: 16,
                paddingVertical: 12,
                borderRadius: 12,
                backgroundColor: draft.color.accent,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Primary CTA</Text>
            </View>
            <View
              style={{
                paddingHorizontal: 16,
                paddingVertical: 12,
                borderRadius: 12,
                borderWidth: 1.5,
                borderColor: draft.color.primary,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: draft.color.primary, fontWeight: '700' }}>Secondary CTA</Text>
            </View>
          </View>
        </Card>

        <Card>
          <Text style={{ fontSize: 14, fontWeight: '700', marginBottom: 8 }}>Color Tokens</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {Object.entries(draft.color).map(([k, v]) => (
                <View key={k} style={{ alignItems: 'center', gap: 4 }}>
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 8,
                      backgroundColor: v,
                      borderWidth: 1,
                      borderColor: tokens.color.border,
                    }}
                  />
                  <Text style={{ fontSize: 9, color: tokens.color.textMuted }}>{k}</Text>
                </View>
              ))}
            </View>
          </ScrollView>

          <View style={{ gap: 12, marginTop: 12 }}>
            {(['primary', 'accent', 'background', 'surface'] as const).map((k) => (
              <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 6,
                    backgroundColor: draft.color[k],
                    borderWidth: 1,
                    borderColor: tokens.color.border,
                  }}
                />
                <Text style={{ flex: 0.4, fontSize: 13, color: tokens.color.textSecondary, fontWeight: '600' }}>
                  {k}
                </Text>
                <TextInput
                  value={draft.color[k]}
                  onChangeText={(t) => updateColor(k, t)}
                  autoCapitalize="characters"
                  style={{
                    flex: 1,
                    borderWidth: 1,
                    borderColor: tokens.color.border,
                    borderRadius: 8,
                    paddingHorizontal: 10,
                    paddingVertical: 8,
                    fontSize: 13,
                    color: tokens.color.textPrimary,
                  }}
                />
              </View>
            ))}
          </View>
        </Card>

        {status ? (
          <Text style={{ color: tokens.color.success, fontSize: 13, fontWeight: '600' }}>{status}</Text>
        ) : null}
        <Button label={saving ? 'Saving…' : 'Save & Activate'} onPress={save} loading={saving} />
        <Text style={{ fontSize: 12, color: tokens.color.textMuted, textAlign: 'center' }}>
          Changes broadcast via Realtime. All connected clients update without restart.
        </Text>
      </View>
    </Screen>
  );
}
