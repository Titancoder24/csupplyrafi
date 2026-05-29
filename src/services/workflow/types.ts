// ================================================================
// C-Supply Workflow Types — mirrors the PostgreSQL schema exactly
// ================================================================

export type UserRole = 'customer' | 'vendor' | 'transporter' | 'admin' | 'super_admin';

// ── Product state machine ──────────────────────────────────────────

export type ProductStatus =
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'changes_requested'
  | 'suspended';

export const PRODUCT_TRANSITIONS: Record<ProductStatus, ProductStatus[]> = {
  draft:              ['pending_approval'],
  pending_approval:   ['approved', 'rejected', 'changes_requested'],
  approved:           ['suspended', 'draft'],
  rejected:           ['draft'],
  changes_requested:  ['pending_approval'],
  suspended:          ['approved'],
};

export type ProductAction =
  | 'submit_for_approval'
  | 'save_draft'
  | 'resubmit'
  | 'approve'
  | 'reject'
  | 'request_changes'
  | 'suspend'
  | 'reinstate';

// ── Order state machine ────────────────────────────────────────────

export type OrderStatus =
  | 'created'
  | 'waiting_approval'
  | 'approved'
  | 'rejected'
  | 'on_hold'
  | 'transport_pending'
  | 'transport_assigned'
  | 'picked_up'
  | 'in_transit'
  | 'delivered'
  | 'cancelled';

export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  created:            ['waiting_approval'],
  waiting_approval:   ['approved', 'rejected', 'on_hold'],
  approved:           ['transport_pending', 'cancelled'],
  rejected:           [],
  on_hold:            ['approved', 'rejected'],
  transport_pending:  ['transport_assigned', 'cancelled'],
  transport_assigned: ['picked_up'],
  picked_up:          ['in_transit'],
  in_transit:         ['delivered'],
  delivered:          [],
  cancelled:          [],
};

export type OrderAction =
  | 'place_order'
  | 'approve'
  | 'reject'
  | 'hold'
  | 'release_hold'
  | 'mark_transport_pending'
  | 'assign_transport'
  | 'mark_picked_up'
  | 'mark_in_transit'
  | 'mark_delivered'
  | 'cancel';

// ── Transport state machine ────────────────────────────────────────

export type TransportStatus =
  | 'created'
  | 'waiting_admin_approval'
  | 'marketplace_open'
  | 'bid_received'
  | 'negotiating'
  | 'transporter_assigned'
  | 'picked_up'
  | 'in_transit'
  | 'delivered'
  | 'cancelled';

export const TRANSPORT_TRANSITIONS: Record<TransportStatus, TransportStatus[]> = {
  created:                ['waiting_admin_approval'],
  waiting_admin_approval: ['marketplace_open', 'cancelled'],
  marketplace_open:       ['bid_received', 'cancelled'],
  bid_received:           ['negotiating', 'transporter_assigned', 'marketplace_open'],
  negotiating:            ['transporter_assigned', 'marketplace_open'],
  transporter_assigned:   ['picked_up', 'cancelled'],
  picked_up:              ['in_transit'],
  in_transit:             ['delivered'],
  delivered:              [],
  cancelled:              [],
};

export type TransportAction =
  | 'submit_for_approval'
  | 'approve'
  | 'reject'
  | 'modify'
  | 'bid_received'
  | 'start_negotiation'
  | 'assign_transporter'
  | 'reopen_marketplace'
  | 'mark_picked_up'
  | 'mark_in_transit'
  | 'mark_delivered'
  | 'cancel';

// ── Bid state machine ─────────────────────────────────────────────

export type BidStatus = 'pending' | 'accepted' | 'rejected' | 'countered' | 'expired' | 'withdrawn';

export type BidAction = 'place_bid' | 'counter_offer' | 'accept_bid' | 'reject_bid' | 'withdraw_bid';

export type VehicleType =
  | 'mini_truck' | 'pickup' | 'tata_ace'
  | 'lpt_407'   | 'lpt_709'
  | 'container_20ft' | 'container_40ft' | 'trailer';

