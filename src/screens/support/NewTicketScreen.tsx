/**
 * NewTicketScreen — create a new support ticket.
 * Single column form. Category & priority chosen via subtle chip selectors.
 * (Attachment upload is stubbed — wires up later via Supabase Storage.)
 */
import React, { useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet, ScrollView,
  ActivityIndicator, SafeAreaView, StatusBar, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Paperclip } from 'lucide-react-native';
import { useAuth } from '@/services/auth/AuthProvider';
import {
  createTicket,
  CATEGORY_OPTIONS, PRIORITY_OPTIONS,
  type TicketCategory, type TicketPriority, type UserRole,
} from '@/services/support/tickets';
import { SupportTheme as T, priorityPalette } from '@/components/support/theme';

export function NewTicketScreen({ basePath }: { basePath: string }) {
  const router  = useRouter();
  const { profile } = useAuth();

  const [subject,     setSubject]     = useState('');
  const [description, setDescription] = useState('');
  const [category,    setCategory]    = useState<TicketCategory>('other');
  const [priority,    setPriority]    = useState<TicketPriority>('medium');
  const [submitting,  setSubmitting]  = useState(false);
  const [error,       setError]       = useState<string | null>(null);

  const canSubmit = subject.trim().length >= 4 && description.trim().length >= 10;

  async function submit() {
    if (!profile) { setError('You must be signed in to create a ticket.'); return; }
    if (!canSubmit) { setError('Subject (4+ chars) and description (10+ chars) are required.'); return; }

    setSubmitting(true);
    setError(null);
    try {
      const t = await createTicket(
        { subject, description, category, priority },
        profile.id,
        profile.role as UserRole,
      );
      router.replace(`${basePath}/${t.id}` as never);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to create ticket. Please try again.');
      setSubmitting(false);
    }
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
            <Text style={s.title}>New ticket</Text>
            <View style={{ width: 38 }} />
          </View>

          <ScrollView
            contentContainerStyle={s.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            <Text style={s.eyebrow}>RAISE A REQUEST</Text>
            <Text style={s.heading}>How can we help?</Text>
            <Text style={s.lede}>
              Share the details below — our team will reply with an update in your ticket thread.
            </Text>

            {/* Subject */}
            <View style={s.field}>
              <Text style={s.label}>Subject</Text>
              <TextInput
                style={s.input}
                value={subject}
                onChangeText={(v) => { setSubject(v); setError(null); }}
                placeholder="A short summary of your issue"
                placeholderTextColor={T.textFaint}
                maxLength={120}
              />
            </View>

            {/* Category */}
            <View style={s.field}>
              <Text style={s.label}>Category</Text>
              <View style={s.chipGrid}>
                {CATEGORY_OPTIONS.map(o => {
                  const active = o.value === category;
                  return (
                    <Pressable
                      key={o.value}
                      onPress={() => setCategory(o.value)}
                      style={[s.chip, active && s.chipActive]}
                    >
                      <Text style={[s.chipTxt, active && s.chipTxtActive]}>{o.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Priority */}
            <View style={s.field}>
              <Text style={s.label}>Priority</Text>
              <View style={s.chipGrid}>
                {PRIORITY_OPTIONS.map(o => {
                  const active = o.value === priority;
                  const p = priorityPalette(o.value);
                  return (
                    <Pressable
                      key={o.value}
                      onPress={() => setPriority(o.value)}
                      style={[
                        s.priChip,
                        { borderColor: active ? p.fg : T.border },
                        active && { backgroundColor: p.bg },
                      ]}
                    >
                      <View style={[s.priDot, { backgroundColor: p.fg }]} />
                      <Text style={[s.priTxt, active && { color: p.fg }]}>{o.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Description */}
            <View style={s.field}>
              <Text style={s.label}>Description</Text>
              <TextInput
                style={[s.input, s.textarea]}
                value={description}
                onChangeText={(v) => { setDescription(v); setError(null); }}
                placeholder="What happened? Include order IDs, timestamps and any context that helps us investigate."
                placeholderTextColor={T.textFaint}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
              />
            </View>

            {/* Attachment — stub */}
            <Pressable
              onPress={() => Alert.alert('Attachments', 'Attachment upload will be enabled in the next release.')}
              style={s.attachBtn}
            >
              <Paperclip size={15} color="#0F172A" strokeWidth={1.75} />
              <Text style={s.attachTxt}>Attach a file (optional)</Text>
            </Pressable>

            {error && <Text style={s.errorTxt}>{error}</Text>}
          </ScrollView>

          {/* Sticky CTA */}
          <View style={s.footer}>
            <Pressable
              onPress={submit}
              disabled={!canSubmit || submitting}
              style={({ pressed }) => [
                s.submit,
                !canSubmit && { opacity: 0.4 },
                pressed && canSubmit && { opacity: 0.92 },
              ]}
            >
              {submitting
                ? <ActivityIndicator color="#FFFFFF" size="small" />
                : <Text style={s.submitTxt}>Submit ticket</Text>}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },

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
  title: { fontFamily: T.font.semiBold, fontSize: 16, color: T.ink, letterSpacing: -0.2 },

  scroll: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 24 },

  eyebrow: {
    fontFamily: T.font.semiBold, fontSize: 10.5, color: T.textFaint,
    letterSpacing: 1.6, marginBottom: 8,
  },
  heading: {
    fontFamily: T.font.bold, fontSize: 24, color: T.ink,
    letterSpacing: -0.6, lineHeight: 30, marginBottom: 8,
  },
  lede: {
    fontFamily: T.font.regular, fontSize: 13.5, color: T.textMuted,
    lineHeight: 20, marginBottom: 24, maxWidth: 460,
  },

  field: { marginBottom: 18 },
  label: {
    fontFamily: T.font.semiBold, fontSize: 11, color: T.textMuted,
    letterSpacing: 1.4, marginBottom: 8,
  },
  input: {
    backgroundColor: T.card,
    borderWidth: 1, borderColor: T.border,
    borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    fontFamily: T.font.regular, fontSize: 14, color: T.ink,
    // @ts-ignore web
    outlineStyle: 'none',
  },
  textarea: {
    minHeight: 132, paddingVertical: 14,
    lineHeight: 21,
  },

  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1, borderColor: T.border,
    backgroundColor: T.card,
  },
  chipActive: {
    borderColor: T.ink, backgroundColor: T.ink,
  },
  chipTxt: {
    fontFamily: T.font.medium, fontSize: 12.5, color: T.textMuted,
    letterSpacing: -0.05,
  },
  chipTxtActive: {
    color: '#FFFFFF', fontFamily: T.font.semiBold,
  },

  priChip: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: T.card,
  },
  priDot: { width: 6, height: 6, borderRadius: 3 },
  priTxt: {
    fontFamily: T.font.medium, fontSize: 12.5, color: T.textMuted,
  },

  attachBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1, borderColor: T.border,
    borderStyle: 'dashed' as any,
    backgroundColor: T.card,
    alignSelf: 'flex-start',
  },
  attachTxt: { fontFamily: T.font.medium, fontSize: 13, color: T.textMuted },

  errorTxt: {
    fontFamily: T.font.medium, fontSize: 12.5, color: T.dangerFg,
    marginTop: 14,
  },

  footer: {
    paddingHorizontal: 20, paddingVertical: 14,
    borderTopWidth: 1, borderTopColor: T.border,
    backgroundColor: T.card,
  },
  submit: {
    height: 50,
    borderRadius: 12,
    backgroundColor: T.ink,
    alignItems: 'center', justifyContent: 'center',
  },
  submitTxt: {
    fontFamily: T.font.semiBold, fontSize: 14.5, color: '#FFFFFF',
    letterSpacing: -0.1,
  },
});
