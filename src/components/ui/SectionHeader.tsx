import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';

export function SectionHeader({
  title,
  actionLabel,
  onPressAction,
}: {
  title: string;
  actionLabel?: string;
  onPressAction?: () => void;
}) {
  const { tokens } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
      }}
    >
      <Text style={{ fontSize: 16, fontWeight: '700', color: tokens.color.textPrimary }}>{title}</Text>
      {actionLabel ? (
        <Pressable onPress={onPressAction} hitSlop={8}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: tokens.color.accent }}>
            {actionLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
