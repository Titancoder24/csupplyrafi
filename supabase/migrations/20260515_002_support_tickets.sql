-- ================================================================
-- C-Supply: Support Tickets Schema
-- Multi-role enterprise support desk (Customer / Vendor / Transporter / Super Admin)
-- ================================================================

-- ================================================================
-- ENUMS
-- ================================================================

CREATE TYPE ticket_status AS ENUM (
  'open',
  'in_review',
  'waiting_user',
  'resolved',
  'closed'
);

CREATE TYPE ticket_priority AS ENUM (
  'low',
  'medium',
  'high',
  'critical'
);

CREATE TYPE ticket_category AS ENUM (
  'payment_issue',
  'delivery_delay',
  'vendor_verification',
  'technical_problem',
  'refund',
  'account_issue',
  'other'
);

CREATE TYPE ticket_event_kind AS ENUM (
  'status_changed',
  'priority_changed',
  'assigned',
  'closed',
  'reopened',
  'note_added'
);

-- ================================================================
-- TICKETS
-- ================================================================

CREATE TABLE tickets (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_number   text UNIQUE NOT NULL DEFAULT 'CSU-' || lpad((floor(random() * 100000))::text, 5, '0'),

  created_by      uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_by_role user_role NOT NULL,
  assigned_to     uuid REFERENCES profiles(id) ON DELETE SET NULL,

  subject         text NOT NULL,
  description     text NOT NULL,
  category        ticket_category NOT NULL DEFAULT 'other',
  priority        ticket_priority NOT NULL DEFAULT 'medium',
  status          ticket_status   NOT NULL DEFAULT 'open',

  attachment_url  text,

  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  closed_at       timestamptz,
  last_message_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX tickets_created_by_idx     ON tickets(created_by);
CREATE INDEX tickets_status_idx         ON tickets(status);
CREATE INDEX tickets_priority_idx       ON tickets(priority);
CREATE INDEX tickets_last_message_idx   ON tickets(last_message_at DESC);

-- ================================================================
-- TICKET MESSAGES — user / admin replies in the conversation
-- ================================================================

CREATE TABLE ticket_messages (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id   uuid NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  author_id   uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  author_role user_role NOT NULL,
  body        text NOT NULL,
  attachment_url text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ticket_messages_ticket_idx ON ticket_messages(ticket_id, created_at);

-- ================================================================
-- TICKET ACTIVITY — system events (status/priority changes, assignments)
-- ================================================================

CREATE TABLE ticket_activity (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id   uuid NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  actor_id    uuid REFERENCES profiles(id) ON DELETE SET NULL,
  kind        ticket_event_kind NOT NULL,
  from_value  text,
  to_value    text,
  note        text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ticket_activity_ticket_idx ON ticket_activity(ticket_id, created_at);

-- ================================================================
-- TRIGGERS
-- ================================================================

-- Bump tickets.updated_at + last_message_at on new message
CREATE OR REPLACE FUNCTION ticket_touch_on_message()
RETURNS trigger AS $$
BEGIN
  UPDATE tickets
  SET updated_at = now(),
      last_message_at = NEW.created_at
  WHERE id = NEW.ticket_id;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER ticket_messages_touch_ticket
AFTER INSERT ON ticket_messages
FOR EACH ROW EXECUTE FUNCTION ticket_touch_on_message();

-- Auto-set closed_at when status flips to resolved/closed
CREATE OR REPLACE FUNCTION ticket_set_closed_at()
RETURNS trigger AS $$
BEGIN
  IF NEW.status IN ('closed','resolved') AND OLD.status NOT IN ('closed','resolved') THEN
    NEW.closed_at := now();
  ELSIF NEW.status NOT IN ('closed','resolved') AND OLD.status IN ('closed','resolved') THEN
    NEW.closed_at := NULL;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER tickets_set_closed_at
BEFORE UPDATE ON tickets
FOR EACH ROW EXECUTE FUNCTION ticket_set_closed_at();

-- ================================================================
-- RLS
-- ================================================================

ALTER TABLE tickets         ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_activity ENABLE ROW LEVEL SECURITY;

-- Helper: is the current auth user an admin or super_admin?
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND role IN ('admin','super_admin')
  );
$$;

-- ── tickets ─────────────────────────────────────────────────────
-- read: owner or admin
CREATE POLICY tickets_select ON tickets
FOR SELECT USING (
  created_by = auth.uid() OR is_admin()
);

-- insert: any authenticated user, only as themselves
CREATE POLICY tickets_insert ON tickets
FOR INSERT WITH CHECK (
  created_by = auth.uid()
);

-- update: owner can edit subject/description/category/priority/attachment ONLY
--        while ticket is still open; admin can update anything
CREATE POLICY tickets_update_owner ON tickets
FOR UPDATE USING (
  created_by = auth.uid() AND status NOT IN ('closed','resolved')
) WITH CHECK (
  created_by = auth.uid() AND status NOT IN ('closed','resolved')
);

CREATE POLICY tickets_update_admin ON tickets
FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());

-- delete: admin only (rare)
CREATE POLICY tickets_delete_admin ON tickets
FOR DELETE USING (is_admin());

-- ── ticket_messages ─────────────────────────────────────────────
-- read: ticket owner or admin
CREATE POLICY ticket_messages_select ON ticket_messages
FOR SELECT USING (
  is_admin() OR EXISTS (
    SELECT 1 FROM tickets t WHERE t.id = ticket_id AND t.created_by = auth.uid()
  )
);

-- insert: ticket owner (replying to own ticket) or admin (responding)
CREATE POLICY ticket_messages_insert ON ticket_messages
FOR INSERT WITH CHECK (
  author_id = auth.uid() AND (
    is_admin() OR EXISTS (
      SELECT 1 FROM tickets t WHERE t.id = ticket_id AND t.created_by = auth.uid()
    )
  )
);

-- no updates / deletes on messages — keep audit trail intact

-- ── ticket_activity ─────────────────────────────────────────────
-- read: ticket owner or admin
CREATE POLICY ticket_activity_select ON ticket_activity
FOR SELECT USING (
  is_admin() OR EXISTS (
    SELECT 1 FROM tickets t WHERE t.id = ticket_id AND t.created_by = auth.uid()
  )
);

-- insert: admin (system) or owner (limited — e.g. note_added)
CREATE POLICY ticket_activity_insert ON ticket_activity
FOR INSERT WITH CHECK (
  actor_id = auth.uid() AND (
    is_admin() OR EXISTS (
      SELECT 1 FROM tickets t WHERE t.id = ticket_id AND t.created_by = auth.uid()
    )
  )
);
