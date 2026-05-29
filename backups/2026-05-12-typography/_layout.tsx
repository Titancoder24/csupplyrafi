import React, { useEffect, useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, Platform, useWindowDimensions,
  ScrollView, Modal, FlatList, TouchableOpacity, ActivityIndicator, Image,
} from 'react-native';
import { Slot, useRouter, usePathname } from 'expo-router';
import {
  LayoutDashboard, Users, Store, Package, Truck, Navigation,
  Tags, Award, ShoppingCart, Settings, LogOut,
  X, Bell, ChevronLeft, ChevronRight, Image as ImageIcon,
  CheckCheck, Star, CheckCircle2,
} from 'lucide-react-native';
import { FontFamily } from '@/constants/theme';
import { useNotifications } from '@/hooks/useNotifications';
import { supabase } from '@/services/supabase';
import { useAuth } from '@/services/auth/AuthProvider';
import { useSuperAdminPopups } from '@/hooks/useSuperAdminPopups';
import { ActionPopup } from '@/components/ui/ActionPopup';

/* ─── Design tokens (light SaaS theme) ─────────────────────── */
const T = {
  sidebar:        '#FFFFFF',
  sidebarHover:   '#F1F5F9',
  sidebarActive:  '#F1F5F9',
  sidebarBorder:  '#E2E8F0',
  sidebarText:    '#475569',
  sidebarTextActive: '#0F172A',
  accent:         '#2563EB',
  accentLight:    '#EFF6FF',
  topbar:         '#FFFFFF',
  topbarBorder:   '#E2E8F0',
  content:        '#F7F8FA',
  white:          '#FFFFFF',
  border:         '#E2E8F0',
  textPrimary:    '#0F172A',
  textSecondary:  '#475569',
  textMuted:      '#94A3B8',
  red:            '#DC2626',
  orange:         '#EA580C',
  green:          '#16A34A',
};

/* ─── Nav structure ─────────────────────────────────────────── */
const NAV_SECTIONS = [
  {
    title: 'OVERVIEW',
    items: [
      { key: 'dashboard', label: 'Dashboard',           icon: LayoutDashboard, route: '/superadmin/dashboard' },
    ],
  },
  {
    title: 'USER MANAGEMENT',
    items: [
      { key: 'users',          label: 'Users',              icon: Users,    route: '/superadmin/users' },
      { key: 'vendors',        label: 'Vendor Approvals',   icon: Store,    route: '/superadmin/vendors' },
      { key: 'transporters',   label: 'Transporters',       icon: Truck,    route: '/superadmin/transporters' },
    ],
  },
  {
    title: 'CATALOG',
    items: [
      { key: 'products',    label: 'Products',    icon: Package, route: '/superadmin/products' },
      { key: 'categories',  label: 'Categories',  icon: Tags,    route: '/superadmin/categories' },
      { key: 'brands',      label: 'Brands',      icon: Award,   route: '/superadmin/brands' },
    ],
  },
  {
    title: 'OPERATIONS',
    items: [
      { key: 'orders',               label: 'All Orders',          icon: ShoppingCart, route: '/superadmin/orders' },
      { key: 'transport-requests',   label: 'Transport Requests',  icon: Navigation,   route: '/superadmin/transport-requests' },
      { key: 'ratings',              label: 'Ratings',             icon: Star,         route: '/superadmin/ratings' },
      { key: 'banners',              label: 'Banners',             icon: ImageIcon,    route: '/superadmin/banners' },
    ],
  },
  {
    title: 'SYSTEM',
    items: [
      { key: 'settings', label: 'Settings', icon: Settings, route: '/superadmin/settings' },
    ],
  },
];

const ALL_NAV = NAV_SECTIONS.flatMap(s => s.items);

