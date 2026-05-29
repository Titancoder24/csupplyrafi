import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Tabs, usePathname } from 'expo-router';
import { Home, ClipboardList, ShoppingCart, User, MessageCircle } from 'lucide-react-native';
import { useCart } from '@/stores/cart';
import { useAuth } from '@/services/auth/AuthProvider';
import { useRouter } from 'expo-router';
import { FontFamily } from '@/constants/theme';

const PRIMARY = '#1D4ED8';
const MUTED   = '#94A3B8';
const SURFACE = '#FFFFFF';
const BORDER  = '#E2E8F0';

function CartBadge({ count }: { count: number }) {
  if (!count) return null;
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{count > 9 ? '9+' : count}</Text>
    </View>
  );
}

export default function CustomerLayout() {
  const cartItems = useCart((s) => s.items);
  const { session, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Public routes inside /customer/* that don't require auth (marketing + signup)
  const isPublicRoute =
    pathname.startsWith('/customer/welcome')
    || pathname.startsWith('/customer/onboarding');

  useEffect(() => {
    if (isPublicRoute) return;
    if (!loading && !session) router.replace('/auth/login');
  }, [loading, session, router, isPublicRoute]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: PRIMARY,
        tabBarInactiveTintColor: MUTED,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
        tabBarItemStyle: styles.tabItem,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <Home size={22} color={color} strokeWidth={focused ? 2.5 : 1.8} />
          ),
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Orders',
          tabBarIcon: ({ color, focused }) => (
            <ClipboardList size={22} color={color} strokeWidth={focused ? 2.5 : 1.8} />
          ),
        }}
      />
      <Tabs.Screen
        name="inbox"
        options={{
          title: 'Inbox',
          tabBarIcon: ({ color, focused }) => (
            <MessageCircle size={22} color={color} strokeWidth={focused ? 2.5 : 1.8} />
          ),
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: 'Cart',
          tabBarIcon: ({ color, focused }) => (
            <View>
              <ShoppingCart size={22} color={color} strokeWidth={focused ? 2.5 : 1.8} />
              <CartBadge count={cartItems.length} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: 'Account',
          tabBarIcon: ({ color, focused }) => (
            <User size={22} color={color} strokeWidth={focused ? 2.5 : 1.8} />
          ),
        }}
      />
      {/* Hidden routes */}
      <Tabs.Screen name="checkout"      options={{ href: null }} />
      <Tabs.Screen name="order-detail"  options={{ href: null }} />
      <Tabs.Screen name="chat"          options={{ href: null }} />
      <Tabs.Screen name="book"          options={{ href: null }} />
      <Tabs.Screen name="transport"     options={{ href: null }} />
      <Tabs.Screen name="profile"       options={{ href: null }} />
      <Tabs.Screen name="addresses"     options={{ href: null }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
      <Tabs.Screen name="onboarding"    options={{ href: null }} />
      <Tabs.Screen name="welcome"       options={{ href: null }} />
      <Tabs.Screen name="search"        options={{ href: null }} />
      <Tabs.Screen name="calculator"    options={{ href: null }} />
      <Tabs.Screen name="invoices"      options={{ href: null }} />
      <Tabs.Screen name="support"       options={{ href: null }} />
      <Tabs.Screen name="security"      options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: SURFACE,
    borderTopColor: BORDER,
    borderTopWidth: 1,
    height: Platform.OS === 'ios' ? 78 : 64,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 20 : 10,
    shadowColor: '#0F172A',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -3 },
    elevation: 8,
  },
  tabLabel: {
    fontFamily: FontFamily.medium,
    fontSize: 11,
    marginTop: 2,
  },
  tabItem: {
    paddingTop: 2,
  },
  badge: {
    position: 'absolute', top: -4, right: -10,
    minWidth: 16, height: 16, paddingHorizontal: 4,
    borderRadius: 8, backgroundColor: '#F97316',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: SURFACE,
  },
  badgeText: { fontFamily: FontFamily.bold, fontSize: 9, color: SURFACE },
});
