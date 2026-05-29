import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/services/auth/AuthProvider';
import { useTheme } from '@/theme/ThemeProvider';

export default function RoleRedirect() {
  const router = useRouter();
  const { profile, loading, session } = useAuth();
  const { tokens } = useTheme();

  useEffect(() => {
    // Still initialising
    if (loading) return;
    // Session exists but profile not fetched yet — wait
    if (session && !profile) return;

    const role = profile?.role ?? 'customer';
    switch (role) {
      case 'vendor':
        router.replace('/vendor/dashboard');
        break;
      case 'transporter':
        router.replace('/transporter/dashboard');
        break;
      case 'admin':
        router.replace('/admin/dashboard');
        break;
      case 'super_admin':
        router.replace('/superadmin/dashboard');
        break;
      default:
        // Customers always go straight to home. They can fill in their
        // profile from the Account screen if they want; we don't force
        // onboarding on existing users.
        router.replace('/customer/home');
    }
  }, [profile, loading, session, router]);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: tokens.color.background }}>
      <ActivityIndicator color={tokens.color.primary} />
    </View>
  );
}