/* ─── Sidebar ───────────────────────────────────────────────── */
function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const router   = useRouter();
  const pathname = usePathname();

  return (
    <View style={[sb.root, collapsed && sb.collapsed]}>

      {/* Logo row */}
      <View style={sb.logoRow}>
        <View style={sb.logoMark}>
          <Image
            source={require('../../assets/Logo_Ui.png')}
            style={{ width: 48, height: 48 }}
            resizeMode="contain"
          />
        </View>
        {!collapsed && (
          <View style={{ flex: 1 }}>
            <Text style={sb.logoName}>C-Supply</Text>
            <Text style={sb.logoRole}>Administrator</Text>
          </View>
        )}
        <Pressable onPress={onToggle} hitSlop={8} style={sb.collapseBtn}>
          {collapsed
            ? <ChevronRight size={15} color={T.textMuted} strokeWidth={2} />
            : <ChevronLeft  size={15} color={T.textMuted} strokeWidth={2} />
          }
        </Pressable>
      </View>

      {/* Live indicator */}
      <View style={[sb.liveRow, collapsed && sb.liveRowCollapsed]}>
        <View style={sb.liveDot} />
        {!collapsed && (
          <>
            <Text style={sb.liveTxt}>Live</Text>
            <Text style={sb.liveSub}>Realtime</Text>
          </>
        )}
      </View>

      {/* Nav */}
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        <View style={{ paddingTop: 8, paddingBottom: 8 }}>
          {NAV_SECTIONS.map((section) => (
            <View key={section.title}>
              {!collapsed && (
                <Text style={sb.sectionLabel}>{section.title}</Text>
              )}
              {collapsed && <View style={sb.sectionDivider} />}
              {section.items.map((item) => {
                const Icon   = item.icon;
                const active = pathname.startsWith(item.route);
                return (
                  <Pressable
                    key={item.key}
                    onPress={() => router.push(item.route as never)}
                    style={[sb.navItem, active && sb.navItemActive, collapsed && sb.navItemCollapsed]}
                  >
                    {active && !collapsed && <View style={sb.activeBar} />}
                    <Icon
                      size={17}
                      color={active ? T.sidebarTextActive : T.sidebarText}
                      strokeWidth={active ? 2.2 : 1.8}
                    />
                    {!collapsed && (
                      <Text style={[sb.navLabel, active && sb.navLabelActive]} numberOfLines={1}>
                        {item.label}
                      </Text>
                    )}
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Logout */}
      <View style={sb.footer}>
        <Pressable
          style={[sb.logoutBtn, collapsed && sb.logoutCollapsed]}
          onPress={async () => {
            await supabase.auth.signOut();
            router.replace('/superadmin/login' as never);
          }}
        >
          <LogOut size={16} color="#F87171" strokeWidth={1.8} />
          {!collapsed && <Text style={sb.logoutLabel}>Sign Out</Text>}
        </Pressable>
      </View>

    </View>
  );
}

/* ─── Notification panel ────────────────────────────────────── */
function NotifPanel({ onClose }: { onClose: () => void }) {
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();

  return (
    <View style={np.panel}>
      <View style={np.header}>
        <Text style={np.heading}>Notifications</Text>
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
          {unreadCount > 0 && (
            <Pressable onPress={markAllRead} style={np.markAllBtn}>
              <CheckCheck size={13} color={T.accent} strokeWidth={2} />
              <Text style={np.markAllText}>Mark all read</Text>
            </Pressable>
          )}
          <Pressable onPress={onClose} hitSlop={8}>
            <X size={16} color={T.textMuted} strokeWidth={2} />
          </Pressable>
        </View>
      </View>

      {notifications.length === 0 ? (
        <View style={np.empty}>
          <Bell size={28} color={T.textMuted} strokeWidth={1.5} />
          <Text style={np.emptyText}>No notifications</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={i => i.id}
          style={{ maxHeight: 420 }}
          renderItem={({ item }) => (
            <Pressable
              style={[np.item, !item.read && np.itemUnread]}
              onPress={() => markRead(item.id)}
            >
              {!item.read && <View style={np.dot} />}
              <View style={{ flex: 1 }}>
                <Text style={np.itemTitle} numberOfLines={1}>{item.title}</Text>
                {item.body ? (
                  <Text style={np.itemBody} numberOfLines={2}>{item.body}</Text>
                ) : null}
                <Text style={np.itemTime}>
                  {new Date(item.created_at).toLocaleString('en-IN', {
                    hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short',
                  })}
                </Text>
              </View>
            </Pressable>
          )}
          ItemSeparatorComponent={() => <View style={np.sep} />}
        />
      )}
    </View>
  );
}

/* ─── Top bar ───────────────────────────────────────────────── */
function TopBar() {
  const pathname      = usePathname();
  const segment       = pathname.split('/').pop() ?? 'dashboard';
  const currentItem   = ALL_NAV.find(n => n.route.endsWith(segment));
  const pageTitle     = currentItem?.label ?? 'Super Admin';
  const { unreadCount } = useNotifications();
  const { profile }   = useAuth();
  const [showNotifs, setShowNotifs] = useState(false);

  const fullName = profile?.full_name ?? 'Super Admin';
  const initials = fullName.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <View style={tb.root}>
      <View style={tb.left}>
        <Text style={tb.title}>{pageTitle}</Text>
      </View>

      <View style={tb.right}>
        {/* Bell */}
        <Pressable style={tb.iconBtn} onPress={() => setShowNotifs(true)}>
          <Bell size={18} color={T.textSecondary} strokeWidth={1.8} />
          {unreadCount > 0 && (
            <View style={tb.badge}>
              <Text style={tb.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
            </View>
          )}
        </Pressable>

        {/* Divider */}
        <View style={tb.vDivider} />

        {/* Avatar */}
        <View style={tb.avatarRow}>
          <View style={tb.avatar}>
            <Text style={tb.avatarText}>{initials}</Text>
          </View>
          <View>
            <Text style={tb.avatarName}>{fullName}</Text>
            <Text style={tb.avatarRole}>Administrator</Text>
          </View>
        </View>
      </View>

      <Modal
        visible={showNotifs}
        transparent
        animationType="fade"
        onRequestClose={() => setShowNotifs(false)}
      >
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.15)' }}
          activeOpacity={1}
          onPress={() => setShowNotifs(false)}
        >
          <View style={np.backdrop}>
            <TouchableOpacity activeOpacity={1} onPress={() => {}}>
              <NotifPanel onClose={() => setShowNotifs(false)} />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

/* ─── Root layout ───────────────────────────────────────────── */
export default function SuperAdminLayout() {
  const { width } = useWindowDimensions();
  const isNarrow = width < 900;
  const [collapsed,    setCollapsed]    = useState(isNarrow);
  const [authChecked,  setAuthChecked]  = useState(false);
  const [authorized,   setAuthorized]   = useState(false);
  const router   = useRouter();
  const pathname = usePathname();
  const isLoginPage = pathname === '/superadmin/login';
  const hasAuthorized = React.useRef(false);

  // Auto-collapse sidebar when window goes narrow
  useEffect(() => { setCollapsed(isNarrow); }, [isNarrow]);

  useEffect(() => {
    if (isLoginPage) { setAuthChecked(true); return; }
    if (hasAuthorized.current) return;

    async function check() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace('/superadmin/login' as never); return; }
      const { data: profile } = await supabase
        .from('profiles').select('role').eq('id', session.user.id).maybeSingle();
      if (profile?.role !== 'super_admin') {
        await supabase.auth.signOut();
        router.replace('/superadmin/login' as never);
        return;
      }
      hasAuthorized.current = true;
      setAuthorized(true);
      setAuthChecked(true);
    }
    check();
  }, [isLoginPage]);

  if (Platform.OS !== 'web') {
    return (
      <View style={root.mobileBlock}>
        <View style={root.mobileIcon}>
          <Text style={root.mobileIconText}>C</Text>
        </View>
        <Text style={root.mobileTitle}>Desktop Required</Text>
        <Text style={root.mobileSub}>
          The Admin Portal is only accessible via a web browser on desktop.
        </Text>
      </View>
    );
  }

  if (isLoginPage) return <Slot />;

  if (!authChecked || !authorized) {
    return (
      <View style={[root.shell, { alignItems: 'center', justifyContent: 'center', backgroundColor: T.content }]}>
        <ActivityIndicator color={T.accent} size="large" />
        <Text style={root.loadingText}>Verifying credentials…</Text>
      </View>
    );
  }

  return (
    <View style={root.shell}>
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />
      <View style={root.main}>
        <TopBar />
        <View style={root.content}>
          <Slot />
        </View>
      </View>
      <ActionPopupQueue />
    </View>
  );
}

/* ─── Realtime-driven action popup queue ─────────────────────────────────── */
function ActionPopupQueue() {
  const { current, loading, approve, reject, later } = useSuperAdminPopups();
  if (!current) return null;

  if (current.kind === 'new_order') {
    const gst = current.gst;
    const details: { label: string; value: string }[] = [
      { label: 'Order',    value: `#${current.orderNumber}${current.amount ? ` · ₹${current.amount.toLocaleString('en-IN')}` : ''}` },
      { label: 'Customer', value: `${current.customerName ?? 'Unknown'}${current.customerPhone ? ` · ${current.customerPhone}` : ''}` },
      {
        label: 'GST',
        value: gst?.hasGst
          ? `${gst.gstNumber ?? '—'}${gst.businessName ? ` · ${gst.businessName}` : ''}`
          : `Not registered${gst?.fullName ? ` · ${gst.fullName}` : ''}`,
      },
      ...(current.vendorNames && current.vendorNames.length
        ? [{
            label: 'Vendor',
            value: `${current.vendorNames.join(', ')}${current.vendorPhone ? ` · ${current.vendorPhone}` : ''}`,
          }]
        : []),
    ];
    return (
      <ActionPopup
        visible
        icon={<ShoppingCart size={28} color="#1D4ED8" strokeWidth={2.2} />}
        iconBg="#EFF6FF"
        title="New Order Placed"
        message="Review the customer, GST and vendor details, then approve to forward this order to the vendor."
        details={details}
        primaryLabel="Approve & Send to Vendor"
        primaryColor="#15803D"
        secondaryLabel="Reject"
        onPrimary={approve}
        onSecondary={reject}
        onLater={later}
        loading={loading}
      />
    );
  }

  if (current.kind === 'pickup') {
    return (
      <ActionPopup
        visible
        icon={<Package size={28} color="#B45309" strokeWidth={2.2} />}
        iconBg="#FFFBEB"
        title="Pickup Awaiting Confirm"
        message={`Transporter reported pickup for order #${current.orderNumber}. Confirm to let delivery proceed.`}
        primaryLabel="Confirm Pickup"
        primaryColor="#15803D"
        onPrimary={approve}
        onLater={later}
        loading={loading}
      />
    );
  }

  if (current.kind === 'delivery') {
    return (
      <ActionPopup
        visible
        icon={<CheckCircle2 size={28} color="#15803D" strokeWidth={2.2} />}
        iconBg="#DCFCE7"
        title="Delivery Awaiting Confirm"
        message={`Transporter marked order #${current.orderNumber} as delivered. Confirm to close the order.`}
        primaryLabel="Confirm Delivery"
        primaryColor="#15803D"
        onPrimary={approve}
        onLater={later}
        loading={loading}
      />
    );
  }

  if (current.kind === 'new_product') {
    return (
      <ActionPopup
        visible
        icon={<Package size={28} color="#6D28D9" strokeWidth={2.2} />}
        iconBg="#F5F3FF"
        title="New Product Listed"
        message={`Vendor listed "${current.productName}" for sale. Review and approve to make it visible to customers.`}
        primaryLabel="Approve"
        primaryColor="#15803D"
        secondaryLabel="Reject"
        onPrimary={approve}
        onSecondary={reject}
        onLater={later}
        loading={loading}
      />
    );
  }

  return null;
}

/* ─── Sidebar styles ────────────────────────────────────────── */
const SIDEBAR_W         = 232;
const SIDEBAR_COLLAPSED = 58;

const sb = StyleSheet.create({
  root: {
    width: SIDEBAR_W,
    backgroundColor: T.sidebar,
    flexDirection: 'column',
    borderRightWidth: 1,
    borderRightColor: T.sidebarBorder,
  },
  collapsed: { width: SIDEBAR_COLLAPSED },

  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: T.sidebarBorder,
  },
  logoMark: {
    width: 44, height: 44, borderRadius: 8,
    backgroundColor: T.accentLight,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
    overflow: 'hidden',
    borderWidth: 1, borderColor: T.border,
  },
  logoLetter: { fontFamily: FontFamily.bold, fontSize: 16, color: T.textPrimary },
  logoName:   { fontFamily: FontFamily.semiBold, fontSize: 14, color: T.textPrimary, letterSpacing: -0.1 },
  logoRole:   { fontFamily: FontFamily.regular, fontSize: 11, color: T.textMuted, letterSpacing: 0.1 },
  collapseBtn: { marginLeft: 'auto' as never, padding: 2 },

  sectionLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: 10,
    color: T.textMuted,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 4,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: T.border,
    marginHorizontal: 12,
    marginVertical: 8,
  },

  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 6,
    position: 'relative' as never,
  },
  navItemActive: { backgroundColor: T.sidebarActive },
  navItemCollapsed: { justifyContent: 'center', paddingHorizontal: 0, marginHorizontal: 10 },

  activeBar: {
    position: 'absolute' as never,
    left: -8, top: 6, bottom: 6,
    width: 3, borderRadius: 2,
    backgroundColor: T.accent,
  },

  navLabel: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
    color: T.sidebarText,
    flex: 1,
  },
  navLabelActive: {
    color: T.sidebarTextActive,
    fontFamily: FontFamily.semiBold,
  },

  /* Live indicator */
  liveRow: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    marginHorizontal: 14, marginVertical: 8,
    paddingHorizontal: 10, paddingVertical: 7,
    backgroundColor: '#F0FDF4',
    borderRadius: 6,
    borderWidth: 1, borderColor: '#BBF7D0',
  },
  liveRowCollapsed: {
    marginHorizontal: 10, paddingHorizontal: 0, paddingVertical: 7,
    alignItems: 'center', justifyContent: 'center',
  },
  liveDot: {
    width: 7, height: 7, borderRadius: 4,
    backgroundColor: '#16A34A',
  },
  liveTxt: {
    fontFamily: FontFamily.semiBold, fontSize: 11.5,
    color: '#15803D', letterSpacing: 0.2, flex: 1,
  },
  liveSub: {
    fontFamily: FontFamily.regular, fontSize: 10,
    color: '#16A34A', letterSpacing: 0.1,
  },

  footer: {
    borderTopWidth: 1,
    borderTopColor: T.border,
    paddingVertical: 4,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  logoutCollapsed: { justifyContent: 'center', paddingHorizontal: 0 },
  logoutLabel: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
    color: '#F87171',
  },
});

