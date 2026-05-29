import React from 'react';
import { View, Text } from 'react-native';
import { Package2 } from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeProvider';

/**
 * Placeholder product visual: gradient tile with the brand initial.
 * Production would use expo-image with the actual product photo.
 */
export function ProductImage({
  brand,
  size = 96,
  variant = 'tile',
}: {
  brand?: string | null;
  size?: number;
  variant?: 'tile' | 'hero' | 'thumb';
}) {
  const { tokens } = useTheme();
  const initial = (brand ?? 'C').slice(0, 1).toUpperCase();
  const radius = variant === 'hero' ? size / 2 : size === 64 ? 8 : 12;
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        backgroundColor: variant === 'hero' ? tokens.color.muted : '#FFF7ED',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        borderWidth: variant === 'tile' ? 1 : 0,
        borderColor: tokens.color.border,
      }}
    >
      <Package2
        size={size * 0.5}
        color="#0F172A"
        strokeWidth={1.5}
      />
      {brand ? (
        <Text
          style={{
            position: 'absolute',
            bottom: 4,
            right: 6,
            fontSize: 10,
            fontWeight: '700',
            color: tokens.color.textSecondary,
          }}
        >
          {initial}
        </Text>
      ) : null}
    </View>
  );
}
