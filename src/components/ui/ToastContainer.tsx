import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View, Platform } from 'react-native';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react-native';
import { toast, ToastMsg } from '@/services/toast';
import { FontFamily, Radius, Shadow } from '@/constants/theme';

function ToastItem({ msg, onDone }: { msg: ToastMsg; onDone: () => void }) {
  const opacity     = useRef(new Animated.Value(0)).current;
  const translateY  = useRef(new Animated.Value(-8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity,    { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start();

    const t = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity,    { toValue: 0, duration: 140, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: -8, duration: 140, useNativeDriver: true }),
      ]).start(() => onDone());
    }, 3800);

    return () => clearTimeout(t);
  }, []);

  /**
   * Slim, single-line-first toasts — Stripe / Linear style.
   * Left accent bar carries the semantic color; rest stays neutral white.
   */
  const cfg = {
    success: { accent: '#16A34A', Icon: CheckCircle,   iconBg: '#DCFCE7', iconColor: '#15803D' },
    error:   { accent: '#DC2626', Icon: XCircle,       iconBg: '#FEE2E2', iconColor: '#B91C1C' },
    warning: { accent: '#D97706', Icon: AlertTriangle, iconBg: '#FEF3C7', iconColor: '#B45309' },
    info:    { accent: '#2563EB', Icon: Info,          iconBg: '#DBEAFE', iconColor: '#1D4ED8' },
  }[msg.type];

  const { Icon } = cfg;

  return (
    <Animated.View style={[styles.item, { opacity, transform: [{ translateY }] }]}>
      <View style={[styles.accent, { backgroundColor: cfg.accent }]} />
      <View style={[styles.iconChip, { backgroundColor: cfg.iconBg }]}>
        <Icon size={14} color="#0F172A" strokeWidth={2.2} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.title} numberOfLines={2}>{msg.title}</Text>
        {msg.body ? <Text style={styles.body} numberOfLines={2}>{msg.body}</Text> : null}
      </View>
      <Pressable onPress={onDone} hitSlop={8} style={styles.closeBtn}>
        <X size={14} color="#0F172A" strokeWidth={2} />
      </Pressable>
    </Animated.View>
  );
}

export function ToastContainer() {
  const [messages, setMessages] = useState<ToastMsg[]>([]);

  useEffect(() => {
    toast._register((msg) => {
      setMessages(prev => [...prev.slice(-4), msg]);
    });
    return () => toast._unregister();
  }, []);

  if (!messages.length) return null;

  return (
    <View style={styles.root} pointerEvents="box-none">
      {messages.map((m) => (
        <ToastItem
          key={m.id}
          msg={m}
          onDone={() => setMessages(prev => prev.filter(x => x.id !== m.id))}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 44,
    right: 16,
    left: 16,
    zIndex: 99999,
    gap: 8,
    alignItems: 'flex-end',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    paddingLeft: 14, // accent bar offset
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.md,
    borderWidth: 1, borderColor: '#E2E8F0',
    minWidth: 280,
    maxWidth: 420,
    overflow: 'hidden',
    ...Shadow.md,
  },
  accent: {
    position: 'absolute',
    left: 0, top: 0, bottom: 0,
    width: 3,
  },
  iconChip: {
    width: 26, height: 26, borderRadius: 6,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  title: {
    fontFamily: FontFamily.semiBold,
    fontSize: 13,
    lineHeight: 17,
    color: '#0F172A',
    letterSpacing: -0.05,
  },
  body: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    lineHeight: 16,
    color: '#475569',
    marginTop: 1,
  },
  closeBtn: {
    width: 22, height: 22, borderRadius: 4,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
});
