import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View, Platform } from 'react-native';
import { CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react-native';
import { toast, ToastMsg } from '@/services/toast';

function ToastItem({ msg, onDone }: { msg: ToastMsg; onDone: () => void }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity,     { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.timing(translateY,  { toValue: 0,  duration: 220, useNativeDriver: true }),
    ]).start();

    const t = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity,    { toValue: 0, duration: 180, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: -12, duration: 180, useNativeDriver: true }),
      ]).start(() => onDone());
    }, 3800);

    return () => clearTimeout(t);
  }, []);

  const cfg = {
    success: { bg: '#DCFCE7', border: '#16A34A', text: '#14532D', Icon: CheckCircle,   iconColor: '#16A34A' },
    error:   { bg: '#FEE2E2', border: '#DC2626', text: '#7F1D1D', Icon: XCircle,       iconColor: '#DC2626' },
    warning: { bg: '#FEF3C7', border: '#D97706', text: '#78350F', Icon: AlertTriangle, iconColor: '#D97706' },
    info:    { bg: '#EFF6FF', border: '#2563EB', text: '#1E3A8A', Icon: Info,          iconColor: '#2563EB' },
  }[msg.type];

  const { Icon } = cfg;

  return (
    <Animated.View style={[styles.item, { backgroundColor: cfg.bg, borderColor: cfg.border, opacity, transform: [{ translateY }] }]}>
      <Icon size={18} color={cfg.iconColor} strokeWidth={2} style={{ flexShrink: 0 }} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.title, { color: cfg.text }]} numberOfLines={2}>{msg.title}</Text>
        {msg.body ? <Text style={[styles.body, { color: cfg.text }]} numberOfLines={2}>{msg.body}</Text> : null}
      </View>
      <Pressable onPress={onDone} hitSlop={8}>
        <Text style={[styles.close, { color: cfg.text }]}>✕</Text>
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
    top: Platform.OS === 'ios' ? 58 : 48,
    left: 12,
    right: 12,
    zIndex: 99999,
    gap: 8,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOpacity: 0.10,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
  },
  title: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
    lineHeight: 18,
  },
  body: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  close: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    opacity: 0.55,
    paddingTop: 1,
  },
});
