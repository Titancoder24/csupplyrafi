/**
 * Conversation thread — Linear/Intercom style timeline.
 * Messages render as full-width rows with an author label and time —
 * NOT as chat bubbles. Activity events render as muted system lines.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SupportTheme as T, fullDate } from './theme';
import type { TicketMessage, TicketActivity } from '@/services/support/tickets';

type ThreadItem =
  | { kind: 'message';  data: TicketMessage }
  | { kind: 'activity'; data: TicketActivity };

export function buildThread(messages: TicketMessage[], activity: TicketActivity[]): ThreadItem[] {
  const items: ThreadItem[] = [
    ...messages.map(m => ({ kind: 'message'  as const, data: m })),
    ...activity.map(a => ({ kind: 'activity' as const, data: a })),
  ];
  items.sort((x, y) => x.data.created_at.localeCompare(y.data.created_at));
  return items;
}

export function ConversationTimeline({
  items, currentUserId,
}: {
  items: ThreadItem[];
  currentUserId: string;
}) {
  return (
    <View style={s.thread}>
      {items.map((it, i) => {
        const last = i === items.length - 1;
        if (it.kind === 'activity') {
          return <ActivityRow key={it.data.id} a={it.data} last={last} />;
        }
        return (
          <MessageRow
            key={it.data.id}
            m={it.data}
            isSelf={it.data.author_id === currentUserId}
            last={last}
          />
        );
      })}
    </View>
  );
}

function MessageRow({ m, isSelf, last }: { m: TicketMessage; isSelf: boolean; last: boolean }) {
  const isAdmin = m.author_role === 'admin' || m.author_role === 'super_admin';
  const author  = isSelf ? 'You' : isAdmin ? 'C-Supply Support' : m.author_role.replace('_', ' ');

  return (
    <View style={[s.item, !last && s.itemDivider]}>
      <View style={s.avatarRow}>
        <View style={[s.avatar, isAdmin && s.avatarAdmin]}>
          <Text style={[s.avatarTxt, isAdmin && s.avatarTxtAdmin]}>
            {isAdmin ? 'CS' : author.slice(0, 2).toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={s.authorRow}>
            <Text style={s.author}>{author}</Text>
            {isAdmin && <View style={s.adminPill}><Text style={s.adminPillTxt}>SUPPORT</Text></View>}
          </View>
          <Text style={s.time}>{fullDate(m.created_at)}</Text>
        </View>
      </View>
      <Text style={s.body}>{m.body}</Text>
    </View>
  );
}

function ActivityRow({ a, last }: { a: TicketActivity; last: boolean }) {
  let msg = '';
  switch (a.kind) {
    case 'status_changed':
      msg = `Status changed${a.from_value ? ` from ${a.from_value.replace('_', ' ')}` : ''} to ${a.to_value?.replace('_', ' ')}`;
      break;
    case 'priority_changed':
      msg = `Priority changed${a.from_value ? ` from ${a.from_value}` : ''} to ${a.to_value}`;
      break;
    case 'assigned':
      msg = a.to_value ? 'Ticket assigned to an admin' : 'Ticket unassigned';
      break;
    case 'closed':
      msg = `Ticket marked ${a.to_value?.replace('_', ' ')}`;
      break;
    case 'reopened':
      msg = 'Ticket reopened';
      break;
    case 'note_added':
      msg = a.note ?? 'Note added';
      break;
  }

  return (
    <View style={[s.activity, !last && s.activityDivider]}>
      <View style={s.activityDot} />
      <Text style={s.activityTxt}>{msg}</Text>
      <Text style={s.activityTime}>· {fullDate(a.created_at)}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  thread: {
    gap: 0,
  },
  item: {
    paddingVertical: 18,
    gap: 10,
  },
  itemDivider: {
    borderBottomWidth: 1,
    borderBottomColor: T.divider,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: T.neutralBg,
    borderWidth: 1, borderColor: T.border,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarAdmin: {
    backgroundColor: T.ink,
    borderColor: T.ink,
  },
  avatarTxt: {
    fontFamily: T.font.semiBold,
    fontSize: 11,
    color: T.textMuted,
    letterSpacing: 0.3,
  },
  avatarTxtAdmin: {
    color: '#FFFFFF',
  },
  authorRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  author: {
    fontFamily: T.font.semiBold,
    fontSize: 13.5,
    color: T.ink,
    letterSpacing: -0.1,
    textTransform: 'capitalize',
  },
  adminPill: {
    paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: T.neutralBg,
  },
  adminPillTxt: {
    fontFamily: T.font.semiBold,
    fontSize: 9,
    color: T.textMuted,
    letterSpacing: 0.8,
  },
  time: {
    fontFamily: T.font.regular,
    fontSize: 11.5,
    color: T.textFaint,
    marginTop: 1,
  },
  body: {
    fontFamily: T.font.regular,
    fontSize: 14,
    color: T.inkSoft,
    lineHeight: 22,
    paddingLeft: 42,
  },
  activity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingLeft: 12,
  },
  activityDivider: {
    borderBottomWidth: 1,
    borderBottomColor: T.divider,
  },
  activityDot: {
    width: 5, height: 5, borderRadius: 2.5,
    backgroundColor: T.textFaint,
  },
  activityTxt: {
    fontFamily: T.font.medium,
    fontSize: 12.5,
    color: T.textMuted,
    letterSpacing: -0.05,
  },
  activityTime: {
    fontFamily: T.font.regular,
    fontSize: 11.5,
    color: T.textFaint,
  },
});
