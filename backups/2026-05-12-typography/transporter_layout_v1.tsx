import React, { useEffect } from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { useTheme } from '@/theme/ThemeProvider';
import { useKycGate } from '@/hooks/useKycGate';
import { ChatBanner } from '@/components/ui/ChatBanner';

export default function TransporterLayout() {
  const { setSurface } = useTheme();
  useEffect(() => {
    setSurface('transporter');
  }, [setSurface]);
  useKycGate('transporter');
  return (
    <View style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }} />
      <ChatBanner role="transporter" />
    </View>
  );
}
