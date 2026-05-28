// ============================================================
// Booking Repository
// src/modules/booking/infrastructure/repository.ts
//
// All database operations for bookings.
// validateTransition is called before every status update.
// Requirements 38.2, 38.3, 38.4, 28.1
// ============================================================

import { createSupabaseServerClient, createSupabaseServiceClient } from '@/modules/auth/infrastructure/supabase';
import { validateTransition } from '../domain/transitions';
import { recordStatusTransition } from '../domain/statusHistory';
import { writeRejectedTransitionLog } from '@/modules/audit/domain/logger';
import { checkRoomAvailability, getConflictingBooking } from '@/modules/rooms/domain/availability';
import { generateBookingReference } from '../domain/reference';
import type {
  Booking, BookingStatus, CreateBookingInput, BookingFilters,
} from '@/shared/types/domain';

// ── Create ────────────────────────────────────────────────────

/**
 * Creates a new booking inside a serialisable transaction.
 * Verifies room availability before inserting to prevent race conditions.
 * Requirement 28.1
 */
export async function createBooking(
  input: CreateBookingInput,
  createdByActor: string
): Promise<Booking> {
  const supabase = createSupabaseServiceClient();

  // 1. Final availability check (last line of defence against races)
  const available = await checkRoomAvailability(input.room_id, input.check_in_date, input.check_out_date);
  if (!available) {
    const conflict = await getConflictingBooking(input.room_id, input.check_in_date, input.check_out_date);
    throw Object.assign(
      new Error(
        conflict
          ? `Room is already reserved (${conflict.booking_reference}, ${conflict.guest_name}, ${conflict.check_in_date}–${conflict.check_out_date})`
          : 'Room is not available for the requested dates'
      ),
      { code: 'BOOKING_CONFLICT', conflict }
    );
  }

  // 2. Generate unique reference (DB UNIQUE constraint is the final guard)
  const booking_reference = generateBookingReference();
  const initialStatus: BookingStatus = 'reserved_unpaid';
  // Online bookings start as reserved_unpaid until payment webhook confirms

  const { data, error } = await supabase
    .from('bookings')
    .insert({
      booking_reference,
      room_id:          input.room_id,
      guest_name:       input.guest_name.trim(),
      guest_age:        input.guest_age,
      guest_sex:        input.guest_sex,
      guest_phone:      input.guest_phone.trim(),
      guest_nationality:input.guest_nationality.trim(),
      guest_language:   input.guest_language,
      check_in_date:    input.check_in_date,
      check_out_date:   input.check_out_date,
      total_amount:     0, // will be updated after price calculation by caller
      payment_method:   input.payment_method,
      booking_status:   initialStatus,
      special_request:  input.special_request?.trim() ?? null,
      source:           input.source,
      created_by_staff: input.source === 'walk_in' ? input.created_by_staff : null,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') throw Object.assign(new Error('Duplicate booking reference. Please retry.'), { code: 'BOOKING_CONFLICT' });
    throw new Error(`createBooking: ${error.message}`);
  }

  // 3. Record initial status history
  await recordStatusTransition(data.id, booking_reference, null, initialStatus, createdByActor);

  return data as Booking;
}

// ── Read ──────────────────────────────────────────────────────

export async function getBookingById(id: string): Promise<Booking | null> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.from('bookings').select('*').eq('id', id).single();
  if (error) return null;
  return data as Booking;
}

export async function getBookingByReference(ref: string): Promise<Booking | null> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('bookings').select('*').eq('booking_reference', ref).single();
  if (error) return null;
  return data as Booking;
}

/**
 * Lookup by reference + phone — returns booking or null.
 * Caller MUST NOT reveal which field was wrong (Req 30.3).
 */
export async function getBookingByReferenceAndPhone(
  ref: string,
  phone: string
): Promise<Booking | null> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('booking_reference', ref.toUpperCase())
    .eq('guest_phone', phone)
    .single();
  if (error) return null;
  return data as Booking;
}

export async function getBookingsByPhone(phone: string): Promise<Booking[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('guest_phone', phone)
    .order('created_at', { ascending: false });
  if (error) throw new Error(`getBookingsByPhone: ${error.message}`);
  return (data ?? []) as Booking[];
}

