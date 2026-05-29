import React, { useEffect } from 'react';
import { View } from 'react-native';
import { ShoppingCart } from 'lucide-react-native';
import { Stack } from 'expo-router';
import { useTheme } from '@/theme/ThemeProvider';
import { useVendorPopups } from '@/hooks/useVendorPopups';
import { useKycGate } from '@/hooks/useKycGate';
import { ActionPopup } from '@/components/ui/ActionPopup';

export default function VendorLayout() {
  const { setSurface } = useTheme();
  useEffect(() => {
    setSurface('vendor');
  }, [setSurface]);
  useKycGate('vendor');

  return (
    <View style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }} />
      <VendorActionPopupQueue />
    </View>
  );
}

/* Mounted at layout level so popups fire on any vendor screen */
function VendorActionPopupQueue() {
  const { current, loading, approve, reject, later } = useVendorPopups();
  if (!current) return null;
  return (
    <ActionPopup
      visible
      icon={<ShoppingCart size={28} color="#1D4ED8" strokeWidth={2.2} />}
      iconBg="#EFF6FF"
      title="New Order Received"
      message={`Order #${current.orderNumber}${current.amount ? ` · ₹${current.amount.toLocaleString('en-IN')}` : ''} is awaiting your acceptance.`}
      primaryLabel="Accept & Broadcast"
      primaryColor="#15803D"
      secondaryLabel="Reject"
      onPrimary={approve}
      onSecondary={reject}
      onLater={later}
      loading={loading}
    />
  );
}
