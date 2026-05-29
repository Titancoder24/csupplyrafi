/**
 * Support ticket service — multi-role API over Supabase.
 * RLS gates access: customers/vendors/transporters see only their own tickets,
 * admins/super_admins see everything.
 *
 * Tables: tickets, ticket_messages, ticket_activity
 * See: supabase/migrations/20260515_002_support_tickets.sql
 */
import { supabase } from '@/services/supabase';

/* ─── Enums (mirror DB) ───────────────────────────────────────────────────── */
export type TicketStatus   = 'open' | 'in_review' | 'waiting_user' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'medium' | 'high' | 'critical';
export type TicketCategory =
  | 'payment_issue'
  | 'delivery_delay'
  | 'vendor_verification'
  | 'technical_problem'
  | 'refund'
  | 'account_issue'
  | 'other';

export type TicketEventKind =
  | 'status_changed'
  | 'priority_changed'
  | 'assigned'
  | 'closed'
  | 'reopened'
  | 'note_added';

export type UserRole = 'customer' | 'vendor' | 'transporter' | 'admin' | 'super_admin' | 'system';

/* ─── Row shapes ──────────────────────────────────────────────────────────── */
export type Ticket = {
  id: string;
  ticket_number: string;
  created_by: string;
  created_by_role: UserRole;
  assigned_to: string | null;
  subject: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  attachment_url: string | null;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  last_message_at: string;
};

export type TicketMessage = {
  id: string;
  ticket_id: string;
  author_id: string;
  author_role: UserRole;
  body: string;
  attachment_url: string | null;
  created_at: string;
};

export type TicketActivity = {
  id: string;
  ticket_id: string;
  actor_id: string | null;
  kind: TicketEventKind;
  from_value: string | null;
  to_value: string | null;
  note: string | null;
  created_at: string;
};

/* ─── Display metadata ────────────────────────────────────────────────────── */
export const CATEGORY_OPTIONS: { value: TicketCategory; label: string }[] = [
  { value: 'payment_issue',       label: 'Payment Issue' },
  { value: 'delivery_delay',      label: 'Delivery Delay' },
  { value: 'vendor_verification', label: 'Vendor Verification' },
  { value: 'technical_problem',   label: 'Technical Problem' },
  { value: 'refund',              label: 'Refund' },
  { value: 'account_issue',       label: 'Account Issue' },
  { value: 'other',               label: 'Other' },
];

export const PRIORITY_OPTIONS: { value: TicketPriority; label: string }[] = [
  { value: 'low',      label: 'Low' },
  { value: 'medium',   label: 'Medium' },
  { value: 'high',     label: 'High' },
  { value: 'critical', label: 'Critical' },
];

export const STATUS_OPTIONS: { value: TicketStatus; label: string }[] = [
  { value: 'open',         label: 'Open' },
  { value: 'in_review',    label: 'In Review' },
  { value: 'waiting_user', label: 'Waiting for User' },
  { value: 'resolved',     label: 'Resolved' },
  { value: 'closed',       label: 'Closed' },
];

export function categoryLabel(c: TicketCategory): string {
  return CATEGORY_OPTIONS.find(o => o.value === c)?.label ?? c;
}
export function priorityLabel(p: TicketPriority): string {
  return PRIORITY_OPTIONS.find(o => o.value === p)?.label ?? p;
}
export function statusLabel(s: TicketStatus): string {
  return STATUS_OPTIONS.find(o => o.value === s)?.label ?? s;
}

/* ─── Filters ─────────────────────────────────────────────────────────────── */
export type ListFilter = {
  status?: TicketStatus | 'all';
  priority?: TicketPriority | 'all';
  scope?: 'mine' | 'all';   // 'mine' = created_by = me (default for non-admin)
  search?: string;
};