export type ApprovalAction =
  | 'approved' | 'rejected' | 'changes_requested' | 'held' | 'modified' | 'resubmitted';

// ── Entity shapes ──────────────────────────────────────────────────

export interface Profile {
  id:               string;
  role:             UserRole;
  full_name:        string | null;
  phone:            string | null;
  avatar_url:       string | null;
  is_active:        boolean;
  expo_push_token:  string | null;
  created_at:       string;
  updated_at:       string;
}

export interface VendorProfile {
  id:                string;
  user_id:           string;
  business_name:     string;
  gstin:             string | null;
  pan_number:        string | null;
  warehouse_address: string;
  warehouse_lat:     number;
  warehouse_lng:     number;
  warehouse_city:    string | null;
  warehouse_state:   string | null;
  warehouse_pincode: string | null;
  is_verified:       boolean;
  created_at:        string;
}

export interface TransporterProfile {
  id:               string;
  user_id:          string;
  vehicle_type:     VehicleType;
  vehicle_number:   string;
  capacity_tons:    number;
  license_number:   string;
  is_available:     boolean;
  is_verified:      boolean;
  current_lat:      number | null;
  current_lng:      number | null;
  rating:           number;
  total_trips:      number;
}

export interface Product {
  id:               string;
  vendor_id:        string;
  category_id:      string | null;
  name:             string;
  description:      string | null;
  brand:            string | null;
  unit:             string;
  price_per_unit:   number;
  min_order_qty:    number;
  max_order_qty:    number | null;
  stock_qty:        number;
  source_lat:       number | null;
  source_lng:       number | null;
  source_address:   string | null;
  hsn_code:         string | null;
  gst_rate:         number;
  status:           ProductStatus;
  rejection_reason: string | null;
  change_requests:  string | null;
  is_featured:      boolean;
  specs:            Record<string, unknown>;
  tags:             string[];
  created_at:       string;
  updated_at:       string;
  submitted_at:     string | null;
  approved_at:      string | null;
}

export interface Order {
  id:                     string;
  order_number:           string;
  customer_id:            string;
  delivery_address_snap:  DeliveryAddressSnap | null;
  subtotal:               number;
  gst_total:              number;
  delivery_charge:        number;
  total_amount:           number;
  status:                 OrderStatus;
  rejection_reason:       string | null;
  hold_reason:            string | null;
  admin_notes:            string | null;
  route_distance_km:      number | null;
  estimated_duration_min: number | null;
  customer_gstin:         string | null;
  approved_at:            string | null;
  transport_request_id:   string | null;
  picked_up_at:           string | null;
  delivered_at:           string | null;
  created_at:             string;
  updated_at:             string;
}

export interface OrderItem {
  id:             string;
  order_id:       string;
  product_id:     string;
  vendor_id:      string;
  product_name:   string;
  unit:           string;
  quantity:       number;
  unit_price:     number;
  gst_rate:       number;
  gst_amount:     number;
  line_total:     number;
  source_address: string | null;
}

export interface TransportRequest {
  id:                       string;
  request_number:           string;
  order_id:                 string;
  vendor_id:                string;
  product_description:      string;
  total_weight_kg:          number;
  load_type:                string;
  preferred_vehicle_type:   VehicleType | null;
  pickup_address:           string;
  pickup_lat:               number;
  pickup_lng:               number;
  pickup_city:              string | null;
  destination_address:      string;
  destination_lat:          number;
  destination_lng:          number;
  destination_city:         string | null;
  route_distance_km:        number | null;
  estimated_duration_min:   number | null;
  route_polyline:           string | null;
  vendor_proposed_price:    number;
  system_estimated_price:   number | null;
  final_agreed_price:       number | null;
  pricing_breakdown:        PricingBreakdown | null;
  status:                   TransportStatus;
  admin_notes:              string | null;
  bid_expiry_at:            string | null;
  assigned_transporter_id:  string | null;
  current_lat:              number | null;
  current_lng:              number | null;
  picked_up_at:             string | null;
  delivered_at:             string | null;
  created_at:               string;
  updated_at:               string;
}

