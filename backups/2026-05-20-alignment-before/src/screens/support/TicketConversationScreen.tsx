/**
 * TicketConversationScreen — shared by all roles.
 *
 * Layout:
 *  ─ Top: ticket number, subject, status, priority, created date
 *  ─ Middle: timeline (messages + activity events, merged & sorted)
 *  ─ Admin controls: visible only for admin / super_admin
 *  ─ Bottom: reply composer
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet, ScrollView,
  ActivityIndicator, SafeAreaView, StatusBar, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Send, Paperclip, ChevronDown, Check } from 'lucide-react-native';
import { useAuth } from '@/services/auth/AuthProvider';
import {
  getTicket, listMessages, listActivity, postMessage,
  updateTicketStatus, updateTicketPriority,
  STATUS_OPTIONS, PRIORITY_OPTIONS, categoryLabel, statusLabel, priorityLabel,
  type Ticket, type TicketMessage, type TicketActivity,
  type TicketStatus, type TicketPriority, type UserRole,
} from '@/services/support/tickets';
import { StatusChip, PriorityChip } from '@/components/support/Chips';
import { ConversationTimeline, buildThread } from '@/components/support/Conversation';
import { SupportTheme as T, fullDate, statusPalette, priorityPalette } from '@/components/support/theme';

export function TicketConversationScreen({ basePath }: { basePath: string }) {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const ticketId = params.id ?? '';
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';

  const [ticket, setTicket]     = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [activity, setActivity] = useState<TicketActivity[]>([]);
  const [loading, setLoading]   = useState(true);
  const [reply, setReply]       = useState('');
  const [sending, setSending]   = useState(false);
  const [busy, setBusy]         = useState(false);

  const [showStatusMenu, setShowStatusMenu]     = useState(false);
  const [showPriorityMenu, setShowPriorityMenu] = useState(false);

  const refresh = useCallback(async () => {
    if (!ticketId) return;
    try {
      const [t, m, a] = await Promise.all([
        getTicket(ticketId),
        listMessages(ticketId),
        listActivity(ticketId),
      ]);
      setTicket(t);
      setMessages(m);
      setActivity(a);
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  useEffect(() => { refresh(); }, [refresh]);

  const thread = useMemo(() => buildThread(messages, activity), [messages, activity]);

  const canReply = ticket && ticket.status !== 'closed';

  async function sendReply() {
    if (!profile || !ticket) return;
    if (reply.trim().length < 1) return;
    setSending(true);
    try {
      await postMessage(ticket.id, reply, profile.id, profile.role as UserRole);
      setReply('');
      await refresh();
    } catch (e: any) {
      Alert.alert('Reply failed', e?.message ?? 'Please try again.');
    } finally {
      setSending(false);
    }
  }

  async function setStatus(status: TicketStatus) {
    if (!profile || !ticket) return;
    setShowStatusMenu(false);
    setBusy(true);
    try {
      await updateTicketStatus(ticket.id, status, profile.id, ticket.status);
      await refresh();
    } finally { setBusy(false); }
  }

  async function setPriority(priority: TicketPriority) {
    if (!profile || !ticket) return;
    setShowPriorityMenu(false);
    setBusy(true);
    try {
      await updateTicketPriority(ticket.id, priority, profile.id, ticket.priority);
      await refresh();
    } finally { setBusy(false); }
  }

  if (loading) {
    return (
      <View style={[s.root, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color={T.textMuted} />
      </View>
    );
  }
  if (!ticket) {
    return (
      <View style={[s.root, s.center]}>
        <Text style={s.notFound}>Ticket not found.</Text>
        <Pressable onPress={() => router.back()} style={s.backLink}>
          <Text style={s.backLinkTxt}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor={T.bg} />

      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          {/* Top bar */}
          <View style={s.topBar}>
            <Pressable onPress={() => router.back()} hitSlop={10} style={s.backBtn}>
              <ArrowLeft size={18} color="#0F172A" strokeWidth={1.75} />
            </Pressable>
            <Text style={s.title}>{ticket.ticket_number}</Text>
            <View style={{ width: 38 }} />
          </View>

          <ScrollView
            contentContainerStyle={s.scroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header card */}
            <View style={s.headerCard}>
              <Text style={s.subject}>{ticket.subject}</Text>

              <View style={s.chipRow}>
                {isAdmin ? (
                  <Pressable onPress={() => setShowStatusMenu(v => !v)} style={s.chipBtn}>
                    <StatusChip status={ticket.status} />
                    <ChevronDown size={13} color="#0F172A" strokeWidth={1.75} />
                  </Pressable>
                ) : (
                  <StatusChip status={ticket.status} />
                )}

                {isAdmin ? (
                  <Pressable onPress={() => setShowPriorityMenu(v => !v)} style={s.chipBtn}>
                    <PriorityChip priority={ticket.priority} />
                    <ChevronDown size={13} color="#0F172A" strokeWidth={1.75} />
                  </Pressable>
                ) : (
                  <PriorityChip priority={ticket.priority} />
                )}
              </View>

              {showStatusMenu && (
                <Menu
                  options={STATUS_OPTIONS.map(o => ({ value: o.value, label: o.label }))}
                  current={ticket.status}
                  onPick={(v) => setStatus(v as TicketStatus)}
                />
              )}
              {showPriorityMenu && (
                <Menu
                  options={PRIORITY_OPTIONS.map(o => ({ value: o.value, label: o.label }))}
                  current={ticket.priority}
                  onPick={(v) => setPriority(v as TicketPriority)}
                />
              )}

              {/* Meta strip */}
              <View style={s.metaStrip}>
                <Meta label="Category"   value={categoryLabel(ticket.category)} />
                <Meta label="Created"    value={fullDate(ticket.created_at)} />
                <Meta label="Last reply" value={fullDate(ticket.last_message_at)} />
              </View>

              {/* Original description */}
              <View style={s.descBlock}>
                <Text style={s.descLabel}>DESCRIPTION</Text>
                <Text style={s.descBody}>{ticket.description}</Text>
              </View>
            </View>

            {/* Timeline */}
            <View style={s.timelineWrap}>
              <Text style={s.timelineHead}>ACTIVITY</Text>
              {thread.length === 0 ? (
                <View style={s.emptyThread}>
                  <Text style={s.emptyThreadTxt}>No replies yet.</Text>
                </View>
              ) : (
                <ConversationTimeline items={thread} currentUserId={profile?.id ?? ''} />
              )}
            </View>
          </ScrollView>

          {/* Reply composer */}
          {canReply ? (
            <View style={s.composer}>
              <View style={s.composerInputRow}>
                <TextInput
                  style={s.replyInput}
                  value={reply}
                  onChangeText={setReply}
                  placeholder={isAdmin ? 'Reply as C-Supply Support…' : 'Write a reply…'}
                  placeholderTextColor={T.textFaint}
                  multiline
                />
                <Pressable
                  onPress={() => Alert.alert('Attachments', 'Attachment upload will be enabled in the next release.')}
                  hitSlop={8}
                  style={s.attachBtn}
                >
                  <Paperclip size={16} color="#0F172A" strokeWidth={1.75} />
                </Pressable>
              </View>
              <Pressable
                onPress={sendReply}
                disabled={sending || reply.trim().length < 1}
                style={({ pressed }) => [
                  s.sendBtn,
                  (sending || reply.trim().length < 1) && { opacity: 0.4 },
                  pressed && reply.trim().length >= 1 && { opacity: 0.9 },
                ]}
              >
                {sending
                  ? <ActivityIndicator color="#FFFFFF" size="small" />
                  : <>
                      <Text style={s.sendTxt}>Send</Text>
                      <Send size={14} color="#FFFFFF" strokeWidth={2} />
                    </>}
              </Pressable>
            </View>
          ) : (
            <View style={s.closedBar}>
              <Text style={s.closedTxt}>This ticket is closed. {isAdmin ? 'Reopen via status menu above.' : 'Create a new ticket to continue.'}</Text>
            </View>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.meta}>
      <Text style={s.metaLabel}>{label}</Text>
      <Text style={s.metaValue}>{value}</Text>
    </View>
  );
}

