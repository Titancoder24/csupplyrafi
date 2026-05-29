import React, { useEffect, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Image as ImageIcon } from 'lucide-react-native';
import { Screen } from '@/components/ui/Screen';
import { Header } from '@/components/ui/Header';
import { Card } from '@/components/ui/Card';
import { useTheme } from '@/theme/ThemeProvider';
import { supabase } from '@/services/supabase';

type RouteRow = {
  id: string;
  route_path: string;
  surface: string;
  display_name: string;
  description: string;
  cms_editable_blocks: string[];
};

export default function CmsRoutes() {
  const { tokens } = useTheme();
  const [rows, setRows] = useState<RouteRow[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .schema('cms')
        .from('routes')
        .select('id, route_path, surface, display_name, description, cms_editable_blocks');
      setRows((data as RouteRow[]) ?? []);
    })();
  }, []);

  return (
    <Screen>
      <Header title="Routes & Pages" />
      <View style={{ padding: 16, gap: 12 }}>
        <Text style={{ fontSize: 13, color: tokens.color.textMuted }}>
          Click any route to edit copy, swap images, or change icons. Updates publish to Vercel and propagate
          to all native apps over the air.
        </Text>
        {rows.map((r) => (
          <Pressable key={r.id}>
            <Card style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 8,
                  backgroundColor: tokens.color.muted,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ImageIcon size={20} color="#0F172A" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: tokens.color.textPrimary }}>
                  {r.display_name}
                </Text>
                <Text style={{ fontSize: 12, color: tokens.color.textMuted }}>{r.route_path}</Text>
                <Text style={{ fontSize: 12, color: tokens.color.textSecondary, marginTop: 4 }}>
                  Editable blocks: {(r.cms_editable_blocks ?? []).length}
                </Text>
              </View>
            </Card>
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}
