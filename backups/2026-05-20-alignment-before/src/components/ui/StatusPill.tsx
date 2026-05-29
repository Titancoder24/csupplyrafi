import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';

type Variant = 'success' | 'warning' | 'danger' | 'info' | 'muted';

export function StatusPill({ label, variant = 'success' }: { label: string; variant?: Variant }) {
  const { tokens } = useTheme();
  const palette = {
    success: { bg: tokens.color.successBg, fg: tokens.color.success },
    warning: { bg: tokens.color.warningBg, fg: tokens.color.warning },
    danger: { bg: tokens.color.dangerBg, fg: tokens.color.danger },
    info: { bg: tokens.color.infoBg, fg: tokens.color.info },
    muted: { bg: tokens.color.muted, fg: tokens.color.textMuted },
  };
  const c = palette[variant];
  return (
    <View
      style={{
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 999,
        backgroundColor: c.bg,
        alignSelf: 'flex-start',
      }}
    >
      <Text style={{ color: c.fg, fontSize: 12, fontWeight: '600' }}>{label}</Text>
    </View>
  );
}