/* ─── TopBar styles ─────────────────────────────────────────── */
const tb = StyleSheet.create({
  root: {
    height: 56,
    backgroundColor: T.topbar,
    borderBottomWidth: 1,
    borderBottomColor: T.topbarBorder,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
  },
  left: { flex: 1 },
  title: {
    fontFamily: FontFamily.semiBold,
    fontSize: 16,
    color: T.textPrimary,
  },
  right: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: { position: 'relative' as never, padding: 6 },
  badge: {
    position: 'absolute' as never, top: 2, right: 2,
    minWidth: 15, height: 15, borderRadius: 8,
    backgroundColor: T.orange,
    borderWidth: 1.5, borderColor: T.white,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 2,
  },
  badgeText: { fontFamily: FontFamily.bold, fontSize: 8, color: '#fff', lineHeight: 11 },
  vDivider: { width: 1, height: 22, backgroundColor: T.border, marginHorizontal: 8 },
  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: T.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontFamily: FontFamily.bold, fontSize: 11, color: '#fff' },
  avatarName: { fontFamily: FontFamily.semiBold, fontSize: 13, color: T.textPrimary },
  avatarRole: { fontFamily: FontFamily.regular, fontSize: 10, color: T.textMuted },
});

/* ─── Root styles ───────────────────────────────────────────── */
const root = StyleSheet.create({
  shell: { flex: 1, flexDirection: 'row', backgroundColor: T.content },
  main:  { flex: 1, flexDirection: 'column', overflow: 'hidden' as never },
  content: { flex: 1, overflow: 'hidden' as never },
  loadingText: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    color: T.textMuted,
    marginTop: 12,
  },
  mobileBlock: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: T.sidebar, padding: 40, gap: 16,
  },
  mobileIcon: {
    width: 56, height: 56, borderRadius: 14,
    backgroundColor: T.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  mobileIconText: { fontFamily: FontFamily.bold, fontSize: 26, color: '#fff' },
  mobileTitle: { fontFamily: FontFamily.bold, fontSize: 20, color: '#F1F5F9' },
  mobileSub: {
    fontFamily: FontFamily.regular, fontSize: 14,
    color: '#94A3B8', textAlign: 'center', lineHeight: 22,
  },
});

