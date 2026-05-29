import React from 'react';
import { View, Text } from 'react-native';
import { Mail, Phone, MapPin } from 'lucide-react-native';
import { Stack } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Header } from '@/components/ui/Header';
import { Card } from '@/components/ui/Card';
import { useTheme } from '@/theme/ThemeProvider';

export default function Contact() {
  const { tokens } = useTheme();
  const Row = ({ icon, title, value }: { icon: React.ReactNode; title: string; value: string }) => (
    <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: tokens.color.muted,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {icon}
      </View>
      <View>
        <Text style={{ fontSize: 12, color: tokens.color.textMuted }}>{title}</Text>
        <Text style={{ fontSize: 15, fontWeight: '700', color: tokens.color.textPrimary }}>{value}</Text>
      </View>
    </Card>
  );
  return (
    <Screen>
      <Stack.Screen options={{ title: 'Contact C-Supply' }} />
      <Header title="Contact" />
      <View style={{ padding: 20, gap: 12, maxWidth: 720, alignSelf: 'center', width: '100%' }}>
        <Text style={{ fontSize: 24, fontWeight: '800', color: tokens.color.textPrimary }}>Talk to us</Text>
        <Text style={{ fontSize: 14, color: tokens.color.textSecondary }}>
          Sales, support, partnerships — we reply within one business day.
        </Text>
        <Row icon={<Mail size={20} color="#0F172A" />} title="Email" value="support@csupply.in" />
        <Row icon={<Phone size={20} color="#0F172A" />} title="Phone" value="+91 1800-CSUPPLY" />
        <Row
          icon={<MapPin size={20} color="#0F172A" />}
          title="Office"
          value="HITEC City, Hyderabad, Telangana"
        />
      </View>
    </Screen>
  );
}
