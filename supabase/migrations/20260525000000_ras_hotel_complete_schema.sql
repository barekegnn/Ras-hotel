-- ============================================================
-- Ras Hotel — Complete Production Schema
-- Migration: 20260525000000_ras_hotel_complete_schema
-- ============================================================

-- ── Extensions ───────────────────────────────────────────────
-- pgcrypto: usually pre-installed on Supabase
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
-- pg_trgm: for partial-name / partial-phone trigram search
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
-- pgvector: must be enabled via Supabase Dashboard → Database → Extensions
-- (already enabled — skipping CREATE EXTENSION to avoid conflict)

-- ── Custom Types / Enums ─────────────────────────────────────
CREATE TYPE booking_status AS ENUM (
  'reserved_unpaid',
  'paid',
  'checked_in',
  'checked_out',
  'cancelled_full_refund',
  'cancelled_partial_refund',
  'cancelled_no_refund',
  'no_show'
);

CREATE TYPE user_role AS ENUM (
  'receptionist',
  'manager'
);

CREATE TYPE room_status AS ENUM (
  'available',
  'occupied',
  'reserved_paid',
  'reserved_unpaid'
);

CREATE TYPE payment_method AS ENUM (
  'cash',
  'telebirr',
  'cbe_birr',
  'chapa'
);

CREATE TYPE index_status AS ENUM (
  'pending',
  'indexed',
  'failed'
);

CREATE TYPE supported_locale AS ENUM (
  'en',
  'am',
  'om'
);

CREATE TYPE booking_source AS ENUM (
  'online',
  'walk_in'
);

-- ── Helper: updated_at trigger ───────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ── Helper: generate booking reference ───────────────────────
CREATE OR REPLACE FUNCTION generate_booking_reference()
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := 'RAS-';
  i INT;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- ── Helper: unique booking reference ─────────────────────────
-- NOTE: This function is defined here but only safe to call AFTER
-- the bookings table exists. Used via trigger, not as column DEFAULT.
CREATE OR REPLACE FUNCTION unique_booking_reference()
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
  ref TEXT;
  attempts INT := 0;
BEGIN
  LOOP
    ref := generate_booking_reference();
    EXIT WHEN NOT EXISTS (SELECT 1 FROM bookings WHERE booking_reference = ref);
    attempts := attempts + 1;
    IF attempts > 100 THEN
      RAISE EXCEPTION 'Could not generate unique booking reference after 100 attempts';
    END IF;
  END LOOP;
  RETURN ref;
END;
$$;

-- Trigger function to auto-assign booking reference on INSERT
CREATE OR REPLACE FUNCTION assign_booking_reference()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.booking_reference IS NULL OR NEW.booking_reference = '' THEN
    NEW.booking_reference := unique_booking_reference();
  END IF;
  RETURN NEW;
END;
$$;

-- ============================================================
-- TABLES
-- ============================================================

-- ── staff_accounts ───────────────────────────────────────────
-- Linked to Supabase Auth via auth_id (auth.users.id)
CREATE TABLE staff_accounts (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id               UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name             TEXT NOT NULL,
  username              TEXT NOT NULL UNIQUE,
  role                  user_role NOT NULL DEFAULT 'receptionist',
  is_active             BOOLEAN NOT NULL DEFAULT true,
  must_change_password  BOOLEAN NOT NULL DEFAULT true,
  failed_login_attempts INT NOT NULL DEFAULT 0,
  locked_until          TIMESTAMPTZ,
  last_login_at         TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT username_length CHECK (char_length(username) >= 3)
);

CREATE TRIGGER staff_accounts_updated_at
  BEFORE UPDATE ON staff_accounts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── rooms ────────────────────────────────────────────────────
