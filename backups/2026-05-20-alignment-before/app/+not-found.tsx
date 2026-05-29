import React from 'react';
import { View, Text } from 'react-native';
import { Link, Stack } from 'expo-router';
import { useTheme } from '@/theme/ThemeProvider';

export default function NotFound() {
  const { tokens } = useTheme();
  return (
    <>
      <Stack.Screen options={{ title: 'Not found' }} />
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          backgroundColor: tokens.color.background,
          gap: 12,
        }}
      >
        <Text style={{ fontSize: 28, fontWeight: '800', color: tokens.color.textPrimary }}>404</Text>
        <Text style={{ fontSize: 15, color: tokens.color.textSecondary, textAlign: 'center' }}>
          The page you are looking for doesn&apos;t exist.
        </Text>
        <Link href="/" style={{ color: tokens.color.accent, fontWeight: '700', marginTop: 12 }}>
          Go to Home
        </Link>
      </View>
    </>
  );
}
