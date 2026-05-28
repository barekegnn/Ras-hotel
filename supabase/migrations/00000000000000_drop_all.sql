-- ============================================================
-- DROP ALL — Run this FIRST to clean up any partial state
-- Tables dropped with CASCADE removes all triggers/indexes/policies
-- ============================================================

-- Drop tables in reverse dependency order (CASCADE handles triggers)
DROP TABLE IF EXISTS document_chunks        CASCADE;
DROP TABLE IF EXISTS documents              CASCADE;
DROP TABLE IF EXISTS feedback               CASCADE;
DROP TABLE IF EXISTS audit_log              CASCADE;
DROP TABLE IF EXISTS notifications          CASCADE;
DROP TABLE IF EXISTS shift_notes            CASCADE;
DROP TABLE IF EXISTS guest_notes            CASCADE;
DROP TABLE IF EXISTS room_locks             CASCADE;
DROP TABLE IF EXISTS pdf_tickets            CASCADE;
DROP TABLE IF EXISTS payment_records        CASCADE;
DROP TABLE IF EXISTS cash_collection_events CASCADE;
DROP TABLE IF EXISTS booking_status_history CASCADE;
DROP TABLE IF EXISTS bookings               CASCADE;
DROP TABLE IF EXISTS seasonal_rates         CASCADE;
DROP TABLE IF EXISTS room_photos            CASCADE;
DROP TABLE IF EXISTS rooms                  CASCADE;
DROP TABLE IF EXISTS hotel_configuration    CASCADE;
DROP TABLE IF EXISTS staff_accounts         CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS set_updated_at()                          CASCADE;
DROP FUNCTION IF EXISTS generate_booking_reference()              CASCADE;
DROP FUNCTION IF EXISTS unique_booking_reference()                CASCADE;
DROP FUNCTION IF EXISTS assign_booking_reference()                CASCADE;
DROP FUNCTION IF EXISTS check_booking_overlap()                   CASCADE;
DROP FUNCTION IF EXISTS check_seasonal_rate_overlap()             CASCADE;
DROP FUNCTION IF EXISTS cleanup_expired_room_locks()              CASCADE;
DROP FUNCTION IF EXISTS audit_log_immutable()                     CASCADE;
DROP FUNCTION IF EXISTS auth_staff_id()                           CASCADE;
DROP FUNCTION IF EXISTS auth_staff_role()                         CASCADE;
DROP FUNCTION IF EXISTS is_manager()                              CASCADE;
DROP FUNCTION IF EXISTS is_staff()                                CASCADE;
DROP FUNCTION IF EXISTS match_document_chunks(vector, float, int) CASCADE;
DROP FUNCTION IF EXISTS get_revenue_summary(date, date)           CASCADE;
DROP FUNCTION IF EXISTS get_occupancy_rate(date)                  CASCADE;

-- Drop types
DROP TYPE IF EXISTS booking_status  CASCADE;
DROP TYPE IF EXISTS user_role       CASCADE;
DROP TYPE IF EXISTS room_status     CASCADE;
DROP TYPE IF EXISTS payment_method  CASCADE;
DROP TYPE IF EXISTS index_status    CASCADE;
DROP TYPE IF EXISTS supported_locale CASCADE;
DROP TYPE IF EXISTS booking_source  CASCADE;
