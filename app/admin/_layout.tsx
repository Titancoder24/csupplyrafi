import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { useTheme } from '@/theme/ThemeProvider';

export default function AdminLayout() {
  const { setSurface } = useTheme();
  useEffect(() => {
    setSurface('admin');
  }, [setSurface]);
  return <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }} />;
}
