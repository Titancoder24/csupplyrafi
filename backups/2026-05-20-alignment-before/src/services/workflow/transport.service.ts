import { supabase } from '@/services/supabase';
import type { TransportRequest, TransportStatus, VehicleType } from './types';

export interface CreateTransportInput {
  orderId:                  string;
  productDescription:       string;
  totalWeightKg:            number;
  loadType?:                string;
  specialInstructions?:     string;
  preferredVehicleType?:    VehicleType;
  pickupAddress:            string;
  pickupLat:                number;
  pickupLng:                number;
  pickupCity?:              string;
  pickupPincode?:           string;
  pickupContactName?:       string;
  pickupContactPhone?:      string;
  destinationAddress:       string;
  destinationLat:           number;
  destinationLng:           number;
  destinationCity?:         string;
  destinationPincode?:      string;
  destinationContactName?:  string;
  destinationContactPhone?: string;
  vendorProposedPrice:      number;
  preferredPickupDate?:     string;
  preferredPickupTime?:     string;
}

// ── Vendor: create transport request ─────────────────────────────

export async function createTransportRequest(input: CreateTransportInput): Promise<TransportRequest> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Get route estimate from geo-service
  let distanceKm: number | null = null;
  let durationMin: number | null = null;
  let polyline: string | null = null;

  try {
    const { data: route } = await supabase.functions.invoke('geo-service', {
      body: {
        action:     'route',
        originLat:  input.pickupLat,
        originLng:  input.pickupLng,
        destLat:    input.destinationLat,
        destLng:    input.destinationLng,
      },
    });
    if (route?.success) {
      distanceKm  = route.distance_km;
      durationMin = route.duration_min;
      polyline    = route.polyline ?? null;
    }
  } catch {
    // Route estimation is best-effort
  }

  // Get system price estimate
  let systemEstimatedPrice: number | null = null;
  let pricingBreakdown = null;

  if (distanceKm && input.preferredVehicleType) {
    try {
      const { data: fare } = await supabase.functions.invoke('pricing-engine', {
        body: {
          distanceKm,
          weightKg:    input.totalWeightKg,
          vehicleType: input.preferredVehicleType,
          autoSurge:   true,
        },
      });
      if (fare?.success) {
        systemEstimatedPrice = fare.fare.total;
        pricingBreakdown     = fare.fare;
      }
    } catch {
      // Price estimation is best-effort
    }
  }

  const { data: tr, error } = await supabase
    .from('transport_requests')
    .insert({
      order_id:                   input.orderId,
      vendor_id:                  user.id,
      product_description:        input.productDescription,
      total_weight_kg:            input.totalWeightKg,
      load_type:                  input.loadType     ?? 'general',
      special_instructions:       input.specialInstructions ?? null,
      preferred_vehicle_type:     input.preferredVehicleType ?? null,
      pickup_address:             input.pickupAddress,
      pickup_lat:                 input.pickupLat,
      pickup_lng:                 input.pickupLng,
      pickup_city:                input.pickupCity     ?? null,
      pickup_pincode:             input.pickupPincode  ?? null,
      pickup_contact_name:        input.pickupContactName  ?? null,
      pickup_contact_phone:       input.pickupContactPhone ?? null,
      destination_address:        input.destinationAddress,
      destination_lat:            input.destinationLat,
      destination_lng:            input.destinationLng,
      destination_city:           input.destinationCity    ?? null,
      destination_pincode:        input.destinationPincode ?? null,
      destination_contact_name:   input.destinationContactName  ?? null,
      destination_contact_phone:  input.destinationContactPhone ?? null,
      route_distance_km:          distanceKm,
      estimated_duration_min:     durationMin,
      route_polyline:             polyline,
      vendor_proposed_price:      input.vendorProposedPrice,
      system_estimated_price:     systemEstimatedPrice,
      pricing_breakdown:          pricingBreakdown,
      status:                     'created' as TransportStatus,
      preferred_pickup_date:      input.preferredPickupDate  ?? null,
      preferred_pickup_time:      input.preferredPickupTime  ?? null,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  // Immediately submit for admin approval
  await supabase.functions.invoke('workflow-engine', {
    body: { entity: 'transport', entityId: tr.id, action: 'submit_for_approval' },
  });

  return tr as TransportRequest;
}

// ── Admin: approve / reject transport request ─────────────────────

export async function approveTransportRequest(transportId: string, notes?: string): Promise<TransportRequest> {
  return callWorkflowEngine({ entityId: transportId, action: 'approve', remarks: notes });
}

export async function rejectTransportRequest(transportId: string, reason: string): Promise<TransportRequest> {
  return callWorkflowEngine({ entityId: transportId, action: 'reject', remarks: reason });
}

export async function modifyAndApproveTransport(
  transportId: string,
  modifications: { vendorProposedPrice?: number; notes?: string },
): Promise<TransportRequest> {
  if (modifications.vendorProposedPrice) {
    await supabase
      .from('transport_requests')
      .update({ vendor_proposed_price: modifications.vendorProposedPrice })
      .eq('id', transportId);
  }
  return callWorkflowEngine({
    entityId: transportId,
    action:   'modify',
    remarks:  modifications.notes,
    metadata: modifications,
  });
}

// ── Transporter: tracking updates ─────────────────────────────────

export async function markPickedUp(transportId: string): Promise<TransportRequest> {
  return callWorkflowEngine({ entityId: transportId, action: 'mark_picked_up' });
}

export async function markInTransit(transportId: string): Promise<TransportRequest> {
  return callWorkflowEngine({ entityId: transportId, action: 'mark_in_transit' });
}

export async function markDelivered(transportId: string): Promise<TransportRequest> {
  return callWorkflowEngine({ entityId: transportId, action: 'mark_delivered' });
}

export async function updateTransporterLocation(
  transportId: string,
  lat: number,
  lng: number,
): Promise<void> {
  const { error } = await supabase
    .from('transport_requests')
    .update({ current_lat: lat, current_lng: lng, last_location_at: new Date().toISOString() })
    .eq('id', transportId);

  if (error) throw new Error(error.message);
}

// ── Queries ───────────────────────────────────────────────────────

export async function getVendorTransportRequests(status?: TransportStatus) {
  let query = supabase
    .from('transport_requests')
    .select('*, bids(count)')
    .order('created_at', { ascending: false });

  if (status) query = query.eq('status', status);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data as TransportRequest[];
}

export async function getTransportMarketplace() {
  const { data, error } = await supabase
    .from('transporter_marketplace')
    .select('*');
  if (error) throw new Error(error.message);
  return data;
}

export async function getTransportById(transportId: string) {
  const { data, error } = await supabase
    .from('transport_requests')
    .select(`
      *,
      bids(*, transporter_profiles(vehicle_number, vehicle_type, rating)),
      transport_approval_history(*, profiles(full_name, role)),
      orders(order_number, total_amount)
    `)
    .eq('id', transportId)
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function getAdminTransportQueue() {
  const { data, error } = await supabase.from('admin_transport_queue').select('*');
  if (error) throw new Error(error.message);
  return data;
}

export async function getAssignedTransportJobs() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('transport_requests')
    .select('*, orders(order_number)')
    .eq('assigned_transporter_id', user.id)
    .order('assigned_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data as TransportRequest[];
}

async function callWorkflowEngine(params: {
  entityId:  string;
  action:    string;
  remarks?:  string;
  metadata?: Record<string, unknown>;
}): Promise<TransportRequest> {
  const { data, error } = await supabase.functions.invoke('workflow-engine', {
    body: { entity: 'transport', ...params },
  });
  if (error) throw new Error(error.message);
  if (!data.success) throw new Error(data.error ?? 'Workflow engine error');
  return data.data as TransportRequest;
}
