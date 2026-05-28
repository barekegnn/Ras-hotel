-- ============================================================
-- Migration: 20260526000001_pre_arrival_sms_flag
--
-- Adds pre_arrival_sms_sent flag to bookings table.
-- Used by the pre-arrival reminder cron job to prevent
-- duplicate SMS sends (idempotency guard).
-- Requirement 32.5
-- ============================================================

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS pre_arrival_sms_sent BOOLEAN NOT NULL DEFAULT false;

-- Index for the cron query: check_in_date + status + flag
CREATE INDEX IF NOT EXISTS idx_bookings_pre_arrival_sms
  ON bookings (check_in_date, booking_status, pre_arrival_sms_sent)
  WHERE pre_arrival_sms_sent = false;

COMMENT ON COLUMN bookings.pre_arrival_sms_sent
  IS 'Set to true once the pre-arrival reminder SMS has been sent. Prevents duplicate sends by the daily cron job.';
