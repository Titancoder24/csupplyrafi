/**
 * Realtime Service — Supabase Realtime subscriptions for:
 *   - Live bid updates (transporter marketplace)
 *   - Order status changes
 *   - Transport tracking
 *   - Admin approval queue changes
 *   - User notifications
 */

import { supabase } from '@/services/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { Bid, Order, TransportRequest, Notification } from '@/services/workflow/types';

type UnsubFn = () => void;

// ── Bid feed for a specific transport job ─────────────────────────
// Used by: Vendor watching incoming bids on their transport request

export function subscribeToBids(
  transportId: string,
  onBid: (bid: Bid, eventType: 'INSERT' | 'UPDATE') => void,
): UnsubFn {
  const channel = supabase
    .channel(`bids:transport:${transportId}`)
    .on(
      'postgres_changes',
      {
        event:  '*',
        schema: 'public',
        table:  'bids',
        filter: `transport_id=eq.${transportId}`,
      },
      (payload) => {
        const eventType = payload.eventType as 'INSERT' | 'UPDATE';
        if (eventType === 'INSERT' || eventType === 'UPDATE') {
          onBid(payload.new as Bid, eventType);
        }
      },
    )
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}

// ── Marketplace transport feed ────────────────────────────────────
// Used by: Transporter watching for new available jobs

export function subscribeToMarketplace(
  onJob: (transport: TransportRequest, eventType: 'INSERT' | 'UPDATE') => void,
): UnsubFn {
  const channel = supabase
    .channel('transport:marketplace')
    .on(
      'postgres_changes',
      {
        event:  '*',
        schema: 'public',
        table:  'transport_requests',
        filter: `status=eq.marketplace_open`,
      },
      (payload) => {
        const eventType = payload.eventType as 'INSERT' | 'UPDATE';
        onJob(payload.new as TransportRequest, eventType);
      },
    )
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}

// ── Order status stream ───────────────────────────────────────────
// Used by: Customer watching their order progress

export function subscribeToOrder(
  orderId: string,
  onUpdate: (order: Order) => void,
): UnsubFn {
  const channel = supabase
    .channel(`order:${orderId}`)
    .on(
      'postgres_changes',
      {
        event:  'UPDATE',
        schema: 'public',
        table:  'orders',
        filter: `id=eq.${orderId}`,
      },
      (payload) => { onUpdate(payload.new as Order); },
    )
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}

// ── Live transport tracking ───────────────────────────────────────
// Used by: Customer / Vendor watching transporter location + status

export function subscribeToTransportTracking(
  transportId: string,
  onUpdate: (transport: TransportRequest) => void,
): UnsubFn {
  const channel = supabase
    .channel(`transport:tracking:${transportId}`)
    .on(
      'postgres_changes',
      {
        event:  'UPDATE',
        schema: 'public',
        table:  'transport_requests',
        filter: `id=eq.${transportId}`,
      },
      (payload) => { onUpdate(payload.new as TransportRequest); },
    )
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}

// ── Admin approval queue ──────────────────────────────────────────
// Used by: Super admin dashboard watching for new approvals needed

export function subscribeToAdminQueue(
  onProductChange:   (payload: { new: Record<string, unknown>; eventType: string }) => void,
  onOrderChange:     (payload: { new: Record<string, unknown>; eventType: string }) => void,
  onTransportChange: (payload: { new: Record<string, unknown>; eventType: string }) => void,
): UnsubFn {
  const channels: RealtimeChannel[] = [];
  const suffix = Math.random().toString(36).slice(2, 10);

  channels.push(
    supabase.channel(`admin:products:${suffix}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'products',
        filter: 'status=eq.pending_approval',
      }, (p) => onProductChange({ new: p.new as Record<string, unknown>, eventType: p.eventType }))
      .subscribe(),

    supabase.channel(`admin:orders:${suffix}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'orders',
        filter: 'status=eq.waiting_approval',
      }, (p) => onOrderChange({ new: p.new as Record<string, unknown>, eventType: p.eventType }))
      .subscribe(),

    supabase.channel(`admin:transport:${suffix}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'transport_requests',
        filter: 'status=eq.waiting_admin_approval',
      }, (p) => onTransportChange({ new: p.new as Record<string, unknown>, eventType: p.eventType }))
      .subscribe(),
  );

  return () => { channels.forEach(c => supabase.removeChannel(c)); };
}

// ── User notifications stream ─────────────────────────────────────
// Used by: Any user watching their notification bell

export function subscribeToNotifications(
  userId: string,
  onNotification: (n: Notification) => void,
): UnsubFn {
  const channel = supabase
    .channel(`notifications:${userId}`)
    .on(
      'postgres_changes',
      {
        event:  'INSERT',
        schema: 'public',
        table:  'notifications',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => { onNotification(payload.new as Notification); },
    )
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}

// ── Transporter: watch assigned job ───────────────────────────────

export function subscribeToAssignedJob(
  transporterId: string,
  onAssignment: (transport: TransportRequest) => void,
): UnsubFn {
  const channel = supabase
    .channel(`transport:assigned:${transporterId}`)
    .on(
      'postgres_changes',
      {
        event:  'UPDATE',
        schema: 'public',
        table:  'transport_requests',
        filter: `assigned_transporter_id=eq.${transporterId}`,
      },
      (payload) => { onAssignment(payload.new as TransportRequest); },
    )
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}

// ── Notification helpers ──────────────────────────────────────────

export async function markNotificationRead(notificationId: string): Promise<void> {
  await supabase
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('id', notificationId);
}

export async function markAllNotificationsRead(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .eq('is_read', false);
}

export async function getUnreadNotifications(userId: string): Promise<Notification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .eq('is_read', false)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw new Error(error.message);
  return data as Notification[];
}

export async function getNotificationHistory(userId: string, page = 0) {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(page * 20, (page + 1) * 20 - 1);

  if (error) throw new Error(error.message);
  return data as Notification[];
}
