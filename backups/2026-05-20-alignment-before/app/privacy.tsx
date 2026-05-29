import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { Stack } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Header } from '@/components/ui/Header';
import { useTheme } from '@/theme/ThemeProvider';

export default function Privacy() {
  const { tokens } = useTheme();
  return (
    <Screen>
      <Stack.Screen options={{ title: 'Privacy Policy' }} />
      <Header title="Privacy Policy" />
      <ScrollView contentContainerStyle={{ padding: 20, gap: 12, maxWidth: 720, alignSelf: 'center' }}>
        <Text style={{ fontSize: 24, fontWeight: '800', color: tokens.color.textPrimary }}>Privacy Policy</Text>
        <Text style={{ fontSize: 14, lineHeight: 22, color: tokens.color.textSecondary }}>
          C-Supply respects your privacy. We collect only what is necessary to deliver materials, verify
          identity, and process payments. We never sell personal data. Live location is shared only during an
          active delivery and stops the moment your delivery OTP is verified. Documents (Aadhaar, PAN, RC,
          Insurance) are stored encrypted at rest. You can request deletion of your data anytime by writing
          to support@csupply.in.
        </Text>
      </ScrollView>
    </Screen>
  );
}
