import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { Stack } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Header } from '@/components/ui/Header';
import { useTheme } from '@/theme/ThemeProvider';

export default function Terms() {
  const { tokens } = useTheme();
  return (
    <Screen>
      <Stack.Screen options={{ title: 'Terms of Service' }} />
      <Header title="Terms of Service" />
      <ScrollView contentContainerStyle={{ padding: 20, gap: 12, maxWidth: 720, alignSelf: 'center' }}>
        <Text style={{ fontSize: 24, fontWeight: '800', color: tokens.color.textPrimary }}>Terms of Service</Text>
        <Text style={{ fontSize: 14, lineHeight: 22, color: tokens.color.textSecondary }}>
          By using C-Supply, you agree to deal in good faith with vendors, transporters, and other users.
          Vendors agree to fulfil orders accepted in their availability windows. Transporters agree to follow
          city-specific vehicle time rules. All payments are processed through licensed Indian gateways.
          Disputes are resolved by C-Supply support based on photo proof, OTP confirmation, and live
          tracking logs.
        </Text>
      </ScrollView>
    </Screen>
  );
}