CREATE TABLE rooms (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_number          TEXT NOT NULL UNIQUE,
  room_type            TEXT NOT NULL,
  floor                INT NOT NULL DEFAULT 1,
  description          TEXT,
  base_price_per_night NUMERIC(10,2) NOT NULL CHECK (base_price_per_night > 0),
  status               room_status NOT NULL DEFAULT 'available',
  is_active            BOOLEAN NOT NULL DEFAULT true,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER rooms_updated_at
  BEFORE UPDATE ON rooms
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── room_photos ──────────────────────────────────────────────
CREATE TABLE room_photos (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id       UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  storage_path  TEXT NOT NULL,
  storage_url   TEXT NOT NULL,
  display_order INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT max_photos_per_room UNIQUE (room_id, display_order)
);

-- ── seasonal_rates ───────────────────────────────────────────
CREATE TABLE seasonal_rates (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_type            TEXT NOT NULL,
  start_date           DATE NOT NULL,
  end_date             DATE NOT NULL,
  override_price       NUMERIC(10,2) NOT NULL CHECK (override_price > 0),
  created_by           UUID REFERENCES staff_accounts(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT valid_date_range CHECK (end_date > start_date)
);

-- Enforce no overlapping seasonal rates for same room_type at DB level
CREATE OR REPLACE FUNCTION check_seasonal_rate_overlap()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM seasonal_rates
    WHERE room_type = NEW.room_type
      AND id != NEW.id
      AND start_date < NEW.end_date
      AND end_date > NEW.start_date
  ) THEN
    RAISE EXCEPTION 'SEASONAL_RATE_OVERLAP: A seasonal rate for room type "%" already exists for overlapping dates.', NEW.room_type;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER seasonal_rates_no_overlap
  BEFORE INSERT OR UPDATE ON seasonal_rates
  FOR EACH ROW EXECUTE FUNCTION check_seasonal_rate_overlap();

-- ── bookings ─────────────────────────────────────────────────
CREATE TABLE bookings (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_reference    TEXT NOT NULL UNIQUE,
  room_id              UUID NOT NULL REFERENCES rooms(id),
  guest_name           TEXT NOT NULL,
  guest_age            INT NOT NULL CHECK (guest_age >= 1 AND guest_age <= 120),
  guest_sex            TEXT NOT NULL CHECK (guest_sex IN ('male', 'female', 'other')),
  guest_phone          TEXT NOT NULL,
  guest_nationality    TEXT NOT NULL,
  guest_language       supported_locale NOT NULL DEFAULT 'en',
  check_in_date        DATE NOT NULL,
  check_out_date       DATE NOT NULL,
  total_amount         NUMERIC(10,2) NOT NULL CHECK (total_amount >= 0),
  payment_method       payment_method,
  booking_status       booking_status NOT NULL DEFAULT 'reserved_unpaid',
  special_request      TEXT,
  source               booking_source NOT NULL DEFAULT 'online',
  created_by_staff     UUID REFERENCES staff_accounts(id) ON DELETE SET NULL,
  chapa_tx_ref         TEXT,
  sms_failure_count    INT NOT NULL DEFAULT 0,
  refund_amount        NUMERIC(10,2),
  refund_processed_by  UUID REFERENCES staff_accounts(id) ON DELETE SET NULL,
  refund_processed_at  TIMESTAMPTZ,
  checked_in_by        UUID REFERENCES staff_accounts(id) ON DELETE SET NULL,
  checked_in_at        TIMESTAMPTZ,
  checked_out_by       UUID REFERENCES staff_accounts(id) ON DELETE SET NULL,
  checked_out_at       TIMESTAMPTZ,
  no_show_marked_by    UUID REFERENCES staff_accounts(id) ON DELETE SET NULL,
  no_show_marked_at    TIMESTAMPTZ,
  nights_stayed        INT,
  final_amount_paid    NUMERIC(10,2),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT valid_booking_dates CHECK (check_out_date > check_in_date),
  CONSTRAINT valid_phone CHECK (guest_phone ~ '^(\+251|0)(9|7)[0-9]{8}$')
);

CREATE TRIGGER bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Auto-assign booking reference on INSERT
CREATE TRIGGER bookings_assign_reference
  BEFORE INSERT ON bookings
  FOR EACH ROW EXECUTE FUNCTION assign_booking_reference();

-- Enforce no overlapping confirmed bookings for same room at DB level
CREATE OR REPLACE FUNCTION check_booking_overlap()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.booking_status NOT IN (
    'cancelled_full_refund','cancelled_partial_refund','cancelled_no_refund','no_show'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM bookings
      WHERE room_id = NEW.room_id
        AND id != NEW.id
        AND booking_status NOT IN (
          'cancelled_full_refund','cancelled_partial_refund','cancelled_no_refund','no_show'
        )
        AND check_in_date < NEW.check_out_date
        AND check_out_date > NEW.check_in_date
    ) THEN
      RAISE EXCEPTION 'BOOKING_CONFLICT: Room % is already reserved for overlapping dates.', NEW.room_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER bookings_no_overlap
  BEFORE INSERT OR UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION check_booking_overlap();

-- ── booking_status_history ───────────────────────────────────
CREATE TABLE booking_status_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id      UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  previous_status booking_status,
  new_status      booking_status NOT NULL,
  actor           TEXT NOT NULL,  -- staff username or 'system' or 'guest'
  transitioned_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── cash_collection_events ───────────────────────────────────
CREATE TABLE cash_collection_events (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id       UUID NOT NULL REFERENCES bookings(id) ON DELETE RESTRICT,
  receptionist_id  UUID NOT NULL REFERENCES staff_accounts(id) ON DELETE RESTRICT,
  amount_collected NUMERIC(10,2) NOT NULL CHECK (amount_collected > 0),
  collected_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── payment_records ──────────────────────────────────────────
CREATE TABLE payment_records (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id     UUID NOT NULL REFERENCES bookings(id) ON DELETE RESTRICT,
  payment_method payment_method NOT NULL,
  chapa_tx_ref   TEXT UNIQUE,
  chapa_status   TEXT,
  amount         NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  verified_by    UUID REFERENCES staff_accounts(id) ON DELETE SET NULL,
  verified_at    TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── pdf_tickets ──────────────────────────────────────────────
CREATE TABLE pdf_tickets (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id    UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  storage_path  TEXT NOT NULL,
  storage_url   TEXT NOT NULL,
  language      supported_locale NOT NULL DEFAULT 'en',
  version       INT NOT NULL DEFAULT 1,
  generated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── room_locks ───────────────────────────────────────────────
CREATE TABLE room_locks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id     UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  session_id  TEXT NOT NULL,
  acquired_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '10 minutes'),
  CONSTRAINT one_lock_per_room UNIQUE (room_id)
);

-- Auto-clean expired locks
CREATE OR REPLACE FUNCTION cleanup_expired_room_locks()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM room_locks WHERE expires_at < now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER room_locks_cleanup
  AFTER INSERT ON room_locks
  FOR EACH STATEMENT EXECUTE FUNCTION cleanup_expired_room_locks();

-- ── guest_notes ──────────────────────────────────────────────
CREATE TABLE guest_notes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_phone TEXT NOT NULL,
  note_text   TEXT NOT NULL,
  author_id   UUID NOT NULL REFERENCES staff_accounts(id) ON DELETE RESTRICT,
  is_deleted  BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  edited_at   TIMESTAMPTZ
);

-- ── shift_notes ──────────────────────────────────────────────
CREATE TABLE shift_notes (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id            UUID NOT NULL REFERENCES staff_accounts(id) ON DELETE RESTRICT,
  note_text            TEXT NOT NULL,
  is_urgent            BOOLEAN NOT NULL DEFAULT false,
  manager_acknowledged BOOLEAN NOT NULL DEFAULT false,
  acknowledged_by      UUID REFERENCES staff_accounts(id) ON DELETE SET NULL,
  acknowledged_at      TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── notifications ────────────────────────────────────────────
CREATE TABLE notifications (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type             TEXT NOT NULL,
  payload          JSONB NOT NULL DEFAULT '{}',
  priority         TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal','urgent')),
  is_read          BOOLEAN NOT NULL DEFAULT false,
  acknowledged_by  UUID REFERENCES staff_accounts(id) ON DELETE SET NULL,
  acknowledged_at  TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── audit_log ────────────────────────────────────────────────
-- Append-only: no UPDATE or DELETE allowed (enforced by RLS + trigger)
CREATE TABLE audit_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  actor       TEXT NOT NULL,   -- username, 'system', or 'guest:<phone>'
  action_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id   TEXT NOT NULL,
  description TEXT,
  metadata    JSONB NOT NULL DEFAULT '{}'
);

-- Prevent any modification or deletion of audit log entries
CREATE OR REPLACE FUNCTION audit_log_immutable()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'AUDIT_LOG_IMMUTABLE: Audit log entries cannot be modified or deleted.';
END;
$$;

CREATE TRIGGER audit_log_no_update
  BEFORE UPDATE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION audit_log_immutable();

CREATE TRIGGER audit_log_no_delete
  BEFORE DELETE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION audit_log_immutable();

-- ── hotel_configuration ──────────────────────────────────────
CREATE TABLE hotel_configuration (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key         TEXT NOT NULL UNIQUE,
  value       TEXT NOT NULL,
  updated_by  UUID REFERENCES staff_accounts(id) ON DELETE SET NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── documents ────────────────────────────────────────────────
CREATE TABLE documents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename        TEXT NOT NULL,
  storage_path    TEXT NOT NULL UNIQUE,
  storage_url     TEXT NOT NULL,
  mime_type       TEXT NOT NULL,
  file_size_bytes BIGINT NOT NULL CHECK (file_size_bytes <= 20971520), -- 20 MB
  index_status    index_status NOT NULL DEFAULT 'pending',
  uploaded_by     UUID REFERENCES staff_accounts(id) ON DELETE SET NULL,
  uploaded_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── document_chunks ──────────────────────────────────────────
CREATE TABLE document_chunks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  chunk_text  TEXT NOT NULL,
  embedding   vector(768),
  chunk_index INT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── feedback ─────────────────────────────────────────────────
CREATE TABLE feedback (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id     UUID REFERENCES bookings(id) ON DELETE SET NULL,
  star_rating    INT NOT NULL CHECK (star_rating >= 1 AND star_rating <= 5),
  comment        TEXT CHECK (char_length(comment) <= 500),
  feedback_token TEXT NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
  token_expired  BOOLEAN NOT NULL DEFAULT false,
  submitted_at   TIMESTAMPTZ,
  expires_at     TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================

-- Bookings
CREATE INDEX idx_bookings_reference      ON bookings(booking_reference);
CREATE INDEX idx_bookings_phone          ON bookings(guest_phone);
CREATE INDEX idx_bookings_room_dates     ON bookings(room_id, check_in_date, check_out_date);
CREATE INDEX idx_bookings_status         ON bookings(booking_status);
CREATE INDEX idx_bookings_checkin_date   ON bookings(check_in_date);
CREATE INDEX idx_bookings_checkout_date  ON bookings(check_out_date);
CREATE INDEX idx_bookings_created_at     ON bookings(created_at DESC);

-- Partial-name / partial-phone search (trigram)
CREATE INDEX idx_bookings_guest_name_trgm  ON bookings USING gin(guest_name gin_trgm_ops);
CREATE INDEX idx_bookings_guest_phone_trgm ON bookings USING gin(guest_phone gin_trgm_ops);

-- Audit log
CREATE INDEX idx_audit_log_actor     ON audit_log(actor);
CREATE INDEX idx_audit_log_action_at ON audit_log(action_at DESC);
CREATE INDEX idx_audit_log_entity    ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_log_type      ON audit_log(action_type);

-- Vector similarity search (ivfflat — good for 768-dim)
CREATE INDEX idx_document_chunks_embedding ON document_chunks
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Seasonal rates
CREATE INDEX idx_seasonal_rates_type_dates ON seasonal_rates(room_type, start_date, end_date);

-- Guest notes
CREATE INDEX idx_guest_notes_phone ON guest_notes(guest_phone);

-- Notifications
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_unread      ON notifications(is_read) WHERE is_read = false;

-- Shift notes
CREATE INDEX idx_shift_notes_created_at ON shift_notes(created_at DESC);

-- Payment records
CREATE INDEX idx_payment_records_booking  ON payment_records(booking_id);
CREATE INDEX idx_payment_records_tx_ref   ON payment_records(chapa_tx_ref);

-- Cash collection
CREATE INDEX idx_cash_collection_booking     ON cash_collection_events(booking_id);
CREATE INDEX idx_cash_collection_receptionist ON cash_collection_events(receptionist_id);
CREATE INDEX idx_cash_collection_date        ON cash_collection_events(collected_at DESC);

-- Feedback
CREATE INDEX idx_feedback_booking ON feedback(booking_id);
CREATE INDEX idx_feedback_token   ON feedback(feedback_token);

-- Room locks
CREATE INDEX idx_room_locks_expires ON room_locks(expires_at);

-- Booking status history
CREATE INDEX idx_booking_status_history_booking ON booking_status_history(booking_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE rooms                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_photos             ENABLE ROW LEVEL SECURITY;
ALTER TABLE seasonal_rates          ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings                ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_status_history  ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_collection_events  ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_records         ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdf_tickets             ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_locks              ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_notes             ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_notes             ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications           ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log               ENABLE ROW LEVEL SECURITY;
ALTER TABLE hotel_configuration     ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents               ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks         ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback                ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_accounts          ENABLE ROW LEVEL SECURITY;

-- Helper: get current staff account id from JWT
CREATE OR REPLACE FUNCTION auth_staff_id()
RETURNS UUID LANGUAGE sql STABLE AS $$
  SELECT id FROM staff_accounts WHERE auth_id = auth.uid()
$$;

-- Helper: get current staff role
CREATE OR REPLACE FUNCTION auth_staff_role()
RETURNS user_role LANGUAGE sql STABLE AS $$
  SELECT role FROM staff_accounts WHERE auth_id = auth.uid() AND is_active = true
$$;

-- Helper: is current user a manager?
CREATE OR REPLACE FUNCTION is_manager()
RETURNS BOOLEAN LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM staff_accounts
    WHERE auth_id = auth.uid() AND role = 'manager' AND is_active = true
  )
$$;

-- Helper: is current user any active staff?
CREATE OR REPLACE FUNCTION is_staff()
RETURNS BOOLEAN LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM staff_accounts
    WHERE auth_id = auth.uid() AND is_active = true
  )
$$;

-- ── RLS: rooms ───────────────────────────────────────────────
CREATE POLICY "rooms_public_read"
  ON rooms FOR SELECT USING (true);

CREATE POLICY "rooms_manager_insert"
  ON rooms FOR INSERT WITH CHECK (is_manager());

CREATE POLICY "rooms_manager_update"
  ON rooms FOR UPDATE USING (is_manager());

-- ── RLS: room_photos ─────────────────────────────────────────
CREATE POLICY "room_photos_public_read"
  ON room_photos FOR SELECT USING (true);

CREATE POLICY "room_photos_manager_write"
  ON room_photos FOR ALL USING (is_manager());

-- ── RLS: seasonal_rates ──────────────────────────────────────
CREATE POLICY "seasonal_rates_public_read"
  ON seasonal_rates FOR SELECT USING (true);

CREATE POLICY "seasonal_rates_manager_write"
  ON seasonal_rates FOR ALL USING (is_manager());

-- ── RLS: bookings ────────────────────────────────────────────
-- Public can insert (online booking)
CREATE POLICY "bookings_public_insert"
  ON bookings FOR INSERT WITH CHECK (true);

-- Public can SELECT — filtered at API layer by reference+phone
CREATE POLICY "bookings_public_read"
  ON bookings FOR SELECT USING (true);

-- Staff can update bookings
CREATE POLICY "bookings_staff_update"
  ON bookings FOR UPDATE USING (is_staff());

-- ── RLS: booking_status_history ──────────────────────────────
CREATE POLICY "booking_status_history_staff_read"
  ON booking_status_history FOR SELECT USING (is_staff());

CREATE POLICY "booking_status_history_staff_insert"
  ON booking_status_history FOR INSERT WITH CHECK (is_staff());

-- ── RLS: cash_collection_events ──────────────────────────────
CREATE POLICY "cash_collection_staff_read"
  ON cash_collection_events FOR SELECT USING (is_staff());

CREATE POLICY "cash_collection_staff_insert"
  ON cash_collection_events FOR INSERT WITH CHECK (is_staff());

-- ── RLS: payment_records ─────────────────────────────────────
CREATE POLICY "payment_records_public_insert"
  ON payment_records FOR INSERT WITH CHECK (true);

CREATE POLICY "payment_records_staff_read"
  ON payment_records FOR SELECT USING (is_staff());

CREATE POLICY "payment_records_manager_update"
  ON payment_records FOR UPDATE USING (is_manager());

-- ── RLS: pdf_tickets ─────────────────────────────────────────
-- Public can read (download link is token-gated at API layer)
CREATE POLICY "pdf_tickets_public_read"
  ON pdf_tickets FOR SELECT USING (true);

CREATE POLICY "pdf_tickets_service_insert"
  ON pdf_tickets FOR INSERT WITH CHECK (true);

-- ── RLS: room_locks ──────────────────────────────────────────
CREATE POLICY "room_locks_public_read"
  ON room_locks FOR SELECT USING (true);

CREATE POLICY "room_locks_public_insert"
  ON room_locks FOR INSERT WITH CHECK (true);

CREATE POLICY "room_locks_public_delete"
  ON room_locks FOR DELETE USING (true);

-- ── RLS: guest_notes ─────────────────────────────────────────
CREATE POLICY "guest_notes_staff_read"
  ON guest_notes FOR SELECT USING (is_staff());

CREATE POLICY "guest_notes_staff_insert"
  ON guest_notes FOR INSERT WITH CHECK (is_staff());

CREATE POLICY "guest_notes_author_update"
  ON guest_notes FOR UPDATE
  USING (is_staff() AND author_id = auth_staff_id());

CREATE POLICY "guest_notes_manager_delete"
  ON guest_notes FOR DELETE USING (is_manager());

-- ── RLS: shift_notes ─────────────────────────────────────────
CREATE POLICY "shift_notes_staff_read"
  ON shift_notes FOR SELECT USING (is_staff());

CREATE POLICY "shift_notes_staff_insert"
  ON shift_notes FOR INSERT WITH CHECK (is_staff());

CREATE POLICY "shift_notes_manager_update"
  ON shift_notes FOR UPDATE USING (is_manager());

-- ── RLS: notifications ───────────────────────────────────────
CREATE POLICY "notifications_staff_read"
  ON notifications FOR SELECT USING (is_staff());

CREATE POLICY "notifications_service_insert"
  ON notifications FOR INSERT WITH CHECK (true);

CREATE POLICY "notifications_staff_update"
  ON notifications FOR UPDATE USING (is_staff());

-- ── RLS: audit_log ───────────────────────────────────────────
-- Append-only: only managers can read; anyone (service role) can insert
CREATE POLICY "audit_log_manager_read"
  ON audit_log FOR SELECT USING (is_manager());

CREATE POLICY "audit_log_service_insert"
  ON audit_log FOR INSERT WITH CHECK (true);

-- No UPDATE or DELETE policies — enforced by trigger above

-- ── RLS: hotel_configuration ─────────────────────────────────
CREATE POLICY "hotel_config_public_read"
  ON hotel_configuration FOR SELECT USING (true);

CREATE POLICY "hotel_config_manager_write"
  ON hotel_configuration FOR ALL USING (is_manager());

-- ── RLS: documents ───────────────────────────────────────────
CREATE POLICY "documents_manager_all"
  ON documents FOR ALL USING (is_manager());

-- ── RLS: document_chunks ─────────────────────────────────────
-- Public read for RAG chatbot queries
CREATE POLICY "document_chunks_public_read"
  ON document_chunks FOR SELECT USING (true);

CREATE POLICY "document_chunks_service_write"
  ON document_chunks FOR ALL USING (is_manager());

-- ── RLS: feedback ────────────────────────────────────────────
CREATE POLICY "feedback_public_insert"
  ON feedback FOR INSERT WITH CHECK (true);

-- Public read — token-gated at API layer
CREATE POLICY "feedback_public_read"
  ON feedback FOR SELECT USING (true);

-- ── RLS: staff_accounts ──────────────────────────────────────
CREATE POLICY "staff_accounts_own_read"
  ON staff_accounts FOR SELECT
  USING (auth_id = auth.uid() OR is_manager());

CREATE POLICY "staff_accounts_manager_write"
  ON staff_accounts FOR ALL USING (is_manager());

-- ============================================================
-- REALTIME
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE bookings;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE shift_notes;
ALTER PUBLICATION supabase_realtime ADD TABLE booking_status_history;

-- ============================================================
-- USEFUL RPC FUNCTIONS
-- ============================================================

-- Vector similarity search for RAG chatbot
CREATE OR REPLACE FUNCTION match_document_chunks(
  query_embedding vector(768),
  match_threshold FLOAT DEFAULT 0.7,
  match_count     INT   DEFAULT 5
)
RETURNS TABLE (
  id          UUID,
  document_id UUID,
  chunk_text  TEXT,
  similarity  FLOAT
)
LANGUAGE sql STABLE AS $$
  SELECT
    dc.id,
    dc.document_id,
    dc.chunk_text,
    1 - (dc.embedding <=> query_embedding) AS similarity
  FROM document_chunks dc
  JOIN documents d ON d.id = dc.document_id
  WHERE d.index_status = 'indexed'
    AND 1 - (dc.embedding <=> query_embedding) > match_threshold
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- Revenue summary for a date range
CREATE OR REPLACE FUNCTION get_revenue_summary(
  p_start_date DATE,
  p_end_date   DATE
)
RETURNS TABLE (
  total_cash         NUMERIC,
  total_mobile_money NUMERIC,
  total_bookings     BIGINT,
  total_revenue      NUMERIC
)
LANGUAGE sql STABLE AS $$
  SELECT
    COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN total_amount END), 0) AS total_cash,
    COALESCE(SUM(CASE WHEN payment_method IN ('telebirr','cbe_birr','chapa') THEN total_amount END), 0) AS total_mobile_money,
    COUNT(*) AS total_bookings,
    COALESCE(SUM(total_amount), 0) AS total_revenue
  FROM bookings
  WHERE booking_status NOT IN ('cancelled_full_refund','cancelled_partial_refund','cancelled_no_refund','no_show')
    AND check_in_date BETWEEN p_start_date AND p_end_date;
$$;

-- Occupancy rate for a specific date
CREATE OR REPLACE FUNCTION get_occupancy_rate(p_date DATE)
RETURNS NUMERIC LANGUAGE sql STABLE AS $$
  SELECT
    CASE
      WHEN COUNT(*) FILTER (WHERE r.is_active) = 0 THEN 0
      ELSE ROUND(
        COUNT(*) FILTER (
          WHERE r.is_active AND r.id IN (
            SELECT b.room_id FROM bookings b
            WHERE b.booking_status IN ('checked_in','paid','reserved_unpaid')
              AND b.check_in_date <= p_date
              AND b.check_out_date > p_date
          )
        )::NUMERIC
        / COUNT(*) FILTER (WHERE r.is_active)::NUMERIC * 100,
        2
      )
    END
  FROM rooms r;
$$;

-- ============================================================
-- SEED DATA
-- ============================================================

-- ── Hotel Configuration (default values) ─────────────────────
INSERT INTO hotel_configuration (key, value) VALUES
  ('hotel_name',            'Ras Hotel'),
  ('hotel_address',         'Jugol (Walled City), Harar, Ethiopia'),
  ('hotel_phone',           '+251255660000'),
  ('reception_hours',       '06:00 - 22:00 (EAT)'),
  ('checkin_time',          '14:00'),
  ('checkout_time',         '12:00'),
  ('no_show_threshold',     '20:00'),
  ('cancellation_window_hours', '48'),
  ('currency',              'ETB'),
  ('default_locale',        'en'),
  ('feedback_window_days',  '7'),
  ('room_lock_minutes',     '10'),
  ('sms_retry_attempts',    '2'),
  ('sms_retry_delay_secs',  '30'),
  ('app_url',               'https://rashotel.com')
ON CONFLICT (key) DO NOTHING;

-- ── Rooms (25 rooms across 3 types) ──────────────────────────
INSERT INTO rooms (room_number, room_type, floor, description, base_price_per_night, status, is_active) VALUES
  -- Standard rooms (floor 1 & 2)
  ('101', 'standard', 1, 'Comfortable standard room with queen bed, ensuite bathroom, free WiFi, and city view. Decorated with traditional Harari textiles.', 2500.00, 'available', true),
  ('102', 'standard', 1, 'Comfortable standard room with queen bed, ensuite bathroom, free WiFi, and garden view.', 2500.00, 'available', true),
  ('103', 'standard', 1, 'Comfortable standard room with queen bed, ensuite bathroom, free WiFi, and courtyard view.', 2500.00, 'available', true),
  ('104', 'standard', 1, 'Comfortable standard room with queen bed, ensuite bathroom, free WiFi, and city view.', 2500.00, 'available', true),
  ('105', 'standard', 1, 'Comfortable standard room with twin beds, ensuite bathroom, and free WiFi.', 2500.00, 'available', true),
  ('201', 'standard', 2, 'Upper-floor standard room with queen bed, ensuite bathroom, free WiFi, and panoramic city view.', 2700.00, 'available', true),
  ('202', 'standard', 2, 'Upper-floor standard room with queen bed, ensuite bathroom, and free WiFi.', 2700.00, 'available', true),
  ('203', 'standard', 2, 'Upper-floor standard room with twin beds, ensuite bathroom, and free WiFi.', 2700.00, 'available', true),
  ('204', 'standard', 2, 'Upper-floor standard room with queen bed, ensuite bathroom, and free WiFi.', 2700.00, 'available', true),
  ('205', 'standard', 2, 'Upper-floor standard room with queen bed, ensuite bathroom, and free WiFi.', 2700.00, 'available', true),
  -- Deluxe rooms (floor 2 & 3)
  ('206', 'deluxe', 2, 'Spacious deluxe room with king bed, sitting area, rain shower, minibar, and city view. Handcrafted Harari furniture.', 3500.00, 'available', true),
  ('207', 'deluxe', 2, 'Spacious deluxe room with king bed, sitting area, rain shower, and minibar.', 3500.00, 'available', true),
  ('301', 'deluxe', 3, 'Top-floor deluxe room with king bed, sitting area, rain shower, minibar, and panoramic Harar view.', 3800.00, 'available', true),
  ('302', 'deluxe', 3, 'Top-floor deluxe room with king bed, sitting area, rain shower, and minibar.', 3800.00, 'available', true),
  ('303', 'deluxe', 3, 'Top-floor deluxe room with king bed, sitting area, rain shower, and minibar.', 3800.00, 'available', true),
  ('304', 'deluxe', 3, 'Top-floor deluxe room with king bed, sitting area, rain shower, and minibar.', 3800.00, 'available', true),
  ('305', 'deluxe', 3, 'Top-floor deluxe room with king bed, sitting area, rain shower, and minibar.', 3800.00, 'available', true),
  ('306', 'deluxe', 3, 'Top-floor deluxe room with king bed, sitting area, rain shower, and minibar.', 3800.00, 'available', true),
  ('307', 'deluxe', 3, 'Top-floor deluxe room with king bed, sitting area, rain shower, and minibar.', 3800.00, 'available', true),
  ('308', 'deluxe', 3, 'Top-floor deluxe room with king bed, sitting area, rain shower, and minibar.', 3800.00, 'available', true),
  -- Suites (floor 3)
  ('S01', 'suite', 3, 'Luxury suite with separate living room, king bedroom, jacuzzi bath, premium linens, private terrace, and panoramic Harar old city view.', 5000.00, 'available', true),
  ('S02', 'suite', 3, 'Luxury suite with separate living room, king bedroom, jacuzzi bath, premium linens, and private terrace.', 5000.00, 'available', true),
  ('S03', 'suite', 3, 'Luxury suite with separate living room, king bedroom, jacuzzi bath, premium linens, and private terrace.', 5000.00, 'available', true),
  ('S04', 'suite', 3, 'Presidential suite with two bedrooms, full kitchen, jacuzzi bath, premium linens, and panoramic terrace.', 7500.00, 'available', true),
  ('S05', 'suite', 3, 'Honeymoon suite with king bed, jacuzzi bath, rose petal service, premium linens, and private terrace.', 6000.00, 'available', true)
ON CONFLICT (room_number) DO NOTHING;

-- ── Seasonal Rates (example upcoming seasons) ─────────────────
INSERT INTO seasonal_rates (room_type, start_date, end_date, override_price) VALUES
  -- Ethiopian New Year / Meskel season (Sep-Oct)
  ('standard', '2026-09-01', '2026-10-15', 3200.00),
  ('deluxe',   '2026-09-01', '2026-10-15', 4500.00),
  ('suite',    '2026-09-01', '2026-10-15', 6500.00),
  -- Christmas / New Year peak
  ('standard', '2026-12-20', '2027-01-10', 3500.00),
  ('deluxe',   '2026-12-20', '2027-01-10', 5000.00),
  ('suite',    '2026-12-20', '2027-01-10', 7500.00),
  -- Timkat (Ethiopian Epiphany) Jan
  ('standard', '2027-01-17', '2027-01-22', 3200.00),
  ('deluxe',   '2027-01-17', '2027-01-22', 4500.00),
  ('suite',    '2027-01-17', '2027-01-22', 6500.00)
ON CONFLICT DO NOTHING;

-- ============================================================
-- END OF MIGRATION
-- ============================================================
