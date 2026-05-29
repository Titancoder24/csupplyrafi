import React from 'react';
import { View, Image, Text } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';

type Props = { size?: number; tone?: 'default' | 'inverse' };

/**
 * Brand lockup — uses the canonical Logo_Ui.png from assets.
 * Replaces the previous SVG hex monogram with the new uploaded logo so
 * every login/verify/index screen picks it up automatically.
 */
export function BrandLockup({ size = 88, tone: _tone = 'default' }: Props) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <Image
        source={require('../../../assets/Logo_Ui.png')}
        style={{ width: '100%', height: '100%' }}
        resizeMode="contain"
      />
    </View>
  );
}

/**
 * BrandWordmark — kept as text for inline use (e.g. footers, legal copy).
 * Tone "inverse" gives white text on dark surfaces.
 */
export function BrandWordmark({ tone = 'default', size = 28 }: Props) {
  const { tokens } = useTheme();
  const fg = tone === 'inverse' ? '#FFFFFF' : tokens.color.primary;
  return (
    <Text style={{ fontSize: size, fontWeight: '800', letterSpacing: -0.5, color: fg }}>
      C-<Text style={{ color: tokens.color.accent }}>Supply</Text>
    </Text>
  );
}
