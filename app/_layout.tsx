import 'react-native-gesture-handler';
import '../global.css';
import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { AuthProvider } from '@/services/auth/AuthProvider';
import { View, ActivityIndicator, Platform } from 'react-native';
import { ToastContainer } from '@/components/ui/ToastContainer';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from '@expo-google-fonts/poppins';
import {
  Roboto_400Regular,
  Roboto_500Medium,
  Roboto_700Bold,
} from '@expo-google-fonts/roboto';
import { supabase } from '@/services/supabase';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60_000,   // 5 min — avoid refetch on every tab switch
      gcTime:    10 * 60_000,   // keep cache 10 min
      refetchOnWindowFocus: false,
    },
  },
});

// Wake Supabase immediately so first real query hits a warm connection
function useSupabaseWarmup() {
  useEffect(() => {
    supabase.from('categories').select('id').limit(1).then(() => {});
  }, []);
}

// Preload Leaflet CSS+JS on web so checkout map is instant
function useLeafletPreload() {
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    if ((window as any).__leafletPreloaded) return;
    (window as any).__leafletPreloaded = true;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    document.head.appendChild(script);
  }, []);
}

export default function RootLayout() {
  useSupabaseWarmup();
  useLeafletPreload();
  const [fontsLoaded] = useFonts({
    // Inter — primary product font (dashboards, popups, tables, notifications)
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    // Poppins — retained for onboarding / customer booking flow (green theme stays)
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
    // Roboto — chat
    Roboto_400Regular,
    Roboto_500Medium,
    Roboto_700Bold,
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0F4C81' }}>
        <ActivityIndicator color="#F97316" size="large" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AuthProvider>
            <QueryClientProvider client={queryClient}>
              <StatusBar style="auto" />
              <Stack
                screenOptions={{
                  headerShown: false,
                  animation: 'slide_from_right',
                  contentStyle: { backgroundColor: 'transparent' },
                }}
              />
              <ToastContainer />
            </QueryClientProvider>
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
