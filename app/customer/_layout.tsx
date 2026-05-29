import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Tabs, usePathname } from 'expo-router';
import { Home, ClipboardList, ShoppingCart, User, MessageCircle } from 'lucide-react-native';
import { useCart } from '@/stores/cart';
import { useAuth } from '@/services/auth/AuthProvider';
import { useRouter } from 'expo-router';
import { ChatBanner } from '@/components/ui/ChatBanner';
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

/** Wraps a tab icon in a soft pill background when focused. */
function TabIconPill({ focused, children }: { focused: boolean; children: React.ReactNode }) {
  return (
    <View style={[styles.iconPill, focused && styles.iconPillActive]}>
      {children}
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
    <>
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
            <TabIconPill focused={focused}>
              <Home size={18} color="#0F172A" strokeWidth={focused ? 2 : 1.6} />
            </TabIconPill>
          ),
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'History',
          tabBarIcon: ({ color, focused }) => (
            <TabIconPill focused={focused}>
              <ClipboardList size={18} color="#0F172A" strokeWidth={focused ? 2 : 1.6} />
            </TabIconPill>
          ),
        }}
      />
      <Tabs.Screen
        name="inbox"
        options={{
          title: 'Inbox',
          tabBarIcon: ({ color, focused }) => (
            <TabIconPill focused={focused}>
              <MessageCircle size={18} color="#0F172A" strokeWidth={focused ? 2 : 1.6} />
            </TabIconPill>
          ),
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: 'Cart',
          tabBarIcon: ({ color, focused }) => (
            <TabIconPill focused={focused}>
              <View>
                <ShoppingCart size={18} color="#0F172A" strokeWidth={focused ? 2 : 1.6} />
                <CartBadge count={cartItems.length} />
              </View>
            </TabIconPill>
          ),
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: 'Account',
          tabBarIcon: ({ color, focused }) => (
            <TabIconPill focused={focused}>
              <User size={18} color="#0F172A" strokeWidth={focused ? 2 : 1.6} />
            </TabIconPill>
          ),
        }}
      />
      {/* Hidden routes */}
      <Tabs.Screen name="checkout"      options={{ href: null }} />
      <Tabs.Screen name="order-detail"  options={{ href: null }} />
      <Tabs.Screen name="chat"          options={{ href: null }} />
      <Tabs.Screen name="book"          options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="transport"     options={{ href: null }} />
      <Tabs.Screen name="profile"       options={{ href: null }} />
      <Tabs.Screen name="addresses"     options={{ href: null }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
      <Tabs.Screen name="onboarding"          options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="onboarding/[step]"   options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="orders/[id]"         options={{ href: null }} />
      <Tabs.Screen name="welcome"             options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="search"        options={{ href: null }} />
      <Tabs.Screen name="calculator"    options={{ href: null }} />
      <Tabs.Screen name="invoices"      options={{ href: null }} />
      <Tabs.Screen name="support/index" options={{ href: null }} />
      <Tabs.Screen name="support/new"   options={{ href: null }} />
      <Tabs.Screen name="support/[id]"  options={{ href: null }} />
      <Tabs.Screen name="security"      options={{ href: null }} />
    </Tabs>
    <ChatBanner role="customer" />
    </>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: SURFACE,
    borderTopColor: 'rgba(0,0,0,0.04)',
    borderTopWidth: 1,
    height: Platform.OS === 'ios' ? 72 : 58,
    paddingTop: 6,
    paddingBottom: Platform.OS === 'ios' ? 18 : 8,
    shadowColor: '#0F172A',
    shadowOpacity: 0.04,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: -2 },
    elevation: 8,
  },
  tabLabel: {
    fontFamily: FontFamily.medium,
    fontSize: 10,
    letterSpacing: 0.1,
    marginTop: 2,
  },
  tabItem: {
    paddingTop: 2,
  },
  /* Active state pill behind the icon */
  iconPill: {
    paddingHorizontal: 12, paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1, borderColor: 'transparent',
  },
  iconPillActive: {
    backgroundColor: 'rgba(37,99,235,0.08)',
    borderColor: 'rgba(37,99,235,0.12)',
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
