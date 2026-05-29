/**
 * Workflow Engine — handles all status transitions for products, orders,
 * and transport requests. Enforces role-based access on every action.
 *
 * POST /workflow-engine
 * Body: { entity, entityId, action, remarks?, metadata? }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL    = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// ── Allowed role → action mappings ────────────────────────────────

const PRODUCT_PERMISSIONS: Record<string, string[]> = {
  vendor:      ['submit_for_approval', 'save_draft', 'resubmit'],
  admin:       ['approve', 'reject', 'request_changes', 'suspend', 'reinstate'],
  super_admin: ['approve', 'reject', 'request_changes', 'suspend', 'reinstate'],
};

const ORDER_PERMISSIONS: Record<string, string[]> = {
  customer:    ['place_order'],
  admin:       ['approve', 'reject', 'hold', 'release_hold'],
  super_admin: ['approve', 'reject', 'hold', 'release_hold', 'cancel'],
  vendor:      ['mark_transport_pending'],
};

const TRANSPORT_PERMISSIONS: Record<string, string[]> = {
  vendor:      ['create', 'submit_for_approval'],
  admin:       ['approve', 'reject', 'modify'],
  super_admin: ['approve', 'reject', 'modify'],
  transporter: ['mark_picked_up', 'mark_in_transit', 'mark_delivered', 'update_location'],
};

// ── Action → status mapping ────────────────────────────────────────

const PRODUCT_ACTION_STATUS: Record<string, string> = {
  submit_for_approval:  'pending_approval',
  save_draft:           'draft',
  resubmit:             'pending_approval',
  approve:              'approved',
  reject:               'rejected',
  request_changes:      'changes_requested',
  suspend:              'suspended',
  reinstate:            'approved',
};

const ORDER_ACTION_STATUS: Record<string, string> = {
  place_order:          'waiting_approval',
  approve:              'approved',
  reject:               'rejected',
  hold:                 'on_hold',
  release_hold:         'approved',
  mark_transport_pending: 'transport_pending',
  assign_transport:     'transport_assigned',
  mark_picked_up:       'picked_up',
  mark_in_transit:      'in_transit',
  mark_delivered:       'delivered',
  cancel:               'cancelled',
};

const TRANSPORT_ACTION_STATUS: Record<string, string> = {
  submit_for_approval:  'waiting_admin_approval',
  approve:              'marketplace_open',
  reject:               'cancelled',
  modify:               'marketplace_open',
  bid_received:         'bid_received',
  start_negotiation:    'negotiating',
  assign_transporter:   'transporter_assigned',
  reopen_marketplace:   'marketplace_open',
  mark_picked_up:       'picked_up',
  mark_in_transit:      'in_transit',
  mark_delivered:       'delivered',
  cancel:               'cancelled',
};

// ── Notification templates ─────────────────────────────────────────

async function sendNotification(
  sb: ReturnType<typeof createClient>,
  userId: string,
  type: string,
  title: string,
  body: string,
  data: Record<string, unknown>,
) {
  await sb.from('notifications').insert({ user_id: userId, type, title, body, data });
}

async function notifyAdmins(
  sb: ReturnType<typeof createClient>,
  type: string,
  title: string,
  body: string,
  data: Record<string, unknown>,
) {
  const { data: admins } = await sb
    .from('profiles')
    .select('id')
    .in('role', ['admin', 'super_admin']);

  if (!admins) return;
  const rows = admins.map((a: { id: string }) => ({
    user_id: a.id, type, title, body, data,
  }));
  await sb.from('notifications').insert(rows);
}

// ── Main handler ──────────────────────────────────────────────────

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Missing Authorization' }), { status: 401 });
  }

  const userClient = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  });
  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE);

  const { data: { user }, error: authErr } = await userClient.auth.getUser();
  if (authErr || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const { data: actor } = await sb
    .from('profiles')
    .select('id, role, full_name')
    .eq('id', user.id)
    .single();

  if (!actor) {
    return new Response(JSON.stringify({ error: 'Actor profile not found' }), { status: 403 });
  }

  let body: {
    entity: 'product' | 'order' | 'transport';
    entityId: string;
    action: string;
    remarks?: string;
    metadata?: Record<string, unknown>;
  };

  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 });
  }

  const { entity, entityId, action, remarks, metadata = {} } = body;

  // ── Permission check ─────────────────────────────────────────────
  const permMap =
    entity === 'product'   ? PRODUCT_PERMISSIONS   :
    entity === 'order'     ? ORDER_PERMISSIONS     :
    entity === 'transport' ? TRANSPORT_PERMISSIONS : null;

  if (!permMap) {
    return new Response(JSON.stringify({ error: 'Unknown entity type' }), { status: 400 });
  }

  const allowed = permMap[actor.role] ?? [];
  if (!allowed.includes(action)) {
    return new Response(JSON.stringify({
      error: `Role '${actor.role}' cannot perform '${action}' on ${entity}`,
    }), { status: 403 });
  }

  // ── Resolve new status ────────────────────────────────────────────
  const statusMap =
    entity === 'product'   ? PRODUCT_ACTION_STATUS   :
    entity === 'order'     ? ORDER_ACTION_STATUS     :
    TRANSPORT_ACTION_STATUS;

  const newStatus = statusMap[action];
  if (!newStatus) {
    return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), { status: 400 });
  }

  // ── Call appropriate DB transition function ───────────────────────
  const fnName =
    entity === 'product'   ? 'transition_product_status'   :
    entity === 'order'     ? 'transition_order_status'     :
    'transition_transport_status';

  const idParam =
    entity === 'product'   ? { p_product_id:   entityId } :
    entity === 'order'     ? { p_order_id:      entityId } :
    { p_transport_id: entityId };

  const { data: result, error: txErr } = await sb.rpc(fnName, {
    ...idParam,
    p_new_status: newStatus,
    p_actor_id:   actor.id,
    p_remarks:    remarks ?? null,
    p_metadata:   JSON.stringify({ ...metadata, old_status: null }),
  });

  if (txErr) {
    return new Response(JSON.stringify({ error: txErr.message }), { status: 422 });
  }

  // ── Fire notifications based on action ────────────────────────────
  try {
    if (entity === 'product') {
      if (action === 'submit_for_approval' || action === 'resubmit') {
        const { data: prod } = await sb.from('products').select('name, vendor_id').eq('id', entityId).single();
        await notifyAdmins(sb, 'product_approval_request',
          '📦 Product Approval Needed',
          `"${prod?.name}" is awaiting your review.`,
          { product_id: entityId });
      } else if (action === 'approve') {
        const { data: prod } = await sb.from('products').select('vendor_id, name').eq('id', entityId).single();
        if (prod) {
          await sendNotification(sb, prod.vendor_id, 'product_approved',
            '✅ Product Approved',
            `Your product "${prod.name}" is now live on the marketplace.`,
            { product_id: entityId });
        }
      } else if (action === 'reject') {
        const { data: prod } = await sb.from('products').select('vendor_id, name').eq('id', entityId).single();
        if (prod) {
          await sendNotification(sb, prod.vendor_id, 'product_rejected',
            '❌ Product Rejected',
            `"${prod.name}" was not approved. ${remarks ?? ''}`,
            { product_id: entityId, remarks });
        }
      } else if (action === 'request_changes') {
        const { data: prod } = await sb.from('products').select('vendor_id, name').eq('id', entityId).single();
        if (prod) {
          await sendNotification(sb, prod.vendor_id, 'product_changes_requested',
            '✏️ Changes Requested',
            `Please update "${prod.name}": ${remarks ?? ''}`,
            { product_id: entityId, remarks });
        }
      }
    }

    if (entity === 'order') {
      const { data: ord } = await sb.from('orders')
        .select('order_number, customer_id, total_amount')
        .eq('id', entityId).single();

      if (action === 'place_order') {
        await notifyAdmins(sb, 'order_placed',
          '🛒 New Order Awaiting Approval',
          `Order ${ord?.order_number} — ₹${ord?.total_amount} needs review.`,
          { order_id: entityId });
      } else if (action === 'approve' && ord) {
        await sendNotification(sb, ord.customer_id, 'order_approved',
          '✅ Order Approved',
          `Order ${ord.order_number} has been approved. Delivery is being arranged.`,
          { order_id: entityId });
      } else if (action === 'reject' && ord) {
        await sendNotification(sb, ord.customer_id, 'order_rejected',
          '❌ Order Rejected',
          `Order ${ord.order_number} was rejected. ${remarks ?? ''}`,
          { order_id: entityId, remarks });
      }
    }

    if (entity === 'transport') {
      const { data: tr } = await sb.from('transport_requests')
        .select('request_number, vendor_id, vendor_proposed_price')
        .eq('id', entityId).single();

      if (action === 'submit_for_approval') {
        await notifyAdmins(sb, 'transport_approval_request',
          '🚛 Transport Approval Needed',
          `${tr?.request_number} — ₹${tr?.vendor_proposed_price} awaiting route review.`,
          { transport_id: entityId });
      } else if (action === 'approve' && tr) {
        await sendNotification(sb, tr.vendor_id, 'transport_approved',
          '✅ Transport Request Approved',
          `${tr.request_number} is now open to transporters.`,
          { transport_id: entityId });
      }
    }
  } catch (_e) {
    // Notification failure should NOT fail the workflow transition
  }

  return new Response(JSON.stringify({ success: true, data: result }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
