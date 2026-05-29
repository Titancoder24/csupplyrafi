import React from 'react';
import { View, Text } from 'react-native';
import {
  Package2,
  Layers,
  Blocks,
  Mountain,
  Hammer,
  Paintbrush,
  Drill,
  Plug,
  Anvil,
  PaintBucket,
  Box,
} from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeProvider';

export const categoryIconFor = (slug: string) => {
  switch (slug) {
    case 'cement': return Package2;
    case 'steel': return Anvil;
    case 'bricks': return Blocks;
    case 'sand': return Mountain;
    case 'aggregate': return Layers;
    case 'paints': return PaintBucket;
    case 'tmt-bars': return Hammer;
    case 'tiles': return Box;
    case 'plumbing': return Drill;
    case 'electrical': return Plug;
    default: return Box;
  }
};

export function CategoryIcon({ slug, size = 32, color }: { slug: string; size?: number; color?: string }) {
  const { tokens } = useTheme();
  const Icon = categoryIconFor(slug);
  return <Icon size={size} color="#0F172A" strokeWidth={1.5} />;
}

export function CategoryTile({
  slug,
  label,
  onPress,
}: {
  slug: string;
  label: string;
  onPress?: () => void;
}) {
  const { tokens } = useTheme();
  return (
    <View
      style={{
        backgroundColor: tokens.color.surface,
        borderColor: tokens.color.border,
        borderWidth: 1,
        borderRadius: tokens.radius.md,
        padding: 12,
        alignItems: 'center',
        gap: 8,
        minHeight: 96,
        justifyContent: 'center',
      }}
    >
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: 14,
          backgroundColor: tokens.color.muted,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <CategoryIcon slug={slug} size={28} />
      </View>
      <Text
        numberOfLines={1}
        style={{ fontSize: 12, fontWeight: '600', color: tokens.color.textPrimary }}
      >
        {label}
      </Text>
    </View>
  );
}
