import { supabase } from '@/services/supabase';
import type { Order, OrderItem, OrderStatus } from './types';

export interface CartItem {
  productId: string;
  quantity:  number;
}

export interface PlaceOrderInput {
  items:             CartItem[];
  deliveryAddressId: string;
  customerGstin?:    string;
  customerBizName?:  string;
}

// ── Customer: place order (status = created → waiting_approval) ───

export async function placeOrder(input: PlaceOrderInput): Promise<Order> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Validate and fetch products
  const productIds = input.items.map(i => i.productId);
  const { data: products, error: prodErr } = await supabase
    .from('products')
    .select('id, name, unit, price_per_unit, gst_rate, stock_qty, vendor_id, source_lat, source_lng, source_address')
    .in('id', productIds)
    .eq('status', 'approved');

  if (prodErr || !products?.length) throw new Error('One or more products unavailable');

  // Fetch delivery address
  const { data: address } = await supabase
    .from('customer_addresses')
    .select('*')
    .eq('id', input.deliveryAddressId)
    .eq('customer_id', user.id)
    .single();

  if (!address) throw new Error('Delivery address not found');

  // Build order items and totals
  let subtotal  = 0;
  let gst_total = 0;

  const orderItems = input.items.map(item => {
    const prod = products.find(p => p.id === item.productId);
    if (!prod) throw new Error(`Product ${item.productId} not found`);
    if (prod.stock_qty < item.quantity) throw new Error(`Insufficient stock for ${prod.name}`);

    const line_amount = prod.price_per_unit * item.quantity;
    const gst_amount  = (line_amount * prod.gst_rate) / 100;

    subtotal  += line_amount;
    gst_total += gst_amount;

    return {
      product_id:    prod.id,
      vendor_id:     prod.vendor_id,
      product_name:  prod.name,
      unit:          prod.unit,
      quantity:      item.quantity,
      unit_price:    prod.price_per_unit,
      gst_rate:      prod.gst_rate,
      gst_amount:    gst_amount,
      line_total:    line_amount + gst_amount,
      source_lat:    prod.source_lat,
      source_lng:    prod.source_lng,
      source_address: prod.source_address,
    };
  });

  const total_amount = subtotal + gst_total;

  // Use source from first item (simplified — production would handle multi-vendor)
  const firstProd = products[0];

  // Create order
  const { data: order, error: ordErr } = await supabase
    .from('orders')
    .insert({
      customer_id:           user.id,
      delivery_address_id:   address.id,
      delivery_address_snap: {
        full_address:  address.full_address,
        lat:           address.lat,
        lng:           address.lng,
        city:          address.city,
        state:         address.state,
        pincode:       address.pincode,
        contact_name:  address.contact_name,
        contact_phone: address.contact_phone,
      },
      subtotal,
      gst_total,
      delivery_charge:      0,
      total_amount,
      status:               'created' as OrderStatus,
      source_lat:           firstProd.source_lat,
      source_lng:           firstProd.source_lng,
      destination_lat:      address.lat,
      destination_lng:      address.lng,
      customer_gstin:       input.customerGstin  ?? null,
      customer_business_name: input.customerBizName ?? null,
    })
    .select()
    .single();

  if (ordErr || !order) throw new Error(ordErr?.message ?? 'Failed to create order');

  // Create line items
  const lineItems = orderItems.map(i => ({ ...i, order_id: order.id }));
  const { error: itemsErr } = await supabase.from('order_items').insert(lineItems);
  if (itemsErr) throw new Error(itemsErr.message);

  // Immediately submit for admin approval
  const { data: result } = await supabase.functions.invoke('workflow-engine', {
    body: { entity: 'order', entityId: order.id, action: 'place_order' },
  });

  if (!result?.success) throw new Error(result?.error ?? 'Failed to submit order');

  return result.data as Order;
}

// ── Admin: approve / reject / hold ────────────────────────────────

export async function approveOrder(orderId: string, remarks?: string): Promise<Order> {
  return callWorkflowEngine({ entity: 'order', entityId: orderId, action: 'approve', remarks });
}

export async function rejectOrder(orderId: string, remarks: string): Promise<Order> {
  return callWorkflowEngine({ entity: 'order', entityId: orderId, action: 'reject', remarks });
}

export async function holdOrder(orderId: string, reason: string): Promise<Order> {
  return callWorkflowEngine({ entity: 'order', entityId: orderId, action: 'hold', remarks: reason });
}

export async function releaseOrderHold(orderId: string): Promise<Order> {
  return callWorkflowEngine({ entity: 'order', entityId: orderId, action: 'release_hold' });
}

// ── Vendor: initiate transport after approval ─────────────────────

export async function markOrderTransportPending(orderId: string): Promise<Order> {
  return callWorkflowEngine({ entity: 'order', entityId: orderId, action: 'mark_transport_pending' });
}

// ── Queries ───────────────────────────────────────────────────────

export async function getCustomerOrders(status?: OrderStatus) {
  let query = supabase
    .from('orders')
    .select('*, order_items(*, products(name, product_images(url, is_primary)))')
    .order('created_at', { ascending: false });

  if (status) query = query.eq('status', status);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data as Order[];
}

export async function getOrderById(orderId: string) {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      order_items(*, products(name, unit, product_images(url, is_primary))),
      order_approval_history(*, profiles(full_name, role))
    `)
    .eq('id', orderId)
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function getAdminOrderQueue() {
  const { data, error } = await supabase.from('admin_order_queue').select('*');
  if (error) throw new Error(error.message);
  return data;
}

export async function getVendorOrders() {
  const { data, error } = await supabase
    .from('order_items')
    .select('*, orders(*, profiles(full_name, phone))')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data;
}

async function callWorkflowEngine(params: {
  entity:    'order';
  entityId:  string;
  action:    string;
  remarks?:  string;
  metadata?: Record<string, unknown>;
}): Promise<Order> {
  const { data, error } = await supabase.functions.invoke('workflow-engine', { body: params });
  if (error) throw new Error(error.message);
  if (!data.success) throw new Error(data.error ?? 'Workflow engine error');
  return data.data as Order;
}
