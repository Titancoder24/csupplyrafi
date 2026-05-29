import React from 'react';
import { View, Pressable, Text } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';

type Option<T extends string> = { label: string; value: T };

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Option<T>[];
  value: T;
  onChange: (v: T) => void;
}) {
  const { tokens } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: tokens.color.muted,
        borderRadius: 10,
        padding: 4,
      }}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={{
              flex: 1,
              alignItems: 'center',
              paddingVertical: 10,
              borderRadius: 8,
              backgroundColor: active ? tokens.color.surface : 'transparent',
            }}
          >
            <Text
              style={{
                fontSize: 14,
                fontWeight: active ? '700' : '500',
                color: active ? tokens.color.primary : tokens.color.textMuted,
              }}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
