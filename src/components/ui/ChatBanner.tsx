/**
 * ChatBanner — global slide-down notification when a chat message arrives.
 *
 * Listens to order_messages realtime INSERT events and shows a banner
 * for messages from the OTHER party (not your own). Auto-dismisses
 * after 5 seconds. Tapping opens the chat screen for that order.
 *
 * Hidden when the user is already inside /customer/chat or /transporter/chat.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, Animated, Platform,
} from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { MessageCircle, X, ChevronRight } from 'lucide-react-native';
import { supabase } from '@/services/supabase';
import { useAuth } from '@/services/auth/AuthProvider';
import { FontFamily, Radius, Shadow } from '@/constants/theme';

type ChatBannerProps = {
  /** 'customer' opens /customer/chat, 'transporter' opens /transporter/chat */
  role: 'customer' | 'transporter';
};

type Incoming = {
  orderId: string;
  content: string;
  senderRole: string;
};

export function ChatBanner({ role }: ChatBannerProps) {
  const router   = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();

  const [msg, setMsg] = useState<Incoming | null>(null);
  const [otherName, setOtherName] = useState<string>('');
  const translateY = useRef(new Animated.Value(-120)).current;
  const hideTimer  = useRef<any>(null);

  // Hide when inside the chat screen itself (no point notifying about your own chat)
  const onChatScreen = pathname.startsWith('/customer/chat') || pathname.startsWith('/transporter/chat');

  useEffect(() => {
    if (!user?.id) return;

    const suffix = Math.random().toString(36).slice(2, 10);
    const ch = supabase.channel(`chat-banner:${role}:${user.id}:${suffix}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'order_messages' },
        async (payload: any) => {
          const m = payload.new;
          if (!m) return;
          // Ignore my own messages
          if (m.sender_id === user.id) return;
          // Customer only sees messages from transporter (and vice versa)
          if (role === 'customer'    && m.sender_role !== 'transporter') return;
          if (role === 'transporter' && m.sender_role !== 'customer')    return;

          // Fetch sender name (optional, for the banner label)
          let label = role === 'customer' ? 'Transporter' : 'Customer';
          try {
            const { data: p } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', m.sender_id)
              .maybeSingle();
            if (p?.full_name) label = p.full_name;
          } catch {}
          setOtherName(label);
          setMsg({ orderId: m.order_id, content: m.content, senderRole: m.sender_role });
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id, role]);

  // Slide in when message arrives; auto-dismiss after 5s
  useEffect(() => {
    if (!msg || onChatScreen) {
      Animated.timing(translateY, { toValue: -160, duration: 200, useNativeDriver: true }).start();
      return;
    }
    Animated.spring(translateY, { toValue: 0, useNativeDriver: true, friction: 8, tension: 80 }).start();
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      Animated.timing(translateY, { toValue: -160, duration: 240, useNativeDriver: true }).start(() => {
        setMsg(null);
      });
    }, 5000);
    return () => { if (hideTimer.current) clearTimeout(hideTimer.current); };
  }, [msg, onChatScreen]);

  if (!msg || onChatScreen) return null;

  function open() {
    const params = role === 'customer'
      ? { orderId: msg!.orderId, transporterName: otherName }
      : { orderId: msg!.orderId, customerName: otherName };
    router.push({ pathname: `/${role}/chat`, params } as never);
    setMsg(null);
  }

  function dismiss() {
    Animated.timing(translateY, { toValue: -160, duration: 200, useNativeDriver: true }).start(() => {
      setMsg(null);
    });
  }

  return (
    <Animated.View style={[s.banner, { transform: [{ translateY }] }]}>
      <View style={s.accent} />
      <Pressable style={s.pressable} onPress={open}>
        <View style={s.icon}>
          <MessageCircle size={15} color="#0F172A" strokeWidth={2.2} />
        </View>
        <View style={{ flex: 1, gap: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={s.name} numberOfLines={1}>{otherName}</Text>
            <Text style={s.sentTag}>sent a message</Text>
          </View>
          <Text style={s.preview} numberOfLines={1}>{msg.content}</Text>
        </View>
        <ChevronRight size={14} color="#0F172A" strokeWidth={2.2} />
      </Pressable>
      <Pressable style={s.closeBtn} onPress={dismiss} hitSlop={8}>
        <X size={13} color="#0F172A" strokeWidth={2.2} />
      </Pressable>
    </Animated.View>
  );
}

const TOP_OFFSET = Platform.OS === 'ios' ? 56 : Platform.OS === 'web' ? 16 : 36;

const s = StyleSheet.create({
  banner: {
    position: 'absolute' as const,
    top: TOP_OFFSET, left: 16, right: 16,
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.md,
    borderWidth: 1, borderColor: '#E2E8F0',
    paddingLeft: 14, paddingRight: 10, paddingVertical: 10,
    overflow: 'hidden',
    ...Shadow.lg,
    zIndex: 999,
  },
  accent: {
    position: 'absolute',
    left: 0, top: 0, bottom: 0,
    width: 3,
    backgroundColor: '#1D4ED8',
  },
  pressable: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  icon: {
    width: 30, height: 30, borderRadius: 6,
    backgroundColor: '#DBEAFE',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  name:    { fontFamily: FontFamily.semiBold, fontSize: 13, color: '#0F172A' },
  sentTag: { fontFamily: FontFamily.regular, fontSize: 12, color: '#64748B' },
  preview: { fontFamily: FontFamily.regular, fontSize: 12, color: '#475569' },
  closeBtn: {
    width: 24, height: 24, borderRadius: 4,
    alignItems: 'center', justifyContent: 'center',
  },
});
