import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { Home, ClipboardList, IndianRupee, User } from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useKycGate } from '@/hooks/useKycGate';
import { ChatBanner } from '@/components/ui/ChatBanner';
import { FontFamily } from '@/constants/theme';

const HEADER  = '#1A5C30';
const MUTED   = '#94A3B8';
const SURFACE = '#FFFFFF';
const BORDER  = '#E2E8F0';

export default function TransporterLayout() {
  const { setSurface } = useTheme();
  useEffect(() => {
    setSurface('transporter');
  }, [setSurface]);
  useKycGate('transporter');

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: HEADER,
          tabBarInactiveTintColor: MUTED,
          tabBarStyle: styles.tabBar,
          tabBarLabelStyle: styles.tabLabel,
          tabBarItemStyle: styles.tabItem,
        }}
      >
        <Tabs.Screen
          name="dashboard"
          options={{
            title: 'Home',
            tabBarIcon: ({ color, focused }) => (
              <Home size={20} color="#0F172A" strokeWidth={focused ? 2.4 : 1.75} />
            ),
          }}
        />
        <Tabs.Screen
          name="trips"
          options={{
            title: 'Trips',
            tabBarIcon: ({ color, focused }) => (
              <ClipboardList size={20} color="#0F172A" strokeWidth={focused ? 2.4 : 1.75} />
            ),
          }}
        />
        <Tabs.Screen
          name="earnings"
          options={{
            title: 'Earnings',
            tabBarIcon: ({ color, focused }) => (
              <IndianRupee size={20} color="#0F172A" strokeWidth={focused ? 2.4 : 1.75} />
            ),
          }}
        />
        <Tabs.Screen
          name="account"
          options={{
            title: 'Account',
            tabBarIcon: ({ color, focused }) => (
              <User size={20} color="#0F172A" strokeWidth={focused ? 2.4 : 1.75} />
            ),
          }}
        />

        {/* Hidden routes — keep existing screens accessible via direct navigation */}
        <Tabs.Screen name="notifications" options={{ href: null }} />
        <Tabs.Screen name="pending"       options={{ href: null }} />
        <Tabs.Screen name="rejected"      options={{ href: null }} />
        <Tabs.Screen name="welcome"       options={{ href: null, tabBarStyle: { display: 'none' } }} />
        <Tabs.Screen name="onboarding"          options={{ href: null, tabBarStyle: { display: 'none' } }} />
        <Tabs.Screen name="onboarding/[step]"   options={{ href: null, tabBarStyle: { display: 'none' } }} />
        <Tabs.Screen name="chat"          options={{ href: null }} />
        <Tabs.Screen name="support/index" options={{ href: null }} />
        <Tabs.Screen name="support/new"   options={{ href: null }} />
        <Tabs.Screen name="support/[id]"  options={{ href: null }} />
      </Tabs>
      <ChatBanner role="transporter" />
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: SURFACE,
    borderTopColor: BORDER,
    borderTopWidth: 1,
    height: Platform.OS === 'ios' ? 86 : 72,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 22 : 6,
  },
  tabLabel: {
    fontFamily: FontFamily.medium,
    fontSize: 10.5,
    marginTop: 2,
    letterSpacing: 0.05,
  },
  tabItem: { paddingTop: 2 },
});
