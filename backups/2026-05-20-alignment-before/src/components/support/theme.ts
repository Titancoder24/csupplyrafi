/**
 * Support feature design tokens.
 * Enterprise SaaS — Linear / Intercom / Zendesk aesthetic.
 * Neutral monochrome with restrained semantic accents.
 */
import { FontFamily } from '@/constants/theme';

export const SupportTheme = {
  /* Surfaces */
  bg:         '#F8FAFC',
  card:       '#FFFFFF',
  border:     '#E5E7EB',
  borderSoft: '#EEF0F3',
  divider:    '#F1F5F9',

  /* Ink */
  ink:        '#0E1422',
  inkSoft:    '#1F2937',
  textMain:   '#0E1422',
  textMuted:  '#6B7280',
  textFaint:  '#9CA3AF',

  /* Accents — used as 10–15% opacity chip backgrounds with deeper text */
  successFg: '#15803D', successBg: '#F0FDF4', successBd: '#BBF7D0',
  warnFg:    '#B45309', warnBg:    '#FFFBEB', warnBd:    '#FDE68A',
  dangerFg:  '#B91C1C', dangerBg:  '#FEF2F2', dangerBd:  '#FECACA',
  infoFg:    '#1D4ED8', infoBg:    '#EFF6FF', infoBd:    '#BFDBFE',
  neutralFg: '#374151', neutralBg: '#F3F4F6', neutralBd: '#E5E7EB',
  purpleFg:  '#6D28D9', purpleBg:  '#F5F3FF', purpleBd:  '#E0E7FF',

  font: FontFamily,
} as const;

/* ── status → chip palette ────────────────────────────────────────────── */
import type { TicketStatus, TicketPriority } from '@/services/support/tickets';

export function statusPalette(s: TicketStatus) {
  switch (s) {
    case 'open':         return { fg: SupportTheme.infoFg,    bg: SupportTheme.infoBg,    bd: SupportTheme.infoBd };
    case 'in_review':    return { fg: SupportTheme.purpleFg,  bg: SupportTheme.purpleBg,  bd: SupportTheme.purpleBd };
    case 'waiting_user': return { fg: SupportTheme.warnFg,    bg: SupportTheme.warnBg,    bd: SupportTheme.warnBd };
    case 'resolved':     return { fg: SupportTheme.successFg, bg: SupportTheme.successBg, bd: SupportTheme.successBd };
    case 'closed':       return { fg: SupportTheme.neutralFg, bg: SupportTheme.neutralBg, bd: SupportTheme.neutralBd };
  }
}

export function priorityPalette(p: TicketPriority) {
  switch (p) {
    case 'low':      return { fg: SupportTheme.neutralFg, bg: SupportTheme.neutralBg, bd: SupportTheme.neutralBd };
    case 'medium':   return { fg: SupportTheme.infoFg,    bg: SupportTheme.infoBg,    bd: SupportTheme.infoBd };
    case 'high':     return { fg: SupportTheme.warnFg,    bg: SupportTheme.warnBg,    bd: SupportTheme.warnBd };
    case 'critical': return { fg: SupportTheme.dangerFg,  bg: SupportTheme.dangerBg,  bd: SupportTheme.dangerBd };
  }
}

/* ── relative time helper ────────────────────────────────────────────── */
export function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const now  = Date.now();
  const diff = Math.max(0, now - then);
  const min  = Math.floor(diff / 60_000);
  if (min < 1)    return 'just now';
  if (min < 60)   return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24)    return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7)    return `${day}d ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function fullDate(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}
