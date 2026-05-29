/**
 * TicketCard — minimal row used in ticket lists.
 * Linear / Notion Inbox style: subject prominent, meta secondary.
 */
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { StatusChip, PriorityChip } from './Chips';
import { SupportTheme as T, relativeTime } from './theme';
import type { Ticket } from '@/services/support/tickets';

export function TicketCard({
  ticket, onPress, showRequester = false,
}: {
  ticket: Ticket;
  onPress: () => void;
  showRequester?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [s.card, pressed && { backgroundColor: '#FAFBFC' }]}
    >
      <View style={s.topRow}>
        <Text style={s.number}>{ticket.ticket_number}</Text>
        <Text style={s.time}>{relativeTime(ticket.last_message_at)}</Text>
      </View>

      <Text style={s.subject} numberOfLines={2}>{ticket.subject}</Text>

      <View style={s.metaRow}>
        <StatusChip status={ticket.status} />
        <PriorityChip priority={ticket.priority} />
        {showRequester && (
          <Text style={s.role}>{ticket.created_by_role.replace('_', ' ')}</Text>
        )}
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: T.card,
    borderWidth: 1, borderColor: T.border,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 10,
  },
  topRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  number: {
    fontFamily: T.font.semiBold,
    fontSize: 11,
    color: T.textFaint,
    letterSpacing: 0.6,
  },
  time: {
    fontFamily: T.font.regular,
    fontSize: 11.5,
    color: T.textFaint,
  },
  subject: {
    fontFamily: T.font.semiBold,
    fontSize: 14.5,
    color: T.ink,
    lineHeight: 20,
    letterSpacing: -0.2,
  },
  metaRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    flexWrap: 'wrap',
  },
  role: {
    fontFamily: T.font.medium,
    fontSize: 11,
    color: T.textMuted,
    textTransform: 'capitalize',
    marginLeft: 4,
  },
});