function Menu({
  options, current, onPick,
}: {
  options: { value: string; label: string }[];
  current: string;
  onPick: (v: string) => void;
}) {
  return (
    <View style={s.menu}>
      {options.map(o => (
        <Pressable key={o.value} onPress={() => onPick(o.value)} style={s.menuRow}>
          <Text style={[s.menuTxt, o.value === current && { fontFamily: T.font.semiBold, color: T.ink }]}>
            {o.label}
          </Text>
          {o.value === current && <Check size={14} color="#0F172A" strokeWidth={2} />}
        </Pressable>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: T.bg },
  center: { alignItems: 'center', justifyContent: 'center', padding: 24 },

  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 14, paddingBottom: 12,
    backgroundColor: T.bg,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 10,
    borderWidth: 1, borderColor: T.border, backgroundColor: T.card,
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontFamily: T.font.semiBold, fontSize: 14, color: T.ink, letterSpacing: 0.4 },

  scroll: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 32 },

  notFound: { fontFamily: T.font.medium, fontSize: 14, color: T.textMuted, marginBottom: 12 },
  backLink:    { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, backgroundColor: T.ink },
  backLinkTxt: { fontFamily: T.font.semiBold, fontSize: 13, color: '#FFFFFF' },

  /* Header card */
  headerCard: {
    backgroundColor: T.card,
    borderWidth: 1, borderColor: T.border, borderRadius: 14,
    padding: 18,
    marginBottom: 20,
    gap: 14,
  },
  subject: {
    fontFamily: T.font.bold, fontSize: 19,
    color: T.ink, letterSpacing: -0.4, lineHeight: 26,
  },
  chipRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  chipBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingRight: 6, paddingVertical: 2,
    borderRadius: 7,
  },

  menu: {
    backgroundColor: T.card,
    borderWidth: 1, borderColor: T.border,
    borderRadius: 10,
    paddingVertical: 4,
    marginTop: 4,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  menuRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 10,
  },
  menuTxt: { fontFamily: T.font.medium, fontSize: 13, color: T.textMain },

  metaStrip: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 18,
    paddingTop: 12,
    borderTopWidth: 1, borderTopColor: T.divider,
  },
  meta: { gap: 3 },
  metaLabel: {
    fontFamily: T.font.semiBold, fontSize: 10, color: T.textFaint,
    letterSpacing: 1.2,
  },
  metaValue: {
    fontFamily: T.font.medium, fontSize: 12.5, color: T.inkSoft,
  },

  descBlock: {
    paddingTop: 12,
    borderTopWidth: 1, borderTopColor: T.divider,
    gap: 6,
  },
  descLabel: {
    fontFamily: T.font.semiBold, fontSize: 10, color: T.textFaint,
    letterSpacing: 1.2,
  },
  descBody: {
    fontFamily: T.font.regular, fontSize: 14, color: T.inkSoft, lineHeight: 22,
  },

  /* Timeline */
  timelineWrap: {
    backgroundColor: T.card,
    borderWidth: 1, borderColor: T.border, borderRadius: 14,
    paddingHorizontal: 18, paddingTop: 14, paddingBottom: 4,
  },
  timelineHead: {
    fontFamily: T.font.semiBold, fontSize: 10, color: T.textFaint,
    letterSpacing: 1.2, marginBottom: 4,
  },
  emptyThread: { paddingVertical: 24, alignItems: 'center' },
  emptyThreadTxt: { fontFamily: T.font.regular, fontSize: 13, color: T.textFaint },

  /* Composer */
  composer: {
    backgroundColor: T.card,
    borderTopWidth: 1, borderTopColor: T.border,
    paddingHorizontal: 16, paddingVertical: 12,
    gap: 8,
  },
  composerInputRow: {
    flexDirection: 'row', alignItems: 'flex-end',
    backgroundColor: T.bg,
    borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 6,
    gap: 8,
    borderWidth: 1, borderColor: T.border,
  },
  replyInput: {
    flex: 1,
    fontFamily: T.font.regular, fontSize: 14, color: T.ink,
    minHeight: 36, maxHeight: 120,
    paddingVertical: 8,
    // @ts-ignore web
    outlineStyle: 'none',
  },
  attachBtn: { padding: 8 },

  sendBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6,
    paddingVertical: 11, paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: T.ink,
    alignSelf: 'flex-end',
  },
  sendTxt: { fontFamily: T.font.semiBold, fontSize: 13, color: '#FFFFFF', letterSpacing: -0.1 },

  closedBar: {
    backgroundColor: T.neutralBg,
    borderTopWidth: 1, borderTopColor: T.border,
    paddingHorizontal: 16, paddingVertical: 14,
    alignItems: 'center',
  },
  closedTxt: { fontFamily: T.font.medium, fontSize: 12.5, color: T.textMuted },
});
