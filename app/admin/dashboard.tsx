import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import {
  AlertTriangle,
  ChevronRight,
  ClipboardList,
  IndianRupee,
  ShieldCheck,
  ShoppingBag,
  TrendingUp,
  Users,
} from 'lucide-react-native';
import { Screen } from '@/components/ui/Screen';
import { Header } from '@/components/ui/Header';
import { Card } from '@/components/ui/Card';
import { useTheme } from '@/theme/ThemeProvider';
import { formatINR } from '@/lib/format';

const KPIS = [
  { label: 'GMV (Today)', value: formatINR(1284350), icon: IndianRupee, color: '#15803D', bg: '#DCFCE7' },
  { label: 'Orders Today', value: '184', icon: ShoppingBag, color: '#1E40AF', bg: '#DBEAFE' },
  { label: 'Pending KYC', value: '07', icon: ShieldCheck, color: '#C2410C', bg: '#FFEDD5' },
  { label: 'Open Tickets', value: '12', icon: AlertTriangle, color: '#B91C1C', bg: '#FEE2E2' },
];

const SECTIONS = [
  { key: 'approvals', label: 'KYC Approvals', icon: ShieldCheck },
  { key: 'orders', label: 'Orders', icon: ClipboardList },
  { key: 'customers', label: 'Customers', icon: Users },
  { key: 'reports', label: 'Reports & Analytics', icon: TrendingUp },
];

export default function AdminDashboard() {
  const { tokens } = useTheme();
  const router = useRouter();
  return (
    <Screen padding={0}>
      <Header title="Admin Dashboard" showBack={false} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {KPIS.map((k) => {
            const Icon = k.icon;
            return (
              <Card
                key={k.label}
                style={{ width: '47%', backgroundColor: k.bg, borderColor: 'transparent' }}
              >
                <Icon size={22} color="#0F172A" />
                <Text style={{ fontSize: 12, color: k.color, marginTop: 8 }}>{k.label}</Text>
                <Text style={{ fontSize: 22, fontWeight: '800', color: k.color, marginTop: 4 }}>
                  {k.value}
                </Text>
              </Card>
            );
          })}
        </View>

        <Card padding={0}>
          {SECTIONS.map((s, idx) => {
            const Icon = s.icon;
            return (
              <Pressable
                key={s.key}
                onPress={() => router.push(`/admin/${s.key}` as never)}
                style={{
                  paddingVertical: 14,
                  paddingHorizontal: 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                  borderBottomWidth: idx === SECTIONS.length - 1 ? 0 : 1,
                  borderBottomColor: tokens.color.border,
                }}
              >
                <Icon size={18} color="#0F172A" />
                <Text
                  style={{
                    flex: 1,
                    marginLeft: 12,
                    fontSize: 15,
                    fontWeight: '500',
                    color: tokens.color.textPrimary,
                  }}
                >
                  {s.label}
                </Text>
                <ChevronRight size={18} color="#0F172A" />
              </Pressable>
            );
          })}
        </Card>
      </ScrollView>
    </Screen>
  );
}
