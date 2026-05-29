import React from 'react';
import { View, Pressable, Text } from 'react-native';
import { Minus, Plus } from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeProvider';

type Props = {
  value: number;
  min?: number;
  max?: number;
  onChange: (next: number) => void;
  size?: 'sm' | 'md';
};

export function QuantityStepper({ value, min = 0, max = 9999, onChange, size = 'md' }: Props) {
  const { tokens } = useTheme();
  const dim = size === 'sm' ? 28 : 32;
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: tokens.color.border,
        borderRadius: tokens.radius.sm,
        backgroundColor: tokens.color.surface,
        overflow: 'hidden',
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Decrease quantity"
        onPress={() => onChange(Math.max(min, value - 1))}
        style={({ pressed }) => ({
          width: dim,
          height: dim,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: pressed ? 0.5 : 1,
          backgroundColor: tokens.color.surface,
        })}
      >
        <Minus size={16} color="#0F172A" />
      </Pressable>
      <View style={{ paddingHorizontal: 12, minWidth: 36, alignItems: 'center' }}>
        <Text style={{ fontSize: 15, fontWeight: '600', color: tokens.color.textPrimary }}>
          {value}
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Increase quantity"
        onPress={() => onChange(Math.min(max, value + 1))}
        style={({ pressed }) => ({
          width: dim,
          height: dim,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: pressed ? 0.85 : 1,
          backgroundColor: tokens.color.accent,
        })}
      >
        <Plus size={16} color="#FFFFFF" />
      </Pressable>
    </View>
  );
}
