/**
 * useVendorPopups — Realtime popup queue for vendors.
 * Fires when a new order (vendor_pending) arrives that needs accept/reject.
 */
import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/services/supabase';
import { toast } from '@/services/toast';
import { useAuth } from '@/services/auth/AuthProvider';

export type VendorPopup =
  | { kind: 'new_order'; orderId: string; orderNumber: string; amount?: number };

export function useVendorPopups() {
  const { profile } = useAuth();
  const [queue, setQueue] = useState<VendorPopup[]>([]);
  const [loading, setLoading] = useState(false);
  const seenIds = useRef<Set<string>>(new Set());

  const current = queue[0] ?? null;

  const enqueue = useCallback((p: VendorPopup) => {
    const key = `${p.kind}:${p.orderId}`;
    if (seenIds.current.has(key)) return;
    seenIds.current.add(key);
    setQueue(prev => [...prev, p]);
  }, []);

  const dequeue = useCallback(() => setQueue(prev => prev.slice(1)), []);

  useEffect(() => {
    if (!profile?.id) return;
    const suffix = Math.random().toString(36).slice(2, 10);
    const ch = supabase.channel(`vendor-action-popups:${profile.id}:${suffix}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders', filter: `vendor_id=eq.${profile.id}` },
        (payload: any) => {
          // Only fire on vendor_pending — never on `placed` (which is pre super-admin approval)
          if (payload.new?.status === 'vendor_pending') {
            enqueue({
              kind: 'new_order',
              orderId: payload.new.id,
              orderNumber: payload.new.order_number ?? '—',
              amount: payload.new.total_amount,
            });
          }
        },
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders', filter: `vendor_id=eq.${profile.id}` },
        (payload: any) => {
          const newS = payload.new?.status;
          const oldS = payload.old?.status;
          if (newS === 'vendor_pending' && oldS !== 'vendor_pending') {
            enqueue({
              kind: 'new_order',
              orderId: payload.new.id,
              orderNumber: payload.new.order_number ?? '—',
              amount: payload.new.total_amount,
            });
          }
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [profile?.id, enqueue]);

  async function approve() {
    if (!current) return;
    setLoading(true);
    try {
      const { error: uErr } = await supabase
        .from('orders')
        .update({ status: 'transporter_pending' })
        .eq('id', current.orderId);
      if (uErr) {
        toast.show('Approve failed', uErr.message, 'error');
        return;
      }
      const { error: eErr } = await supabase.from('order_events').insert({
        order_id: current.orderId,
        event_type: 'vendor_accepted_broadcast',
        actor_id: profile!.id,
        actor_role: 'vendor',
        payload: {},
      });
      if (eErr) console.warn('order_events insert failed:', eErr.message);
      toast.success('Order Accepted', `#${current.orderNumber} broadcast to transporters`);
      dequeue();
    } catch (e: any) {
      toast.show('Approve crashed', e?.message ?? 'Unexpected error', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function reject() {
    if (!current) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('orders').update({
        status: 'vendor_rejected',
        cancelled_reason: 'Vendor declined',
      }).eq('id', current.orderId);
      if (error) {
        toast.show('Reject failed', error.message, 'error');
        return;
      }
      toast.show('Order Rejected', `#${current.orderNumber}`, 'warning');
      dequeue();
    } catch (e: any) {
      toast.show('Reject crashed', e?.message ?? 'Unexpected error', 'error');
    } finally {
      setLoading(false);
    }
  }

  function later() { dequeue(); }

  return { current, loading, approve, reject, later };
}
