-- Enable extensions
CREATE EXTENSION IF NOT EXISTS pgvector;
CREATE EXTENSION IF NOT EXISTS pg_advisory_lock_shared;

-- Enums
CREATE TYPE booking_status AS ENUM (
  'pending',
  'confirmed',
  'checked_in',
  'checked_out',
  'cancelled',
  'no_show'
);

CREATE TYPE user_role AS ENUM (
  'admin',
  'manager',
  'staff',
  'guest'
);

CREATE TYPE room_status AS ENUM (
  'available',
  'occupied',
  'maintenance',
  'cleaning'
);

CREATE TYPE payment_method AS ENUM (
  'cash',
  'card',
  'transfer',
  'prepaid',
  'chapa'
);

-- Rooms table
CREATE TABLE rooms (
  id BIGSERIAL PRIMARY KEY,
  room_number VARCHAR(10) NOT NULL UNIQUE,
  room_type VARCHAR(50) NOT NULL,
  capacity INT NOT NULL DEFAULT 2,
  status room_status NOT NULL DEFAULT 'available',
  description TEXT,
  amenities TEXT[],
  price_per_night DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Room photos
CREATE TABLE room_photos (
  id BIGSERIAL PRIMARY KEY,
  room_id BIGINT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  photo_url VARCHAR(500) NOT NULL,
  display_order INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Seasonal rates
CREATE TABLE seasonal_rates (
  id BIGSERIAL PRIMARY KEY,
  room_id BIGINT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  season_name VARCHAR(100) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  price_per_night DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Staff accounts
CREATE TABLE staff_accounts (
  id BIGSERIAL PRIMARY KEY,
  auth_id UUID NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  full_name VARCHAR(255) NOT NULL,
  role user_role NOT NULL DEFAULT 'staff',
  phone VARCHAR(20),
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Bookings
CREATE TABLE bookings (
  id BIGSERIAL PRIMARY KEY,
  booking_reference VARCHAR(10) NOT NULL UNIQUE,
  guest_name VARCHAR(255) NOT NULL,
  guest_phone VARCHAR(20) NOT NULL,
  guest_email VARCHAR(255),
  room_id BIGINT NOT NULL REFERENCES rooms(id),
  checkin_date DATE NOT NULL,
  checkout_date DATE NOT NULL,
  status booking_status NOT NULL DEFAULT 'pending',
  total_amount DECIMAL(10, 2) NOT NULL,
  paid_amount DECIMAL(10, 2) DEFAULT 0,
  outstanding_amount DECIMAL(10, 2) DEFAULT 0,
  payment_method payment_method,
  chapa_tx_ref VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Booking status history
CREATE TABLE booking_status_history (
  id BIGSERIAL PRIMARY KEY,
  booking_id BIGINT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  old_status booking_status,
  new_status booking_status NOT NULL,
  changed_by_user_id BIGINT REFERENCES staff_accounts(id),
  change_reason VARCHAR(255),
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Cash collection events
CREATE TABLE cash_collection_events (
  id BIGSERIAL PRIMARY KEY,
  booking_id BIGINT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  amount_collected DECIMAL(10, 2) NOT NULL,
  collection_method VARCHAR(50),
  collected_by_user_id BIGINT NOT NULL REFERENCES staff_accounts(id),
  collected_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Payment records
CREATE TABLE payment_records (
  id BIGSERIAL PRIMARY KEY,
  booking_id BIGINT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  transaction_reference VARCHAR(255) UNIQUE,
  amount DECIMAL(10, 2) NOT NULL,
  payment_method payment_method NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  verified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- PDF tickets
CREATE TABLE pdf_tickets (
  id BIGSERIAL PRIMARY KEY,
  booking_id BIGINT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  pdf_url VARCHAR(500) NOT NULL,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Guest notes
CREATE TABLE guest_notes (
  id BIGSERIAL PRIMARY KEY,
  booking_id BIGINT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  note_text TEXT NOT NULL,
  created_by_user_id BIGINT REFERENCES staff_accounts(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Shift notes
CREATE TABLE shift_notes (
  id BIGSERIAL PRIMARY KEY,
  shift_date DATE NOT NULL,
  note_text TEXT NOT NULL,
  is_urgent BOOLEAN DEFAULT false,
  created_by_user_id BIGINT NOT NULL REFERENCES staff_accounts(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Notifications
CREATE TABLE notifications (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES staff_accounts(id),
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  notification_type VARCHAR(50),
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Audit log
CREATE TABLE audit_log (
  id BIGSERIAL PRIMARY KEY,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100),
  entity_id BIGINT,
  user_id BIGINT REFERENCES staff_accounts(id),
  details JSONB,
  ip_address VARCHAR(45),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Hotel configuration
CREATE TABLE hotel_configuration (
  id BIGSERIAL PRIMARY KEY,
  config_key VARCHAR(100) NOT NULL UNIQUE,
  config_value TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Documents for RAG
CREATE TABLE documents (
  id BIGSERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  doc_type VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Document chunks for vector search
CREATE TABLE document_chunks (
  id BIGSERIAL PRIMARY KEY,
  document_id BIGINT REFERENCES documents(id) ON DELETE CASCADE,
  chunk_text TEXT NOT NULL,
  embedding vector(768),
  chunk_index INT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Feedback
CREATE TABLE feedback (
  id BIGSERIAL PRIMARY KEY,
  booking_id BIGINT REFERENCES bookings(id) ON DELETE SET NULL,
  guest_name VARCHAR(255),
  guest_email VARCHAR(255),
  rating INT CHECK (rating >= 1 AND rating <= 5),
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Room locks table (for concurrency control)
CREATE TABLE room_locks (
  id BIGSERIAL PRIMARY KEY,
  room_id BIGINT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  session_id VARCHAR(255) NOT NULL,
  acquired_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT now() + INTERVAL '10 minutes'
);

-- Enable RLS
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Rooms: Everyone can read, only managers can modify
CREATE POLICY "Anyone can view rooms"
  ON rooms
  FOR SELECT
  USING (true);

CREATE POLICY "Only managers can update rooms"
  ON rooms
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM staff_accounts
      WHERE auth_id = auth.uid() AND role IN ('manager', 'admin')
    )
  );

-- Bookings: Staff can view all, managers can modify
CREATE POLICY "Staff can view all bookings"
  ON bookings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM staff_accounts
      WHERE auth_id = auth.uid()
    )
  );

CREATE POLICY "Managers can update bookings"
  ON bookings
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM staff_accounts
      WHERE auth_id = auth.uid() AND role IN ('manager', 'admin')
    )
  );

-- Audit log: Only admin can read
CREATE POLICY "Only admin can view audit log"
  ON audit_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM staff_accounts
      WHERE auth_id = auth.uid() AND role = 'admin'
    )
  );

-- Notifications: Users can only see their own
CREATE POLICY "Users can view own notifications"
  ON notifications
  FOR SELECT
  USING (user_id = (SELECT id FROM staff_accounts WHERE auth_id = auth.uid()));

-- Indexes for performance
CREATE INDEX idx_bookings_room_id ON bookings(room_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_dates ON bookings(checkin_date, checkout_date);
CREATE INDEX idx_booking_status_history_booking_id ON booking_status_history(booking_id);
CREATE INDEX idx_cash_collection_booking_id ON cash_collection_events(booking_id);
CREATE INDEX idx_shift_notes_date ON shift_notes(shift_date);
CREATE INDEX idx_audit_log_created ON audit_log(created_at);
CREATE INDEX idx_room_photos_room_id ON room_photos(room_id);
CREATE INDEX idx_seasonal_rates_room_id ON seasonal_rates(room_id);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER rooms_updated_at_trigger
  BEFORE UPDATE ON rooms
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER bookings_updated_at_trigger
  BEFORE UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
