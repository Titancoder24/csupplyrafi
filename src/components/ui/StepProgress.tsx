import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';

export function StepProgress({ step, total }: { step: number; total: number }) {
  const { tokens } = useTheme();
  const pct = Math.min(100, Math.max(0, (step / total) * 100));
  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, gap: 6 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ color: tokens.color.textSecondary, fontSize: 12, fontWeight: '500' }}>
          Step {step} of {total}
        </Text>
        <Text style={{ color: tokens.color.textMuted, fontSize: 12 }}>{Math.round(pct)}%</Text>
      </View>
      <View
        style={{
          height: 4,
          borderRadius: 2,
          backgroundColor: tokens.color.muted,
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            width: `${pct}%`,
            height: '100%',
            backgroundColor: tokens.color.primary,
          }}
        />
      </View>
    </View>
  );
}
