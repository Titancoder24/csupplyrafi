/**
 * Bid Engine — Rapido/Uber-style real-time price negotiation.
 *
 * POST /bid-engine  { action, transportId, bidId?, amount?, note? }
 *
 * Actions:
 *   place_bid       — transporter places initial bid
 *   counter_offer   — vendor counters with a lower price
 *   accept_bid      — vendor accepts current bid (assigns transporter)
 *   reject_bid      — vendor rejects, bid returns to marketplace
 *   withdraw_bid    — transporter withdraws own bid
 *   expire_bids     — system call to expire old pending bids (cron)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL     = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const BID_TTL_MINUTES  = 30; // each bid expires in 30 min if not responded

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  const authHeader = req.headers.get('Authorization');
  const sb         = createClient(SUPABASE_URL, SUPABASE_SERVICE);

  let actorId: string | null = null;
  let actorRole: string | null = null;

  if (authHeader) {
    const userClient = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (user) {
      const { data: profile } = await sb.from('profiles').select('id, role').eq('id', user.id).single();
      actorId   = profile?.id   ?? null;
      actorRole = profile?.role ?? null;
    }
  }

  let body: {
    action:      string;
    transportId: string;
    bidId?:      string;
    amount?:     number;
    note?:       string;
  };

  try { body = await req.json(); }
  catch { return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 }); }

  const { action, transportId, bidId, amount, note } = body;

  // ── System cron action (no auth required) ─────────────────────────
  if (action === 'expire_bids') {
    const { data: expired } = await sb
      .from('bids')
      .update({ status: 'expired' })
      .lt('expires_at', new Date().toISOString())
      .in('status', ['pending', 'countered'])
      .select('id, transport_id, transporter_id');

    // Re-open marketplace for jobs that had all bids expire
    if (expired && expired.length > 0) {
      const transportIds = [...new Set(expired.map((b: { transport_id: string }) => b.transport_id))];
      for (const tid of transportIds) {
        const { data: activeBids } = await sb
          .from('bids')
          .select('id')
          .eq('transport_id', tid)
          .in('status', ['pending', 'countered', 'accepted']);

        if (!activeBids || activeBids.length === 0) {
          await sb.from('transport_requests')
            .update({ status: 'marketplace_open' })
            .eq('id', tid)
            .in('status', ['bid_received', 'negotiating']);
        }
      }
    }

    return new Response(JSON.stringify({ success: true, expired_count: expired?.length ?? 0 }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!actorId) {
    return new Response(JSON.stringify({ error: 'Authentication required' }), { status: 401 });
  }

  // ── Fetch the transport request ────────────────────────────────────
  const { data: tr } = await sb
    .from('transport_requests')
    .select('id, status, vendor_id, vendor_proposed_price, assigned_transporter_id, bid_expiry_at')
    .eq('id', transportId)
    .single();

  if (!tr) {
    return new Response(JSON.stringify({ error: 'Transport request not found' }), { status: 404 });
  }

  // ── PLACE BID ──────────────────────────────────────────────────────
  if (action === 'place_bid') {
    if (actorRole !== 'transporter') {
      return new Response(JSON.stringify({ error: 'Only transporters can place bids' }), { status: 403 });
    }
    if (!['marketplace_open', 'bid_received'].includes(tr.status)) {
      return new Response(JSON.stringify({ error: 'Job is not open for bidding' }), { status: 422 });
    }
    if (tr.bid_expiry_at && new Date(tr.bid_expiry_at) < new Date()) {
      return new Response(JSON.stringify({ error: 'Bidding window has expired' }), { status: 422 });
    }
    if (!amount || amount <= 0) {
      return new Response(JSON.stringify({ error: 'Bid amount required' }), { status: 400 });
    }

    // Expire any previous bid from this transporter
    await sb.from('bids')
      .update({ status: 'expired' })
      .eq('transport_id', transportId)
      .eq('transporter_id', actorId)
      .in('status', ['pending', 'countered']);

    const expiresAt = new Date(Date.now() + BID_TTL_MINUTES * 60_000).toISOString();

    const { data: bid, error: bidErr } = await sb.from('bids').insert({
      transport_id:     transportId,
      transporter_id:   actorId,
      bid_amount:       amount,
      transporter_note: note,
      status:           'pending',
      expires_at:       expiresAt,
    }).select().single();

    if (bidErr) {
      return new Response(JSON.stringify({ error: bidErr.message }), { status: 422 });
    }

    // Update transport status
    await sb.from('transport_requests')
      .update({ status: 'bid_received' })
      .eq('id', transportId)
      .eq('status', 'marketplace_open');

    // Notify vendor
    const { data: transporter } = await sb.from('profiles').select('full_name').eq('id', actorId).single();
    await sb.from('notifications').insert({
      user_id:     tr.vendor_id,
      type:        'bid_received',
      title:       '💰 New Bid Received',
      body:        `${transporter?.full_name ?? 'A transporter'} bid ₹${amount} on your job.`,
      data:        { transport_id: transportId, bid_id: bid.id, amount },
      entity_type: 'bid',
      entity_id:   bid.id,
    });

    return new Response(JSON.stringify({ success: true, bid }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // ── COUNTER OFFER ──────────────────────────────────────────────────
  if (action === 'counter_offer') {
    if (actorRole !== 'vendor' && actorRole !== 'admin' && actorRole !== 'super_admin') {
      return new Response(JSON.stringify({ error: 'Only vendor can counter' }), { status: 403 });
    }
    if (tr.vendor_id !== actorId && !['admin','super_admin'].includes(actorRole ?? '')) {
      return new Response(JSON.stringify({ error: 'Not your transport request' }), { status: 403 });
    }
    if (!bidId || !amount) {
      return new Response(JSON.stringify({ error: 'bidId and amount required' }), { status: 400 });
    }

    const { data: bid } = await sb.from('bids').select('*').eq('id', bidId).single();
    if (!bid || bid.status !== 'pending') {
      return new Response(JSON.stringify({ error: 'Bid not found or not pending' }), { status: 404 });
    }

    // Update current bid with counter
    await sb.from('bids').update({
      status:       'countered',
      vendor_counter: amount,
      vendor_note:  note,
      responded_at: new Date().toISOString(),
    }).eq('id', bidId);

    // Update transport to negotiating
    await sb.from('transport_requests')
      .update({ status: 'negotiating' })
      .eq('id', transportId);

    // Notify transporter
    await sb.from('notifications').insert({
      user_id:     bid.transporter_id,
      type:        'bid_countered',
      title:       '🔄 Counter Offer',
      body:        `Vendor countered at ₹${amount}. Accept or re-bid.`,
      data:        { transport_id: transportId, bid_id: bidId, counter_amount: amount },
      entity_type: 'bid',
      entity_id:   bidId,
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // ── ACCEPT BID ─────────────────────────────────────────────────────
  if (action === 'accept_bid') {
    if (actorRole !== 'vendor' && actorRole !== 'admin' && actorRole !== 'super_admin') {
      return new Response(JSON.stringify({ error: 'Only vendor can accept bids' }), { status: 403 });
    }
    if (!bidId) {
      return new Response(JSON.stringify({ error: 'bidId required' }), { status: 400 });
    }

    const { data: bid } = await sb.from('bids').select('*').eq('id', bidId).single();
    if (!bid || !['pending', 'countered'].includes(bid.status)) {
      return new Response(JSON.stringify({ error: 'Bid not available for acceptance' }), { status: 404 });
    }

    const finalPrice = bid.vendor_counter ?? bid.bid_amount;

    // Accept this bid
    await sb.from('bids').update({
      status:       'accepted',
      responded_at: new Date().toISOString(),
    }).eq('id', bidId);

    // Reject all other bids for this job
    await sb.from('bids').update({ status: 'rejected' })
      .eq('transport_id', transportId)
      .neq('id', bidId)
      .in('status', ['pending', 'countered']);

    // Assign transporter and finalize price
    await sb.from('transport_requests').update({
      status:                  'transporter_assigned',
      assigned_transporter_id: bid.transporter_id,
      assigned_bid_id:         bidId,
      final_agreed_price:      finalPrice,
    }).eq('id', transportId);

    // Update linked order
    await sb.from('orders').update({ status: 'transport_assigned' })
      .eq('id', tr.order_id ?? '');

    // Notify transporter
    const { data: transporter } = await sb.from('transporter_profiles')
      .select('vehicle_number, vehicle_type')
      .eq('user_id', bid.transporter_id)
      .single();

    await sb.from('notifications').insert({
      user_id:     bid.transporter_id,
      type:        'bid_accepted',
      title:       '🎉 Bid Accepted!',
      body:        `You have been assigned the job at ₹${finalPrice}. Please confirm pickup.`,
      data:        { transport_id: transportId, bid_id: bidId, final_price: finalPrice },
      entity_type: 'transport_request',
      entity_id:   transportId,
    });

    // Audit log
    await sb.from('audit_logs').insert({
      entity_type: 'transport_request',
      entity_id:   transportId,
      action:      'bid_accepted',
      actor_id:    actorId,
      new_data:    { bid_id: bidId, transporter_id: bid.transporter_id, final_price: finalPrice },
    });

    return new Response(JSON.stringify({
      success:          true,
      transporter_id:   bid.transporter_id,
      final_price:      finalPrice,
      vehicle_number:   transporter?.vehicle_number,
    }), { headers: { 'Content-Type': 'application/json' } });
  }

  // ── REJECT BID ─────────────────────────────────────────────────────
  if (action === 'reject_bid') {
    if (!bidId) return new Response(JSON.stringify({ error: 'bidId required' }), { status: 400 });

    const { data: bid } = await sb.from('bids').select('transporter_id').eq('id', bidId).single();
    if (!bid) return new Response(JSON.stringify({ error: 'Bid not found' }), { status: 404 });

    await sb.from('bids').update({
      status: 'rejected',
      responded_at: new Date().toISOString(),
      vendor_note: note,
    }).eq('id', bidId);

    // Check if any other active bids remain
    const { data: activeBids } = await sb.from('bids')
      .select('id')
      .eq('transport_id', transportId)
      .in('status', ['pending', 'countered']);

    if (!activeBids || activeBids.length === 0) {
      // Reopen to marketplace
      await sb.from('transport_requests')
        .update({ status: 'marketplace_open' })
        .eq('id', transportId);
    }

    await sb.from('notifications').insert({
      user_id:     bid.transporter_id,
      type:        'bid_rejected',
      title:       '❌ Bid Not Accepted',
      body:        `Your bid was not accepted. The job is available for re-bidding.`,
      data:        { transport_id: transportId, bid_id: bidId },
      entity_type: 'bid',
      entity_id:   bidId,
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // ── WITHDRAW BID ───────────────────────────────────────────────────
  if (action === 'withdraw_bid') {
    if (actorRole !== 'transporter') {
      return new Response(JSON.stringify({ error: 'Only transporters can withdraw bids' }), { status: 403 });
    }
    if (!bidId) return new Response(JSON.stringify({ error: 'bidId required' }), { status: 400 });

    await sb.from('bids').update({ status: 'withdrawn' })
      .eq('id', bidId)
      .eq('transporter_id', actorId)
      .in('status', ['pending', 'countered']);

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), { status: 400 });
});
