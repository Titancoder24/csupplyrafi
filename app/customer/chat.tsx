import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable, TextInput,
  ActivityIndicator, Platform, StatusBar, KeyboardAvoidingView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Send, Phone, Truck } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/services/supabase';
import { useAuth } from '@/services/auth/AuthProvider';

const PRIMARY = '#1D4ED8', BG = '#F8FAFC', SURF = '#FFFFFF';
const BORDER = '#E2E8F0', TEXT = '#0F172A', MUTED = '#64748B', HINT = '#94A3B8';
const R_REG = 'Roboto_400Regular', R_MED = 'Roboto_500Medium', R_BOLD = 'Roboto_700Bold';

type Message = { id: string; sender_id: string; sender_role: string; content: string; created_at: string };

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

export default function ChatScreen() {
  const { orderId, transporterName } = useLocalSearchParams<{ orderId: string; transporterName: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [text,     setText]     = useState('');
  const [sending,  setSending]  = useState(false);
  const listRef = useRef<FlatList>(null);

  const loadMessages = useCallback(async (silent = false) => {
    if (!orderId) {
      setLoading(false);
      return;
    }
    if (!silent) setLoading(true);
    try {
      const { data, error } = await supabase
        .from('order_messages')
        .select('id, sender_id, sender_role, content, created_at')
        .eq('order_id', orderId)
        .order('created_at', { ascending: true })
        .limit(100);
      if (error) throw error;
      setMessages((data ?? []) as Message[]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    loadMessages();
    if (!orderId) return;
    const ch = supabase
      .channel(`chat-rt:${orderId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'order_messages', filter: `order_id=eq.${orderId}` },
        (payload) => {
          setMessages(prev => [...prev, payload.new as Message]);
          setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [loadMessages, orderId]);

  useEffect(() => {
    if (messages.length > 0) setTimeout(() => listRef.current?.scrollToEnd({ animated: false }), 200);
  }, [loading]);

  async function sendMessage() {
    const content = text.trim();
    if (!content || !user?.id || !orderId) return;
    setSending(true);
    setText('');
    const { error } = await supabase
      .from('order_messages')
      .insert({ order_id: orderId, sender_id: user.id, sender_role: 'customer', content });
    if (error) setText(content);
    setSending(false);
  }

  const renderItem = ({ item }: { item: Message }) => {
    const isMe = item.sender_id === user?.id;
    return (
      <View style={[ms.bubble, isMe ? ms.bubbleMe : ms.bubbleThem]}>
        {!isMe && <Text style={ms.senderLabel}>{transporterName ?? 'Transporter'}</Text>}
        <Text style={[ms.msgText, isMe && { color: '#fff' }]}>{item.content}</Text>
        <Text style={[ms.time, isMe && { color: 'rgba(255,255,255,0.65)' }]}>{formatTime(item.created_at)}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: PRIMARY }} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={PRIMARY} />

      {/* Header */}
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn} hitSlop={12}>
          <ArrowLeft size={20} color="#FFFFFF" strokeWidth={2.5} />
        </Pressable>
        <View style={s.transporterInfo}>
          <View style={s.transporterAvatar}>
            <Truck size={18} color="#FFFFFF" strokeWidth={2} />
          </View>
          <View style={{ gap: 1 }}>
            <Text style={s.transporterName}>{transporterName ?? 'Transporter'}</Text>
            <Text style={s.transporterStatus}>Delivery Partner · Online</Text>
          </View>
        </View>
        <Pressable style={s.phoneBtn} hitSlop={12}>
          <Phone size={18} color="#FFFFFF" strokeWidth={2} />
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: BG }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {loading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color={PRIMARY} size="large" />
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={i => i.id}
            contentContainerStyle={s.msgList}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={s.emptyChat}>
                <View style={s.emptyChatIcon}>
                  <Truck size={32} color="#0F172A" strokeWidth={1.5} />
                </View>
                <Text style={s.emptyChatTitle}>Start the conversation</Text>
                <Text style={s.emptyChatSub}>
                  Coordinate delivery details, timing, and location with your delivery partner
                </Text>
              </View>
            }
            renderItem={renderItem}
          />
        )}

        {/* Input bar */}
        <View style={s.inputBar}>
          <TextInput
            style={s.input}
            placeholder="Type a message…"
            placeholderTextColor={HINT}
            value={text}
            onChangeText={setText}
            multiline
            maxLength={500}
            onSubmitEditing={sendMessage}
          />
          <Pressable
            style={[s.sendBtn, (!text.trim() || sending) && s.sendBtnDis]}
            onPress={sendMessage}
            disabled={!text.trim() || sending}
          >
            {sending
              ? <ActivityIndicator size="small" color="#fff" />
              : <Send size={18} color="#FFFFFF" strokeWidth={2.5} />}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const ms = StyleSheet.create({
  bubble:     { maxWidth: '78%', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 6, gap: 3 },
  bubbleMe:   { backgroundColor: PRIMARY, alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  bubbleThem: { backgroundColor: SURF, alignSelf: 'flex-start', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: BORDER },
  senderLabel:{ fontFamily: R_MED, fontSize: 10, color: MUTED, marginBottom: 2 },
  msgText:    { fontFamily: R_REG, fontSize: 14, color: TEXT, lineHeight: 20 },
  time:       { fontFamily: R_REG, fontSize: 10, color: MUTED, alignSelf: 'flex-end', marginTop: 2 },
});

const s = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 14, paddingBottom: 14, paddingTop: 8, backgroundColor: PRIMARY,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center',
  },
  transporterInfo:   { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  transporterAvatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center',
  },
  transporterName:   { fontFamily: R_BOLD, fontSize: 15, color: '#fff' },
  transporterStatus: { fontFamily: R_REG, fontSize: 11, color: 'rgba(255,255,255,0.65)' },
  phoneBtn: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center',
  },
  msgList: { padding: 16, paddingBottom: 8, gap: 2 },
  emptyChat: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 10, paddingHorizontal: 40 },
  emptyChatIcon: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: SURF,
    borderWidth: 1, borderColor: BORDER, alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  emptyChatTitle: { fontFamily: R_BOLD, fontSize: 17, color: TEXT },
  emptyChatSub:   { fontFamily: R_REG, fontSize: 13, color: MUTED, textAlign: 'center', lineHeight: 19 },
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 10,
    padding: 12, paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    backgroundColor: SURF, borderTopWidth: 1, borderTopColor: BORDER,
  },
  input: {
    flex: 1, backgroundColor: BG, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10,
    fontFamily: R_REG, fontSize: 14, color: TEXT, maxHeight: 100,
    borderWidth: 1, borderColor: BORDER,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {}),
  },
  sendBtn:    { width: 46, height: 46, borderRadius: 23, backgroundColor: PRIMARY, alignItems: 'center', justifyContent: 'center' },
  sendBtnDis: { opacity: 0.45 },
});
