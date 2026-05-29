import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Check } from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeProvider';

type Props = {
  title: string;
  subtitle?: string;
  selected: boolean;
  onPress: () => void;
  leading?: React.ReactNode;
};

export function RadioCard({ title, subtitle, selected, onPress, leading }: Props) {
  const { tokens } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: selected ? tokens.color.successBg : tokens.color.surface,
        borderColor: selected ? tokens.color.primary : tokens.color.border,
        borderWidth: selected ? 1.5 : 1,
        borderRadius: tokens.radius.md,
        paddingVertical: 14,
        paddingHorizontal: 16,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      {leading ? <View>{leading}</View> : null}
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontSize: 15, fontWeight: '600', color: tokens.color.textPrimary }}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={{ fontSize: 13, color: tokens.color.textSecondary }}>{subtitle}</Text>
        ) : null}
      </View>
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: 11,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: selected ? 0 : 1.5,
          borderColor: tokens.color.border,
          backgroundColor: selected ? tokens.color.primary : 'transparent',
        }}
      >
        {selected ? <Check size={14} color="#FFFFFF" /> : null}
      </View>
    </Pressable>
  );
}
