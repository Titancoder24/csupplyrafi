/**
 * Status & priority chips — restrained enterprise pills.
 * No glassmorphism, no gradients, no neon.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { statusLabel, priorityLabel, type TicketStatus, type TicketPriority } from '@/services/support/tickets';
import { statusPalette, priorityPalette, SupportTheme as T } from './theme';

export function StatusChip({ status }: { status: TicketStatus }) {
  const p = statusPalette(status);
  return (
    <View style={[s.chip, { backgroundColor: p.bg, borderColor: p.bd }]}>
      <View style={[s.dot, { backgroundColor: p.fg }]} />
      <Text style={[s.txt, { color: p.fg }]}>{statusLabel(status)}</Text>
    </View>
  );
}

export function PriorityChip({ priority }: { priority: TicketPriority }) {
  const p = priorityPalette(priority);
  return (
    <View style={[s.chip, { backgroundColor: p.bg, borderColor: p.bd }]}>
      <Text style={[s.txt, { color: p.fg }]}>{priorityLabel(priority)}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  dot: { width: 5, height: 5, borderRadius: 2.5 },
  txt: {
    fontFamily: T.font.semiBold,
    fontSize: 11,
    letterSpacing: 0.2,
  },
});
