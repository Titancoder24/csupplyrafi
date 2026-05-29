-- ================================================================
-- C-Supply: Enterprise Logistics Workflow Schema
-- ================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ================================================================
-- ENUMS
-- ================================================================

CREATE TYPE user_role AS ENUM (
  'customer', 'vendor', 'transporter', 'admin', 'super_admin'
);

CREATE TYPE product_status AS ENUM (
  'draft',
  'pending_approval',
  'approved',
  'rejected',
  'changes_requested',
  'suspended'
);

CREATE TYPE order_status AS ENUM (
  'created',
  'waiting_approval',
  'approved',
  'rejected',
  'on_hold',
  'transport_pending',
  'transport_assigned',
  'picked_up',
  'in_transit',
  'delivered',
  'cancelled'
);

CREATE TYPE transport_status AS ENUM (
  'created',
  'waiting_admin_approval',
  'marketplace_open',
  'bid_received',
  'negotiating',
  'transporter_assigned',
  'picked_up',
  'in_transit',
  'delivered',
  'cancelled'
);

CREATE TYPE bid_status AS ENUM (
  'pending',
  'accepted',
  'rejected',
  'countered',
  'expired',
  'withdrawn'
);

CREATE TYPE approval_action AS ENUM (
  'approved',
  'rejected',
  'changes_requested',
  'held',
  'modified',
  'resubmitted'
);

CREATE TYPE vehicle_type AS ENUM (
  'mini_truck',
  'pickup',
  'tata_ace',
  'lpt_407',
  'lpt_709',
  'container_20ft',
  'container_40ft',
  'trailer'
);

CREATE TYPE notification_type AS ENUM (
  'product_approval_request',
  'product_approved',
  'product_rejected',
  'product_changes_requested',
  'order_placed',
  'order_approved',
  'order_rejected',
  'order_on_hold',
  'transport_approval_request',
  'transport_approved',
  'transport_marketplace_open',
  'bid_received',
  'bid_accepted',
  'bid_rejected',
  'bid_countered',
  'bid_expired',
  'transporter_assigned',
  'shipment_picked_up',
  'shipment_in_transit',
  'shipment_delivered',
  'system_alert'
);

CREATE TYPE audit_entity AS ENUM (
  'product', 'order', 'transport_request', 'bid', 'user', 'pricing_config'
);

-- ================================================================
-- CORE TABLES
-- ================================================================

