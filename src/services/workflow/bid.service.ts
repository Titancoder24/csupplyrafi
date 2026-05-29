import { supabase } from '@/services/supabase';
import type { Bid } from './types';

// ── Transporter: place initial bid ────────────────────────────────

export async function placeBid(
  transportId: string,
  amount:      number,
  note?:       string,
): Promise<Bid> {
  const { data, error } = await supabase.functions.invoke('bid-engine', {
    body: { action: 'place_bid', transportId, amount, note },
  });
  if (error) throw new Error(error.message);
  if (!data.success) throw new Error(data.error ?? 'Bid failed');
  return data.bid as Bid;
}

// ── Vendor: counter an incoming bid ──────────────────────────────

export async function counterBid(
  transportId: string,
  bidId:       string,
  amount:      number,
  note?:       string,
): Promise<void> {
  const { data, error } = await supabase.functions.invoke('bid-engine', {
    body: { action: 'counter_offer', transportId, bidId, amount, note },
  });
  if (error) throw new Error(error.message);
  if (!data.success) throw new Error(data.error ?? 'Counter failed');
}

// ── Vendor: accept a bid — assigns the transporter ───────────────

export async function acceptBid(transportId: string, bidId: string): Promise<{
  transporter_id:  string;
  final_price:     number;
  vehicle_number:  string;
}> {
  const { data, error } = await supabase.functions.invoke('bid-engine', {
    body: { action: 'accept_bid', transportId, bidId },
  });
  if (error) throw new Error(error.message);
  if (!data.success) throw new Error(data.error ?? 'Accept failed');
  return data;
}

// ── Vendor: reject a specific bid ─────────────────────────────────

export async function rejectBid(
  transportId: string,
  bidId:       string,
  note?:       string,
): Promise<void> {
  const { data, error } = await supabase.functions.invoke('bid-engine', {
    body: { action: 'reject_bid', transportId, bidId, note },
  });
  if (error) throw new Error(error.message);
  if (!data.success) throw new Error(data.error ?? 'Reject failed');
}

// ── Transporter: withdraw own bid ─────────────────────────────────

export async function withdrawBid(transportId: string, bidId: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke('bid-engine', {
    body: { action: 'withdraw_bid', transportId, bidId },
  });
  if (error) throw new Error(error.message);
  if (!data.success) throw new Error(data.error ?? 'Withdraw failed');
}

// ── Queries ───────────────────────────────────────────────────────

export async function getBidsForTransport(transportId: string) {
  const { data, error } = await supabase
    .from('bids')
    .select(`
      *,
      transporter_profiles(vehicle_number, vehicle_type, capacity_tons, rating, total_trips),
      profiles(full_name, phone)
    `)
    .eq('transport_id', transportId)
    .order('bid_amount', { ascending: true });

  if (error) throw new Error(error.message);
  return data as (Bid & {
    transporter_profiles: {
      vehicle_number: string;
      vehicle_type:   string;
      capacity_tons:  number;
      rating:         number;
      total_trips:    number;
    } | null;
    profiles: { full_name: string; phone: string } | null;
  })[];
}

export async function getMyBids(status?: Bid['status']) {
  let query = supabase
    .from('bids')
    .select('*, transport_requests(request_number, pickup_city, destination_city, pickup_address, destination_address, status)')
    .order('created_at', { ascending: false });

  if (status) query = query.eq('status', status);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data;
}

export async function getActiveBidForTransport(transportId: string): Promise<Bid | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from('bids')
    .select('*')
    .eq('transport_id', transportId)
    .eq('transporter_id', user.id)
    .in('status', ['pending', 'countered'])
    .single();

  return (data as Bid) ?? null;
}