export interface Bid {
  id:               string;
  bid_number:       string;
  transport_id:     string;
  transporter_id:   string;
  round:            number;
  bid_amount:       number;
  vendor_counter:   number | null;
  status:           BidStatus;
  transporter_note: string | null;
  vendor_note:      string | null;
  expires_at:       string | null;
  responded_at:     string | null;
  created_at:       string;
}

export interface PricingConfig {
  vehicle_type:           VehicleType;
  base_fare_inr:          number;
  per_km_rate_inr:        number;
  per_kg_rate_inr:        number;
  minimum_fare_inr:       number;
  minimum_distance_km:    number;
  fuel_multiplier:        number;
  surge_multiplier:       number;
  free_weight_kg:         number;
  extra_weight_rate_inr:  number;
  max_capacity_kg:        number;
}

export interface PricingBreakdown {
  base_fare:        number;
  distance_charge:  number;
  weight_charge:    number;
  surge_amount:     number;
  total:            number;
  vehicle_type:     VehicleType;
  distance_km:      number;
  weight_kg:        number;
  surge_factor:     number;
  min_applied:      boolean;
}

export interface DeliveryAddressSnap {
  full_address:  string;
  lat:           number | null;
  lng:           number | null;
  city:          string | null;
  state:         string | null;
  pincode:       string | null;
  contact_name:  string | null;
  contact_phone: string | null;
}

export interface Notification {
  id:          string;
  user_id:     string;
  type:        string;
  title:       string;
  body:        string;
  data:        Record<string, unknown>;
  is_read:     boolean;
  entity_type: string | null;
  entity_id:   string | null;
  created_at:  string;
}

export interface GeoRoute {
  distance_km:  number;
  duration_min: number;
  polyline:     string | null;
  source:       'cache' | 'osrm' | 'haversine';
}

export interface FareEstimate {
  distance_km:       number;
  duration_min:      number;
  fare:              PricingBreakdown;
}

// ── Status display helpers ─────────────────────────────────────────

export const STATUS_LABELS: Record<string, string> = {
  // Product
  draft:                   'Draft',
  pending_approval:        'Awaiting Approval',
  approved:                'Approved',
  rejected:                'Rejected',
  changes_requested:       'Changes Needed',
  suspended:               'Suspended',
  // Order
  created:                 'Created',
  waiting_approval:        'Awaiting Approval',
  on_hold:                 'On Hold',
  transport_pending:       'Booking Transport',
  transport_assigned:      'Transporter Assigned',
  picked_up:               'Picked Up',
  in_transit:              'In Transit',
  delivered:               'Delivered',
  cancelled:               'Cancelled',
  // Transport
  waiting_admin_approval:  'Admin Review',
  marketplace_open:        'Open for Bids',
  bid_received:            'Bid Received',
  negotiating:             'Negotiating',
  transporter_assigned:    'Assigned',
};

export const STATUS_COLORS: Record<string, string> = {
  draft:                  '#64748B',
  pending_approval:       '#F59E0B',
  approved:               '#22C55E',
  rejected:               '#EF4444',
  changes_requested:      '#F97316',
  suspended:              '#6B7280',
  waiting_approval:       '#F59E0B',
  on_hold:                '#F59E0B',
  transport_pending:      '#3B82F6',
  transport_assigned:     '#8B5CF6',
  marketplace_open:       '#0EA5E9',
  bid_received:           '#8B5CF6',
  negotiating:            '#F97316',
  transporter_assigned:   '#22C55E',
  picked_up:              '#3B82F6',
  in_transit:             '#0EA5E9',
  delivered:              '#22C55E',
  cancelled:              '#EF4444',
  created:                '#64748B',
};

export const VEHICLE_LABELS: Record<VehicleType, string> = {
  mini_truck:     'Mini Truck',
  pickup:         'Pickup',
  tata_ace:       'Tata Ace',
  lpt_407:        'LPT 407',
  lpt_709:        'LPT 709',
  container_20ft: '20ft Container',
  container_40ft: '40ft Container',
  trailer:        'Trailer',
};
