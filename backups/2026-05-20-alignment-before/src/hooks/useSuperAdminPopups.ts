/**
 * useSuperAdminPopups — Realtime-driven popup queue for super admin.
 * Fires when new orders, products, transport requests come in or
 * when a pickup/delivery awaits confirmation.
 *
 * Returns a single active popup at a time + actions to handle it.
 * Each popup can be Approved, Rejected, or dismissed (Later).
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/services/supabase';
import { toast } from '@/services/toast';

type OrderCustomerGst = {
  hasGst?: boolean;
  gstNumber?: string;
  businessName?: string;
  fullName?: string;
} | null;

export type PendingPopup =
  | {
      kind: 'new_order';
      orderId: string;
      orderNumber: string;
      amount?: number;
      customerName?: string;
      customerPhone?: string;
      gst?: OrderCustomerGst;
      vendorNames?: string[];
      vendorPhone?: string;
    }
  | { kind: 'pickup';      orderId: string; orderNumber: string }
  | { kind: 'delivery';    orderId: string; orderNumber: string }
  | { kind: 'new_product'; productId: string; productName: string };

export function useSuperAdminPopups() {
  const [queue, setQueue] = useState<PendingPopup[]>([]);
  const [loading, setLoading] = useState(false);
  const seenIds = useRef<Set<string>>(new Set());

  const current = queue[0] ?? null;

  const enqueue = useCallback((p: PendingPopup) => {
    const key = `${p.kind}:${'orderId' in p ? p.orderId : p.productId}`;
    if (seenIds.current.has(key)) return;
    seenIds.current.add(key);
    setQueue(prev => [...prev, p]);
  }, []);

  const dequeue = useCallback(() => {
    setQueue(prev => prev.slice(1));
  }, []);

  /* ── Subscribe to realtime events ─────────────────────────────────────── */
  useEffect(() => {
    const suffix = Math.random().toString(36).slice(2, 10);
    const ch = supabase.channel(`sa-action-popups:${suffix}`)
      // New order placed
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, async (payload: any) => {
        if (payload.new?.status !== 'placed') return;
        const o = payload.new;

        // Enqueue immediately with what we have; enrich asynchronously.
        const base: PendingPopup = {
          kind: 'new_order',
          orderId: o.id,
          orderNumber: o.order_number ?? '—',
          amount: o.total_amount,
          gst: o.customer_gst ?? null,
        };
        enqueue(base);

        // Fetch customer + vendor details and merge into the popup in the queue
        try {
          const [custRes, itemsRes] = await Promise.all([
            o.customer_id
              ? supabase.from('profiles').select('full_name, phone').eq('id', o.customer_id).maybeSingle()
              : Promise.resolve({ data: null }),
            supabase.from('order_items').select('products(vendor_id)').eq('order_id', o.id),
          ]);

          const customerName  = (custRes.data as any)?.full_name as string | undefined;
          const customerPhone = (custRes.data as any)?.phone as string | undefined;

          const vIds = Array.from(new Set(
            ((itemsRes.data ?? []) as any[])
              .map((it: any) => it.products?.vendor_id)
              .filter(Boolean) as string[]
          ));

          let vendorNames: string[] = [];
          let vendorPhone: string | undefined;
          if (vIds.length) {
            const [vpRes, prRes] = await Promise.all([
              supabase.from('vendor_profiles').select('id, shop_name').in('id', vIds),
              supabase.from('profiles').select('id, full_name, phone').in('id', vIds),
            ]);
            const vps = (vpRes.data ?? []) as any[];
            const prs = (prRes.data ?? []) as any[];
            vendorNames = vIds.map(id =>
              vps.find((v: any) => v.id === id)?.shop_name ||
              prs.find((p: any) => p.id === id)?.full_name ||
              'Unknown vendor'
            );
            if (vIds.length === 1) {
              vendorPhone = prs.find((p: any) => p.id === vIds[0])?.phone;
            }
          }

          setQueue(prev => prev.map(p =>
            p.kind === 'new_order' && p.orderId === o.id
              ? { ...p, customerName, customerPhone, vendorNames, vendorPhone }
              : p
          ));
        } catch {
          // best-effort enrichment; popup still works without it
        }
      })
      // Order status changes — pickup / delivery confirmation
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, (payload: any) => {
        const newS = payload.new?.status;
        const oldS = payload.old?.status;
        if (newS === oldS) return;
        if (newS === 'pending_admin_pickup_confirmation') {
          enqueue({ kind: 'pickup', orderId: payload.new.id, orderNumber: payload.new.order_number ?? '—' });
        }
        if (newS === 'pending_admin_confirmation') {
          enqueue({ kind: 'delivery', orderId: payload.new.id, orderNumber: payload.new.order_number ?? '—' });
        }
      })
      // New product in draft status
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'products' }, (payload: any) => {
        if (payload.new?.status === 'draft') {
          enqueue({
            kind: 'new_product',
            productId: payload.new.id,
            productName: payload.new.name ?? 'Product',
          });
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [enqueue]);

  /* ── Actions ─────────────────────────────────────────────────────────── */
  async function approve() {
    if (!current) return;
    setLoading(true);
    try {
      let err: { message: string } | null = null;
      if (current.kind === 'new_order') {
        const r = await supabase.from('orders').update({ status: 'vendor_pending', updated_at: new Date().toISOString() }).eq('id', current.orderId);
        err = r.error;
        if (!err) toast.success('Order approved', `#${current.orderNumber} sent to vendor`);
      } else if (current.kind === 'pickup') {
        const r = await supabase.from('orders').update({ status: 'picked_up' }).eq('id', current.orderId);
        err = r.error;
        if (!err) toast.success('Pickup confirmed', `#${current.orderNumber}`);
      } else if (current.kind === 'delivery') {
        const r = await supabase.from('orders').update({ status: 'delivered', delivered_at: new Date().toISOString() }).eq('id', current.orderId);
        err = r.error;
        if (!err) toast.success('Delivery confirmed', `#${current.orderNumber}`);
      } else if (current.kind === 'new_product') {
        const r = await supabase.rpc('approve_product', { product_id: current.productId });
        if (r.error) {
          const r2 = await supabase.from('products').update({ status: 'active' }).eq('id', current.productId);
          err = r2.error;
        }
        if (!err) toast.success('Product approved', current.productName);
      }
      if (err) {
        toast.show('Approve failed', err.message, 'error');
        return;
      }
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
      if (current.kind === 'new_order') {
        await supabase.from('orders').update({ status: 'cancelled', cancelled_reason: 'Rejected by super admin' }).eq('id', current.orderId);
        toast.show('Order rejected', `#${current.orderNumber}`, 'warning');
      } else if (current.kind === 'new_product') {
        const { error } = await supabase.rpc('reject_product', { product_id: current.productId, reason: 'Rejected by super admin' });
        if (error) await supabase.from('products').update({ status: 'inactive' }).eq('id', current.productId);
        toast.show('Product rejected', current.productName, 'warning');
      }
    } finally {
      setLoading(false);
      dequeue();
    }
  }

  function later() {
    // Just dequeue — the row stays in the admin's lists waiting
    dequeue();
  }

  return { current, loading, approve, reject, later };
}
