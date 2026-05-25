-- ============================================================
-- Ras Hotel Management System — Full Database Schema
-- Migration: 001_initial_schema
-- ============================================================

-- ── Extensions ───────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgvector";
CREATE EXTENSION IF NOT EXISTS "pg_advisory_lock_shared";

-- ── Custom types (enums) ──────────────────────────────────────
CREATE TYPE booking_status AS ENUM (
  'Reserved_Unpaid',
  'Paid',
  'Checked_In',
  'Checked_Out',
  'Cancelled_Full_Refund',
  'Cancelled_Partial_Refund',
  'Cancelled_No_Refund',
  'No_Show'
);

CREATE TYPE user_role AS ENUM ('receptionist', 'manager');

CREATE TYPE room_status AS ENUM ('Available', 'Occupied', 'Reserved_Paid', 'Reserved_Unpaid');

CREATE TYPE payment_method AS ENUM ('cash', 'telebirr', 'cbe_birr');

CREATE TYPE index_status AS ENUM ('pending', 'indexed', 'failed');

CREATE TYPE notification_priority AS ENUM ('normal', 'urgent', 'action_required');

-- ── ROOMS ─────────────────────────────────────────────────────
CREATE TABLE rooms (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_number           TEXT NOT NULL UNIQUE,
  room_type             TEXT NOT NULL,                         -- e.g. "Standard", "Deluxe", "Suite"
  floor                 INTEGER NOT NULL CHECK (floor >= 0),
  description           TEXT NOT NULL DEFAULT '',
  base_price_per_night  DECIMAL(10,2) NOT NULL CHECK (base_price_per_night > 0),
  room_status           room_status NOT NULL DEFAULT 'Available',
  is_active             BOOLEAN NOT NULL DEFAULT TRUE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE room_photos (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id        UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  storage_url    TEXT NOT NULL,
  storage_path   TEXT NOT NULL,
  display_order  INTEGER NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── SEASONAL RATES ────────────────────────────────────────────
CREATE TABLE seasonal_rates (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_type      TEXT NOT NULL,
  start_date     DATE NOT NULL,
  end_date       DATE NOT NULL CHECK (end_date > start_date),
  override_price DECIMAL(10,2) NOT NULL CHECK (override_price > 0),
  created_by     UUID REFERENCES auth.users(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT seasonal_rates_date_order CHECK (end_date > start_date)
);

-- ── STAFF ACCOUNTS ────────────────────────────────────────────
-- Mirrors auth.users — stores hotel-specific staff metadata
CREATE TABLE staff_accounts (
  id                    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name             TEXT NOT NULL,
  username              TEXT NOT NULL UNIQUE,
  role                  user_role NOT NULL DEFAULT 'receptionist',
  is_active             BOOLEAN NOT NULL DEFAULT TRUE,
  must_change_password  BOOLEAN NOT NULL DEFAULT TRUE,
  failed_login_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until          TIMESTAMPTZ,
  last_login_at         TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── BOOKINGS ─────────────────────────────────────────────────
CREATE TABLE bookings (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_reference   TEXT NOT NULL UNIQUE,
  room_id             UUID NOT NULL REFERENCES rooms(id),
  guest_name          TEXT NOT NULL,
  guest_age           INTEGER NOT NULL CHECK (guest_age > 0 AND guest_age < 130),
  guest_sex           TEXT NOT NULL CHECK (guest_sex IN ('male', 'female', 'other', 'prefer_not_to_say')),
  guest_phone         TEXT NOT NULL,
  guest_nationality   TEXT NOT NULL,
  guest_language      TEXT NOT NULL DEFAULT 'en' CHECK (guest_language IN ('en', 'am', 'om')),
  check_in_date       DATE NOT NULL,
  check_out_date      DATE NOT NULL CHECK (check_out_date > check_in_date),
  total_amount        DECIMAL(10,2) NOT NULL CHECK (total_amount >= 0),
  payment_method      payment_method,
  booking_status      booking_status NOT NULL DEFAULT 'Reserved_Unpaid',
  special_request     TEXT,
  source              TEXT NOT NULL DEFAULT 'online' CHECK (source IN ('online', 'walk_in')),
  created_by_staff    UUID REFERENCES staff_accounts(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── BOOKING STATUS HISTORY ────────────────────────────────────
CREATE TABLE booking_status_history (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id       UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  previous_status  booking_status,
  new_status       booking_status NOT NULL,
  actor            TEXT NOT NULL,                    -- staff username or "system"
  transitioned_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── CASH COLLECTION EVENTS ────────────────────────────────────
CREATE TABLE cash_collection_events (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id        UUID NOT NULL REFERENCES bookings(id) ON DELETE RESTRICT,
  receptionist_id   UUID NOT NULL REFERENCES staff_accounts(id),
  amount_collected  DECIMAL(10,2) NOT NULL CHECK (amount_collected > 0),
  collected_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── PAYMENT RECORDS ───────────────────────────────────────────
CREATE TABLE payment_records (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id      UUID NOT NULL REFERENCES bookings(id) ON DELETE RESTRICT,
  payment_method  payment_method NOT NULL,
  chapa_tx_ref    TEXT UNIQUE,
  chapa_status    TEXT,
  amount          DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  verified_by     UUID REFERENCES staff_accounts(id),
  verified_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── PDF TICKETS ───────────────────────────────────────────────
CREATE TABLE pdf_tickets (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id     UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  storage_path   TEXT NOT NULL,
  storage_url    TEXT NOT NULL,
  language       TEXT NOT NULL DEFAULT 'en',
  version        INTEGER NOT NULL DEFAULT 1,
  generated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── GUEST NOTES ───────────────────────────────────────────────
CREATE TABLE guest_notes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_phone  TEXT NOT NULL,
  note_text    TEXT NOT NULL,
  author_id    UUID NOT NULL REFERENCES staff_accounts(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  edited_at    TIMESTAMPTZ,
  is_deleted   BOOLEAN NOT NULL DEFAULT FALSE
);

-- ── SHIFT NOTES ───────────────────────────────────────────────
CREATE TABLE shift_notes (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id             UUID NOT NULL REFERENCES staff_accounts(id),
  note_text             TEXT NOT NULL,
  is_urgent             BOOLEAN NOT NULL DEFAULT FALSE,
  manager_acknowledged  BOOLEAN NOT NULL DEFAULT FALSE,
  acknowledged_by       UUID REFERENCES staff_accounts(id),
  acknowledged_at       TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── NOTIFICATIONS ─────────────────────────────────────────────
CREATE TABLE notifications (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type              TEXT NOT NULL,
  payload           JSONB NOT NULL DEFAULT '{}',
  priority          notification_priority NOT NULL DEFAULT 'normal',
  is_read           BOOLEAN NOT NULL DEFAULT FALSE,
  acknowledged_by   UUID REFERENCES staff_accounts(id),
  acknowledged_at   TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── AUDIT LOG ─────────────────────────────────────────────────
CREATE TABLE audit_log (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actor        TEXT NOT NULL,                        -- staff username or "system"
  action_type  TEXT NOT NULL,
  entity_type  TEXT NOT NULL,
  entity_id    TEXT NOT NULL,
  description  TEXT NOT NULL,
  metadata     JSONB NOT NULL DEFAULT '{}'
);

-- ── HOTEL CONFIGURATION ───────────────────────────────────────
CREATE TABLE hotel_configuration (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key         TEXT NOT NULL UNIQUE,
  value       TEXT NOT NULL,
  updated_by  UUID REFERENCES staff_accounts(id),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── DOCUMENTS ─────────────────────────────────────────────────
CREATE TABLE documents (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename         TEXT NOT NULL,
  storage_path     TEXT NOT NULL,
  storage_url      TEXT NOT NULL,
  mime_type        TEXT NOT NULL,
  file_size_bytes  BIGINT NOT NULL CHECK (file_size_bytes > 0),
  index_status     index_status NOT NULL DEFAULT 'pending',
  uploaded_by      UUID NOT NULL REFERENCES staff_accounts(id),
  uploaded_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── DOCUMENT CHUNKS (RAG) ──────────────────────────────────────
CREATE TABLE document_chunks (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id  UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  chunk_text   TEXT NOT NULL,
  embedding    vector(768),                           -- Google text-embedding-004
  chunk_index  INTEGER NOT NULL
);

-- ── FEEDBACK ─────────────────────────────────────────────────
CREATE TABLE feedback (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id      UUID NOT NULL REFERENCES bookings(id) ON DELETE RESTRICT,
  star_rating     INTEGER NOT NULL CHECK (star_rating BETWEEN 1 AND 5),
  comment         TEXT CHECK (LENGTH(comment) <= 500),
  feedback_token  TEXT NOT NULL UNIQUE,
  token_expired   BOOLEAN NOT NULL DEFAULT FALSE,
  submitted_at    TIMESTAMPTZ,
  expires_at      TIMESTAMPTZ NOT NULL
);

-- ============================================================
-- INDEXES
-- ============================================================

-- Booking lookups
CREATE INDEX idx_bookings_reference    ON bookings(booking_reference);
CREATE INDEX idx_bookings_phone        ON bookings(guest_phone);
CREATE INDEX idx_bookings_room_dates   ON bookings(room_id, check_in_date, check_out_date);
CREATE INDEX idx_bookings_status       ON bookings(booking_status);
CREATE INDEX idx_bookings_checkin_date ON bookings(check_in_date);
CREATE INDEX idx_bookings_updated      ON bookings(updated_at DESC);

-- Room lookups
CREATE INDEX idx_rooms_type   ON rooms(room_type);
CREATE INDEX idx_rooms_active ON rooms(is_active);

-- Guest notes
CREATE INDEX idx_guest_notes_phone     ON guest_notes(guest_phone);
CREATE INDEX idx_guest_notes_author    ON guest_notes(author_id);

-- Audit log queries
CREATE INDEX idx_audit_log_actor     ON audit_log(actor);
CREATE INDEX idx_audit_log_action_at ON audit_log(action_at DESC);
CREATE INDEX idx_audit_log_entity    ON audit_log(entity_type, entity_id);

-- Vector similarity search (ivfflat — suitable for MVP scale)
CREATE INDEX idx_document_chunks_embedding ON document_chunks
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Seasonal rates overlap check
CREATE INDEX idx_seasonal_rates_type_dates ON seasonal_rates(room_type, start_date, end_date);

-- Notifications
CREATE INDEX idx_notifications_unread ON notifications(is_read, created_at DESC);

-- PDF tickets
CREATE INDEX idx_pdf_tickets_booking ON pdf_tickets(booking_id);

-- Feedback
CREATE INDEX idx_feedback_booking ON feedback(booking_id);
CREATE INDEX idx_feedback_token   ON feedback(feedback_token);

-- Cash collection
CREATE INDEX idx_cash_collection_booking     ON cash_collection_events(booking_id);
CREATE INDEX idx_cash_collection_receptionist ON cash_collection_events(receptionist_id, collected_at);

-- Payment records
CREATE INDEX idx_payment_records_booking  ON payment_records(booking_id);
CREATE INDEX idx_payment_records_chapa_ref ON payment_records(chapa_tx_ref) WHERE chapa_tx_ref IS NOT NULL;

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_rooms_updated_at
  BEFORE UPDATE ON rooms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- PREVENT AUDIT LOG MODIFICATION (append-only)
-- ============================================================

CREATE OR REPLACE FUNCTION prevent_audit_log_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Audit log entries are immutable and cannot be modified or deleted.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_audit_log_no_update
  BEFORE UPDATE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_modification();

CREATE TRIGGER trg_audit_log_no_delete
  BEFORE DELETE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_modification();

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE seasonal_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_collection_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdf_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE hotel_configuration ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_accounts ENABLE ROW LEVEL SECURITY;

-- Helper: check if current user is authenticated staff
CREATE OR REPLACE FUNCTION is_staff()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (auth.role() = 'authenticated');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper: get role of current authenticated user
CREATE OR REPLACE FUNCTION current_staff_role()
RETURNS TEXT AS $$
  SELECT role::TEXT FROM staff_accounts WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Helper: check if current user is a manager
CREATE OR REPLACE FUNCTION is_manager()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN current_staff_role() = 'manager';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── ROOMS: public read, manager write ────────────────────────
CREATE POLICY "rooms_public_read"  ON rooms FOR SELECT USING (TRUE);
CREATE POLICY "rooms_manager_write" ON rooms FOR ALL USING (is_manager());

CREATE POLICY "room_photos_public_read"  ON room_photos FOR SELECT USING (TRUE);
CREATE POLICY "room_photos_manager_write" ON room_photos FOR ALL USING (is_manager());

-- ── SEASONAL RATES: public read, manager write ────────────────
CREATE POLICY "seasonal_rates_public_read"   ON seasonal_rates FOR SELECT USING (TRUE);
CREATE POLICY "seasonal_rates_manager_write" ON seasonal_rates FOR ALL USING (is_manager());

-- ── BOOKINGS: public insert (online booking), staff full access
CREATE POLICY "bookings_public_insert" ON bookings FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "bookings_staff_read"    ON bookings FOR SELECT USING (is_staff());
CREATE POLICY "bookings_staff_update"  ON bookings FOR UPDATE USING (is_staff());

-- ── BOOKING STATUS HISTORY: staff read, system insert ─────────
CREATE POLICY "bsh_staff_read"   ON booking_status_history FOR SELECT USING (is_staff());
CREATE POLICY "bsh_staff_insert" ON booking_status_history FOR INSERT WITH CHECK (is_staff());

-- ── CASH COLLECTION EVENTS: staff only ───────────────────────
CREATE POLICY "cash_events_staff_read"   ON cash_collection_events FOR SELECT USING (is_staff());
CREATE POLICY "cash_events_staff_insert" ON cash_collection_events FOR INSERT WITH CHECK (is_staff());

-- ── PAYMENT RECORDS: public insert (webhook), staff read ─────
CREATE POLICY "payment_records_public_insert" ON payment_records FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "payment_records_staff_read"    ON payment_records FOR SELECT USING (is_staff());
CREATE POLICY "payment_records_staff_update"  ON payment_records FOR UPDATE USING (is_staff());

-- ── PDF TICKETS: public select via token, staff full ─────────
CREATE POLICY "pdf_tickets_public_read" ON pdf_tickets FOR SELECT USING (TRUE);
CREATE POLICY "pdf_tickets_staff_write" ON pdf_tickets FOR INSERT WITH CHECK (is_staff());

-- ── GUEST NOTES: staff only ───────────────────────────────────
CREATE POLICY "guest_notes_staff_read"   ON guest_notes FOR SELECT USING (is_staff());
CREATE POLICY "guest_notes_staff_insert" ON guest_notes FOR INSERT WITH CHECK (is_staff());
CREATE POLICY "guest_notes_staff_update" ON guest_notes FOR UPDATE USING (is_staff());
CREATE POLICY "guest_notes_manager_delete" ON guest_notes FOR DELETE USING (is_manager());

-- ── SHIFT NOTES: staff only ───────────────────────────────────
CREATE POLICY "shift_notes_staff_read"   ON shift_notes FOR SELECT USING (is_staff());
CREATE POLICY "shift_notes_staff_insert" ON shift_notes FOR INSERT WITH CHECK (is_staff());
CREATE POLICY "shift_notes_manager_update" ON shift_notes FOR UPDATE USING (is_manager());

-- ── NOTIFICATIONS: staff only ─────────────────────────────────
CREATE POLICY "notifications_staff_read"   ON notifications FOR SELECT USING (is_staff());
CREATE POLICY "notifications_staff_insert" ON notifications FOR INSERT WITH CHECK (TRUE); -- system inserts
CREATE POLICY "notifications_staff_update" ON notifications FOR UPDATE USING (is_staff());

-- ── AUDIT LOG: manager read, append-only insert ───────────────
CREATE POLICY "audit_log_manager_read"   ON audit_log FOR SELECT USING (is_manager());
CREATE POLICY "audit_log_insert_only"    ON audit_log FOR INSERT WITH CHECK (TRUE);

-- ── HOTEL CONFIGURATION: public read, manager write ──────────
CREATE POLICY "config_public_read"   ON hotel_configuration FOR SELECT USING (TRUE);
CREATE POLICY "config_manager_write" ON hotel_configuration FOR ALL USING (is_manager());

-- ── DOCUMENTS: manager write, staff read ─────────────────────
CREATE POLICY "documents_staff_read"    ON documents FOR SELECT USING (is_staff());
CREATE POLICY "documents_manager_write" ON documents FOR ALL USING (is_manager());

-- ── DOCUMENT CHUNKS: internal only (service role) ────────────
CREATE POLICY "chunks_staff_read" ON document_chunks FOR SELECT USING (is_staff());
CREATE POLICY "chunks_insert"     ON document_chunks FOR INSERT WITH CHECK (TRUE);

-- ── FEEDBACK: public insert via token, manager read ──────────
CREATE POLICY "feedback_public_insert"  ON feedback FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "feedback_public_select"  ON feedback FOR SELECT USING (TRUE);   -- guests use token
CREATE POLICY "feedback_staff_update"   ON feedback FOR UPDATE USING (is_staff());

-- ── STAFF ACCOUNTS: staff read own, manager full ─────────────
CREATE POLICY "staff_accounts_read_own" ON staff_accounts
  FOR SELECT USING (id = auth.uid() OR is_manager());
CREATE POLICY "staff_accounts_manager_write" ON staff_accounts
  FOR ALL USING (is_manager());

-- ============================================================
-- SUPABASE REALTIME — enable on required tables
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE bookings;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE shift_notes;

-- ============================================================
-- HOTEL CONFIGURATION SEED DATA
-- ============================================================
INSERT INTO hotel_configuration (key, value) VALUES
  ('hotel_name',              'Ras Hotel Harar'),
  ('hotel_address',           'Jogol St, Harar, Ethiopia'),
  ('hotel_phone',             '+251253660000'),
  ('reception_hours',         '06:00–23:00'),
  ('checkin_time',            '14:00'),
  ('checkout_time',           '12:00'),
  ('no_show_threshold_time',  '20:00'),
  ('cancellation_window_hours', '48'),
  ('feedback_link_expiry_days', '7'),
  ('pre_arrival_reminder_hour', '9'),
  ('timezone',                'Africa/Addis_Ababa')
ON CONFLICT (key) DO NOTHING;