-- User profiles (extends Supabase auth.users)
CREATE TABLE profiles (
  id                UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role              user_role NOT NULL DEFAULT 'customer',
  full_name         TEXT,
  phone             TEXT,
  avatar_url        TEXT,
  is_active         BOOLEAN NOT NULL DEFAULT true,
  expo_push_token   TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Vendor business profile
CREATE TABLE vendor_profiles (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  business_name     TEXT NOT NULL,
  gstin             TEXT,
  pan_number        TEXT,
  business_type     TEXT,
  warehouse_name    TEXT,
  warehouse_address TEXT NOT NULL,
  warehouse_lat     DOUBLE PRECISION NOT NULL,
  warehouse_lng     DOUBLE PRECISION NOT NULL,
  warehouse_city    TEXT,
  warehouse_state   TEXT,
  warehouse_pincode TEXT,
  is_verified       BOOLEAN NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Transporter vehicle profile
CREATE TABLE transporter_profiles (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  vehicle_type      vehicle_type NOT NULL,
  vehicle_number    TEXT NOT NULL,
  vehicle_make      TEXT,
  vehicle_model     TEXT,
  capacity_tons     DECIMAL(8,2) NOT NULL DEFAULT 1.0,
  license_number    TEXT NOT NULL,
  license_expiry    DATE,
  insurance_expiry  DATE,
  base_location     TEXT,
  base_lat          DOUBLE PRECISION,
  base_lng          DOUBLE PRECISION,
  current_lat       DOUBLE PRECISION,
  current_lng       DOUBLE PRECISION,
  is_available      BOOLEAN NOT NULL DEFAULT true,
  is_verified       BOOLEAN NOT NULL DEFAULT false,
  rating            DECIMAL(3,2) DEFAULT 5.00,
  total_trips       INTEGER NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Product categories
CREATE TABLE categories (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  icon        TEXT,
  description TEXT,
  parent_id   UUID REFERENCES categories(id),
  is_active   BOOLEAN NOT NULL DEFAULT true,
  sort_order  INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ================================================================
-- PRODUCT WORKFLOW
-- ================================================================

CREATE TABLE products (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vendor_id           UUID NOT NULL REFERENCES profiles(id),
  vendor_profile_id   UUID REFERENCES vendor_profiles(id),
  category_id         UUID REFERENCES categories(id),

  name                TEXT NOT NULL,
  slug                TEXT,
  description         TEXT,
  brand               TEXT,
  sku                 TEXT,
  unit                TEXT NOT NULL DEFAULT 'piece',

  price_per_unit      DECIMAL(12,2) NOT NULL,
  min_order_qty       DECIMAL(10,2) NOT NULL DEFAULT 1,
  max_order_qty       DECIMAL(10,2),

  stock_qty           DECIMAL(10,2) NOT NULL DEFAULT 0,
  low_stock_threshold DECIMAL(10,2) DEFAULT 10,

  -- Source warehouse (inherited from vendor profile at creation time)
  source_lat          DOUBLE PRECISION,
  source_lng          DOUBLE PRECISION,
  source_address      TEXT,
  source_city         TEXT,
  source_state        TEXT,
  source_pincode      TEXT,

  hsn_code            TEXT,
  gst_rate            DECIMAL(5,2) DEFAULT 18.0,

  status              product_status NOT NULL DEFAULT 'draft',
  rejection_reason    TEXT,
  change_requests     TEXT,
  is_featured         BOOLEAN DEFAULT false,

  specs               JSONB DEFAULT '{}',
  tags                TEXT[] DEFAULT '{}',

  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  submitted_at        TIMESTAMPTZ,
  approved_at         TIMESTAMPTZ,
  approved_by         UUID REFERENCES profiles(id)
);

CREATE INDEX idx_products_vendor     ON products(vendor_id);
CREATE INDEX idx_products_category   ON products(category_id);
CREATE INDEX idx_products_status     ON products(status);
CREATE INDEX idx_products_name_trgm  ON products USING GIN (name gin_trgm_ops);

CREATE TABLE product_images (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url         TEXT NOT NULL,
  is_primary  BOOLEAN DEFAULT false,
  sort_order  INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Full approval audit trail for every product action
CREATE TABLE product_approval_history (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  action      approval_action NOT NULL,
  actor_id    UUID NOT NULL REFERENCES profiles(id),
  old_status  product_status,
  new_status  product_status NOT NULL,
  remarks     TEXT,
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pah_product ON product_approval_history(product_id);

-- ================================================================
-- ORDER WORKFLOW
-- ================================================================

CREATE TABLE customer_addresses (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  label         TEXT DEFAULT 'Site',
  full_address  TEXT NOT NULL,
  lat           DOUBLE PRECISION,
  lng           DOUBLE PRECISION,
  city          TEXT,
  state         TEXT,
  pincode       TEXT,
  contact_name  TEXT,
  contact_phone TEXT,
  is_default    BOOLEAN DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE orders (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number            TEXT NOT NULL UNIQUE,

  customer_id             UUID NOT NULL REFERENCES profiles(id),

  -- Delivery destination
  delivery_address_id     UUID REFERENCES customer_addresses(id),
  delivery_address_snap   JSONB,        -- immutable snapshot at order time

  -- Financials
  subtotal                DECIMAL(14,2) NOT NULL DEFAULT 0,
  gst_total               DECIMAL(14,2) NOT NULL DEFAULT 0,
  delivery_charge         DECIMAL(14,2) NOT NULL DEFAULT 0,
  total_amount            DECIMAL(14,2) NOT NULL DEFAULT 0,

  -- Workflow
  status                  order_status NOT NULL DEFAULT 'created',
  rejection_reason        TEXT,
  hold_reason             TEXT,
  admin_notes             TEXT,

  -- Route (computed at placement)
  source_lat              DOUBLE PRECISION,
  source_lng              DOUBLE PRECISION,
  destination_lat         DOUBLE PRECISION,
  destination_lng         DOUBLE PRECISION,
  route_distance_km       DECIMAL(8,2),
  estimated_duration_min  INTEGER,

  -- GST / business
  customer_gstin          TEXT,
  customer_business_name  TEXT,

  -- Approval
  approved_at             TIMESTAMPTZ,
  approved_by             UUID REFERENCES profiles(id),

  -- Transport linkage
  transport_request_id    UUID,         -- set when transport booking created

  -- Delivery tracking
  picked_up_at            TIMESTAMPTZ,
  delivered_at            TIMESTAMPTZ,

  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_status   ON orders(status);
CREATE INDEX idx_orders_number   ON orders(order_number);

CREATE TABLE order_items (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id        UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id      UUID NOT NULL REFERENCES products(id),
  vendor_id       UUID NOT NULL REFERENCES profiles(id),

  -- Snapshot at order time
  product_name    TEXT NOT NULL,
  unit            TEXT NOT NULL,
  quantity        DECIMAL(10,2) NOT NULL,
  unit_price      DECIMAL(12,2) NOT NULL,
  gst_rate        DECIMAL(5,2) NOT NULL,
  gst_amount      DECIMAL(12,2) NOT NULL,
  line_total      DECIMAL(14,2) NOT NULL,

  source_lat      DOUBLE PRECISION,
  source_lng      DOUBLE PRECISION,
  source_address  TEXT,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_order_items_order  ON order_items(order_id);
CREATE INDEX idx_order_items_vendor ON order_items(vendor_id);

CREATE TABLE order_approval_history (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id    UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  action      approval_action NOT NULL,
  actor_id    UUID NOT NULL REFERENCES profiles(id),
  old_status  order_status,
  new_status  order_status NOT NULL,
  remarks     TEXT,
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ================================================================
-- TRANSPORT WORKFLOW
-- ================================================================

CREATE TABLE transport_requests (
  id                        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_number            TEXT NOT NULL UNIQUE,

  order_id                  UUID NOT NULL REFERENCES orders(id),
  vendor_id                 UUID NOT NULL REFERENCES profiles(id),

  -- Load
  product_description       TEXT NOT NULL,
  total_weight_kg           DECIMAL(10,2) NOT NULL,
  load_type                 TEXT DEFAULT 'general',
  special_instructions      TEXT,
  preferred_vehicle_type    vehicle_type,

  -- Pickup
  pickup_address            TEXT NOT NULL,
  pickup_lat                DOUBLE PRECISION NOT NULL,
  pickup_lng                DOUBLE PRECISION NOT NULL,
  pickup_city               TEXT,
  pickup_pincode            TEXT,
  pickup_contact_name       TEXT,
  pickup_contact_phone      TEXT,

  -- Destination
  destination_address       TEXT NOT NULL,
  destination_lat           DOUBLE PRECISION NOT NULL,
  destination_lng           DOUBLE PRECISION NOT NULL,
  destination_city          TEXT,
  destination_pincode       TEXT,
  destination_contact_name  TEXT,
  destination_contact_phone TEXT,

  -- Route
  route_distance_km         DECIMAL(8,2),
  estimated_duration_min    INTEGER,
  route_polyline            TEXT,

  -- Pricing
  vendor_proposed_price     DECIMAL(14,2) NOT NULL,
  system_estimated_price    DECIMAL(14,2),
  final_agreed_price        DECIMAL(14,2),
  pricing_breakdown         JSONB DEFAULT '{}',

  -- Workflow
  status                    transport_status NOT NULL DEFAULT 'created',
  admin_notes               TEXT,
  rejection_reason          TEXT,

  -- Schedule
  preferred_pickup_date     DATE,
  preferred_pickup_time     TEXT,

  -- Bidding window
  bid_expiry_at             TIMESTAMPTZ,

  -- Assignment
  assigned_transporter_id   UUID REFERENCES profiles(id),
  assigned_bid_id           UUID,
  assigned_at               TIMESTAMPTZ,

  -- Live tracking
  current_lat               DOUBLE PRECISION,
  current_lng               DOUBLE PRECISION,
  last_location_at          TIMESTAMPTZ,

  picked_up_at              TIMESTAMPTZ,
  delivered_at              TIMESTAMPTZ,

  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tr_vendor  ON transport_requests(vendor_id);
CREATE INDEX idx_tr_status  ON transport_requests(status);
CREATE INDEX idx_tr_order   ON transport_requests(order_id);

CREATE TABLE transport_approval_history (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transport_id  UUID NOT NULL REFERENCES transport_requests(id) ON DELETE CASCADE,
  action        approval_action NOT NULL,
  actor_id      UUID NOT NULL REFERENCES profiles(id),
  old_status    transport_status,
  new_status    transport_status NOT NULL,
  remarks       TEXT,
  modifications JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ================================================================
-- BID ENGINE
-- ================================================================

CREATE TABLE bids (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bid_number        TEXT NOT NULL UNIQUE,

  transport_id      UUID NOT NULL REFERENCES transport_requests(id) ON DELETE CASCADE,
  transporter_id    UUID NOT NULL REFERENCES profiles(id),

  round             INTEGER NOT NULL DEFAULT 1,

  -- The transporter's ask
  bid_amount        DECIMAL(14,2) NOT NULL,
  -- Vendor's counter (null = accepted or no counter yet)
  vendor_counter    DECIMAL(14,2),

  status            bid_status NOT NULL DEFAULT 'pending',

  transporter_note  TEXT,
  vendor_note       TEXT,

  expires_at        TIMESTAMPTZ,
  responded_at      TIMESTAMPTZ,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_bids_transport    ON bids(transport_id);
CREATE INDEX idx_bids_transporter  ON bids(transporter_id);
CREATE INDEX idx_bids_status       ON bids(status);
-- Enforce one active bid per transporter per job
CREATE UNIQUE INDEX idx_bids_active
  ON bids(transport_id, transporter_id)
  WHERE status IN ('pending', 'countered');

-- ================================================================
-- PRICING ENGINE CONFIG
-- ================================================================

CREATE TABLE pricing_config (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vehicle_type          vehicle_type NOT NULL UNIQUE,

  base_fare_inr         DECIMAL(10,2) NOT NULL,
  per_km_rate_inr       DECIMAL(10,2) NOT NULL,
  per_kg_rate_inr       DECIMAL(10,2) NOT NULL DEFAULT 0,

  minimum_fare_inr      DECIMAL(10,2) NOT NULL,
  minimum_distance_km   DECIMAL(8,2)  NOT NULL DEFAULT 5,

  fuel_multiplier       DECIMAL(5,3)  NOT NULL DEFAULT 1.000,
  surge_multiplier      DECIMAL(5,3)  NOT NULL DEFAULT 1.000,

  free_weight_kg        DECIMAL(10,2) DEFAULT 0,
  extra_weight_rate_inr DECIMAL(10,2) DEFAULT 0,

  max_capacity_kg       DECIMAL(10,2) NOT NULL,

  is_active             BOOLEAN DEFAULT true,
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ================================================================
-- GEO ROUTE CACHE
-- ================================================================

CREATE TABLE geo_routes (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  origin_lat    DOUBLE PRECISION NOT NULL,
  origin_lng    DOUBLE PRECISION NOT NULL,
  dest_lat      DOUBLE PRECISION NOT NULL,
  dest_lng      DOUBLE PRECISION NOT NULL,
  distance_km   DECIMAL(8,2) NOT NULL,
  duration_min  INTEGER NOT NULL,
  polyline      TEXT,
  provider      TEXT DEFAULT 'osrm',
  cached_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at    TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '24 hours')
);

CREATE INDEX idx_geo_routes ON geo_routes(origin_lat, origin_lng, dest_lat, dest_lng);

-- ================================================================
-- NOTIFICATIONS
-- ================================================================

CREATE TABLE notifications (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type          notification_type NOT NULL,
  title         TEXT NOT NULL,
  body          TEXT NOT NULL,
  data          JSONB DEFAULT '{}',
  is_read       BOOLEAN DEFAULT false,
  read_at       TIMESTAMPTZ,
  push_sent     BOOLEAN DEFAULT false,
  push_sent_at  TIMESTAMPTZ,
  entity_type   TEXT,
  entity_id     UUID,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notif_user    ON notifications(user_id);
CREATE INDEX idx_notif_unread  ON notifications(user_id, is_read) WHERE NOT is_read;

-- ================================================================
-- AUDIT LOG
-- ================================================================

CREATE TABLE audit_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type audit_entity NOT NULL,
  entity_id   UUID NOT NULL,
  action      TEXT NOT NULL,
  actor_id    UUID REFERENCES profiles(id),
  actor_role  user_role,
  old_data    JSONB,
  new_data    JSONB,
  ip_address  TEXT,
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_entity     ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_actor      ON audit_logs(actor_id);
CREATE INDEX idx_audit_created_at ON audit_logs(created_at DESC);

-- ================================================================
-- SEQUENCE-BASED NUMBER GENERATORS
-- ================================================================

CREATE SEQUENCE order_seq     START 1000;
CREATE SEQUENCE transport_seq START 1000;
CREATE SEQUENCE bid_seq       START 1000;

CREATE OR REPLACE FUNCTION gen_order_number() RETURNS TEXT AS $$
  SELECT 'ORD-' || TO_CHAR(now(), 'YYYY') || '-' || LPAD(nextval('order_seq')::TEXT, 6, '0');
$$ LANGUAGE SQL;

CREATE OR REPLACE FUNCTION gen_transport_number() RETURNS TEXT AS $$
  SELECT 'TRQ-' || TO_CHAR(now(), 'YYYY') || '-' || LPAD(nextval('transport_seq')::TEXT, 6, '0');
$$ LANGUAGE SQL;

CREATE OR REPLACE FUNCTION gen_bid_number() RETURNS TEXT AS $$
  SELECT 'BID-' || TO_CHAR(now(), 'YYYY') || '-' || LPAD(nextval('bid_seq')::TEXT, 6, '0');
$$ LANGUAGE SQL;

CREATE OR REPLACE FUNCTION trg_set_order_number() RETURNS TRIGGER AS $$
BEGIN NEW.order_number := gen_order_number(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION trg_set_transport_number() RETURNS TRIGGER AS $$
BEGIN NEW.request_number := gen_transport_number(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION trg_set_bid_number() RETURNS TRIGGER AS $$
BEGIN NEW.bid_number := gen_bid_number(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_order_number
  BEFORE INSERT ON orders FOR EACH ROW
  WHEN (NEW.order_number IS NULL OR NEW.order_number = '')
  EXECUTE FUNCTION trg_set_order_number();

CREATE TRIGGER set_transport_number
  BEFORE INSERT ON transport_requests FOR EACH ROW
  WHEN (NEW.request_number IS NULL OR NEW.request_number = '')
  EXECUTE FUNCTION trg_set_transport_number();

CREATE TRIGGER set_bid_number
  BEFORE INSERT ON bids FOR EACH ROW
  WHEN (NEW.bid_number IS NULL OR NEW.bid_number = '')
  EXECUTE FUNCTION trg_set_bid_number();

-- updated_at maintenance
CREATE OR REPLACE FUNCTION touch_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER touch_profiles           BEFORE UPDATE ON profiles           FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER touch_vendor_profiles    BEFORE UPDATE ON vendor_profiles    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER touch_transporter_profiles BEFORE UPDATE ON transporter_profiles FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER touch_products           BEFORE UPDATE ON products           FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER touch_orders             BEFORE UPDATE ON orders             FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER touch_transport_requests BEFORE UPDATE ON transport_requests FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER touch_bids               BEFORE UPDATE ON bids               FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ================================================================
-- WORKFLOW STATE MACHINE — VALID TRANSITION TABLES
-- ================================================================

CREATE OR REPLACE FUNCTION valid_product_transitions()
RETURNS TABLE(from_s product_status, to_s product_status) AS $$
SELECT * FROM (VALUES
  ('draft'::product_status,             'pending_approval'::product_status),
  ('pending_approval'::product_status,  'approved'::product_status),
  ('pending_approval'::product_status,  'rejected'::product_status),
  ('pending_approval'::product_status,  'changes_requested'::product_status),
  ('changes_requested'::product_status, 'pending_approval'::product_status),
  ('approved'::product_status,          'suspended'::product_status),
  ('approved'::product_status,          'draft'::product_status),
  ('suspended'::product_status,         'approved'::product_status),
  ('rejected'::product_status,          'draft'::product_status)
) t(from_s, to_s);
$$ LANGUAGE SQL STABLE;

CREATE OR REPLACE FUNCTION valid_order_transitions()
RETURNS TABLE(from_s order_status, to_s order_status) AS $$
SELECT * FROM (VALUES
  ('created'::order_status,             'waiting_approval'::order_status),
  ('waiting_approval'::order_status,    'approved'::order_status),
  ('waiting_approval'::order_status,    'rejected'::order_status),
  ('waiting_approval'::order_status,    'on_hold'::order_status),
  ('on_hold'::order_status,             'approved'::order_status),
  ('on_hold'::order_status,             'rejected'::order_status),
  ('approved'::order_status,            'transport_pending'::order_status),
  ('transport_pending'::order_status,   'transport_assigned'::order_status),
  ('transport_assigned'::order_status,  'picked_up'::order_status),
  ('picked_up'::order_status,           'in_transit'::order_status),
  ('in_transit'::order_status,          'delivered'::order_status),
  ('approved'::order_status,            'cancelled'::order_status),
  ('transport_pending'::order_status,   'cancelled'::order_status)
) t(from_s, to_s);
$$ LANGUAGE SQL STABLE;

CREATE OR REPLACE FUNCTION valid_transport_transitions()
RETURNS TABLE(from_s transport_status, to_s transport_status) AS $$
SELECT * FROM (VALUES
  ('created'::transport_status,               'waiting_admin_approval'::transport_status),
  ('waiting_admin_approval'::transport_status,'marketplace_open'::transport_status),
  ('waiting_admin_approval'::transport_status,'cancelled'::transport_status),
  ('marketplace_open'::transport_status,      'bid_received'::transport_status),
  ('marketplace_open'::transport_status,      'cancelled'::transport_status),
  ('bid_received'::transport_status,          'negotiating'::transport_status),
  ('bid_received'::transport_status,          'transporter_assigned'::transport_status),
  ('bid_received'::transport_status,          'marketplace_open'::transport_status),
  ('negotiating'::transport_status,           'transporter_assigned'::transport_status),
  ('negotiating'::transport_status,           'marketplace_open'::transport_status),
  ('transporter_assigned'::transport_status,  'picked_up'::transport_status),
  ('picked_up'::transport_status,             'in_transit'::transport_status),
  ('in_transit'::transport_status,            'delivered'::transport_status),
  ('transporter_assigned'::transport_status,  'cancelled'::transport_status)
) t(from_s, to_s);
$$ LANGUAGE SQL STABLE;

-- ================================================================
-- WORKFLOW TRANSITION FUNCTIONS (SECURITY DEFINER = run as owner)
-- ================================================================

CREATE OR REPLACE FUNCTION transition_product_status(
  p_product_id  UUID,
  p_new_status  product_status,
  p_actor_id    UUID,
  p_remarks     TEXT    DEFAULT NULL,
  p_metadata    JSONB   DEFAULT '{}'
) RETURNS products AS $$
DECLARE
  v_product    products;
  v_actor_role user_role;
BEGIN
  SELECT * INTO v_product FROM products WHERE id = p_product_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Product % not found', p_product_id; END IF;

  SELECT role INTO v_actor_role FROM profiles WHERE id = p_actor_id;

  IF NOT EXISTS(
    SELECT 1 FROM valid_product_transitions()
    WHERE from_s = v_product.status AND to_s = p_new_status
  ) THEN
    RAISE EXCEPTION 'Invalid product transition: % → %', v_product.status, p_new_status;
  END IF;

  UPDATE products SET
    status           = p_new_status,
    rejection_reason = CASE WHEN p_new_status = 'rejected'          THEN p_remarks ELSE rejection_reason END,
    change_requests  = CASE WHEN p_new_status = 'changes_requested' THEN p_remarks ELSE change_requests  END,
    approved_at      = CASE WHEN p_new_status = 'approved'          THEN now()     ELSE approved_at      END,
    approved_by      = CASE WHEN p_new_status = 'approved'          THEN p_actor_id ELSE approved_by     END,
    submitted_at     = CASE WHEN p_new_status = 'pending_approval'  THEN now()     ELSE submitted_at     END
  WHERE id = p_product_id RETURNING * INTO v_product;

  INSERT INTO product_approval_history(product_id, action, actor_id, old_status, new_status, remarks, metadata)
  VALUES (p_product_id,
    CASE p_new_status
      WHEN 'approved'          THEN 'approved'::approval_action
      WHEN 'rejected'          THEN 'rejected'::approval_action
      WHEN 'changes_requested' THEN 'changes_requested'::approval_action
      WHEN 'pending_approval'  THEN 'resubmitted'::approval_action
      ELSE 'modified'::approval_action
    END,
    p_actor_id, v_product.status, p_new_status, p_remarks, p_metadata);

  INSERT INTO audit_logs(entity_type, entity_id, action, actor_id, actor_role, new_data)
  VALUES ('product', p_product_id, 'status:' || p_new_status, p_actor_id, v_actor_role,
          jsonb_build_object('status', p_new_status, 'remarks', p_remarks));

  RETURN v_product;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION transition_order_status(
  p_order_id    UUID,
  p_new_status  order_status,
  p_actor_id    UUID,
  p_remarks     TEXT  DEFAULT NULL,
  p_metadata    JSONB DEFAULT '{}'
) RETURNS orders AS $$
DECLARE
  v_order      orders;
  v_actor_role user_role;
BEGIN
  SELECT * INTO v_order FROM orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order % not found', p_order_id; END IF;

  SELECT role INTO v_actor_role FROM profiles WHERE id = p_actor_id;

  IF NOT EXISTS(
    SELECT 1 FROM valid_order_transitions()
    WHERE from_s = v_order.status AND to_s = p_new_status
  ) THEN
    RAISE EXCEPTION 'Invalid order transition: % → %', v_order.status, p_new_status;
  END IF;

  UPDATE orders SET
    status           = p_new_status,
    rejection_reason = CASE WHEN p_new_status = 'rejected'   THEN p_remarks   ELSE rejection_reason END,
    hold_reason      = CASE WHEN p_new_status = 'on_hold'    THEN p_remarks   ELSE hold_reason      END,
    approved_at      = CASE WHEN p_new_status = 'approved'   THEN now()       ELSE approved_at      END,
    approved_by      = CASE WHEN p_new_status = 'approved'   THEN p_actor_id  ELSE approved_by      END,
    picked_up_at     = CASE WHEN p_new_status = 'picked_up'  THEN now()       ELSE picked_up_at     END,
    delivered_at     = CASE WHEN p_new_status = 'delivered'  THEN now()       ELSE delivered_at     END
  WHERE id = p_order_id RETURNING * INTO v_order;

  INSERT INTO order_approval_history(order_id, action, actor_id, old_status, new_status, remarks, metadata)
  VALUES (p_order_id,
    CASE p_new_status
      WHEN 'approved'  THEN 'approved'::approval_action
      WHEN 'rejected'  THEN 'rejected'::approval_action
      WHEN 'on_hold'   THEN 'held'::approval_action
      ELSE 'modified'::approval_action
    END,
    p_actor_id, v_order.status, p_new_status, p_remarks, p_metadata);

  INSERT INTO audit_logs(entity_type, entity_id, action, actor_id, actor_role, new_data)
  VALUES ('order', p_order_id, 'status:' || p_new_status, p_actor_id, v_actor_role,
          jsonb_build_object('status', p_new_status, 'remarks', p_remarks));

  RETURN v_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION transition_transport_status(
  p_transport_id UUID,
  p_new_status   transport_status,
  p_actor_id     UUID,
  p_remarks      TEXT  DEFAULT NULL,
  p_metadata     JSONB DEFAULT '{}'
) RETURNS transport_requests AS $$
DECLARE
  v_tr         transport_requests;
  v_actor_role user_role;
BEGIN
  SELECT * INTO v_tr FROM transport_requests WHERE id = p_transport_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Transport request % not found', p_transport_id; END IF;

  SELECT role INTO v_actor_role FROM profiles WHERE id = p_actor_id;

  IF NOT EXISTS(
    SELECT 1 FROM valid_transport_transitions()
    WHERE from_s = v_tr.status AND to_s = p_new_status
  ) THEN
    RAISE EXCEPTION 'Invalid transport transition: % → %', v_tr.status, p_new_status;
  END IF;

  UPDATE transport_requests SET
    status            = p_new_status,
    rejection_reason  = CASE WHEN p_new_status = 'cancelled'             THEN p_remarks    ELSE rejection_reason  END,
    bid_expiry_at     = CASE WHEN p_new_status = 'marketplace_open'      THEN now() + INTERVAL '6 hours' ELSE bid_expiry_at END,
    assigned_at       = CASE WHEN p_new_status = 'transporter_assigned'  THEN now()        ELSE assigned_at       END,
    picked_up_at      = CASE WHEN p_new_status = 'picked_up'             THEN now()        ELSE picked_up_at      END,
    delivered_at      = CASE WHEN p_new_status = 'delivered'             THEN now()        ELSE delivered_at      END
  WHERE id = p_transport_id RETURNING * INTO v_tr;

  INSERT INTO transport_approval_history(transport_id, action, actor_id, old_status, new_status, remarks, modifications)
  VALUES (p_transport_id,
    CASE p_new_status
      WHEN 'marketplace_open' THEN 'approved'::approval_action
      WHEN 'cancelled'        THEN 'rejected'::approval_action
      ELSE 'modified'::approval_action
    END,
    p_actor_id, v_tr.status, p_new_status, p_remarks, p_metadata);

  INSERT INTO audit_logs(entity_type, entity_id, action, actor_id, actor_role, new_data)
  VALUES ('transport_request', p_transport_id, 'status:' || p_new_status, p_actor_id, v_actor_role,
          jsonb_build_object('status', p_new_status, 'remarks', p_remarks));

  RETURN v_tr;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================
-- PRICING ENGINE FUNCTION
-- ================================================================

CREATE OR REPLACE FUNCTION calculate_transport_fare(
  p_distance_km  DECIMAL,
  p_weight_kg    DECIMAL,
  p_vehicle_type vehicle_type,
  p_surge_factor DECIMAL DEFAULT 1.0
) RETURNS JSONB AS $$
DECLARE
  cfg              pricing_config;
  base_fare        DECIMAL;
  distance_charge  DECIMAL;
  weight_charge    DECIMAL;
  total            DECIMAL;
  billable_dist    DECIMAL;
BEGIN
  SELECT * INTO cfg FROM pricing_config WHERE vehicle_type = p_vehicle_type AND is_active;
  IF NOT FOUND THEN RAISE EXCEPTION 'No pricing config for %', p_vehicle_type; END IF;

  base_fare       := cfg.base_fare_inr;
  billable_dist   := GREATEST(p_distance_km, cfg.minimum_distance_km);
  distance_charge := billable_dist * cfg.per_km_rate_inr * cfg.fuel_multiplier;
  weight_charge   := GREATEST(0, p_weight_kg - cfg.free_weight_kg) * cfg.extra_weight_rate_inr;
  total           := GREATEST((base_fare + distance_charge + weight_charge) * p_surge_factor * cfg.surge_multiplier,
                               cfg.minimum_fare_inr);

  RETURN jsonb_build_object(
    'base_fare',       round(base_fare, 2),
    'distance_charge', round(distance_charge, 2),
    'weight_charge',   round(weight_charge, 2),
    'surge_factor',    p_surge_factor,
    'total',           round(total, 2),
    'vehicle_type',    p_vehicle_type,
    'distance_km',     p_distance_km,
    'weight_kg',       p_weight_kg,
    'min_applied',     round(total, 2) = cfg.minimum_fare_inr
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ================================================================
-- HELPER: notify a user (called from edge functions or triggers)
-- ================================================================

CREATE OR REPLACE FUNCTION create_notification(
  p_user_id    UUID,
  p_type       notification_type,
  p_title      TEXT,
  p_body       TEXT,
  p_data       JSONB DEFAULT '{}',
  p_entity_id  UUID DEFAULT NULL,
  p_entity_type TEXT DEFAULT NULL
) RETURNS notifications AS $$
DECLARE v_notif notifications;
BEGIN
  INSERT INTO notifications(user_id, type, title, body, data, entity_id, entity_type)
  VALUES (p_user_id, p_type, p_title, p_body, p_data, p_entity_id, p_entity_type)
  RETURNING * INTO v_notif;
  RETURN v_notif;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================
-- ADMIN HELPER VIEWS
-- ================================================================

CREATE OR REPLACE VIEW admin_product_queue AS
SELECT
  p.id, p.name, p.status, p.price_per_unit, p.stock_qty,
  p.submitted_at, p.created_at,
  pr.full_name AS vendor_name,
  vp.business_name,
  c.name AS category_name
FROM products p
JOIN profiles pr    ON pr.id = p.vendor_id
LEFT JOIN vendor_profiles vp ON vp.user_id = p.vendor_id
LEFT JOIN categories c       ON c.id = p.category_id
WHERE p.status IN ('pending_approval', 'changes_requested')
ORDER BY p.submitted_at ASC NULLS LAST;

CREATE OR REPLACE VIEW admin_order_queue AS
SELECT
  o.id, o.order_number, o.status, o.total_amount, o.created_at,
  pr.full_name AS customer_name, pr.phone AS customer_phone,
  o.route_distance_km, o.destination_lat, o.destination_lng
FROM orders o
JOIN profiles pr ON pr.id = o.customer_id
WHERE o.status IN ('waiting_approval', 'on_hold')
ORDER BY o.created_at ASC;

CREATE OR REPLACE VIEW admin_transport_queue AS
SELECT
  tr.id, tr.request_number, tr.status,
  tr.vendor_proposed_price, tr.system_estimated_price,
  tr.total_weight_kg, tr.preferred_vehicle_type,
  tr.pickup_city, tr.destination_city, tr.route_distance_km,
  tr.created_at,
  pr.full_name AS vendor_name,
  vp.business_name
FROM transport_requests tr
JOIN profiles pr ON pr.id = tr.vendor_id
LEFT JOIN vendor_profiles vp ON vp.user_id = tr.vendor_id
WHERE tr.status = 'waiting_admin_approval'
ORDER BY tr.created_at ASC;

CREATE OR REPLACE VIEW transporter_marketplace AS
SELECT
  tr.id, tr.request_number,
  tr.pickup_address, tr.pickup_city,
  tr.destination_address, tr.destination_city,
  tr.route_distance_km, tr.estimated_duration_min,
  tr.vendor_proposed_price, tr.total_weight_kg,
  tr.preferred_vehicle_type, tr.bid_expiry_at,
  tr.special_instructions, tr.load_type,
  tr.preferred_pickup_date,
  COUNT(b.id) AS bid_count
FROM transport_requests tr
LEFT JOIN bids b ON b.transport_id = tr.id AND b.status NOT IN ('withdrawn', 'expired')
WHERE tr.status = 'marketplace_open'
  AND (tr.bid_expiry_at IS NULL OR tr.bid_expiry_at > now())
GROUP BY tr.id
ORDER BY tr.created_at DESC;

-- ================================================================
-- SEED: DEFAULT PRICING
-- ================================================================

INSERT INTO pricing_config
  (vehicle_type, base_fare_inr, per_km_rate_inr, per_kg_rate_inr,
   minimum_fare_inr, minimum_distance_km, max_capacity_kg,
   free_weight_kg, extra_weight_rate_inr)
VALUES
  ('mini_truck',     200,  8.0, 0.05,  400,  5,  1500,  500, 0.08),
  ('pickup',         250,  9.0, 0.06,  500,  5,  2000,  500, 0.09),
  ('tata_ace',       300, 10.0, 0.07,  600,  5,  2500,  800, 0.10),
  ('lpt_407',        600, 14.0, 0.04, 1200, 10,  7000, 2000, 0.06),
  ('lpt_709',       1000, 18.0, 0.03, 2000, 15, 10000, 3000, 0.05),
  ('container_20ft',2500, 22.0, 0.02, 5000, 20, 20000, 5000, 0.04),
  ('container_40ft',4000, 28.0, 0.02, 8000, 25, 30000, 8000, 0.03),
  ('trailer',       6000, 35.0, 0.02,12000, 30, 40000,10000, 0.03);

-- ================================================================
-- ROW LEVEL SECURITY
-- ================================================================

ALTER TABLE profiles                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_profiles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE transporter_profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE products                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images             ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_approval_history   ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_addresses         ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items                ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_approval_history     ENABLE ROW LEVEL SECURITY;
ALTER TABLE transport_requests         ENABLE ROW LEVEL SECURITY;
ALTER TABLE transport_approval_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE bids                       ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications              ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs                 ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION is_admin() RETURNS BOOLEAN AS $$
  SELECT role IN ('admin','super_admin') FROM profiles WHERE id = auth.uid();
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION my_role() RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- PROFILES
CREATE POLICY "profiles_self"  ON profiles FOR ALL    USING (id = auth.uid());
CREATE POLICY "profiles_admin" ON profiles FOR SELECT USING (is_admin());

-- VENDOR PROFILES
CREATE POLICY "vp_own"   ON vendor_profiles FOR ALL    USING (user_id = auth.uid());
CREATE POLICY "vp_admin" ON vendor_profiles FOR SELECT USING (is_admin());

-- TRANSPORTER PROFILES
CREATE POLICY "tp_own"   ON transporter_profiles FOR ALL    USING (user_id = auth.uid());
CREATE POLICY "tp_admin" ON transporter_profiles FOR SELECT USING (is_admin());

-- PRODUCTS: vendor manages own; customers see only approved; admins see all
CREATE POLICY "prod_vendor"   ON products FOR ALL    USING (vendor_id = auth.uid());
CREATE POLICY "prod_customer" ON products FOR SELECT USING (status = 'approved');
CREATE POLICY "prod_admin"    ON products FOR ALL    USING (is_admin());

CREATE POLICY "pi_vendor"  ON product_images FOR ALL    USING (EXISTS(SELECT 1 FROM products WHERE id=product_id AND vendor_id=auth.uid()));
CREATE POLICY "pi_public"  ON product_images FOR SELECT USING (EXISTS(SELECT 1 FROM products WHERE id=product_id AND status='approved'));
CREATE POLICY "pi_admin"   ON product_images FOR ALL    USING (is_admin());

CREATE POLICY "pah_vendor" ON product_approval_history FOR SELECT USING (EXISTS(SELECT 1 FROM products WHERE id=product_id AND vendor_id=auth.uid()));
CREATE POLICY "pah_admin"  ON product_approval_history FOR ALL    USING (is_admin());

-- ADDRESSES
CREATE POLICY "addr_own" ON customer_addresses FOR ALL USING (customer_id = auth.uid());

-- ORDERS
CREATE POLICY "ord_customer" ON orders FOR ALL    USING (customer_id = auth.uid());
CREATE POLICY "ord_vendor"   ON orders FOR SELECT USING (EXISTS(SELECT 1 FROM order_items WHERE order_id=id AND vendor_id=auth.uid()));
CREATE POLICY "ord_admin"    ON orders FOR ALL    USING (is_admin());

CREATE POLICY "oi_customer" ON order_items FOR SELECT USING (EXISTS(SELECT 1 FROM orders WHERE id=order_id AND customer_id=auth.uid()));
CREATE POLICY "oi_vendor"   ON order_items FOR SELECT USING (vendor_id = auth.uid());
CREATE POLICY "oi_admin"    ON order_items FOR ALL    USING (is_admin());

CREATE POLICY "oah_customer" ON order_approval_history FOR SELECT USING (EXISTS(SELECT 1 FROM orders WHERE id=order_id AND customer_id=auth.uid()));
CREATE POLICY "oah_admin"    ON order_approval_history FOR ALL    USING (is_admin());

-- TRANSPORT REQUESTS
CREATE POLICY "tr_vendor"      ON transport_requests FOR ALL    USING (vendor_id = auth.uid());
CREATE POLICY "tr_marketplace" ON transport_requests FOR SELECT USING (status = 'marketplace_open' AND my_role() = 'transporter');
CREATE POLICY "tr_assigned"    ON transport_requests FOR SELECT USING (assigned_transporter_id = auth.uid());
CREATE POLICY "tr_admin"       ON transport_requests FOR ALL    USING (is_admin());

CREATE POLICY "tah_vendor" ON transport_approval_history FOR SELECT USING (EXISTS(SELECT 1 FROM transport_requests WHERE id=transport_id AND vendor_id=auth.uid()));
CREATE POLICY "tah_admin"  ON transport_approval_history FOR ALL    USING (is_admin());

-- BIDS
CREATE POLICY "bids_transporter" ON bids FOR ALL    USING (transporter_id = auth.uid());
CREATE POLICY "bids_vendor"      ON bids FOR SELECT USING (EXISTS(SELECT 1 FROM transport_requests WHERE id=transport_id AND vendor_id=auth.uid()));
CREATE POLICY "bids_admin"       ON bids FOR ALL    USING (is_admin());

-- NOTIFICATIONS
CREATE POLICY "notif_own" ON notifications FOR ALL USING (user_id = auth.uid());

-- AUDIT LOGS
CREATE POLICY "audit_admin" ON audit_logs FOR SELECT USING (is_admin());

-- ================================================================
-- REALTIME PUBLICATIONS
-- ================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE transport_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE bids;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE products;
