import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { Stack } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Header } from '@/components/ui/Header';
import { useTheme } from '@/theme/ThemeProvider';

export default function About() {
  const { tokens } = useTheme();
  return (
    <Screen>
      <Stack.Screen options={{ title: 'About C-Supply' }} />
      <Header title="About" />
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16, maxWidth: 720, alignSelf: 'center' }}>
        <Text style={{ fontSize: 28, fontWeight: '800', color: tokens.color.textPrimary }}>
          C-Supply: Construction materials, delivered.
        </Text>
        <Text style={{ fontSize: 15, lineHeight: 22, color: tokens.color.textSecondary }}>
          C-Supply is India&apos;s vertical marketplace for construction materials. We connect builders with
          verified vendors and dependable transporters, end-to-end from order to delivery. Every supplier is
          GST and KYC verified. Every transporter carries a valid RC, insurance, and DL.
        </Text>
        <Text style={{ fontSize: 18, fontWeight: '700', color: tokens.color.textPrimary, marginTop: 12 }}>
          What we do
        </Text>
        <Text style={{ fontSize: 15, lineHeight: 22, color: tokens.color.textSecondary }}>
          A buyer places an order in seven steps. The local vendor accepts, a transporter is matched, and the
          truck reaches the site with photo + OTP-verified proof of delivery. Payments and GST invoices are
          handled centrally so contractors can keep books clean.
        </Text>
        <Text style={{ fontSize: 18, fontWeight: '700', color: tokens.color.textPrimary, marginTop: 12 }}>
          Where we operate
        </Text>
        <Text style={{ fontSize: 15, lineHeight: 22, color: tokens.color.textSecondary }}>
          Hyderabad, Bengaluru, Mumbai, Pune, Chennai, Coimbatore, Ahmedabad, Delhi, Kolkata, Vijayawada and
          expanding. Visit your city page for local catalog, pricing, and delivery slots.
        </Text>
      </ScrollView>
    </Screen>
  );
}