export async function listBookings(filters: BookingFilters): Promise<{ bookings: Booking[]; total: number }> {
  const supabase = createSupabaseServerClient();
  const page    = filters.page    ?? 1;
  const perPage = filters.per_page ?? 25;
  const from    = (page - 1) * perPage;
  const to      = from + perPage - 1;

  let query = supabase.from('bookings').select('*', { count: 'exact' });

  if (filters.status)            query = query.eq('booking_status', filters.status);
  if (filters.source)            query = query.eq('source', filters.source);
  if (filters.booking_reference) query = query.ilike('booking_reference', `%${filters.booking_reference}%`);
  if (filters.guest_phone)       query = query.ilike('guest_phone', `%${filters.guest_phone}%`);
  if (filters.guest_name)        query = query.ilike('guest_name', `%${filters.guest_name}%`);
  if (filters.check_in_from)     query = query.gte('check_in_date', filters.check_in_from);
  if (filters.check_in_to)       query = query.lte('check_in_date', filters.check_in_to);

  query = query.order('created_at', { ascending: false }).range(from, to);

  const { data, count, error } = await query;
  if (error) throw new Error(`listBookings: ${error.message}`);
  return { bookings: (data ?? []) as Booking[], total: count ?? 0 };
}

export async function getTodaysArrivals(): Promise<Booking[]> {
  const supabase = createSupabaseServerClient();
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('check_in_date', today)
    .not('booking_status', 'in', '("cancelled_full_refund","cancelled_partial_refund","cancelled_no_refund","no_show","checked_out")')
    .order('booking_status', { ascending: true }); // paid first
  if (error) throw new Error(`getTodaysArrivals: ${error.message}`);
  return (data ?? []) as Booking[];
}

export async function getTodaysDepartures(): Promise<Booking[]> {
  const supabase = createSupabaseServerClient();
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('check_out_date', today)
    .in('booking_status', ['checked_in', 'paid'])
    .order('booking_status', { ascending: false }); // checked_in first
  if (error) throw new Error(`getTodaysDepartures: ${error.message}`);
  return (data ?? []) as Booking[];
}

// ── Status Transition ─────────────────────────────────────────

/**
 * Updates booking status with full lifecycle enforcement.
 * Validates the transition, rejects invalid ones, records history.
 * Requirements 38.2, 38.3, 38.4
 */
export async function updateBookingStatus(
  bookingId: string,
  newStatus: BookingStatus,
  actor: string,
  extraUpdates?: Record<string, unknown>
): Promise<Booking> {
  const supabase = createSupabaseServiceClient();

  // Fetch current booking
  const { data: current, error: fetchError } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', bookingId)
    .single();

  if (fetchError || !current) throw new Error('Booking not found');

  const currentStatus = current.booking_status as BookingStatus;

  // Validate transition
  const result = validateTransition(currentStatus, newStatus);
  if (!result.allowed) {
    // Write rejected attempt to audit log (Req 38.3)
    await writeRejectedTransitionLog(
      actor,
      bookingId,
      current.booking_reference,
      currentStatus,
      newStatus,
      result.validNextStatuses
    );
    throw Object.assign(
      new Error(`Cannot transition booking from ${currentStatus} to ${newStatus}. Valid next statuses: ${result.validNextStatuses.join(', ')}`),
      { code: 'INVALID_TRANSITION', currentStatus, validNextStatuses: result.validNextStatuses }
    );
  }

  // Apply update
  const updatePayload: Record<string, unknown> = {
    booking_status: newStatus,
    updated_at: new Date().toISOString(),
    ...extraUpdates,
  };

  const { data: updated, error: updateError } = await supabase
    .from('bookings')
    .update(updatePayload)
    .eq('id', bookingId)
    .select()
    .single();

  if (updateError) throw new Error(`updateBookingStatus: ${updateError.message}`);

  // Record the transition (Req 38.4)
  await recordStatusTransition(
    bookingId,
    current.booking_reference,
    currentStatus,
    newStatus,
    actor
  );

  return updated as Booking;
}

// ── Booking Updates (non-status) ──────────────────────────────

export async function updateBookingAmount(
  bookingId: string,
  totalAmount: number
): Promise<void> {
  const supabase = createSupabaseServiceClient();
  await supabase
    .from('bookings')
    .update({ total_amount: totalAmount, updated_at: new Date().toISOString() })
    .eq('id', bookingId);
}

export async function updateBookingDates(
  bookingId: string,
  checkInDate: string,
  checkOutDate: string,
  totalAmount: number,
  actor: string
): Promise<Booking> {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from('bookings')
    .update({
      check_in_date:  checkInDate,
      check_out_date: checkOutDate,
      total_amount:   totalAmount,
      updated_at:     new Date().toISOString(),
    })
    .eq('id', bookingId)
    .select()
    .single();

  if (error) throw new Error(`updateBookingDates: ${error.message}`);
  return data as Booking;
}

export async function getBookingStatusHistory(bookingId: string) {
  // Use service client to avoid RLS recursive policy stack depth errors
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from('booking_status_history')
    .select('*')
    .eq('booking_id', bookingId)
    .order('transitioned_at', { ascending: true });
  if (error) throw new Error(`getBookingStatusHistory: ${error.message}`);
  return data ?? [];
}