/* ─── NotifPanel styles ─────────────────────────────────────── */
const np = StyleSheet.create({
  backdrop: { alignItems: 'flex-end', paddingTop: 56, paddingRight: 16 },
  panel: {
    width: 340, backgroundColor: T.white,
    borderRadius: 8, overflow: 'hidden',
    borderWidth: 1, borderColor: T.border,
    shadowColor: '#000', shadowOpacity: 0.10,
    shadowRadius: 16, shadowOffset: { width: 0, height: 4 },
    elevation: 10,
  },
  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: T.border,
  },
  heading: { fontFamily: FontFamily.semiBold, fontSize: 14, color: T.textPrimary },
  markAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  markAllText: { fontFamily: FontFamily.medium, fontSize: 11, color: T.accent },
  empty: { alignItems: 'center', gap: 8, paddingVertical: 36 },
  emptyText: { fontFamily: FontFamily.regular, fontSize: 13, color: T.textMuted },
  item: {
    paddingHorizontal: 16, paddingVertical: 11,
    flexDirection: 'row', gap: 10, alignItems: 'flex-start',
  },
  itemUnread: { backgroundColor: '#F0F7FF' },
  dot: {
    width: 7, height: 7, borderRadius: 4,
    backgroundColor: T.accent, marginTop: 4, flexShrink: 0,
  },
  itemTitle: { fontFamily: FontFamily.semiBold, fontSize: 13, color: T.textPrimary },
  itemBody: {
    fontFamily: FontFamily.regular, fontSize: 12,
    color: T.textSecondary, marginTop: 2, lineHeight: 17,
  },
  itemTime: { fontFamily: FontFamily.regular, fontSize: 10, color: T.textMuted, marginTop: 4 },
  sep: { height: 1, backgroundColor: T.border, marginHorizontal: 16 },
});