/* ─── Queries ─────────────────────────────────────────────────────────────── */
export async function listTickets(filter: ListFilter = {}): Promise<Ticket[]> {
  let q = supabase
    .from('tickets')
    .select('*')
    .order('last_message_at', { ascending: false });

  if (filter.status && filter.status !== 'all') q = q.eq('status', filter.status);
  if (filter.priority && filter.priority !== 'all') q = q.eq('priority', filter.priority);
  if (filter.search) q = q.ilike('subject', `%${filter.search}%`);

  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as Ticket[];
}

export async function getTicket(id: string): Promise<Ticket | null> {
  const { data, error } = await supabase
    .from('tickets').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data as Ticket | null;
}

export async function listMessages(ticketId: string): Promise<TicketMessage[]> {
  const { data, error } = await supabase
    .from('ticket_messages')
    .select('*')
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as TicketMessage[];
}

export async function listActivity(ticketId: string): Promise<TicketActivity[]> {
  const { data, error } = await supabase
    .from('ticket_activity')
    .select('*')
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as TicketActivity[];
}

/* ─── Mutations ───────────────────────────────────────────────────────────── */
export type NewTicketInput = {
  subject: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  attachment_url?: string | null;
};

export async function createTicket(
  input: NewTicketInput,
  userId: string,
  userRole: UserRole,
): Promise<Ticket> {
  // ── Diagnostic: probe the table first so we surface a clear error ──
  // If this select fails, the table itself isn't reachable from the client.
  const probe = await supabase.from('tickets').select('id').limit(1);
  // eslint-disable-next-line no-console
  console.log('[tickets.createTicket] probe →', { error: probe.error, count: probe.data?.length });

  const payload = {
    subject:         input.subject.trim(),
    description:     input.description.trim(),
    category:        input.category,
    priority:        input.priority,
    created_by:      userId,
    created_by_role: userRole,
    status:          'open',
  };
  // eslint-disable-next-line no-console
  console.log('[tickets.createTicket] insert payload →', payload);

  const { data, error } = await supabase
    .from('tickets')
    .insert(payload)
    .select('*')
    .single();

  if (error) {
    // eslint-disable-next-line no-console
    console.error('[tickets.createTicket] full error →', error);
    throw error;
  }
  return data as Ticket;
}

export async function postMessage(
  ticketId: string,
  body: string,
  authorId: string,
  authorRole: UserRole,
  attachment_url?: string | null,
): Promise<TicketMessage> {
  const { data, error } = await supabase
    .from('ticket_messages')
    .insert({
      ticket_id:      ticketId,
      author_id:      authorId,
      author_role:    authorRole,
      body:           body.trim(),
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as TicketMessage;
}

export async function updateTicketStatus(
  ticketId: string,
  status: TicketStatus,
  actorId: string,
  prevStatus?: TicketStatus,
): Promise<void> {
  const { error: tErr } = await supabase
    .from('tickets').update({ status }).eq('id', ticketId);
  if (tErr) throw tErr;

  await supabase.from('ticket_activity').insert({
    ticket_id:  ticketId,
    actor_id:   actorId,
    kind:       status === 'closed' || status === 'resolved' ? 'closed' : 'status_changed',
    from_value: prevStatus ?? null,
    to_value:   status,
  });
}

export async function updateTicketPriority(
  ticketId: string,
  priority: TicketPriority,
  actorId: string,
  prevPriority?: TicketPriority,
): Promise<void> {
  const { error } = await supabase
    .from('tickets').update({ priority }).eq('id', ticketId);
  if (error) throw error;

  await supabase.from('ticket_activity').insert({
    ticket_id:  ticketId,
    actor_id:   actorId,
    kind:       'priority_changed',
    from_value: prevPriority ?? null,
    to_value:   priority,
  });
}

export async function assignTicket(
  ticketId: string,
  assigneeId: string | null,
  actorId: string,
): Promise<void> {
  const { error } = await supabase
    .from('tickets').update({ assigned_to: assigneeId }).eq('id', ticketId);
  if (error) throw error;

  await supabase.from('ticket_activity').insert({
    ticket_id:  ticketId,
    actor_id:   actorId,
    kind:       'assigned',
    to_value:   assigneeId,
  });
}
